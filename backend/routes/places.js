const express = require('express');
const router = express.Router();
const { getNearbyPlaces, getPlacePhoto, getGoogleMapsConfig } = require('../controllers/placesController');
const { protect } = require('../middleware/authMiddleware');

router.get('/config', protect, getGoogleMapsConfig);
router.get('/nearby', protect, getNearbyPlaces);
router.get('/photo', getPlacePhoto); // Photo proxy

module.exports = router;
