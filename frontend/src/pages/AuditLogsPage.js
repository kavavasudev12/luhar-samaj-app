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
  Collapse,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import {
  Search,
  Close,
  Download,
  Refresh,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from "@mui/icons-material";
import api from "../services/api";

// --- Helper Components ---

// ✅ MOVED: Helper to format date, e.g., "DD/MM/YYYY"
const formatDate = (dateString) => {
  if (!dateString) return 'ઉપલબ્ધ નથી';
  try {
    return new Date(dateString).toLocaleDateString('gu-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return dateString; // fallback if date is invalid
  }
};

/**
 * ✅ NEW: Helper component to display head member details.
 */
const HeadDisplay = ({ head }) => {
  if (!head || typeof head !== 'object') {
    return <Typography variant="body2" color="text.secondary" component="span"><i>(ખાલી)</i></Typography>;
  }

  return (
    <Box sx={{ p: 1, border: '1px solid rgba(0, 0, 0, 0.1)', borderRadius: 1, display: 'inline-block', minWidth: 200 }}>
      <Typography variant="body2" component="span" sx={{ display: 'block' }}>
        <strong>{head.name || 'નામ નથી'}</strong>
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1.5, mt: 0.5 }}>
        જન્મ તારીખ: {formatDate(head.birthdate)} | 
        ઉંમર: {head.age || 'ઉપલબ્ધ નથી'} | 
        લિંગ: {head.gender || 'ઉપલબ્ધ નથી'}
      </Typography>
    </Box>
  );
};


/**
 * Helper component to display a list of family members with full details.
 */
