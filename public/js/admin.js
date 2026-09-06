/* ================================================================
   admin.js – full logic for admin.html
   ================================================================ */

/* ── SVG icon helper ── */
function svgIcon(paths, size = '16') {
  return `<span class="icon"><svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></span>`;
}

/* Predefined icon path sets */
const ICON = {
  check:      '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  xCircle:    '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  warning:    '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  lock:       '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
  trash:      '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>',
  checkSimple:'<polyline points="20 6 9 17 4 12"/>',
  xSimple:    '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  refresh:    '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>',
};

/* ── Auth guard: admin only ── */
if (!requireAdmin()) { /* requireAdmin() redirects if needed */ }

/* ── State ── */
let allUsers     = [];
let allPurchases = [];
let allLogs      = [];
let purchaseFilter = 'all';

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  /* display admin name */
  const p = decodeToken(localStorage.getItem('kyrex_token'));
  if (p) document.getElementById('adminNameDisplay').textContent = p.username;

  /* wire sidebar tabs */
  document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });

  /* wire filter buttons */
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      purchaseFilter = btn.dataset.filter;
      renderPurchases();
    });
  });

  /* wire refresh buttons */
  document.getElementById('refreshUsersBtn').addEventListener('click', loadUsers);
  document.getElementById('refreshPurchasesBtn').addEventListener('click', loadPurchases);
  document.getElementById('refreshFilesBtn').addEventListener('click', loadFiles);
  document.getElementById('refreshLogsBtn').addEventListener('click', loadLogs);

  /* wire search inputs */
  document.getElementById('userSearch').addEventListener('input', renderUsers);
  document.getElementById('logSearch').addEventListener('input', renderLogs);

  /* wire logout */
  document.getElementById('logoutBtn').addEventListener('click', e => { e.preventDefault(); logout(); });

  /* wire file upload */
  const dropzone  = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) uploadFile(fileInput.files[0]); });
  dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', ()  => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault(); dropzone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]);
  });

  /* initial data load */
  loadStats();
  loadUsers();
  loadPurchases();
  loadFiles();
  loadLogs();
});

/* ══════════════════════════════════════════════════
   TAB SWITCHING
   ══════════════════════════════════════════════════ */
const TAB_TITLES = {
  dashboard: 'Dashboard', users: 'Users',
  purchases: 'Purchase Requests', files: 'File Management', logs: 'Download Logs'
};

function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link[data-tab]').forEach(l => l.classList.remove('active'));
  const panel = document.getElementById('tab-' + name);
  const link  = document.querySelector(`.sidebar-link[data-tab="${name}"]`);
  if (panel) panel.classList.add('active');
  if (link)  link.classList.add('active');
  document.getElementById('pageTitle').textContent = TAB_TITLES[name] || name;
}

/* ══════════════════════════════════════════════════
   STATS
   ══════════════════════════════════════════════════ */
async function loadStats() {
  try {
    const res  = await apiFetch('/api/admin/stats');
    const data = await res.json();
    if (!res.ok) return;
    document.getElementById('st-total').textContent     = data.total     ?? '—';
    document.getElementById('st-buyers').textContent    = data.buyers    ?? '—';
    document.getElementById('st-newbies').textContent   = data.newbies   ?? '—';
    document.getElementById('st-downloads').textContent = data.downloads ?? '—';
  } catch { /* silent */ }
}

/* ══════════════════════════════════════════════════
   USERS
   ══════════════════════════════════════════════════ */
async function loadUsers() {
  setTableLoading('usersBody', 7, 'Loading users…');
  try {
    const res  = await apiFetch('/api/admin/users');
    const data = await res.json();
    if (!res.ok) { setTableError('usersBody', 7, data.error); return; }
    allUsers = data.users || [];
    renderUsers();
    loadStats();
  } catch { setTableError('usersBody', 7, 'Network error'); }
}

