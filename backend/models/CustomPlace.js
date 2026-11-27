const mongoose = require('mongoose');

const customPlaceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Place name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      default: 'all',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    photoUrl: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      default: 5.0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewNote: {
      type: String,
      default: '',
    },
    statusHistory: [
      {
        status: { type: String, enum: ['pending', 'approved', 'rejected'] },
        by: { type: String, default: '' },
        note: { type: String, default: '' },
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    isCustom: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

customPlaceSchema.index({ location: '2dsphere' });
customPlaceSchema.index({ userId: 1 });

module.exports = mongoose.model('CustomPlace', customPlaceSchema);
