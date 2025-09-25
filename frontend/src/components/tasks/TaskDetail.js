import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner, Form } from 'react-bootstrap';
import { ArrowLeft, Pencil } from 'react-bootstrap-icons';
import { useParams } from 'react-router-dom';
import TaskModal from './TaskModal';
import api from '../../utils/api';
import { isNetworkError } from '../../utils/offlineUtils';
import './TaskDetail.css';

const TaskDetail = () => {
    const { taskId } = useParams();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [statusUpdate, setStatusUpdate] = useState('');

    // Fetch task details
    const fetchTask = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/api/tasks/${taskId}`);
            setTask(data);
            setStatusUpdate(data.status);
            setError('');
        } catch (err) {
            if (isNetworkError(err)) {
                setError('Network error: Unable to connect to the server. Please check your internet connection and try again.');
            } else {
                setError('Failed to fetch task details.');
            }
            console.error('Error fetching task:', err);
        } finally {
            setLoading(false);
        }
    }, [taskId, api]);

    useEffect(() => {
        fetchTask();
    }, [fetchTask]);

    // Handle task update
    const handleTaskUpdate = async (taskData) => {
        try {
            await api.put(`/api/tasks/${taskId}`, taskData);
            setShowEditModal(false);
            fetchTask(); // Refresh task data
        } catch (err) {
            console.error('Error updating task:', err);
            if (isNetworkError(err)) {
                alert('Network error: Unable to connect to the server. Please check your internet connection and try again.');
            } else {
                alert('Failed to update task. Please try again.');
            }
        }
    };

    // Handle status update
    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        setStatusUpdate(newStatus);
        
        try {
            await api.put(`/api/tasks/${taskId}`, { status: newStatus });
            fetchTask(); // Refresh task data
        } catch (err) {
            console.error('Error updating status:', err);
            if (isNetworkError(err)) {
                alert('Network error: Unable to connect to the server. Please check your internet connection and try again.');
            } else {
                alert('Failed to update status. Please try again.');
            }
        }
    };

    // Get priority badge variant
    const getPriorityBadge = (priority) => {
        switch (priority) {
            case 'high': return 'danger';
            case 'medium': return 'warning';
            case 'low': return 'success';
            default: return 'secondary';
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                <Spinner animation="border" />
            </Container>
        );
    }

    if (error || !task) {
        return (
            <Container className="mt-4">
                <Card>
                    <Card.Body className="text-center">
                        <Card.Title className="text-danger">Error</Card.Title>
                        <Card.Text>{error || 'Task not found'}</Card.Text>
                        <Button variant="primary" onClick={() => navigate('/tasks')}>
                            <ArrowLeft className="me-2" /> Back to Tasks
                        </Button>
                    </Card.Body>
                </Card>
            </Container>
        );
    }

    return (
        <Container className="task-detail-container">
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <Button 
                            variant="outline-secondary" 
                            onClick={() => navigate('/tasks')}
                        >
                            <ArrowLeft className="me-2" /> Back to Tasks
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={() => setShowEditModal(true)}
                        >
                            <Pencil className="me-2" /> Edit Task
                        </Button>
                    </div>
                    
                    <Card>
                        <Card.Header>
                            <h4 className="mb-0">{task.title}</h4>
                        </Card.Header>
                        <Card.Body>
                            <Row className="mb-4">
                                <Col md={8}>
                                    <h5>Description</h5>
                                    <p className="task-description">{task.description}</p>
                                </Col>
                                <Col md={4}>
                                    <div className="task-meta">
                                        <div className="task-meta-item">
                                            <span className="meta-label">Status:</span>
                                            <Form.Select 
                                                value={statusUpdate} 
                                                onChange={handleStatusChange}
                                                className="status-select"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="in_progress">In Progress</option>
                                                <option value="completed">Completed</option>
                                            </Form.Select>
                                        </div>
                                        
                                        <div className="task-meta-item">
                                            <span className="meta-label">Priority:</span>
                                            <Badge bg={getPriorityBadge(task.priority)}>
                                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                            </Badge>
                                        </div>
                                        
                                        <div className="task-meta-item">
                                            <span className="meta-label">Assigned To:</span>
                                            <span>{task.assignedTo?.name || 'N/A'}</span>
                                        </div>
                                        
                                        <div className="task-meta-item">
                                            <span className="meta-label">Created By:</span>
                                            <span>{task.createdBy?.name || 'N/A'}</span>
                                        </div>
                                        
                                        <div className="task-meta-item">
                                            <span className="meta-label">Created On:</span>
                                            <span>{formatDate(task.createdAt)}</span>
                                        </div>
                                        
                                        {task.dueDate && (
                                            <div className="task-meta-item">
                                                <span className="meta-label">Due Date:</span>
                                                <span>{formatDate(task.dueDate)}</span>
                                            </div>
                                        )}
                                        
                                        {task.completedAt && (
                                            <div className="task-meta-item">
                                                <span className="meta-label">Completed On:</span>
                                                <span>{formatDate(task.completedAt)}</span>
                                            </div>
                                        )}
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Edit Task Modal */}
            <TaskModal 
                show={showEditModal}
                onHide={() => setShowEditModal(false)}
                onSave={handleTaskUpdate}
                task={task}
            />
        </Container>
    );
};

export default TaskDetail;