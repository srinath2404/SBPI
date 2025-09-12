const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendMail } = require("../utils/mailer");

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Special handling for manager email
        if (email === 'gaddamkashinath1947@gmail.com') {
            if (user.role !== 'manager') {
                user.role = 'manager';
                await user.save();
            }
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Manager forgot password: send reset email
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        // For workers, we only allow request via worker flow
        if (user.role === 'worker') {
            return res.status(400).json({ message: "Workers must request reset via manager" });
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
        user.resetPasswordExpires = Date.now() + 1000 * 60 * 30; // 30 minutes
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}&id=${user._id}`;
        // If SMTP not configured, simulate and return link info like before
        const hasSmtpService = !!process.env.SMTP_SERVICE;
        const hasSmtpHostCreds = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
        if (!hasSmtpService && !hasSmtpHostCreds) {
            console.log('[DEV] SMTP not configured. Reset URL:', resetUrl);
            return res.json({ message: 'Password reset email simulated (SMTP not configured in backend). Check server logs for the link.' });
        }

        const result = await sendMail({
            to: user.email,
            subject: 'Password Reset Instructions',
            html: `<p>You requested a password reset.</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 30 minutes.</p>`
        });

        if (result.previewUrl) {
            console.log('[DEV] Preview reset email at:', result.previewUrl);
        }

        res.json({ message: 'Password reset email sent' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Reset password using token (manager or worker after approval)
exports.resetPassword = async (req, res) => {
    try {
        const { id, token, password } = req.body;
        if (!id || !token || !password) return res.status(400).json({ message: 'Invalid request' });

        const hashed = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({ _id: id, resetPasswordToken: hashed, resetPasswordExpires: { $gt: Date.now() } });
        if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.passwordResetRequested = false;
        await user.save();
        
        // Send notification about successful password reset
        try {
            const { createNotification } = require('./notificationController');
            await createNotification(
                user._id,
                'Password Reset Successful',
                'Your password has been reset successfully.',
                'success'
            );
        } catch (notifyError) {
            console.error('Failed to send notification:', notifyError);
            // Continue even if notification fails
        }

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};