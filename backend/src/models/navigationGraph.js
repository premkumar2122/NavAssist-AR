'use strict';

/*
  INDOOR NAVIGATION GRAPH
  ═══════════════════════
  Each NODE = a physical waypoint in BigMart.
  Each EDGE = a walkable segment between two nodes.

  An edge carries:
    steps       – how many steps to walk
    turn        – what to do at the START of this segment
                  values: FORWARD | LEFT | RIGHT | BACKWARD | STOP
    hint        – what the user will sense along the way

  Dijkstra finds the shortest path.
  generateInstructions() converts the path into spoken sentences.
*/

class NavGraph {
  constructor() {
    this.nodes = {};
    this.adj   = {};   // adjacency list: nodeId -> [{ to, steps, turn, hint }]
    this._build();
  }

  // ── ADD helpers ──────────────────────────────────────────────
  _node(id, zone, sensory) {
    this.nodes[id] = { id, zone, sensory };
    this.adj[id]   = this.adj[id] || [];
  }

  _edge(from, to, steps, turn, hint) {
    this.adj[from] = this.adj[from] || [];
    this.adj[from].push({ to, steps, turn, hint: hint || '' });
  }

  // ── BUILD BigMart floor graph ─────────────────────────────────
  _build() {
    // ── nodes ──────────────────────────────────────────────────
    this._node('ENTRANCE',           null,                   'Automatic doors behind you. Store entrance.');
    this._node('LOBBY',              null,                   'Trolley bay on your right. Store directory kiosk ahead.');
    this._node('MAIN_S',             null,                   'Wide main aisle. Smooth grey tiles begin.');
    this._node('MAIN_M',             null,                   'Middle of main aisle. Air conditioning directly above.');
    this._node('MAIN_N',             null,                   'Northern main aisle. Checkout sounds ahead.');

    this._node('PRODUCE_ENTRY',      'ZONE_PRODUCE',         'Cool mist. Fresh vegetable smell. Wet floor mat.');
    this._node('PRODUCE_SHELF',      'ZONE_PRODUCE',         'Produce shelves on both sides. Leafy smell.');

    this._node('DAIRY_ENTRY',        'ZONE_DAIRY',           'Refrigerator hum starts. Air becomes cold.');
    this._node('DAIRY_D1_FRONT',     'ZONE_DAIRY',           'Aisle D1. Cold glass refrigerator doors on left.');
    this._node('DAIRY_D1_SHELF3',    'ZONE_DAIRY',           'Shelf at waist height. Egg cartons.');
    this._node('DAIRY_D2_FRONT',     'ZONE_DAIRY',           'Aisle D2. Centre dairy aisle.');
    this._node('DAIRY_D2_SHELF4',    'ZONE_DAIRY',           'Shelf at chest height. Butter packs.');
    this._node('DAIRY_D3_FRONT',     'ZONE_DAIRY',           'Aisle D3. Milk section. Strong refrigerator hum.');
    this._node('DAIRY_D3_SHELF2',    'ZONE_DAIRY',           'Shelf at chest height. Milk cartons. Cold and firm.');

    this._node('GRAINS_ENTRY',       'ZONE_GRAINS',          'Heavier floor. Large bags at floor level ahead.');
    this._node('GRAINS_GR1_FLOOR1',  'ZONE_GRAINS',          'Floor level. Large heavy flour bag. Rough fabric.');
    this._node('GRAINS_GR2_FLOOR1',  'ZONE_GRAINS',          'Floor level. Heavy rice bag. Rough woven texture.');
    this._node('GRAINS_GR2_SHELF3',  'ZONE_GRAINS',          'Waist height shelf. Medium weight dal packages.');

    this._node('GROCERY_ENTRY',      'ZONE_GROCERY',         'Spice aroma. Narrow aisle. Medium packages.');
    this._node('GROCERY_G1_SHELF3',  'ZONE_GROCERY',         'Waist height. Sugar, salt, flour bags.');
    this._node('GROCERY_G1_SHELF4',  'ZONE_GROCERY',         'Chest height. Oil bottles. Slightly greasy outside.');
    this._node('GROCERY_G1_SHELF5',  'ZONE_GROCERY',         'Eye height. Small salt packages.');
    this._node('GROCERY_G2_SHELF4',  'ZONE_GROCERY',         'Chest height. Noodles boxes. Light cardboard.');

    this._node('BEV_ENTRY',          'ZONE_BEVERAGES',       'Refrigerator hum on left wall. Glass doors. Cold drafts.');
    this._node('BEV_B1_SHELF5',      'ZONE_BEVERAGES',       'Eye height. Glass jar. Strong coffee aroma.');
    this._node('BEV_B2_SHELF3',      'ZONE_BEVERAGES',       'Waist height. Cardboard box. Tea smell.');
    this._node('BEV_B3_SHELF4',      'ZONE_BEVERAGES',       'Chest height. Cold plastic bottle.');
    this._node('BEV_B4_SHELF3',      'ZONE_BEVERAGES',       'Waist height. Carton. Fruit juice smell.');

    this._node('PERSONAL_ENTRY',     'ZONE_PERSONAL_CARE',   'Fragrance of shampoos and soaps. Narrow aisle.');
    this._node('PERSONAL_P1_SHELF3', 'ZONE_PERSONAL_CARE',   'Waist height. Soap bar. Antiseptic smell.');
    this._node('PERSONAL_P2_SHELF4', 'ZONE_PERSONAL_CARE',   'Chest height. Smooth cylindrical shampoo bottle.');

    this._node('SNACKS_ENTRY',       'ZONE_SNACKS',          'Crinkle of plastic packets. Salty smell.');
    this._node('SNACKS_S1_SHELF4',   'ZONE_SNACKS',          'Chest height. Light crinkly chips packet.');
    this._node('SNACKS_S2_SHELF2',   'ZONE_SNACKS',          'Knee height. Rectangular biscuit package. Yellow wrapper.');

    this._node('BAKERY_ENTRY',       'ZONE_BAKERY',          'Strong warm baked bread smell. Soft squeaky floor mat.');
    this._node('BAKERY_BK1_SHELF3',  'ZONE_BAKERY',          'Waist height. Soft crinkly plastic bag. Bread inside.');

    this._node('CHECKOUT_AREA',      'ZONE_CHECKOUT',        'Scanner beeping. Conveyor belt sounds. Staff voices.');

    // ── edges: entrance → zones ────────────────────────────────
    this._edge('ENTRANCE',        'LOBBY',              5,  'FORWARD',  'Walk straight in through the entrance doors');
    this._edge('LOBBY',           'MAIN_S',             15, 'FORWARD',  'Continue straight. Floor becomes smooth grey tiles');
    this._edge('MAIN_S',          'PRODUCE_ENTRY',      20, 'LEFT',     'Turn left. Fresh vegetable smell guides you');
    this._edge('PRODUCE_ENTRY',   'PRODUCE_SHELF',      10, 'FORWARD',  'Walk forward along produce shelves');
    this._edge('PRODUCE_SHELF',   'DAIRY_ENTRY',        8,  'FORWARD',  'Continue forward. Refrigerator hum starts');
    this._edge('MAIN_S',          'DAIRY_ENTRY',        38, 'LEFT',     'Turn left at the refrigerator hum. Air gets cold');
    this._edge('MAIN_S',          'MAIN_M',             50, 'FORWARD',  'Walk straight ahead down the main centre aisle');
    this._edge('MAIN_M',          'GRAINS_ENTRY',       8,  'LEFT',     'Turn left. Heavy bags on the floor ahead');
    this._edge('MAIN_M',          'GROCERY_ENTRY',      8,  'RIGHT',    'Turn right. Spice aroma guides you in');
    this._edge('MAIN_M',          'BEV_ENTRY',          15, 'LEFT',     'Turn left. Refrigerator glass doors on your left');
    this._edge('MAIN_M',          'PERSONAL_ENTRY',     18, 'RIGHT',    'Turn right. Soap and shampoo fragrance ahead');
    this._edge('MAIN_M',          'SNACKS_ENTRY',       18, 'RIGHT',    'Turn right. Crinkle of packets ahead');
    this._edge('MAIN_M',          'BAKERY_ENTRY',       20, 'LEFT',     'Turn left. Warm bread smell guides you');
    this._edge('MAIN_M',          'MAIN_N',             30, 'FORWARD',  'Walk straight ahead toward checkout');
    this._edge('MAIN_N',          'CHECKOUT_AREA',      30, 'FORWARD',  'Walk straight. Scanner beeps get louder');

    // ── edges: dairy internal ──────────────────────────────────
    this._edge('DAIRY_ENTRY',     'DAIRY_D1_FRONT',     8,  'LEFT',     'Turn left into aisle D1');
    this._edge('DAIRY_D1_FRONT',  'DAIRY_D1_SHELF3',    5,  'FORWARD',  'Walk forward. Eggs at waist height');
    this._edge('DAIRY_ENTRY',     'DAIRY_D2_FRONT',     4,  'FORWARD',  'Walk straight into aisle D2');
    this._edge('DAIRY_D2_FRONT',  'DAIRY_D2_SHELF4',    5,  'FORWARD',  'Walk forward. Butter at chest height');
    this._edge('DAIRY_ENTRY',     'DAIRY_D3_FRONT',     8,  'RIGHT',    'Turn right into aisle D3. Milk section');
    this._edge('DAIRY_D3_FRONT',  'DAIRY_D3_SHELF2',    4,  'FORWARD',  'Walk forward. Milk cartons at chest height, second from left');

    // ── edges: grains internal ─────────────────────────────────
    this._edge('GRAINS_ENTRY',    'GRAINS_GR1_FLOOR1',  8,  'LEFT',     'Turn left. Flour bag at floor level on your left');
    this._edge('GRAINS_ENTRY',    'GRAINS_GR2_FLOOR1',  8,  'RIGHT',    'Turn right. Rice bag at floor level');
    this._edge('GRAINS_GR2_FLOOR1','GRAINS_GR2_SHELF3', 0,  'STOP',     'Stop here. Reach up. Dal at waist height above the bag');

    // ── edges: grocery internal ────────────────────────────────
    this._edge('GROCERY_ENTRY',   'GROCERY_G1_SHELF3',  8,  'FORWARD',  'Walk forward. Sugar and salt at waist height');
    this._edge('GROCERY_ENTRY',   'GROCERY_G1_SHELF4',  12, 'FORWARD',  'Walk forward. Oil bottles at chest height');
    this._edge('GROCERY_G1_SHELF4','GROCERY_G1_SHELF5', 0,  'STOP',     'Stop. Reach up. Salt at eye height, small package');
    this._edge('GROCERY_ENTRY',   'GROCERY_G2_SHELF4',  14, 'RIGHT',    'Turn right. Noodles at chest height');

    // ── edges: beverages internal ──────────────────────────────
    this._edge('BEV_ENTRY',       'BEV_B1_SHELF5',      10, 'LEFT',     'Turn left. Coffee jar at eye height, strong aroma');
    this._edge('BEV_ENTRY',       'BEV_B2_SHELF3',      8,  'FORWARD',  'Walk forward. Tea box at waist height');
    this._edge('BEV_ENTRY',       'BEV_B3_SHELF4',      12, 'RIGHT',    'Turn right. Water bottles at chest height');
    this._edge('BEV_B3_SHELF4',   'BEV_B4_SHELF3',      8,  'FORWARD',  'Walk forward. Juice carton at waist height');

    // ── edges: personal care internal ─────────────────────────
    this._edge('PERSONAL_ENTRY',  'PERSONAL_P1_SHELF3', 8,  'FORWARD',  'Walk forward. Soap at waist height. Antiseptic smell');
    this._edge('PERSONAL_ENTRY',  'PERSONAL_P2_SHELF4', 12, 'RIGHT',    'Turn right. Shampoo bottle at chest height');

    // ── edges: snacks internal ─────────────────────────────────
    this._edge('SNACKS_ENTRY',    'SNACKS_S1_SHELF4',   10, 'FORWARD',  'Walk forward. Chips packet at chest height');
    this._edge('SNACKS_ENTRY',    'SNACKS_S2_SHELF2',   8,  'LEFT',     'Turn left. Biscuits at knee height, yellow wrapper');

    // ── edges: bakery internal ─────────────────────────────────
    this._edge('BAKERY_ENTRY',    'BAKERY_BK1_SHELF3',  8,  'FORWARD',  'Walk forward. Bread bag at waist height, soft and squishy');

    // ── return paths (shelf → zone exit) ──────────────────────
    this._edge('DAIRY_D3_SHELF2', 'DAIRY_ENTRY',        12, 'BACKWARD', 'Turn around. Walk back toward the main aisle');
    this._edge('DAIRY_D1_SHELF3', 'DAIRY_ENTRY',        13, 'BACKWARD', 'Turn around. Walk back toward the main aisle');
    this._edge('DAIRY_D2_SHELF4', 'DAIRY_ENTRY',        9,  'BACKWARD', 'Turn around. Walk back to dairy entry');
    this._edge('DAIRY_ENTRY',     'MAIN_S',             38, 'RIGHT',    'Turn right. Walk back to main aisle');
    this._edge('GRAINS_ENTRY',    'MAIN_M',             8,  'RIGHT',    'Turn right back to main aisle');
    this._edge('GRAINS_GR2_FLOOR1','GRAINS_ENTRY',      8,  'BACKWARD', 'Turn around. Walk back to grains entry');
    this._edge('GROCERY_ENTRY',   'MAIN_M',             8,  'LEFT',     'Turn left back to main aisle');
    this._edge('BEV_ENTRY',       'MAIN_M',             15, 'RIGHT',    'Turn right back to main aisle');
    this._edge('PERSONAL_ENTRY',  'MAIN_M',             18, 'LEFT',     'Turn left back to main aisle');
    this._edge('SNACKS_ENTRY',    'MAIN_M',             18, 'LEFT',     'Turn left back to main aisle');
    this._edge('BAKERY_ENTRY',    'MAIN_M',             20, 'RIGHT',    'Turn right back to main aisle');
    this._edge('BAKERY_BK1_SHELF3','BAKERY_ENTRY',      8,  'BACKWARD', 'Turn around. Walk back');
    this._edge('PERSONAL_P1_SHELF3','PERSONAL_ENTRY',   8,  'BACKWARD', 'Turn around. Walk back');
    this._edge('PERSONAL_P2_SHELF4','PERSONAL_ENTRY',   12, 'BACKWARD', 'Turn around. Walk back');
    this._edge('SNACKS_S1_SHELF4','SNACKS_ENTRY',       10, 'BACKWARD', 'Turn around. Walk back');
    this._edge('SNACKS_S2_SHELF2','SNACKS_ENTRY',       8,  'BACKWARD', 'Turn around. Walk back');
    this._edge('BEV_B3_SHELF4',   'BEV_ENTRY',          12, 'BACKWARD', 'Turn around. Walk back');
    this._edge('GROCERY_G1_SHELF4','GROCERY_ENTRY',     12, 'BACKWARD', 'Turn around. Walk back');
    this._edge('GROCERY_G2_SHELF4','GROCERY_ENTRY',     14, 'BACKWARD', 'Turn around. Walk back');
  }

