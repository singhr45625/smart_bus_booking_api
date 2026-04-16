const mongoose = require('mongoose');

const bookingSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    bus: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Bus' },
    seatNumbers: { type: [String], required: true },
    totalPrice: { type: Number, required: true },
    status: { type: String, required: true, default: 'Confirmed' },
    passengerDetails: {
        name: String,
        age: Number,
        gender: String,
        phone: String,
        email: String
    }
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
