'use strict';
const express   = require('express');
const bcrypt    = require('bcryptjs');
const { users }           = require('../database');
const { signToken, auth } = require('../middleware');

const router = express.Router();

function safe(u) {
  return { id: u.id, username: u.username, email: u.email, role: u.role, paid: u.paid, created_at: u.created_at, last_login: u.last_login };
}

/* POST /api/auth/register */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)            return res.status(400).json({ error: 'All fields required' });
    if (username.length < 3 || username.length > 30) return res.status(400).json({ error: 'Username 3-30 chars' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))  return res.status(400).json({ error: 'Invalid email' });
    if (password.length < 6)                         return res.status(400).json({ error: 'Password min 6 chars' });
    if (await users.findByEmail(email))              return res.status(409).json({ error: 'Email already registered' });
    if (await users.findByUsername(username))        return res.status(409).json({ error: 'Username taken' });

    const hash = await bcrypt.hash(password, 12);
    const user = await users.create({ username, email, password: hash, role: 'newbie', paid: false });
    res.status(201).json({ token: signToken(user), user: safe(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/* POST /api/auth/login */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await users.findByEmail(email);
    if (!user)                                          return res.status(401).json({ error: 'Invalid email or password' });
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ error: 'Invalid email or password' });
    await users.updateLastLogin(user.id);
    const fresh = await users.findById(user.id);
    res.json({ token: signToken(fresh), user: safe(fresh) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

/* GET /api/auth/me */
router.get('/me', auth, (req, res) => res.json({ user: safe(req.user) }));

module.exports = router;
