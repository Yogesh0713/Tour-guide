const express = require('express');
const router = express.Router();
const { listPlaces, reviewPlace, deletePlace, getStats } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Every admin route needs a logged-in admin
router.use(protect, adminOnly);

router.get('/stats', getStats);
router.get('/places', listPlaces);
router.patch('/places/:id', reviewPlace);
router.delete('/places/:id', deletePlace);

module.exports = router;
