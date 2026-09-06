'use strict';
const express                    = require('express');
const multer                     = require('multer');
const { auth, requireAdmin }     = require('../middleware');
const { users, logs, purchases, storage } = require('../database');

const router = express.Router();

/* Use memory storage – file goes straight to Supabase Storage */
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.use(auth, requireAdmin);

/* GET /api/admin/stats */
router.get('/stats', async (_, res) => {
  res.json(await users.stats());
});

/* GET /api/admin/users */
router.get('/users', async (_, res) => {
  res.json({ users: await users.findAll() });
});

/* PATCH /api/admin/users/:id/grant */
router.patch('/users/:id/grant', async (req, res) => {
  const id = Number(req.params.id);
  const t  = await users.findById(id);
  if (!t)                 return res.status(404).json({ error: 'User not found' });
  if (t.role === 'admin') return res.status(400).json({ error: 'Cannot modify admin' });
  await users.grantAccess(id);
  res.json({ message: `Access granted to ${t.username}` });
});

/* PATCH /api/admin/users/:id/revoke */
router.patch('/users/:id/revoke', async (req, res) => {
  const id = Number(req.params.id);
  const t  = await users.findById(id);
  if (!t)                 return res.status(404).json({ error: 'User not found' });
  if (t.role === 'admin') return res.status(400).json({ error: 'Cannot modify admin' });
  await users.revokeAccess(id);
  res.json({ message: `Access revoked from ${t.username}` });
});

/* DELETE /api/admin/users/:id */
router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const t  = await users.findById(id);
  if (!t)                 return res.status(404).json({ error: 'User not found' });
  if (t.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin' });
  await users.delete(id);
  res.json({ message: `User ${t.username} deleted` });
});

/* GET /api/admin/purchases */
router.get('/purchases', async (_, res) => {
  res.json({ requests: await purchases.findAll() });
});

/* PATCH /api/admin/purchases/:id */
router.patch('/purchases/:id', async (req, res) => {
  const id     = Number(req.params.id);
  const status = req.body.status;
  if (!['approved', 'rejected', 'pending'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  await purchases.updateStatus(status, id);
  if (status === 'approved') {
    const pr = await purchases.findById(id);
    if (pr) await users.grantAccess(pr.user_id);
  }
  res.json({ message: `Request #${id} set to ${status}` });
});

/* GET /api/admin/logs */
router.get('/logs', async (_, res) => {
  res.json({ logs: await logs.recent() });
});

/* GET /api/admin/files */
router.get('/files', async (_, res) => {
  try {
    const files = await storage.listFiles();
    res.json({ files: files.map(f => ({ name: f.name, size: f.metadata?.size || 0, modified: f.updated_at })) });
  } catch (e) {
    res.status(500).json({ error: 'Cannot list files' });
  }
});

/* POST /api/admin/files/upload */
router.post('/files/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    await storage.uploadFile(req.file.originalname, req.file.buffer, req.file.mimetype);
    res.json({ message: 'Uploaded successfully', filename: req.file.originalname });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

/* DELETE /api/admin/files/:filename */
router.delete('/files/:filename', async (req, res) => {
  try {
    const filename = req.params.filename.replace(/\.\./g, '');
    await storage.deleteFile(filename);
    res.json({ message: `${filename} deleted` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
