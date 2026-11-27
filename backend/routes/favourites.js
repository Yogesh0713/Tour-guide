const express = require('express');
const router = express.Router();
const { getFavourites, addFavourite, removeFavourite } = require('../controllers/favouritesController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All favourites routes require auth

router.route('/').get(getFavourites).post(addFavourite);
router.route('/:id').delete(removeFavourite);

module.exports = router;
