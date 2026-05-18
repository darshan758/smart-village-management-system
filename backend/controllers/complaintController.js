const path = require('path');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { extractGeoTag } = require('../utils/exifExtractor');

// @desc    Create new complaint
// @route   POST /api/complaints
// @access  Private
const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, priority, latitude, longitude, locationName } = req.body;

    let imgPath = null;
    let lat = latitude ? parseFloat(latitude) : null;
    let lng = longitude ? parseFloat(longitude) : null;
    let geoTagged = false;

    // Handle uploaded image & extract EXIF geotag
    if (req.file) {
      imgPath = `/uploads/${req.file.filename}`;
      const geoData = await extractGeoTag(req.file.path);
      if (geoData) {
        lat = geoData.latitude;
        lng = geoData.longitude;
        geoTagged = true;
      }
    }

    const complaint = await Complaint.create({
      user: req.user.id,
      title,
      description,
      category,
      priority: priority || 'Medium',
      image: imgPath,
      latitude: lat,
      longitude: lng,
      locationName: locationName || null,
      geoTagged,
      statusHistory: [{ status: 'Pending', changedBy: req.user.id, note: 'Complaint submitted' }],
    });

    // Increment user complaint count
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalComplaints: 1 } });

    // Notify all admins
    const admins = await User.find({ role: 'admin' }).select('_id');
    const notifications = admins.map((admin) => ({
      recipient: admin._id,
      type: 'new_complaint',
      title: 'New Complaint Submitted',
      message: `${req.user.name} submitted: "${title}" (${category})`,
      complaint: complaint._id,
    }));
    if (notifications.length) await Notification.insertMany(notifications);

    // Emit Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.emit('new_complaint', {
        complaint: { ...complaint.toObject(), user: req.user },
        message: `New complaint: ${title}`,
      });
    }

    await complaint.populate('user', 'name email village');

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint,
      geoTagExtracted: geoTagged,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's complaints
// @route   GET /api/complaints/my
// @access  Private
const getMyComplaints = async (req, res, next) => {
  try {
    const { status, category, search, page = 1, limit = 10 } = req.query;
    const query = { user: req.user.id };

    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { trackingId: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Complaint.countDocuments(query);
    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('user', 'name email');

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      complaints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get complaint by tracking ID
// @route   GET /api/complaints/track/:trackingId
// @access  Public
const trackComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findOne({ trackingId: req.params.trackingId })
      .populate('user', 'name village')
      .populate('statusHistory.changedBy', 'name');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found with this tracking ID' });
    }

    res.json({ success: true, complaint });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single complaint
// @route   GET /api/complaints/:id
// @access  Private
const getComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('user', 'name email village');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Only owner or admin can view
    if (complaint.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, complaint });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all complaint locations (for map)
// @route   GET /api/complaints/locations
// @access  Private
const getComplaintLocations = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({
      latitude: { $ne: null },
      longitude: { $ne: null },
    })
      .select('title category status latitude longitude locationName trackingId createdAt')
      .populate('user', 'name village')
      .sort({ createdAt: -1 });

    res.json({ success: true, complaints });
  } catch (error) {
    next(error);
  }
};

module.exports = { createComplaint, getMyComplaints, trackComplaint, getComplaint, getComplaintLocations };
