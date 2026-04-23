const Booking = require('../models/Booking');
const Bus = require('../models/Bus');
const User = require('../models/User');

// @desc    Create new booking
// @route   POST /api/bookings
const createBooking = async (req, res) => {
    try {
        const { busId, seatNumbers, passengerDetails, isPartialPayment } = req.body;

        if (!seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
            return res.status(400).json({ error: 'Please provide valid seat numbers' });
        }

        // Restrict role-based booking: Only customers can book
        if (req.user?.isOperator || req.user?.isAdmin) {
            return res.status(403).json({ error: 'Operators and Admins are not allowed to book tickets. Use a customer account.' });
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
        const basePrice = bus.price || 0;

        let totalFare = 0;
        seatNumbers.forEach(seat => {
            const isQuickTicket = bus.quickTicketSeats.includes(seat);
            const seatPrice = isQuickTicket ? basePrice * 1.3 : basePrice;
            totalFare += seatPrice;
        });

        let paidAmount = totalFare;
        let remainingBalance = 0;
        let status = 'Confirmed';

        if (isPartialPayment) {
            paidAmount = totalFare * 0.2; // 20% upfront
            remainingBalance = totalFare - paidAmount;
            status = 'Partially Paid';
        }

        // Check wallet balance
        const user = await User.findById(req.user._id);
        if (user.walletBalance < paidAmount) {
            return res.status(400).json({ error: 'Insufficient wallet balance. Please recharge your wallet.' });
        }

        // Deduct from wallet
        user.walletBalance -= paidAmount;
        await user.save();

        const booking = new Booking({
            user: req.user._id,
            bus: busId,
            seatNumbers,
            totalPrice: totalFare,
            isPartialPayment: !!isPartialPayment,
            paidAmount,
            remainingBalance,
            passengerDetails,
            status: status
        });

        bus.bookedSeats.push(...seatNumbers);
        // If it was a quick ticket, remove it from quickTicketSeats
        bus.quickTicketSeats = bus.quickTicketSeats.filter(s => !seatNumbers.includes(s));

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

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
const getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('bus').populate('user', 'username email');
        if (booking) {
            res.json(booking);
        } else {
            res.status(404).json({ message: 'Booking not found' });
        }
    } catch (error) {
        console.error('getBookingById Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

// @desc    Pay remaining balance for partial booking
// @route   POST /api/bookings/:id/pay-balance
const payRemainingBalance = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ error: 'Not authorized contribution' });
        }

        if (booking.status !== 'Partially Paid') {
            return res.status(400).json({ error: 'Booking is already fully paid or cancelled' });
        }

        // Check wallet balance
        const user = await User.findById(req.user._id);
        if (user.walletBalance < booking.remainingBalance) {
            return res.status(400).json({ error: 'Insufficient wallet balance to pay the remaining amount.' });
        }

        // Deduct from wallet
        user.walletBalance -= booking.remainingBalance;
        await user.save();

        // Mock payment processing
        booking.paidAmount += booking.remainingBalance;
        booking.remainingBalance = 0;
        booking.status = 'Confirmed';

        await booking.save();
        res.json(booking);
    } catch (error) {
        console.error('payRemainingBalance Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

// @desc    Release unpaid partial bookings on travel date
// @route   POST /api/admin/release-seats (or triggered automatically)
const releaseUnpaidBookings = async (req, res) => {
    try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // Find all partially paid bookings
        const bookings = await Booking.find({ status: 'Partially Paid' }).populate('bus');

        let releaseCount = 0;

        for (const booking of bookings) {
            // If bus date matches today (or is in the past and still partially paid)
            if (booking.bus && booking.bus.date === today) {
                booking.status = 'Cancelled';
                await booking.save();

                // Release seats and mark as Quick Ticket
                const bus = await Bus.findById(booking.bus._id);
                if (bus) {
                    bus.bookedSeats = bus.bookedSeats.filter(s => !booking.seatNumbers.includes(s));
                    bus.quickTicketSeats.push(...booking.seatNumbers);
                    await bus.save();
                }
                releaseCount++;
            }
        }

        if (res) {
            res.json({ message: `Successfully released ${releaseCount} unpaid seats.` });
        } else {
            return releaseCount;
        }
    } catch (error) {
        console.error('releaseUnpaidBookings Error:', error);
        if (res) res.status(500).json({ error: error.message });
    }
};

// @desc    Cancel booking and refund amount
// @route   POST /api/bookings/:id/cancel
const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        if (booking.status === 'Cancelled') {
            return res.status(400).json({ error: 'Booking is already cancelled' });
        }

        if (booking.status === 'Boarded') {
            return res.status(400).json({ error: 'Cannot cancel a ticket after boarding.' });
        }

        // Refund Logic: 80% of the paid amount is refunded
        const refundAmount = booking.paidAmount * 0.8;
        const cancellationFee = booking.paidAmount * 0.2;

        const user = await User.findById(req.user._id);
        user.walletBalance += refundAmount;
        await user.save();

        booking.status = 'Cancelled';
        await booking.save();

        // Release seats
        const bus = await Bus.findById(booking.bus);
        if (bus) {
            bus.bookedSeats = bus.bookedSeats.filter(s => !booking.seatNumbers.includes(s));
            await bus.save();
        }

        res.json({
            message: 'Booking cancelled successfully',
            refundAmount,
            cancellationFee,
            newBalance: user.walletBalance
        });
    } catch (error) {
        console.error('cancelBooking Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

module.exports = { createBooking, getMyBookings, getBookingById, payRemainingBalance, releaseUnpaidBookings, cancelBooking };
