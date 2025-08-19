const express = require('express');
const router = express.Router();
const User = require('../models/User');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

// Login route
router.post('/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      // Validate email
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
  
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Generate new temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + 
                          Math.random().toString(36).slice(-8);
      
      // Hash the temporary password
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      user.password = hashedPassword;
      await user.save();
  
      // Configure email transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'srinathgaddam41@gmail.com',
          pass: 'qhow slmg kzrn kibz'
        }
      });
  
      // Prepare email content
      const mailOptions = {
        from: 'srinathgaddam41@gmail.com',
        to: email,
        subject: 'Your New Password - SBPI Management',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #2c3e50;">Password Reset Notification</h2>
            <p>Hello,</p>
            <p>As requested, here is your new temporary password:</p>
            <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <strong style="font-size: 18px;">${tempPassword}</strong>
            </div>
            <p style="color: #e74c3c;"><strong>Important:</strong> Please change this password immediately after logging in.</p>
            <p>If you did not request this password reset, please contact us immediately.</p>
            <br>
            <p>Best regards,</p>
            <p><strong>SBPI Management Team</strong></p>
          </div>
        `
      };
  
      // Send email
      await transporter.sendMail(mailOptions);
      
      res.json({ 
        success: true,
        message: 'New password has been sent to your email'
      });
  
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to process password reset. Please try again.'
      });
    }
  });

module.exports = router;