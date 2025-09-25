import axios from 'axios';
import { isOffline, isNetworkError } from './offlineUtils';

// Create API instance with fallback URL
const getBaseURL = () => {
    // Try to use the environment variable first
    const envUrl = process.env.REACT_APP_API_URL;
    
    // If environment variable is available and we're not in offline mode, use it
    if (envUrl && !isOffline()) {
        return `${envUrl}/api`;
    }
    
    // Fallback to localhost if environment URL is not available or offline mode is active
    return 'http://localhost:5000/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
    timeout: 10000, // 10 second timeout
    withCredentials: true // Include credentials in cross-origin requests
});

// Cache for storing responses
const responseCache = new Map();

// Loading state handler
let loadingHandler = {
    showLoading: () => {},
    hideLoading: () => {}
};

// Function to set loading handlers from context
export const setLoadingHandlers = (handlers) => {
    loadingHandler = handlers;
};

// Add token to requests and show loading
api.interceptors.request.use((config) => {
    // Add auth token
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Show loading indicator
    if (!config.skipLoading) {
        loadingHandler.showLoading();
    }
    
    return config;
});

// Handle token expiration and hide loading
api.interceptors.response.use(
    (response) => {
        // Hide loading indicator
        if (!response.config.skipLoading) {
            loadingHandler.hideLoading();
        }
        
        // Cache successful responses for offline use
        if (response.config.method === 'get') {
            const cacheKey = `${response.config.url}${JSON.stringify(response.config.params || {})}`;
            responseCache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
            });
            
            // Store last known unread count for offline use
            if (response.config.url.includes('/tasks/unread-count') && response.data && response.data.unreadCount !== undefined) {
                localStorage.setItem('last_unread_count', response.data.unreadCount);
            }
        }
        
        return response;
    },
    async (error) => {
        // Hide loading indicator
        if (!error.config?.skipLoading) {
            loadingHandler.hideLoading();
        }
        
        // Handle token expiration
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
            return Promise.reject(error);
        }
        
        // Handle network errors with fallback
        if (isNetworkError(error)) {
            // Set offline mode flag
            localStorage.setItem('offline_mode', 'true');
            
            // For GET requests, try to return cached data
            if (error.config.method === 'get') {
                const cacheKey = `${error.config.url}${JSON.stringify(error.config.params || {})}`;
                const cachedResponse = responseCache.get(cacheKey);
                
                if (cachedResponse) {
                    console.log(`Using cached data for ${error.config.url}`);
                    return Promise.resolve({
                        ...error.response,
                        data: cachedResponse.data,
                        status: 200,
                        statusText: 'OK (Cached)',
                        headers: {},
                        cached: true,
                        timestamp: cachedResponse.timestamp
                    });
                }
                
                // For specific endpoints, return default values when offline
                if (error.config.url.includes('/tasks/unread-count')) {
                    const lastKnownCount = localStorage.getItem('last_unread_count');
                    return Promise.resolve({
                        data: { unreadCount: lastKnownCount ? parseInt(lastKnownCount, 10) : 0 },
                        status: 200,
                        statusText: 'OK (Default)',
                        headers: {},
                        cached: true,
                        timestamp: Date.now()
                    });
                }
            }
            
            // Show offline notification with more specific message
            console.warn('Application is in offline mode. Connection to server failed. Some features may be limited.');
        }
        
        return Promise.reject(error);
    }
);

// Check connection status and update mode
export const checkConnection = async () => {
    // Don't attempt connection check if browser reports offline
    if (!navigator.onLine) {
        localStorage.setItem('offline_mode', 'true');
        return false;
    }
    
    try {
        // Try to connect to the API server
        const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        await axios.get(`${baseURL}/api/health`, { timeout: 5000 });
        
        const wasOffline = localStorage.getItem('offline_mode') === 'true';
        // If successful, clear offline mode
        localStorage.removeItem('offline_mode');
        
        // Update the API base URL
        api.defaults.baseURL = getBaseURL();
        
        // Only dispatch event if we were previously offline
        if (wasOffline) {
            const onlineEvent = new CustomEvent('app-online', { detail: { message: 'Connection restored!' } });
            window.dispatchEvent(onlineEvent);
        }
        
        return true;
    } catch (error) {
        // Set offline mode
        localStorage.setItem('offline_mode', 'true');
        
        // Dispatch offline event
        const offlineEvent = new CustomEvent('app-offline', { detail: { message: 'You are currently offline. Some features may be limited.' } });
        window.dispatchEvent(offlineEvent);
        
        return false;
    }
};

// Function to clear cache
export const clearApiCache = () => {
    responseCache.clear();
};

export default api;