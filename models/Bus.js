const mongoose = require('mongoose');

const busSchema = mongoose.Schema({
    operator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    busNumber: { type: String },
    type: { type: String, default: 'Non-AC' },
    date: { type: String },
    source: { type: String },
    destination: { type: String },
    departureTime: { type: String },
    arrivalTime: { type: String },
    price: { type: Number },
    totalSeats: { type: Number, required: true },
    amenities: { type: [String], default: [] },
    boardingPoints: [{ location: String, time: String }],
    droppingPoints: [{ location: String, time: String }],
    bookedSeats: { type: [String], default: [] },
    quickTicketSeats: { type: [String], default: [] },
    currentLocation: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 }
    },
    status: {
        type: String,
        enum: ['not_started', 'on_road', 'completed', 'delayed'],
        default: 'not_started'
    },
    bearing: { type: Number, default: 0 },
    operatorContact: { type: String },
    intermediateStops: [{
        name: String,
        lat: Number,
        lng: Number,
        arrivalTime: String,
        passed: { type: Boolean, default: false }
    }]
}, { timestamps: true });

const Bus = mongoose.model('Bus', busSchema);
module.exports = Bus;
