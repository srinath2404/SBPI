import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import api from '../../utils/api';
import Navbar from '../layout/Navbar';

function WorkerList() {
  const [workers, setWorkers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [resetRequests, setResetRequests] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const response = await api.get('/workers/all');
      setWorkers(response.data);
    } catch (error) {
      setError('Error fetching workers');
    }
  };

  const fetchResetRequests = async () => {
    try {
      const response = await api.get('/workers/reset-requests');
      setResetRequests(response.data || []);
    } catch (e) {
      setError('Error fetching password reset requests');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/workers/delete/${id}`);
      setSuccess('Worker deleted successfully');
      fetchWorkers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Error deleting worker');
    }
  };

  // Editing workers is not supported by backend; only create/delete

  const handleSubmit = async () => {
    try {
      await api.post('/workers/create', formData);
      setSuccess('Worker created successfully');
      setOpenDialog(false);
      fetchWorkers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      const msg = error.response?.data?.message || 'Error creating worker';
      setError(msg);
    }
  };

  return (
    <Box>
      <Navbar />
      <Box sx={{ p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Workers Management</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setFormData({ name: '', email: '', password: '' });
              setOpenDialog(true);
            }}
          >
            Add Worker
          </Button>
          <Button
            variant="outlined"
            sx={{ ml: 2 }}
            onClick={async () => {
              await fetchResetRequests();
              setOpenResetDialog(true);
            }}
          >
            Password Reset Requests
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workers.map((worker) => (
                <TableRow key={worker._id}>
                  <TableCell>{worker.name}</TableCell>
                  <TableCell>{worker.email}</TableCell>
                  <TableCell>{worker.role}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleDelete(worker._id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle>
            Add Worker (Manager Only)
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mt: 2, mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openResetDialog} onClose={() => setOpenResetDialog(false)}>
          <DialogTitle>Worker Password Reset Requests</DialogTitle>
          <DialogContent>
            {resetRequests.length === 0 && (
              <Typography sx={{ mt: 1 }}>No pending requests.</Typography>
            )}
            {resetRequests.map((w) => (
              <Box key={w._id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
                <Box>
                  <Typography variant="subtitle1">{w.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{w.email}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={async () => {
                      try {
                        await api.post('/workers/reset-password', { workerId: w._id, approve: true });
                        setSuccess('Reset email sent to worker');
                        await fetchResetRequests();
                      } catch (e) {
                        setError('Failed to approve reset');
                      }
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={async () => {
                      try {
                        await api.post('/workers/reset-password', { workerId: w._id, approve: false });
                        setSuccess('Reset request declined');
                        await fetchResetRequests();
                      } catch (e) {
                        setError('Failed to decline reset');
                      }
                    }}
                  >
                    Decline
                  </Button>
                </Box>
              </Box>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenResetDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}

export default WorkerList;