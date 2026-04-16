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

        activeBuses.forEach(async (bus) => {
            // Simulation: Move slightly
            const latChange = (Math.random() - 0.5) * 0.001;
            const lngChange = (Math.random() - 0.5) * 0.001;

            bus.currentLocation.lat += latChange;
            bus.currentLocation.lng += lngChange;
            bus.bearing = Math.floor(Math.random() * 360);

            // Check proximity to intermediate stops
            let stopsChanged = false;
            if (bus.intermediateStops && bus.intermediateStops.length > 0) {
                bus.intermediateStops.forEach(stop => {
                    if (!stop.passed) {
                        const dist = getHaversineDistance(
                            bus.currentLocation.lat,
                            bus.currentLocation.lng,
                            stop.lat,
                            stop.lng
                        );
                        if (dist < 5) { // Within 5km
                            stop.passed = true;
                            stopsChanged = true;
                        }
                    }
                });
            }

            await bus.save();

            // Emit update to all clients tracking this bus
            io.emit(`busUpdate_${bus._id}`, {
                lat: bus.currentLocation.lat,
                lng: bus.currentLocation.lng,
                bearing: bus.bearing,
                status: bus.status,
                intermediateStops: bus.intermediateStops
            });
        });

        // Also emit a fleet update for admins
        const fleetData = activeBuses.map(b => ({
            id: b._id,
            name: b.name,
            lat: b.currentLocation.lat,
            lng: b.currentLocation.lng,
            bearing: b.bearing,
            busNumber: b.busNumber,
            intermediateStops: b.intermediateStops
        }));
        io.emit('fleetUpdate', fleetData);
    } catch (err) {
        console.error('Simulation Error:', err.message);
    }
}, 3000); // Update every 3 seconds

io.on('connection', (socket) => {
    console.log('Client connected for tracking:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
