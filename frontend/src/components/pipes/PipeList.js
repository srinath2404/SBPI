import React, { useState, useEffect } from 'react';
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  InputAdornment,
  Collapse,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import api from '../../utils/api';

function PipeList() {
  const [pipes, setPipes] = useState([]);
  const [filteredPipes, setFilteredPipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    colorGrade: '',
    sizeType: '',
    batchNumber: '',
    dateRange: '',
    minWeight: '',
    maxWeight: '',
    minLength: '',
    maxLength: ''
  });
  const [sortBy, setSortBy] = useState('manufacturingDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchPipes();
  }, []);

  useEffect(() => {
    // Only run when pipes is properly initialized
    if (Array.isArray(pipes)) {
      applyFiltersAndSearch();
    }
  }, [pipes, searchTerm, filters, sortBy, sortOrder]);

  const fetchPipes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inventory/all');
      
      // Backend returns an object: { pipes: [...], pagination: {...}, filters: {...} }
      const pipesData = Array.isArray(response.data?.pipes) ? response.data.pipes : [];
      setPipes(pipesData);
      
      // Calculate statistics
      const pipeStats = calculateStats(pipesData);
      setStats(pipeStats);
    } catch (error) {
      console.error('Error fetching pipes:', error);
      // Set empty arrays on error to prevent crashes
      setPipes([]);
      setFilteredPipes([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (pipeData) => {
    if (!Array.isArray(pipeData) || !pipeData.length) return {};
    
    const totalPipes = pipeData.length;
    const totalWeight = pipeData.reduce((sum, pipe) => sum + (pipe.weight || 0), 0);
    const totalLength = pipeData.reduce((sum, pipe) => sum + (pipe.length || 0), 0);
    const totalValue = pipeData.reduce((sum, pipe) => sum + (pipe.price || 0), 0);
    
    const gradeDistribution = pipeData.reduce((acc, pipe) => {
      acc[pipe.colorGrade] = (acc[pipe.colorGrade] || 0) + 1;
      return acc;
    }, {});
    
    const sizeDistribution = pipeData.reduce((acc, pipe) => {
      acc[pipe.sizeType] = (acc[pipe.sizeType] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalPipes,
      totalWeight: totalWeight.toFixed(1),
      totalLength: totalLength.toFixed(1),
      totalValue: totalValue.toFixed(2),
      avgWeight: (totalWeight / totalPipes).toFixed(1),
      avgLength: (totalLength / totalPipes).toFixed(1),
      avgPrice: (totalValue / totalPipes).toFixed(2),
      gradeDistribution,
      sizeDistribution
    };
  };

  const applyFiltersAndSearch = () => {
    // Ensure pipes is an array before proceeding
    if (!Array.isArray(pipes)) {
      setFilteredPipes([]);
      return;
    }
    
    let filtered = [...pipes];

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(pipe =>
        pipe.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pipe.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pipe.colorGrade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pipe.sizeType?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.colorGrade) {
      filtered = filtered.filter(pipe => pipe.colorGrade === filters.colorGrade);
    }
    if (filters.sizeType) {
      filtered = filtered.filter(pipe => pipe.sizeType === filters.sizeType);
    }
    if (filters.batchNumber) {
      filtered = filtered.filter(pipe => pipe.batchNumber?.includes(filters.batchNumber));
    }
    if (filters.minWeight) {
      filtered = filtered.filter(pipe => pipe.weight >= parseFloat(filters.minWeight));
    }
    if (filters.maxWeight) {
      filtered = filtered.filter(pipe => pipe.weight <= parseFloat(filters.maxWeight));
    }
    if (filters.minLength) {
      filtered = filtered.filter(pipe => pipe.length >= parseFloat(filters.minLength));
    }
    if (filters.maxLength) {
      filtered = filtered.filter(pipe => pipe.length <= parseFloat(filters.maxLength));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'manufacturingDate') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    // Ensure we always set a valid array
    setFilteredPipes(Array.isArray(filtered) ? filtered : []);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      colorGrade: '',
      sizeType: '',
      batchNumber: '',
      dateRange: '',
      minWeight: '',
      maxWeight: '',
      minLength: '',
      maxLength: ''
    });
    setSearchTerm('');
    // Reset filtered pipes to show all pipes
    if (Array.isArray(pipes)) {
      setFilteredPipes([...pipes]);
    } else {
      setFilteredPipes([]);
    }
  };

  const getQualityColor = (grade) => {
    if (!grade) return '#757575';
    
    switch(grade.toUpperCase()) {
      case 'A': return '#4caf50';
      case 'B': return '#ff9800';
      case 'C': return '#f44336';
      case 'D': return '#9c27b0';
      default: return '#757575';
    }
  };

  const handleDelete = async (pipeId) => {
    if (!pipeId) {
      console.error('No pipe ID provided for deletion');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this pipe?')) {
      try {
        await api.delete(`/inventory/delete/${pipeId}`);
        fetchPipes();
      } catch (error) {
        console.error('Error deleting pipe:', error);
      }
    }
  };

  // Safety check to ensure pipes is properly initialized
  if (!Array.isArray(pipes)) {
    return (
      <Box>
        <Navbar />
        <Box sx={{ p: 3 }}>
          <Typography variant="h4">Pipe Inventory</Typography>
          {loading ? (
            <Typography>Loading pipes...</Typography>
          ) : (
            <Typography>Error: Unable to load pipes. Please refresh the page.</Typography>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Navbar />
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Pipe Inventory</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/pipes/add')}
          >
            Add New Pipe
          </Button>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <CardContent>
                <Typography variant="h4">{stats?.totalPipes || 0}</Typography>
                <Typography variant="body2">Total Pipes</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
              <CardContent>
                <Typography variant="h4">{stats?.totalWeight || 0}</Typography>
                <Typography variant="body2">Total Weight (kg)</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
              <CardContent>
                <Typography variant="h4">{stats?.totalLength || 0}</Typography>
                <Typography variant="body2">Total Length (m)</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
              <CardContent>
                <Typography variant="h4">₹{stats?.totalValue || 0}</Typography>
                <Typography variant="body2">Total Value</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filter Bar */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search pipes..."
                  label="Search pipes"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{ 'aria-label': 'Search pipes' }}
                />
              </Grid>
              
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Sort By"
                  >
                    <MenuItem value="manufacturingDate">Date</MenuItem>
                    <MenuItem value="serialNumber">Serial Number</MenuItem>
                    <MenuItem value="weight">Weight</MenuItem>
                    <MenuItem value="length">Length</MenuItem>
                    <MenuItem value="price">Price</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Order</InputLabel>
                  <Select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    label="Order"
                  >
                    <MenuItem value="desc">Descending</MenuItem>
                    <MenuItem value="asc">Ascending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={clearFilters}
                  color="secondary"
                >
                  Clear All
                </Button>
              </Grid>
            </Grid>

            {/* Advanced Filters */}
            <Collapse in={showFilters}>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Color Grade</InputLabel>
                    <Select
                      value={filters.colorGrade}
                      onChange={(e) => handleFilterChange('colorGrade', e.target.value)}
                      label="Color Grade"
                    >
                      <MenuItem value="">All Grades</MenuItem>
                      <MenuItem value="A">Grade A</MenuItem>
                      <MenuItem value="B">Grade B</MenuItem>
                      <MenuItem value="C">Grade C</MenuItem>
                      <MenuItem value="D">Grade D</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Size Type</InputLabel>
                    <Select
                      value={filters.sizeType}
                      onChange={(e) => handleFilterChange('sizeType', e.target.value)}
                      label="Size Type"
                    >
                      <MenuItem value="">All Sizes</MenuItem>
                      <MenuItem value="4 inch">4 inch</MenuItem>
                      <MenuItem value="6 inch">6 inch</MenuItem>
                      <MenuItem value="8 inch">8 inch</MenuItem>
                      <MenuItem value="10 inch">10 inch</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Min Weight (kg)"
                    type="number"
                    value={filters.minWeight}
                    onChange={(e) => handleFilterChange('minWeight', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Max Weight (kg)"
                    type="number"
                    value={filters.maxWeight}
                    onChange={(e) => handleFilterChange('maxWeight', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Min Length (m)"
                    type="number"
                    value={filters.minLength}
                    onChange={(e) => handleFilterChange('minLength', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Max Length (m)"
                    type="number"
                    value={filters.maxLength}
                    onChange={(e) => handleFilterChange('maxLength', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label="Batch Number"
                    value={filters.batchNumber}
                    onChange={(e) => handleFilterChange('batchNumber', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Collapse>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing {Array.isArray(filteredPipes) ? filteredPipes.length : 0} of {Array.isArray(pipes) ? pipes.length : 0} pipes
          {searchTerm && ` matching "${searchTerm}"`}
        </Alert>

        {/* Pipes Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Serial Number</TableCell>
                <TableCell>Color Grade</TableCell>
                <TableCell>Size Type</TableCell>
                <TableCell>Length (m)</TableCell>
                <TableCell>Weight (kg)</TableCell>
                <TableCell>Price (₹)</TableCell>
                <TableCell>Batch Number</TableCell>
                <TableCell>Manufacturing Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(filteredPipes) && filteredPipes.map((pipe, index) => (
                <TableRow key={pipe?._id || `pipe-${index}`}>
                  <TableCell>{pipe?.serialNumber || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={pipe?.colorGrade || 'N/A'}
                      size="small"
                      sx={{
                        bgcolor: getQualityColor(pipe?.colorGrade),
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  </TableCell>
                  <TableCell>{pipe?.sizeType || '-'}</TableCell>
                  <TableCell>{pipe?.length || '-'}</TableCell>
                  <TableCell>{pipe?.weight || '-'}</TableCell>
                  <TableCell>₹{pipe?.price || 0}</TableCell>
                  <TableCell>
                    {pipe?.batchNumber ? (
                      <Chip label={pipe.batchNumber} size="small" variant="outlined" />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {pipe?.manufacturingDate ? new Date(pipe.manufacturingDate).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => pipe?._id && navigate(`/pipes/${pipe._id}`)} disabled={!pipe?._id}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Pipe">
                      <IconButton size="small" onClick={() => pipe?._id && navigate(`/pipes/edit/${pipe._id}`)} disabled={!pipe?._id}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Pipe">
                      <IconButton size="small" onClick={() => pipe?._id && handleDelete(pipe._id)} color="error" disabled={!pipe?._id}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {(!Array.isArray(filteredPipes) || filteredPipes.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body1" color="textSecondary">
                      {!Array.isArray(filteredPipes) ? 'Loading pipes...' : 'No pipes found matching your criteria'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}

export default PipeList;