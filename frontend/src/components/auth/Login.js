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
import { loginWithOfflineSupport } from '../../utils/authOffline';

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
      const result = await loginWithOfflineSupport({
        email: credentials.email,
        password: credentials.password,
      });

      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      navigate('/dashboard');
    } catch (error) {
      let message = 'Login failed. Please try again.';
      const backendMessage = error?.response?.data?.message;

      if (!navigator.onLine) {
        // Pure offline context
        if (error?.message?.includes('No offline data found')) {
          message = 'No offline data found for this user on this device. Please login once while online with this email.';
        } else if (error?.message?.includes('Invalid credentials (offline)')) {
          message = 'Invalid email or password for offline login.';
        } else {
          message = 'You appear to be offline. Please check your internet connection or use a cached account.';
        }
      } else if (error?.response) {
        // Server responded (online)
        const status = error.response.status;
        if (status === 400 || status === 401) {
          // Wrong email/password or similar auth issue
          message = backendMessage || 'Invalid email or password.';
        } else if (status >= 500) {
          message = 'Server error while logging in. Please try again later.';
        } else {
          message = backendMessage || 'Login failed due to an unexpected error.';
        }
      } else if (error?.message?.includes('Network Error')) {
        message = 'Network error while contacting server. Please check your internet connection.';
      } else {
        message = backendMessage || error?.message || message;
      }

      setError(message);
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
        // Handle errors
        setResetSuccess(false);
        setResetMessage(err.response?.data?.message || 'Failed to send reset request. Please try again.');
        
        const msg = err.response?.data?.message || '';
        if (msg.includes('Workers must request reset')) {
          try {
            const resp2 = await api.post('/workers/request-reset', { email: resetEmail });
            setResetSuccess(true);
            setResetMessage(resp2.data?.message || 'Password reset request sent to manager');
          } catch (workerErr) {
            // Handle errors for worker request
            setResetSuccess(false);
            setResetMessage(workerErr.response?.data?.message || 'Failed to send worker reset request. Please try again.');
            setResetSuccess(false);
            setResetMessage(workerErr.response?.data?.message || 'Failed to send worker reset request');
            return;
          }
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
      // Handle errors in the outer catch
      setResetSuccess(false);
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
      px: 2
    }}>
      <Card sx={{ maxWidth: 420, width: '100%', mx: 2, backdropFilter: 'blur(6px)' }}>
        <CardContent>
          <Typography variant="h4" align="center" sx={{ mb: 3, fontWeight: 800 }}>
            Sri Balaji HDPE Pipes
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
        aria-modal="true"
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