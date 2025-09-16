const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:5000/api';
const TOKEN = process.env.TEST_TOKEN || 'your_manager_token_here'; // Replace with a valid manager token

// Test sending a general email
async function testSendEmail() {
  try {
    const response = await axios.post(
      `${API_URL}/mail/send`,
      {
        to: 'test@example.com',
        subject: 'Test Email from Mail App',
        message: 'This is a test email sent from the Mail App.',
        template: 'general'
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`
        }
      }
    );
    
    console.log('Send Email Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending email:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Test sending a password reset email
async function testSendPasswordReset() {
  try {
    const response = await axios.post(
      `${API_URL}/mail/password-reset`,
      {
        email: 'test@example.com'
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`
        }
      }
    );
    
    console.log('Password Reset Email Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending password reset:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Run tests
async function runTests() {
  console.log('Testing Mail Routes...');
  
  console.log('\n1. Testing Send Email:');
  await testSendEmail();
  
  console.log('\n2. Testing Password Reset Email:');
  await testSendPasswordReset();
  
  console.log('\nTests completed!');
}

runTests();