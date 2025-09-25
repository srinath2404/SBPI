/**
 * Utility functions for handling offline functionality
 */

/**
 * Gets a value from localStorage with fallback
 * @param {string} key - The localStorage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} The stored value or default
 */
export const getStoredValue = (key, defaultValue) => {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return defaultValue;
    
    // Try to parse as JSON if possible
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    console.error(`Error retrieving ${key} from localStorage:`, error);
    return defaultValue;
  }
};

/**
 * Safely stores a value in localStorage
 * @param {string} key - The localStorage key
 * @param {*} value - Value to store (objects will be stringified)
 */
export const setStoredValue = (key, value) => {
  try {
    if (typeof value === 'object') {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.setItem(key, value);
    }
  } catch (error) {
    console.error(`Error storing ${key} in localStorage:`, error);
  }
};

/**
 * Checks if the application is in offline mode
 * @returns {boolean} True if offline
 */
export const isOffline = () => {
  return !navigator.onLine || localStorage.getItem('offline_mode') === 'true';
};

/**
 * Checks if an error is a network-related error
 * @param {Error} error - The error to check
 * @returns {boolean} True if it's a network error
 */
export const isNetworkError = (error) => {
  return (
    !error.response || 
    error.code === 'ERR_NETWORK' || 
    error.code === 'ERR_CONNECTION_RESET' || 
    error.message === 'Network Error' || 
    error.message?.includes('ECONNRESET')
  );
};

/**
 * Creates a default response for offline API requests
 * @param {string} endpoint - The API endpoint
 * @param {*} defaultData - Default data to return
 * @returns {Object} A mock response object
 */
export const createOfflineResponse = (endpoint, defaultData) => {
  return {
    data: defaultData,
    status: 200,
    statusText: 'OK (Offline)',
    headers: {},
    config: { url: endpoint },
    _fromCache: true
  };
};

/**
 * Queues failed requests for retry when back online
 * @param {Object} request - The failed request config
 */
export const queueFailedRequest = (request) => {
  try {
    // Get existing queue
    const queueString = localStorage.getItem('offline_request_queue') || '[]';
    const queue = JSON.parse(queueString);
    
    // Add request to queue (only if it's not already there)
    const exists = queue.some(req => 
      req.url === request.url && 
      req.method === request.method
    );
    
    if (!exists) {
      queue.push({
        url: request.url,
        method: request.method,
        data: request.data,
        timestamp: Date.now()
      });
      
      localStorage.setItem('offline_request_queue', JSON.stringify(queue));
    }
  } catch (error) {
    console.error('Error queueing failed request:', error);
  }
};