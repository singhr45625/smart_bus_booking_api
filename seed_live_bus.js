const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Bus = require('./models/Bus');
const User = require('./models/User');

dotenv.config();

const CITY_COORDS = {
    'New Delhi': { lat: 28.6139, lng: 77.2090 },
    'Gurgaon': { lat: 28.4595, lng: 77.0266 },
    'Manesar': { lat: 28.3515, lng: 76.9428 },
    'Neemrana': { lat: 28.0055, lng: 76.3888 },
    'Jaipur': { lat: 26.9124, lng: 75.7873 }
};

const seedLiveBus = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-bus-booking');
        console.log('MongoDB Connected...');

        const operator = await User.findOne({ role: 'operator' }) || await User.findOne({ isOperator: true });
        
        if (!operator) {
            console.error('No operator found in DB. Please run seed_users.js first.');
            process.exit(1);
        }

        // Create a Live Bus for Delhi to Jaipur
        const liveBus = new Bus({
            operator: operator._id,
            name: 'Rajdhani Express (Live)',
            busNumber: 'DL-01-LIVE-2024',
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
            bearing: 215, // Roughly towards Jaipur
            intermediateStops: [
                { name: 'ISBT Delhi', lat: 28.667, lng: 77.228, arrivalTime: '10:00 AM', passed: true },
                { name: 'Gurgaon IFFCO Chowk', lat: 28.471, lng: 77.072, arrivalTime: '11:00 AM', passed: false },
                { name: 'Manesar', lat: 28.351, lng: 76.942, arrivalTime: '12:00 PM', passed: false },
                { name: 'Neemrana', lat: 28.005, lng: 76.388, arrivalTime: '01:30 PM', passed: false },
                { name: 'Jaipur Sindhi Camp', lat: 26.923, lng: 75.795, arrivalTime: '04:00 PM', passed: false }
            ]
        });

        await liveBus.save();
        console.log('Live Bus Seeded Successfully!');
        console.log('ID:', liveBus._id);
        
        process.exit(0);
    } catch (err) {
        console.error('Error seeding live bus:', err.message);
        process.exit(1);
    }
};

seedLiveBus();
