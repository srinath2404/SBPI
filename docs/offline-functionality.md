# Offline Functionality Implementation

## Overview

This document describes the offline functionality implementation in the SBPI application. The implementation allows the application to continue functioning when network connectivity to the backend server is lost, providing a better user experience by displaying cached data and gracefully handling network errors.

## Components

### 1. API Fallback Mechanism (`api.js`)

- **Fallback URL Configuration**: The API instance now uses a fallback mechanism that switches between the environment-configured URL and a localhost fallback when offline.
- **Response Caching**: GET responses are cached in memory for offline use.
- **Network Error Handling**: When network errors occur, the system attempts to serve cached data.
- **Connection Status Management**: Added functions to check connection status and manage offline mode.

```javascript
// Example of the fallback URL configuration
const getBaseURL = () => {
    const envUrl = process.env.REACT_APP_API_URL;
    if (envUrl && !localStorage.getItem('offline_mode')) {
        return `${envUrl}/api`;
    }
    return 'http://localhost:5000/api';
};
```

### 2. Offline Indicator Component

- **Visual Indicator**: Shows when the application is in offline mode.
- **Reconnection Option**: Provides a button to manually attempt reconnection.
- **Automatic Status Updates**: Periodically checks connection status.

### 3. Component Updates

- **NotificationCenter.js**: Updated to handle network errors and use cached data.
- **Dashboard.js**: Updated to handle network errors and use cached data for both stats and production status.

### 4. Backend Health Endpoint

- Added a `/api/health` endpoint to the backend server for connection status checking.

## How It Works

1. **Normal Operation**:
   - API calls are made to the configured backend URL.
   - Successful responses are cached in memory.

2. **Network Error Detection**:
   - When a network error occurs, the system sets an offline mode flag.
   - The OfflineIndicator component appears to notify the user.

3. **Offline Mode**:
   - API calls that fail due to network errors attempt to use cached data.
   - Components display cached data with appropriate UI indicators.

4. **Reconnection**:
   - The application periodically attempts to reconnect to the backend.
   - Users can manually trigger reconnection attempts.
   - When connection is restored, offline mode is disabled.

## Usage Guidelines

### For Developers

1. **Using the API with Offline Support**:
   - Always use the `api` instance from `utils/api.js` for API calls.
   - For GET requests that should work offline, ensure they're properly cached.

2. **Adding Offline Support to New Components**:
   - Cache successful responses in localStorage if needed.
   - Handle network errors by providing fallback UI or data.
   - Use the `checkConnection()` function to verify connectivity.

### For Users

1. **Offline Indicator**:
   - When the red offline indicator appears, the application is in offline mode.
   - Some features may be limited or use cached data.

2. **Reconnecting**:
   - Click "Try Reconnect" to attempt to reconnect to the backend.
   - The application will automatically attempt to reconnect periodically.

## Limitations

- Only GET requests can use cached data in offline mode.
- POST, PUT, DELETE operations will fail in offline mode.
- Cached data may become stale if offline for extended periods.

## Future Improvements

- Implement IndexedDB for more robust offline data storage.
- Add request queuing for POST/PUT/DELETE operations during offline mode.
- Improve synchronization when coming back online.
- Add timestamp indicators for cached data to show age.