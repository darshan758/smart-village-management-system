const express = require('express');
const {
  createComplaint,
  getMyComplaints,
  trackComplaint,
  getComplaint,
  getComplaintLocations,
} = require('../controllers/complaintController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const Notification = require('../models/Notification');

const router = express.Router();

router.get('/locations', protect, getComplaintLocations);
router.get('/my', protect, getMyComplaints);
router.get('/track/:trackingId', trackComplaint);
router.get('/:id', protect, getComplaint);
router.post('/', protect, upload.single('image'), createComplaint);

// Notifications
router.get('/notifications/all', protect, async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('complaint', 'title trackingId');
  res.json({ success: true, notifications });
});

router.put('/notifications/read', protect, async (req, res) => {
  await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
  res.json({ success: true, message: 'All notifications marked as read' });
});

router.get('/notifications/unread-count', protect, async (req, res) => {
  const count = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
  res.json({ success: true, count });
});

module.exports = router;
