'use strict';
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const http    = require('http');
const { WebSocketServer } = require('ws');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// REST routes
app.use('/api/store',    require('./routes/storeRoutes'));
app.use('/api/navigate', require('./routes/navigateRoutes'));
app.get('/api/health',  (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// WebSocket
const { handleConnection } = require('./websocket/wsHandler');
wss.on('connection', (ws) => handleConnection(ws, wss));

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('NavAssist backend running on port ' + PORT);
  console.log('REST  : http://0.0.0.0:' + PORT + '/api');
  console.log('WS    : ws://0.0.0.0:' + PORT);
});

module.exports = { wss };
