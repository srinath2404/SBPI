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
  DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useLoading } from '../../context/LoadingContext';

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
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [baseRate, setBaseRate] = useState('');
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useLoading();

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
      showLoading('Adding new pipe...');
      const response = await api.post('/inventory/add', { ...formData, skipLoading: true });
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
        }, 2500);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error adding pipe. Please try again.';
      setError(errorMessage);
    } finally {
      hideLoading();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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