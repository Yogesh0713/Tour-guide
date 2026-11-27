/* ui.js — Category tabs, radius slider, Google Places Autocomplete, user menu, theme toggle */

let autocomplete = null;

/* ---------- Display user name in navbar ---------- */
function initUserUI() {
  const user = window.getUser();
  if (user) {
    const el = document.getElementById('userName');
    if (el) el.textContent = user.name.split(' ')[0];
    if (user.role === 'admin') document.getElementById('adminLinkBtn')?.classList.remove('hidden');
  }
}

/* ---------- User dropdown toggle ---------- */
const userMenuBtn  = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');

userMenuBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  userDropdown.classList.toggle('hidden');
});
document.addEventListener('click', () => userDropdown?.classList.add('hidden'));

/* ---------- Theme toggle ---------- */
document.getElementById('themeToggle')?.addEventListener('click', () => {
  window.toggleMapTheme();
});

/* ---------- Locate Me FAB ---------- */
document.getElementById('locateBtn')?.addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        window.flyTo(coords.latitude, coords.longitude, 15);
        window.placeUserMarker(coords.latitude, coords.longitude);
        window.loadPlaces(coords.latitude, coords.longitude);
      },
      async () => {
        window.showToast('📡 Detecting location via network...', 'info');
        try {
          const res = await fetch('https://ipapi.co/json/');
          const data = await res.json();
          if (data && data.latitude && data.longitude) {
            window.flyTo(data.latitude, data.longitude, 14);
            window.placeUserMarker(data.latitude, data.longitude);
            window.loadPlaces(data.latitude, data.longitude);
            return;
          }
        } catch (e) {}
        window.showToast('📍 Location access unavailable.', 'error');
      }
    );
  }
});

/* ---------- Category Tabs ---------- */
document.getElementById('categoryGrid')?.addEventListener('click', async (e) => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;

  document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');

  const category = btn.dataset.category;
  window.currentCategory = category;

  const userLatLng = window.getUserLatLng();
  if (userLatLng) {
    await window.loadPlaces(userLatLng.lat, userLatLng.lng);
  } else {
    window.showToast('📍 Location not available yet.', 'error');
  }
});

/* ---------- Radius Slider ---------- */
const radiusSlider = document.getElementById('radiusSlider');
const radiusLabel  = document.getElementById('radiusLabel');
let radiusDebounce;

radiusSlider?.addEventListener('input', () => {
  const val = parseInt(radiusSlider.value);
  window.currentRadius = val;
  radiusLabel.textContent = val >= 1000 ? `${(val / 1000).toFixed(1)} km` : `${val} m`;

  clearTimeout(radiusDebounce);
  radiusDebounce = setTimeout(async () => {
    const userLatLng = window.getUserLatLng();
    if (userLatLng) {
      await window.loadPlaces(userLatLng.lat, userLatLng.lng);
    }
  }, 700);
});

/* ---------- Google Places Autocomplete Search ---------- */
function setupAutocomplete() {
  const input = document.getElementById('searchInput');
  if (!input || !window.google || !window.google.maps || !window.google.maps.places) return;

  autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ['geometry', 'name', 'formatted_address'],
  });

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (!place.geometry || !place.geometry.location) {
      window.showToast('No details available for this input.', 'error');
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    window.flyTo(lat, lng, 15);
    window.placeUserMarker(lat, lng);
    window.loadPlaces(lat, lng);
  });
}

window.setupAutocomplete = setupAutocomplete;

/* ---------- Init ---------- */
initUserUI();
