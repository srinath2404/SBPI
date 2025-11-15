import { useState, useEffect, useMemo } from 'react';
import { Box, Grid, Card, CardContent, Typography, Chip, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { AttachMoney, TrendingUp } from '@mui/icons-material';
import Navbar from '../layout/Navbar';
import api from '../../utils/api';
import { saveManagerDashboard, getManagerDashboard } from '../../utils/indexedDB';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, BarChart, Bar } from 'recharts';

const DEFAULT_DASHBOARD_DATA = {
  sales: [],
  revenue: [],
  currentMonthStats: {},
  summary: {},
};

const getCurrentUserEmail = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.email || null;
  } catch (e) {
    return null;
  }
};

function FinanceDashboard() {
  const [data, setData] = useState({
    ...DEFAULT_DASHBOARD_DATA,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('thisMonth');

  const monthName = (m) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Math.max(0, Math.min(11, (m||1)-1))];

  const timeRangeLabel = {
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    last3Months: 'Last 3 Months',
    thisYear: 'This Year',
    all: 'All Time',
  }[timeRange];

  const chartData = useMemo(() => {
    const base = Array.from({ length: 12 }, (_, i) => ({ month: monthName(i+1), m: i+1 }));

    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    const isInRange = (m) => {
      switch (timeRange) {
        case 'thisMonth':
          return m === currentMonth;
        case 'lastMonth':
          return m === ((currentMonth + 10) % 12) + 1;
        case 'last3Months': {
          const months = [0, 1, 2].map((offset) => ((currentMonth - 1 - offset + 12) % 12) + 1);
          return months.includes(m);
        }
        case 'thisYear':
        case 'all':
        default:
          return true;
      }
    };

    const mapAgg = (arr, key, valueKey) => {
      const byMonth = Object.fromEntries((arr || []).map((r) => [r._id, r[valueKey]]));
      return base.map((row) => ({
        ...row,
        [key]: isInRange(row.m) ? Number(byMonth[row.m] || 0) : 0,
      }));
    };

    const sales = mapAgg(data.sales, 'count', 'count');
    const revenue = mapAgg(data.revenue, 'revenue', 'totalRevenue');
    return { sales, revenue };
  }, [data, timeRange]);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStats = async () => {
    const email = getCurrentUserEmail();
    try {
      if (!isLoading) setIsLoading(true);

      if (navigator.onLine) {
        const response = await api.get('/dashboard/data');
        const dashboardData = {
          ...DEFAULT_DASHBOARD_DATA,
          ...(response.data || {}),
        };

        setData(dashboardData);

        if (email) {
          await saveManagerDashboard(email, dashboardData);
        }
      } else if (email) {
        const cached = await getManagerDashboard(email);
        if (cached?.data) {
          setData({ ...DEFAULT_DASHBOARD_DATA, ...cached.data });
        }
      }
    } catch (error) {
      console.error('Error fetching finance stats:', error);

      if (email) {
        try {
          const cached = await getManagerDashboard(email);
          if (cached?.data) {
            setData({ ...DEFAULT_DASHBOARD_DATA, ...cached.data });
          }
        } catch (e) {
          console.error('Error loading cached finance dashboard data:', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const aggregated = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    const isInRange = (monthNumber) => {
      const m = monthNumber;
      switch (timeRange) {
        case 'thisMonth':
          return m === currentMonth;
        case 'lastMonth':
          return m === ((currentMonth + 10) % 12) + 1;
        case 'last3Months': {
          const months = [0, 1, 2].map((offset) => ((currentMonth - 1 - offset + 12) % 12) + 1);
          return months.includes(m);
        }
        case 'thisYear':
        case 'all':
        default:
          return true;
      }
    };

    const revRecords = data.revenue || [];
    const salesRecords = data.sales || [];

    const filteredRev = revRecords.filter((r) => typeof r._id === 'number' && isInRange(r._id));
    const filteredSales = salesRecords.filter((r) => typeof r._id === 'number' && isInRange(r._id));

    const revenueSum = filteredRev.reduce((sum, r) => sum + (r.totalRevenue || 0), 0);
    const pipesSum = filteredSales.reduce((sum, r) => sum + (r.count || 0), 0);
    const totalRevenueYear = revRecords.reduce((sum, r) => sum + (r.totalRevenue || 0), 0);

    return {
      valueInRange: revenueSum,
      revenueInRange: revenueSum,
      pipesInRange: pipesSum,
      totalRevenue: totalRevenueYear,
    };
  }, [data.revenue, data.sales, timeRange]);

  const { valueInRange, revenueInRange, pipesInRange, totalRevenue } = aggregated;

  return (
    <Box>
      <Navbar />
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <AttachMoney /> Finance Dashboard
          <Chip 
            label={navigator.onLine ? 'Online' : 'Offline'} 
            color={navigator.onLine ? 'success' : 'warning'}
            size="small"
          />
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="finance-time-range-label">Period</InputLabel>
            <Select
              labelId="finance-time-range-label"
              id="finance-time-range"
              value={timeRange}
              label="Period"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="thisMonth">This Month</MenuItem>
              <MenuItem value="lastMonth">Last Month</MenuItem>
              <MenuItem value="last3Months">Last 3 Months</MenuItem>
              <MenuItem value="thisYear">This Year</MenuItem>
              <MenuItem value="all">All Time</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Summary cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
              <CardContent>
                <Typography variant="body2">Monthly Value ({timeRangeLabel})</Typography>
                <Typography variant="h4">
                  ₹{valueInRange.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
              <CardContent>
                <Typography variant="body2">Total Revenue (Year)</Typography>
                <Typography variant="h4">
                  ₹{totalRevenue.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <CardContent>
                <Typography variant="body2">Pipes ({timeRangeLabel})</Typography>
                <Typography variant="h4">
                  {pipesInRange}
                </Typography>
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

export default FinanceDashboard;
