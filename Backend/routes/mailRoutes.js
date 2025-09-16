const express = require('express');
const router = express.Router();
const mailController = require('../controllers/mailController');
const { auth, manager } = require('../middleware/authMiddleware');

// Send a general email (manager only)
router.post('/send', auth, manager, mailController.sendEmail);

// Send a password reset email (public)
// Temporarily commenting out this route until the controller function is fixed
// router.post('/send-reset', mailController.sendPasswordReset);

module.exports = router;