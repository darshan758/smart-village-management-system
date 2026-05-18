const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const CATEGORIES = [
  'Street Light Damage',
  'Road Damage',
  'Water Leakage',
  'Garbage Issue',
  'Drainage Problem',
  'Electricity Problem',
  'Others',
];

const STATUS = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITY = ['Low', 'Medium', 'High', 'Critical'];

const complaintSchema = new mongoose.Schema(
  {
    trackingId: {
      type: String,
      unique: true,
      default: () => `SV-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 4).toUpperCase()}`,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: CATEGORIES,
    },
    priority: {
      type: String,
      enum: PRIORITY,
      default: 'Medium',
    },
    status: {
      type: String,
      enum: STATUS,
      default: 'Pending',
    },
    image: {
      type: String,
      default: null,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    locationName: {
      type: String,
      default: null,
    },
    geoTagged: {
      type: Boolean,
      default: false,
    },
    adminNote: {
      type: String,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    statusHistory: [
      {
        status: { type: String, enum: STATUS },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String,
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for fast queries
complaintSchema.index({ user: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ trackingId: 1 });
complaintSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.STATUS = STATUS;
module.exports.PRIORITY = PRIORITY;
