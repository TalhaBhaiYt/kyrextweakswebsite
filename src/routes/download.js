'use strict';
const express                    = require('express');
const { auth, requireBuyer }     = require('../middleware');
const { logs, storage }          = require('../database');

const router = express.Router();

/* GET /api/download/list */
router.get('/list', auth, requireBuyer, async (_, res) => {
  try {
    const files = await storage.listFiles();
    res.json({ files: files.map(f => ({ name: f.name, size: f.metadata?.size || 0 })) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Cannot read downloads' });
  }
});

/* GET /api/download/file/:filename */
router.get('/file/:filename', auth, requireBuyer, async (req, res) => {
  try {
    const filename = req.params.filename.replace(/\.\./g, '');
    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
    await logs.add(req.user.id, filename, ip);
    const signedUrl = await storage.getSignedUrl(filename);
    res.redirect(signedUrl);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Download failed' });
  }
});

module.exports = router;
