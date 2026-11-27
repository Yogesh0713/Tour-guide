/* map.js — Google Maps JavaScript API integration */

const CATEGORY_COLORS = {
  all:        '#6366f1',
  temple:     '#f59e0b',
  mosque:     '#10b981',
  church:     '#8b5cf6',
  cafe:       '#f97316',
  restaurant: '#ef4444',
  historical: '#a16207',
  museum:     '#0ea5e9',
  park:       '#22c55e',
  hotel:      '#ec4899',
  hospital:   '#e11d48',
  atm:        '#64748b',
};

const CATEGORY_ICONS = {
  all:        '🌐',
  temple:     '🛕',
  mosque:     '🕌',
  church:     '⛪',
  cafe:       '☕',
  restaurant: '🍽️',
  historical: '🏛️',
  museum:     '🏺',
  park:       '🌳',
  hotel:      '🏨',
  hospital:   '🏥',
  atm:        '🏧',
};

let map = null;
let userMarker = null;
let placeMarkers = [];
let userLatLng = null; // { lat, lng }
let activeInfoWindow = null;
let isDark = false;

// Dark mode styles for Google Maps
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];

/* ---------- Load Google Maps Script Dynamically ---------- */
function loadGoogleMapsScript(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

/* ---------- Init Map ---------- */
function initMap(lat = 20.5937, lng = 78.9629, zoom = 14, mapId = null) {
  const mapDiv = document.getElementById('map');
  const mapOptions = {
    center: { lat, lng },
    zoom,
    mapTypeControl: false,
    streetViewControl: true,
    fullscreenControl: false,
    zoomControl: true,
  };

  if (mapId) {
    mapOptions.mapId = mapId;
  }

  map = new google.maps.Map(mapDiv, mapOptions);
  activeInfoWindow = new google.maps.InfoWindow();
  return map;
}

/* ---------- Toggle Dark/Light Map ---------- */
function toggleMapTheme() {
  isDark = !isDark;
  if (!map) return;

  if (isDark) {
    map.setOptions({ styles: darkMapStyle });
    document.getElementById('themeToggle').textContent = '☀️';
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    map.setOptions({ styles: [] });
    document.getElementById('themeToggle').textContent = '🌙';
    document.documentElement.removeAttribute('data-theme');
  }
}

/* ---------- Place User Marker ---------- */
function placeUserMarker(lat, lng) {
  userLatLng = { lat, lng };

  if (userMarker) {
    userMarker.setMap(null);
  }

  // Create blue dot user pin
  userMarker = new google.maps.Marker({
    position: { lat, lng },
    map,
    title: 'You are here',
    zIndex: 9999,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 9,
      fillColor: '#3b82f6',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
    },
  });
}

/* ---------- Calculate Distance in km ---------- */
function computeDistance(lat1, lon1, lat2, lon2) {
  if (!google.maps.geometry) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  }
  const from = new google.maps.LatLng(lat1, lon1);
  const to = new google.maps.LatLng(lat2, lon2);
  return (google.maps.geometry.spherical.computeDistanceBetween(from, to) / 1000).toFixed(1);
}

/* ---------- Add Place Markers ---------- */
function addPlaceMarkers(places) {
  clearPlaceMarkers();

  places.forEach((place) => {
    const color = CATEGORY_COLORS[place.category] || CATEGORY_COLORS.all;

    // SVG Pin Icon with category color
    const pinSvg = `data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 24 24"><path fill="${encodeURIComponent(color)}" stroke="%23ffffff" stroke-width="1.5" d="M12 0c-4.418 0-8 3.582-8 8 0 5.25 8 16 8 16s8-10.75 8-16c0-4.418-3.582-8-8-8z"/><circle cx="12" cy="8" r="3.5" fill="%23ffffff"/></svg>`;

    const marker = new google.maps.Marker({
      position: { lat: place.lat, lng: place.lng },
      map,
      title: place.name,
      icon: {
        url: pinSvg,
        scaledSize: new google.maps.Size(32, 38),
        anchor: new google.maps.Point(16, 38),
      },
    });

    marker.addListener('click', () => {
      const dist = userLatLng
        ? ` · ${computeDistance(userLatLng.lat, userLatLng.lng, place.lat, place.lng)} km away`
        : '';

      const ratingStr = place.rating
        ? `<div style="color:#f59e0b; font-weight:bold; margin-bottom:4px;">⭐ ${place.rating} (${place.userRatingsTotal || 0} reviews)</div>`
        : '';

      const content = `
        <div class="custom-popup" style="color:#1e293b; font-family:sans-serif;">
          ${place.photoUrl ? `<img src="${escapeHtml(place.photoUrl)}" style="width:100%; height:110px; object-fit:cover; border-radius:8px; margin-bottom:8px;" />` : ''}
          <h4 style="margin:0 0 4px 0; font-size:1rem;">${escapeHtml(place.name)}</h4>
          ${ratingStr}
          <p style="margin:0 0 10px 0; font-size:0.8rem; color:#64748b;">
            ${CATEGORY_ICONS[place.category] || '📍'} ${escapeHtml(place.category)}${dist}
          </p>
          <button class="popup-btn" style="background:#6366f1; color:#fff; border:none; border-radius:6px; padding:6px 12px; width:100%; cursor:pointer; font-weight:600; margin-bottom:6px;"
            onclick="window.openPlaceModal(${escapeHtml(JSON.stringify(place))})">
            View Details
          </button>
          <button class="popup-btn" style="background:linear-gradient(135deg, #d97757, #c25c42); color:#fff; border:none; border-radius:6px; padding:6px 12px; width:100%; cursor:pointer; font-weight:600; margin-bottom:6px;"
            onclick="window.startAudioGuide(${escapeHtml(JSON.stringify(place))})">
            🎧 Listen to Guide
          </button>
          <button class="popup-btn popup-btn-outline" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:6px 12px; width:100%; cursor:pointer; font-weight:600;"
            onclick="window.startDirections(${place.lat}, ${place.lng}, ${escapeHtml(JSON.stringify(place.name))})">
            🧭 Get Directions
          </button>
        </div>
      `;

      activeInfoWindow.setContent(content);
      activeInfoWindow.open(map, marker);
    });

    placeMarkers.push(marker);
  });
}

