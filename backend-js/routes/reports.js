const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

router.get('/dashboard', reportsController.dashboard);
router.get('/alerts', reportsController.alerts);
router.get('/export', reportsController.export);

module.exports = router;
