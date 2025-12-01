import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    CircularProgress,
    Box
} from '@mui/material';
import api from '../../utils/api';

const TaskModal = ({ open, onClose, onSave, task }) => {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        assignedTo: '',
        dueDate: '',
        status: 'pending'
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [role, setRole] = useState('worker');
    const [currentUserId, setCurrentUserId] = useState(null);

    // Get current user info (role & id) from localStorage
    useEffect(() => {
        try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            setRole(userData.role || 'worker');
            setCurrentUserId(userData.id || null);
        } catch (error) {
            console.error('Error parsing user from localStorage:', error);
            setRole('worker');
            setCurrentUserId(null);
        }
    }, []);

    // Load users for assignment dropdown (manager only)
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // Use the same endpoint as WorkerList (manager-only worker list)
                const { data } = await api.get('/workers/all');
                setUsers(data || []);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        if (open && role === 'manager') {
            fetchUsers();
        }
    }, [open, role]);

    // Set form data when task changes
    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || '',
                description: task.description || '',
                priority: task.priority || 'medium',
                assignedTo: task.assignedTo?._id || '',
                dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
                status: task.status || 'pending'
            });
        } else {
            // Reset form for new task
            setFormData({
                title: '',
                description: '',
                priority: 'medium',
                assignedTo: '',
                dueDate: '',
                status: 'pending'
            });
        }
        setErrors({});
    }, [task, open]);

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Validate form
    const validate = () => {
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }
        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        }
        // Only managers must choose an assignee. Workers' tasks are auto-assigned to themselves.
        if (role === 'manager' && !formData.assignedTo) {
            newErrors.assignedTo = 'Please assign this task to a user';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validate()) {
            return;
        }
        
        setLoading(true);
        try {
            // For workers, force assignTo to themselves so they can't assign to others
            const payload = role === 'manager' || !currentUserId
                ? formData
                : { ...formData, assignedTo: currentUserId };

            await onSave(payload);
            onClose();
        } catch (error) {
            console.error('Error saving task:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                component: 'form',
                onSubmit: handleSubmit
            }}
        >
            <DialogTitle sx={{ fontWeight: 600 }}>
                {task ? 'Edit Task' : 'Create New Task'}
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            error={!!errors.title}
                            helperText={errors.title}
                            placeholder="Enter task title"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            required
                            multiline
                            rows={4}
                            error={!!errors.description}
                            helperText={errors.description}
                            placeholder="Enter task description"
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                            <InputLabel>Priority</InputLabel>
                            <Select
                                name="priority"
                                value={formData.priority}
                                label="Priority"
                                onChange={handleChange}
                            >
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {role === 'manager' && (
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required error={!!errors.assignedTo}>
                                <InputLabel>Assign To</InputLabel>
                                <Select
                                    name="assignedTo"
                                    value={formData.assignedTo}
                                    label="Assign To"
                                    onChange={handleChange}
                                >
                                    <MenuItem value="">
                                        <em>Select User</em>
                                    </MenuItem>
                                    {users.map(user => (
                                        <MenuItem key={user._id} value={user._id}>
                                            {user.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.assignedTo && (
                                    <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
                                        {errors.assignedTo}
                                    </Box>
                                )}
                            </FormControl>
                        </Grid>
                    )}

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Due Date"
                            name="dueDate"
                            type="date"
                            value={formData.dueDate}
                            onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    {task && (
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    name="status"
                                    value={formData.status}
                                    label="Status"
                                    onChange={handleChange}
                                >
                                    <MenuItem value="pending">Pending</MenuItem>
                                    <MenuItem value="in_progress">In Progress</MenuItem>
                                    <MenuItem value="completed">Completed</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    variant="contained" 
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : null}
                >
                    {loading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TaskModal;