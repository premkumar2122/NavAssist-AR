// src/services/WebSocketService.js
// Persistent WebSocket with auto-reconnect and typed message API

const DEFAULT_URL = 'ws://192.168.1.8:4000';  // Android emulator → localhost
// For real device on same WiFi: 'ws://192.168.X.X:4000'
// For production server:        'wss://your-domain.com'

class WebSocketService {
  constructor() {
    this._ws         = null;
    this._connected  = false;
    this._listeners  = {};   // event type → [callback]
    this._queue      = [];   // messages queued while disconnected
    this._attempts   = 0;
    this._maxAttempts= 20;
    this._timer      = null;
    this._url        = DEFAULT_URL;
  }

  setUrl(url) { this._url = url; }

  connect() {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) return;
    try {
      this._ws = new WebSocket(this._url);

      this._ws.onopen = () => {
        this._connected = true;
        this._attempts  = 0;
        this._emit('connected', {});
        // Identify as Android client
        this._sendRaw({ type: 'identify', role: 'android' });
        // Flush queued messages
        while (this._queue.length > 0) this._sendRaw(this._queue.shift());
      };

      this._ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          this._emit(msg.type, msg);
        } catch (_) {}
      };

      this._ws.onclose = () => {
        this._connected = false;
        this._emit('disconnected', {});
        this._reconnect();
      };

      this._ws.onerror = (err) => {
        this._emit('ws_error', { message: err.message || 'WebSocket error' });
      };
    } catch (err) {
      this._reconnect();
    }
  }

  _reconnect() {
    clearTimeout(this._timer);
    if (this._attempts >= this._maxAttempts) return;
    const delay = Math.min(2000 * Math.pow(1.4, this._attempts), 30000);
    this._attempts++;
    this._timer = setTimeout(() => this.connect(), delay);
  }

  _sendRaw(obj) {
    try {
      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        this._ws.send(JSON.stringify(obj));
      } else {
        this._queue.push(obj);
      }
    } catch (_) {}
  }

  on(type, cb) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(cb);
    return () => this.off(type, cb);
  }

  off(type, cb) {
    if (this._listeners[type]) {
      this._listeners[type] = this._listeners[type].filter(fn => fn !== cb);
    }
  }

  _emit(type, data) {
    (this._listeners[type] || []).forEach(fn => {
      try { fn(data); } catch (_) {}
    });
  }

  // ── Typed send methods ─────────────────────────────────────
  sendVoice(text)         { this._sendRaw({ type: 'voice_input', text }); }
  startNav(productIds)    { this._sendRaw({ type: 'start_navigation', productIds }); }
  stepDone(stepIndex)     { this._sendRaw({ type: 'step_done', stepIndex }); }
  itemCollected()         { this._sendRaw({ type: 'item_collected' }); }
  repeat()                { this._sendRaw({ type: 'repeat' }); }
  emergency()             { this._sendRaw({ type: 'emergency' }); }

  get connected() { return this._connected; }

  disconnect() {
    this._maxAttempts = 0;
    clearTimeout(this._timer);
    this._ws?.close();
  }
}

export default new WebSocketService();

