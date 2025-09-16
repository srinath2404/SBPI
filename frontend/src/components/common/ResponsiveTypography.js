import React from 'react';
import { Typography, useMediaQuery, useTheme } from '@mui/material';

/**
 * A responsive typography component that adjusts font size based on screen size
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.variant - Typography variant
 * @param {Object} props.sx - Additional sx props to apply
 * @returns {React.ReactElement} Responsive typography
 */
const ResponsiveTypography = ({ children, variant = 'body1', sx = {}, ...props }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Adjust font size based on screen size
  const getResponsiveVariant = () => {
    if (isMobile) {
      // Reduce size on mobile
      switch (variant) {
        case 'h1': return 'h2';
        case 'h2': return 'h3';
        case 'h3': return 'h4';
        case 'h4': return 'h5';
        case 'h5': return 'h6';
        case 'h6': return 'subtitle1';
        default: return variant;
      }
    }
    return variant;
  };

  return (
    <Typography
      variant={getResponsiveVariant()}
      sx={{
        ...sx
      }}
      {...props}
    >
      {children}
    </Typography>
  );
};

export default ResponsiveTypography;