function renderUsers() {
  const q    = (document.getElementById('userSearch').value || '').toLowerCase();
  const rows = allUsers.filter(u =>
    u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );
  const tbody = document.getElementById('usersBody');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">No users found.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(u => `
    <tr>
      <td style="color:var(--text-muted);font-size:0.82rem;">${u.id}</td>
      <td><strong>${escHtml(u.username)}</strong></td>
      <td style="color:var(--text-dim);font-size:0.85rem;">${escHtml(u.email)}</td>
      <td><span class="badge badge-${u.role}">${u.role}</span></td>
      <td>
        ${u.paid
          ? `<span style="color:var(--green);font-size:0.85rem;display:inline-flex;align-items:center;gap:4px;">${svgIcon(ICON.checkSimple)} Active</span>`
          : `<span style="color:var(--text-muted);font-size:0.85rem;display:inline-flex;align-items:center;gap:4px;">${svgIcon(ICON.xSimple)} Locked</span>`}
      </td>
      <td style="color:var(--text-dim);font-size:0.82rem;">${formatDate(u.created_at)}</td>
      <td>
        <div class="tbl-actions">
          ${u.role !== 'admin' ? `
            ${!u.paid
              ? `<button class="btn btn-success btn-sm" onclick="grantAccess(${u.id},'${escHtml(u.username)}')">${svgIcon(ICON.checkSimple)} Grant</button>`
              : `<button class="btn btn-ghost btn-sm"   onclick="revokeAccess(${u.id},'${escHtml(u.username)}')">${svgIcon(ICON.xSimple)} Revoke</button>`
            }
            <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id},'${escHtml(u.username)}')">${svgIcon(ICON.trash)}</button>
          ` : '<span style="color:var(--text-muted);font-size:0.8rem;">Protected</span>'}
        </div>
      </td>
    </tr>`).join('');
}

async function grantAccess(id, username) {
  openConfirm({
    icon: svgIcon(ICON.check, '32'), title: `Grant access to ${username}?`,
    desc: 'Their role will be upgraded to Buyer and downloads will unlock.',
    okLabel: 'Grant Access', okClass: 'btn-success',
    onOk: async () => {
      try {
        const res  = await apiFetch(`/api/admin/users/${id}/grant`, { method: 'PATCH' });
        const data = await res.json();
        showToast(res.ok ? data.message : data.error, res.ok ? 'success' : 'error');
        if (res.ok) loadUsers();
      } catch { showToast('Network error', 'error'); }
    }
  });
}

async function revokeAccess(id, username) {
  openConfirm({
    icon: svgIcon(ICON.lock, '32'), title: `Revoke access from ${username}?`,
    desc: 'Their role will revert to Newbie and downloads will be locked.',
    okLabel: 'Revoke Access', okClass: 'btn-danger',
    onOk: async () => {
      try {
        const res  = await apiFetch(`/api/admin/users/${id}/revoke`, { method: 'PATCH' });
        const data = await res.json();
        showToast(res.ok ? data.message : data.error, res.ok ? 'success' : 'error');
        if (res.ok) loadUsers();
      } catch { showToast('Network error', 'error'); }
    }
  });
}

async function deleteUser(id, username) {
  openConfirm({
    icon: svgIcon(ICON.trash, '32'), title: `Delete user "${username}"?`,
    desc: 'This will permanently delete the account and all their data.',
    okLabel: 'Delete User', okClass: 'btn-danger',
    onOk: async () => {
      try {
        const res  = await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        const data = await res.json();
        showToast(res.ok ? data.message : data.error, res.ok ? 'success' : 'error');
        if (res.ok) loadUsers();
      } catch { showToast('Network error', 'error'); }
    }
  });
}

/* ══════════════════════════════════════════════════
   PURCHASES
   ══════════════════════════════════════════════════ */
async function loadPurchases() {
  setTableLoading('purchasesBody', 7, 'Loading requests…');
  try {
    const res  = await apiFetch('/api/admin/purchases');
    const data = await res.json();
    if (!res.ok) { setTableError('purchasesBody', 7, data.error); return; }
    allPurchases = data.requests || [];
    renderPurchases();
    /* show/hide pending dot */
    const pending = allPurchases.filter(p => p.status === 'pending').length;
    const dot = document.getElementById('pendingDot');
    dot.style.display = pending > 0 ? 'inline-block' : 'none';
  } catch { setTableError('purchasesBody', 7, 'Network error'); }
}

function renderPurchases() {
  const rows = purchaseFilter === 'all'
    ? allPurchases
    : allPurchases.filter(p => p.status === purchaseFilter);

  const tbody = document.getElementById('purchasesBody');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">No requests found.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td style="color:var(--text-muted);font-size:0.82rem;">${r.id}</td>
      <td><strong>${escHtml(r.username)}</strong></td>
      <td style="color:var(--text-dim);font-size:0.82rem;">${escHtml(r.email)}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.85rem;color:var(--text-dim);" title="${escHtml(r.note || '')}">${escHtml(r.note || '—')}</td>
      <td><span class="badge badge-${r.status}">${r.status}</span></td>
      <td style="color:var(--text-dim);font-size:0.82rem;">${formatDate(r.created_at)}</td>
      <td>
        <div class="tbl-actions">
          ${r.status !== 'approved' ? `<button class="btn btn-success btn-sm" onclick="updatePurchase(${r.id},'approved','${escHtml(r.username)}')">${svgIcon(ICON.checkSimple)} Approve</button>` : ''}
          ${r.status !== 'rejected' ? `<button class="btn btn-danger btn-sm"  onclick="updatePurchase(${r.id},'rejected','${escHtml(r.username)}')">${svgIcon(ICON.xSimple)} Reject</button>`  : ''}
          ${r.status !== 'pending'  ? `<button class="btn btn-ghost btn-sm"   onclick="updatePurchase(${r.id},'pending','${escHtml(r.username)}')">${svgIcon(ICON.refresh)} Reset</button>`    : ''}
        </div>
      </td>
    </tr>`).join('');
}

