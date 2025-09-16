import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, Chip, Avatar, List, ListItem, ListItemText, ListItemAvatar, LinearProgress, Paper, CircularProgress, Button, Backdrop } from '@mui/material';
import { Person, TrendingUp, Speed, Grade, Assessment, CalendarToday, Work, Refresh } from '@mui/icons-material';
import Navbar from '../layout/Navbar';
import api from '../../utils/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

function WorkerDashboard() {
  const [data, setData] = useState({
    monthlyProduction: [],
    currentMonthStats: {},
    recentWork: [],
    qualityTrend: [],
    performance: {}
  });
  const [loadingStates, setLoadingStates] = useState({
    main: true,
    summary: false,
    quality: false,
    production: false,
    recentWork: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);

  useEffect(() => {
    fetchWorkerData();
  }, []);

  const fetchWorkerData = async () => {
    try {
      setIsLoading(true);
      setGlobalLoading(true);
      // Add a timestamp to prevent caching issues
      const response = await api.get('/dashboard/worker', {
        params: { _t: new Date().getTime() }
      });
      console.log('Worker dashboard data:', response.data);
      
      // Set default empty data structure if response data is missing
      const defaultData = {
        monthlyProduction: [],
        currentMonthStats: {},
        recentWork: [],
        qualityTrend: [],
        performance: {}
      };
      
      // Merge response data with default data to ensure all properties exist
      if (response.data && Object.keys(response.data).length > 0) {
        setData({
          ...defaultData,
          ...response.data
        });
      } else {
        console.warn('Worker dashboard returned empty data');
        setData(defaultData);
      }
    } catch (error) {
      console.error('Error fetching worker data:', error);
      // Set default data on error
      setData({
        monthlyProduction: [],
        currentMonthStats: {},
        recentWork: [],
        qualityTrend: [],
        performance: {}
      });
    } finally {
      setIsLoading(false);
      setGlobalLoading(false);
    }
  };
  
  // Section-specific data fetching functions
  const refreshSectionData = (section) => {
    switch(section) {
      case 'summary':
        fetchSummaryData();
        break;
      case 'quality':
        fetchQualityData();
        break;
      case 'production':
        fetchProductionData();
        break;
      case 'recentWork':
        fetchRecentWorkData();
        break;
      default:
        break;
    }
  };

  const fetchSummaryData = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, summary: true }));
      const response = await api.get('/dashboard/worker', {
        params: { _t: new Date().getTime() }
      });
      if (response.data) {
        setData(prev => ({
          ...prev,
          currentMonthStats: response.data.currentMonthStats || {},
          performance: response.data.performance || {}
        }));
      }
    } catch (error) {
      console.error('Error fetching summary data:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, summary: false }));
    }
  };

  const fetchQualityData = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, quality: true }));
      const response = await api.get('/dashboard/worker', {
        params: { _t: new Date().getTime() }
      });
      if (response.data) {
        setData(prev => ({
          ...prev,
          qualityTrend: response.data.qualityTrend || []
        }));
      }
    } catch (error) {
      console.error('Error fetching quality data:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, quality: false }));
    }
  };

  const fetchProductionData = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, production: true }));
      const response = await api.get('/dashboard/worker', {
        params: { _t: new Date().getTime() }
      });
      if (response.data) {
        setData(prev => ({
          ...prev,
          monthlyProduction: response.data.monthlyProduction || []
        }));
      }
    } catch (error) {
      console.error('Error fetching production data:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, production: false }));
    }
  };

  const fetchRecentWorkData = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, recentWork: true }));
      const response = await api.get('/dashboard/worker', {
        params: { _t: new Date().getTime() }
      });
      if (response.data) {
        setData(prev => ({
          ...prev,
          recentWork: response.data.recentWork || []
        }));
      }
    } catch (error) {
      console.error('Error fetching recent work data:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, recentWork: false }));
    }
  };

  const getQualityColor = (grade) => {
    switch(grade) {
      case 'A': return '#4caf50';
      case 'B': return '#ff9800';
      case 'C': return '#f44336';
      case 'D': return '#9c27b0';
      default: return '#757575';
    }
  };

  const getQualityLabel = (grade) => {
    switch(grade) {
      case 'A': return 'Excellent';
      case 'B': return 'Good';
      case 'C': return 'Fair';
      case 'D': return 'Poor';
      default: return 'Unknown';
    }
  };

  const monthName = (m) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Math.max(0, Math.min(11, (m||1)-1))];

  const chartData = data.monthlyProduction.map(item => ({
    month: monthName(item._id),
    pipes: item.count,
    weight: item.totalWeight,
    length: item.totalLength
  }));

  const qualityData = data.qualityTrend.map(item => ({
    month: item._id,
    gradeA: item.gradeA,
    gradeB: item.gradeB,
    gradeC: item.gradeC
  }));

  return (
    <Box>
      <Navbar />
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={globalLoading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Person /> My Performance Dashboard
        </Typography>
        
        {isLoading ? (
          <Box sx={{ width: '100%', mt: 4, textAlign: 'center' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Loading your performance data...</Typography>
          </Box>
        ) : data.monthlyProduction.length === 0 && Object.keys(data.currentMonthStats).length === 0 ? (
          <Paper sx={{ p: 3, mt: 4, textAlign: 'center', bgcolor: '#fff9f9' }}>
            <Typography variant="h6" color="error">
              No performance data available
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              We couldn't find any performance data for your account. This could be because you haven't produced any pipes yet.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              sx={{ mt: 2 }}
              onClick={fetchWorkerData}
            >
              Retry
            </Button>
          </Paper>
        ) : (
          <>
        {/* Performance Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Button 
                startIcon={<Refresh />} 
                size="small" 
                onClick={() => refreshSectionData('summary')}
                disabled={loadingStates.summary}
              >
                {loadingStates.summary ? 'Refreshing...' : 'Refresh Summary'}
              </Button>
            </Box>
            {loadingStates.summary && (
              <LinearProgress sx={{ mb: 2 }} />
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white', position: 'relative' }}>
              {loadingStates.summary && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.2)', zIndex: 1, borderRadius: 1 }}>
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                </Box>
              )}
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" component="div">
                      {data.currentMonthStats?.totalPipes || 0}
                    </Typography>
                    <Typography variant="body2">Pipes This Month</Typography>
                  </Box>
                  <Work sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.main', color: 'white', position: 'relative' }}>
              {loadingStates.summary && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.2)', zIndex: 1, borderRadius: 1 }}>
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                </Box>
              )}
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" component="div">
                      {data.currentMonthStats?.totalWeight?.toFixed(1) || 0}
                    </Typography>
                    <Typography variant="body2">Total Weight (kg)</Typography>
                  </Box>
                  <TrendingUp sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'warning.main', color: 'white', position: 'relative' }}>
              {loadingStates.summary && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.2)', zIndex: 1, borderRadius: 1 }}>
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                </Box>
              )}
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" component="div">
                      {data.performance?.efficiency?.toFixed(1) || 0}
                    </Typography>
                    <Typography variant="body2">Pipes/Day</Typography>
                  </Box>
                  <Speed sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'secondary.main', color: 'white', position: 'relative' }}>
              {loadingStates.summary && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.2)', zIndex: 1, borderRadius: 1 }}>
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                </Box>
              )}
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" component="div">
                      {data.performance?.qualityScore?.toFixed(1) || 0}%
                    </Typography>
                    <Typography variant="body2">Quality Score</Typography>
                  </Box>
                  <Grade sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quality Distribution & Performance Metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Button 
                startIcon={<Refresh />} 
                size="small" 
                onClick={() => refreshSectionData('quality')}
                disabled={loadingStates.quality}
              >
                {loadingStates.quality ? 'Refreshing...' : 'Refresh Quality Data'}
              </Button>
            </Box>
            {loadingStates.quality && (
              <LinearProgress sx={{ mb: 2 }} />
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Grade /> Quality Distribution This Month
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Grade A (Excellent)</Typography>
                    <Typography variant="body2">
                      {data.currentMonthStats?.qualityGradeA || 0} / {data.currentMonthStats?.totalPipes || 0}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={data.currentMonthStats?.totalPipes ? 
                      (data.currentMonthStats.qualityGradeA / data.currentMonthStats.totalPipes * 100) : 0} 
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#e0e0e0' }}
                    color="success"
                  />
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Grade B (Good)</Typography>
                    <Typography variant="body2">
                      {data.currentMonthStats?.qualityGradeB || 0} / {data.currentMonthStats?.totalPipes || 0}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={data.currentMonthStats?.totalPipes ? 
                      (data.currentMonthStats.qualityGradeB / data.currentMonthStats.totalPipes * 100) : 0} 
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#e0e0e0' }}
                    color="warning"
                  />
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Grade C (Fair)</Typography>
                    <Typography variant="body2">
                      {data.currentMonthStats?.qualityGradeC || 0} / {data.currentMonthStats?.totalPipes || 0}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={data.currentMonthStats?.totalPipes ? 
                      (data.currentMonthStats.qualityGradeC / data.currentMonthStats.totalPipes * 100) : 0} 
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#e0e0e0' }}
                    color="error"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assessment /> Performance Metrics
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Average Weight per Pipe
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {data.currentMonthStats?.avgWeight?.toFixed(1) || 0} kg
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Average Length per Pipe
                  </Typography>
                  <Typography variant="h4" color="success">
                    {data.currentMonthStats?.avgLength?.toFixed(1) || 0} m
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Total Length Produced
                  </Typography>
                  <Typography variant="h4" color="warning">
                    {data.currentMonthStats?.totalLength?.toFixed(1) || 0} m
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Monthly Production Chart */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Button 
                startIcon={<Refresh />} 
                size="small" 
                onClick={() => refreshSectionData('production')}
                disabled={loadingStates.production}
              >
                {loadingStates.production ? 'Refreshing...' : 'Refresh Production Data'}
              </Button>
            </Box>
            {loadingStates.production && (
              <LinearProgress sx={{ mb: 2 }} />
            )}
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarToday /> Monthly Production Trend
                </Typography>
                <Box sx={{ position: 'relative', height: 300 }}>
                  {loadingStates.production && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 1 }}>
                      <CircularProgress size={40} />
                    </Box>
                  )}
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="pipes" stroke="#1976d2" strokeWidth={2} name="Pipes" />
                      <Line type="monotone" dataKey="weight" stroke="#4caf50" strokeWidth={2} name="Weight (kg)" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quality Trend & Recent Work */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Button 
                startIcon={<Refresh />} 
                size="small" 
                onClick={() => refreshSectionData('recentWork')}
                disabled={loadingStates.recentWork}
              >
                {loadingStates.recentWork ? 'Refreshing...' : 'Refresh Recent Work'}
              </Button>
            </Box>
            {loadingStates.recentWork && (
              <LinearProgress sx={{ mb: 2 }} />
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp /> Quality Trend (3 Months)
                </Typography>
                <Box sx={{ position: 'relative', height: 250 }}>
                  {loadingStates.quality && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 1 }}>
                      <CircularProgress size={40} />
                    </Box>
                  )}
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={qualityData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="gradeA" stackId="a" fill="#4caf50" name="Grade A" />
                      <Bar dataKey="gradeB" stackId="a" fill="#ff9800" name="Grade B" />
                      <Bar dataKey="gradeC" stackId="a" fill="#f44336" name="Grade C" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Work /> Recent Work
                </Typography>
                <List sx={{ maxHeight: 250, overflow: 'auto', position: 'relative' }}>
                  {loadingStates.recentWork && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.7)', zIndex: 1 }}>
                      <CircularProgress size={24} />
                    </Box>
                  )}
                  {data.recentWork?.map((work, index) => (
                    <ListItem key={index} sx={{ px: 0, borderBottom: '1px solid #f0f0f0' }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: getQualityColor(work.colorGrade) }}>
                          {work.serialNumber?.charAt(0) || 'P'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${work.serialNumber} - ${work.sizeType}`}
                        secondary={`${work.length}m • ${work.weight}kg • ${work.manufacturingDate?.split('T')[0]}`}
                      />
                      <Chip 
                        label={work.colorGrade} 
                        size="small" 
                        sx={{ 
                          bgcolor: getQualityColor(work.colorGrade), 
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </ListItem>
                  ))}
                  {(!data.recentWork || data.recentWork.length === 0) && (
                    <ListItem>
                      <ListItemText
                        primary="No recent work found"
                        secondary="Start manufacturing pipes to see your work here"
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Performance Insights */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assessment /> Performance Insights
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f8f9fa' }}>
                      <Typography variant="h6" color="primary">
                        {data.performance?.efficiency?.toFixed(1) || 0}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Pipes per day (Efficiency)
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f8f9fa' }}>
                      <Typography variant="h6" color="success">
                        {data.performance?.qualityScore?.toFixed(1) || 0}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Quality Score (Grade A)
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f8f9fa' }}>
                      <Typography variant="h6" color="warning">
                        {data.currentMonthStats?.totalPipes || 0}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Total Pipes This Month
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        </>
        )}
      </Box>
    </Box>
  );
}

export default WorkerDashboard;
