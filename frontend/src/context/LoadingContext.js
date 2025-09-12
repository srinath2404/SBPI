import React, { createContext, useState, useContext } from 'react';
import { Backdrop, CircularProgress } from '@mui/material';

// Create a context for loading state
const LoadingContext = createContext();

// Custom hook to use the loading context
export const useLoading = () => useContext(LoadingContext);

// Provider component
export const LoadingProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Show loading with optional message
  const showLoading = (msg = '') => {
    setMessage(msg);
    setLoading(true);
  };

  // Hide loading
  const hideLoading = () => {
    setLoading(false);
    setMessage('');
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, loading }}>
      {children}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, flexDirection: 'column', gap: 2 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
        {message && <div>{message}</div>}
      </Backdrop>
    </LoadingContext.Provider>
  );
};

export default LoadingContext;