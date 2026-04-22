const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Load environment variables
dotenv.config();

// Connect to MongoDB
try {
    connectDB();
} catch (error) {
    console.error('MongoDB connection error:', error.message);
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware for admin routes
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'secret_key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 1000 * 60 * 60 * 24 // 1 day
        }
    })
);

// Serve static files from public directory if needed
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Import Routes
const authRoutes = require('./routes/authRoutes');
const busRoutes = require('./routes/busRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const operatorRoutes = require('./routes/operatorRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/operator', operatorRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
    res.send('Smart Bus Booking API is running...');
});

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const Bus = require('./models/Bus');
const Booking = require('./models/Booking');

// Distance helper (Haversine)
const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// movement simulation logic
setInterval(async () => {
    try {
        const activeBuses = await Bus.find({ status: 'on_road' });

        for (const bus of activeBuses) {
            if (!bus.intermediateStops || bus.intermediateStops.length === 0) continue;

            const nextStop = bus.intermediateStops.find(s => !s.passed);
            
            if (nextStop) {
                const dLat = nextStop.lat - bus.currentLocation.lat;
                const dLng = nextStop.lng - bus.currentLocation.lng;
                const distance = Math.sqrt(dLat * dLat + dLng * dLng);

                if (distance < 0.001) { 
                    nextStop.passed = true;
                } else {
                    const speed = 0.0005;
                    bus.currentLocation.lat += (dLat / distance) * speed;
                    bus.currentLocation.lng += (dLng / distance) * speed;
                    bus.bearing = Math.atan2(dLng, dLat) * (180 / Math.PI);
                }
            } else {
                bus.status = 'completed';
            }

            await bus.save();

            io.emit(`busUpdate_${bus._id}`, {
                id: bus._id,
                lat: bus.currentLocation.lat,
                lng: bus.currentLocation.lng,
                bearing: bus.bearing,
                status: bus.status,
                intermediateStops: bus.intermediateStops
            });
        }

        const fleetData = activeBuses.map(b => ({
            id: b._id,
            name: b.name,
            lat: b.currentLocation.lat,
            lng: b.currentLocation.lng,
            bearing: b.bearing,
            busNumber: b.busNumber,
            status: b.status,
            intermediateStops: b.intermediateStops
        }));
        io.emit('fleetUpdate', fleetData);
    } catch (err) {
        console.error('Simulation Error:', err.message);
    }
}, 3000); // Update every 3 seconds

// Auto-cancellation job for unpaid partial bookings
setInterval(async () => {
    try {
        console.log('Running auto-cancellation job for unpaid bookings...');
        const today = new Date().toISOString().split('T')[0];
        const unpaidBookings = await Booking.find({
            status: 'Partially Paid'
        }).populate('bus');

        for (const booking of unpaidBookings) {
            if (booking.bus && booking.bus.date <= today) {
                // Cancel booking
                booking.status = 'Cancelled - Unpaid';
                await booking.save();

                // Release seats and mark as Quick Ticket
                const bus = await Bus.findById(booking.bus._id);
                if (bus) {
                    bus.bookedSeats = bus.bookedSeats.filter(s => !booking.seatNumbers.includes(s));
                    // Ensure we don't duplicate seats in quickTicketSeats
                    const newQuickSeats = booking.seatNumbers.filter(s => !bus.quickTicketSeats.includes(s));
                    bus.quickTicketSeats.push(...newQuickSeats);
                    await bus.save();
                    console.log(`Cancelled unpaid booking ${booking._id} and released seats as Quick Tickets.`);
                }
            }
        }
    } catch (err) {
        console.error('Auto-cancel Job Error:', err.message);
    }
}, 3600000); // Check every hour (3600000ms)

io.on('connection', (socket) => {
    console.log('Client connected for tracking:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
