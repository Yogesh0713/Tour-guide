/* places.js — Fetch nearby places from backend (Google Places API proxy) */

const API_BASE_PLACES = '/api';

let currentPlaces = [];
let currentCategory = 'all';
let currentRadius   = 5000;

/* ---------- Fetch nearby places ---------- */
async function fetchNearbyPlaces(lat, lng, radius, category) {
  const loader = document.getElementById('mapLoader');
  loader.classList.remove('hidden');

  try {
    const params = new URLSearchParams({ lat, lng, radius, category });
    const res = await fetch(`${API_BASE_PLACES}/places/nearby?${params}`, {
      headers: window.authHeaders(),
    });

    if (res.status === 401) {
      window.authLogout();
      return [];
    }

    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch places');

    currentPlaces = data.places;
    return data.places;
  } catch (err) {
    console.error('Failed to fetch places:', err.message);
    showToast(`⚠️ ${err.message}`, 'error');
    return [];
  } finally {
    loader.classList.add('hidden');
  }
}

/* ---------- Load places for active category ---------- */
async function loadPlaces(lat, lng) {
  const places = await fetchNearbyPlaces(lat, lng, currentRadius, currentCategory);
  window.addPlaceMarkers(places);
  if (window.loadCommunityPlaces) window.loadCommunityPlaces();
  renderPlacesList(places);
  document.getElementById('resultsCount').textContent = places.length;
}

/* ---------- Render places list in sidebar ---------- */
function renderPlacesList(places) {
  const list = document.getElementById('placesList');
  if (!places.length) {
    list.innerHTML = `
      <div class="empty-state">
        <span>🔍</span>
        <p>No places found nearby. Try increasing the search radius.</p>
      </div>`;
    return;
  }

  const userLatLng = window.getUserLatLng();

  list.innerHTML = places
    .map((p, i) => {
      const dist = userLatLng
        ? window.computeDistance(userLatLng.lat, userLatLng.lng, p.lat, p.lng) + ' km'
        : '';
      const icon = window.CATEGORY_ICONS[p.category] || '📍';
      const rating = p.rating ? `⭐ ${p.rating} (${p.userRatingsTotal})` : '';

      return `
        <div class="place-card" onclick="window.focusPlace(${i})">
          <div class="place-card-icon">${icon}</div>
          <div class="place-card-info">
            <div class="place-card-name">${escapeHtml(p.name)}</div>
            <div class="place-card-meta">
              ${dist ? `<span>${dist}</span>` : ''}
              ${rating ? `<span style="color:#f59e0b; margin-left:6px;">${rating}</span>` : ''}
            </div>
          </div>
          <div class="place-card-actions">
            <button class="btn-icon-sm" title="Listen to AI Guide"
              onclick="event.stopPropagation(); window.startAudioGuide(${escapeHtml(JSON.stringify(p))})">
              🎧
            </button>
            <button class="btn-icon-sm" title="Get Directions"
              onclick="event.stopPropagation(); window.startDirections(${p.lat}, ${p.lng}, ${escapeHtml(JSON.stringify(p.name))})">
              🧭
            </button>
            <button class="btn-icon-sm" title="Save to Favourites"
              onclick="event.stopPropagation(); window.saveFavourite(${escapeHtml(JSON.stringify(p))}, this)">
              ⭐
            </button>
          </div>
        </div>`;
    })
    .join('');
}

/* ---------- Focus a place on the map ---------- */
function focusPlace(index) {
  const place = currentPlaces[index];
  if (!place) return;
  window.flyTo(place.lat, place.lng, 17);
  window.openPlaceModal(place);
}

/* ---------- Simple toast notification ---------- */
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:${type === 'error' ? '#ef4444' : '#6366f1'};
    color:#fff; padding:10px 20px; border-radius:999px;
    font-size:0.875rem; font-weight:600; z-index:9999;
    box-shadow:0 4px 16px rgba(0,0,0,0.2);
    animation: fadeIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* ---------- Place Detail Modal ---------- */
function openPlaceModal(place) {
  const modal   = document.getElementById('placeModal');
  const content = document.getElementById('modalContent');

  const userLatLng = window.getUserLatLng();
  const dist = userLatLng
    ? window.computeDistance(userLatLng.lat, userLatLng.lng, place.lat, place.lng) + ' km away'
    : '';

  const icon = window.CATEGORY_ICONS[place.category] || '📍';
  const ratingBadge = place.rating
    ? `<span style="background:#fef3c7; color:#d97706; padding:2px 8px; border-radius:6px; font-weight:bold; font-size:0.85rem;">⭐ ${place.rating} / 5 (${place.userRatingsTotal || 0} reviews)</span>`
    : '';

  content.innerHTML = `
    ${place.photoUrl ? `<img src="${escapeHtml(place.photoUrl)}" style="width:100%; height:180px; object-fit:cover; border-radius:12px; margin-bottom:12px;" />` : ''}
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <div class="modal-category-badge">${icon} ${escapeHtml(place.category)}</div>
      ${ratingBadge}
    </div>
    <div class="modal-place-name">${escapeHtml(place.name)}</div>
    ${dist ? `<div class="modal-meta">📏 ${dist}</div>` : ''}
    ${place.address ? `<div class="modal-meta">📍 ${escapeHtml(place.address)}</div>` : ''}
    ${place.openNow !== null ? `<div class="modal-meta">🕒 ${place.openNow ? '🟢 Open Now' : '🔴 Closed'}</div>` : ''}
    <div class="modal-actions">
      <button class="btn-action btn-audio-guide"
        onclick="window.startAudioGuide(${escapeHtml(JSON.stringify(place))})">
        🎧 Listen to Guide
      </button>
      <button class="btn-action btn-directions"
        onclick="window.startDirections(${place.lat}, ${place.lng}, ${escapeHtml(JSON.stringify(place.name))}); closePlaceModal()">
        🧭 Get Directions
      </button>
      <button class="btn-action btn-save" id="modalSaveBtn"
        onclick="window.saveFavourite(${escapeHtml(JSON.stringify(place))}, this)">
        ⭐ Save
      </button>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closePlaceModal() {
  document.getElementById('placeModal').classList.add('hidden');
}

/* ---------- Expose ---------- */
window.fetchNearbyPlaces = fetchNearbyPlaces;
window.loadPlaces        = loadPlaces;
window.focusPlace        = focusPlace;
window.openPlaceModal    = openPlaceModal;
window.closePlaceModal   = closePlaceModal;
window.showToast         = showToast;
window.getCurrentPlaces  = () => {
  const custom = (window.getCustomPlaces && window.getCustomPlaces()) || [];
  return [...currentPlaces, ...custom];
};

Object.defineProperty(window, 'currentCategory', {
  get: () => currentCategory,
  set: (v) => { currentCategory = v; },
});
Object.defineProperty(window, 'currentRadius', {
  get: () => currentRadius,
  set: (v) => { currentRadius = v; },
});
