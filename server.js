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

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