  // ── DIJKSTRA ─────────────────────────────────────────────────
  findPath(start, end) {
    if (!this.nodes[start] || !this.nodes[end]) {
      return { found: false, path: [], totalSteps: 0 };
    }
    if (start === end) return { found: true, path: [start], totalSteps: 0 };

    const dist = {};
    const prev = {};
    const visited = new Set();
    const queue = [{ id: start, cost: 0 }];

    Object.keys(this.nodes).forEach(id => { dist[id] = Infinity; prev[id] = null; });
    dist[start] = 0;

    while (queue.length) {
      queue.sort((a, b) => a.cost - b.cost);
      const { id: cur } = queue.shift();
      if (visited.has(cur)) continue;
      visited.add(cur);
      if (cur === end) break;

      (this.adj[cur] || []).forEach(edge => {
        if (!visited.has(edge.to)) {
          const d = dist[cur] + edge.steps + 1; // +1 to avoid zero-cost ties
          if (d < dist[edge.to]) {
            dist[edge.to] = d;
            prev[edge.to] = { from: cur, edge };
            queue.push({ id: edge.to, cost: d });
          }
        }
      });
    }

    if (dist[end] === Infinity) return { found: false, path: [], totalSteps: 0 };

    // Reconstruct
    const path = [];
    let cur = end;
    while (cur !== null) {
      const p = prev[cur];
      path.unshift({ nodeId: cur, node: this.nodes[cur], edge: p ? p.edge : null });
      cur = p ? p.from : null;
    }

    return { found: true, path, totalSteps: dist[end] };
  }

