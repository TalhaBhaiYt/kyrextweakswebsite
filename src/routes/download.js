'use strict';
const express                    = require('express');
const path                       = require('path');
const fs                         = require('fs');
const { auth, requireBuyer }     = require('../middleware');
const { logs }                   = require('../database');

const router        = express.Router();
const DOWNLOADS_DIR = path.join(__dirname, '..', '..', 'downloads');

router.get('/list', auth, requireBuyer, (_, res) => {
  try {
    if (!fs.existsSync(DOWNLOADS_DIR)) return res.json({ files:[] });
    const files = fs.readdirSync(DOWNLOADS_DIR).filter(f=>!f.startsWith('.')).map(f=>{
      const s = fs.statSync(path.join(DOWNLOADS_DIR,f));
      return { name:f, size:s.size };
    });
    res.json({ files });
  } catch { res.status(500).json({ error:'Cannot read downloads' }); }
});

router.get('/file/:filename', auth, requireBuyer, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filepath = path.join(DOWNLOADS_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error:'File not found' });
  const ip = (req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim();
  logs.add(req.user.id, filename, ip);
  res.download(filepath, filename, err => { if (err&&!res.headersSent) res.status(500).json({ error:'Download failed' }); });
});

module.exports = router;
