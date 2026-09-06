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
app.get('/api/health', (_, res) => res.json({
  status: 'ok',
  ts: new Date().toISOString(),
  supabase_url: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.slice(0, 40) : 'NOT SET',
  service_key: process.env.SUPABASE_SERVICE_KEY ? 'SET (' + process.env.SUPABASE_SERVICE_KEY.slice(0,12) + '...)' : 'NOT SET',
  jwt: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
}));

/* ── DB test ── */
app.get('/api/dbtest', async (_, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await sb.from('users').select('id').limit(1);
    if (error) return res.json({ ok: false, error: error.message, hint: error.hint, code: error.code });
    res.json({ ok: true, rows: data });
  } catch(e) {
    res.json({ ok: false, error: e.message, stack: e.stack });
  }
});

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
