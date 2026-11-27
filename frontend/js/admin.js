/* admin.js: approve, reject and delete custom places. The server checks the role on every call. */
(async function () {
  const API = '/api/admin';
  const STATUSES = ['pending', 'approved', 'rejected'];
  const listEl = document.getElementById('adminList');
  const statsEl = document.getElementById('adminStats');
  const tabsEl = document.getElementById('adminTabs');
  let current = 'pending';

  if (!window.getToken || !window.getToken()) {
    window.location.href = 'login.html';
    return;
  }

  // Ask the server who we are, so a stale local role can't open this page
  const me = await fetch('/api/auth/me', { headers: window.authHeaders() })
    .then((r) => r.json())
    .catch(() => null);

  if (!me || !me.success || me.user.role !== 'admin') {
    listEl.innerHTML = '<p>You need an admin account to view this page. Redirecting…</p>';
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    return;
  }

  function renderTabs() {
    tabsEl.innerHTML = STATUSES.map((s) =>
      `<button class="admin-tab ${s === current ? 'active' : ''}" data-status="${s}">${s[0].toUpperCase() + s.slice(1)}</button>`
    ).join('');
  }

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-status]');
    if (!btn) return;
    current = btn.dataset.status;
    load();
  });

  async function loadStats() {
    const data = await fetch(`${API}/stats`, { headers: window.authHeaders() }).then((r) => r.json());
    if (!data.success) return;
    const items = [
      ['Users', data.users],
      ['Pending', data.places.pending],
      ['Approved', data.places.approved],
      ['Rejected', data.places.rejected],
    ];
    statsEl.innerHTML = items
      .map(([label, value]) => `<div class="admin-stat"><span>${label}</span><strong>${value}</strong></div>`)
      .join('');
  }

  async function load() {
    renderTabs();
    listEl.innerHTML = '<p>Loading…</p>';

    const data = await fetch(`${API}/places?status=${current}`, { headers: window.authHeaders() }).then((r) => r.json());
    if (!data.success) {
      listEl.innerHTML = `<p>${escapeHtml(data.message)}</p>`;
      return;
    }
    if (!data.places.length) {
      listEl.innerHTML = `<p>No ${current} places.</p>`;
      return;
    }

    listEl.innerHTML = data.places.map((p) => `
      <div class="admin-card" data-id="${escapeHtml(p.id)}">
        ${p.photoUrl ? `<img src="${escapeHtml(p.photoUrl)}" alt="" />` : ''}
        <div class="admin-card-body">
          <strong>${escapeHtml(p.name)}</strong> <span>· ${escapeHtml(p.category)}</span>
          <div>Added by ${escapeHtml(p.addedBy)} on ${new Date(p.createdAt).toLocaleDateString()}</div>
          <div>📍 ${Number(p.lat)}, ${Number(p.lng)}${p.address ? ' · ' + escapeHtml(p.address) : ''}</div>
          ${p.description ? `<p>${escapeHtml(p.description)}</p>` : ''}
          ${p.reviewNote ? `<div>Reason: ${escapeHtml(p.reviewNote)}</div>` : ''}
          <div class="admin-actions">
            ${current !== 'approved' ? '<button class="admin-btn ok" data-action="approved">Approve</button>' : ''}
            ${current !== 'rejected' ? '<button class="admin-btn no" data-action="rejected">Reject</button>' : ''}
            <button class="admin-btn del" data-action="delete">Delete</button>
          </div>
        </div>
      </div>`).join('');
  }

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const id = btn.closest('.admin-card').dataset.id;
    const action = btn.dataset.action;

    if (action === 'delete') {
      if (!confirm('Delete this place permanently?')) return;
      await fetch(`${API}/places/${id}`, { method: 'DELETE', headers: window.authHeaders() });
    } else {
      let reviewNote = '';
      if (action === 'rejected') {
        const note = prompt('Reason for rejecting (the owner will see this):', '');
        if (note === null) return;
        if (!note.trim()) { alert('A reason is required to reject a place.'); return; }
        reviewNote = note.trim();
      }
      const result = await fetch(`${API}/places/${id}`, {
        method: 'PATCH',
        headers: window.authHeaders(),
        body: JSON.stringify({ status: action, reviewNote }),
      }).then((r) => r.json());
      if (!result.success) alert(result.message);
    }

    await Promise.all([load(), loadStats()]);
  });

  await loadStats();
  await load();
})();
