import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  IconButton,
  Tooltip
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import api from '../../utils/api';

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

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading price chart...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Price Chart</Typography>
                 <Button 
           variant="contained" 
           onClick={openGlobalBasePriceDialog}
           sx={{ minWidth: 120 }}
         >
           Update Global Base Price
         </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Current Pricing Structure
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Size Type</strong></TableCell>
                                     <TableCell align="right"><strong>Base Price (Rs/kg)</strong></TableCell>
                   <TableCell align="right"><strong>Last Updated</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {priceChart.map((size) => (
                  <TableRow key={size.sizeType}>
                    <TableCell>{size.sizeType}</TableCell>
                                       <TableCell align="right">
                     <strong>₹{size.basePrice}</strong>
                   </TableCell>
                   <TableCell align="right">
                     {new Date(size.lastUpdated).toLocaleDateString()}
                   </TableCell>
                    <TableCell align="center">
                                               <Tooltip title="Edit base price">
                           <IconButton 
                             onClick={() => openIndividualBasePriceDialog(size)}
                             size="small"
                             color="primary"
                           >
                             <EditIcon />
                           </IconButton>
                         </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

                     <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
             <Typography variant="body2" color="text.secondary">
               <strong>Formula:</strong> Total Price = Base Price × Weight (kg)
             </Typography>
             <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
               <strong>Example:</strong> 2 inch pipe at ₹96/kg × 5kg = ₹480
             </Typography>
           </Box>
        </CardContent>
      </Card>

             {/* Global Base Price Dialog */}
       <Dialog open={globalBasePriceDialog} onClose={() => setGlobalBasePriceDialog(false)} maxWidth="sm" fullWidth>
         <DialogTitle>Update Global Base Price</DialogTitle>
         <DialogContent>
           <Typography variant="body2" sx={{ mb: 2 }}>
             This will update the base price for all size types to the same value.
           </Typography>
           <TextField
             fullWidth
             label="New Global Base Price (Rs/kg)"
             type="number"
             value={newGlobalBasePrice}
             onChange={(e) => setNewGlobalBasePrice(e.target.value)}
             inputProps={{ min: 0, step: 0.01 }}
           />
         </DialogContent>
         <DialogActions>
           <Button onClick={() => setGlobalBasePriceDialog(false)}>Cancel</Button>
           <Button onClick={handleUpdateGlobalBasePrice} variant="contained">
             Update All
           </Button>
         </DialogActions>
       </Dialog>

                           {/* Individual Base Price Dialog */}
        <Dialog open={individualBasePriceDialog} onClose={() => setIndividualBasePriceDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Update Base Price for {editingSize?.sizeType}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Current base price: ₹{editingSize?.basePrice}/kg
            </Typography>
            <TextField
              fullWidth
              label="New Base Price (Rs/kg)"
              type="number"
              value={newIndividualBasePrice}
              onChange={(e) => setNewIndividualBasePrice(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIndividualBasePriceDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateIndividualBasePrice} variant="contained">
              Update
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
    </Box>
  );
}

export default PriceChart;
