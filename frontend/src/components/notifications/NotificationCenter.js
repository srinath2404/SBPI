import React, { useState, useEffect, useRef } from 'react';
import { Badge, ListGroup, Button } from 'react-bootstrap';
import { Bell, Check } from 'react-bootstrap-icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './NotificationCenter.css';
import api, { checkConnection } from '../../utils/api';
import { isOffline, getStoredValue, setStoredValue, isNetworkError } from '../../utils/offlineUtils';

const NotificationCenter = () => {
    const [tasks, setTasks] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [show, setShow] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Fetch unread count
    const fetchUnreadCount = async () => {
        // Skip fetching if we're already known to be offline
        if (isOffline()) {
            const lastKnownCount = getStoredValue('last_unread_count', 0);
            setUnreadCount(lastKnownCount);
            return;
        }
        
        try {
            // Use the api instance with fallback mechanism instead of axios directly
            const { data } = await api.get('/tasks/unread-count');
            setUnreadCount(data.unreadCount);
            
            // Store the last known count for offline use
            setStoredValue('last_unread_count', data.unreadCount);
            
            // If we got data and were in offline mode, try to reconnect
            if (getStoredValue('offline_mode', false)) {
                checkConnection();
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
            // If we're offline, set a default value
            if (isNetworkError(error)) {
                // Use last known value or default to 0
                const lastKnownCount = getStoredValue('last_unread_count', 0);
                setUnreadCount(lastKnownCount);
            }
        }
    };

    // Fetch tasks
    const fetchTasks = async () => {
        if (isLoading) return;
        
        setIsLoading(true);
        try {
            const { data } = await axios.get('/api/tasks');
            // Sort by priority and unread status
            const sortedTasks = data.sort((a, b) => {
                // First sort by read status
                if (!a.read && b.read) return -1;
                if (a.read && !b.read) return 1;
                
                // Then by priority
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });
            
            setTasks(sortedTasks.slice(0, 5)); // Show only 5 most recent/important
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            await axios.post('/api/tasks/mark-all-read');
            setUnreadCount(0);
            setTasks(prev => prev.map(task => ({ ...task, read: true })));
        } catch (error) {
            console.error('Error marking tasks as read:', error);
        }
    };

    // Handle task click
    const handleTaskClick = async (taskId) => {
        try {
            // Navigate to task detail view
            navigate(`/tasks/${taskId}`);
            setShow(false);
        } catch (error) {
            console.error('Error handling task click:', error);
        }
    };

    // Toggle dropdown
    const toggleDropdown = () => {
        setShow(!show);
        if (!show) {
            fetchTasks();
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShow(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch unread count on mount and every 30 seconds
    useEffect(() => {
        fetchUnreadCount();
        
        // Use a longer interval when offline to reduce unnecessary network requests
        const intervalTime = isOffline() ? 120000 : 30000;
        const interval = setInterval(fetchUnreadCount, intervalTime);
        
        // Listen for online/offline events to adjust behavior
        const handleOnline = () => {
            localStorage.removeItem('offline_mode');
            fetchUnreadCount();
        };
        
        const handleOffline = () => {
            setStoredValue('offline_mode', true);
        };
        
        // Listen for app-specific online/offline events
        const handleAppOnline = () => {
            fetchUnreadCount();
        };
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('app-online', handleAppOnline);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('app-online', handleAppOnline);
        };
    }, []);

    return (
        <div className="notification-center" ref={dropdownRef}>
            <div className="notification-bell" onClick={toggleDropdown}>
                <Bell size={20} />
                {unreadCount > 0 && (
                    <Badge pill bg="danger" className="notification-badge">
                        {unreadCount}
                    </Badge>
                )}
            </div>

            {show && (
                <div className="notification-dropdown" aria-modal="true">
                    <div className="notification-header">
                        <h6>Notifications</h6>
                        {unreadCount > 0 && (
                            <Button 
                                variant="link" 
                                size="sm" 
                                className="mark-read-btn"
                                onClick={markAllAsRead}
                            >
                                <Check size={16} /> Mark all as read
                            </Button>
                        )}
                    </div>
                    
                    <ListGroup className="notification-list">
                        {isLoading ? (
                            <div className="text-center p-3">Loading...</div>
                        ) : tasks.length > 0 ? (
                            tasks.map(task => (
                                <ListGroup.Item 
                                    key={task._id}
                                    action 
                                    onClick={() => handleTaskClick(task._id)}
                                    className={!task.read ? 'unread' : ''}
                                >
                                    <div className="notification-item">
                                        <div className="notification-content">
                                            <div className="notification-title">{task.title}</div>
                                            <div className="notification-desc">{task.description.substring(0, 60)}...</div>
                                        </div>
                                        <div className={`priority-indicator ${task.priority}`}></div>
                                    </div>
                                </ListGroup.Item>
                            ))
                        ) : (
                            <div className="text-center p-3">No notifications</div>
                        )}
                    </ListGroup>
                    
                    <div className="notification-footer">
                        <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="w-100"
                            onClick={() => {
                                navigate('/tasks');
                                setShow(false);
                            }}
                        >
                            View All Tasks
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;