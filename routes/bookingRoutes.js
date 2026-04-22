const express = require('express');
const router = express.Router();
const { createBooking, getMyBookings, getBookingById, payRemainingBalance } = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createBooking);
router.get('/my-bookings', protect, getMyBookings);
router.get('/:id', protect, getBookingById);
router.post('/:id/pay-balance', protect, payRemainingBalance);

module.exports = router;
