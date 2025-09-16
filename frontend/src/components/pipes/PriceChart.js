import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import api from '../../utils/api';
import Navbar from '../layout/Navbar';
import ResponsiveContainer from '../common/ResponsiveContainer';
import ResponsiveTypography from '../common/ResponsiveTypography';
import ResponsiveTable from '../common/ResponsiveTable';

function PriceChart() {
  const [priceChart, setPriceChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Global base price dialog
  const [globalBasePriceDialog, setGlobalBasePriceDialog] = useState(false);
  const [newGlobalBasePrice, setNewGlobalBasePrice] = useState('');
  
  // Individual base price dialog
  const [individualBasePriceDialog, setIndividualBasePriceDialog] = useState(false);
  const [editingSize, setEditingSize] = useState(null);
  const [newIndividualBasePrice, setNewIndividualBasePrice] = useState('');
  
  // New size type dialog
  const [newSizeDialog, setNewSizeDialog] = useState(false);
  const [newSizeType, setNewSizeType] = useState('');
  const [newSizeBasePrice, setNewSizeBasePrice] = useState('64');

  useEffect(() => {
    loadPriceChart();
  }, []);

  const loadPriceChart = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/price-chart');
      setPriceChart(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load price chart');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGlobalBasePrice = async () => {
    try {
      const { data } = await api.put('/price-chart/base-price', { 
        basePrice: Number(newGlobalBasePrice) 
      });
      setPriceChart(data.priceChart);
      setSuccess('Global base price updated successfully');
      setGlobalBasePriceDialog(false);
      setNewGlobalBasePrice('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update global base price');
    }
  };

  const handleUpdateIndividualBasePrice = async () => {
    try {
      const { data } = await api.put(`/price-chart/base-price/${editingSize.sizeType}`, { 
        basePrice: Number(newIndividualBasePrice) 
      });
      
      // Update local state
      setPriceChart(prev => prev.map(item => 
        item.sizeType === editingSize.sizeType ? data.priceEntry : item
      ));
      
      setSuccess('Individual base price updated successfully');
      setIndividualBasePriceDialog(false);
      setEditingSize(null);
      setNewIndividualBasePrice('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update individual base price');
    }
  };

  const openIndividualBasePriceDialog = (size) => {
    setEditingSize(size);
    setNewIndividualBasePrice(String(size.basePrice));
    setIndividualBasePriceDialog(true);
  };

  const openGlobalBasePriceDialog = () => {
    setNewGlobalBasePrice(String(priceChart[0]?.basePrice || '64'));
    setGlobalBasePriceDialog(true);
  };
  
  const handleAddNewSizeType = async () => {
    if (!newSizeType.trim()) {
      setError('Size type cannot be empty');
      return;
    }
    
    try {
      const { data } = await api.post('/price-chart/size-type', { 
        sizeType: newSizeType.trim(),
        basePrice: Number(newSizeBasePrice) 
      });
      
      setPriceChart([...priceChart, data.newSizeType]);
      setSuccess('New size type added successfully');
      setNewSizeDialog(false);
      setNewSizeType('');
      setNewSizeBasePrice('64');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add new size type');
    }
  };
  
  const openNewSizeDialog = () => {
    setNewSizeType('');
    setNewSizeBasePrice('64');
    setNewSizeDialog(true);
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (loading) {
    return (
      <ResponsiveContainer sx={{ textAlign: 'center' }}>
        <ResponsiveTypography>Loading price chart...</ResponsiveTypography>
      </ResponsiveContainer>
    );
  }

  return (
    <>
      <Navbar />
      <ResponsiveContainer>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        mb: 3,
        gap: 2
      }}>
        <ResponsiveTypography variant="h4">Price Chart</ResponsiveTypography>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          gap: 2,
          width: isMobile ? '100%' : 'auto'
        }}>
          <Button 
            variant="outlined" 
            onClick={openNewSizeDialog}
            sx={{ minWidth: 120 }}
          >
            Add New Size Type
          </Button>
          <Button 
            variant="contained" 
            onClick={openGlobalBasePriceDialog}
            sx={{ minWidth: 120 }}
          >
            Update Global Base Price
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Card>
        <CardContent>
          <ResponsiveTypography variant="h6" sx={{ mb: 2 }}>
            Current Pricing Structure
          </ResponsiveTypography>
          
          <ResponsiveTable 
            columns={[
              { id: 'sizeType', label: 'Size Type' },
              { id: 'basePrice', label: 'Base Price (Rs/kg)', align: 'right', format: (value) => `₹${value}` },
              { id: 'updatedAt', label: 'Last Updated', align: 'right', format: (value) => new Date(value).toLocaleDateString() },
              { id: 'actions', label: 'Actions', align: 'center', format: (_, row) => (
                <Tooltip title="Edit Base Price">
                  <IconButton 
                    size="small" 
                    onClick={() => openIndividualBasePriceDialog(row)}
                    sx={{ '&:hover': { color: 'primary.main' } }}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              )}
            ]}
            data={priceChart.map(item => ({
              sizeType: item.sizeType,
              basePrice: item.basePrice,
              updatedAt: item.updatedAt,
              id: item._id
            }))}
          />

          <Box sx={{ 
            mt: 3, 
            p: 2, 
            bgcolor: 'grey.50', 
            borderRadius: 1,
            overflowX: 'auto'
          }}>
            <ResponsiveTypography variant="body2" color="text.secondary">
              <strong>Formula:</strong> Total Price = Base Price × Weight (kg)
            </ResponsiveTypography>
            <ResponsiveTypography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Example:</strong> 2 inch pipe at ₹96/kg × 5kg = ₹480
            </ResponsiveTypography>
          </Box>
        </CardContent>
      </Card>

             {/* Global Base Price Dialog */}
      <Dialog 
        open={globalBasePriceDialog} 
        onClose={() => setGlobalBasePriceDialog(false)} 
        maxWidth="sm" 
        fullWidth 
        fullScreen={isMobile}
        aria-modal="true"
      >
        <DialogTitle>
          <ResponsiveTypography variant="h6">Update Global Base Price</ResponsiveTypography>
        </DialogTitle>
        <DialogContent>
          <ResponsiveTypography variant="body2" sx={{ mb: 2 }}>
            This will update the base price for all size types.
          </ResponsiveTypography>
          <TextField
            fullWidth
            label="New Global Base Price (Rs/kg)"
            type="number"
            value={newGlobalBasePrice}
            onChange={(e) => setNewGlobalBasePrice(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            margin="normal"
          />
        </DialogContent>
        <DialogActions sx={{ p: isMobile ? 2 : 1 }}>
          <Button onClick={() => setGlobalBasePriceDialog(false)} fullWidth={isMobile}>Cancel</Button>
          <Button onClick={handleUpdateGlobalBasePrice} variant="contained" fullWidth={isMobile}>
            Update All
          </Button>
        </DialogActions>
      </Dialog>

                           {/* Individual Base Price Dialog */}
        <Dialog 
          open={individualBasePriceDialog} 
          onClose={() => setIndividualBasePriceDialog(false)} 
          maxWidth="sm" 
          fullWidth 
          fullScreen={isMobile}
          aria-modal="true"
        >
          <DialogTitle>
            <ResponsiveTypography variant="h6">Update Base Price for {editingSize?.sizeType}</ResponsiveTypography>
          </DialogTitle>
          <DialogContent>
            <ResponsiveTypography variant="body2" sx={{ mb: 2 }}>
              Current base price: ₹{editingSize?.basePrice}/kg
            </ResponsiveTypography>
            <TextField
              fullWidth
              label="New Base Price (Rs/kg)"
              type="number"
              value={newIndividualBasePrice}
              onChange={(e) => setNewIndividualBasePrice(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              margin="normal"
            />
          </DialogContent>
          <DialogActions sx={{ p: isMobile ? 2 : 1 }}>
            <Button onClick={() => setIndividualBasePriceDialog(false)} fullWidth={isMobile}>Cancel</Button>
            <Button onClick={handleUpdateIndividualBasePrice} variant="contained" fullWidth={isMobile}>
              Update
            </Button>
          </DialogActions>
        </Dialog>

        {/* New Size Type Dialog */}
        <Dialog 
          open={newSizeDialog} 
          onClose={() => setNewSizeDialog(false)} 
          maxWidth="sm" 
          fullWidth 
          fullScreen={isMobile}
          aria-modal="true"
        >
          <DialogTitle>
            <ResponsiveTypography variant="h6">Add New Size Type</ResponsiveTypography>
          </DialogTitle>
          <DialogContent>
            <ResponsiveTypography variant="body2" sx={{ mb: 2 }}>
              Add a new pipe size type with its base price.
            </ResponsiveTypography>
            <TextField
              fullWidth
              label="Size Type (e.g., '5 inch')"
              value={newSizeType}
              onChange={(e) => setNewSizeType(e.target.value)}
              sx={{ mb: 2, mt: 1 }}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Base Price (Rs/kg)"
              type="number"
              value={newSizeBasePrice}
              onChange={(e) => setNewSizeBasePrice(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              margin="normal"
            />
          </DialogContent>
          <DialogActions sx={{ p: isMobile ? 2 : 1 }}>
            <Button onClick={() => setNewSizeDialog(false)} fullWidth={isMobile}>Cancel</Button>
            <Button onClick={handleAddNewSizeType} variant="contained" fullWidth={isMobile}>
              Add Size Type
            </Button>
          </DialogActions>
        </Dialog>

      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    {/* </Box> */}
  </ResponsiveContainer>
    
    </>
  );
}

export default PriceChart;
