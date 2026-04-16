const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Bus = require('./models/Bus');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB Connected for Seeding...');
        seedBuses();
    })
    .catch(err => {
        console.error('Connection error:', err.message);
        process.exit(1);
    });

const CITY_COORDS = {
    'Lucknow': { lat: 26.8467, lng: 80.9462 },
    'Kanpur': { lat: 26.4499, lng: 80.3319 },
    'Agra': { lat: 27.1767, lng: 78.0081 },
    'Varanasi': { lat: 25.3176, lng: 82.9739 },
    'Prayagraj': { lat: 25.4358, lng: 81.8463 },
    'Chandigarh': { lat: 30.7333, lng: 76.7794 },
    'Ludhiana': { lat: 30.9010, lng: 75.8573 },
    'Amritsar': { lat: 31.6340, lng: 74.8723 },
    'Jalandhar': { lat: 31.3260, lng: 75.5762 },
    'Patiala': { lat: 30.3398, lng: 76.3869 },
    'New Delhi': { lat: 28.6139, lng: 77.2090 },
    'Noida': { lat: 28.5355, lng: 77.3910 },
    'Gurgaon': { lat: 28.4595, lng: 77.0266 },
    'Mumbai': { lat: 19.0760, lng: 72.8777 },
    'Pune': { lat: 18.5204, lng: 73.8567 },
    'Nagpur': { lat: 21.1458, lng: 79.0882 },
    'Nashik': { lat: 19.9975, lng: 73.7898 },
    'Aurangabad': { lat: 19.8762, lng: 75.3433 }
};

const calculateDistance = (src, dest) => {
    const s = CITY_COORDS[src];
    const d = CITY_COORDS[dest];
    if (!s || !d) return 400;
    const R = 6371;
    const dLat = (d.lat - s.lat) * Math.PI / 180;
    const dLon = (d.lng - s.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(s.lat * Math.PI/180) * Math.cos(d.lat * Math.PI/180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
};

const operators = ['BlueBird Travels', 'GreenLine Express', 'RedBus Gold', 'ZingBus Premium', 'IntrCity SmartBus', 'Orange Travels'];
const busTypes = ['AC Seater', 'AC Sleeper', 'Non-AC Seater', 'Non-AC Sleeper', 'Volvo Multi-Axle'];
const amenitiesList = ['WiFi', 'Water Bottle', 'Charging Point', 'Blanket', 'Pillow', 'Reading Light', 'Emergency Contact'];

const cities = Object.keys(CITY_COORDS);

const seedBuses = async () => {
    try {
        // Find a default operator to assign these buses to
        const operatorUser = await User.findOne({ isOperator: true });
        if (!operatorUser) {
            console.error('No operator user found! Please run seed_users.js first.');
            process.exit(1);
        }

        console.log(`Assigning buses to operator: ${operatorUser.email}`);

        await Bus.deleteMany(); // Clear existing buses
        console.log('Existing buses cleared.');

        const buses = [];
        const today = new Date();

        // Seed major routes with return trips for the next 7 days
        const specificRoutes = [
            { s: 'Lucknow', d: 'Kanpur' },
            { s: 'Kanpur', d: 'Lucknow' },
            { s: 'New Delhi', d: 'Mumbai' },
            { s: 'Mumbai', d: 'New Delhi' },
            { s: 'Mumbai', d: 'Pune' },
            { s: 'Pune', d: 'Mumbai' },
            { s: 'Agra', d: 'New Delhi' },
            { s: 'New Delhi', d: 'Agra' },
            { s: 'Lucknow', d: 'New Delhi' },
            { s: 'New Delhi', d: 'Lucknow' },
            { s: 'Chandigarh', d: 'New Delhi' },
            { s: 'New Delhi', d: 'Chandigarh' }
        ];
        
        console.log('Seeding specific routes...');
        for (const route of specificRoutes) {
            for (let d = 0; d < 7; d++) {
                const date = new Date(today.getTime() + (d * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
                
                // Add 2-3 buses per route per day at different times
                const busPerDay = 2 + Math.floor(Math.random() * 2);
                for (let b = 0; b < busPerDay; b++) {
                    const deptHour = 6 + (b * 6) + Math.floor(Math.random() * 4); // Spread throughout the day
                    const departureTime = `${deptHour.toString().padStart(2, '0')}:00`;
                    const arrivalTime = `${((deptHour + 5) % 24).toString().padStart(2, '0')}:30`;

                    buses.push({
                        operator: operatorUser._id,
                        name: operators[Math.floor(Math.random() * operators.length)],
                        busNumber: `IN-${Math.floor(1000 + Math.random() * 9000)}-UP`,
                        type: busTypes[Math.floor(Math.random() * busTypes.length)],
                        source: route.s,
                        destination: route.d,
                        departureTime,
                        arrivalTime,
                        price: calculateDistance(route.s, route.d) * 5 + 100 + (Math.floor(Math.random() * 200)),
                        date,
                        totalSeats: 40,
                        bookedSeats: [],
                        amenities: amenitiesList.sort(() => 0.5 - Math.random()).slice(0, 4),
                        currentLocation: CITY_COORDS[route.s] || { lat: 0, lng: 0 },
                        status: Math.random() > 0.7 ? 'on_road' : 'not_started'
                    });
                }
            }
        }

        // Random buses for other cities for next 7 days
        console.log('Seeding random routes...');
        for (let i = 0; i < 100; i++) {
            const source = cities[Math.floor(Math.random() * cities.length)];
            let destination = cities[Math.floor(Math.random() * cities.length)];
            while (destination === source) {
                destination = cities[Math.floor(Math.random() * cities.length)];
            }

            const distance = calculateDistance(source, destination);
            const price = Math.max(distance * 5, 300);
            
            const deptHour = Math.floor(Math.random() * 24);
            const departureTime = `${deptHour.toString().padStart(2, '0')}:00`;
            const duration = 4 + Math.floor(Math.random() * 6);
            const arrivalTime = `${((deptHour + duration) % 24).toString().padStart(2, '0')}:00`;

            buses.push({
                operator: operatorUser._id,
                name: operators[Math.floor(Math.random() * operators.length)],
                busNumber: `IN-${Math.floor(1000 + Math.random() * 9000)}-${['MH', 'DL', 'PB', 'UP', 'KA'][Math.floor(Math.random() * 5)]}`,
                type: busTypes[Math.floor(Math.random() * busTypes.length)],
                source,
                destination,
                departureTime,
                arrivalTime,
                price,
                date: new Date(today.getTime() + (Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                totalSeats: 40,
                bookedSeats: [],
                amenities: amenitiesList.sort(() => 0.5 - Math.random()).slice(0, 3)
            });
        }

        console.log(`Inserting ${buses.length} buses...`);
        try {
            const result = await Bus.insertMany(buses, { ordered: false });
            console.log(`${result.length} Buses Seeded Successfully!`);
        } catch (err) {
            const insertedCount = err.insertedDocs ? err.insertedDocs.length : 0;
            const errorCount = err.writeErrors ? err.writeErrors.length : (buses.length - insertedCount);
            console.log(`${insertedCount} buses inserted, ${errorCount} errors occurred.`);
            if (err.message && !err.writeErrors) console.error('Error:', err.message);
        }
        process.exit(0);
    } catch (error) {
        console.error('General Error:', error.message);
        process.exit(1);
    }
};
