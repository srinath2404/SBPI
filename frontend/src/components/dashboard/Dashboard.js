import { useState, useEffect, useMemo } from 'react';
import { Box, Grid, Card, CardContent, Typography, Chip, Avatar, List, ListItem, ListItemText, ListItemAvatar, IconButton, Tooltip } from '@mui/material';
import { TrendingUp, TrendingDown, Person, Inventory, AttachMoney, Speed, Grade, Schedule } from '@mui/icons-material';
import Navbar from '../layout/Navbar';
import api, { checkConnection } from '../../utils/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

function Dashboard() {
  const [data, setData] = useState({ 
    rawMaterialUsage: [], 
    production: [], 
    sales: [], 
    revenue: [],
    currentMonthStats: {},
    workerPerformance: [],
    inventoryStatus: [],
    recentActivity: [],
    qualityMetrics: [],
    batchPerformance: [],
    summary: {}
  });
  const [productionStatus, setProductionStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const monthName = (m) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Math.max(0, Math.min(11, (m||1)-1))];

  const chartData = useMemo(() => {
    const base = Array.from({ length: 12 }, (_, i) => ({ month: monthName(i+1), m: i+1 }));
    const mapAgg = (arr, key, valueKey) => {
      const byMonth = Object.fromEntries((arr||[]).map(r => [r._id, r[valueKey]]));
      return base.map(row => ({ ...row, [key]: Number(byMonth[row.m] || 0) }));
    };
    const usage = mapAgg(data.rawMaterialUsage, 'weight', 'totalWeight');
    const prod = mapAgg(data.production, 'count', 'count');
    const sales = mapAgg(data.sales, 'count', 'count');
    const revenue = mapAgg(data.revenue, 'revenue', 'totalRevenue');
    return { usage, prod, sales, revenue };
  }, [data]);

  // Color scheme for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    fetchStats();
    fetchProductionStatus();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      fetchProductionStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/dashboard/data');
      const dashboardData = response.data || { 
        rawMaterialUsage: [], 
        production: [], 
        sales: [], 
        revenue: [],
        currentMonthStats: {},
        workerPerformance: [],
        inventoryStatus: [],
        recentActivity: [],
        qualityMetrics: [],
        batchPerformance: [],
        summary: {}
      };
      
      setData(dashboardData);
      
      // Store the last known dashboard data for offline use
      localStorage.setItem('last_dashboard_data', JSON.stringify(dashboardData));
      
      // If we got data and were in offline mode, try to reconnect
      if (localStorage.getItem('offline_mode')) {
        checkConnection();
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      
      // If we're offline, use cached data
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        const lastKnownData = localStorage.getItem('last_dashboard_data');
        if (lastKnownData) {
          try {
            setData(JSON.parse(lastKnownData));
            console.log('Using cached dashboard data');
          } catch (e) {
            console.error('Error parsing cached dashboard data:', e);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductionStatus = async () => {
    try {
      const response = await api.get('/dashboard/production-status');
      const productionData = response.data || {};
      
      setProductionStatus(productionData);
      
      // Store the last known production status for offline use
      localStorage.setItem('last_production_status', JSON.stringify(productionData));
      
    } catch (error) {
      console.error('Error fetching production status:', error);
      
      // If we're offline, use cached data
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        const lastKnownStatus = localStorage.getItem('last_production_status');
        if (lastKnownStatus) {
          try {
            setProductionStatus(JSON.parse(lastKnownStatus));
            console.log('Using cached production status data');
          } catch (e) {
            console.error('Error parsing cached production status data:', e);
          }
        }
      }
    }
  };

  const getTrendIcon = (current, previous) => {
    if (current > previous) return <TrendingUp color="success" />;
    if (current < previous) return <TrendingDown color="error" />;
    return <TrendingUp color="disabled" />;
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

  return (
    <Box>
      <Navbar />
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Speed /> Production Dashboard
          <Chip 
            label={productionStatus.status === 'active' ? 'Live' : 'Offline'} 
            color={productionStatus.status === 'active' ? 'success' : 'error'}
            size="small"
          />
        </Typography>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" component="div">
                      {data.summary?.totalPipes || 0}
                    </Typography>
                    <Typography variant="body2">Total Pipes</Typography>
                  </Box>
                  <Inventory sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" component="div">
                      {data.currentMonthStats?.totalPipes || 0}
                    </Typography>
                    <Typography variant="body2">This Month</Typography>
                  </Box>
                  <TrendingUp sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" component="div">
                      {data.summary?.totalWorkers || 0}
                    </Typography>
                    <Typography variant="body2">Active Workers</Typography>
                  </Box>
                  <Person sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" component="div">
                      ₹{(data.currentMonthStats?.totalWeight * 150 || 0).toLocaleString()}
                    </Typography>
                    <Typography variant="body2">Monthly Value</Typography>
                  </Box>
                  <AttachMoney sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Real-time Production Status */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule /> Today's Production
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                  <Box>
                    <Typography variant="h4" color="primary">
                      {productionStatus.todayProduction?.count || 0}
                    </Typography>
                    <Typography variant="body2">Pipes</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h4" color="success">
                      {productionStatus.todayProduction?.totalWeight?.toFixed(1) || 0}
                    </Typography>
                    <Typography variant="body2">Weight (kg)</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h4" color="warning">
                      {productionStatus.activeWorkers || 0}
                    </Typography>
                    <Typography variant="body2">Workers</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Grade /> Quality Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.qualityMetrics}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.qualityMetrics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getQualityColor(entry._id)} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 360 }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography color="textSecondary" gutterBottom>
                  Raw Material Usage (kg) by Month
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData.usage} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="weight" stroke="#1976d2" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 360 }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography color="textSecondary" gutterBottom>
                  Production Count by Month
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData.prod} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#4caf50" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Worker Performance & Recent Activity */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person /> Top Workers This Month
                </Typography>
                <List>
                  {data.workerPerformance?.slice(0, 5).map((worker, index) => (
                    <ListItem key={worker._id} sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: COLORS[index % COLORS.length] }}>
                          {worker.workerName?.charAt(0) || 'W'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={worker.workerName || 'Unknown Worker'}
                        secondary={`${worker.totalPipes} pipes • ${worker.totalWeight?.toFixed(1)}kg • ${(worker.avgQuality * 100).toFixed(0)}% quality`}
                      />
                      <Chip 
                        label={`${worker.efficiency?.toFixed(1)}/day`} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp /> Recent Activity (7 Days)
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.recentActivity} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#ff9800" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Revenue & Sales Charts */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 360 }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography color="textSecondary" gutterBottom>
                  Sales Count by Month
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData.sales} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#ff9800" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 360 }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography color="textSecondary" gutterBottom>
                  Revenue by Month
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData.revenue} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#9c27b0" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default Dashboard;