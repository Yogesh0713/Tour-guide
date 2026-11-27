const fetch = require('node-fetch');

// Map frontend categories to Google Places API types/keywords
const CATEGORY_MAP = {
  temple:     { type: 'hindu_temple', keyword: 'temple' },
  mosque:     { type: 'mosque', keyword: 'mosque' },
  church:     { type: 'church', keyword: 'church' },
  cafe:       { type: 'cafe', keyword: 'cafe' },
  restaurant: { type: 'restaurant', keyword: 'restaurant' },
  historical: { type: 'tourist_attraction', keyword: 'historical monument heritage' },
  museum:     { type: 'museum', keyword: 'museum' },
  park:       { type: 'park', keyword: 'park garden' },
  hotel:      { type: 'lodging', keyword: 'hotel' },
  hospital:   { type: 'hospital', keyword: 'hospital clinic' },
  atm:        { type: 'atm', keyword: 'atm bank' },
  all:        { type: 'tourist_attraction', keyword: 'attractions point of interest' },
};

// @desc   Fetch nearby places via Google Places API Nearby Search
// @route  GET /api/places/nearby?lat=&lng=&radius=&category=
// @access Private
const getNearbyPlaces = async (req, res, next) => {
  try {
    const { lat, lng, radius = 2000, category = 'all' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng query params are required.' });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'Google Maps API key is not configured.' });
    }

    const mapping = CATEGORY_MAP[category] || CATEGORY_MAP['all'];

    // Google Places Nearby Search URL
    let googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${apiKey}`;
    if (mapping.type) {
      googleUrl += `&type=${mapping.type}`;
    }
    if (mapping.keyword) {
      googleUrl += `&keyword=${encodeURIComponent(mapping.keyword)}`;
    }

    const response = await fetch(googleUrl);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn('Google Places API Status:', data.status, data.error_message);
      // If error or unhandled status, return empty list gracefully
      return res.status(200).json({ success: true, count: 0, places: [], warning: data.status });
    }

    const results = data.results || [];

    // Format places consistently for frontend
    const places = results.map((place) => {
      // Photo reference if available
      const photoRef = place.photos && place.photos.length > 0
        ? place.photos[0].photo_reference
        : null;

      return {
        osmId: place.place_id,
        name: place.name,
        category,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        address: place.vicinity || '',
        rating: place.rating || null,
        userRatingsTotal: place.user_ratings_total || 0,
        openNow: place.opening_hours ? place.opening_hours.open_now : null,
        photoUrl: photoRef ? `/api/places/photo?ref=${photoRef}` : null,
        tags: {
          types: (place.types || []).join(', '),
          rating: place.rating ? `${place.rating} ★ (${place.user_ratings_total})` : 'No reviews',
        },
      };
    });

    res.status(200).json({ success: true, count: places.length, places });
  } catch (error) {
    next(error);
  }
};

// @desc   Proxy Google Places Photos so API key stays hidden and secure
// @route  GET /api/places/photo?ref=
// @access Public / Private
const getPlacePhoto = async (req, res, next) => {
  try {
    const { ref, maxwidth = 400 } = req.query;
    if (!ref) {
      return res.status(400).send('Photo reference is required');
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${ref}&key=${apiKey}`;

    const photoRes = await fetch(photoUrl);
    if (!photoRes.ok) {
      return res.status(photoRes.status).send('Failed to fetch photo');
    }

    // Pipe image buffer and headers back
    res.setHeader('Content-Type', photoRes.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    photoRes.body.pipe(res);
  } catch (error) {
    next(error);
  }
};

// @desc   Provide public Google Maps key & mapId for client-side JS SDK loader
// @route  GET /api/places/config
// @access Private
const getGoogleMapsConfig = async (req, res) => {
  res.status(200).json({
    success: true,
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    mapId: process.env.GOOGLE_MAPS_MAP_ID || null,
  });
};

module.exports = { getNearbyPlaces, getPlacePhoto, getGoogleMapsConfig };
