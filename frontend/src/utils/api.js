import axios from 'axios';

// Create API instance
const api = axios.create({
    baseURL: `${process.env.REACT_APP_API_URL}/api`
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
    (error) => {
        // Hide loading indicator
        if (!error.config?.skipLoading) {
            loadingHandler.hideLoading();
        }
        
        // Handle token expiration
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// (Removed OCR API methods)

export default api;