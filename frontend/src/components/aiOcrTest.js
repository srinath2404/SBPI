import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { ocrAPI } from '../utils/api';

function AiOcrTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const testAiOcr = async () => {
    try {
      setLoading(true);
      setError('');
      setResult(null);

      const response = await ocrAPI.testAiOcr();
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to test AI OCR');
    } finally {
      setLoading(false);
    }
  };

  const testRegularOcr = async () => {
    try {
      setLoading(true);
      setError('');
      setResult(null);

      const response = await ocrAPI.testOcr();
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to test regular OCR');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        AI OCR Test Panel
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Test the AI-powered OCR services to see which ones are available and working.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          onClick={testAiOcr}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          Test AI OCR Services
        </Button>
        
        <Button
          variant="outlined"
          onClick={testRegularOcr}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          Test Regular OCR
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test Results
            </Typography>
            
            <List>
              <ListItem>
                <ListItemText
                  primary="Status"
                  secondary={result.status || 'Unknown'}
                />
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <ListItemText
                  primary="Message"
                  secondary={result.message || 'No message'}
                />
              </ListItem>
              
              {result.availableServices && (
                <>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Available Services"
                      secondary={
                        <Box>
                          {result.availableServices.map((service, index) => (
                            <Typography key={index} variant="body2" component="div">
                              • {service}
                            </Typography>
                          ))}
                        </Box>
                      }
                    />
                  </ListItem>
                </>
              )}
              
              {result.tesseractVersion && (
                <>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Tesseract.js Version"
                      secondary={result.tesseractVersion}
                    />
                  </ListItem>
                </>
              )}
            </List>
          </CardContent>
        </Card>
      )}

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          How to Set Up AI OCR Services
        </Typography>
        
        <Typography variant="body2" paragraph>
          To get better OCR accuracy, you can set up AI-powered services:
        </Typography>
        
        <List dense>
          <ListItem>
            <ListItemText
              primary="Google Cloud Vision (Recommended)"
              secondary="95%+ accuracy for handwriting. First 1000 requests/month free."
            />
          </ListItem>
          
          <ListItem>
            <ListItemText
              primary="Azure Computer Vision"
              secondary="90%+ accuracy for mixed content. First 5000 transactions/month free."
            />
          </ListItem>
          
          <ListItem>
            <ListItemText
              primary="OCR.space"
              secondary="85%+ accuracy. Free tier: 500 requests/day."
            />
          </ListItem>
          
          <ListItem>
            <ListItemText
              primary="Tesseract.js (Fallback)"
              secondary="70-80% accuracy. Always available, works offline."
            />
          </ListItem>
        </List>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Check the Backend/AI_OCR_SETUP.md file for detailed setup instructions.
        </Typography>
      </Box>
    </Box>
  );
}

export default AiOcrTest;
