'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const db        = require('../models/storeDB');
const navGraph  = require('../models/navigationGraph');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const clients = { android: new Set(), admin: new Set() };

function broadcast(set, msg) {
  const str = JSON.stringify(msg);
  set.forEach(ws => { try { if (ws.readyState === 1) ws.send(str); } catch (_) {} });
}
function toAndroid(msg) { broadcast(clients.android, msg); }
function toAdmin(msg)   { broadcast(clients.admin,   msg); }
module.exports.toAndroid = toAndroid;

function handleConnection(ws, _wss) {
  let role = null;
  const session = {
    history:     [],
    route:       [],
    currentStop: 0,
    collected:   0,
    startTime:   null,
    lastSpoken:  '',
  };

  ws.on('message', async raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (_) { return; }

    if (!role && msg.type === 'identify') {
      role = msg.role;
      if (!clients[role]) clients[role] = new Set();
      clients[role].add(ws);
      ws.send(JSON.stringify({
        type:    'welcome',
        role,
        store:   db.getAll(),
        graph:   navGraph.toJSON(),
        version: db.getVersion(),
      }));
      console.log('[WS] Client connected as:', role);
      return;
    }

    if (role === 'android') {
      switch (msg.type) {

        case 'voice_input':
          await handleVoice(ws, msg.text, session);
          break;

        case 'start_navigation': {
          const products = (msg.productIds || [])
            .map(id => db.getProducts()[id])
            .filter(Boolean);
          if (products.length === 0) {
            say(ws, 'No products found. Please tell me what you need to buy.', session);
            return;
          }
          session.route       = navGraph.buildRoute(products);
          session.currentStop = 0;
          session.collected   = 0;
          session.startTime   = Date.now();
          const first = session.route[0];
          ws.send(JSON.stringify({ type: 'route_ready', route: session.route }));
          const msg2 = 'Navigation started. ' + session.route.length +
            ' items to collect. First stop: ' + first.product.name +
            '. ' + (first.instructions[0]?.text || '');
          say(ws, msg2, session);
          break;
        }

        case 'step_done': {
          const stop = session.route[session.currentStop];
          if (!stop) return;
          const nextIdx = (msg.stepIndex || 0) + 1;
          const next    = stop.instructions[nextIdx];
          if (next) {
            ws.send(JSON.stringify({ type: 'instruction', instruction: next, stepIndex: nextIdx }));
            say(ws, next.text, session);
          } else {
            const arrivedText = 'You have arrived at ' + stop.product.name + '. ' +
              stop.product.desc + ' Price is rupees ' + stop.product.price +
              '. Say collected when you have the item.';
            ws.send(JSON.stringify({ type: 'arrived', product: stop.product }));
            say(ws, arrivedText, session);
          }
          break;
        }

        case 'item_collected': {
          if (session.currentStop >= session.route.length) return;
          const done = session.route[session.currentStop];
          session.collected++;
          session.currentStop++;
          if (session.currentStop >= session.route.length) {
            const elapsed = Math.max(1, Math.round((Date.now() - session.startTime) / 60000));
            const finalText = 'Excellent! ' + done.product.name + ' collected. ' +
              'All ' + session.collected + ' items done in ' + elapsed + ' minutes. ' +
              'Checkout is straight ahead. Well done!';
            ws.send(JSON.stringify({ type: 'shopping_complete', totalItems: session.collected, elapsedMinutes: elapsed }));
            say(ws, finalText, session);
          } else {
            const nextStop   = session.route[session.currentStop];
            const firstInstr = nextStop.instructions[0];
            const nextText   = done.product.name + ' collected. ' +
              session.collected + ' of ' + session.route.length + ' done. ' +
              'Next: ' + nextStop.product.name + '. ' + (firstInstr?.text || '');
            ws.send(JSON.stringify({ type: 'next_stop', stop: nextStop, firstInstr, collected: session.collected, total: session.route.length }));
            say(ws, nextText, session);
          }
          break;
        }

        case 'repeat':
          if (session.lastSpoken) say(ws, session.lastSpoken, session);
          break;

        case 'emergency':
          ws.send(JSON.stringify({ type: 'emergency_on' }));
          say(ws, 'Emergency activated. Store staff are being called. Stay where you are.', session);
          toAdmin({ type: 'emergency_alert', time: new Date().toISOString() });
          break;

        default: break;
      }
    }

    if (role === 'admin' && msg.type === 'push_update') {
      toAndroid({ type: 'store_updated', store: db.getAll(), version: db.getVersion(), time: new Date().toISOString() });
    }
  });

  ws.on('close', () => {
    if (role && clients[role]) clients[role].delete(ws);
  });

  ws.on('error', err => console.error('[WS error]', err.message));
}

