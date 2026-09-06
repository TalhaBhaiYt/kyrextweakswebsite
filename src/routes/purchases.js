'use strict';
const express       = require('express');
const { auth }      = require('../middleware');
const { purchases } = require('../database');

const router = express.Router();

router.post('/', auth, (req, res) => {
  try {
    if (req.user.paid) return res.status(400).json({ error:'You already have access.' });
    const pending = purchases.countPending(req.user.id);
    if (pending && pending.cnt >= 3) return res.status(429).json({ error:'Too many pending requests. Wait for approval.' });
    purchases.create(req.user.id, (req.body.note||'').slice(0,500));
    res.status(201).json({ message:'Request submitted. Admin will grant access shortly.' });
  } catch(e) { console.error(e); res.status(500).json({ error:'Could not submit' }); }
});

router.get('/mine', auth, (req, res) => {
  res.json({ requests: purchases.findByUser(req.user.id) });
});

module.exports = router;
