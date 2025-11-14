// Centralized MUI theme with light/dark modes and design tokens
import { createContext, useMemo, useState } from 'react';
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

export const ColorModeContext = createContext({ mode: 'light', toggleColorMode: () => {} });

export const getDesignTokens = (mode) => ({
  palette: {
    mode,
    primary: { main: mode === 'light' ? '#4f46e5' : '#818cf8' }, // indigo
    secondary: { main: mode === 'light' ? '#22c55e' : '#34d399' }, // green
    success: { main: '#10b981' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    info: { main: '#0ea5e9' },
    background: {
      default: mode === 'light' ? '#f7f9fc' : '#0b1020',
      paper: mode === 'light' ? '#ffffff' : '#10172a',
    },
    divider: mode === 'light' ? 'rgba(15, 23, 42, 0.08)' : 'rgba(148, 163, 184, 0.2)',
    text: {
      primary: mode === 'light' ? '#0f172a' : '#e2e8f0',
      secondary: mode === 'light' ? '#334155' : '#94a3b8',
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            mode === 'light'
              ? 'radial-gradient(1000px 400px at 10% 0%, rgba(79,70,229,0.06), transparent), radial-gradient(800px 300px at 90% 10%, rgba(34,197,94,0.05), transparent)'
              : 'radial-gradient(1000px 400px at 10% 0%, rgba(129,140,248,0.15), transparent), radial-gradient(800px 300px at 90% 10%, rgba(52,211,153,0.12), transparent)',
          backgroundAttachment: 'fixed',
          transition: 'background-color 0.3s ease',
        },
        '*': { scrollbarColor: mode === 'light' ? '#cbd5e1 #f7f9fc' : '#334155 #0b1020' },
        '::selection': { background: 'rgba(79,70,229,0.25)' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow:
            mode === 'light'
              ? '0 10px 30px rgba(2,6,23,0.04)'
              : '0 12px 30px rgba(0,0,0,0.35)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(16,23,42,0.7)',
          borderBottom: `1px solid ${mode === 'light' ? 'rgba(2,6,23,0.06)' : 'rgba(148,163,184,0.2)'}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
  },
});

export const useModeTheme = () => {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');
  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((prev) => {
          const next = prev === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', next);
          return next;
        });
      },
    }),
    [mode]
  );
  const theme = useMemo(() => responsiveFontSizes(createTheme(getDesignTokens(mode))), [mode]);
  return [theme, colorMode];
};
