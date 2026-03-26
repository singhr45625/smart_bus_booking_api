const express = require('express');
const router = express.Router();
const { getBuses, addBus } = require('../controllers/busController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', getBuses);
router.post('/', protect, admin, addBus);

module.exports = router;
