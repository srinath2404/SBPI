import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api'
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// OCR API functions
export const ocrAPI = {
    uploadImage: (imageUrl) => api.post('/ocr/upload', { imageUrl }),
    uploadImageAI: (imageUrl) => api.post('/ai-ocr/upload', { imageUrl }), // New AI OCR endpoint
    testOcr: () => api.get('/ocr/test'),
    testAiOcr: () => api.get('/ai-ocr/test'), // New AI OCR test endpoint
    processBulkPipes: (data) => api.post('/ai-ocr/bulk-pipes', data) // Bulk pipe processing
};

export default api;