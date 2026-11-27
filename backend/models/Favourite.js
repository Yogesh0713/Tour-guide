const mongoose = require('mongoose');

const favouriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    osmId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: {
      type: String,
      default: '',
    },
    tags: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

// GeoJSON 2dsphere index for geospatial queries
favouriteSchema.index({ location: '2dsphere' });

// Prevent duplicate saves for the same user + place
favouriteSchema.index({ userId: 1, osmId: 1 }, { unique: true });

module.exports = mongoose.model('Favourite', favouriteSchema);
