const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '30d' });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
const registerUser = async (req, res) => {
    try {
        const { username, email, password, role, companyName } = req.body;
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const isAdmin = role === 'admin';
        const isOperator = role === 'operator';

        const user = await User.create({ 
            username, 
            email, 
            password,
            isAdmin,
            isOperator,
            companyName
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: isAdmin ? 'admin' : (isOperator ? 'operator' : 'user'),
                walletBalance: user.walletBalance,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ error: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
const authUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            const role = user.isAdmin ? 'admin' : (user.isOperator ? 'operator' : 'user');
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: role,
                walletBalance: user.walletBalance,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Add money to wallet
// @route   POST /api/auth/wallet/add
const addWalletMoney = async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User.findById(req.user._id);
        if (user) {
            user.walletBalance = (user.walletBalance || 0) + Number(amount);
            const updatedUser = await user.save();
            res.json({
                walletBalance: updatedUser.walletBalance,
                message: `Successfully added ₹${amount} to your wallet.`
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.isAdmin ? 'admin' : (user.isOperator ? 'operator' : 'user'),
                walletBalance: user.walletBalance
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.username = req.body.username || user.username;
            user.email = req.body.email || user.email;
            
            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                role: updatedUser.isAdmin ? 'admin' : (updatedUser.isOperator ? 'operator' : 'user'),
                walletBalance: updatedUser.walletBalance,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { registerUser, authUser, addWalletMoney, getUserProfile, updateUserProfile };
