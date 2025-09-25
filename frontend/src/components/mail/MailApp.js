import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  Grid,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import Navbar from '../layout/Navbar';
import api from '../../utils/api';

function MailApp() {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, severity: 'info', message: '' });
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  const handleSendMail = async () => {
    if (!recipient || !subject || !message) {
      setAlert({
        show: true,
        severity: 'error',
        message: 'Please fill all fields'
      });
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/mail/send', {
        to: recipient,
        subject,
        html: message
      });
      
      setAlert({
        show: true,
        severity: 'success',
        message: 'Email sent successfully!'
      });
      
      // Clear form
      setRecipient('');
      setSubject('');
      setMessage('');
    } catch (error) {
      setAlert({
        show: true,
        severity: 'error',
        message: error.response?.data?.message || 'Failed to send email'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendResetEmail = async () => {
    if (!resetEmail) {
      setAlert({
        show: true,
        severity: 'error',
        message: 'Please enter an email address'
      });
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: resetEmail });
      
      setAlert({
        show: true,
        severity: 'success',
        message: 'Password reset email sent successfully!'
      });
      
      setResetDialogOpen(false);
      setResetEmail('');
    } catch (error) {
      setAlert({
        show: true,
        severity: 'error',
        message: error.response?.data?.message || 'Failed to send reset email'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Navbar />
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Mail Application
        </Typography>
        
        {alert.show && (
          <Alert 
            severity={alert.severity} 
            sx={{ mb: 2 }}
            onClose={() => setAlert({ ...alert, show: false })}
          >
            {alert.message}
          </Alert>
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compose Email
                </Typography>
                <Box component="form" sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Recipient"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    margin="normal"
                    required
                  />
                  <TextField
                    fullWidth
                    label="Subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    margin="normal"
                    required
                  />
                  <TextField
                    fullWidth
                    label="Message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    margin="normal"
                    required
                    multiline
                    rows={6}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SendIcon />}
                    onClick={handleSendMail}
                    disabled={loading}
                    sx={{ mt: 2 }}
                  >
                    Send Email
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Button 
                variant="outlined" 
                fullWidth 
                sx={{ mb: 1 }}
                onClick={() => setResetDialogOpen(true)}
              >
                Send Password Reset Email
              </Button>
              <Button 
                variant="outlined" 
                fullWidth
                onClick={() => {
                  setRecipient('');
                  setSubject('Test Email from SBPI System');
                  setMessage('<p>This is a test email from the SBPI system.</p>');
                }}
              >
                Create Test Email
              </Button>
            </Paper>
            
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Email Templates
              </Typography>
              <List>
                <ListItem 
                  button 
                  onClick={() => {
                    setSubject('Password Reset Instructions');
                    setMessage('<p>You requested a password reset.</p><p>Click <a href="#">here</a> to reset your password. This link expires in 30 minutes.</p>');
                  }}
                >
                  <ListItemText primary="Password Reset" secondary="Standard password reset template" />
                </ListItem>
                <Divider />
                <ListItem 
                  button
                  onClick={() => {
                    setSubject('Welcome to SBPI');
                    setMessage('<p>Welcome to Sri Balaji HDPE Pipes!</p><p>Your account has been created successfully.</p>');
                  }}
                >
                  <ListItemText primary="Welcome Email" secondary="New user welcome message" />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Send Password Reset Email</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSendResetEmail} disabled={loading}>Send</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MailApp;