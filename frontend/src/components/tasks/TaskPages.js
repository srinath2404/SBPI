import React from 'react';
import { Routes, Route } from 'react-router-dom';
import TaskList from './TaskList';
import TaskDetail from './TaskDetail';

const TaskPages = () => {
    return (
        <Routes>
            <Route path="/" element={<TaskList />} />
            <Route path="/:taskId" element={<TaskDetail />} />
        </Routes>
    );
};

export default TaskPages;