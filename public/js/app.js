/* ================================================================
   app.js – shared helpers used by every page
   ================================================================ */

/* ── Toast notifications ── */
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '<span class="icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>',
    error:   '<span class="icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></span>',
    warning: '<span class="icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>',
    info:    '<span class="icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></span>'
  };
  const iconHtml = icons[type] || icons.info;
  toast.innerHTML = `<span style="margin-right:8px;">${iconHtml}</span>${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    toast.style.opacity    = '0';
    toast.style.transform  = 'translateX(30px)';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/* ── Authenticated fetch wrapper ── */
function apiFetch(url, options = {}) {
  const token = localStorage.getItem('kyrex_token');
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, Object.assign({}, options, { headers }));
}

/* ── Logout helper ── */
function logout() {
  localStorage.removeItem('kyrex_token');
  localStorage.removeItem('kyrex_user');
  window.location.href = '/login.html';
}

/* ── Decode JWT payload (no verification – display only) ── */
function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

/* ── Check whether stored token is still valid ── */
function isLoggedIn() {
  const token = localStorage.getItem('kyrex_token');
  if (!token) return false;
  const p = decodeToken(token);
  return p && p.exp * 1000 > Date.now();
}

/* ── Require admin – call at top of admin pages ── */
function requireAdmin() {
  if (!isLoggedIn()) { window.location.href = '/login.html'; return false; }
  const p = decodeToken(localStorage.getItem('kyrex_token'));
  if (p && p.role !== 'admin') { window.location.href = '/dashboard.html'; return false; }
  return true;
}

/* ── Escape HTML to prevent XSS ── */
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ── Format byte sizes ── */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024)          return bytes + ' B';
  if (bytes < 1048576)       return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824)    return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

/* ── Format ISO date string ── */
function formatDate(s, includeTime = false) {
  if (!s) return '—';
  const d = new Date(s.endsWith('Z') ? s : s + 'Z');
  if (isNaN(d)) return s;
  const opts = { year: 'numeric', month: 'short', day: 'numeric' };
  if (includeTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
  return d.toLocaleDateString(undefined, opts);
}

/* ── Get file type icon ── */
function getFileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  const gear   = '<span class="icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></span>';
  const box    = '<span class="icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span>';
  const file   = '<span class="icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>';
  const image  = '<span class="icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></span>';
  const folder = '<span class="icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg></span>';
  const map = { exe: gear, zip: box, rar: box, '7z': box, pdf: file, txt: file, md: file, png: image, jpg: image };
  return map[ext] || folder;
}

/* ── Confirm modal helper (used in admin) ── */
function openConfirm({ icon = '<span class="icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>', title = 'Are you sure?', desc = 'This action cannot be undone.', okLabel = 'Confirm', okClass = 'btn-danger', onOk }) {
  const overlay = document.getElementById('confirmModal');
  if (!overlay) { if (confirm(title + '\n' + desc)) onOk(); return; }

  document.getElementById('confirmIcon').innerHTML = icon;
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmDesc').textContent  = desc;

  const okBtn = document.getElementById('confirmOk');
  okBtn.textContent = okLabel;
  okBtn.className   = 'btn ' + okClass;

  overlay.classList.add('open');

  const close = () => overlay.classList.remove('open');

  const handleOk = () => { close(); onOk(); cleanup(); };
  const handleCancel = () => { close(); cleanup(); };

  function cleanup() {
    okBtn.removeEventListener('click', handleOk);
    document.getElementById('confirmCancel').removeEventListener('click', handleCancel);
    overlay.removeEventListener('click', handleOverlay);
  }
  function handleOverlay(e) { if (e.target === overlay) handleCancel(); }

  okBtn.addEventListener('click', handleOk);
  document.getElementById('confirmCancel').addEventListener('click', handleCancel);
  overlay.addEventListener('click', handleOverlay);
}

/* ── Tab switcher (shared pattern) ── */
function initTabs(selector, tabPanelPrefix) {
  document.querySelectorAll(selector).forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const tab = link.dataset.tab;
      if (!tab) return;
      document.querySelectorAll(selector).forEach(l => l.classList.remove('active'));
      document.querySelectorAll(`[id^="${tabPanelPrefix}"]`).forEach(p => p.classList.remove('active'));
      link.classList.add('active');
      const panel = document.getElementById(tabPanelPrefix + tab);
      if (panel) panel.classList.add('active');
    });
  });
}
