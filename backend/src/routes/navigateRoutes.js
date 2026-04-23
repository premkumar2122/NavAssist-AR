'use strict';
const router   = require('express').Router();
const db       = require('../models/storeDB');
const navGraph = require('../models/navigationGraph');

// Plan an optimised multi-stop route
router.post('/plan', (req, res) => {
  const ids      = req.body.productIds || [];
  const products = ids.map(id => db.getProducts()[id]).filter(Boolean);
  if (products.length === 0) return res.status(400).json({ error: 'No valid productIds' });
  const route = navGraph.buildRoute(products);
  res.json({ route, totalStops: route.length });
});

// Get single path between two nodes
router.post('/path', (req, res) => {
  const { from, to } = req.body;
  const result       = navGraph.findPath(from || 'ENTRANCE', to);
  const instructions = navGraph.generateInstructions(result.path);
  res.json({ ...result, instructions });
});

// Expose the full graph for debugging / admin
router.get('/graph', (_req, res) => res.json(navGraph.toJSON()));

module.exports = router;
