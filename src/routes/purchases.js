'use strict';
const express       = require('express');
const { auth }      = require('../middleware');
const { purchases } = require('../database');

const router = express.Router();

/* POST /api/purchases */
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.paid) return res.status(400).json({ error: 'You already have access.' });
    const pending = await purchases.countPending(req.user.id);
    if (pending && pending.cnt >= 3) return res.status(429).json({ error: 'Too many pending requests. Wait for approval.' });
    await purchases.create(req.user.id, (req.body.note || '').slice(0, 500));
    res.status(201).json({ message: 'Request submitted. Admin will grant access shortly.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not submit' });
  }
});

/* GET /api/purchases/mine */
router.get('/mine', auth, async (req, res) => {
  const rows = await purchases.findByUser(req.user.id);
  res.json({ requests: rows });
});

module.exports = router;
