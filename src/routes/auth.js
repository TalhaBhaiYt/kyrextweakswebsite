'use strict';
const express   = require('express');
const bcrypt    = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { users }           = require('../database');
const { signToken, auth } = require('../middleware');

const router = express.Router();

const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, message: { error: 'Too many attempts. Try again in 15 min.' } });

function safe(u) {
  return { id:u.id, username:u.username, email:u.email, role:u.role, paid:u.paid, created_at:u.created_at, last_login:u.last_login };
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username||!email||!password) return res.status(400).json({ error:'All fields required' });
    if (username.length<3||username.length>30) return res.status(400).json({ error:'Username 3-30 chars' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error:'Invalid email' });
    if (password.length<6) return res.status(400).json({ error:'Password min 6 chars' });
    if (users.findByEmail(email))    return res.status(409).json({ error:'Email already registered' });
    if (users.findByUsername(username)) return res.status(409).json({ error:'Username taken' });
    const hash = await bcrypt.hash(password, 12);
    const info = users.create({ username, email, password:hash, role:'newbie', paid:0 });
    const user = users.findById(info.lastInsertRowid);
    res.status(201).json({ token: signToken(user), user: safe(user) });
  } catch(e) { console.error(e); res.status(500).json({ error:'Registration failed' }); }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email||!password) return res.status(400).json({ error:'Email and password required' });
    const user = users.findByEmail(email);
    if (!user) return res.status(401).json({ error:'Invalid email or password' });
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ error:'Invalid email or password' });
    users.updateLastLogin(user.id);
    const fresh = users.findById(user.id);
    res.json({ token: signToken(fresh), user: safe(fresh) });
  } catch(e) { console.error(e); res.status(500).json({ error:'Login failed' }); }
});

router.get('/me', auth, (req, res) => res.json({ user: safe(req.user) }));

module.exports = router;
