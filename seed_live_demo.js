const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Bus = require('./models/Bus');
const Booking = require('./models/Booking');

dotenv.config();

const CITY_COORDS = {
    'New Delhi': { lat: 28.6139, lng: 77.2090 },
    'Gurgaon': { lat: 28.4595, lng: 77.0266 },
    'Manesar': { lat: 28.3515, lng: 76.9428 },
    'Neemrana': { lat: 28.0055, lng: 76.3888 },
    'Jaipur': { lat: 26.9124, lng: 75.7873 }
};

const seedLiveDemo = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected...');

        // 1. Get existing users (DO NOT DELETE THEM)
        const customer = await User.findOne({ email: 'customer@example.com' });
        const operator = await User.findOne({ email: 'operator@example.com' });

        if (!customer || !operator) {
            console.error('Standard test users not found. Please run seed_users.js first.');
            process.exit(1);
        }

        // 2. Create Live Bus (Clean up previous demo bus only)
        await Bus.deleteMany({ busNumber: 'DL-01-LIVE-DEMO' });
        const liveBus = await Bus.create({
            operator: operator._id,
            name: 'Rajdhani Express (Live)',
            busNumber: 'DL-01-LIVE-DEMO',
            type: 'AC Sleeper',
            source: 'New Delhi',
            destination: 'Jaipur',
            departureTime: '10:00 AM',
            arrivalTime: '04:00 PM',
            price: 850,
            date: new Date().toISOString().split('T')[0],
            totalSeats: 40,
            status: 'on_road',
            currentLocation: CITY_COORDS['New Delhi'],
            bearing: 215,
            intermediateStops: [
                { name: 'ISBT Delhi', lat: 28.667, lng: 77.228, arrivalTime: '10:00 AM', passed: true },
                { name: 'Gurgaon IFFCO Chowk', lat: 28.471, lng: 77.072, arrivalTime: '11:00 AM', passed: false },
                { name: 'Manesar', lat: 28.351, lng: 76.942, arrivalTime: '12:00 PM', passed: false },
                { name: 'Neemrana', lat: 28.005, lng: 76.388, arrivalTime: '01:30 PM', passed: false },
                { name: 'Jaipur Sindhi Camp', lat: 26.923, lng: 75.795, arrivalTime: '04:00 PM', passed: false }
            ]
        });
        console.log('Live Demo Bus Created.');

        // 3. Create Booking (Clean up previous demo bookings for this user only)
        await Booking.deleteMany({ bus: liveBus._id });
        const booking = await Booking.create({
            user: customer._id,
            bus: liveBus._id,
            seatNumbers: ['A1', 'A2'],
            totalPrice: 1700,
            status: 'Confirmed'
        });
        console.log('Test Booking Created.');

        console.log('\n--- LIVE TRACKING READY ---');
        console.log('Booking ID:', booking._id);
        console.log('Tracking Link: http://localhost:5173/track/' + booking._id);
        console.log('---------------------------\n');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
};

seedLiveDemo();
