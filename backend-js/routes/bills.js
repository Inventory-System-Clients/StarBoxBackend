const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');

router.get('/', billController.getAll);
router.post('/', billController.create);
router.put('/:id', billController.update);
router.patch('/:id/status', billController.updateStatus);
router.delete('/:id', billController.delete);

module.exports = router;
