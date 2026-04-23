'use strict';
const router = require('express').Router();
const db     = require('../models/storeDB');

// Lazy import to avoid circular dep at load time
function push() {
  const { toAndroid } = require('../websocket/wsHandler');
  toAndroid({
    type:    'store_updated',
    store:   db.getAll(),
    version: db.getVersion(),
    time:    new Date().toISOString(),
  });
}

router.get('/',                  (_req, res) => res.json(db.getAll()));
router.get('/products',          (_req, res) => res.json(db.getProducts()));
router.get('/products/search',   (req,  res) => res.json(db.searchProducts(req.query.q)));
router.get('/products/:id',      (req,  res) => {
  const p = db.getProducts()[req.params.id];
  return p ? res.json(p) : res.status(404).json({ error: 'not found' });
});
router.post('/products', (req, res) => {
  const p = db.addProduct(req.body);
  push();
  res.json(p);
});
router.put('/products/:id', (req, res) => {
  const p = db.updateProduct(req.params.id, req.body);
  if (!p) return res.status(404).json({ error: 'not found' });
  push();
  res.json(p);
});
router.delete('/products/:id', (req, res) => {
  db.deleteProduct(req.params.id);
  push();
  res.json({ ok: true });
});

router.get('/zones',     (_req, res) => res.json(db.getZones()));
router.get('/zones/:id', (req,  res) => {
  const z = db.getZones()[req.params.id];
  return z ? res.json(z) : res.status(404).json({ error: 'not found' });
});
router.post('/zones', (req, res) => {
  const z = db.addZone(req.body);
  push();
  res.json(z);
});
router.put('/zones/:id', (req, res) => {
  const z = db.updateZone(req.params.id, req.body);
  if (!z) return res.status(404).json({ error: 'not found' });
  push();
  res.json(z);
});
router.delete('/zones/:id', (req, res) => {
  db.deleteZone(req.params.id);
  push();
  res.json({ ok: true });
});

router.get('/landmarks', (_req, res) => res.json(db.getLandmarks()));
router.post('/landmarks', (req, res) => {
  const l = db.addLandmark(req.body);
  push();
  res.json(l);
});
router.delete('/landmarks/:idx', (req, res) => {
  db.deleteLandmark(parseInt(req.params.idx, 10));
  push();
  res.json({ ok: true });
});

router.put('/info', (req, res) => {
  const i = db.updateInfo(req.body);
  push();
  res.json(i);
});

router.get('/version', (_req, res) => res.json({ version: db.getVersion() }));

module.exports = router;
