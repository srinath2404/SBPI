const express = require('express');
const router = express.Router();
const { protect, manager } = require('../middleware/authMiddleware');
const {
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask,
    getUnreadCount,
    markAllAsRead
} = require('../controllers/taskController');

// All routes are protected
router.use(protect);

// Task routes
router.route('/')
    .post(createTask)  // Create new task (any authenticated user)
    .get(getTasks);    // Get all tasks (filtered by user role)

router.get('/unread-count', getUnreadCount);  // Get unread task count
router.post('/mark-all-read', markAllAsRead); // Mark all as read

router.route('/:id')
    .get(getTaskById)   // Get task by ID
    .put(updateTask)    // Update task
    .delete(deleteTask); // Delete task (manager only)

module.exports = router;