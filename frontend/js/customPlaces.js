/* customPlaces.js — User-created custom locations
   Persisted in MongoDB via /api/custom-places, mapped with custom pins, and integrated with Itinerary & Audio Guide */

(function () {
  const API_BASE_CUSTOM = '/api/custom-places';

  let customPlaces = [];
  let customMarkers = [];
  let isMapPickMode = false;
  let tempPlacementMarker = null;
  window.loadCommunityPlaces = loadCommunityPlaces;

  /* ---------- Fetch All Custom Places from MongoDB ---------- */
  async function loadCustomPlaces() {
    try {
      const res = await fetch(API_BASE_CUSTOM, {
        headers: window.authHeaders ? window.authHeaders() : {},
      });

      if (res.status === 401 && window.authLogout) {
        window.authLogout();
        return [];
      }

      const data = await res.json();
      if (!data.success) {
        console.warn('Failed to load custom places:', data.message);
        return [];
      }

      customPlaces = data.places || [];
      renderCustomPlacesList(customPlaces);
      plotCustomMarkersOnMap(customPlaces);
      loadCommunityPlaces();
      return customPlaces;
    } catch (err) {
      console.error('Error fetching custom places:', err);
      return [];
    }
  }

  /* ---------- Status badge for your own places ---------- */
  function statusBadge(status) {
    if (status === 'pending') return '<span class="custom-badge-tag" style="background:#f59e0b;">Pending review</span>';
    if (status === 'rejected') return '<span class="custom-badge-tag" style="background:#ef4444;">Rejected</span>';
    return '';
  }

  /* ---------- Approved spots added by other users ---------- */
  let communityMarkers = [];
  let communityList = [];

  async function loadCommunityPlaces() {
    const map = window.mapInstance && window.mapInstance();
    const center = window.getUserLatLng && window.getUserLatLng();
    if (!map || !center) return;

    communityMarkers.forEach((m) => m.setMap(null));
    communityMarkers = [];

    try {
      const params = new URLSearchParams({
        lat: center.lat,
        lng: center.lng,
        radius: window.currentRadius || 5000,
      });
      const res = await fetch(`${API_BASE_CUSTOM}/nearby?${params}`, {
        headers: window.authHeaders ? window.authHeaders() : {},
      });
      const data = await res.json();
      if (!data.success) return;

      communityList = data.places;
      renderCommunityList(communityList);

      data.places.forEach((place) => {
        const marker = new google.maps.Marker({
          position: { lat: place.lat, lng: place.lng },
          map,
          title: `[Community] ${place.name}`,
          zIndex: 800,
          icon: {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            fillColor: '#2d8a6b',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 1.6,
            anchor: new google.maps.Point(12, 22),
          },
        });
        marker.addListener('click', () => window.openPlaceModal(place));
        communityMarkers.push(marker);
      });
    } catch (err) {
      console.error('Error fetching community places:', err);
    }
  }

  /* ---------- Community Spots sidebar list ---------- */
  function renderCommunityList(places) {
    const list = document.getElementById('communityPlacesList');
    const countBadge = document.getElementById('communityPlacesCount');
    if (countBadge) countBadge.textContent = places.length;
    if (!list) return;

    if (!places.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span>🌍</span>
          <p>No community spots nearby yet.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = places.map((place, idx) => {
      const icon = (window.CATEGORY_ICONS && window.CATEGORY_ICONS[place.category]) || '📍';
      return `
        <div class="place-card" onclick="window.focusCommunityPlace(${idx})">
          <div class="place-card-icon">${icon}</div>
          <div class="place-card-info">
            <div class="place-card-name">
              <span>${escapeHtml(place.name)}</span>
              <span class="custom-badge-tag" style="background:#2d8a6b;">Community</span>
            </div>
            <div class="place-card-meta">
              ${place.address ? `<span>${escapeHtml(place.address)}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function focusCommunityPlace(index) {
    const place = communityList[index];
    if (!place) return;
    if (window.flyTo) window.flyTo(place.lat, place.lng, 16);
    if (window.openPlaceModal) window.openPlaceModal(place);
  }
  window.focusCommunityPlace = focusCommunityPlace;

  /* ---------- Owner's status details: reason and history ---------- */
  function statusDetail(place) {
    let text = '';
    if (place.status === 'pending') text = '⏳ Waiting for admin review';
    if (place.status === 'approved') text = '✅ Approved and visible to everyone';
    if (place.status === 'rejected') text = '❌ Rejected' + (place.reviewNote ? ': ' + escapeHtml(place.reviewNote) : '');

    const history = (place.statusHistory || [])
      .map((h) => `${escapeHtml(h.status)} ${new Date(h.at).toLocaleDateString()}`)
      .join(' → ');

    if (!text && !history) return '';
    return `<p class="custom-card-desc">${text}${history ? `<br><small>${history}</small>` : ''}</p>`;
  }

  /* ---------- Render Custom Places in Sidebar ---------- */
  function renderCustomPlacesList(places) {
    const list = document.getElementById('customPlacesList');
    const countBadge = document.getElementById('customPlacesCount');
    if (countBadge) countBadge.textContent = places.length;

    if (!list) return;

    if (!places.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span>📍</span>
          <p>You haven't added any custom spots yet. Click <strong>+ Add Place</strong> or click on the map to pin one!</p>
        </div>
      `;
      return;
    }

    const userLatLng = window.getUserLatLng && window.getUserLatLng();

    list.innerHTML = places.map((place, idx) => {
      const dist = (userLatLng && window.computeDistance)
        ? window.computeDistance(userLatLng.lat, userLatLng.lng, place.lat, place.lng) + ' km'
        : '';
      const icon = (window.CATEGORY_ICONS && window.CATEGORY_ICONS[place.category]) || '📍';

      return `
        <div class="place-card custom-place-card" onclick="window.focusCustomPlace(${idx})">
          <div class="place-card-icon" style="background:rgba(217, 119, 87, 0.15); border:1px solid rgba(217,119,87,0.3);">
            ${icon}
          </div>
          <div class="place-card-info">
            <div class="place-card-name">
              <span>${escapeHtml(place.name)}</span>
              <span class="custom-badge-tag">Custom</span>
              ${statusBadge(place.status)}
            </div>
            <div class="place-card-meta">
              ${dist ? `<span>${dist}</span>` : ''}
              <span style="color:#f59e0b; margin-left:6px;">⭐ ${place.rating || 5.0}</span>
            </div>
            ${place.description ? `<p class="custom-card-desc">${escapeHtml(place.description)}</p>` : ''}
            ${statusDetail(place)}
          </div>
          <div class="place-card-actions">
            <button class="btn-icon-sm" title="Audio Guide"
              onclick="event.stopPropagation(); window.startAudioGuide(${escapeHtml(JSON.stringify(place))})">
              🎧
            </button>
            <button class="btn-icon-sm" title="Directions"
              onclick="event.stopPropagation(); window.startDirections(${place.lat}, ${place.lng}, ${escapeHtml(JSON.stringify(place.name))})">
              🧭
            </button>
            <button class="btn-icon-sm btn-delete-custom" title="Delete Location"
              onclick="event.stopPropagation(); window.deleteCustomPlace('${place.id || place._id}', ${escapeHtml(JSON.stringify(place.name))})">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ---------- Plot Custom Markers on Google Maps ---------- */
  function plotCustomMarkersOnMap(places) {
    const map = window.mapInstance && window.mapInstance();
    if (!map) return;

    // Clear old markers
    clearCustomMarkers();

    places.forEach((place, idx) => {
      const icon = (window.CATEGORY_ICONS && window.CATEGORY_ICONS[place.category]) || '📍';

      // Custom marker icon with gold/terracotta pin
      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map,
        title: `[Custom] ${place.name}`,
        zIndex: 1000,
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: '#d97757',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 1.6,
          anchor: new google.maps.Point(12, 22),
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="info-window-card">
            <div class="info-window-badge" style="background:#d97757; color:#fff; font-size:0.68rem; padding:2px 6px; border-radius:4px; display:inline-block; margin-bottom:4px;">
              📍 Custom Location
            </div>
            <h4 style="margin:2px 0 6px; font-size:1.05rem;">${icon} ${escapeHtml(place.name)}</h4>
            ${place.address ? `<p style="font-size:0.8rem; color:#666; margin:0 0 4px;">📍 ${escapeHtml(place.address)}</p>` : ''}
            ${place.description ? `<p style="font-size:0.82rem; margin:4px 0 8px; font-style:italic;">"${escapeHtml(place.description)}"</p>` : ''}
            <div style="display:flex; gap:6px; margin-top:8px;">
              <button style="flex:1; padding:6px; font-size:0.75rem; border:none; border-radius:4px; background:#d97757; color:#fff; cursor:pointer;"
                onclick="window.startDirections(${place.lat}, ${place.lng}, ${escapeHtml(JSON.stringify(place.name))})">
                🧭 Directions
              </button>
              <button style="flex:1; padding:6px; font-size:0.75rem; border:1px solid #d97757; border-radius:4px; background:transparent; color:#d97757; cursor:pointer;"
                onclick="window.startAudioGuide(${escapeHtml(JSON.stringify(place))})">
                🎧 Audio Guide
              </button>
            </div>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      customMarkers.push(marker);
    });
  }

  function clearCustomMarkers() {
    customMarkers.forEach(m => m.setMap(null));
    customMarkers = [];
  }

  /* ---------- Focus a Custom Place on Map ---------- */
  function focusCustomPlace(index) {
    const place = customPlaces[index];
    if (!place || !window.flyTo) return;

    window.flyTo(place.lat, place.lng, 16);
    if (customMarkers[index]) {
      google.maps.event.trigger(customMarkers[index], 'click');
    }
  }

  /* ---------- Open Add Location Modal ---------- */
  function openAddPlaceModal(lat = null, lng = null, address = '') {
    const modal = document.getElementById('addPlaceModal');
    if (!modal) return;

    // If no coordinates provided, use current user location or map center
    if (lat === null || lng === null) {
      const userLatLng = window.getUserLatLng && window.getUserLatLng();
      const map = window.mapInstance && window.mapInstance();

      if (userLatLng) {
        lat = userLatLng.lat;
        lng = userLatLng.lng;
      } else if (map && map.getCenter) {
        const center = map.getCenter();
        lat = center.lat();
        lng = center.lng();
      } else {
        lat = 20.5937;
        lng = 78.9629;
      }
    }

    const latInput = document.getElementById('newPlaceLat');
    const lngInput = document.getElementById('newPlaceLng');
    const addrInput = document.getElementById('newPlaceAddress');
    const nameInput = document.getElementById('newPlaceName');
    const descInput = document.getElementById('newPlaceDesc');
    const errorEl = document.getElementById('addPlaceError');

    if (latInput) latInput.value = Number(lat).toFixed(6);
    if (lngInput) lngInput.value = Number(lng).toFixed(6);
    if (addrInput) addrInput.value = address || '';
    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
    if (errorEl) {
      errorEl.classList.add('hidden');
      errorEl.textContent = '';
    }

    modal.classList.remove('hidden');
    nameInput?.focus();
  }

  function closeAddPlaceModal() {
    const modal = document.getElementById('addPlaceModal');
    if (modal) modal.classList.add('hidden');
    disableMapPickMode();
  }

  /* ---------- Interactive "Pick on Map" Mode ---------- */
  function enableMapPickMode() {
    isMapPickMode = true;
    const banner = document.getElementById('mapClickBanner');
    if (banner) banner.classList.remove('hidden');

    const map = window.mapInstance && window.mapInstance();
    if (map) {
      map.setOptions({ draggableCursor: 'crosshair' });
    }

    if (window.showToast) {
      window.showToast('📍 Click anywhere on the map to place your new spot!', 'info');
    }
  }

  function disableMapPickMode() {
    isMapPickMode = false;
    const banner = document.getElementById('mapClickBanner');
    if (banner) banner.classList.add('hidden');

    const map = window.mapInstance && window.mapInstance();
    if (map) {
      map.setOptions({ draggableCursor: null });
    }

    if (tempPlacementMarker) {
      tempPlacementMarker.setMap(null);
      tempPlacementMarker = null;
    }
  }

  /* ---------- Map Click Listener Setup ---------- */
  function setupMapClickListener() {
    const checkMap = setInterval(() => {
      const map = window.mapInstance && window.mapInstance();
      if (!map) return;
      clearInterval(checkMap);

      map.addListener('click', (e) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

        if (isMapPickMode) {
          disableMapPickMode();

          // Drop temporary placement pin
          if (tempPlacementMarker) tempPlacementMarker.setMap(null);
          tempPlacementMarker = new google.maps.Marker({
            position: { lat, lng },
            map,
            animation: google.maps.Animation.DROP,
            icon: {
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#d97757',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
          });

          // Reverse geocode to get friendly street address if possible
          let formattedAddress = '';
          if (window.google && window.google.maps && window.google.maps.Geocoder) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                formattedAddress = results[0].formatted_address;
              }
              openAddPlaceModal(lat, lng, formattedAddress);
            });
          } else {
            openAddPlaceModal(lat, lng, '');
          }
        }
      });
    }, 500);
  }

  /* ---------- Form Submit Handler ---------- */
  async function handleAddPlaceSubmit(e) {
    e.preventDefault();
    const errorEl = document.getElementById('addPlaceError');
    const saveBtn = document.getElementById('savePlaceBtn');

    const name = document.getElementById('newPlaceName')?.value.trim();
    const category = document.getElementById('newPlaceCategory')?.value;
    const lat = parseFloat(document.getElementById('newPlaceLat')?.value);
    const lng = parseFloat(document.getElementById('newPlaceLng')?.value);
    const address = document.getElementById('newPlaceAddress')?.value.trim();
    const description = document.getElementById('newPlaceDesc')?.value.trim();
    const photoUrl = document.getElementById('newPlacePhoto')?.value.trim();
    const rating = parseFloat(document.getElementById('newPlaceRating')?.value) || 5.0;

    if (!name || isNaN(lat) || isNaN(lng)) {
      if (errorEl) {
        errorEl.textContent = 'Please provide a valid name and coordinates.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>⏳</span> Saving…';
      }

      const photoFile = document.getElementById('newPlacePhotoFile')?.files?.[0];
      const headers = window.authHeaders ? window.authHeaders() : { 'Content-Type': 'application/json' };
      let body;

      if (photoFile) {
        // A file was chosen: send everything as form data
        delete headers['Content-Type']; // the browser sets this itself
        body = new FormData();
        body.append('name', name);
        body.append('category', category);
        body.append('lat', lat);
        body.append('lng', lng);
        body.append('address', address || '');
        body.append('description', description || '');
        body.append('rating', rating);
        body.append('photo', photoFile);
      } else {
        // No file: send JSON as before
        body = JSON.stringify({ name, category, lat, lng, address, description, photoUrl, rating });
      }

      const res = await fetch(API_BASE_CUSTOM, { method: 'POST', headers, body });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to save custom location');
      }

      if (window.showToast) {
        window.showToast(`✨ "${name}" submitted for admin review.`, 'info');
      }

      closeAddPlaceModal();
      await loadCustomPlaces();
      const fileInput = document.getElementById('newPlacePhotoFile');
      if (fileInput) fileInput.value = '';

      // Pan to new spot
      if (window.flyTo) window.flyTo(lat, lng, 16);
    } catch (err) {
      console.error('Error saving place:', err);
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span>💾</span> Save Location';
      }
    }
  }

  /* ---------- Delete Custom Place ---------- */
  async function deleteCustomPlace(id, name) {
    if (!id) return;
    if (!confirm(`Are you sure you want to remove "${name || 'this location'}" from your custom places?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_CUSTOM}/${id}`, {
        method: 'DELETE',
        headers: window.authHeaders ? window.authHeaders() : {},
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete');
      }

      if (window.showToast) {
        window.showToast('🗑️ Location removed', 'info');
      }

      await loadCustomPlaces();
    } catch (err) {
      console.error('Failed to delete place:', err);
      if (window.showToast) {
        window.showToast(`⚠️ ${err.message}`, 'error');
      }
    }
  }

  /* ---------- Initialize Listeners ---------- */
  function init() {
    // Add buttons
    document.getElementById('navAddPlaceBtn')?.addEventListener('click', enableMapPickMode);
    document.getElementById('sidebarAddPlaceBtn')?.addEventListener('click', enableMapPickMode);
    document.getElementById('cancelMapClickBtn')?.addEventListener('click', disableMapPickMode);

    // Modal close
    document.getElementById('addPlaceModalCloseBtn')?.addEventListener('click', closeAddPlaceModal);
    document.getElementById('addPlaceModalBackdrop')?.addEventListener('click', closeAddPlaceModal);
    document.getElementById('cancelAddPlaceBtn')?.addEventListener('click', closeAddPlaceModal);

    // Form submit
    document.getElementById('addPlaceForm')?.addEventListener('submit', handleAddPlaceSubmit);

    // Escape key cancels pick mode or closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (isMapPickMode) disableMapPickMode();
        closeAddPlaceModal();
      }
    });

    setupMapClickListener();

    // Load places once map is initialized
    setTimeout(loadCustomPlaces, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---------- Expose Globals ---------- */
  window.loadCustomPlaces      = loadCustomPlaces;
  window.openAddPlaceModal     = openAddPlaceModal;
  window.closeAddPlaceModal    = closeAddPlaceModal;
  window.enableMapPickMode     = enableMapPickMode;
  window.disableMapPickMode    = disableMapPickMode;
  window.deleteCustomPlace     = deleteCustomPlace;
  window.focusCustomPlace      = focusCustomPlace;
  window.getCustomPlaces       = () => customPlaces;
})();
