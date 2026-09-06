'use strict';
const express   = require('express');
const path      = require('path');
const cors      = require('cors');

const authRoutes     = require('./routes/auth');
const downloadRoutes = require('./routes/download');
const adminRoutes    = require('./routes/admin');
const purchaseRoutes = require('./routes/purchases');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── CORS: allow all origins (Vercel frontend + API) ── */
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Static frontend ── */
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ── API routes ── */
app.use('/api/auth',      authRoutes);
app.use('/api/download',  downloadRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/purchases', purchaseRoutes);

/* ── Health check ── */
app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

/* ── SPA fallback ── */
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

/* ── Local dev server ── */
if (require.main === module) {
  app.listen(PORT, () => console.log(`KyrexTweaks running at http://localhost:${PORT}`));
}

module.exports = app;
