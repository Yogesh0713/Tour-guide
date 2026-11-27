const express = require('express');
const router = express.Router();
const {
  getCustomPlaces,
  addCustomPlace,
  deleteCustomPlace,
  getApprovedNearby,
} = require('../controllers/customPlacesController');
const { protect } = require('../middleware/authMiddleware');
const { handlePhotoUpload } = require('../middleware/photoUpload');

router.use(protect); // All routes require authentication

router.route('/')
  .get(getCustomPlaces)
  .post(handlePhotoUpload, addCustomPlace);

router.get('/nearby', getApprovedNearby); // approved spots from other users

router.route('/:id')
  .delete(deleteCustomPlace);

module.exports = router;
