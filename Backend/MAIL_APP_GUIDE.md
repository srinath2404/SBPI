# Mail App Guide

## Overview

The Mail App is a new feature integrated into the Sri Balaji HDPE Pipes management system. It allows managers to send emails directly from the application, including general emails and password reset emails.

## Features

- **Email Composition**: Create and send emails with custom subjects and messages
- **Password Reset**: Send password reset emails to users
- **Email Templates**: Use pre-defined templates for common email types
- **Email History**: View history of sent emails

## Technical Implementation

### Frontend

The Mail App is implemented as a React component located at:
- `frontend/src/components/mail/MailApp.js`
- `frontend/src/components/mail/MailApp.css`

Access the Mail App through the navigation menu (manager access only).

### Backend

The Mail App is supported by the following backend components:

- **Controller**: `Backend/controllers/mailController.js`
- **Routes**: `Backend/routes/mailRoutes.js`
- **Email Utility**: `Backend/utils/mailer.js`

## API Endpoints

### Send Email

```
POST /api/mail/send
```

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "message": "Email content goes here",
  "template": "general" // Optional template name
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

### Send Password Reset Email

```
POST /api/mail/password-reset
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

## Testing

Use the test script to verify the mail routes are working correctly:

```
node test-mail-routes.js
```

## Security

- All mail routes require authentication
- Only managers can send general emails
- Password reset emails can be sent by any authenticated user

## Troubleshooting

If emails are not being sent:

1. Check that the SMTP configuration is correct in the environment variables
2. Verify that the email service is running and accessible
3. Check the server logs for any error messages
4. Ensure the user has the correct permissions (manager role)