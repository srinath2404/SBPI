import React, { useEffect, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { isOffline } from '../../utils/offlineUtils';

/**
 * OfflineHandler component that listens for online/offline events
 * and provides appropriate UI feedback to the user
 */
const OfflineHandler = () => {
  const [offline, setOffline] = useState(isOffline());
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('warning');

  useEffect(() => {
    // Check initial state
    setOffline(isOffline());
    
    // Handle browser online/offline events
    const handleOnline = () => {
      setOffline(false);
      setMessage('Connection restored! Syncing data...');
      setSeverity('success');
      setShowMessage(true);
    };

    const handleOffline = () => {
      setOffline(true);
      setMessage('You are offline. Limited functionality available.');
      setSeverity('warning');
      setShowMessage(true);
    };

    // Handle custom app events
    const handleAppOnline = (event) => {
      setOffline(false);
      setMessage(event.detail?.message || 'Connection restored!');
      setSeverity('success');
      setShowMessage(true);
    };

    const handleAppOffline = (event) => {
      setOffline(true);
      setMessage(event.detail?.message || 'You are offline. Limited functionality available.');
      setSeverity('warning');
      setShowMessage(true);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('app-online', handleAppOnline);
    window.addEventListener('app-offline', handleAppOffline);

    return () => {
      // Clean up event listeners
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('app-online', handleAppOnline);
      window.removeEventListener('app-offline', handleAppOffline);
    };
  }, []);

  return (
    <>
      {offline && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: '#f44336',
            color: 'white',
            textAlign: 'center',
            padding: '4px 0',
            zIndex: 9999,
            fontSize: '14px'
          }}
        >
          You are currently offline. Some features may be limited.
        </div>
      )}
      <Snackbar 
        open={showMessage} 
        autoHideDuration={6000} 
        onClose={() => setShowMessage(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowMessage(false)} 
          severity={severity} 
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default OfflineHandler;