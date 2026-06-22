// frontend/src/pages/AuditLogs.js
import React, { useEffect, useState, useCallback } from "react";
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  CircularProgress,
  TablePagination,
  TextField,
  InputAdornment,
  IconButton,
  Stack,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Divider,
  Grid,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { 
  Search, 
  Close, 
  Download, 
  Refresh, 
  Visibility, 
  ArrowForward,
  Person,
  CalendarToday,
  Category,
  Edit,
} from "@mui/icons-material";
import api from "../services/api";

// --- Helper Components ---

// ✅ Enhanced Changes Display for Detail Dialog
const DetailedChangesDisplay = ({ changes }) => {
  if (!changes || changes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
        કોઈ ફેરફાર નોંધાયેલ નથી
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {changes.map((change, i) => (
        <Card key={i} variant="outlined" sx={{ borderLeft: 4, borderColor: 'primary.main' }}>
          <CardContent>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              {change.fieldGujarati || change.field}
            </Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={5}>
                <Box sx={{ p: 1.5, bgcolor: 'error.lighter', borderRadius: 1, border: '1px dashed', borderColor: 'error.main' }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    પહેલાંની કિંમત:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
                    {change.before || '-'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowForward color="action" />
              </Grid>
              <Grid item xs={12} sm={5}>
                <Box sx={{ p: 1.5, bgcolor: 'success.lighter', borderRadius: 1, border: '1px dashed', borderColor: 'success.main' }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    નવી કિંમત:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
                    {change.after || '-'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};

// ✅ Compact Changes Display for Table View
const CompactChangesDisplay = ({ changes, changesSummary }) => {
  if (!changes || changes.length === 0) {
    return <Typography variant="body2" color="text.secondary">કોઈ ફેરફાર નથી</Typography>;
  }

  return (
    <Box>
      <Chip 
        label={changesSummary || `${changes.length} ફેરફાર${changes.length > 1 ? 'ો' : ''}`} 
        size="small" 
        color="info"
        sx={{ fontWeight: 500 }}
      />
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
        {changes.slice(0, 2).map(c => c.fieldGujarati || c.field).join(', ')}
        {changes.length > 2 && '...'}
      </Typography>
    </Box>
  );
};

// ✅ Action color helper mapping
const getActionColor = (action) => {
  switch (action?.toLowerCase()) {
    case 'create': return 'success';
    case 'delete': return 'error';
    case 'restore': return 'info';
    case 'permanent_delete': return 'error';
    case 'approve': return 'success';
    case 'reject': return 'error';
    default: return 'default';
  }
};

// --- Main Audit Logs Page Component ---
const AuditLogsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalLogs: 0 });
  
  // Detail Dialog States
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // State for filters
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ action: "", entityType: "" });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
        ...filters,
      };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);

      const res = await api.get("/audit", { params });
      setLogs(res.data.logs || []);
      setPagination(res.data.pagination || { currentPage: 1, totalPages: 1, totalLogs: 0 });
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(0);
  };
  
  const handleExport = async () => {
    try {
      const params = { search: searchTerm, ...filters };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);

      const res = await api.get('/export/audit', { params, responseType: 'blob' });
      
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit_logs.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export logs:", err);
    }
  };

  const handleViewDetails = async (log) => {
    setDetailOpen(true);
    setSelectedLog(log);
    
    // If we don't have formatted changes, fetch the full log details
    if (!log.formattedChanges) {
      setDetailLoading(true);
      try {
        const res = await api.get(`/audit/${log._id}`);
        setSelectedLog(res.data);
      } catch (err) {
        console.error("Error fetching log details:", err);
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const handleCloseDetails = () => {
    setDetailOpen(false);
    setSelectedLog(null);
  };

  // Mobile Card View
  const renderMobileCard = (log) => (
    <Card key={log._id} sx={{ mb: 2, borderRadius: 2 }} elevation={2}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Chip 
              label={log.actionGujarati || log.action} 
              size="small" 
              color={getActionColor(log.action)}
            />
            <Typography variant="caption" color="text.secondary">
              {log.formattedTimestamp || new Date(log.timestamp).toLocaleString("gu-IN")}
            </Typography>
          </Stack>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">યુઝર</Typography>
            <Typography variant="body2" fontWeight={500}>
              {log.userName || log.user?.name || 'સિસ્ટમ'}
            </Typography>
          </Box>

          {log.memberName && log.memberName !== 'N/A' && (
            <Box>
              <Typography variant="caption" color="text.secondary">સભ્ય</Typography>
              <Typography variant="body2" fontWeight={500}>
                {log.memberName}
              </Typography>
              {log.memberNumber && log.memberNumber !== 'N/A' && (
                <Typography variant="caption" color="text.secondary">
                  સભ્ય નંબર: {log.memberNumber}
                </Typography>
              )}
            </Box>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary">ફેરફાર</Typography>
            <Box sx={{ mt: 0.5 }}>
              <CompactChangesDisplay 
                changes={log.formattedChanges || log.changes} 
                changesSummary={log.changesSummary}
              />
            </Box>
          </Box>

          <Button 
            fullWidth 
            variant="outlined" 
            size="small" 
            startIcon={<Visibility />}
            onClick={() => handleViewDetails(log)}
          >
            વિગતવાર જુઓ
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>ઑડિટ લોગ્સ</Typography>
      
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            fullWidth
            variant="outlined"
            placeholder="યુઝર, ક્રિયા અથવા રિક્વેસ્ટ નંબર દ્વારા શોધો"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchLogs()}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
              endAdornment: searchTerm && (
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <Close fontSize="small" />
                </IconButton>
              )
            }}
          />
          <FormControl fullWidth sx={{ minWidth: 150 }}>
            <InputLabel>ક્રિયા</InputLabel>
            <Select name="action" value={filters.action} label="ક્રિયા" onChange={handleFilterChange}>
              <MenuItem value="">બધી ક્રિયાઓ</MenuItem>
              <MenuItem value="create">બનાવ્યું</MenuItem>
              <MenuItem value="update">અપડેટ</MenuItem>
              <MenuItem value="delete">કાઢી નાખ્યું</MenuItem>
              <MenuItem value="approve">મંજૂર</MenuItem>
              <MenuItem value="reject">નામંજૂર</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ minWidth: 150 }}>
            <InputLabel>એન્ટિટી</InputLabel>
            <Select name="entityType" value={filters.entityType} label="એન્ટિટી" onChange={handleFilterChange}>
              <MenuItem value="">બધી એન્ટિટી</MenuItem>
              <MenuItem value="Member">સભ્ય</MenuItem>
              <MenuItem value="Request">અરજી</MenuItem>
              <MenuItem value="Zone">ઝોન</MenuItem>
              <MenuItem value="User">યુઝર</MenuItem>
            </Select>
          </FormControl>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={fetchLogs} startIcon={<Refresh />}>
              {isMobile ? '' : 'રિફ્રેશ'}
            </Button>
            <Button variant="outlined" color="success" onClick={handleExport} startIcon={<Download />}>
              {isMobile ? '' : 'એક્સપોર્ટ'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {isMobile ? (
        // Mobile View
        <Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : logs.length > 0 ? (
            logs.map(log => renderMobileCard(log))
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <Typography>કોઈ લોગ્સ મળ્યા નથી</Typography>
            </Paper>
          )}
          {logs.length > 0 && (
            <TablePagination
              component="div"
              count={pagination.totalLogs}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage="પ્રતિ પૃષ્ઠ:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
            />
          )}
        </Box>
      ) : (
        // Desktop Table View
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>રિક્વેસ્ટ નંબર</TableCell>
                <TableCell>તારીખ અને સમય</TableCell>
                <TableCell>યુઝર</TableCell>
                <TableCell>ક્રિયા</TableCell>
                <TableCell>સભ્ય/એન્ટિટી</TableCell>
                <TableCell>ફેરફારો</TableCell>
                <TableCell align="center">વિગત</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log._id} hover>
                    <TableCell>
                      <Chip 
                        label={log.requestNumber || '-'} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.formattedTimestamp || new Date(log.timestamp).toLocaleString("gu-IN")}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {log.userName || log.user?.name || 'સિસ્ટમ'}
                      </Typography>
                      {log.userEmail && (
                        <Typography variant="caption" color="text.secondary">
                          {log.userEmail}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={log.actionGujarati || log.action} 
                        size="small" 
                        color={getActionColor(log.action)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {log.entityTypeGujarati || log.entityType}
                      </Typography>
                      {log.memberName && log.memberName !== 'N/A' && (
                        <>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {log.memberName}
                          </Typography>
                          {log.memberNumber && log.memberNumber !== 'N/A' && (
                            <Typography variant="caption" color="text.secondary">
                              #{log.memberNumber}
                            </Typography>
                          )}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <CompactChangesDisplay 
                        changes={log.formattedChanges || log.changes} 
                        changesSummary={log.changesSummary}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton 
                        size="small" 
                        onClick={() => handleViewDetails(log)}
                        color="primary"
                      >
                        <Visibility />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    કોઈ લોગ્સ મળ્યા નથી
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {logs.length > 0 && (
            <TablePagination
              component="div"
              count={pagination.totalLogs}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage="પ્રતિ પૃષ્ઠ:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
            />
          )}
        </TableContainer>
      )}

      {/* Detail Dialog */}
      <Dialog 
        open={detailOpen} 
        onClose={handleCloseDetails} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Edit color="primary" />
            <Typography variant="h6">ઑડિટ લોગ વિગત</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedLog ? (
            <Stack spacing={3}>
              {/* Header Info */}
              <Paper sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CalendarToday fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">તારીખ અને સમય</Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {selectedLog.formattedTimestamp || new Date(selectedLog.timestamp).toLocaleString("gu-IN")}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Person fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">યુઝર</Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {selectedLog.userName || selectedLog.user?.name || 'સિસ્ટમ'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Category fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">ક્રિયા</Typography>
                        <Typography variant="body2" fontWeight={500}>
                          <Chip 
                            label={selectedLog.actionGujarati || selectedLog.action} 
                            size="small"
                            color={getActionColor(selectedLog.action)}
                          />
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  {selectedLog.requestNumber && (
                    <Grid item xs={12} sm={6}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">રિક્વેસ્ટ નંબર</Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {selectedLog.requestNumber}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Member Info / Snapshot */}
              {selectedLog.snapshot ? (
                <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
                  <CardContent sx={{ pb: '16px !important' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, color: 'primary.main' }}>
                      સભ્ય વિગતો (Member Details Snapshot)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary" display="block">સભ્ય નામ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLog.snapshot.memberName || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary" display="block">સભ્ય નંબર</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLog.snapshot.uniqueNumber || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary" display="block">રેશન નંબર</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLog.snapshot.rationNo || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary" display="block">મોબાઇલ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLog.snapshot.mobile || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary" display="block">ઝોન</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLog.snapshot.zoneName || '-'}</Typography>
                      </Grid>
                      {selectedLog.snapshot.city && (
                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="caption" color="text.secondary" display="block">શહેર</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLog.snapshot.city}</Typography>
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>પરિવારના સભ્યો</Typography>
                        {selectedLog.snapshot.familyMemberNames && selectedLog.snapshot.familyMemberNames.length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {selectedLog.snapshot.familyMemberNames.map((name, i) => (
                              <Chip key={i} label={name} size="small" variant="outlined" />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary"><i>પરિવારના કોઈ સભ્ય નથી</i></Typography>
                        )}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ) : (
                selectedLog.memberName && selectedLog.memberName !== 'N/A' && (
                  <Paper sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>સભ્યની માહિતી</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">નામ</Typography>
                        <Typography variant="body2" fontWeight={500}>{selectedLog.memberName}</Typography>
                      </Grid>
                      {selectedLog.memberNumber && selectedLog.memberNumber !== 'N/A' && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">સભ્ય નંબર</Typography>
                          <Typography variant="body2" fontWeight={500}>{selectedLog.memberNumber}</Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                )
              )}

              {/* Changes */}
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Edit color="primary" />
                  કરેલા ફેરફારો
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <DetailedChangesDisplay changes={selectedLog.formattedChanges || selectedLog.changes} />
              </Box>
            </Stack>
          ) : (
            <Typography>કોઈ ડેટા ઉપલબ્ધ નથી</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails} variant="contained">બંધ કરો</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AuditLogsPage;