import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, Alert, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow, TextField, Pagination, Stack, MenuItem } from '@mui/material';
import api from '../../utils/api';
import Navbar from '../layout/Navbar';

function BulkExcelImport() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState([]);
  const [sheetName, setSheetName] = useState('');
  const [commitResult, setCommitResult] = useState(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
      const { data } = await api.post('/inventory/preview-excel', formData, {
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
        manufacturingDate: r.manufacturingDate || '',
        batchNumber: r.batchNumber || '',
        validation: r.validation || { isValid: true, issues: [] },
        price: r.price || 0
      })));
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
  const applyToAllRows = (sourceRowIdx, fields) => {
    if (sourceRowIdx < 0 || sourceRowIdx >= preview.length) return;
    
    const sourceRow = preview[sourceRowIdx];
    setPreview(prev => prev.map((row, i) => {
      if (i === sourceRowIdx) return row; // Skip the source row
      
      const updates = {};
      fields.forEach(field => {
        if (sourceRow[field] !== undefined) {
          updates[field] = sourceRow[field];
        }
      });
      
      return { ...row, ...updates };
    }));
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

  return (
    <>
      <Navbar />
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
                  {preview.slice((page - 1) * rowsPerPage, page * rowsPerPage).map((r, idx) => (
                    <TableRow key={idx} sx={{ bgcolor: r.validation?.isValid ? 'inherit' : 'rgba(255,0,0,0.05)' }}>
                      <TableCell>
                        <TextField size="small" value={r.serialNumber} onChange={(e) => updateCell(idx, 'serialNumber', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" value={r.colorGrade} onChange={(e) => updateCell(idx, 'colorGrade', e.target.value)} placeholder="A/B/C/D" />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" value={r.sizeType} onChange={(e) => updateCell(idx, 'sizeType', e.target.value)} placeholder="e.g., 2 inch" />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" value={r.section} onChange={(e) => updateCell(idx, 'section', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" value={r.length} onChange={(e) => updateCell(idx, 'length', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="number" value={r.weight} onChange={(e) => updateCell(idx, 'weight', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" value={r.manufacturingDate} onChange={(e) => updateCell(idx, 'manufacturingDate', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" value={r.batchNumber} onChange={(e) => updateCell(idx, 'batchNumber', e.target.value)} />
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
                          onClick={() => applyToAllRows(idx, ['colorGrade', 'sizeType', 'section', 'batchNumber', 'manufacturingDate'])}
                        >
                          Apply to All
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
    </>
  );
}

export default BulkExcelImport;
