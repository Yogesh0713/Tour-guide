const Favourite = require('../models/Favourite');

// @desc   Get all favourites for the logged-in user
// @route  GET /api/favourites
// @access Private
const getFavourites = async (req, res, next) => {
  try {
    const favourites = await Favourite.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: favourites.length, favourites });
  } catch (error) {
    next(error);
  }
};

// @desc   Save a place as favourite
// @route  POST /api/favourites
// @access Private
const addFavourite = async (req, res, next) => {
  try {
    const { osmId, name, category, lat, lng, address, tags } = req.body;

    if (!osmId || !name || !category || lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'osmId, name, category, lat, and lng are required.' });
    }

    const favourite = await Favourite.create({
      userId: req.user._id,
      osmId,
      name,
      category,
      location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      address: address || '',
      tags: tags || {},
    });

    res.status(201).json({ success: true, favourite });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Place already in your favourites.' });
    }
    next(error);
  }
};

// @desc   Remove a favourite
// @route  DELETE /api/favourites/:id
// @access Private
const removeFavourite = async (req, res, next) => {
  try {
    const favourite = await Favourite.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id, // Ensure user can only delete their own
    });

    if (!favourite) {
      return res.status(404).json({ success: false, message: 'Favourite not found.' });
    }

    res.status(200).json({ success: true, message: 'Favourite removed.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getFavourites, addFavourite, removeFavourite };
