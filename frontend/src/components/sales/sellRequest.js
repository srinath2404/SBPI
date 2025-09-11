import { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Button, 
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  Snackbar
} from '@mui/material';
import Navbar from '../layout/Navbar';
import api from '../../utils/api';

function SellRequest() {
  const [formData, setFormData] = useState({
    billNumber: '',
    customerName: '',
    customerPlace: '',
    customerContact: '',
    pipes: [{
      serialNumber: '',
      soldLength: '',
      price: '',
    }]
  });

  const [sales, setSales] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pipeAdded, setPipeAdded] = useState(false);

  const fetchSales = useCallback(async () => {
    try {
      const response = await api.get(`/sell/requests?page=${page}&limit=10`);
      setSales(response.data.sellRequests);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err) {
      setError('Error fetching sales');
    }
  }, [page]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handlePipeChange = (index, field, value) => {
    const newPipes = [...formData.pipes];
    newPipes[index][field] = value;
    setFormData({ ...formData, pipes: newPipes });
  };

  const addPipe = () => {
    setFormData({
      ...formData,
      pipes: [...formData.pipes, { serialNumber: '', soldLength: '', price: '' }]
    });
    setPipeAdded(true);
    setTimeout(() => setPipeAdded(false), 3000);
  };

  const removePipe = (index) => {
    if (formData.pipes.length > 1) {
      const newPipes = formData.pipes.filter((_, i) => i !== index);
      setFormData({ ...formData, pipes: newPipes });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      
      // Validate required fields
      if (!formData.customerContact) {
        setError('Customer contact is required');
        setTimeout(() => setError(''), 5000);
        return;
      }
      
      // Format the request data according to backend requirements
      const requestData = {
        billNumber: formData.billNumber,
        customerName: formData.customerName,
        customerPlace: formData.customerPlace,
        customerContact: formData.customerContact,
        pipes: formData.pipes.map(pipe => ({
          serialNumber: pipe.serialNumber,
          soldLength: pipe.soldLength,
          price: Number(pipe.price)
        }))
      };

      await api.post('/sell/request', requestData);
      setSuccess('Sales request submitted successfully');
      setFormData({
        billNumber: '',
        customerName: '',
        customerPlace: '',
        customerContact: '',
        pipes: [{
          serialNumber: '',
          soldLength: '',
          price: '',
        }]
      });
      fetchSales();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.details || 'Error submitting request';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    }
  };
  


  const handlePageChange = (event, value) => {
    setPage(value);
  };
  const approveRequest = async (id) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role !== 'manager') return;
      await api.put(`/sell/approve/${id}`, {});
      setSuccess('Request approved successfully');
      fetchSales();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.details || 'Error in approve request';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    }
  };
  const rejectRequest = async (id) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role !== 'manager') return;
      await api.put(`/sell/reject/${id}`, {});
      setSuccess('Request reject successfully');
      fetchSales();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.details || 'Error in reject request';
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    }
  };

  return (
    <Box>
      <Navbar />
      <Box sx={{ p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Snackbar
          open={pipeAdded}
          autoHideDuration={3000}
          onClose={() => setPipeAdded(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="success" sx={{ width: '100%' }}>
            Pipe added successfully!
          </Alert>
        </Snackbar>

        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
            <Card>
              <CardContent>
                <Typography variant="h5" sx={{ mb: 3 }}>New Sales Request</Typography>
                <form onSubmit={handleSubmit}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="Bill Number"
                      value={formData.billNumber}
                      onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                      required
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Customer Name"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      required
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Customer Place"
                      value={formData.customerPlace}
                      onChange={(e) => setFormData({ ...formData, customerPlace: e.target.value })}
                      required
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Customer Contact"
                      value={formData.customerContact}
                      onChange={(e) => setFormData({ ...formData, customerContact: e.target.value })}
                      required
                      sx={{ mb: 2 }}
                    />
                                        
                    {formData.pipes.map((pipe, index) => (
                      <Box 
                        key={index} 
                        sx={{ 
                          p: 2, 
                          border: '1px solid #e0e0e0', 
                          borderRadius: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2
                        }}
                      >
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          
                          <TextField
                            fullWidth
                            label="Serial Number"
                            value={pipe.serialNumber}
                            onChange={(e) => handlePipeChange(index, 'serialNumber', e.target.value)}
                            required
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Sold Length"
                            value={pipe.soldLength}
                            onChange={(e) => handlePipeChange(index, 'soldLength', e.target.value)}
                            required
                          />
                          {/* <TextField
                            fullWidth
                            type="number"
                            label="Quantity"
                            value={pipe.quantity}
                            onChange={(e) => handlePipeChange(index, 'quantity', e.target.value)}
                            required
                          /> */}
                          <TextField
                            fullWidth
                            type="number"
                            label="Price"
                            value={pipe.price}
                            onChange={(e) => handlePipeChange(index, 'price', e.target.value)}
                            required
                          />
                        </Box>
                        {formData.pipes.length > 1 && (
                          <Button
                            color="error"
                            onClick={() => removePipe(index)}
                            size="small"
                          >
                            Remove Pipe
                          </Button>
                        )}
                      </Box>
                    ))}
                    
                    <Button
                      variant="outlined"
                      onClick={addPipe}
                      sx={{ mt: 1 }}
                    >
                      Add Another Pipe
                    </Button>

                    <Button
                      fullWidth
                      variant="contained"
                      type="submit"
                      sx={{ mt: 2 }}
                    >
                      Submit Request
                    </Button>
                  </Box>
                </form>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
            <Card>
              <CardContent>
                <Typography variant="h5" sx={{ mb: 3 }}>Recent Sales Requests</Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Bill Number</TableCell>
                        <TableCell>Customer Name</TableCell>
                        <TableCell>Customer Place</TableCell>
                        <TableCell>Serial Number</TableCell>
                        <TableCell>Sold Length</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sales.map((sale) => (
                       <TableRow key={sale._id}>
                       <TableCell>{sale.billNumber}</TableCell>
                       <TableCell>{sale.customerName}</TableCell>
                       <TableCell>{sale.customerPlace}</TableCell>
                       <TableCell>{sale.pipes[0]?.serialNumber}</TableCell>
                       <TableCell>{sale.pipes[0]?.soldLength}</TableCell>
                       <TableCell>{sale.pipes[0]?.price}</TableCell>
                       <TableCell>{sale.status}</TableCell>
                       <TableCell>
                         {sale.status === 'pending' && JSON.parse(localStorage.getItem('user') || '{}').role === 'manager' && (
                           <Box sx={{ display: 'flex', gap: 1 }}>
                             <Button
                               variant="contained"
                               color="primary"
                               size="small"
                               onClick={() => approveRequest(sale._id)}
                             >
                               Approve
                             </Button>
                             <Button
                               variant="contained"
                               color="error"
                               size="small"
                               onClick={() => rejectRequest(sale._id)}
                             >
                               Reject
                             </Button>
                           </Box>
                         )}
                       </TableCell>
                     </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Pagination 
                    count={totalPages} 
                    page={page} 
                    onChange={handlePageChange} 
                    color="primary" 
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

      </Box>
    </Box>
  );
}

export default SellRequest;