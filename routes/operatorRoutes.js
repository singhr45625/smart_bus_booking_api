const express = require('express');
const router = express.Router();
const Bus = require('../models/Bus');
const Booking = require('../models/Booking');
const { protect, operator } = require('../middleware/authMiddleware');

// Apply middleware to all operator routes
router.use(protect, operator);

// Get Operator Stats
router.get('/stats', async (req, res) => {
    try {
        const operatorBuses = await Bus.find({ operator: req.user._id });
        const busIds = operatorBuses.map(bus => bus._id);
        
        const bookingsCount = await Booking.countDocuments({ bus: { $in: busIds } });
        
        const bookings = await Booking.find({ bus: { $in: busIds } });
        const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);

        // Operator gets 90% (10% goes to platform)
        const operatorRevenue = totalRevenue * 0.90;

        res.json({
            recentBookings: bookingsCount,
            totalRevenue: totalRevenue,
            operatorRevenue: operatorRevenue
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add Bus
router.post('/buses', async (req, res) => {
    try {
        const busData = { ...req.body, operator: req.user._id };
        if (!busData.busNumber) {
            // Generate a unique bus number to avoid E11000 duplicate key error in mongo
            busData.busNumber = 'BUS-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        }
        const bus = await Bus.create(busData);
        res.status(201).json({ message: 'Bus created', id: bus._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Operator's Buses
router.get('/buses', async (req, res) => {
    try {
        const buses = await Bus.find({ operator: req.user._id });
        res.json(buses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add Schedule (Updates existing bus since Bus model includes scheduling)
router.post('/schedules', async (req, res) => {
    const { busId, source, destination, departureTime, arrivalTime, price, totalSeats } = req.body;
    try {
        const bus = await Bus.findOneAndUpdate(
            { _id: busId, operator: req.user._id }, 
            { source, destination, departureTime, arrivalTime, price, totalSeats },
            { new: true }
        );
        
        if (!bus) {
            return res.status(404).json({ error: 'Bus not found or unauthorized' });
        }
        res.status(200).json({ message: 'Schedule updated', bus });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Boarding List (get passengers for a schedule)
router.get('/boardings/:busId', async (req, res) => {
    try {
        const { busId } = req.params;
        const boardings = await Booking.find({ bus: busId }).populate('user', 'username email');
        res.json(boardings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark Collected (pending amount collected at boarding)
router.post('/boardings/collect/:bookingId', async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findById(bookingId);
        if (booking) {
            booking.status = 'Collected';
            await booking.save();
            res.json({ message: 'Amount collected successfully' });
        } else {
            res.status(404).json({ error: 'Booking not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