const FamilyMembersDisplay = ({ members }) => {
  if (!Array.isArray(members) || members.length === 0) {
    return <Typography variant="body2" color="text.secondary" component="span"><i>(ખાલી)</i></Typography>;
  }

  return (
    <Box component="ul" sx={{ m: 0, p: 0, pl: 2, listStyleType: 'decimal' }}>
      {members.map((member, index) => {
        if (!member) return null;
        if (typeof member === "string") {
          return (
            <Box component="li" key={index} sx={{ mb: 0.5 }}>
              <Typography variant="body2" component="span">
                <strong>{member}</strong>
              </Typography>
            </Box>
          );
        }
        return (
          <Box component="li" key={index} sx={{ mb: 1.5 }}>
            <Typography variant="body2" component="span" sx={{ display: 'block' }}>
              <strong>{member.name || 'નામ નથી'}</strong>
              {member.relation ? ` (${member.relation})` : ''}
            </Typography>
            {(member.birthdate || member.age || member.gender) && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1.5 }}>
                જન્મ તારીખ: {formatDate(member.birthdate)} | 
                ઉંમર: {member.age || 'ઉપલબ્ધ નથી'} | 
                લિંગ: {member.gender || 'ઉપલબ્ધ નથી'}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
};


/**
 * Renders simple 'before' and 'after' values.
 */
const renderValue = (value) => {
  const chipStyles = { 
    whiteSpace: 'normal', 
    height: 'auto', 
    minHeight: '22px',
    p: '2px 6px',
    alignItems: 'flex-start'
  };

  // 1. If value is null or undefined, show as 'empty'
  if (value === null || typeof value === 'undefined') {
    return <Typography variant="body2" color="text.secondary" component="span"><i>(ખાલી)</i></Typography>;
  }

  // 2. If value is an object or array, stringify it
  if (typeof value === 'object') {
    return <Chip label={JSON.stringify(value)} size="small" variant="outlined" sx={chipStyles} />;
  }
  
  // 3. For strings, numbers, booleans
  return <Chip label={String(value)} size="small" variant="outlined" sx={chipStyles} />;
};


// ✅ UPDATED: This component now conditionally renders HeadDisplay and FamilyMembersDisplay.
const ChangesDisplay = ({ changes }) => {
  if (!changes) {
    return <Typography variant="body2" color="text.secondary">કોઈ ફેરફારો નોંધાયેલા નથી.</Typography>;
  }

  const changesArray = Array.isArray(changes) ? changes : Object.entries(changes).map(([field, values]) => ({
      field,
      before: values.before,
      after: values.after
  }));
  
  if (changesArray.length === 0) {
      return <Typography variant="body2" color="text.secondary">કોઈ ફેરફારો નોંધાયેલા નથી.</Typography>;
  }

  const getFieldLabel = (field) => {
    switch (field) {
      case 'head.name':
      case 'name':
        return 'મુખ્ય નામ';
      case 'rationNo':
        return 'રેશન કાર્ડ નંબર';
      case 'mobile':
        return 'મોબાઇલ નંબર';
      case 'address':
        return 'સરનામું';
      case 'city':
        return 'શહેર';
      case 'zone':
        return 'ઝોન';
      case 'familyMembers':
        return 'પરિવારના સભ્યો';
      case 'uniqueNumber':
        return 'સભ્ય નંબર';
      case 'pincode':
        return 'પિનકોડ';
      case 'additionalMobiles':
        return 'વધારાના મોબાઇલ';
      default:
        return field;
    }
  };

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>ક્ષેત્ર</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>પહેલાં</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>પછી</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {changesArray.map((change, i) => (
            <TableRow key={i}>
              <TableCell component="th" scope="row" sx={{ verticalAlign: 'top' }}>
                <strong>{getFieldLabel(change.field)}</strong>
              </TableCell>
              
              {/* --- THIS IS THE KEY CHANGE --- */}
              {change.field === 'familyMembers' ? (
                <>
                  <TableCell sx={{ textDecoration: 'line-through', verticalAlign: 'top' }}>
                    <FamilyMembersDisplay members={change.before} />
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    <FamilyMembersDisplay members={change.after} />
                  </TableCell>
                </>
              ) : change.field === 'head' ? ( // ✅ NEW: Added 'head' field check
                <>
                  <TableCell sx={{ textDecoration: 'line-through', verticalAlign: 'top' }}>
                    <HeadDisplay head={change.before} />
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    <HeadDisplay head={change.after} />
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell sx={{ textDecoration: 'line-through', verticalAlign: 'top' }}>
                    {renderValue(change.before)}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    {renderValue(change.after)}
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};


// --- Helper function to get entity/member name (UNCHANGED) ---
const getDisplayName = (log) => {
  if (log.snapshot?.memberName) {
    return log.snapshot.memberName;
  }
  if (log.memberId?.head?.name) {
    return log.memberId.head.name;
  }
  if (log.changes) {
    const changesArray = Array.isArray(log.changes) ? log.changes : Object.entries(log.changes).map(([field, values]) => ({
      field,
      before: values.before,
      after: values.after
    }));
    const nameField = changesArray.find(c => c.field === 'name' || c.field === 'head.name');
    if (nameField) {
      if (log.action === 'delete' && nameField.before) {
        return `(કાઢી નાખેલ: ${nameField.before})`;
      }
      if (nameField.after) {
        return nameField.after;
      }
      if (nameField.before) {
        return nameField.before; 
      }
    }
  }
  return `(${log.entityType})`;
}

// --- Collapsible Row Component (UNCHANGED) ---
const LogEntryRow = ({ log }) => {
  const [open, setOpen] = useState(false);
  const displayName = getDisplayName(log);

  const getActionLabel = (action) => {
    switch(action) {
      case 'create': return 'નવો સભ્ય ઉમેર્યો';
      case 'update': return 'સભ્ય માહિતી સુધારી';
      case 'delete': return 'સોફ્ટ ડિલીટ';
      case 'restore': return 'સભ્ય પુનઃસ્થાપિત';
      case 'permanent_delete': return 'કાયમી ડિલીટ';
      case 'approve': return 'મંજૂર';
      case 'reject': return 'નામંજૂર';
      default: return action;
    }
  };

  const getActionColor = (action) => {
    switch(action) {
      case 'create': return 'success';
      case 'delete': return 'error';
      case 'restore': return 'info';
      case 'update': return 'default';
      case 'permanent_delete': return 'error';
      default: return 'default';
    }
  };


  return (
    <React.Fragment>
      <TableRow 
        hover 
        onClick={() => setOpen(!open)} 
        sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }}
      >
        <TableCell sx={{ width: '10px' }}>
          <IconButton aria-label="expand row" size="small">
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell><Chip label={log.requestNumber} size="small" variant="outlined"/></TableCell>
        <TableCell>{new Date(log.timestamp).toLocaleString("gu-IN")}</TableCell>
        <TableCell>{log.user?.name || 'સિસ્ટમ'}</TableCell>
        <TableCell><Chip label={getActionLabel(log.action)} size="small" color={getActionColor(log.action)} /></TableCell>
        <TableCell>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: displayName ? 600 : 'normal' }}>
              {displayName}
            </Typography>
            {(log.snapshot?.uniqueNumber || log.memberId?.uniqueNumber) && (
              <Typography variant="caption" color="text.secondary" display="block">
                સભ્ય નંબર : {log.snapshot?.uniqueNumber || log.memberId?.uniqueNumber}
              </Typography>
            )}
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 1, p: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 2 }}>
              {log.snapshot && (
                <Card variant="outlined" sx={{ mb: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                  <CardContent sx={{ pb: '16px !important' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, color: 'primary.main' }}>
                      સભ્ય વિગતો (Member Details Snapshot)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary" display="block">સભ્ય નામ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.snapshot.memberName || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary" display="block">સભ્ય નંબર</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.snapshot.uniqueNumber || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary" display="block">રેશન નંબર</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.snapshot.rationNo || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary" display="block">મોબાઇલ</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.snapshot.mobile || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary" display="block">ઝોન</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.snapshot.zoneName || '-'}</Typography>
                      </Grid>
                      {log.snapshot.city && (
                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="caption" color="text.secondary" display="block">શહેર</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.snapshot.city}</Typography>
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>પરિવારના સભ્યો</Typography>
                        {log.snapshot.familyMemberNames && log.snapshot.familyMemberNames.length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {log.snapshot.familyMemberNames.map((name, i) => (
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
              )}
              <Typography variant="subtitle2" gutterBottom component="div" sx={{ mb: 1, fontWeight: 600 }}>
                ફેરફારો (Field Changes)
              </Typography>
              <ChangesDisplay changes={log.changes} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};


// --- Main Audit Logs Page Component ---

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalLogs: 0 });
  
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
      // This logic must be matched in the /export/audit route!
      Object.keys(params).forEach(key => !params[key] && delete params[key]);

      const res = await api.get("/audit", { params }); // This calls the auditLogs.js route
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
  
  //
  // --- 🔻🔻 MODIFIED handleExport 🔻🔻 ---
  //
  const handleExport = async () => {
      try {
        // We no longer need format: 'csv'
        const params = { search: searchTerm, ...filters };
        Object.keys(params).forEach(key => !params[key] && delete params[key]);

        // This calls the exports.js route
        const res = await api.get('/export/audit', { params, responseType: 'blob' });
        
        // --- FIX 1: Change blob type to match Excel ---
        const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // --- FIX 2: Change file extension to .xlsx ---
        a.download = 'audit_logs.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

      } catch (err) {
          console.error("Failed to export logs:", err);
      }
  };
  //
  // --- 🔺🔺 END OF MODIFICATION 🔺🔺 ---
  //

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>વિનંતી પૃષ્ઠ</Typography>
        
        <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="વપરાશકર્તા, ક્રિયા, અથવા ઓડિટ # દ્વારા શોધો"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchLogs()}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                        endAdornment: searchTerm && <IconButton size="small" onClick={() => setSearchTerm('')}><Close fontSize="small" /></IconButton>
                    }}
                />
                <FormControl fullWidth><InputLabel>ક્રિયા</InputLabel>
                    <Select name="action" value={filters.action} label="ક્રિયા" onChange={handleFilterChange}>
                        <MenuItem value="">બધી ક્રિયાઓ</MenuItem>
                        <MenuItem value="create">બનાવ્યું</MenuItem>
                        <MenuItem value="update">અપડેટ</MenuItem>
                        <MenuItem value="delete">કાઢી નાખ્યું</MenuItem>
                        <MenuItem value="restore">પુનઃસ્થાપિત</MenuItem> 
                    </Select>
                </FormControl>
                <FormControl fullWidth><InputLabel>એન્ટિટી પ્રકાર</InputLabel>
                    <Select name="entityType" value={filters.entityType} label="એન્ટિટી પ્રકાર" onChange={handleFilterChange}>
                        <MenuItem value="">બધી એન્ટિટીઓ</MenuItem>
                        <MenuItem value="Member">સભ્ય</MenuItem>
                        <MenuItem value="Request">વિનંતી</MenuItem>
                        <MenuItem value="Zone">ઝોન</MenuItem>
                        <MenuItem value="User">વપરાશકર્તા</MenuItem>
                    </Select>
                </FormControl>
                <Stack direction="row" spacing={1}>
                    <Button variant="contained" onClick={fetchLogs} startIcon={<Refresh />}>તાજું કરો</Button>
                    <Button variant="outlined" color="success" onClick={handleExport} startIcon={<Download />}>નિકાસ કરો</Button>
                </Stack>
            </Stack>
        </Paper>

        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell /> {/* Empty cell for expand icon */}
                        <TableCell>વિનંતી નંબર</TableCell>
                        <TableCell>સમય</TableCell>
                        <TableCell>વપરાશકર્તા</TableCell>
                        <TableCell>ક્રિયા</TableCell>
                        <TableCell>એન્ટિટી / સભ્ય</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
                    ) : logs.length > 0 ? (
                        logs.map((log) => (
                          <LogEntryRow key={log._id} log={log} />
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={6} align="center">કોઈ લોગ્સ મળ્યા નથી</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
            
            <TablePagination
                component="div"
                count={pagination.totalLogs}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} // <-- FIX: e.guit -> e.target.value
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage="પ્રતિ પૃષ્ઠ પંક્તિઓ:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} માંથી ${count !== -1 ? count : `${to} થી વધુ`}`}
            />
        </TableContainer>
    </Container>
  );
};

export default AuditLogsPage;