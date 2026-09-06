'use strict';
const express                    = require('express');
const path                       = require('path');
const fs                         = require('fs');
const multer                     = require('multer');
const { auth, requireAdmin }     = require('../middleware');
const { users, logs, purchases } = require('../database');

const router        = express.Router();
const DOWNLOADS_DIR = path.join(__dirname, '..', '..', 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive:true });

const storage = multer.diskStorage({
  destination: (_,__,cb) => cb(null, DOWNLOADS_DIR),
  filename:    (_,file,cb) => cb(null, path.basename(file.originalname))
});
const upload = multer({ storage, limits:{ fileSize:500*1024*1024 } });

router.use(auth, requireAdmin);

router.get('/stats',   (_, res) => res.json(users.stats()));
router.get('/users',   (_, res) => res.json({ users: users.findAll() }));

router.patch('/users/:id/grant', (req, res) => {
  const id = Number(req.params.id);
  const t  = users.findById(id);
  if (!t) return res.status(404).json({ error:'User not found' });
  if (t.role==='admin') return res.status(400).json({ error:'Cannot modify admin' });
  users.grantAccess(id);
  res.json({ message:`Access granted to ${t.username}` });
});

router.patch('/users/:id/revoke', (req, res) => {
  const id = Number(req.params.id);
  const t  = users.findById(id);
  if (!t) return res.status(404).json({ error:'User not found' });
  if (t.role==='admin') return res.status(400).json({ error:'Cannot modify admin' });
  users.revokeAccess(id);
  res.json({ message:`Access revoked from ${t.username}` });
});

router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const t  = users.findById(id);
  if (!t) return res.status(404).json({ error:'User not found' });
  if (t.role==='admin') return res.status(400).json({ error:'Cannot delete admin' });
  users.delete(id);
  res.json({ message:`User ${t.username} deleted` });
});

router.get('/purchases', (_, res) => res.json({ requests: purchases.findAll() }));

router.patch('/purchases/:id', (req, res) => {
  const id     = Number(req.params.id);
  const status = req.body.status;
  if (!['approved','rejected','pending'].includes(status)) return res.status(400).json({ error:'Invalid status' });
  purchases.updateStatus(status, id);
  if (status==='approved') {
    const pr = purchases.findById(id);
    if (pr) users.grantAccess(pr.user_id);
  }
  res.json({ message:`Request #${id} set to ${status}` });
});

router.get('/logs', (_, res) => res.json({ logs: logs.recent() }));

router.get('/files', (_, res) => {
  if (!fs.existsSync(DOWNLOADS_DIR)) return res.json({ files:[] });
  const files = fs.readdirSync(DOWNLOADS_DIR).filter(f=>!f.startsWith('.')).map(f=>{
    const s = fs.statSync(path.join(DOWNLOADS_DIR,f));
    return { name:f, size:s.size, modified:s.mtime };
  });
  res.json({ files });
});

router.post('/files/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error:'No file uploaded' });
  res.json({ message:'Uploaded', filename:req.file.filename });
});

router.delete('/files/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filepath = path.join(DOWNLOADS_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error:'Not found' });
  fs.unlinkSync(filepath);
  res.json({ message:`${filename} deleted` });
});

module.exports = router;
