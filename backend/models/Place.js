const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema(
  {
    osmId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
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
    cachedAt: {
      type: Date,
      default: Date.now,
      expires: 3600, // auto-delete after 1 hour (TTL index)
    },
  },
  { timestamps: false }
);

placeSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Place', placeSchema);
