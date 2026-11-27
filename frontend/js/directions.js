/* directions.js — In-app routing using Google Maps DirectionsService & DirectionsRenderer */

let directionsService = null;
let directionsRenderer = null;

/* ---------- Init Directions Renderer ---------- */
function initDirectionsRenderer() {
  const map = window.mapInstance();
  if (!directionsService) {
    directionsService = new google.maps.DirectionsService();
  }
  if (!directionsRenderer) {
    directionsRenderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#6366f1',
        strokeWeight: 6,
        strokeOpacity: 0.85,
      },
    });
  } else {
    directionsRenderer.setMap(map);
  }
}

/* ---------- Start Directions ---------- */
function startDirections(destLat, destLng, destName) {
  const map = window.mapInstance();
  const userLatLng = window.getUserLatLng();

  if (!userLatLng) {
    window.showToast('📍 Location not detected. Allow location access first.', 'error');
    return;
  }

  initDirectionsRenderer();

  // Show directions panel
  const panel = document.getElementById('directionsPanel');
  panel.classList.remove('hidden');
  document.getElementById('routeSummary').innerHTML = '<div style="text-align:center;padding:12px;">⏳ Calculating Google route…</div>';
  document.getElementById('routeSteps').innerHTML = '';

  const request = {
    origin: new google.maps.LatLng(userLatLng.lat, userLatLng.lng),
    destination: new google.maps.LatLng(destLat, destLng),
    travelMode: google.maps.TravelMode.DRIVING,
  };

  directionsService.route(request, (result, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
      directionsRenderer.setDirections(result);

      const route = result.routes[0];
      const leg = route.legs[0];

      // Summary
      document.getElementById('routeSummary').innerHTML = `
        <div class="route-stat">
          <span>🏁 To: <strong>${destName}</strong></span>
        </div>
        <div class="route-stat" style="margin-top:6px;">
          <span>📏 Distance: <strong>${leg.distance.text}</strong></span>
          <span>⏱ Time: <strong>${leg.duration.text}</strong></span>
        </div>
      `;

      // Step-by-step turns
      const stepsEl = document.getElementById('routeSteps');
      stepsEl.innerHTML = leg.steps
        .map((step) => `
          <div class="route-step">
            <span class="step-icon">➡️</span>
            <span>${step.instructions} <em style="color:var(--accent)">(${step.distance.text})</em></span>
          </div>
        `)
        .join('');

      // Scroll to panel
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      document.getElementById('routeSummary').innerHTML = `
        <div style="color:var(--danger);font-size:0.85rem;">
          ⚠️ Could not calculate route: ${status}.
        </div>
      `;
    }
  });
}

/* ---------- Clear Route ---------- */
function clearRoute() {
  if (directionsRenderer) {
    directionsRenderer.setMap(null);
  }
  document.getElementById('directionsPanel').classList.add('hidden');
  document.getElementById('routeSummary').innerHTML = '';
  document.getElementById('routeSteps').innerHTML = '';
}

/* ---------- Event listener ---------- */
document.getElementById('clearRouteBtn')?.addEventListener('click', clearRoute);

/* ---------- Expose ---------- */
window.startDirections = startDirections;
window.clearRoute      = clearRoute;
