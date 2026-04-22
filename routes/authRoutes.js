const express = require('express');
const router = express.Router();
const { registerUser, authUser, addWalletMoney, getUserProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', registerUser);
router.post('/login', authUser);
router.post('/wallet/add', protect, addWalletMoney);
router.get('/profile', protect, getUserProfile);

module.exports = router;
