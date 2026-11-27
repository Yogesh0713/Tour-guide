const CustomPlace = require('../models/CustomPlace');

// @desc   Get all custom places created by the logged-in user
// @route  GET /api/custom-places
// @access Private
const getCustomPlaces = async (req, res, next) => {
  try {
    const places = await CustomPlace.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: places.length,
      places: places.map(p => ({
        id: p._id,
        osmId: `custom_${p._id}`,
        name: p.name,
        category: p.category,
        lat: p.lat,
        lng: p.lng,
        address: p.address,
        description: p.description,
        photoUrl: p.photoUrl,
        rating: p.rating,
        isCustom: true,
        status: p.status,
        reviewNote: p.reviewNote,
        statusHistory: p.statusHistory,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Create a new custom place
// @route  POST /api/custom-places
// @access Private
const addCustomPlace = async (req, res, next) => {
  try {
    const { name, category, lat, lng, address, description, photoUrl } = req.body;

    if (!name || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, latitude, and longitude are required.',
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Valid numeric latitude and longitude are required.',
      });
    }

    const customPlace = await CustomPlace.create({
      userId: req.user._id,
      name: name.trim(),
      category: category || 'all',
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      lat: latitude,
      lng: longitude,
      address: (address || '').trim(),
      description: (description || '').trim(),
      photoUrl: (photoUrl || '').trim(),
      rating: 5.0,
      isCustom: true,
      status: 'pending', // waits for admin approval
      statusHistory: [{ status: 'pending', by: req.user.name, note: 'Submitted' }],
    });

    res.status(201).json({
      success: true,
      message: 'Submitted for admin review.',
      place: {
        id: customPlace._id,
        osmId: `custom_${customPlace._id}`,
        name: customPlace.name,
        category: customPlace.category,
        lat: customPlace.lat,
        lng: customPlace.lng,
        address: customPlace.address,
        description: customPlace.description,
        photoUrl: customPlace.photoUrl,
        rating: customPlace.rating,
        isCustom: true,
        status: customPlace.status,
        createdAt: customPlace.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Delete a custom place
// @route  DELETE /api/custom-places/:id
// @access Private
const deleteCustomPlace = async (req, res, next) => {
  try {
    const place = await CustomPlace.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id, // User can only delete their own
    });

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Custom location not found or unauthorized.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Custom location removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Approved spots from OTHER users near a location (public to logged-in users)
// @route  GET /api/custom-places/nearby?lat=&lng=&radius=
// @access Private
const getApprovedNearby = async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = Math.min(parseFloat(req.query.radius) || 5000, 30000);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'Valid lat and lng are required.' });
    }

    const places = await CustomPlace.find({
      status: 'approved',
      userId: { $ne: req.user._id }, // own places are already in "My Custom Spots"
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radius,
        },
      },
    })
      .select('name category lat lng address description photoUrl rating createdAt')
      .limit(50);

    res.status(200).json({
      success: true,
      count: places.length,
      places: places.map((p) => ({
        osmId: `custom_${p._id}`,
        name: p.name,
        category: p.category,
        lat: p.lat,
        lng: p.lng,
        address: p.address,
        description: p.description,
        photoUrl: p.photoUrl,
        rating: p.rating,
        userRatingsTotal: 0,
        openNow: null,
        tags: {},
        source: 'community',
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomPlaces,
  addCustomPlace,
  deleteCustomPlace,
  getApprovedNearby,
};
