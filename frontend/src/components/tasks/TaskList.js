import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Spinner } from 'react-bootstrap';
import { PlusLg, Pencil, Trash } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import TaskModal from './TaskModal';
import api from '../../utils/api';
import { isNetworkError } from '../../utils/offlineUtils';
import './TaskList.css';

const TaskList = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        priority: ''
    });
    const navigate = useNavigate();

    // Fetch tasks with filters
    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.status) params.status = filters.status;
            if (filters.priority) params.priority = filters.priority;
            
            const { data } = await api.get('/api/tasks', { params });
            setTasks(data);
            setError(null);
        } catch (err) {
            if (isNetworkError(err)) {
                setError('Network error: Unable to connect to the server. Please check your internet connection and try again.');
            } else {
                setError('Failed to fetch tasks.');
            }
            console.error('Error fetching tasks:', err);
        } finally {
            setLoading(false);
        }
    }, [api]);

    // Handle filter changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Open task modal for create/edit
    const openTaskModal = (task = null) => {
        setCurrentTask(task);
        setShowModal(true);
    };

    // Handle task save (create/update)
    const handleTaskSave = async (taskData) => {
        try {
            if (currentTask) {
                // Update existing task
                await api.put(`/api/tasks/${currentTask._id}`, taskData);
            } else {
                // Create new task
                await api.post('/api/tasks', taskData);
            }
            setShowModal(false);
            fetchTasks(); // Refresh task list
        } catch (err) {
            console.error('Error saving task:', err);
            if (isNetworkError(err)) {
                alert('Network error: Unable to connect to the server. Please check your internet connection and try again.');
            } else {
                alert('Failed to save task. Please try again.');  
            }
        }
    };

    // Handle task delete
    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        
        try {
            await api.delete(`/api/tasks/${taskId}`);
            fetchTasks(); // Refresh task list
        } catch (err) {
            console.error('Error deleting task:', err);
            if (isNetworkError(err)) {
                alert('Network error: Unable to connect to the server. Please check your internet connection and try again.');
            } else {
                alert('Failed to delete task. Please try again.');
            }
        }
    };

    // Handle task click (view details)
    const handleTaskClick = (taskId) => {
        navigate(`/tasks/${taskId}`);
    };

    // Get status badge variant
    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed': return 'success';
            case 'in_progress': return 'primary';
            case 'pending': return 'warning';
            default: return 'secondary';
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
        return date.toLocaleDateString('en-IN');
    };

    // Load tasks on mount and when filters change
    useEffect(() => {
        fetchTasks();
    }, [filters]);

    return (
        <Container fluid className="task-list-container">
            <Row className="mb-4">
                <Col>
                    <Card>
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Task Management</h5>
                            <Button 
                                variant="primary" 
                                size="sm" 
                                onClick={() => openTaskModal()}
                            >
                                <PlusLg className="me-1" /> New Task
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Row className="mb-3">
                                <Col md={6} lg={3}>
                                    <Form.Group>
                                        <Form.Label>Status</Form.Label>
                                        <Form.Select 
                                            name="status" 
                                            value={filters.status} 
                                            onChange={handleFilterChange}
                                        >
                                            <option value="">All Statuses</option>
                                            <option value="pending">Pending</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6} lg={3}>
                                    <Form.Group>
                                        <Form.Label>Priority</Form.Label>
                                        <Form.Select 
                                            name="priority" 
                                            value={filters.priority} 
                                            onChange={handleFilterChange}
                                        >
                                            <option value="">All Priorities</option>
                                            <option value="high">High</option>
                                            <option value="medium">Medium</option>
                                            <option value="low">Low</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>
                            
                            {loading ? (
                                <div className="text-center p-5">
                                    <Spinner animation="border" />
                                </div>
                            ) : error ? (
                                <div className="text-center p-3 text-danger">{error}</div>
                            ) : tasks.length === 0 ? (
                                <div className="text-center p-5">
                                    <p>No tasks found. Create a new task to get started.</p>
                                    <Button 
                                        variant="primary" 
                                        onClick={() => openTaskModal()}
                                    >
                                        <PlusLg className="me-1" /> Create Task
                                    </Button>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <Table hover className="task-table">
                                        <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Assigned To</th>
                                                <th>Status</th>
                                                <th>Priority</th>
                                                <th>Due Date</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tasks.map(task => (
                                                <tr 
                                                    key={task._id} 
                                                    className={!task.read ? 'unread-task' : ''}
                                                    onClick={() => handleTaskClick(task._id)}
                                                >
                                                    <td>{task.title}</td>
                                                    <td>{task.assignedTo?.name || 'N/A'}</td>
                                                    <td>
                                                        <Badge bg={getStatusBadge(task.status)}>
                                                            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <Badge bg={getPriorityBadge(task.priority)}>
                                                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                                        </Badge>
                                                    </td>
                                                    <td>{formatDate(task.dueDate)}</td>
                                                    <td onClick={(e) => e.stopPropagation()}>
                                                        <Button 
                                                            variant="outline-primary" 
                                                            size="sm" 
                                                            className="me-2"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openTaskModal(task);
                                                            }}
                                                        >
                                                            <Pencil />
                                                        </Button>
                                                        <Button 
                                                            variant="outline-danger" 
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteTask(task._id);
                                                            }}
                                                        >
                                                            <Trash />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Task Create/Edit Modal */}
            <TaskModal 
                show={showModal}
                onHide={() => setShowModal(false)}
                onSave={handleTaskSave}
                task={currentTask}
            />
        </Container>
    );
};

export default TaskList;