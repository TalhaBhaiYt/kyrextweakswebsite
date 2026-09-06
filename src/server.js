'use strict';
const express    = require('express');
const path       = require('path');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const authRoutes      = require('./routes/auth');
const downloadRoutes  = require('./routes/download');
const adminRoutes     = require('./routes/admin');
const purchaseRoutes  = require('./routes/purchases');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── middleware ── */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* general rate limit */
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' }
}));

/* ── static frontend ── */
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ── API routes ── */
app.use('/api/auth',      authRoutes);
app.use('/api/download',  downloadRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/purchases', purchaseRoutes);

/* ── SPA fallback: serve index.html for unknown paths ── */
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

/* ── start ── */
app.listen(PORT, () => {
  console.log(`\n  KyrexTweaks site running at  http://localhost:${PORT}\n`);
});
