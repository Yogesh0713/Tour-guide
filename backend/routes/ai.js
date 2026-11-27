const express = require('express');
const router = express.Router();
const {
  generateItinerary,
  generateNarration,
  chatAssistant,
  getAiConfig,
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.get('/config', protect, getAiConfig);
router.post('/itinerary', protect, generateItinerary);
router.post('/narrate', protect, generateNarration);
router.post('/chat', protect, chatAssistant);

module.exports = router;
