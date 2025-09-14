const nodemailer = require('nodemailer');

let transporterPromise;

async function getTransporter() {
    if (transporterPromise) return transporterPromise;

    const service = process.env.SMTP_SERVICE;
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (service || (host && user && pass)) {
        const port = Number(process.env.SMTP_PORT || 587);
        const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
        try {
            transporterPromise = Promise.resolve(nodemailer.createTransport(
                service ? { service, auth: { user, pass } } : {
                    host,
                    port,
                    secure,
                    auth: { user, pass }
                }
            ));
            return transporterPromise;
        } catch (error) {
            console.error('Error creating transporter:', error);
            throw error;
        }
    }

    // Fallback to Ethereal test account (emails go to preview URL)
    transporterPromise = nodemailer.createTestAccount().then((testAccount) => {
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
    });
    return transporterPromise;
}

const sendMail = async ({ to, subject, html }) => {
    try {
        const transporter = await getTransporter();
        
        // Log SMTP configuration for debugging
        console.log('SMTP Configuration:', {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE,
            user: process.env.SMTP_USER ? '***' : undefined, // Hide actual credentials
            from: process.env.SMTP_FROM
        });
        
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com',
            to,
            subject,
            html
        });
        
        console.log('Email sent successfully:', info.messageId);
        const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : undefined;
        if (previewUrl) {
            console.log('Preview URL:', previewUrl);
        }
        
        return { messageId: info.messageId, previewUrl };
    } catch (error) {
        console.error('Failed to send email:', error);
        throw error;
    }
};

module.exports = { sendMail };

