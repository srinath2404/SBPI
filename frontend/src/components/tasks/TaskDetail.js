import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Typography,
    Card,
    CardContent,
    CardHeader,
    Chip,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Divider,
    IconButton,
    Tooltip
} from '@mui/material';
import { ArrowBack, Edit } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import TaskModal from './TaskModal';
import api from '../../utils/api';
import Navbar from '../layout/Navbar';

const TaskDetail = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [statusUpdate, setStatusUpdate] = useState('');

    // Fetch task details
    const fetchTask = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/tasks/${taskId}`);
            setTask(data);
            setStatusUpdate(data.status);
            setError('');
        } catch (err) {
            setError('Failed to fetch task details. Please check your internet connection and try again.');
            console.error('Error fetching task:', err);
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        fetchTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId]);

    // Handle task update
    const handleTaskUpdate = async (taskData) => {
        try {
            await api.put(`/tasks/${taskId}`, taskData);
            setShowEditModal(false);
            fetchTask(); // Refresh task data
        } catch (err) {
            console.error('Error updating task:', err);
            setError('Failed to update task. Please check your internet connection and try again.');
        }
    };

    // Handle status update
    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        setStatusUpdate(newStatus);
        
        try {
            await api.put(`/tasks/${taskId}`, { status: newStatus });
            fetchTask(); // Refresh task data
        } catch (err) {
            console.error('Error updating status:', err);
            setError('Failed to update status. Please check your internet connection and try again.');
        }
    };

    // Get priority chip color
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'success';
            default: return 'default';
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
            <Box>
                <Navbar />
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <CircularProgress />
                </Box>
            </Box>
        );
    }

    if (error || !task) {
        return (
            <Box>
                <Navbar />
                <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
                    <Card sx={{ boxShadow: 3 }}>
                        <CardContent sx={{ textAlign: 'center', py: 5 }}>
                            <Alert severity="error" sx={{ mb: 3 }}>
                                {error || 'Task not found'}
                            </Alert>
                            <Button 
                                variant="contained" 
                                startIcon={<ArrowBack />}
                                onClick={() => navigate('/tasks')}
                            >
                                Back to Tasks
                            </Button>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        );
    }

    return (
        <Box>
            <Navbar />
            <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Button 
                        variant="outlined" 
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/tasks')}
                    >
                        Back to Tasks
                    </Button>
                    <Button 
                        variant="contained" 
                        startIcon={<Edit />}
                        onClick={() => setShowEditModal(true)}
                    >
                        Edit Task
                    </Button>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                <Card sx={{ boxShadow: 3 }}>
                    <CardHeader
                        title={
                            <Typography variant="h4" sx={{ fontWeight: 600 }}>
                                {task.title}
                            </Typography>
                        }
                    />
                    <CardContent>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={8}>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Description
                                </Typography>
                                <Typography 
                                    variant="body1" 
                                    sx={{ 
                                        whiteSpace: 'pre-wrap',
                                        color: 'text.secondary',
                                        lineHeight: 1.8
                                    }}
                                >
                                    {task.description || 'No description provided.'}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Card variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                        Task Details
                                    </Typography>
                                    
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                            Status
                                        </Typography>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Status</InputLabel>
                                            <Select
                                                value={statusUpdate}
                                                label="Status"
                                                onChange={handleStatusChange}
                                            >
                                                <MenuItem value="pending">Pending</MenuItem>
                                                <MenuItem value="in_progress">In Progress</MenuItem>
                                                <MenuItem value="completed">Completed</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                            Priority
                                        </Typography>
                                        <Chip 
                                            label={task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} 
                                            color={getPriorityColor(task.priority)}
                                            size="medium"
                                        />
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                            Assigned To
                                        </Typography>
                                        <Typography variant="body1">
                                            {task.assignedTo?.name || 'N/A'}
                                        </Typography>
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                            Created By
                                        </Typography>
                                        <Typography variant="body1">
                                            {task.createdBy?.name || 'N/A'}
                                        </Typography>
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                            Created On
                                        </Typography>
                                        <Typography variant="body1">
                                            {formatDate(task.createdAt)}
                                        </Typography>
                                    </Box>

                                    {task.dueDate && (
                                        <>
                                            <Divider sx={{ my: 2 }} />
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                    Due Date
                                                </Typography>
                                                <Typography variant="body1">
                                                    {formatDate(task.dueDate)}
                                                </Typography>
                                            </Box>
                                        </>
                                    )}

                                    {task.completedAt && (
                                        <>
                                            <Divider sx={{ my: 2 }} />
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                                    Completed On
                                                </Typography>
                                                <Typography variant="body1">
                                                    {formatDate(task.completedAt)}
                                                </Typography>
                                            </Box>
                                        </>
                                    )}
                                </Card>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* Edit Task Modal */}
                <TaskModal 
                    open={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleTaskUpdate}
                    task={task}
                />
            </Box>
        </Box>
    );
};

export default TaskDetail;
