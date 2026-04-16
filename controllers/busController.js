const Bus = require('../models/Bus');

// Mock coordinates for major cities
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
    if (!s || !d) return 400; // Default distance if not found

    const R = 6371; // km
    const dLat = (d.lat - s.lat) * Math.PI / 180;
    const dLon = (d.lng - s.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(s.lat * Math.PI / 180) * Math.cos(d.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
};

// @desc    Get all buses or search by source/destination/date/type/price
const getBuses = async (req, res) => {
    try {
        const { source, destination, date, type, minPrice, maxPrice } = req.query;
        let query = {};

        if (source) query.source = { $regex: String(source), $options: 'i' };
        if (destination) query.destination = { $regex: String(destination), $options: 'i' };

        // Exact date or any date if not specified
        if (date && date !== 'Any Date') query.date = date;

        // Handle multiple types (comma separated or single)
        if (type) {
            const types = type.split(',');
            query.type = { $in: types };
        }

        // Handle departure time slots
        const { departureTime } = req.query;
        if (departureTime) {
            const slots = departureTime.split(',');
            const timeQueries = [];
            slots.forEach(slot => {
                if (slot === 'Morning') timeQueries.push({ departureTime: { $gte: '00:00', $lt: '06:00' } });
                if (slot === 'Afternoon') timeQueries.push({ departureTime: { $gte: '06:00', $lt: '12:00' } });
                if (slot === 'Evening') timeQueries.push({ departureTime: { $gte: '12:00', $lt: '18:00' } });
                if (slot === 'Night') timeQueries.push({ departureTime: { $gte: '18:00', $lt: '24:00' } });
            });
            if (timeQueries.length > 0) query.$or = timeQueries;
        }

        // Handle price range
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        const buses = await Bus.find(query).sort({ departureTime: 1 });
        res.json(buses);
    } catch (error) {
        console.error('getBuses Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Get single bus by ID
// @route   GET /api/buses/:id
const getBusById = async (req, res) => {
    try {
        const bus = await Bus.findById(req.params.id);
        if (bus) {
            res.json(bus);
        } else {
            res.status(404).json({ message: 'Bus not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Add a new bus (Admin only)
// @route   POST /api/buses
const addBus = async (req, res) => {
    try {
        const { name, busNumber, type, date, source, destination, departureTime, arrivalTime, price, totalSeats, amenities, boardingPoints, droppingPoints } = req.body;

        // Calculate dynamic price if not provided
        const finalPrice = price || (calculateDistance(source, destination) * 5);

        const bus = new Bus({
            name, busNumber, type, date, source, destination, departureTime, arrivalTime,
            price: finalPrice,
            totalSeats,
            amenities, boardingPoints, droppingPoints
        });
        const createdBus = await bus.save();
        res.status(201).json(createdBus);
    } catch (error) {
        console.error('addBus Error:', error);
        res.status(500).json({ error: error.message });
    }
};


module.exports = { getBuses, getBusById, addBus };

