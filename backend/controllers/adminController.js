const CustomPlace = require('../models/CustomPlace');
const User = require('../models/User');

const STATUSES = ['pending', 'approved', 'rejected'];

// @desc   List custom places by status (newest first)
// @route  GET /api/admin/places?status=pending
// @access Admin
const listPlaces = async (req, res, next) => {
  try {
    const status = STATUSES.includes(req.query.status) ? req.query.status : 'pending';
    const places = await CustomPlace.find({ status })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: places.length,
      places: places.map((p) => ({
        id: p._id,
        name: p.name,
        category: p.category,
        lat: p.lat,
        lng: p.lng,
        address: p.address,
        description: p.description,
        photoUrl: p.photoUrl,
        rating: p.rating,
        status: p.status,
        reviewNote: p.reviewNote,
        createdAt: p.createdAt,
        addedBy: p.userId ? p.userId.name : 'Unknown',
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Approve or reject a place (a rejection must include a reason)
// @route  PATCH /api/admin/places/:id   body: { status, reviewNote }
// @access Admin
const reviewPlace = async (req, res, next) => {
  try {
    const { status } = req.body;
    const reviewNote = String(req.body.reviewNote || '').trim().slice(0, 300);

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected.' });
    }
    if (status === 'rejected' && !reviewNote) {
      return res.status(400).json({ success: false, message: 'Please give a reason for rejecting.' });
    }

    const place = await CustomPlace.findById(req.params.id);
    if (!place) {
      return res.status(404).json({ success: false, message: 'Place not found.' });
    }

    place.status = status;
    place.reviewNote = reviewNote;
    place.statusHistory.push({ status, by: req.user.name, note: reviewNote, at: new Date() });
    await place.save();

    res.status(200).json({ success: true, place: { id: place._id, status: place.status } });
  } catch (error) {
    next(error);
  }
};

// @desc   Delete any custom place
// @route  DELETE /api/admin/places/:id
// @access Admin
const deletePlace = async (req, res, next) => {
  try {
    const place = await CustomPlace.findByIdAndDelete(req.params.id);
    if (!place) {
      return res.status(404).json({ success: false, message: 'Place not found.' });
    }
    res.status(200).json({ success: true, message: 'Place deleted.' });
  } catch (error) {
    next(error);
  }
};

// @desc   Counts for the admin dashboard
// @route  GET /api/admin/stats
// @access Admin
const getStats = async (req, res, next) => {
  try {
    const [users, pending, approved, rejected] = await Promise.all([
      User.countDocuments(),
      CustomPlace.countDocuments({ status: 'pending' }),
      CustomPlace.countDocuments({ status: 'approved' }),
      CustomPlace.countDocuments({ status: 'rejected' }),
    ]);
    res.status(200).json({ success: true, users, places: { pending, approved, rejected } });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPlaces, reviewPlace, deletePlace, getStats };
