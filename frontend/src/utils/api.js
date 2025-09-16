import axios from 'axios';

// Create API instance with fallback URL
const getBaseURL = () => {
    // Try to use the environment variable first
    const envUrl = process.env.REACT_APP_API_URL;
    
    // If environment variable is available and we're not in offline mode, use it
    if (envUrl && !localStorage.getItem('offline_mode')) {
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
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
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
            }
            
            // Show offline notification
            console.warn('Application is in offline mode. Some features may be limited.');
        }
        
        return Promise.reject(error);
    }
);

// Check connection status and update mode
export const checkConnection = async () => {
    try {
        // Try to connect to the API server
        const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        await axios.get(`${baseURL}/api/health`, { timeout: 3000 });
        
        // If successful, clear offline mode
        localStorage.removeItem('offline_mode');
        
        // Update the API base URL
        api.defaults.baseURL = getBaseURL();
        
        return true;
    } catch (error) {
        // Set offline mode
        localStorage.setItem('offline_mode', 'true');
        return false;
    }
};

// Function to clear cache
export const clearApiCache = () => {
    responseCache.clear();
};

export default api;