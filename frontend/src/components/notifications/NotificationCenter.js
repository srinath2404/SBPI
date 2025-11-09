import React, { useState, useEffect, useRef } from 'react';
import { Badge, ListGroup, Button } from 'react-bootstrap';
import { Bell, Check, WifiOff, ExclamationTriangle } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import './NotificationCenter.css';
import api from '../../utils/api';

const NotificationCenter = () => {
    const [tasks, setTasks] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [show, setShow] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [hasError, setHasError] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Fetch unread count
    const fetchUnreadCount = async () => {
        if (isOffline) return;
        
        try {
            setHasError(false);
            // Use the api instance
            const { data } = await api.get('/tasks/unread-count');
            setUnreadCount(data.unreadCount);
        } catch (error) {
            console.error('Error fetching unread count:', error);
            setHasError(true);
        }
    };

    // Fetch tasks
    const fetchTasks = async () => {
        if (isLoading || isOffline) return;
        
        setIsLoading(true);
        try {
            setHasError(false);
            const { data } = await api.get('/tasks');
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
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        if (isOffline) return;
        
        try {
            setHasError(false);
            await api.post('/tasks/mark-all-read');
            setUnreadCount(0);
            setTasks(prev => prev.map(task => ({ ...task, read: true })));
        } catch (error) {
            console.error('Error marking tasks as read:', error);
            setHasError(true);
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

    // Handle online/offline status
    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            fetchUnreadCount();
        };
        
        const handleOffline = () => {
            setIsOffline(true);
        };
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    
    // Fetch unread count on mount and every 30 seconds
    useEffect(() => {
        if (!isOffline) {
            fetchUnreadCount();
            
            // Set interval to periodically check for new notifications
            const interval = setInterval(fetchUnreadCount, 30000);
            
            return () => {
                clearInterval(interval);
            };
        }
    }, [isOffline]);

    return (
        <div className="notification-center" ref={dropdownRef}>
            <div 
                className="notification-bell" 
                onClick={toggleDropdown}
                title={isOffline ? "You're offline. Notifications unavailable." : hasError ? "Error loading notifications" : "Notifications"}
            >
                {isOffline ? (
                    <WifiOff size={20} color="#888" />
                ) : hasError ? (
                    <ExclamationTriangle size={20} color="#f0ad4e" />
                ) : (
                    <Bell size={20} />
                )}
                {!isOffline && !hasError && unreadCount > 0 && (
                    <Badge pill bg="danger" className="notification-badge">
                        {unreadCount}
                    </Badge>
                )}
            </div>

            {show && (
                <div className="notification-dropdown" aria-modal="true">
                    <div className="notification-header">
                        <h6>Notifications</h6>
                        {!isOffline && !hasError && unreadCount > 0 && (
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
                        {isOffline ? (
                            <div className="text-center p-3 d-flex flex-column align-items-center">
                                <WifiOff size={24} className="mb-2" color="#888" />
                                <div>You're currently offline</div>
                                <div className="small text-muted">Notifications will update when you're back online</div>
                            </div>
                        ) : hasError ? (
                            <div className="text-center p-3 d-flex flex-column align-items-center">
                                <ExclamationTriangle size={24} className="mb-2" color="#f0ad4e" />
                                <div>Error loading notifications</div>
                                <Button 
                                    variant="outline-secondary" 
                                    size="sm" 
                                    className="mt-2"
                                    onClick={fetchUnreadCount}
                                >
                                    Try Again
                                </Button>
                            </div>
                        ) : isLoading ? (
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
                            disabled={isOffline}
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