async function updatePurchase(id, status, username) {
  const labels = { approved: 'Approve', rejected: 'Reject', pending: 'Reset to Pending' };
  const icons  = {
    approved: svgIcon(ICON.check, '32'),
    rejected: svgIcon(ICON.xCircle, '32'),
    pending:  svgIcon(ICON.refresh, '32')
  };
  const descs  = {
    approved: `This will grant ${username} full download access.`,
    rejected: `The request from ${username} will be marked as rejected.`,
    pending:  `The request will be reset to pending status.`
  };
  openConfirm({
    icon: icons[status], title: `${labels[status]} request #${id}?`,
    desc: descs[status],
    okLabel: labels[status],
    okClass: status === 'approved' ? 'btn-success' : status === 'rejected' ? 'btn-danger' : 'btn-ghost',
    onOk: async () => {
      try {
        const res  = await apiFetch(`/api/admin/purchases/${id}`, {
          method: 'PATCH', body: JSON.stringify({ status })
        });
        const data = await res.json();
        showToast(res.ok ? data.message : data.error, res.ok ? 'success' : 'error');
        if (res.ok) { loadPurchases(); loadUsers(); }
      } catch { showToast('Network error', 'error'); }
    }
  });
}

/* ══════════════════════════════════════════════════
   FILES
   ══════════════════════════════════════════════════ */
