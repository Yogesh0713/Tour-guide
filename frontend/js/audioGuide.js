/* audioGuide.js — Interactive AI Audio Guide & Monument Narrator
   Utilizes backend AI narration (Gemini / Smart Cultural Engine) + Web Speech API (TTS) */

(function () {
  const API_BASE_AI = '/api/ai';

  let currentUtterance = null;
  let isSpeaking = false;
  let isPaused = false;
  let currentNarration = null;
  let availableVoices = [];
  let currentSpeechRate = 1.0;
  let selectedVoiceURI = null;

  /* ---------- Initialize Voices ---------- */
  function populateVoiceList() {
    if (!('speechSynthesis' in window)) return;
    availableVoices = window.speechSynthesis.getVoices();

    const voiceSelect = document.getElementById('audioVoiceSelect');
    if (!voiceSelect) return;

    voiceSelect.innerHTML = '';

    // Prefer English voices
    const filteredVoices = availableVoices.filter(v => v.lang.startsWith('en'));
    const voicesToUse = filteredVoices.length > 0 ? filteredVoices : availableVoices;

    voicesToUse.forEach((voice) => {
      const option = document.createElement('option');
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' — Default' : ''}`;
      voiceSelect.appendChild(option);
    });

    // Auto-select preferred voice if not selected
    if (!selectedVoiceURI && voicesToUse.length > 0) {
      // Look for natural or rich voices
      const preferred = voicesToUse.find(v => /natural|neural|google|samantha|karen|daniel/i.test(v.name)) || voicesToUse[0];
      if (preferred) {
        selectedVoiceURI = preferred.voiceURI;
        voiceSelect.value = preferred.voiceURI;
      }
    } else if (selectedVoiceURI) {
      voiceSelect.value = selectedVoiceURI;
    }
  }

  if ('speechSynthesis' in window) {
    populateVoiceList();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }
  }

  /* ---------- Start Audio Guide for Place ---------- */
  async function startAudioGuide(place) {
    if (!place || !place.name) return;

    const modal = document.getElementById('audioGuideModal');
    const content = document.getElementById('audioGuideContent');
    const playerBar = document.getElementById('audioPlayerBar');

    if (!modal || !content) return;

    // Reset previous audio
    stopAudioPlayback();

    // Show modal & loader
    modal.classList.remove('hidden');
    playerBar.classList.add('hidden');
    content.innerHTML = `
      <div class="audio-loading-state">
        <div class="audio-wave-loader">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <h4>Consulting AI Cultural Historian…</h4>
        <p>Uncovering historical chronicles, sacred architecture, and folklore for <strong>${escapeHtml(place.name)}</strong></p>
      </div>
    `;

    try {
      const res = await fetch(`${API_BASE_AI}/narrate`, {
        method: 'POST',
        headers: window.authHeaders ? window.authHeaders() : { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: place.name,
          category: place.category || 'historical',
          address: place.address || '',
          lat: place.lat,
          lng: place.lng,
        }),
      });

      if (res.status === 401 && window.authLogout) {
        window.authLogout();
        return;
      }

      const data = await res.json();
      if (!data.success || !data.narration) {
        throw new Error(data.message || 'Failed to generate narration');
      }

      currentNarration = data.narration;
      renderNarration(place, currentNarration);
      playerBar.classList.remove('hidden');
      populateVoiceList();

      // Auto start speech playback
      playAudio(currentNarration.fullSpeechText);
    } catch (err) {
      console.error('Audio Guide Error:', err);
      content.innerHTML = `
        <div class="audio-error-state">
          <span>⚠️</span>
          <h4>Could Not Load Audio Guide</h4>
          <p>${err.message}</p>
          <button class="btn-action btn-directions" onclick="window.startAudioGuide(${escapeHtml(JSON.stringify(place))})">
            🔄 Retry
          </button>
        </div>
      `;
    }
  }

  /* ---------- Render Narration UI ---------- */
  function renderNarration(place, narration) {
    const content = document.getElementById('audioGuideContent');
    const icon = (window.CATEGORY_ICONS && window.CATEGORY_ICONS[place.category]) || '🏛️';

    content.innerHTML = `
      <div class="audio-monument-header">
        <div class="audio-category-pill">${icon} ${place.category || 'Heritage Landmark'}</div>
        <h2 class="audio-place-title">${narration.placeName}</h2>
        <div class="audio-headline">${narration.headline}</div>
        <div class="audio-era-badge">⏳ ${narration.historicalEra}</div>
      </div>

      <div class="audio-overview-card">
        <p>${narration.overview}</p>
      </div>

      <div class="audio-chapters-list">
        ${narration.chapters.map((ch, idx) => `
          <div class="audio-chapter-card" id="audioChapter-${idx}">
            <h4 class="chapter-title">${escapeHtml(ch.title)}</h4>
            <p class="chapter-text">${escapeHtml(ch.text)}</p>
          </div>
        `).join('')}
      </div>
    `;

    updatePlayerStatusUI();
  }

  /* ---------- Web Speech API Audio Playback ---------- */
  function playAudio(textToSpeak) {
    if (!('speechSynthesis' in window)) {
      window.showToast && window.showToast('⚠️ Speech Synthesis not supported in your browser.', 'error');
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      isPaused = false;
      isSpeaking = true;
      updateVisualizer(true);
      updatePlayButtonUI(true);
      return;
    }

    window.speechSynthesis.cancel();

    const text = textToSpeak || (currentNarration && currentNarration.fullSpeechText);
    if (!text) return;

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = currentSpeechRate;

    // Set voice
    if (availableVoices.length > 0) {
      const voiceSelect = document.getElementById('audioVoiceSelect');
      const voiceURI = voiceSelect ? voiceSelect.value : selectedVoiceURI;
      const voice = availableVoices.find(v => v.voiceURI === voiceURI);
      if (voice) {
        currentUtterance.voice = voice;
      }
    }

    currentUtterance.onstart = () => {
      isSpeaking = true;
      isPaused = false;
      updateVisualizer(true);
      updatePlayButtonUI(true);
    };

    currentUtterance.onpause = () => {
      isPaused = true;
      isSpeaking = false;
      updateVisualizer(false);
      updatePlayButtonUI(false);
    };

    currentUtterance.onresume = () => {
      isPaused = false;
      isSpeaking = true;
      updateVisualizer(true);
      updatePlayButtonUI(true);
    };

    currentUtterance.onend = () => {
      isSpeaking = false;
      isPaused = false;
      updateVisualizer(false);
      updatePlayButtonUI(false);
    };

    currentUtterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      isSpeaking = false;
      isPaused = false;
      updateVisualizer(false);
      updatePlayButtonUI(false);
    };

    window.speechSynthesis.speak(currentUtterance);
  }

  function pauseAudio() {
    if ('speechSynthesis' in window && isSpeaking) {
      window.speechSynthesis.pause();
      isPaused = true;
      isSpeaking = false;
      updateVisualizer(false);
      updatePlayButtonUI(false);
    }
  }

  function stopAudioPlayback() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeaking = false;
    isPaused = false;
    currentUtterance = null;
    updateVisualizer(false);
    updatePlayButtonUI(false);
  }

  function togglePlayPause() {
    if (isSpeaking) {
      pauseAudio();
    } else {
      playAudio();
    }
  }

  function setPlaybackRate(rate) {
    currentSpeechRate = rate;
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.rate) === rate);
    });

    if (isSpeaking) {
      // Re-trigger with new rate from current position or entire speech
      stopAudioPlayback();
      playAudio();
    }
  }

  function updateVisualizer(animating) {
    const bars = document.querySelectorAll('.eq-bar');
    bars.forEach(bar => {
      if (animating) {
        bar.classList.add('playing');
      } else {
        bar.classList.remove('playing');
      }
    });

    const statusBadge = document.getElementById('audioPlayStatus');
    if (statusBadge) {
      statusBadge.textContent = animating ? '🎙️ Playing Narration' : (isPaused ? '⏸️ Paused' : '⏹️ Stopped');
    }
  }

  function updatePlayButtonUI(isPlaying) {
    const playBtn = document.getElementById('audioPlayPauseBtn');
    if (!playBtn) return;
    playBtn.innerHTML = isPlaying ? '⏸️ Pause' : '▶️ Play';
    playBtn.title = isPlaying ? 'Pause audio guide' : 'Play audio guide';
  }

  function updatePlayerStatusUI() {
    updatePlayButtonUI(isSpeaking);
    updateVisualizer(isSpeaking);
  }

  function closeAudioGuideModal() {
    stopAudioPlayback();
    const modal = document.getElementById('audioGuideModal');
    if (modal) modal.classList.add('hidden');
  }

  /* ---------- Event Listeners Setup ---------- */
  function initAudioListeners() {
    // Play/Pause button
    document.getElementById('audioPlayPauseBtn')?.addEventListener('click', togglePlayPause);
    // Stop button
    document.getElementById('audioStopBtn')?.addEventListener('click', stopAudioPlayback);
    // Modal Close
    document.getElementById('audioModalCloseBtn')?.addEventListener('click', closeAudioGuideModal);
    document.getElementById('audioModalBackdrop')?.addEventListener('click', closeAudioGuideModal);

    // Voice change
    document.getElementById('audioVoiceSelect')?.addEventListener('change', (e) => {
      selectedVoiceURI = e.target.value;
      if (isSpeaking) {
        stopAudioPlayback();
        playAudio();
      }
    });

    // Speed buttons
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rate = parseFloat(btn.dataset.rate);
        setPlaybackRate(rate);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAudioListeners);
  } else {
    initAudioListeners();
  }

  /* ---------- Expose to Global Window ---------- */
  window.startAudioGuide      = startAudioGuide;
  window.closeAudioGuideModal = closeAudioGuideModal;
  window.stopAudioPlayback    = stopAudioPlayback;
})();
