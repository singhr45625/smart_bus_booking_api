const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const { protect, admin } = require('../middleware/authMiddleware');

// Apply middleware to all admin routes
router.use(protect, admin);

// Get Admin Stats
router.get('/stats', async (req, res) => {
    try {
        const usersCount = await User.countDocuments({ isAdmin: false, isOperator: false });
        const operatorsCount = await User.countDocuments({ isOperator: true });
        
        const bookings = await Booking.find();
        const totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
        
        // Let's assume a 10% commission platform fee for revenue
        const platformRevenue = totalRevenue * 0.10;

        res.json({
            users: usersCount,
            operators: operatorsCount,
            totalRevenue: totalRevenue,
            platformRevenue: platformRevenue
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({ isAdmin: false, isOperator: false }).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all operators
router.get('/operators', async (req, res) => {
    try {
        const operators = await User.find({ isOperator: true }).select('-password');
        res.json(operators);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const { releaseUnpaidBookings } = require('../controllers/bookingController');

// Get all bookings
router.get('/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('user', 'username email')
            .populate('bus');
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual trigger to release unpaid seats
router.post('/release-seats', releaseUnpaidBookings);

module.exports = router;
