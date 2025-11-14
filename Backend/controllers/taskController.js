const Task = require('../models/Task');
const User = require('../models/User');

// Create a new task
exports.createTask = async (req, res) => {
    try {
        const { title, description, priority, assignedTo, dueDate } = req.body;

        const isManager = req.user.role === 'manager';

        // For managers, they must explicitly choose an assignee.
        // For workers, tasks are always assigned to themselves (personal todo list).
        const finalAssignedTo = isManager ? assignedTo : req.user._id;

        // Validate required fields
        if (!title || !description) {
            return res.status(400).json({ message: 'Title and description are required' });
        }

        if (isManager && !assignedTo) {
            return res.status(400).json({ message: 'Managers must select a user to assign the task to' });
        }

        // Check if assigned user exists
        const assignedUser = await User.findById(finalAssignedTo);
        if (!assignedUser) {
            return res.status(404).json({ message: 'Assigned user not found' });
        }

        // Create new task
        const task = await Task.create({
            title,
            description,
            priority: priority || 'medium',
            assignedTo: finalAssignedTo,
            createdBy: req.user._id,
            dueDate: dueDate || undefined
        });

        // Return task with populated user data
        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');

        res.status(201).json({
            message: 'Task created successfully',
            task: populatedTask
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all tasks (with filtering options)
exports.getTasks = async (req, res) => {
    try {
        const { status, priority, assignedTo } = req.query;
        const filter = {};

        // Apply filters if provided
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (assignedTo) filter.assignedTo = assignedTo;

        // If user is not manager, only show tasks assigned to them
        if (req.user.role !== 'manager') {
            filter.assignedTo = req.user._id;
        }

        const tasks = await Task.find(filter)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get a specific task by ID
exports.getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Check if user has access to this task
        if (req.user.role !== 'manager' && task.assignedTo._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this task' });
        }

        // Mark task as read if it's assigned to the current user
        if (task.assignedTo._id.toString() === req.user._id.toString() && !task.read) {
            task.read = true;
            await task.save();
        }

        res.json(task);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update a task
exports.updateTask = async (req, res) => {
    try {
        const { title, description, status, priority, assignedTo, dueDate } = req.body;
        const taskId = req.params.id;

        // Find the task
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Check authorization
        if (req.user.role !== 'manager' && task.assignedTo.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this task' });
        }

        // Update fields
        if (title) task.title = title;
        if (description) task.description = description;
        if (priority) task.priority = priority;
        if (dueDate) task.dueDate = dueDate;

        // Update assignedTo if provided (only managers can reassign tasks)
        if (assignedTo) {
            if (req.user.role !== 'manager') {
                return res.status(403).json({ message: 'Only managers can reassign tasks' });
            }
            
            // Validate that the assigned user exists
            const assignedUser = await User.findById(assignedTo);
            if (!assignedUser) {
                return res.status(404).json({ message: 'Assigned user not found' });
            }
            
            task.assignedTo = assignedTo;
            // Reset read status when task is reassigned
            task.read = false;
        }

        // Only allow status updates
        if (status) {
            task.status = status;
            
            // If marking as completed, set completedAt
            if (status === 'completed' && task.status !== 'completed') {
                task.completedAt = new Date();
            } else if (status !== 'completed') {
                task.completedAt = undefined;
            }
        }

        await task.save();

        // Return updated task with populated fields
        const updatedTask = await Task.findById(taskId)
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email');

        res.json({
            message: 'Task updated successfully',
            task: updatedTask
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete a task (Manager only)
exports.deleteTask = async (req, res) => {
    try {
        // Only managers can delete tasks
        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Not authorized. Manager access only.' });
        }

        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        await Task.findByIdAndDelete(req.params.id);
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get unread task count for current user
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Task.countDocuments({
            assignedTo: req.user._id,
            read: false
        });

        res.json({ unreadCount: count });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Mark all tasks as read for current user
exports.markAllAsRead = async (req, res) => {
    try {
        await Task.updateMany(
            { assignedTo: req.user._id, read: false },
            { read: true }
        );

        res.json({ message: 'All tasks marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};