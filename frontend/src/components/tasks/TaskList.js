import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Card, 
  CardContent, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Chip, 
  CircularProgress, 
  Alert, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  IconButton,
  Tooltip,
  Grid
} from '@mui/material';
import { Add, Edit, Delete, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import TaskModal from './TaskModal';
import api from '../../utils/api';
import Navbar from '../layout/Navbar';

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
            
            const { data } = await api.get('/tasks', { params });
            setTasks(data || []);
            setError('');
        } catch (err) {
            setError('Failed to fetch tasks. Please check your internet connection and try again.');
            console.error('Error fetching tasks:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Handle filter changes
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
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
                await api.put(`/tasks/${currentTask._id}`, taskData);
            } else {
                // Create new task
                await api.post('/tasks', taskData);
            }
            setShowModal(false);
            setCurrentTask(null);
            fetchTasks(); // Refresh task list
        } catch (err) {
            console.error('Error saving task:', err);
            setError('Failed to save task. Please check your internet connection and try again.');
        }
    };

    // Handle task delete
    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        
        try {
            await api.delete(`/tasks/${taskId}`);
            fetchTasks(); // Refresh task list
        } catch (err) {
            console.error('Error deleting task:', err);
            setError('Failed to delete task. Please check your internet connection and try again.');
        }
    };

    // Handle task click (view details)
    const handleTaskClick = (taskId) => {
        navigate(`/tasks/${taskId}`);
    };

    // Get status chip color
    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'success';
            case 'in_progress': return 'primary';
            case 'pending': return 'warning';
            default: return 'default';
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
        return date.toLocaleDateString('en-IN');
    };

    // Load tasks on mount and when filters change
    useEffect(() => {
        fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    return (
        <Box>
            <Navbar />
            <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        Task Management
                    </Typography>
                    <Button 
                        variant="contained" 
                        startIcon={<Add />}
                        onClick={() => openTaskModal()}
                        sx={{ minWidth: 140 }}
                    >
                        New Task
                    </Button>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                <Card sx={{ mb: 3, boxShadow: 3 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                            Filters
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={filters.status}
                                        label="Status"
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                    >
                                        <MenuItem value="">All Statuses</MenuItem>
                                        <MenuItem value="pending">Pending</MenuItem>
                                        <MenuItem value="in_progress">In Progress</MenuItem>
                                        <MenuItem value="completed">Completed</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Priority</InputLabel>
                                    <Select
                                        value={filters.priority}
                                        label="Priority"
                                        onChange={(e) => handleFilterChange('priority', e.target.value)}
                                    >
                                        <MenuItem value="">All Priorities</MenuItem>
                                        <MenuItem value="high">High</MenuItem>
                                        <MenuItem value="medium">Medium</MenuItem>
                                        <MenuItem value="low">Low</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                <Card sx={{ boxShadow: 3 }}>
                    <CardContent>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                                <CircularProgress />
                            </Box>
                        ) : error && tasks.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 5 }}>
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {error}
                                </Alert>
                                <Button variant="contained" onClick={fetchTasks}>
                                    Retry
                                </Button>
                            </Box>
                        ) : tasks.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 5 }}>
                                <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                                    No tasks found
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                    Create a new task to get started.
                                </Typography>
                                <Button 
                                    variant="contained" 
                                    startIcon={<Add />}
                                    onClick={() => openTaskModal()}
                                >
                                    Create Task
                                </Button>
                            </Box>
                        ) : (
                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'primary.main' }}>
                                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Title</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Assigned To</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Priority</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Due Date</TableCell>
                                            <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {tasks.map(task => (
                                            <TableRow 
                                                key={task._id} 
                                                onClick={() => handleTaskClick(task._id)}
                                                sx={{ 
                                                    cursor: 'pointer',
                                                    '&:hover': { bgcolor: 'action.hover' },
                                                    ...(!task.read && { bgcolor: 'action.selected' })
                                                }}
                                            >
                                                <TableCell>
                                                    <Typography variant="body1" sx={{ fontWeight: task.read ? 'normal' : 600 }}>
                                                        {task.title}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{task.assignedTo?.name || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('_', ' ')} 
                                                        color={getStatusColor(task.status)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} 
                                                        color={getPriorityColor(task.priority)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>{formatDate(task.dueDate)}</TableCell>
                                                <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                                    <Tooltip title="Edit">
                                                        <IconButton 
                                                            size="small" 
                                                            color="primary"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openTaskModal(task);
                                                            }}
                                                        >
                                                            <Edit />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton 
                                                            size="small" 
                                                            color="error"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteTask(task._id);
                                                            }}
                                                        >
                                                            <Delete />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Task Create/Edit Modal */}
                <TaskModal 
                    open={showModal}
                    onClose={() => {
                        setShowModal(false);
                        setCurrentTask(null);
                    }}
                    onSave={handleTaskSave}
                    task={currentTask}
                />
            </Box>
        </Box>
    );
};

export default TaskList;
