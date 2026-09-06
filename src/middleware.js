'use strict';
const jwt        = require('jsonwebtoken');
const { users }  = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'kyrex_jwt_secret_change_me';

function signToken(user) {
  return jwt.sign({ id:user.id, username:user.username, role:user.role, paid:user.paid }, JWT_SECRET, { expiresIn:'7d' });
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error:'No token – please log in' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const fresh   = users.findById(decoded.id);
    if (!fresh) return res.status(401).json({ error:'Account not found' });
    req.user = fresh;
    next();
  } catch { res.status(401).json({ error:'Invalid or expired token' }); }
}

function requireBuyer(req, res, next) {
  if (req.user.paid && (req.user.role==='buyer'||req.user.role==='admin')) return next();
  res.status(403).json({ error:'Purchase required to access downloads' });
}

function requireAdmin(req, res, next) {
  if (req.user.role==='admin') return next();
  res.status(403).json({ error:'Admin access required' });
}

module.exports = { signToken, auth, requireBuyer, requireAdmin };
