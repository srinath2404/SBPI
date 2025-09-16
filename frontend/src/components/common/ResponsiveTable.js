import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Typography,
  Divider
} from '@mui/material';

/**
 * A responsive table component that switches between table and card views based on screen size
 * @param {Object} props - Component props
 * @param {Array} props.columns - Array of column definitions with { id, label, format } properties
 * @param {Array} props.data - Array of data objects
 * @param {Object} props.sx - Additional sx props to apply
 * @returns {React.ReactElement} Responsive table
 */
const ResponsiveTable = ({ columns, data, sx = {} }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Regular table view for larger screens
  const tableView = (
    <TableContainer component={Paper} variant="outlined" sx={{ ...sx }}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.id} align={column.align || 'left'}>
                <strong>{column.label}</strong>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column) => (
                <TableCell key={`${rowIndex}-${column.id}`} align={column.align || 'left'}>
                  {column.format ? column.format(row[column.id], row) : row[column.id]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Card view for mobile screens
  const cardView = (
    <Box sx={{ width: '100%', ...sx }}>
      {data.map((row, rowIndex) => (
        <Card key={rowIndex} sx={{ mb: 2 }}>
          <CardContent>
            {columns.map((column, colIndex) => (
              <React.Fragment key={`${rowIndex}-${column.id}`}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {column.label}
                  </Typography>
                  <Typography variant="body2">
                    {column.format ? column.format(row[column.id], row) : row[column.id]}
                  </Typography>
                </Box>
                {colIndex < columns.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  return isMobile ? cardView : tableView;
};

export default ResponsiveTable;