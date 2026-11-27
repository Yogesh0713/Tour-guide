/* favourites.js — Save, remove, and display user favourites */

const API_BASE_FAV = '/api';

let userFavourites = []; // Cache

/* ---------- Load favourites from API ---------- */
async function loadFavourites() {
  try {
    const res  = await fetch(`${API_BASE_FAV}/favourites`, { headers: window.authHeaders() });
    if (res.status === 401) { window.authLogout(); return; }
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    userFavourites = data.favourites;
    renderFavouritesList();
    document.getElementById('favCount').textContent = userFavourites.length;
  } catch (err) {
    console.error('Load favourites error:', err.message);
  }
}

/* ---------- Save a place as favourite ---------- */
async function saveFavourite(place, btnEl) {
  // Prevent duplicate save by checking cache
  const alreadySaved = userFavourites.some((f) => f.osmId === place.osmId);
  if (alreadySaved) {
    window.showToast('⭐ Already in your favourites!', 'info');
    return;
  }

  try {
    const res = await fetch(`${API_BASE_FAV}/favourites`, {
      method: 'POST',
      headers: window.authHeaders(),
      body: JSON.stringify({
        osmId:    place.osmId,
        name:     place.name,
        category: place.category,
        lat:      place.lat,
        lng:      place.lng,
        address:  place.address || '',
        tags:     place.tags    || {},
      }),
    });

    if (res.status === 401) { window.authLogout(); return; }
    const data = await res.json();

    if (res.status === 409) {
      window.showToast('⭐ Already saved!', 'info');
      return;
    }
    if (!res.ok) throw new Error(data.message);

    window.showToast(`⭐ "${place.name}" saved to favourites!`);
    if (btnEl) { btnEl.textContent = '✅ Saved'; btnEl.disabled = true; }
    await loadFavourites();
  } catch (err) {
    window.showToast(`❌ ${err.message}`, 'error');
  }
}

/* ---------- Remove a favourite ---------- */
async function removeFavourite(id) {
  try {
    const res = await fetch(`${API_BASE_FAV}/favourites/${id}`, {
      method: 'DELETE',
      headers: window.authHeaders(),
    });
    if (res.status === 401) { window.authLogout(); return; }
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    window.showToast('🗑️ Removed from favourites.');
    await loadFavourites();
  } catch (err) {
    window.showToast(`❌ ${err.message}`, 'error');
  }
}

/* ---------- Render favourites list ---------- */
function renderFavouritesList() {
  const list = document.getElementById('favouritesList');

  if (!userFavourites.length) {
    list.innerHTML = `
      <div class="empty-state">
        <span>⭐</span>
        <p>No favourites saved yet.<br/>Tap ⭐ on any place!</p>
      </div>`;
    return;
  }

  list.innerHTML = userFavourites
    .map((fav) => {
      const icon = window.CATEGORY_ICONS[fav.category] || '📍';
      const [lng, lat] = fav.location.coordinates;
      return `
        <div class="place-card">
          <div class="place-card-icon">${icon}</div>
          <div class="place-card-info" onclick="window.flyTo(${lat}, ${lng}, 16)" style="cursor:pointer;">
            <div class="place-card-name">${escapeHtml(fav.name)}</div>
            <div class="place-card-meta">${escapeHtml(fav.category)}</div>
          </div>
          <div class="place-card-actions">
            <button class="btn-icon-sm" title="Get Directions"
              onclick="window.startDirections(${lat}, ${lng}, ${escapeHtml(JSON.stringify(fav.name))})">
              🧭
            </button>
            <button class="btn-icon-sm" style="color:var(--danger)" title="Remove"
              onclick="window.removeFavourite('${fav._id}')">
              🗑️
            </button>
          </div>
        </div>`;
    })
    .join('');
}

/* ---------- Expose ---------- */
window.loadFavourites   = loadFavourites;
window.saveFavourite    = saveFavourite;
window.removeFavourite  = removeFavourite;
