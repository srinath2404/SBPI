# Email Reset Functionality Guide

## Overview

This guide explains how the password reset email functionality works in the SBPI application. The system supports password reset for both managers and workers, with different flows for each role.

## Configuration

The email functionality uses the following environment variables in the `.env` file:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=wematehere@gmail.com
SMTP_PASS=puxo cmui fycw pdsm
SMTP_FROM=SBPI <wematehere@gmail.com>
FRONTEND_URL=https://sbpi-htaa.vercel.app
```

## Testing Email Functionality

A test script has been created to verify that the email functionality works correctly:

```bash
npm run test-email-reset
```

This script will:
1. Log the current SMTP configuration
2. Send a test email to the configured SMTP_USER email address
3. Display the message ID and preview URL (if available)

## Password Reset Flows

### Manager Password Reset

1. Manager requests password reset from the login page
2. System generates a reset token and sends an email with a reset link
3. Manager clicks the link and sets a new password

### Worker Password Reset

1. Worker requests password reset from the login page
2. Request is sent to the manager for approval
3. Manager approves the request from the worker management page
4. System generates a reset token and sends an email to the worker
5. Worker clicks the link and sets a new password

## Troubleshooting

If emails are not being sent:

1. Check the server logs for any error messages
2. Verify that the SMTP configuration in the `.env` file is correct
3. Ensure that the Gmail account has "Less secure app access" enabled or is using an app password
4. Check if the email service is working by running the test script

## Code Implementation

The email functionality is implemented in the following files:

- `utils/mailer.js`: Contains the email sending functionality
- `controllers/authController.js`: Handles manager password reset
- `controllers/workerController.js`: Handles worker password reset

Logging has been added to help debug any issues with the email functionality.