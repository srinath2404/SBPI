import React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';

/**
 * A responsive container component that adjusts padding and width based on screen size
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.sx - Additional sx props to apply
 * @returns {React.ReactElement} Responsive container
 */
const ResponsiveContainer = ({ children, sx = {} }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        padding: isMobile ? theme.spacing(2) : theme.spacing(3),
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        ...sx
      }}
    >
      {children}
    </Box>
  );
};

export default ResponsiveContainer;