-- ============================================================
-- KyrexTweaks – Supabase Postgres Schema
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id          BIGSERIAL PRIMARY KEY,
  username    TEXT      NOT NULL UNIQUE,
  email       TEXT      NOT NULL UNIQUE,
  password    TEXT      NOT NULL,
  role        TEXT      NOT NULL DEFAULT 'newbie' CHECK (role IN ('newbie','buyer','admin')),
  paid        BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login  TIMESTAMPTZ
);

-- Download logs
CREATE TABLE IF NOT EXISTS download_logs (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename      TEXT   NOT NULL,
  ip            TEXT,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Purchase requests
CREATE TABLE IF NOT EXISTS purchase_requests (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note       TEXT,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_dl_user        ON download_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_pr_user        ON purchase_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pr_status      ON purchase_requests(status);

-- Storage bucket for downloads (run separately in Storage tab or via this SQL)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('downloads', 'downloads', false)
-- ON CONFLICT DO NOTHING;
