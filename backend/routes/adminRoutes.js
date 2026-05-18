const express = require('express');
const {
  getDashboardStats,
  getAllComplaints,
  updateComplaintStatus,
  deleteComplaint,
  getAllUsers,
  toggleUserStatus,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// All admin routes require auth + admin role
router.use(protect, adminOnly);

router.get('/stats', getDashboardStats);
router.get('/complaints', getAllComplaints);
router.put('/complaints/:id/status', updateComplaintStatus);
router.delete('/complaints/:id', deleteComplaint);
router.get('/users', getAllUsers);
router.put('/users/:id/toggle', toggleUserStatus);

module.exports = router;
