/* app.js — Entry point: auth guard, Google Maps dynamic load, geolocation, bootstrap */

/* ---- Default location: centre of India (fallback) ---- */
const DEFAULT_LAT = 20.5937;
const DEFAULT_LNG = 78.9629;
const DEFAULT_ZOOM = 5;

/* ---- Bootstrap App ---- */
(async function bootstrap() {
  if (window.requireAuth && !window.requireAuth()) {
    return;
  }

  try {
    // 1. Fetch Google Maps config from backend
    const configRes = await fetch('/api/places/config', {
      headers: window.authHeaders(),
    });

    if (configRes.status === 401) {
      window.authLogout();
      return;
    }

    const config = await configRes.json();
    if (!config.apiKey) {
      window.showToast('⚠️ Google Maps API Key is missing in backend .env', 'error');
      return;
    }

    // 2. Load Google Maps SDK
    await window.loadGoogleMapsScript(config.apiKey);

    // 3. Init Google Map with Map ID
    window.initMap(DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM, config.mapId);

    // 4. Setup Autocomplete on search input
    if (window.setupAutocomplete) {
      window.setupAutocomplete();
    }

    // 5. Load user's favourites & custom places from MongoDB
    await window.loadFavourites();
    if (window.loadCustomPlaces) {
      await window.loadCustomPlaces();
    }

    // 6. Request Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        onLocationSuccess,
        onLocationError,
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
      );
    } else {
      onLocationError({ code: 0, message: 'Geolocation not supported by this browser.' });
    }
  } catch (err) {
    console.error('Bootstrap error:', err);
    window.showToast(`Failed to initialize Google Maps: ${err.message}`, 'error');
  }
})();

/* ---- Geolocation success ---- */
async function onLocationSuccess(position) {
  const { latitude: lat, longitude: lng, accuracy } = position.coords;

  // Centre map on user
  window.flyTo(lat, lng, 15);
  window.placeUserMarker(lat, lng);

  window.showToast(`📍 Location found! Accuracy: ±${Math.round(accuracy)}m`);

  // Auto-load nearby places
  await window.loadPlaces(lat, lng);
}

/* ---- Geolocation error with IP-based Fallback ---- */
async function onLocationError(err) {
  console.warn('Browser geolocation error, attempting IP fallback:', err);

  window.showToast('📡 Detecting approximate location via IP...', 'info');

  try {
    // Free IP geolocation lookup
    const ipRes = await fetch('https://ipapi.co/json/');
    const ipData = await ipRes.json();

    if (ipData && ipData.latitude && ipData.longitude) {
      const lat = parseFloat(ipData.latitude);
      const lng = parseFloat(ipData.longitude);

      window.flyTo(lat, lng, 14);
      window.placeUserMarker(lat, lng);
      window.showToast(`📍 Located in ${ipData.city || 'your area'}, ${ipData.region || ''}`);
      await window.loadPlaces(lat, lng);
      return;
    }
  } catch (fallbackErr) {
    console.error('IP fallback failed:', fallbackErr);
  }

  // If all fails, show default center
  window.showToast('⚠️ Could not detect location. Use search bar to find places.', 'error');
  window.flyTo(DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM);
}
