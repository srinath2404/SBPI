require('dotenv').config();
const { sendMail } = require('./utils/mailer');
const crypto = require('crypto');

async function sendResetEmail() {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}&id=test-id`;
    
    console.log('Sending password reset email to: 22951a12a0@iare.ac.in');
    console.log('Reset URL:', resetUrl);
    
    const result = await sendMail({
      to: '22951a12a0@iare.ac.in',
      subject: 'Password Reset Instructions',
      html: `<p>You requested a password reset.</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 30 minutes.</p>`
    });
    
    console.log('Password reset email sent successfully!');
    if (result.previewUrl) {
      console.log('Preview URL:', result.previewUrl);
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

sendResetEmail();