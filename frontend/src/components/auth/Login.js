import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

function Login() {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await api.post('/auth/login', credentials);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
    }
  };

  const handleForgotPassword = async () => {
    try {
      if (!resetEmail) {
        setResetMessage('Please enter your email address');
        return;
      }

      // Try manager flow first; if worker, send request to manager
      try {
        const response = await api.post('/auth/forgot-password', { email: resetEmail });
        setResetSuccess(true);
        setResetMessage(response.data?.message || 'Password reset instructions sent to your email');
      } catch (err) {
        const msg = err.response?.data?.message || '';
        if (msg.includes('Workers must request reset')) {
          const resp2 = await api.post('/workers/request-reset', { email: resetEmail });
          setResetSuccess(true);
          setResetMessage(resp2.data?.message || 'Password reset request sent to manager');
        } else {
          throw err;
        }
      }
      setTimeout(() => {
        setForgotPasswordOpen(false);
        setResetEmail('');
        setResetMessage('');
        setResetSuccess(false);
      }, 3000);
    } catch (error) {
      setResetSuccess(false);
      setResetMessage(error.response?.data?.message || 'Failed to send reset email');
    }
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      bgcolor: '#f5f5f5' 
    }}>
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
        <CardContent>
          <Typography variant="h4" align="center" sx={{ mb: 3 }}>
            SBPI Management
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              sx={{ mb: 2 }}
              required
              autoComplete="username"
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              sx={{ mb: 2 }}
              required
              autoComplete="current-password"
            />
            <Button
              fullWidth
              variant="contained"
              type="submit"
              sx={{ mb: 2 }}
            >
              Login
            </Button>
            <Button
              fullWidth
              color="primary"
              onClick={() => setForgotPasswordOpen(true)}
            >
              Forgot Password?
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog 
        open={forgotPasswordOpen} 
        onClose={() => setForgotPasswordOpen(false)}
      >
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          {resetMessage && 
            <Alert 
              severity={resetSuccess ? "success" : "error"} 
              sx={{ mb: 2 }}
            >
              {resetMessage}
            </Alert>
          }
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            sx={{ mt: 1 }}
            required
            autoComplete="email"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForgotPasswordOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleForgotPassword} 
            variant="contained"
            disabled={!resetEmail}
          >
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Login;