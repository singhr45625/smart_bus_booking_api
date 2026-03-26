const Booking = require('../models/Booking');
const Bus = require('../models/Bus');

// @desc    Create new booking
// @route   POST /api/bookings
const createBooking = async (req, res) => {
    try {
        const { busId, seatNumbers } = req.body;
        
        if (!seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
            return res.status(400).json({ error: 'Please provide valid seat numbers' });
        }

        const bus = await Bus.findById(busId);
        if (!bus) {
            return res.status(404).json({ error: 'Bus not found' });
        }

        // Check if any requested seats are already booked
        const alreadyBooked = seatNumbers.some(seat => bus.bookedSeats.includes(seat));
        if (alreadyBooked) {
            return res.status(400).json({ error: 'One or more selected seats are already booked' });
        }

        if (bus.bookedSeats.length + seatNumbers.length > bus.totalSeats) {
            return res.status(400).json({ error: 'Exceeds total bus capacity' });
        }
        
        // Default to a 0 price if the schedule/price hasn't been set by operator yet
        const applicablePrice = bus.price || 0;

        const booking = new Booking({
            user: req.user._id,
            bus: busId,
            seatNumbers,
            totalPrice: applicablePrice * seatNumbers.length
        });

        bus.bookedSeats.push(...seatNumbers);
        await bus.save();
        
        const createdBooking = await booking.save();
        res.status(201).json(createdBooking);
    } catch (error) {
        console.error('createBooking Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

// @desc    Get logged in user bookings
// @route   GET /api/bookings/my-bookings
const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user._id }).populate('bus');
        res.json(bookings);
    } catch (error) {
        console.error('getMyBookings Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

module.exports = { createBooking, getMyBookings };
