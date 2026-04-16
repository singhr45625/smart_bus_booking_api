const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected for User Seeding...'))
    .catch(err => console.log(err));

const users = [
    {
        username: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        isAdmin: true,
        isOperator: false
    },
    {
        username: 'Operator User',
        email: 'operator@example.com',
        password: 'password123',
        isAdmin: false,
        isOperator: true,
        companyName: 'BlueBird Travels'
    },
    {
        username: 'Customer User',
        email: 'customer@example.com',
        password: 'password123',
        isAdmin: false,
        isOperator: false
    }
];

const seedUsers = async () => {
    try {
        await User.deleteMany();
        console.log('Existing users cleared.');

        for (const u of users) {
            await User.create(u);
        }

        console.log('Test Users Seeded Successfully!');
        console.log('Admin: admin@example.com / password123');
        console.log('Operator: operator@example.com / password123');
        console.log('Customer: customer@example.com / password123');
        process.exit();
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();