function say(ws, text, session) {
  session.lastSpoken = text;
  try { ws.send(JSON.stringify({ type: 'speak', text })); } catch (_) {}
}

async function handleVoice(ws, text, session) {
  if (!text?.trim()) return;

  ws.send(JSON.stringify({ type: 'thinking' }));

  const products = db.getProducts();
  const zones    = db.getZones();

  const prodLines = Object.values(products).map(p =>
    p.key + '=' + p.id + ' (' + p.name + ', ' + (zones[p.zone]?.name || p.zone) + ', aisle ' + p.aisle + ', ' + p.bodyHeight + ', ' + p.bodyDir + ', rupees ' + p.price + ')'
  ).join('\n');

  const navState = session.route.length > 0
    ? 'Currently navigating stop ' + (session.currentStop + 1) + ' of ' + session.route.length + '. Current item: ' + (session.route[session.currentStop]?.product?.name || 'done') + '.'
    : '';

  const systemPrompt =
    'You are NavAssist, an AI voice assistant for BLIND shoppers at BigMart, Hyderabad.\n' +
    'You are active on EVERY screen. User cannot see anything. Respond with clear short spoken words only.\n\n' +
    'STORE PRODUCTS AND DESTINATIONS (key=ID):\n' + prodLines + '\n\n' +
    (navState ? 'CURRENT: ' + navState + '\n\n' : '') +
    'RULES:\n' +
    '1. When user wants to buy something OR go somewhere, return START_NAV immediately.\n' +
    '2. checkout/cash counter/billing/payment/pay/bill/done shopping → productIds: ["PROD_CHECKOUT"]\n' +
    '3. For ANY product, find its PROD_XX ID and return START_NAV.\n' +
    '4. NEVER ask shall I guide you - always navigate immediately.\n' +
    '5. collected/got it/done/picked it up/next → action: COLLECTED\n' +
    '6. repeat/say again → action: REPEAT\n' +
    '7. emergency/help/lost → action: EMERGENCY\n' +
    '8. Keep ALL responses under 3 sentences. No markdown.\n' +
    '9. Use Indian English. Say rupees not dollars.\n\n' +
    'Respond ONLY with this JSON, no markdown, no code blocks:\n' +
    '{"speech":"response","action":"SPEAK or START_NAV or COLLECTED or REPEAT or EMERGENCY","productIds":["PROD_ID"]}';

  const messages = [
    ...session.history.slice(-10),
    { role: 'user', content: text },
  ];

  let fullText = '';

  try {
    const stream = client.messages.stream({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system:     systemPrompt,
      messages,
    });

    stream.on('text', chunk => { fullText += chunk; });

    await stream.finalMessage();

    session.history.push({ role: 'user', content: text });
    session.history.push({ role: 'assistant', content: fullText });

    console.log('[AI RAW]', fullText);

    // Strip markdown code blocks
    let cleaned = fullText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let speech  = 'I heard you. Let me help.';
    let action  = 'SPEAK';
    let prodIds = [];

    try {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        speech  = parsed.speech      || speech;
        action  = parsed.action      || 'SPEAK';
        prodIds = parsed.productIds  || [];
      }
    } catch (e) {
      console.log('[AI parse error]', e.message, 'raw:', cleaned.substring(0, 100));
      speech = cleaned.replace(/[{}"]/g, '').substring(0, 200);
    }

    ws.send(JSON.stringify({ type: 'ai_response', speech, action, productIds: prodIds }));
    say(ws, speech, session);

    // Auto-trigger navigation when AI returns START_NAV
    if (action === 'START_NAV' && prodIds.length > 0) {
      const prods = prodIds.map(id => products[id]).filter(Boolean);
      console.log('[Nav] productIds from AI:', prodIds);
      console.log('[Nav] matched products:', prods.map(p => p.name));
      if (prods.length > 0) {
        session.route       = navGraph.buildRoute(prods);
        session.currentStop = 0;
        session.collected   = 0;
        session.startTime   = Date.now();
        ws.send(JSON.stringify({ type: 'route_ready', route: session.route }));
      } else {
        say(ws, 'I found the items but could not plan the route. Please say the items again.', session);
      }
    }

    if (action === 'EMERGENCY') {
      ws.send(JSON.stringify({ type: 'emergency_on' }));
    }

  } catch (err) {
    console.error('[Claude error]', err.message);
    say(ws, 'I had trouble connecting. Please try again.', session);
  }
}

module.exports.handleConnection = handleConnection;
