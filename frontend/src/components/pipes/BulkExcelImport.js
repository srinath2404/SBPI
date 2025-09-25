import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, Alert, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow, TextField, Pagination, Stack, MenuItem, FormControlLabel, Checkbox, Grid, InputLabel, Select, FormControl } from '@mui/material';
// ...existing code...
import api from '../../utils/api';

function BulkExcelImport() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState([]);
  const [sheetName, setSheetName] = useState('');
  const [commitResult, setCommitResult] = useState(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Bulk edit fields
  const [bulkEdit, setBulkEdit] = useState({
    colorGrade: '',
    sizeType: '',
    section: '',
    batchNumber: '',
    manufacturingDate: ''
  });
  
  // Apply to all flags
  const [applyToAll, setApplyToAll] = useState({
    colorGrade: false,
    sizeType: false,
    section: false,
    batchNumber: false,
    manufacturingDate: false
  });
  
  // Options for dropdowns
  const colorGrades = ['A', 'B', 'C', 'D'];
  const sizeTypes = ['1 inch', '1-1.4 inch', '2 inch', '2-1.2 inch', '3 inch', '4 inch'];
  const sections = ['A', 'B', 'C', 'D', 'E', 'F'];

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const valid = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
    if (!valid.includes(f.type) && !f.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Please select a valid Excel file (.xlsx/.xls/.csv)');
      return;
    }
    setError('');
    setFile(f);
    setPreview([]);
    setCommitResult(null);
  };

  const onPreview = async () => {
    if (!file) {
      setError('Please choose an Excel file first');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setPreview([]);
      setCommitResult(null);
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/pipes/preview-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSheetName(data.sheetName);
      setPreview((data.rows || []).map(r => ({
        serialNumber: r.serialNumber || '',
        colorGrade: r.colorGrade || '',
        sizeType: r.sizeType || '',
        section: r.section || 'A',
        length: r.length || 0,
        weight: r.weight || 0,
        manufacturingDate: r.manufacturingDate || new Date().toISOString().split('T')[0],
        batchNumber: r.batchNumber || '',
        validation: r.validation || { isValid: true, issues: [] },
        price: r.price || 0
      })));
      
      // Reset bulk edit fields when new data is loaded
      setBulkEdit({
        colorGrade: '',
        sizeType: '',
        section: '',
        batchNumber: '',
        manufacturingDate: new Date().toISOString().split('T')[0]
      });
      
      setApplyToAll({
        colorGrade: false,
        sizeType: false,
        section: false,
        batchNumber: false,
        manufacturingDate: false
      });
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to preview Excel');
    } finally {
      setLoading(false);
    }
  };

  const updateCell = (rowIdx, key, value) => {
    setPreview(prev => prev.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r));
  };

  // Apply selected row values to all rows for specific fields
  // Function to apply a row's values to all other rows
  const applyToAllRows = (sourceRowIdx, fields) => {
    if (sourceRowIdx < 0 || sourceRowIdx >= preview.length) return;
    
    const sourceRow = preview[sourceRowIdx];
    setPreview(prev => prev.map((row, i) => {
      if (i === sourceRowIdx) return row; // Skip the source row
      
      const updates = {};
      fields.forEach(field => {
        // Only apply fields that have values
        if (sourceRow[field] !== undefined) {
          updates[field] = sourceRow[field];
        }
      });
      
      return { ...row, ...updates };
    }));
    
    // Show success message
    setError(`Applied row ${sourceRowIdx + 1} values to all other rows`);
  };

  const onCommit = async () => {
    if (!preview.length) {
      setError('Nothing to import. Please preview first.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setCommitResult(null);
      const payload = { rows: preview.map(({ validation, price, ...rest }) => rest) };
      const { data } = await api.post('/inventory/commit-excel', payload);
      setCommitResult(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to import rows');
    } finally {
      setLoading(false);
    }
  };

  const fillDefaults = () => {
    // Quick helper: fill missing colorGrade/sizeType with safe defaults
    setPreview(prev => prev.map(r => ({
      ...r,
      colorGrade: r.colorGrade || 'A',
      sizeType: r.sizeType || '2 inch'
    })));
  };

  // Function to apply bulk edits to all rows
  const applyBulkEdit = () => {
    setPreview(prev => prev.map(row => {
      const updates = {};
      
      if (applyToAll.colorGrade && bulkEdit.colorGrade) {
        updates.colorGrade = bulkEdit.colorGrade;
      }
      
      if (applyToAll.sizeType && bulkEdit.sizeType) {
        updates.sizeType = bulkEdit.sizeType;
      }
      
      if (applyToAll.section && bulkEdit.section) {
        updates.section = bulkEdit.section;
      }
      
      if (applyToAll.batchNumber && bulkEdit.batchNumber) {
        updates.batchNumber = bulkEdit.batchNumber;
      }
      
      if (applyToAll.manufacturingDate && bulkEdit.manufacturingDate) {
        updates.manufacturingDate = bulkEdit.manufacturingDate;
      }
      
      return { ...row, ...updates };
    }));
    
    // Show success message
    setError(`Applied bulk edits to all rows`);
    
    // Reset checkboxes after applying
    setApplyToAll({
      colorGrade: false,
      sizeType: false,
      section: false,
      batchNumber: false,
      manufacturingDate: false
    });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Import Pipes from Excel (Preview, Edit, Commit)
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            From Excel you only need to provide serial number, Length (MTR), and Weight (KG). You can fill color grade, size type, section, batch, and date here before committing.
          </Typography>

          <input type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} />

          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={onPreview} disabled={loading || !file} startIcon={loading ? <CircularProgress size={18} /> : null}>
              {loading ? 'Processing…' : 'Preview'}
            </Button>
            <Button variant="contained" onClick={onCommit} disabled={loading || !preview.length}>
              Commit to Inventory
            </Button>
            {preview.length > 0 && (
              <Button variant="text" onClick={fillDefaults} disabled={loading}>
                Fill Defaults (Grade A, 2 inch)
              </Button>
            )}
          </Box>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {commitResult && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {commitResult.message} {commitResult.errors?.length ? `(with ${commitResult.errors.length} warnings)` : ''}
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {preview.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Apply to All Rows</Typography>
            <Grid container spacing={2}>
              {/* Color Grade */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Color Grade</InputLabel>
                  <Select
                    value={bulkEdit.colorGrade}
                    label="Color Grade"
                    onChange={(e) => setBulkEdit({...bulkEdit, colorGrade: e.target.value})}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {colorGrades.map(grade => (
                      <MenuItem key={grade} value={grade}>{grade}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={applyToAll.colorGrade}
                      onChange={(e) => setApplyToAll({...applyToAll, colorGrade: e.target.checked})}
                    />
                  }
                  label="Apply to all rows"
                />
              </Grid>
              
              {/* Size Type */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Size Type</InputLabel>
                  <Select
                    value={bulkEdit.sizeType}
                    label="Size Type"
                    onChange={(e) => setBulkEdit({...bulkEdit, sizeType: e.target.value})}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {sizeTypes.map(size => (
                      <MenuItem key={size} value={size}>{size}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={applyToAll.sizeType}
                      onChange={(e) => setApplyToAll({...applyToAll, sizeType: e.target.checked})}
                    />
                  }
                  label="Apply to all rows"
                />
              </Grid>
              
              {/* Section */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Section</InputLabel>
                  <Select
                    value={bulkEdit.section}
                    label="Section"
                    onChange={(e) => setBulkEdit({...bulkEdit, section: e.target.value})}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {sections.map(section => (
                      <MenuItem key={section} value={section}>{section}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={applyToAll.section}
                      onChange={(e) => setApplyToAll({...applyToAll, section: e.target.checked})}
                    />
                  }
                  label="Apply to all rows"
                />
              </Grid>
              
              {/* Batch Number */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Batch Number"
                  value={bulkEdit.batchNumber}
                  onChange={(e) => setBulkEdit({...bulkEdit, batchNumber: e.target.value})}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={applyToAll.batchNumber}
                      onChange={(e) => setApplyToAll({...applyToAll, batchNumber: e.target.checked})}
                    />
                  }
                  label="Apply to all rows"
                />
              </Grid>
              
              {/* Manufacturing Date */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Manufacturing Date"
                  type="date"
                  value={bulkEdit.manufacturingDate}
                  onChange={(e) => setBulkEdit({...bulkEdit, manufacturingDate: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={applyToAll.manufacturingDate}
                      onChange={(e) => setApplyToAll({...applyToAll, manufacturingDate: e.target.checked})}
                    />
                  }
                  label="Apply to all rows"
                />
              </Grid>
              
              {/* Apply Button */}
              <Grid item xs={12}>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={applyBulkEdit}
                  disabled={!Object.values(applyToAll).some(v => v)}
                >
                  Apply Changes
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {preview.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Preview: {sheetName} (showing {rowsPerPage} rows per page)
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>serialNumber</TableCell>
                    <TableCell>colorGrade</TableCell>
                    <TableCell>sizeType</TableCell>
                    <TableCell>section</TableCell>
                    <TableCell>length</TableCell>
                    <TableCell>weight</TableCell>
                    <TableCell>manufacturingDate</TableCell>
                    <TableCell>batchNumber</TableCell>
                    <TableCell>issues</TableCell>
                    <TableCell>price</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.slice((page - 1) * rowsPerPage, page * rowsPerPage).map((r, idx) => {
                    const actualIdx = idx + (page - 1) * rowsPerPage;
                    return (
                    <TableRow key={idx} sx={{ bgcolor: r.validation?.isValid ? 'inherit' : 'rgba(255,0,0,0.05)' }}>
                      <TableCell>
                        <TextField size="small" value={r.serialNumber} onChange={(e) => updateCell(actualIdx, 'serialNumber', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={r.colorGrade || ''}
                            onChange={(e) => updateCell(actualIdx, 'colorGrade', e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value=""><em>None</em></MenuItem>
                            {colorGrades.map(grade => (
                              <MenuItem key={grade} value={grade}>{grade}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={r.sizeType || ''}
                            onChange={(e) => updateCell(actualIdx, 'sizeType', e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value=""><em>None</em></MenuItem>
                            {sizeTypes.map(size => (
                              <MenuItem key={size} value={size}>{size}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={r.section || ''}
                            onChange={(e) => updateCell(actualIdx, 'section', e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value=""><em>None</em></MenuItem>
                            {sections.map(section => (
                              <MenuItem key={section} value={section}>{section}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" value={r.length} onChange={(e) => updateCell(actualIdx, 'length', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" value={r.weight} onChange={(e) => updateCell(actualIdx, 'weight', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="date" value={r.manufacturingDate || ''} onChange={(e) => updateCell(actualIdx, 'manufacturingDate', e.target.value)} InputLabelProps={{ shrink: true }} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" value={r.batchNumber || ''} onChange={(e) => updateCell(actualIdx, 'batchNumber', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color={r.validation?.isValid ? 'success.main' : 'error.main'}>
                          {r.validation?.isValid ? 'ok' : (r.validation?.issues || []).join(', ')}
                        </Typography>
                      </TableCell>
                      <TableCell>{r.price}</TableCell>
                      <TableCell>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          onClick={() => applyToAllRows(actualIdx, ['colorGrade', 'sizeType', 'section', 'batchNumber', 'manufacturingDate'])}
                        >
                          Apply to All
                        </Button>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </Box>
            
            <Stack spacing={2} sx={{ mt: 3, alignItems: 'center' }}>
              <Pagination 
                count={Math.ceil(preview.length / rowsPerPage)} 
                page={page} 
                onChange={(e, newPage) => setPage(newPage)} 
                color="primary" 
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2">Rows per page:</Typography>
                <TextField
                  select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(1); // Reset to first page when changing rows per page
                  }}
                  size="small"
                  sx={{ width: 80 }}
                >
                  {[5, 10, 25, 50, 100].map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <Typography variant="body2">
                  {preview.length > 0 ? `${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, preview.length)} of ${preview.length}` : '0 rows'}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default BulkExcelImport;
