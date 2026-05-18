const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const [total, pending, inProgress, resolved, rejected] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'Pending' }),
      Complaint.countDocuments({ status: 'In Progress' }),
      Complaint.countDocuments({ status: 'Resolved' }),
      Complaint.countDocuments({ status: 'Rejected' }),
    ]);

    // Category breakdown
    const categoryStats = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Complaint.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Priority breakdown
    const priorityStats = await Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const totalUsers = await User.countDocuments({ role: 'user' });
    const recentComplaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name village');

    res.json({
      success: true,
      stats: { total, pending, inProgress, resolved, rejected, totalUsers },
      categoryStats,
      monthlyTrend,
      priorityStats,
      recentComplaints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all complaints (admin)
// @route   GET /api/admin/complaints
// @access  Admin
const getAllComplaints = async (req, res, next) => {
  try {
    const { status, category, priority, search, page = 1, limit = 15, sortBy = 'createdAt', order = 'desc' } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { trackingId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };
    const total = await Complaint.countDocuments(query);
    const complaints = await Complaint.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('user', 'name email village phone');

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

// @desc    Update complaint status
// @route   PUT /api/admin/complaints/:id/status
// @access  Admin
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    complaint.status = status;
    if (adminNote) complaint.adminNote = adminNote;
    if (status === 'Resolved') complaint.resolvedAt = new Date();

    complaint.statusHistory.push({
      status,
      changedBy: req.user.id,
      note: adminNote || `Status updated to ${status}`,
    });

    await complaint.save();

    // Notify the complaint owner
    await Notification.create({
      recipient: complaint.user,
      type: 'status_update',
      title: 'Complaint Status Updated',
      message: `Your complaint "${complaint.title}" (${complaint.trackingId}) status changed to "${status}".${adminNote ? ` Note: ${adminNote}` : ''}`,
      complaint: complaint._id,
    });

    // Emit Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('status_update', { complaintId: complaint._id, status, userId: complaint.user });
    }

    await complaint.populate('user', 'name email village');
    res.json({ success: true, message: 'Status updated successfully', complaint });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete complaint
// @route   DELETE /api/admin/complaints/:id
// @access  Admin
const deleteComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    res.json({ success: true, message: 'Complaint deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (admin)
// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 15 } = req.query;
    const query = { role: 'user' };
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, total, users });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active status
// @route   PUT /api/admin/users/:id/toggle
// @access  Admin
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, user });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats, getAllComplaints, updateComplaintStatus, deleteComplaint, getAllUsers, toggleUserStatus };
