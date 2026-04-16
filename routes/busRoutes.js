const express = require('express');
const router = express.Router();
const { getBuses, getBusById, addBus } = require('../controllers/busController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', getBuses);
router.get('/:id', getBusById);
router.post('/', protect, admin, addBus);

module.exports = router;

