const fetch = globalThis.fetch || require('node-fetch');

// Helper to compute distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Helper: Call Gemini API safely
async function callGemini(prompt, systemInstruction = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    return null;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2500,
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      console.warn('Gemini API returned error status:', res.status, errText);
      return null;
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidate || null;
  } catch (err) {
    console.warn('Gemini API call failed or timed out:', err.message);
    return null;
  }
}

// Helper: Extract JSON from AI text response
function extractJSON(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try finding codeblock ```json ... ```
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (err) {}
    }
    // Try finding outer { ... } or [ ... ]
    const startObj = text.indexOf('{');
    const endObj = text.lastIndexOf('}');
    if (startObj !== -1 && endObj > startObj) {
      try {
        return JSON.parse(text.slice(startObj, endObj + 1));
      } catch (err) {}
    }
    return null;
  }
}

const generateItinerary = async (req, res, next) => {
  try {
    const { lat, lng, radius = 5000, pace = 'balanced', places = [], days = 1 } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'User lat and lng are required.' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const numDays = Math.min(Math.max(parseInt(days) || 1, 1), 3);

    // Prepare pool of places (either provided by frontend or fallback synthesized)
    let candidatePlaces = Array.isArray(places) && places.length > 0 ? [...places] : [];

    // Filter valid places with coordinates
    candidatePlaces = candidatePlaces.filter(p => p && p.lat && p.lng && p.name);

    // If candidate places are sparse, augment or synthesize realistic points of interest
    if (candidatePlaces.length < numDays * 4) {
      const defaultOffsets = [
        { name: 'Heritage Sunrise Temple & Sanctum', category: 'temple', dLat: 0.008, dLng: 0.006, rating: 4.8 },
        { name: 'The Old Quarter Artisan Cafe & Bakery', category: 'cafe', dLat: 0.004, dLng: -0.005, rating: 4.6 },
        { name: 'Central Museum of Art & Antiquities', category: 'museum', dLat: -0.005, dLng: 0.007, rating: 4.7 },
        { name: 'Royal Historic Fort & Bastion', category: 'historical', dLat: -0.009, dLng: -0.003, rating: 4.9 },
        { name: 'Sunset Promenade & Botanical Gardens', category: 'park', dLat: 0.012, dLng: -0.008, rating: 4.7 },
        { name: 'Ancient Stone Mosque & Courtyard', category: 'mosque', dLat: 0.015, dLng: 0.003, rating: 4.5 },
        { name: 'Riverside Gourmet Kitchen & Bar', category: 'restaurant', dLat: -0.012, dLng: 0.010, rating: 4.4 },
        { name: 'Heritage Clock Tower & Grand Plaza', category: 'historical', dLat: 0.003, dLng: 0.014, rating: 4.6 },
        { name: 'Sacred Hilltop Shrine & Meditation Center', category: 'temple', dLat: -0.015, dLng: -0.010, rating: 4.7 },
        { name: 'Lakeside Nature Trail & Bird Sanctuary', category: 'park', dLat: 0.018, dLng: 0.005, rating: 4.8 },
        { name: 'Colonial Art Gallery & Cultural Center', category: 'museum', dLat: -0.002, dLng: -0.012, rating: 4.5 },
        { name: 'Moonlight Rooftop Cafe & Lounge', category: 'cafe', dLat: 0.006, dLng: -0.015, rating: 4.3 },
      ];

      defaultOffsets.forEach(def => {
        if (!candidatePlaces.find(p => p.name === def.name)) {
          candidatePlaces.push({
            name: def.name,
            category: def.category,
            lat: userLat + def.dLat,
            lng: userLng + def.dLng,
            rating: def.rating,
            userRatingsTotal: 340,
            address: `Nearby, approx ${calculateDistance(userLat, userLng, userLat + def.dLat, userLng + def.dLng)} km from your location`,
          });
        }
      });
    }

    // Attach distances from user
    candidatePlaces.forEach(p => {
      p.distanceKm = calculateDistance(userLat, userLng, p.lat, p.lng);
    });

    // Try Gemini API first
    const dayLabel = numDays === 1 ? '1-day' : `${numDays}-day`;
    const stopsPerDay = numDays === 1 ? '4 to 5' : '4';

    const geminiPrompt = `
You are an award-winning tour guide and smart itinerary planner.
Create an optimal ${dayLabel} travel itinerary for a traveler starting at GPS coordinates (${userLat.toFixed(4)}, ${userLng.toFixed(4)}).
Available candidate spots nearby:
${JSON.stringify(candidatePlaces.slice(0, 20).map(p => ({
  name: p.name,
  category: p.category,
  lat: p.lat,
  lng: p.lng,
  rating: p.rating,
  address: p.address,
  distanceKm: p.distanceKm
})))}

Rules:
1. Create exactly ${numDays} day(s) of travel plans.
2. Each day should have ${stopsPerDay} stops arranged chronologically:
   - Morning (approx 8:30 AM - 10:30 AM): Spiritual temple, sacred shrine, or serene cultural monument.
   - Late Morning / Midday (approx 11:00 AM - 12:30 PM): Engaging museum, art gallery, or historic architecture.
   - Lunch (approx 12:45 PM - 2:00 PM): Top-rated cafe, traditional bistro, or foodie hot spot.
   - Afternoon (approx 2:30 PM - 4:30 PM): Historical fort, heritage landmark, or craft bazaar.
   - Sunset / Evening (approx 5:00 PM - 7:00 PM): Scenic park, viewpoint, lakeside promenade, or sunset lookout.
3. DO NOT repeat any place across different days.
4. Each day should have a unique theme (e.g., Day 1: Heritage & Sacred, Day 2: Culture & Cuisine, Day 3: Nature & Leisure).
5. Minimize zigzagging travel between stops on each day.
6. Return ONLY valid JSON in this exact structure:
{
  "title": "Overall trip title",
  "totalDays": ${numDays},
  "estimatedDuration": "Total trip duration",
  "totalDistance": "~X km total",
  "recommendedTransport": "Walk & Short Auto/Cab Rides",
  "days": [
    {
      "dayNumber": 1,
      "dayTitle": "Day 1: Heritage & Sacred Wonders",
      "dayTheme": "Spiritual calm, royal architecture",
      "stops": [
        {
          "stopNumber": 1,
          "name": "Exact place name",
          "category": "temple",
          "timeSlot": "08:30 AM - 10:15 AM",
          "duration": "1 hr 45 min",
          "lat": 0.0,
          "lng": 0.0,
          "address": "Address or vicinity",
          "rating": 4.8,
          "whyVisitNow": "Why this time is ideal",
          "insiderTip": "Specific insider tip",
          "travelToNext": "10 min cab ride (3.2 km)"
        }
      ]
    }
  ],
  "curatorTips": [
    "Dress respectfully for temples",
    "Carry a reusable water bottle",
    "Keep camera ready for sunset"
  ]
}
`;

    let aiResult = null;
    const rawAiText = await callGemini(geminiPrompt, 'You are an elite travel planner. Output strictly valid JSON.');
    if (rawAiText) {
      aiResult = extractJSON(rawAiText);
    }

    // Heuristic Fallback if Gemini is not configured or failed
    if (!aiResult || !Array.isArray(aiResult.days) || aiResult.days.length === 0) {
      // Group candidate places by time-appropriate categories
      const morningCandidates = candidatePlaces.filter(p => ['temple', 'church', 'mosque', 'historical'].includes(p.category));
      const lunchCandidates   = candidatePlaces.filter(p => ['cafe', 'restaurant'].includes(p.category));
      const afternoonCandidates = candidatePlaces.filter(p => ['museum', 'historical', 'all'].includes(p.category));
      const eveningCandidates   = candidatePlaces.filter(p => ['park', 'cafe', 'all'].includes(p.category));

      const usedNames = new Set();

      const pickBest = (list, fallbackList) => {
        const available = list.filter(p => !usedNames.has(p.name));
        if (available.length > 0) {
          const pick = available.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
          usedNames.add(pick.name);
          return pick;
        }
        const fallAvail = fallbackList.filter(p => !usedNames.has(p.name));
        if (fallAvail.length > 0) {
          const pick = fallAvail[0];
          usedNames.add(pick.name);
          return pick;
        }
        return candidatePlaces.filter(p => !usedNames.has(p.name))[0] || candidatePlaces[0];
      };

      const dayThemes = [
        { title: 'Heritage & Sacred Wonders', theme: 'Spiritual calm, royal architecture, and divine serenity' },
        { title: 'Culture, Art & Cuisine Trail', theme: 'Artistic discovery, culinary delights, and local craftsmanship' },
        { title: 'Nature, Leisure & Sunset Vistas', theme: 'Green escapes, scenic trails, and golden hour moments' },
      ];

      const timeSlots = [
        { slot: '08:30 AM - 10:30 AM', duration: '2 hours', why: 'Peaceful morning ambience, gentle natural lighting, and fewer crowds for contemplation.', tip: 'Visit before 9:30 AM to experience the serene morning rituals and take photos without harsh shadows.' },
        { slot: '11:00 AM - 12:45 PM', duration: '1 hr 45 min', why: 'Air-conditioned galleries and architectural halls are most comfortable during midday peak sun.', tip: 'Check out the central courtyard exhibits and ask the staff for the audio guide keynotes.' },
        { slot: '01:00 PM - 02:30 PM', duration: '1 hr 30 min', why: 'Ideal time to recharge with local specialties, handcrafted drinks, and cool indoor seating.', tip: 'Try the house special beverages and regional delicacies; outdoor garden patio is great for chilling.' },
        { slot: '05:00 PM - 07:00 PM', duration: '2 hours', why: 'Breathtaking golden hour light, cool evening breezes, and local lively atmosphere.', tip: 'Head to the western promenade or viewpoint deck at around 5:45 PM for panoramic sunset views.' },
      ];

      const builtDays = [];

      for (let d = 0; d < numDays; d++) {
        const stop1 = pickBest(morningCandidates, candidatePlaces);
        const stop2 = pickBest(afternoonCandidates, candidatePlaces);
        const stop3 = pickBest(lunchCandidates, candidatePlaces);
        const stop4 = pickBest(eveningCandidates, candidatePlaces);

        const dayStops = [stop1, stop2, stop3, stop4].filter(Boolean).map((stop, idx) => ({
          stopNumber: idx + 1,
          name: stop.name,
          category: stop.category || ['temple', 'museum', 'cafe', 'park'][idx] || 'attraction',
          timeSlot: timeSlots[idx]?.slot || '10:00 AM - 12:00 PM',
          duration: timeSlots[idx]?.duration || '2 hours',
          lat: stop.lat,
          lng: stop.lng,
          address: stop.address || 'Central City Area',
          rating: stop.rating || 4.5,
          whyVisitNow: timeSlots[idx]?.why || 'A great time to explore this location.',
          insiderTip: timeSlots[idx]?.tip || 'Ask locals for hidden gems and stories.',
          travelToNext: idx < 3 ? `Approx 8-12 min transit (${calculateDistance(stop.lat, stop.lng, ([stop1, stop2, stop3, stop4].filter(Boolean))[Math.min(idx + 1, 3)]?.lat || stop.lat, ([stop1, stop2, stop3, stop4].filter(Boolean))[Math.min(idx + 1, 3)]?.lng || stop.lng)} km)` : `End of Day ${d + 1} — perfect spot for dinner or returning to hotel`,
        }));

        builtDays.push({
          dayNumber: d + 1,
          dayTitle: `Day ${d + 1}: ${dayThemes[d]?.title || 'Explore & Discover'}`,
          dayTheme: dayThemes[d]?.theme || 'A curated experience of local highlights',
          stops: dayStops,
        });
      }

      const allStops = builtDays.flatMap(d => d.stops);
      let totalDist = 0;
      for (let i = 0; i < allStops.length - 1; i++) {
        totalDist += calculateDistance(allStops[i].lat, allStops[i].lng, allStops[i + 1].lat, allStops[i + 1].lng);
      }

      aiResult = {
        title: numDays === 1 ? 'Curated 1-Day City Highlight & Heritage Itinerary' : `Epic ${numDays}-Day Explorer's Journey`,
        totalDays: numDays,
        estimatedDuration: numDays === 1 ? '7.5 hours (8:30 AM - 7:00 PM)' : `${numDays} Days of Adventure`,
        totalDistance: `~${totalDist.toFixed(1)} km`,
        recommendedTransport: 'Walking & short auto/cab connections',
        days: builtDays,
        curatorTips: [
          'Wear comfortable slip-on footwear for sacred and historical sites.',
          'Start promptly by 8:30 AM to enjoy calm morning streets.',
          'Carry sunglasses and camera for spectacular golden hour views.',
          numDays > 1 ? 'Book accommodation near the city center for easy access to all routes.' : null,
          numDays > 2 ? 'Keep one day flexible for spontaneous local discoveries.' : null,
        ].filter(Boolean),
        source: 'smart-heuristic-planner',
      };
    } else {
      aiResult.source = 'gemini-ai';
      // Normalize: if Gemini returned old format (stops[] at top level, no days[]), wrap it
      if (!aiResult.days && Array.isArray(aiResult.stops)) {
        aiResult.days = [{
          dayNumber: 1,
          dayTitle: aiResult.title || 'Day 1',
          dayTheme: aiResult.theme || '',
          stops: aiResult.stops,
        }];
        aiResult.totalDays = 1;
      }
    }

    return res.status(200).json({
      success: true,
      itinerary: aiResult,
    });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   2. INTERACTIVE AI AUDIO GUIDE / NARRATOR
   ============================================================ */
const generateNarration = async (req, res, next) => {
  try {
    const { name, category = 'historical', address = '', lat, lng } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Place name is required.' });
    }

    const geminiPrompt = `
You are a master cultural storyteller and professional audio tour guide with deep knowledge of architecture, mythology, folklore, and living traditions.
Provide an engaging, immersive audio guide narrative for:
Place Name: "${name}"
Category: "${category}"
Location / Address: "${address || 'Nearby'}"

Output strictly valid JSON with this structure:
{
  "placeName": "${name}",
  "headline": "A captivating, poetic 1-line subtitle",
  "historicalEra": "Estimated time period or origins",
  "overview": "Engaging 2-sentence opening hooking the listener into the aura of this monument.",
  "chapters": [
    {
      "title": "🏛️ The Legend & Historical Genesis",
      "text": "Detailed fascinating paragraph on who commissioned it, historical context, and the era's legends."
    },
    {
      "title": "🎨 Architectural Mastery & Sacred Geometry",
      "text": "Detailed paragraph exploring carvings, structural ingenuity, spires, masonry, and hidden motifs."
    },
    {
      "title": "📜 Folklore & Local Mysteries",
      "text": "Mysterious legends, folklore passed down by generations, or extraordinary anecdotes."
    },
    {
      "title": "💡 Insider Visitor's Secret",
      "text": "Exact spots to stand, best photography angles, rituals, or acoustic curiosities."
    }
  ],
  "fullSpeechText": "A continuous, richly spoken 2.5-minute audio script written in natural, rhythmic speech designed for speech synthesis narration. Include welcoming intro, vivid descriptions, sensory details, and an inspiring sign-off."
}
`;

    let aiResult = null;
    const rawAiText = await callGemini(geminiPrompt, 'You are an immersive audio narrator. Output strictly valid JSON.');
    if (rawAiText) {
      aiResult = extractJSON(rawAiText);
    }

    // Heuristic Fallback
    if (!aiResult || !aiResult.chapters) {
      const isTemple = /temple|mandir|sanctum|shrine|matha/i.test(name) || category === 'temple';
      const isMuseum = /museum|gallery|heritage/i.test(name) || category === 'museum';
      const isPark = /park|garden|lake|sunset/i.test(name) || category === 'park';
      const isCafe = /cafe|coffee|bistro|bake/i.test(name) || category === 'cafe';

      let headline = `Unveiling the Timeless Spirit of ${name}`;
      let era = 'Historic Century Landmark';
      let ch1 = `Stepping into ${name} is like passing through a gateway in time. Established with profound cultural reverence, this revered landmark has witnessed generations of travelers, thinkers, and seekers. Its stones echo tales of great artisans who labored meticulously by hand to carve a monument meant to endure centuries.`;
      let ch2 = `Notice the architectural symmetry and intentional design. The entrance welcomes you with grand proportions, while the intricate stone carvings and structural alignment capture natural breezes and sunlight. Master craftsmen embedded symbolic motifs into the pillars and archways, reflecting the harmonious relationship between sacred geometry and timeless art.`;
      let ch3 = `Local lore speaks of hidden stories whispered through these corridors. Legend has it that pilgrims and travelers who paused here at dawn were granted clarity and good fortune. Hidden chambers and acoustic echoes throughout the structure continue to fascinate visitors to this day.`;
      let ch4 = `Pro Tip: Stand near the central courtyard archway facing west during late afternoon for the softest golden lighting. Pause for a moment of quiet reflection to appreciate the serene acoustic resonance that few casual visitors notice.`;

      if (isTemple) {
        headline = `Sacred Sanctum of Faith, Stonecraft & Divine Silence`;
        era = 'Classical Temple Architecture';
        ch1 = `${name} stands as an embodiment of sacred devotion and community harmony. According to historical chronicles, the sanctuary was envisioned as a cosmic blueprint where earth connects with the celestial. Centuries of uninterrupted worship and morning chantings have imbued this space with deep peaceful energy.`;
        ch2 = `Observe the Shikhara (towering spire) rising majestically, symbolizing the axis of the cosmos. The sanctum sanctorum or Garbhagriha is intentionally designed with low ambient lighting and thick stone masonry to center the mind and insulate the spirit from outer distractions. Notice the delicate relief sculptures adorning each pillar.`;
        ch3 = `Folklore recounts that the foundation stone was consecrated at an auspicious celestial alignment, ensuring that peace reigns within its sacred perimeter. Elders recount mystical tales of centuries-old bells whose melodious chime could be heard across distant villages during festivals.`;
        ch4 = `Pro Tip: Take a slow, clockwise circumambulation (Pradakshina) around the inner sanctum. The cool stone floor and soft incense fragrance create a meditative aura best experienced early in the morning before crowds arrive.`;
      } else if (isPark) {
        headline = `Green Haven of Serenity, Flora & Sunset Vistas`;
        era = 'Modern Civic Nature Reserve';
        ch1 = `${name} was cultivated as a lush green sanctuary, offering solace from bustling city rhythms. Designed with winding arboreal paths and curated flora, it provides an urban refuge for diverse birdlife and nature enthusiasts.`;
        ch2 = `The landscaping balances organic wilderness with serene paved promenades, water features, and expansive grassy knolls. Canopy trees provide dappled shade throughout the day, while fragrance gardens bloom vibrantly in the cooling evening air.`;
        ch3 = `Longtime residents love sharing stories of this oasis—from poet gatherings beneath grand banyan trees to dawn walkers who have observed migratory birds returning season after season.`;
        ch4 = `Pro Tip: Head toward the highest point or water-facing edge approximately 30 minutes before sunset. As the sky turns into hues of amber and violet, the panoramic view is unparalleled.`;
      } else if (isCafe) {
        headline = `Hub of Artisanal Flavors, Warmth & Conviviality`;
        era = 'Contemporary Culinary Sanctuary';
        ch1 = `${name} has carved out a beloved place in local neighborhood culture, serving as a vibrant meeting ground for coffee connoisseurs, creative minds, and world travelers.`;
        ch2 = `The interior design marries warm woods, artisanal ceramics, and natural daylight. The acoustic balance allows lively conversation while still providing cozy nooks for solo reading or thoughtful conversation.`;
        ch3 = `Known locally for its signature blends and handcrafted delicacies, the cafe celebrates community storytelling. Regulars often trace fond memories, creative breakthroughs, and long friendships born over warm mugs right here.`;
        ch4 = `Pro Tip: Pair the barista’s signature single-origin brew or seasonal cooler with their freshly baked house pastry, and choose a window-side corner for great people-watching.`;
      }

      const fullSpeech = `Welcome, explorer. You are listening to the official audio guide for ${name}. ${ch1} As you look around, ${ch2} Beyond the physical beauty lies rich folklore. ${ch3} Before you move on to your next adventure, keep this in mind: ${ch4} Thank you for exploring with Tour Guide. Enjoy every step of your journey!`;

      aiResult = {
        placeName: name,
        headline,
        historicalEra: era,
        overview: `Discover the captivating history, architectural wonder, and hidden folklore of ${name}.`,
        chapters: [
          { title: '🏛️ The Legend & Historical Genesis', text: ch1 },
          { title: '🎨 Architectural Mastery & Layout', text: ch2 },
          { title: '📜 Folklore & Living Myths', text: ch3 },
          { title: '💡 Insider Visitor Secret', text: ch4 },
        ],
        fullSpeechText: fullSpeech,
        source: 'smart-cultural-narrator',
      };
    } else {
      aiResult.source = 'gemini-ai';
    }

    return res.status(200).json({
      success: true,
      narration: aiResult,
    });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   3. SMART TRAVEL ASSISTANT CHATBOT
   ============================================================ */
const chatAssistant = async (req, res, next) => {
  try {
    const { message, userLocation = {}, nearbyPlaces = [], history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty.' });
    }

    const userLat = parseFloat(userLocation.lat);
    const userLng = parseFloat(userLocation.lng);
    const hasLocation = !isNaN(userLat) && !isNaN(userLng);

    // Compute distances for nearby places if location is present
    const placesWithDist = (nearbyPlaces || []).map(p => {
      let d = p.distanceKm;
      if (d === undefined && hasLocation && p.lat && p.lng) {
        d = calculateDistance(userLat, userLng, p.lat, p.lng);
      }
      return { ...p, distanceKm: d };
    });

    const userText = message.trim();
    const lower = userText.toLowerCase();

    // Context summary for Gemini
    const contextSummary = `
Traveler Current Location: ${hasLocation ? `Latitude ${userLat.toFixed(4)}, Longitude ${userLng.toFixed(4)}` : 'Location not pinpointed yet'}
Known Nearby Places in App (${placesWithDist.length} items):
${placesWithDist.slice(0, 12).map((p, i) => `#${i + 1} "${p.name}" (${p.category || 'place'}) - Rating: ${p.rating || 'N/A'}, Dist: ${p.distanceKm ? p.distanceKm + ' km' : 'nearby'}, OpenNow: ${p.openNow === true ? 'Yes' : p.openNow === false ? 'No' : 'Unknown'}, Address: ${p.address || ''}`).join('\n')}
`;

    const systemPrompt = `
You are "TourBot", a friendly, witty, and deeply knowledgeable local travel assistant inside the Tour Guide web application.
Your goal is to give direct, enthusiastic, helpful advice to travelers.
Always be concise, structured, and practical.
Use emojis generously.
When recommending places from the nearby list, mention their exact name, why it's great, distance, and key highlights.
If the user asks for vegetarian food, sunset spots, walking tours, or opening hours, answer with direct recommendations!
`;

    let replyText = null;
    let suggestedPlaces = [];

    // Check Gemini API
    const geminiPrompt = `
${contextSummary}

Traveler Question: "${userText}"

Please answer warmly, concisely, and accurately based on the traveler's location and the nearby places list above.
`;

    const rawAiReply = await callGemini(geminiPrompt, systemPrompt);
    if (rawAiReply) {
      replyText = rawAiReply.trim();
    }

    // Heuristic Fallback Engine
    if (!replyText) {
      if (lower.includes('vegetarian') || lower.includes('veg') || lower.includes('food') || lower.includes('restaurant') || lower.includes('eat') || lower.includes('cafe')) {
        // Find food spots
        const foodPlaces = placesWithDist.filter(p => ['restaurant', 'cafe'].includes(p.category) || /restaurant|cafe|bistro|kitchen|sweets|bhojanalaya|diner|veg/i.test(p.name));
        
        if (foodPlaces.length > 0) {
          const topSpots = foodPlaces.slice(0, 3);
          suggestedPlaces = topSpots;
          replyText = `🥗 **Delicious Dining & Vegetarian Options Near You:**\n\n` +
            topSpots.map((p, i) => `**${i + 1}. ${p.name}**\n` +
              `• 📍 Distance: ${p.distanceKm !== undefined ? p.distanceKm + ' km away' : 'Nearby'}\n` +
              `• ⭐ Rating: ${p.rating ? p.rating + ' / 5' : 'Popular spot'}\n` +
              `• 🕒 Status: ${p.openNow === true ? '🟢 Open right now!' : p.openNow === false ? '🔴 Currently closed' : 'Serving fresh meals'}\n` +
              `• 💡 Tip: Offers delicious fresh vegetarian platters, hot beverages, and authentic regional flavors.\n`
            ).join('\n') +
            `\n👉 Tap **"View on Map"** below any spot to get instant turn-by-turn directions!`;
        } else {
          replyText = `🥗 **Finding Vegetarian & Local Food Near You:**\n\nAround your current location, you have delightful options:\n1. Look out for local Pure Vegetarian (Shuddha Shakahari) dining spots and garden cafes along main avenues.\n2. In our search bar above, type **"Pure Veg"** or **"Cafe"** with your search radius set to 5 km.\n3. Most cafes nearby also offer vegan milk options and fresh organic snacks!`;
        }
      } else if (lower.includes('sunset') || lower.includes('sun set') || lower.includes('view') || lower.includes('evening') || lower.includes('park') || lower.includes('skyline')) {
        // Find parks or scenic spots
        const scenicPlaces = placesWithDist.filter(p => ['park', 'historical'].includes(p.category) || /park|garden|lake|sunset|overlook|hill|fort|terrace/i.test(p.name));
        
        if (scenicPlaces.length > 0) {
          const topScenic = scenicPlaces.slice(0, 3);
          suggestedPlaces = topScenic;
          replyText = `🌅 **Top Sunset & Scenic Spots Within 5 km:**\n\n` +
            topScenic.map((p, i) => `**${i + 1}. ${p.name}**\n` +
              `• 📍 Distance: ${p.distanceKm !== undefined ? p.distanceKm + ' km away' : 'Short ride'}\n` +
              `• ⭐ Rating: ${p.rating ? p.rating + ' / 5' : 'Highly rated'}\n` +
              `• 🕒 Best Arrival: 5:15 PM - 5:45 PM for prime golden hour lighting.\n` +
              `• 💡 Why Visit: Expansive open skies, gentle evening breeze, and unobstructed western horizon views.\n`
            ).join('\n') +
            `\n📸 Remember to bring your camera or phone fully charged for golden hour!`;
        } else {
          replyText = `🌅 **Best Sunset Spot Recommendation:**\n\nWithin 5 km of your location, the best sunset spots are typically open parks, lake promenades, and rooftop viewpoints.\n\n• **Golden Hour Window:** 5:30 PM - 6:15 PM\n• **Tip:** Switch your category filter to **"🌳 Parks"** or increase your search radius to 10 km to discover elevated viewing spots!`;
        }
      } else if (lower.includes('itinerary') || lower.includes('plan') || lower.includes('1-day') || lower.includes('day')) {
        replyText = `✨ **Looking for an itinerary?**\n\nYou're in luck! Click the **"✨ Create 1-Day Itinerary"** button in the sidebar or navbar. Our AI will automatically take your coordinates and construct an optimal 4-stop day plan (Morning Temple ➔ Lunch Cafe ➔ Afternoon Museum ➔ Sunset Park) with turn-by-turn routing!`;
      } else if (lower.includes('history') || lower.includes('monument') || lower.includes('temple') || lower.includes('culture') || lower.includes('listen')) {
        const heritagePlaces = placesWithDist.filter(p => ['temple', 'historical', 'museum'].includes(p.category));
        if (heritagePlaces.length > 0) {
          suggestedPlaces = heritagePlaces.slice(0, 2);
        }
        replyText = `🏛️ **Heritage & Cultural Wonders Nearby:**\n\nThis area is steeped in history! Whenever you click on any place card or marker, you can click **"🎧 Listen to Guide"** to hear our AI voice narrator describe the architecture, historical dynasty, and folklore with authentic voice narration.\n\nWould you like recommendations for temples, monuments, or museums?`;
      } else {
        replyText = `👋 **Hello! I'm TourBot, your AI Travel Companion.**\n\nI can help you explore with real-time smart suggestions:\n• 🥗 *"Where can I find vegetarian food open right now?"*\n• 🌅 *"What is the best spot to watch the sunset within 5 km?"*\n• 🛕 *"Tell me about the history of temples nearby"*\n• 🚶 *"Suggest a 2-hour walking tour"* \n\nWhat are you in the mood for today?`;
      }
    }

    return res.status(200).json({
      success: true,
      reply: replyText,
      suggestedPlaces,
      source: rawAiReply ? 'gemini-ai' : 'smart-assistant-engine',
    });
  } catch (error) {
    next(error);
  }
};

/* ============================================================
   4. AI STATUS & CONFIG
   ============================================================ */
const getAiConfig = async (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY');
  res.status(200).json({
    success: true,
    geminiConfigured: hasKey,
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    features: {
      itineraryGenerator: true,
      audioGuide: true,
      smartChatbot: true,
      webSpeechTTS: true,
    },
  });
};

module.exports = {
  generateItinerary,
  generateNarration,
  chatAssistant,
  getAiConfig,
};