/* ---------- Clear Place Markers ---------- */
function clearPlaceMarkers() {
  placeMarkers.forEach((m) => m.setMap(null));
  placeMarkers = [];
  if (activeInfoWindow) activeInfoWindow.close();
}

/* ---------- Fly to Location ---------- */
function flyTo(lat, lng, zoom = 15) {
  if (!map) return;
  map.setZoom(zoom);
  map.panTo({ lat, lng });
}

/* ---------- Itinerary Multi-Stop Route on Map ---------- */
let itineraryMarkers = [];
let itineraryPolyline = null;

function clearItineraryRoute() {
  itineraryMarkers.forEach(m => m.setMap(null));
  itineraryMarkers = [];
  if (itineraryPolyline) {
    itineraryPolyline.setMap(null);
    itineraryPolyline = null;
  }
}

function drawItineraryRoute(stops) {
  if (!map || !Array.isArray(stops) || stops.length === 0) return;

  clearItineraryRoute();

  const bounds = new google.maps.LatLngBounds();
  const pathCoords = [];

  stops.forEach((stop, idx) => {
    const pos = { lat: stop.lat, lng: stop.lng };
    bounds.extend(pos);
    pathCoords.push(pos);

    // Numbered badge SVG icon
    const number = stop.stopNumber || idx + 1;
    const svgBadge = `data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="38" height="48" viewBox="0 0 28 36"><path fill="%23d97757" stroke="%23ffffff" stroke-width="2" d="M14 0c-7.732 0-14 6.268-14 14 0 9.188 14 22 14 22s14-12.812 14-22c0-7.732-6.268-14-14-14z"/><circle cx="14" cy="14" r="10" fill="%23ffffff"/><text x="14" y="18" font-size="11" font-weight="bold" fill="%23d97757" text-anchor="middle" font-family="sans-serif">${number}</text></svg>`;

    const marker = new google.maps.Marker({
      position: pos,
      map,
      title: `Stop ${number}: ${stop.name}`,
      zIndex: 1000 + idx,
      icon: {
        url: svgBadge,
        scaledSize: new google.maps.Size(36, 46),
        anchor: new google.maps.Point(18, 46),
      },
    });

    marker.addListener('click', () => {
      const catIcon = CATEGORY_ICONS[stop.category] || '📍';
      const content = `
        <div class="custom-popup" style="color:#1e293b; font-family:sans-serif; max-width:240px;">
          <div style="display:inline-block; background:#d97757; color:#fff; font-size:0.75rem; font-weight:bold; padding:2px 8px; border-radius:999px; margin-bottom:6px;">
            Stop ${number} • ${escapeHtml(stop.timeSlot)}
          </div>
          <h4 style="margin:0 0 4px 0; font-size:1.05rem;">${escapeHtml(stop.name)}</h4>
          <p style="margin:0 0 6px 0; font-size:0.8rem; color:#64748b;">${catIcon} ${stop.category || 'Spot'}</p>
          <p style="margin:0 0 10px 0; font-size:0.8rem; color:#475569; line-height:1.3;">💡 ${stop.whyVisitNow}</p>
          <button class="popup-btn" style="background:linear-gradient(135deg, #d97757, #c25c42); color:#fff; border:none; border-radius:6px; padding:6px 12px; width:100%; cursor:pointer; font-weight:600; margin-bottom:6px;"
            onclick="window.startAudioGuide(${escapeHtml(JSON.stringify(stop))})">
            🎧 Listen to Guide
          </button>
          <button class="popup-btn popup-btn-outline" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:6px 12px; width:100%; cursor:pointer; font-weight:600;"
            onclick="window.startDirections(${stop.lat}, ${stop.lng}, ${escapeHtml(JSON.stringify(stop.name))})">
            🧭 Route Here
          </button>
        </div>
      `;
      activeInfoWindow.setContent(content);
      activeInfoWindow.open(map, marker);
    });

    itineraryMarkers.push(marker);
  });

  // Polyline connecting itinerary stops
  itineraryPolyline = new google.maps.Polyline({
    path: pathCoords,
    geodesic: true,
    strokeColor: '#d97757',
    strokeOpacity: 0.85,
    strokeWeight: 5,
    map,
  });

  map.fitBounds(bounds);
}

/* ---------- Expose Globals ---------- */
window.mapInstance          = () => map;
window.getUserLatLng        = () => userLatLng;
window.initMap              = initMap;
window.loadGoogleMapsScript = loadGoogleMapsScript;
window.placeUserMarker      = placeUserMarker;
window.addPlaceMarkers      = addPlaceMarkers;
window.clearPlaceMarkers    = clearPlaceMarkers;
window.flyTo                = flyTo;
window.drawItineraryRoute   = drawItineraryRoute;
window.clearItineraryRoute  = clearItineraryRoute;
window.toggleMapTheme       = toggleMapTheme;
window.computeDistance      = computeDistance;
window.CATEGORY_ICONS       = CATEGORY_ICONS;
window.CATEGORY_COLORS      = CATEGORY_COLORS;