async function loadFiles() {
  setTableLoading('filesBody', 4, 'Loading files…');
  try {
    const res  = await apiFetch('/api/admin/files');
    const data = await res.json();
    if (!res.ok) { setTableError('filesBody', 4, data.error); return; }
    const files = data.files || [];
    const tbody = document.getElementById('filesBody');
    if (!files.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-muted);">No files uploaded yet. Use the upload zone above.</td></tr>`;
      return;
    }
    tbody.innerHTML = files.map(f => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            ${getFileIcon(f.name)}
            <span style="font-weight:600;">${escHtml(f.name)}</span>
          </div>
        </td>
        <td style="color:var(--text-dim);">${formatBytes(f.size)}</td>
        <td style="color:var(--text-dim);font-size:0.82rem;">${formatDate(f.modified, true)}</td>
        <td>
          <div class="tbl-actions">
            <button class="btn btn-danger btn-sm" onclick="deleteFile('${escHtml(f.name)}')">${svgIcon(ICON.trash)} Delete</button>
          </div>
        </td>
      </tr>`).join('');
  } catch { setTableError('filesBody', 4, 'Network error'); }
}

async function uploadFile(file) {
  const barWrap  = document.getElementById('uploadBarWrap');
  const barFill  = document.getElementById('uploadBarFill');
  const barPct   = document.getElementById('uploadPct');
  const fileName = document.getElementById('uploadFileName');

  barWrap.style.display = 'block';
  fileName.textContent  = file.name;
  barFill.style.width   = '0%';
  barPct.textContent    = '0%';

  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/files/upload');
    xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('kyrex_token'));

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        barFill.style.width = pct + '%';
        barPct.textContent  = pct + '%';
      }
    });

    xhr.addEventListener('load', () => {
      setTimeout(() => { barWrap.style.display = 'none'; }, 1500);
      if (xhr.status === 200) {
        showToast('File uploaded successfully', 'success');
        loadFiles();
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          showToast(err.error || 'Upload failed', 'error');
        } catch { showToast('Upload failed', 'error'); }
      }
      document.getElementById('fileInput').value = '';
      resolve();
    });

    xhr.addEventListener('error', () => {
      showToast('Upload failed – network error', 'error');
      barWrap.style.display = 'none';
      resolve();
    });

    xhr.send(formData);
  });
}

async function deleteFile(filename) {
  openConfirm({
    icon: svgIcon(ICON.trash, '32'), title: `Delete "${filename}"?`,
    desc: 'This file will be permanently removed from the server. Buyers will no longer be able to download it.',
    okLabel: 'Delete File', okClass: 'btn-danger',
    onOk: async () => {
      try {
        const res  = await apiFetch('/api/admin/files/' + encodeURIComponent(filename), { method: 'DELETE' });
        const data = await res.json();
        showToast(res.ok ? data.message : data.error, res.ok ? 'success' : 'error');
        if (res.ok) loadFiles();
      } catch { showToast('Network error', 'error'); }
    }
  });
}

/* ══════════════════════════════════════════════════
   DOWNLOAD LOGS
   ══════════════════════════════════════════════════ */
async function loadLogs() {
  setTableLoading('logsBody', 5, 'Loading logs…');
  try {
    const res  = await apiFetch('/api/admin/logs');
    const data = await res.json();
    if (!res.ok) { setTableError('logsBody', 5, data.error); return; }
    allLogs = data.logs || [];
    renderLogs();
  } catch { setTableError('logsBody', 5, 'Network error'); }
}

function renderLogs() {
  const q = (document.getElementById('logSearch').value || '').toLowerCase();
  const rows = allLogs.filter(l =>
    (l.username || '').toLowerCase().includes(q) ||
    (l.filename  || '').toLowerCase().includes(q)
  );
  const tbody = document.getElementById('logsBody');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted);">No download logs yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(l => `
    <tr>
      <td style="color:var(--text-muted);font-size:0.82rem;">${l.id}</td>
      <td><strong>${escHtml(l.username || '—')}</strong></td>
      <td style="font-size:0.85rem;">
        <div style="display:flex;align-items:center;gap:6px;">
          ${getFileIcon(l.filename)}
          <span>${escHtml(l.filename)}</span>
        </div>
      </td>
      <td style="color:var(--text-dim);font-size:0.82rem;font-family:var(--mono);">${escHtml(l.ip || '—')}</td>
      <td style="color:var(--text-dim);font-size:0.82rem;">${formatDate(l.downloaded_at, true)}</td>
    </tr>`).join('');
}

/* ══════════════════════════════════════════════════
   TABLE HELPERS
   ══════════════════════════════════════════════════ */
function setTableLoading(tbodyId, cols, msg = 'Loading…') {
  document.getElementById(tbodyId).innerHTML =
    `<tr><td colspan="${cols}" style="text-align:center;padding:32px;color:var(--text-muted);">
       <div class="spinner" style="margin:0 auto 10px;"></div>${msg}
     </td></tr>`;
}

function setTableError(tbodyId, cols, msg = 'Error loading data') {
  document.getElementById(tbodyId).innerHTML =
    `<tr><td colspan="${cols}" style="text-align:center;padding:32px;color:var(--red);">
      ${svgIcon(ICON.warning)} ${escHtml(msg)}
     </td></tr>`;
}

/* ══════════════════════════════════════════════════
   AUTO-REFRESH every 30 s (stats + purchases)
   ══════════════════════════════════════════════════ */
setInterval(() => { loadStats(); loadPurchases(); }, 30000);
