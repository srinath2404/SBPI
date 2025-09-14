require('dotenv').config();
const { sendMail } = require('./utils/mailer');

async function testResetEmail() {
    try {
        console.log('Testing email reset functionality...');
        console.log('SMTP Configuration:');
        console.log('- Host:', process.env.SMTP_HOST);
        console.log('- Port:', process.env.SMTP_PORT);
        console.log('- Secure:', process.env.SMTP_SECURE);
        console.log('- User:', process.env.SMTP_USER);
        console.log('- From:', process.env.SMTP_FROM);
        
        const testEmail = process.env.SMTP_USER; // Using the same email for testing
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=test-token&id=test-id`;
        
        const result = await sendMail({
            to: testEmail,
            subject: 'Test Password Reset Email',
            html: `<p>This is a test password reset email.</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 30 minutes.</p>`
        });
        
        console.log('Email sent successfully!');
        console.log('Message ID:', result.messageId);
        
        if (result.previewUrl) {
            console.log('Preview URL:', result.previewUrl);
        }
        
        console.log('Test completed successfully!');
    } catch (error) {
        console.error('Error sending test email:', error);
    }
}

testResetEmail();