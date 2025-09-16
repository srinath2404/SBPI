const { sendMail } = require('../utils/mailer');
const crypto = require('crypto');

// Send a general email
exports.sendEmail = async (req, res) => {
    try {
        const { to, subject, html } = req.body;
        
        if (!to || !subject || !html) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        console.log('[INFO] Sending email to:', to);
        
        const result = await sendMail({ to, subject, html });
        
        if (result.previewUrl) {
            console.log('[DEV] Preview email at:', result.previewUrl);
        }
        
        res.json({ 
            message: 'Email sent successfully', 
            messageId: result.messageId,
            previewUrl: result.previewUrl
        });
    } catch (error) {
        console.error('[ERROR] Failed to send email:', error);
        res.status(500).json({ message: 'Failed to send email', error: error.message });
    }
};

// Send a password reset email
exports.sendPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        // Generate a token
        const token = crypto.randomBytes(32).toString('hex');
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}&id=test-id`;
        
        console.log('[INFO] Sending password reset email to:', email);
        console.log('[INFO] Reset URL:', resetUrl);
        
        const result = await sendMail({
            to: email,
            subject: 'Password Reset Instructions',
            html: `<p>You requested a password reset.</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 30 minutes.</p>`
        });
        
        if (result.previewUrl) {
            console.log('[DEV] Preview reset email at:', result.previewUrl);
        }
        
        res.json({ 
            message: 'Password reset email sent successfully',
            resetUrl // Include for testing purposes
        });
    } catch (error) {
        console.error('[ERROR] Failed to send password reset email:', error);
        res.status(500).json({ message: 'Failed to send password reset email', error: error.message });
    }
};