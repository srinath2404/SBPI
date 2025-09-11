import { AppBar, Toolbar, Typography, Button, Box, IconButton, Menu, MenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('User');
  const [role, setRole] = useState('worker');
  const [menuEl, setMenuEl] = useState(null);
  const menuOpen = Boolean(menuEl);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && location.pathname !== '/') {
      navigate('/');
    }
    
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUserName(userData.name || 'User');
      setRole(userData.role || 'worker');
    } catch (error) {
      console.error('Error parsing user data:', error);
      setUserName('User');
    }
  }, [navigate, location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const openMenu = (e) => setMenuEl(e.currentTarget);
  const closeMenu = () => setMenuEl(null);

  // Don't show navbar on login page
  if (location.pathname === '/') {
    return null;
  }

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          SBPI Management
        </Typography>
        {/* Desktop actions */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: 'center' }}>
          {role === 'manager' && (
            <Button 
              color="inherit" 
              onClick={() => navigate('/dashboard')}
              sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
            >
              Dashboard
            </Button>
          )}
          <Button 
            color="inherit" 
            onClick={() => navigate('/worker-dashboard')}
            sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
          >
            My Performance
          </Button>
          <Button 
            color="inherit" 
            onClick={() => navigate('/pipes')}
            sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
          >
            Pipes
          </Button>
          {role === 'manager' && (
            <Button 
              color="inherit" 
              onClick={() => navigate('/pipes/bulk')}
              sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
            >
              Bulk Pipes
            </Button>
          )}
          {role === 'manager' && (
            <Button 
              color="inherit" 
              onClick={() => navigate('/workers')}
              sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
            >
              Workers
            </Button>
          )}
          {role === 'manager' && (
            <Button 
              color="inherit" 
              onClick={() => navigate('/pricing')}
              sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
            >
              Pricing
            </Button>
          )}
          <Button 
            color="inherit" 
            onClick={() => navigate('/ai-ocr-test')}
            sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
          >
            AI OCR Test
          </Button>
          <Button 
            color="inherit" 
            onClick={() => navigate('/sales')}
            sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
          >
            Sales
          </Button>
          <Typography sx={{ mx: 2 }}>
            {userName}
          </Typography>
          <Button 
            color="inherit" 
            onClick={handleLogout}
            sx={{ 
              '&:hover': { 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#ff4444'
              }
            }}
          >
            Logout
          </Button>
        </Box>

        {/* Mobile menu */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
          <Typography sx={{ mr: 1 }}>{userName}</Typography>
          <IconButton color="inherit" onClick={openMenu} aria-label="menu">
            <MenuIcon />
          </IconButton>
          <Menu anchorEl={menuEl} open={menuOpen} onClose={closeMenu}>
            <MenuItem onClick={() => { navigate('/worker-dashboard'); closeMenu(); }}>My Performance</MenuItem>
            <MenuItem onClick={() => { navigate('/pipes'); closeMenu(); }}>Pipes</MenuItem>
            {role === 'manager' && (
              <MenuItem onClick={() => { navigate('/pipes/bulk'); closeMenu(); }}>Bulk Pipes</MenuItem>
            )}
            <MenuItem onClick={() => { navigate('/sales'); closeMenu(); }}>Sales</MenuItem>
            {role === 'manager' && (
              <>
                <MenuItem onClick={() => { navigate('/dashboard'); closeMenu(); }}>Dashboard</MenuItem>
                <MenuItem onClick={() => { navigate('/workers'); closeMenu(); }}>Workers</MenuItem>
                <MenuItem onClick={() => { navigate('/pricing'); closeMenu(); }}>Pricing</MenuItem>
              </>
            )}
            <MenuItem onClick={() => { handleLogout(); closeMenu(); }}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;