# Factory Inventory Management System

A comprehensive inventory management system for HDP pipe manufacturing, designed to manage raw materials, production, worker accounts, stock, and financial analysis through a structured process.

## Overview

This system provides a complete solution for factory inventory management with role-based access control, production tracking, sales management, and analytics dashboards.

## Features

### System Roles

#### Manager
- Create and delete worker accounts
- View and manage stock
- Approve and process sell requests
- Add manufactured pipes into stock
- Track work progress
- Manage raw material inventory
- Modify specific pipe prices
- View dashboard with charts and analytics
- Set pricing based on formula

#### Worker
- Log in to the system (created by the manager only)
- Add stock details
- View stock
- Send sell requests to the manager

### Pipe Details

Each manufactured pipe has the following attributes:
- Grade of material used for manufacturing
- Size in inches (2, 2.2, 3, 3.4, etc.)
- Length of the pipe
- Weight required for making
- Name of the worker who manufactured it
- Date and time of manufacturing
- Automatic price calculation based on formula

### Core Functionalities

- **Authentication System**: Role-based access control with manager and worker logins
- **Worker Account Management**: Manager-controlled worker accounts
- **Inventory Management**: Raw material tracking and pipe stock management
- **Production Entry System**: Workers enter pipe manufacturing details with automatic serial number generation
- **Stock and Sales Management**: Workers submit sell requests for manager approval
- **Dashboard & Reporting**: Analytics dashboard with financial analysis and work progress tracking

## Technology Stack

- **Frontend**: React.js with Material-UI
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn package manager

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd SBPI
   ```

2. Install backend dependencies
   ```
   cd Backend
   npm install
   ```

3. Install frontend dependencies
   ```
   cd ../frontend
   npm install
   ```

4. Create a `.env` file in the Backend directory with the following variables:
   ```
   MONGO_URI=<your-mongodb-connection-string>
   PORT=5000
   JWT_SECRET=<your-secret-key>
   ```

### Running the Application

1. Start the backend server
   ```
   cd Backend
   npm start
   ```

2. Start the frontend application (in a new terminal)
   ```
   cd frontend
   npm start
   ```

3. Access the application at http://localhost:3000

### Initial Setup

1. Create the initial manager account:
   ```
   cd Backend
   node scripts/initManager.js
   ```

2. (Optional) Initialize sample data for testing:
   ```
   cd Backend
   node scripts/initSampleData.js
   ```
   This will create a sample worker account, raw materials, and pipe inventory for testing purposes.

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
