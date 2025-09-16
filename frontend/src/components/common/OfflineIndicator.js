import React, { useState, useEffect } from 'react';
import { checkConnection } from '../../utils/api';
import './OfflineIndicator.css';

const OfflineIndicator = () => {
    const [isOffline, setIsOffline] = useState(false);
    
    useEffect(() => {
        // Check if we're in offline mode when component mounts
        const checkOfflineStatus = () => {
            const offlineMode = localStorage.getItem('offline_mode');
            setIsOffline(!!offlineMode);
        };
        
        // Initial check
        checkOfflineStatus();
        
        // Set up event listener for storage changes (in case offline_mode is updated)
        window.addEventListener('storage', checkOfflineStatus);
        
        // Set up interval to periodically check connection
        const interval = setInterval(async () => {
            if (isOffline) {
                const isConnected = await checkConnection();
                if (isConnected) {
                    setIsOffline(false);
                }
            }
        }, 30000); // Check every 30 seconds
        
        // Custom event for other components to trigger status check
        const handleConnectionEvent = () => {
            checkOfflineStatus();
        };
        
        window.addEventListener('connection_status_changed', handleConnectionEvent);
        
        return () => {
            window.removeEventListener('storage', checkOfflineStatus);
            window.removeEventListener('connection_status_changed', handleConnectionEvent);
            clearInterval(interval);
        };
    }, [isOffline]);
    
    // If online, don't render anything
    if (!isOffline) {
        return null;
    }
    
    // Handle manual reconnection attempt
    const handleReconnect = async () => {
        const isConnected = await checkConnection();
        setIsOffline(!isConnected);
    };
    
    return (
        <div className="offline-indicator">
            <span className="offline-indicator-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                </svg>
            </span>
            <span className="offline-indicator-message">You are currently offline. Using cached data.</span>
            <button 
                onClick={handleReconnect}
                className="offline-indicator-button"
            >
                Try Reconnect
            </button>
        </div>
    );
};

export default OfflineIndicator;