  // ── TURN-BY-TURN INSTRUCTION GENERATOR ───────────────────────
  /*
    Takes a path (array of { nodeId, node, edge }) and returns
    an array of instruction objects, each one spoken to the user.

    Instruction types:
      START   – "You are at X. Starting navigation."
      FORWARD – "Walk straight ahead for N steps."
      LEFT    – "Turn left. Walk forward N steps."
      RIGHT   – "Turn right. Walk forward N steps."
      BACKWARD– "Turn around completely. Walk N steps."
      STOP    – "Stop here. Reach [direction]. [product hint]."
      ARRIVED – "You have arrived. [sensory description]."
  */
  generateInstructions(path) {
    if (!path || path.length < 2) return [];

    const instructions = [];

    path.forEach((step, i) => {
      if (i === 0) {
        instructions.push({
          index: 0,
          type: 'START',
          direction: 'START',
          steps: 0,
          text: 'Starting navigation. ' + (step.node.sensory || ''),
          nodeId: step.nodeId,
        });
        return;
      }

      const edge = step.edge;
      const turn = edge.turn;
      let text = '';

      switch (turn) {
        case 'FORWARD':
          text = (i === 1)
            ? 'Walk straight ahead for ' + edge.steps + ' steps. ' + edge.hint + '.'
            : 'Continue straight for ' + edge.steps + ' more steps. ' + edge.hint + '.';
          break;
        case 'LEFT':
          text = 'Turn left. Walk forward ' + edge.steps + ' steps. ' + edge.hint + '.';
          break;
        case 'RIGHT':
          text = 'Turn right. Walk forward ' + edge.steps + ' steps. ' + edge.hint + '.';
          break;
        case 'BACKWARD':
          text = 'Turn around completely. Walk ' + edge.steps + ' steps. ' + edge.hint + '.';
          break;
        case 'STOP':
          text = 'Stop here. ' + edge.hint + '.';
          break;
        default:
          text = edge.hint || 'Continue.';
      }

      // At the final destination
      if (i === path.length - 1) {
        text += ' ' + (step.node.sensory || '') + ' You have arrived.';
      }

      instructions.push({
        index: i,
        type: turn === 'FORWARD' ? 'WALK' : turn,
        direction: turn,
        steps: edge.steps,
        text: text.replace(/\s+/g, ' ').trim(),
        nodeId: step.nodeId,
        sensory: step.node.sensory,
      });
    });

    return instructions;
  }

