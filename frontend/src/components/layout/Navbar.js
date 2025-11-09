import { AppBar, Toolbar, Typography, Button, Box, IconButton, Menu, MenuItem, Tooltip, Avatar, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useContext, useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import NotificationCenter from '../notifications/NotificationCenter';
import { ColorModeContext } from '../../theme';
import OnlineStatus from './OnlineStatus';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('User');
  const [role, setRole] = useState('worker');
  const [menuEl, setMenuEl] = useState(null);
  const menuOpen = Boolean(menuEl);
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

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
      setRole('worker');
    }
  }, [navigate, location]);

  // Online/offline indicator
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const openMenu = (e) => setMenuEl(e.currentTarget);
  const closeMenu = () => setMenuEl(null);

  // Build link sets just once per role
  const links = useMemo(() => {
    const base = [
      { label: 'Pipes', path: '/pipes' },
      { label: 'Tasks', path: '/tasks' },
      { label: 'Sales', path: '/sales' },
    ];
    const managerOnly = [
      { label: 'Import Excel', path: '/pipes/import-excel' },
      { label: 'Mail', path: '/mail' },
      { label: 'Workers', path: '/workers' },
      { label: 'Pricing', path: '/pricing' },
    ];
    return role === 'manager' ? [...base, ...managerOnly] : base;
  }, [role]);

  const isActive = (path) => location.pathname.startsWith(path);

  // Don't show navbar on login page
  if (location.pathname === '/') {
    return null;
  }

  const userInitials = (userName || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <AppBar position="sticky" elevation={0} color="default" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
      <Toolbar sx={{ gap: 1 }}>
        <Typography
          variant="h6"
          component="div"
          sx={{ 
            flexGrow: 1, 
            cursor: 'pointer', 
            whiteSpace: 'nowrap', 
            fontWeight: 800, 
            color: 'text.primary',
            fontSize: { xs: '1rem', sm: '1.25rem' },
            '&:hover': {
              opacity: 0.8
            }
          }}
          onClick={() => {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const userRole = userData.role || 'worker';
            
            if (userRole === 'manager') {
              navigate('/dashboard');
            } else {
              navigate('/worker-dashboard');
            }
          }}
          aria-label="Go to dashboard"
        >
          Sri Balaji HDPE Pipes
        </Typography>

        {/* Desktop actions */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, alignItems: 'center' }}>
          {links.map((l) => (
            <Button
              key={l.path}
              color="inherit"
              onClick={() => navigate(l.path)}
              sx={{
                px: 1.5,
                borderRadius: 2,
                ...(isActive(l.path) && { bgcolor: 'action.selected', fontWeight: 700 }),
              }}
            >
              {l.label}
            </Button>
          ))}

          <OnlineStatus online={online} />

          <Tooltip title={theme.palette.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton color="inherit" onClick={colorMode.toggleColorMode} aria-label="toggle theme">
              {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>

          <NotificationCenter />

          <Tooltip title={userName}>
            <IconButton color="inherit" onClick={openMenu} aria-label="account menu" sx={{ ml: 0.5 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {userInitials}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu anchorEl={menuEl} open={menuOpen} onClose={closeMenu} keepMounted>
            {role === 'manager' ? (
              <MenuItem onClick={() => { navigate('/dashboard'); closeMenu(); }}>Manager Dashboard</MenuItem>
            ) : (
              <MenuItem onClick={() => { navigate('/worker-dashboard'); closeMenu(); }}>My Performance</MenuItem>
            )}
            <Divider />
            {role === 'manager' && (
              <MenuItem onClick={() => { navigate('/workers'); closeMenu(); }}>Workers</MenuItem>
            )}
            {role === 'manager' && (
              <MenuItem onClick={() => { navigate('/pricing'); closeMenu(); }}>Pricing</MenuItem>
            )}
            <MenuItem onClick={() => { navigate('/pipes'); closeMenu(); }}>Inventory</MenuItem>
            <MenuItem onClick={() => { navigate('/tasks'); closeMenu(); }}>Tasks</MenuItem>
            <MenuItem onClick={() => { navigate('/sales'); closeMenu(); }}>Sales</MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>Logout</MenuItem>
          </Menu>
        </Box>

        {/* Mobile menu */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
          <OnlineStatus online={online} />
          <Tooltip title={theme.palette.mode === 'dark' ? 'Light' : 'Dark'}>
            <IconButton color="inherit" onClick={colorMode.toggleColorMode} aria-label="toggle theme">
              {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
          <NotificationCenter />
          <IconButton color="inherit" onClick={openMenu} aria-label="open menu">
            <MenuIcon />
          </IconButton>
          <Menu anchorEl={menuEl} open={menuOpen} onClose={closeMenu} keepMounted>
            {links.map((l) => (
              <MenuItem key={l.path} onClick={() => { navigate(l.path); closeMenu(); }}>{l.label}</MenuItem>
            ))}
            <Divider />
            {role === 'manager' ? (
              <MenuItem onClick={() => { navigate('/dashboard'); closeMenu(); }}>Manager Dashboard</MenuItem>
            ) : (
              <MenuItem onClick={() => { navigate('/worker-dashboard'); closeMenu(); }}>My Performance</MenuItem>
            )}
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
