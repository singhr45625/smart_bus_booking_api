const Bus = require('../models/Bus');

// @desc    Get all buses or search by source/destination/date
// @route   GET /api/buses
const getBuses = async (req, res) => {
    try {
        const { source, destination, date } = req.query;
        let query = {};
        
        // Ensure regex is applied to strings, avoid regex if not supplied properly
        if (source && destination) {
            query = {
                source: { $regex: String(source), $options: 'i' },
                destination: { $regex: String(destination), $options: 'i' }
            };
        }
        if (date) {
            query.date = date;
        }
        
        const buses = await Bus.find(query);
        res.json(buses);
    } catch (error) {
        console.error('getBuses Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Add a new bus (Admin only)
// @route   POST /api/buses
const addBus = async (req, res) => {
    try {
        const { name, busNumber, type, date, source, destination, departureTime, arrivalTime, price, totalSeats, amenities, boardingPoints, droppingPoints } = req.body;
        const bus = new Bus({
            name, busNumber, type, date, source, destination, departureTime, arrivalTime, price, totalSeats,
            amenities, boardingPoints, droppingPoints
        });
        const createdBus = await bus.save();
        res.status(201).json(createdBus);
    } catch (error) {
        console.error('addBus Error:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getBuses, addBus };
