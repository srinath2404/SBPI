import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Card, 
  CardContent,
  Alert,
  Snackbar,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

function AddPipe() {
  const [formData, setFormData] = useState({
    serialNumber: '',
    colorGrade: '',
    sizeType: '',
    section: 'A',
    length: '',
    weight: '',
    manufacturingDate: new Date().toISOString().split('T')[0]
  });

  const colorGrades = ['A', 'B', 'C', 'D'];
  // Must match backend price formula keys
  const sizeTypes = ['1 inch', '1-1.4 inch', '2 inch', '2-1.2 inch', '3 inch', '4 inch'];
  const sections = ['A', 'B', 'C', 'D', 'E', 'F'];

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pricePreview, setPricePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [baseRate, setBaseRate] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Client-side validation
    if (!formData.colorGrade || !formData.sizeType) {
      setError('Color Grade and Size Type are required fields');
      return;
    }
    
    if (!formData.length || !formData.weight) {
      setError('Length and Weight are required fields');
      return;
    }
    
    const length = parseFloat(formData.length);
    const weight = parseFloat(formData.weight);
    
    if (isNaN(length) || length <= 0) {
      setError('Length must be a positive number');
      return;
    }
    
    if (isNaN(weight) || weight <= 0) {
      setError('Weight must be a positive number');
      return;
    }
    
    try {
      console.log('📤 Sending form data:', formData);
      const response = await api.post('/inventory/add', formData);
      const successMessage = response.data?.message || '';
      const isSuccess = response.status === 201 || successMessage.includes('Pipe added successfully');
      
      if (isSuccess) {
        setSuccess(true);
        // Clear the form
        setFormData({
          serialNumber: '',
          colorGrade: '',
          sizeType: '',
          section: 'A',
          length: '',
          weight: '',
          manufacturingDate: new Date().toISOString().split('T')[0]
        });
        // Delay navigation to show success message
        setTimeout(() => {
          setSuccess(false);
          navigate('/pipes');
        }, 2500); // Increased delay to 2.5 seconds
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error adding pipe. Please try again.';
      setError(errorMessage);
      console.error('Error adding pipe:', error);
      
      // Log the full error response for debugging
      if (error.response?.data) {
        console.error('Full error response:', error.response.data);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // OCR helpers (optional if you want to add later)
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleOcrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, etc.)');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file size should be less than 10MB');
      return;
    }
    
    try {
      setUploading(true);
      setError('');
      
      console.log('Processing image:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      const imageUrl = await fileToBase64(file);
      console.log('Image converted to base64, length:', imageUrl.length);
      
      // Use only AI OCR (no fallback)
      console.log('Attempting AI OCR...');
      const aiResp = await api.post('/ai-ocr/upload', { imageUrl });
      const data = aiResp.data;
      console.log('AI OCR successful:', data);
      console.log('OCR response:', data);
      
      // Set debug info
      const debugText = `OCR Response:
Message: ${data?.message}
AI Services Used: ${data?.aiServicesUsed ? data.aiServicesUsed.join(', ') : 'Tesseract.js (fallback)'}
Confidence: ${data?.confidence ? `${(data.confidence * 100).toFixed(1)}%` : 'Unknown'}
Raw Text: ${data?.rawText || 'None'}
Corrected Text: ${data?.correctedText || 'None'}
Parsed Rows: ${data?.parsedRows ? data.parsedRows.length : 0}
Extracted Data: ${JSON.stringify(data?.extractedData || {}, null, 2)}
Quality Analysis: ${JSON.stringify(data?.qualityAnalysis || {}, null, 2)}
\n\nFormatted Table:\n${data?.formattedText || 'N/A'}`;
      setDebugInfo(debugText);
      
      if (Array.isArray(data?.parsedRows) && data.parsedRows.length > 0) {
        console.log('Found parsed rows:', data.parsedRows);
        setParsedRows(data.parsedRows);
        setPickerOpen(true);
      } else if (data?.extractedData) {
        console.log('Found extracted data:', data.extractedData);
        const x = data.extractedData;
        setFormData(prev => ({
          ...prev,
          serialNumber: x.serialNumber || prev.serialNumber,
          colorGrade: x.colorGrade || prev.colorGrade,
          sizeType: x.sizeType || prev.sizeType,
          length: x.length ?? prev.length,
          weight: x.weight ?? prev.weight,
        }));
        
        // Show success message
        setError('');
        // You could add a success state here if needed
      } else {
        console.log('No structured data found, raw text:', data?.rawText);
        setError('OCR completed but no structured data was found. Please check the image quality or format.');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      const errorMessage = err.response?.data?.message || 'OCR extraction failed';
      const errorDetails = err.response?.data?.details || '';
      setError(`${errorMessage}${errorDetails ? `: ${errorDetails}` : ''}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handlePickRow = (row) => {
    setFormData(prev => ({
      ...prev,
      serialNumber: row?.bno ? String(row.bno) : prev.serialNumber,
      length: row?.mtr ?? prev.length,
      weight: row?.weight ?? prev.weight,
    }));
    setPickerOpen(false);
    setParsedRows([]);
  };

  // Live price preview based on weight and size
  useEffect(() => {
    const { colorGrade, sizeType, weight } = formData;
    if (!colorGrade || !sizeType || !weight) {
      setPricePreview(null);
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const { data } = await api.get(`/price-chart/price?sizeType=${encodeURIComponent(sizeType)}&weight=${weight}`);
        if (!cancel) setPricePreview(data.price);
      } catch {
        if (!cancel) setPricePreview(null);
      }
    })();
    return () => { cancel = true; };
  }, [formData.colorGrade, formData.sizeType, formData.weight]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 2, display: { xs: 'block', md: 'none' } }}>Add New Pipe</Typography>
      <Typography variant="h4" sx={{ mb: 3, display: { xs: 'none', md: 'block' } }}>Add New Pipe</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Card sx={{ maxWidth: 600, mx: 'auto' }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 1 }}>Pipe Details</Typography>
          {pricePreview !== null && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Live price: {pricePreview}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={async () => {
                try {
                  const { data } = await api.get('/price/formula');
                  setBaseRate(String(data?.baseRatePerKg ?? ''));
                  setRateDialogOpen(true);
                } catch (e) {
                  setError(e.response?.data?.message || 'Failed to load pricing');
                }
              }}>Pricing</Button>
              <Button variant="outlined" component="label" disabled={uploading}>
                {uploading ? 'Extracting…' : 'Extract from Image'}
                <input hidden type="file" accept="image/*" onChange={handleOcrUpload} />
              </Button>
            </Box>
            
            {/* OCR Tips */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
              <Typography variant="body2" color="info.700" sx={{ fontWeight: 'medium', mb: 1 }}>
                💡 Tips for Better OCR Results:
              </Typography>
              <Typography variant="body2" color="info.600" sx={{ fontSize: '0.875rem' }}>
                • Use clear, high-contrast images • Ensure good lighting • Keep text straight and readable • 
                • Use high resolution (min 300 DPI)
              </Typography>
            </Box>
            <TextField
              fullWidth
              label="Serial Number (optional)"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              sx={{ mb: 2 }}
              helperText="Leave empty to auto-generate"
            />
            <TextField
              fullWidth
              select
              label="Color Grade"
              name="colorGrade"
              value={formData.colorGrade}
              onChange={handleChange}
              sx={{ mb: 2 }}
              required
            >
              {colorGrades.map((color) => (
                <MenuItem key={color} value={color}>
                  {color}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              select
              label="Size Type"
              name="sizeType"
              value={formData.sizeType}
              onChange={handleChange}
              sx={{ mb: 2 }}
              required
            >
              {sizeTypes.map((size) => (
                <MenuItem key={size} value={size}>
                  {size}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              select
              label="Section"
              name="section"
              value={formData.section}
              onChange={handleChange}
              sx={{ mb: 2 }}
              required
            >
              {sections.map((sec) => (
                <MenuItem key={sec} value={sec}>
                  {sec}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Length"
                name="length"
                type="number"
                value={formData.length}
                onChange={handleChange}
                required
              />
              <TextField
                label="Weight"
                name="weight"
                type="number"
                value={formData.weight}
                onChange={handleChange}
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="contained" type="submit">
                Add Pipe
              </Button>
              <Button variant="outlined" onClick={() => navigate('/pipes')}>
                Cancel
              </Button>
            </Box>
          </form>
          
          {/* Debug Section */}
          {debugInfo && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>OCR Debug Info</Typography>
              <Typography variant="body2" component="pre" sx={{ 
                whiteSpace: 'pre-wrap', 
                fontSize: '0.8rem',
                bgcolor: 'white',
                p: 1,
                borderRadius: 1,
                border: '1px solid #ccc'
              }}>
                {debugInfo}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
      <Dialog open={rateDialogOpen} onClose={() => setRateDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Base Rate (Rs/kg)</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="Rs per kg"
            type="number"
            value={baseRate}
            onChange={(e) => setBaseRate(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRateDialogOpen(false)}>Cancel</Button>
          <Button onClick={async () => {
            try {
              const val = Number(baseRate);
              await api.put('/price/update-formula', { baseRatePerKg: val });
              setRateDialogOpen(false);
            } catch (e) {
              setError(e.response?.data?.message || 'Failed to update pricing');
            }
          }} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Select a row to prefill</DialogTitle>
        <DialogContent dividers>
          <List>
            {parsedRows.map((r) => (
              <ListItemButton key={r.sno} onClick={() => handlePickRow(r)}>
                <ListItemText
                  primary={ 'SNO ' + r.sno + '  BNO ' + r.bno }
                  secondary={ 'MTR ' + r.mtr + '   WEIGHT ' + r.weight }
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPickerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={success}
        autoHideDuration={2500}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Pipe added successfully!
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AddPipe;