const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Bus = require('./models/Bus');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected!');
        try {
            const bus = new Bus({
                name: 'Test Bus',
                totalSeats: 40,
                source: 'Lucknow',
                destination: 'Delhi',
                date: '2024-04-10'
            });
            await bus.save();
            console.log('Test bus saved!');
            process.exit(0);
        } catch (err) {
            console.error('Error saving bus:', err.message);
            process.exit(1);
        }
    })
    .catch(err => {
        console.error('Connection error:', err.message);
        process.exit(1);
    });