  // ── BUILD FULL MULTI-STOP ROUTE ───────────────────────────────
  buildRoute(products) {
    if (!products || products.length === 0) return [];

    // Optimise order: nearest-neighbour from ENTRANCE
    const ordered = this._optimise(products);
    const route   = [];
    let currentNode = 'ENTRANCE';

    ordered.forEach((product, idx) => {
      const targetNode = product.nodeId || 'MAIN_M';
      const { path, totalSteps, found } = this.findPath(currentNode, targetNode);

      route.push({
        stopNumber:   idx + 1,
        totalStops:   ordered.length,
        product:      product,
        fromNode:     currentNode,
        toNode:       targetNode,
        found:        found,
        totalSteps:   totalSteps,
        path:         path,
        instructions: found ? this.generateInstructions(path) : [],
      });

      currentNode = found ? targetNode : currentNode;
    });

    return route;
  }

  _optimise(products) {
    if (products.length <= 1) return products;
    const remaining = [...products];
    const ordered   = [];
    let current     = 'ENTRANCE';

    while (remaining.length > 0) {
      let bestIdx   = 0;
      let bestCost  = Infinity;

      remaining.forEach((p, i) => {
        const { totalSteps } = this.findPath(current, p.nodeId || 'MAIN_M');
        if (totalSteps < bestCost) { bestCost = totalSteps; bestIdx = i; }
      });

      ordered.push(remaining[bestIdx]);
      current = remaining[bestIdx].nodeId || 'MAIN_M';
      remaining.splice(bestIdx, 1);
    }

    return ordered;
  }

  toJSON() {
    return { nodes: this.nodes, adjacency: this.adj };
  }
}

// Export a singleton
module.exports = new NavGraph();
