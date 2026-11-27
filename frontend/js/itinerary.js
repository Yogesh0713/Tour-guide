/* itinerary.js — AI Travel Itinerary Generator
   Supports 1-day, 2-day, and 3-day multi-day itineraries
   Connects to backend /api/ai/itinerary and renders interactive timeline with day tabs */

(function () {
  const API_BASE_AI = '/api/ai';

  let currentItinerary = null;
  let selectedDays = 1;

  /* ---------- Day Selector Logic ---------- */
  function initDaySelector() {
    const dayOptions = document.querySelectorAll('.day-option');
    const dayCountPill = document.getElementById('dayCountPill');
    const btnDayLabel = document.getElementById('btnDayLabel');

    dayOptions.forEach(btn => {
      btn.addEventListener('click', () => {
        dayOptions.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedDays = parseInt(btn.dataset.days) || 1;

        // Update pill label
        if (dayCountPill) {
          dayCountPill.textContent = `${selectedDays}-Day Route`;
        }
        // Update button label
        if (btnDayLabel) {
          btnDayLabel.textContent = `${selectedDays}-Day`;
        }
      });
    });
  }

  /* ---------- Generate Multi-Day Itinerary ---------- */
  async function generateItinerary() {
    const userLatLng = window.getUserLatLng && window.getUserLatLng();

    if (!userLatLng) {
      if (window.showToast) {
        window.showToast('📍 Getting your location first…', 'info');
      }
      const locateBtn = document.getElementById('locateBtn');
      if (locateBtn) locateBtn.click();
      setTimeout(proceedWithItinerary, 1200);
      return;
    }

    proceedWithItinerary();
  }

  async function proceedWithItinerary() {
    const userLatLng = window.getUserLatLng && window.getUserLatLng();
    const lat = userLatLng ? userLatLng.lat : 20.5937;
    const lng = userLatLng ? userLatLng.lng : 78.9629;

    const modal = document.getElementById('itineraryModal');
    const content = document.getElementById('itineraryContent');
    if (!modal || !content) return;

    modal.classList.remove('hidden');

    const dayLabel = selectedDays === 1 ? '1-Day' : `${selectedDays}-Day`;

    content.innerHTML = `
      <div class="itinerary-loading-state">
        <div class="itinerary-loader-spinner"></div>
        <h3 style="margin-top:16px; font-size:1.25rem;">✨ Crafting Your ${dayLabel} Itinerary…</h3>
        <p style="color:var(--text-secondary); margin-top:8px; font-size:0.9rem;">
          Our AI is analyzing nearby temples, lunch cafes, cultural museums, and sunset spots to arrange
          ${selectedDays > 1 ? `${selectedDays} days` : 'your day'} in optimal order.
        </p>
        <div class="itinerary-steps-checklist">
          <div class="step-check active"><span>✓</span> Pinpointing your GPS coordinates</div>
          <div class="step-check active"><span>✓</span> Filtering top-rated spots nearby</div>
          <div class="step-check active"><span>⏳</span> Sequencing ${selectedDays > 1 ? `${selectedDays}-day routes` : 'morning to sunset route'}</div>
        </div>
      </div>
    `;

    try {
      const nearbyPlaces = window.getCurrentPlaces ? window.getCurrentPlaces() : [];

      const res = await fetch(`${API_BASE_AI}/itinerary`, {
        method: 'POST',
        headers: window.authHeaders ? window.authHeaders() : { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat,
          lng,
          radius: window.currentRadius || 5000,
          places: nearbyPlaces,
          days: selectedDays,
        }),
      });

      if (res.status === 401 && window.authLogout) {
        window.authLogout();
        return;
      }

      const data = await res.json();
      if (!data.success || !data.itinerary) {
        throw new Error(data.message || 'Failed to generate itinerary');
      }

      currentItinerary = data.itinerary;

      // Normalize: ensure days[] array exists
      if (!currentItinerary.days && Array.isArray(currentItinerary.stops)) {
        currentItinerary.days = [{
          dayNumber: 1,
          dayTitle: currentItinerary.title || 'Day 1',
          dayTheme: currentItinerary.theme || '',
          stops: currentItinerary.stops,
        }];
        currentItinerary.totalDays = 1;
      }

      renderItinerary(currentItinerary);
    } catch (err) {
      console.error('Itinerary generation failed:', err);
      content.innerHTML = `
        <div class="itinerary-error-state" style="text-align:center; padding:32px 16px;">
          <div style="font-size:3rem; margin-bottom:12px;">⚠️</div>
          <h3>Could Not Generate Itinerary</h3>
          <p style="color:var(--text-secondary); margin-bottom:16px;">${err.message}</p>
          <button class="btn-action btn-directions" onclick="window.generateItinerary()">
            🔄 Try Again
          </button>
        </div>
      `;
    }
  }

  /* ---------- Render Itinerary UI ---------- */
  function renderItinerary(itinerary) {
    const content = document.getElementById('itineraryContent');
    if (!content) return;

    const totalDays = itinerary.totalDays || itinerary.days?.length || 1;
    const isMultiDay = totalDays > 1;

    const sourceBadge = itinerary.source === 'gemini-ai'
      ? `<span class="badge-gemini">✨ Gemini AI Optimized</span>`
      : `<span class="badge-gemini">✨ AI Smart Planner</span>`;

    // Build day tabs (only for multi-day)
    let dayTabsHtml = '';
    if (isMultiDay) {
      const tabButtons = itinerary.days.map((day, idx) => `
        <button class="day-tab-btn ${idx === 0 ? 'active' : ''}" data-day-index="${idx}">
          <span class="day-tab-label">Day ${day.dayNumber || idx + 1}</span>
          <span class="day-tab-theme">${day.dayTheme || ''}</span>
        </button>
      `).join('');
      dayTabsHtml = `<div class="day-tabs-nav">${tabButtons}</div>`;
    }

    // Build day content panes
    const dayPanesHtml = itinerary.days.map((day, dayIdx) => {
      const stopsHtml = (day.stops || []).map((stop, index) => {
        const catIcon = (window.CATEGORY_ICONS && window.CATEGORY_ICONS[stop.category]) || '📍';
        const ratingStr = stop.rating ? `⭐ ${stop.rating}` : '';
        const globalStopIndex = getGlobalStopIndex(itinerary, dayIdx, index);

        return `
          <div class="itinerary-timeline-item">
            <div class="timeline-indicator">
              <div class="stop-badge-circle">${stop.stopNumber || index + 1}</div>
              ${index < day.stops.length - 1 ? '<div class="timeline-connector"></div>' : ''}
            </div>

            <div class="timeline-card">
              <div class="timeline-card-header">
                <span class="timeline-timeslot">🕒 ${escapeHtml(stop.timeSlot)}</span>
                <span class="timeline-category-tag">${catIcon} ${stop.category || 'Spot'}</span>
                ${ratingStr ? `<span class="timeline-rating">${ratingStr}</span>` : ''}
              </div>

              <h4 class="timeline-place-name">${escapeHtml(stop.name)}</h4>
              <div class="timeline-address">📍 ${stop.address || 'Central Area'}</div>

              <div class="timeline-why-visit">
                <strong>💡 Why Visit Now:</strong> ${stop.whyVisitNow}
              </div>

              ${stop.insiderTip ? `
                <div class="timeline-insider-tip">
                  <strong>✨ Pro Tip:</strong> ${stop.insiderTip}
                </div>
              ` : ''}

              ${stop.travelToNext ? `
                <div class="timeline-transit-badge">
                  🚗 ${stop.travelToNext}
                </div>
              ` : ''}

              <div class="timeline-actions">
                <button class="btn-timeline-action" onclick="window.focusItineraryStop(${dayIdx}, ${index})">
                  📍 Map
                </button>
                <button class="btn-timeline-action" onclick="window.startDirections(${stop.lat}, ${stop.lng}, ${escapeHtml(JSON.stringify(stop.name))})">
                  🧭 Route
                </button>
                <button class="btn-timeline-action btn-audio-glow" onclick="window.startAudioGuide(${escapeHtml(JSON.stringify(stop))})">
                  🎧 Audio Guide
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Day header for multi-day
      const dayHeaderHtml = isMultiDay ? `
        <div class="day-header-separator">
          <div class="day-header-icon">${day.dayNumber || dayIdx + 1}</div>
          <div class="day-header-text">
            <h3>${day.dayTitle || `Day ${dayIdx + 1}`}</h3>
            <p>${day.dayTheme || ''}</p>
          </div>
        </div>
      ` : '';

      return `
        <div class="day-content-pane ${dayIdx === 0 ? 'active' : ''}" data-day-pane="${dayIdx}">
          ${dayHeaderHtml}
          <div class="itinerary-timeline">
            ${stopsHtml}
          </div>
        </div>
      `;
    }).join('');

    const totalStops = itinerary.days.reduce((sum, d) => sum + (d.stops?.length || 0), 0);
    const tipsHtml = (itinerary.curatorTips || []).map(tip => `<li>✓ ${tip}</li>`).join('');

    content.innerHTML = `
      <div class="itinerary-header">
        <div class="itinerary-top-row">
          ${sourceBadge}
          <span class="badge-duration">⏱️ ${itinerary.estimatedDuration || `${totalDays} Day${totalDays > 1 ? 's' : ''}`}</span>
        </div>
        <h2 class="itinerary-main-title">${escapeHtml(itinerary.title)}</h2>
        ${!isMultiDay && itinerary.days?.[0]?.dayTheme ? `<p class="itinerary-theme-desc">${itinerary.days[0].dayTheme}</p>` : ''}

        <div class="itinerary-stats-bar">
          <div class="stat-pill">
            <span class="stat-icon">📅</span>
            <span>${totalDays} Day${totalDays > 1 ? 's' : ''}</span>
          </div>
          <div class="stat-pill">
            <span class="stat-icon">🏁</span>
            <span>${totalStops} Stops</span>
          </div>
          <div class="stat-pill">
            <span class="stat-icon">📏</span>
            <span>${itinerary.totalDistance || 'Optimal radius'}</span>
          </div>
          <div class="stat-pill">
            <span class="stat-icon">🚶</span>
            <span>${itinerary.recommendedTransport || 'Walk & Transit'}</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons Bar -->
      <div class="itinerary-batch-actions">
        <button id="showAllOnMapBtn" class="btn-itinerary-primary">
          🗺️ Plot All Stops on Map
        </button>
        <button id="copyItineraryBtn" class="btn-itinerary-secondary">
          📋 Copy Summary
        </button>
      </div>

      <!-- Quick Duration Switcher inside Modal -->
      <div class="modal-duration-selector">
        <span class="modal-duration-label">🗓️ Trip Duration:</span>
        <div class="day-selector-options day-selector-options-modal">
          <button class="day-option ${selectedDays === 1 ? 'active' : ''}" onclick="window.switchItineraryDays(1)">1 Day</button>
          <button class="day-option ${selectedDays === 2 ? 'active' : ''}" onclick="window.switchItineraryDays(2)">2 Days</button>
          <button class="day-option ${selectedDays === 3 ? 'active' : ''}" onclick="window.switchItineraryDays(3)">3 Days</button>
        </div>
      </div>

      <!-- Day Tabs (multi-day only) -->
      ${dayTabsHtml}

      <!-- Day Content Panes -->
      ${dayPanesHtml}

      ${tipsHtml ? `
        <div class="itinerary-tips-box">
          <h4>🎒 Essential Local Tips:</h4>
          <ul>${tipsHtml}</ul>
        </div>
      ` : ''}
    `;

    // Hook up batch actions
    document.getElementById('showAllOnMapBtn')?.addEventListener('click', () => {
      plotEntireItineraryOnMap();
    });

    document.getElementById('copyItineraryBtn')?.addEventListener('click', () => {
      copyItineraryToClipboard();
    });

    // Hook up day tab switching
    if (isMultiDay) {
      initDayTabs();
    }
  }

  /* ---------- Day Tab Switching ---------- */
  function initDayTabs() {
    const tabs = document.querySelectorAll('.day-tab-btn');
    const panes = document.querySelectorAll('.day-content-pane');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const dayIndex = parseInt(tab.dataset.dayIndex);

        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update active pane
        panes.forEach(p => p.classList.remove('active'));
        const targetPane = document.querySelector(`[data-day-pane="${dayIndex}"]`);
        if (targetPane) {
          targetPane.classList.add('active');
        }
      });
    });
  }

  /* ---------- Helper: Get global stop index across all days ---------- */
  function getGlobalStopIndex(itinerary, dayIdx, stopIdx) {
    let globalIdx = 0;
    for (let d = 0; d < dayIdx; d++) {
      globalIdx += (itinerary.days[d]?.stops?.length || 0);
    }
    return globalIdx + stopIdx;
  }

  /* ---------- Focus a single stop on Map ---------- */
  function focusItineraryStop(dayIdx, stopIdx) {
    if (!currentItinerary || !currentItinerary.days) return;
    const day = currentItinerary.days[dayIdx];
    if (!day || !day.stops || !day.stops[stopIdx]) return;

    const stop = day.stops[stopIdx];
    closeItineraryModal();

    if (window.flyTo) {
      window.flyTo(stop.lat, stop.lng, 16);
    }
    if (window.openPlaceModal) {
      window.openPlaceModal(stop);
    }
  }

  /* ---------- Plot Entire Itinerary on Map ---------- */
  function plotEntireItineraryOnMap() {
    if (!currentItinerary || !currentItinerary.days) return;
    closeItineraryModal();

    const allStops = currentItinerary.days.flatMap(d => d.stops || []);

    if (window.drawItineraryRoute) {
      window.drawItineraryRoute(allStops);
    }

    if (window.showToast) {
      window.showToast(`🗺️ Loaded ${allStops.length} itinerary stops on map!`, 'info');
    }
  }

  /* ---------- Copy Itinerary to Clipboard ---------- */
  function copyItineraryToClipboard() {
    if (!currentItinerary) return;

    let text = `🗺️ ${currentItinerary.title}\n`;
    text += `⏱️ Duration: ${currentItinerary.estimatedDuration} | Distance: ${currentItinerary.totalDistance}\n\n`;

    (currentItinerary.days || []).forEach((day, dayIdx) => {
      if (currentItinerary.days.length > 1) {
        text += `═══ ${day.dayTitle || `Day ${dayIdx + 1}`} ═══\n`;
        if (day.dayTheme) text += `Theme: ${day.dayTheme}\n`;
        text += `\n`;
      }

      (day.stops || []).forEach((stop, i) => {
        text += `[${stop.timeSlot}] Stop ${i + 1}: ${stop.name} (${stop.category})\n`;
        text += `• Why visit: ${stop.whyVisitNow}\n`;
        if (stop.insiderTip) text += `• Pro tip: ${stop.insiderTip}\n`;
        if (stop.travelToNext) text += `• Transit: ${stop.travelToNext}\n`;
        text += `\n`;
      });
    });

    navigator.clipboard.writeText(text).then(() => {
      if (window.showToast) window.showToast('📋 Itinerary copied to clipboard!', 'info');
    }).catch(() => {
      if (window.showToast) window.showToast('⚠️ Could not copy to clipboard', 'error');
    });
  }

  function closeItineraryModal() {
    const modal = document.getElementById('itineraryModal');
    if (modal) modal.classList.add('hidden');
  }

  function switchItineraryDays(days) {
    selectedDays = parseInt(days) || 1;
    const dayOptions = document.querySelectorAll('.day-selector .day-option');
    dayOptions.forEach(btn => {
      if (parseInt(btn.dataset.days) === selectedDays) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const dayCountPill = document.getElementById('dayCountPill');
    if (dayCountPill) dayCountPill.textContent = `${selectedDays}-Day Route`;

    const btnDayLabel = document.getElementById('btnDayLabel');
    if (btnDayLabel) btnDayLabel.textContent = `${selectedDays}-Day`;

    generateItinerary();
  }

  /* ---------- Init UI Listeners ---------- */
  function initListeners() {
    // Day selector in sidebar
    initDaySelector();

    // Buttons that open itinerary
    document.getElementById('createItineraryBtn')?.addEventListener('click', generateItinerary);
    document.getElementById('navItineraryBtn')?.addEventListener('click', generateItinerary);
    document.querySelector('.ai-banner-header')?.addEventListener('click', generateItinerary);

    // Modal Close
    document.getElementById('itineraryModalCloseBtn')?.addEventListener('click', closeItineraryModal);
    document.getElementById('itineraryModalBackdrop')?.addEventListener('click', closeItineraryModal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initListeners);
  } else {
    initListeners();
  }

  /* ---------- Expose ---------- */
  window.generateItinerary        = generateItinerary;
  window.generate1DayItinerary    = generateItinerary; // backward compat
  window.switchItineraryDays      = switchItineraryDays;
  window.closeItineraryModal      = closeItineraryModal;
  window.focusItineraryStop       = focusItineraryStop;
  window.getCurrentItinerary      = () => currentItinerary;
})();
