'use strict';
const { DatabaseSync } = require('node:sqlite');
const path  = require('path');
const bcrypt = require('bcryptjs');
const fs    = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'kyrex.db'));

db.exec(`PRAGMA journal_mode = WAL;`);
db.exec(`PRAGMA foreign_keys = ON;`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'newbie',
    paid        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    last_login  TEXT
  );
  CREATE TABLE IF NOT EXISTS download_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename      TEXT    NOT NULL,
    ip            TEXT,
    downloaded_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS purchase_requests (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note       TEXT,
    status     TEXT    NOT NULL DEFAULT 'pending',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

/* helpers */
function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}
function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}
function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

/* seed admin */
const adminExists = get("SELECT id FROM users WHERE role='admin' LIMIT 1");
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 12);
  run("INSERT INTO users (username,email,password,role,paid) VALUES (?,?,?,'admin',1)",
      ['admin', 'admin@kyrextweaks.com', hash]);
  console.log('[DB] Admin seeded  →  admin / admin123');
}

const users = {
  findByEmail:     (email)    => get('SELECT * FROM users WHERE email=?', [email]),
  findByUsername:  (username) => get('SELECT * FROM users WHERE username=?', [username]),
  findById:        (id)       => get('SELECT * FROM users WHERE id=?', [id]),
  findAll:         ()         => all('SELECT id,username,email,role,paid,created_at,last_login FROM users ORDER BY created_at DESC'),
  create:          (u)        => run('INSERT INTO users (username,email,password,role,paid) VALUES (?,?,?,?,?)',
                                     [u.username, u.email, u.password, u.role, u.paid]),
  grantAccess:     (id)       => run("UPDATE users SET role='buyer', paid=1 WHERE id=?", [id]),
  revokeAccess:    (id)       => run("UPDATE users SET role='newbie', paid=0 WHERE id=?", [id]),
  updateLastLogin: (id)       => run("UPDATE users SET last_login=datetime('now') WHERE id=?", [id]),
  delete:          (id)       => run('DELETE FROM users WHERE id=?', [id]),
  stats: () => get(`
    SELECT
      (SELECT COUNT(*) FROM users)                     AS total,
      (SELECT COUNT(*) FROM users WHERE role='buyer')  AS buyers,
      (SELECT COUNT(*) FROM users WHERE role='newbie') AS newbies,
      (SELECT COUNT(*) FROM users WHERE role='admin')  AS admins,
      (SELECT COUNT(*) FROM download_logs)             AS downloads
  `),
};

const logs = {
  add:    (userId, filename, ip) => run('INSERT INTO download_logs (user_id,filename,ip) VALUES (?,?,?)', [userId, filename, ip]),
  recent: ()                     => all(`
    SELECT dl.id, dl.filename, dl.ip, dl.downloaded_at, u.username
    FROM download_logs dl JOIN users u ON u.id=dl.user_id
    ORDER BY dl.downloaded_at DESC LIMIT 100
  `),
};

const purchases = {
  create:       (userId, note)   => run('INSERT INTO purchase_requests (user_id,note) VALUES (?,?)', [userId, note]),
  findAll:      ()               => all(`SELECT pr.*, u.username, u.email FROM purchase_requests pr JOIN users u ON u.id=pr.user_id ORDER BY pr.created_at DESC`),
  findByUser:   (userId)         => all('SELECT * FROM purchase_requests WHERE user_id=? ORDER BY created_at DESC', [userId]),
  findById:     (id)             => get('SELECT * FROM purchase_requests WHERE id=?', [id]),
  updateStatus: (status, id)     => run('UPDATE purchase_requests SET status=? WHERE id=?', [status, id]),
  countPending: (userId)         => get("SELECT COUNT(*) AS cnt FROM purchase_requests WHERE user_id=? AND status='pending'", [userId]),
};

module.exports = { db, users, logs, purchases };
