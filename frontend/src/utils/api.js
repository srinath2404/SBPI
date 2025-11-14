import axios from 'axios';

// Create API instance with URL
const getBaseURL = () => {
    // Try to use the environment variable first
    const envUrl = process.env.REACT_APP_API_URL;
    
    // If environment variable is available, use it
    if (envUrl) {
        // Remove trailing slash if present
        const cleanUrl = envUrl.replace(/\/$/, '');
        return `${cleanUrl}/api`;
    }
    
    // Check if we're in production (Vercel)
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    
    if (isProduction) {
        // In production, use the Render backend URL as fallback
        console.error('REACT_APP_API_URL is not set! Using fallback backend URL.');
        return 'https://sbpi-2.onrender.com/api';
    }
    
    // Fallback to localhost only in development
    return 'http://localhost:5000/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
    timeout: 10000, // 10 second timeout
    withCredentials: true // Include credentials in cross-origin requests
});



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
        
        return Promise.reject(error);
    }
);

export default api;