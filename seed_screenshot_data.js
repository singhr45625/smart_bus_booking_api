const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Bus = require('./models/Bus');
const Booking = require('./models/Booking');

dotenv.config();

const seedScreenshotData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected...');

        // 1. Get/Setup Users
        let customer = await User.findOne({ email: 'customer@example.com' });
        if (!customer) {
            customer = await User.create({
                username: 'John Doe',
                email: 'customer@example.com',
                password: 'password123',
                role: 'user',
                walletBalance: 10000
            });
        } else {
            customer.walletBalance = 10000;
            await customer.save();
        }

        let operator = await User.findOne({ email: 'operator@example.com' });
        if (!operator) {
            operator = await User.create({
                username: 'Best Travel Ops',
                email: 'operator@example.com',
                password: 'password123',
                role: 'operator'
            });
        }

        // 2. Clear previous screenshot data
        await Bus.deleteMany({ name: /Screenshot/ });
        await Booking.deleteMany({ user: customer._id });

        const today = new Date().toISOString().split('T')[0];

        // --- Data for Figure A.1: Dynamic Pricing ---
        const dynamicBus = await Bus.create({
            operator: operator._id,
            name: 'Screenshot Dynamic Bus',
            busNumber: 'SC-DYNAMIC-01',
            type: 'AC Sleeper',
            source: 'Lucknow',
            destination: 'New Delhi',
            departureTime: '10:00 PM',
            arrivalTime: '06:00 AM',
            price: 1000,
            basePrice: 1000,
            demandFactor: 1.15, // 15% increase
            date: today,
            totalSeats: 40,
            bookedSeats: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'] // High demand
        });

        // --- Data for Figure A.2 & A.3: Partial Payment & Deadline ---
        const partialBus = await Bus.create({
            operator: operator._id,
            name: 'Screenshot Partial Bus',
            busNumber: 'SC-PARTIAL-02',
            type: 'Non-AC Seater',
            source: 'Kanpur',
            destination: 'Lucknow',
            departureTime: '02:00 PM',
            arrivalTime: '04:00 PM',
            price: 500,
            basePrice: 500,
            date: today,
            totalSeats: 30
        });

        const partialBooking = await Booking.create({
            user: customer._id,
            bus: partialBus._id,
            seatNumbers: ['S1', 'S2'],
            totalPrice: 1000,
            isPartialPayment: true,
            partialPaymentPercentage: 40,
            paidAmount: 400,
            remainingBalance: 600,
            status: 'Partially Paid',
            passengerDetails: {
                name: 'John Doe',
                age: 28,
                gender: 'Male',
                phone: '9876543210',
                email: 'customer@example.com'
            }
        });

        // --- Data for Figure A.4: Seat Release ---
        const releasedBus = await Bus.create({
            operator: operator._id,
            name: 'Screenshot Release Bus',
            busNumber: 'SC-RELEASE-03',
            type: 'AC Seater',
            source: 'Agra',
            destination: 'New Delhi',
            departureTime: '08:00 AM',
            arrivalTime: '12:00 PM',
            price: 600,
            basePrice: 600,
            date: today,
            totalSeats: 30,
            quickTicketSeats: ['Q5', 'Q6'] // These were released
        });

        const cancelledBooking = await Booking.create({
            user: customer._id,
            bus: releasedBus._id,
            seatNumbers: ['Q5', 'Q6'],
            totalPrice: 1200,
            status: 'Cancelled',
            passengerDetails: {
                name: 'Jane Doe',
                age: 25,
                gender: 'Female',
                phone: '9123456789',
                email: 'jane@example.com'
            }
        });

        console.log('Screenshot Data Seeded Successfully!');
        console.log('Customer Email: customer@example.com / password123');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
};

seedScreenshotData();
