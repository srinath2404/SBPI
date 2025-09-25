import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './components/auth/Login';
import SellRequest from './components/sales/sellRequest';
import Dashboard from './components/dashboard/Dashboard';
import WorkerDashboard from './components/dashboard/WorkerDashboard';
import PipeList from './components/pipes/PipeList';
import AddPipe from './components/pipes/AddPipe';
import WorkerList from './components/workers/WorkerList';
import PriceChart from './components/pipes/PriceChart';
import ResetPassword from './components/auth/ResetPassword';
import BulkExcelImport from './components/pipes/BulkExcelImport';
import TaskPages from './components/tasks/TaskPages';
import MailApp from './components/mail/MailApp';
import OfflineIndicator from './components/common/OfflineIndicator';
import OfflineHandler from './components/common/OfflineHandler';
import { checkConnection } from './utils/api';
// import SellRequest from './components/sales/SellRequest';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

const PrivateRoute = ({children}) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" />;
};

const ManagerRoute = ({children}) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!token) return <Navigate to="/" />;
  return user.role === 'manager' ? children : <Navigate to="/pipes" />;
};

function App() {
  // Check connection status when app loads
  useEffect(() => {
    const checkConnectionStatus = async () => {
      await checkConnection();
    };
    
    checkConnectionStatus();
    
    // Set up periodic connection checks
    const interval = setInterval(checkConnectionStatus, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <OfflineIndicator />
        <OfflineHandler />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<ManagerRoute><Dashboard /></ManagerRoute>} />
          <Route path="/worker-dashboard" element={<PrivateRoute><WorkerDashboard /></PrivateRoute>} />
          <Route path="/pipes" element={<PrivateRoute><PipeList /></PrivateRoute>} />
          <Route path="/pipes/add" element={<PrivateRoute><AddPipe /></PrivateRoute>} />
          <Route path="/pipes/import-excel" element={<ManagerRoute><BulkExcelImport /></ManagerRoute>} />
          <Route path="/workers" element={<ManagerRoute><WorkerList /></ManagerRoute>} />
          <Route path="/pricing" element={<ManagerRoute><PriceChart /></ManagerRoute>} />
          <Route path="/sales" element={<PrivateRoute><SellRequest /></PrivateRoute>} />
          <Route path="/tasks/*" element={<PrivateRoute><TaskPages /></PrivateRoute>} />
          <Route path="/mail" element={<ManagerRoute><MailApp /></ManagerRoute>} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;