import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Paper, Box, Typography, TextField, Button, Grid,
  FormControl, InputLabel, Select, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, InputAdornment, IconButton,
  ToggleButtonGroup, ToggleButton
} from '@mui/material';
import { Search, Close, Download, Print } from '@mui/icons-material';
import api from '../services/api';
import { saveAs } from 'file-saver';

export default function AdultMembers() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Query Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState(''); // '' for All, 'male' for Male, 'female' for Female
  const [zones, setZones] = useState([]);

  const sortBy = 'memberName';
  const sortOrder = 'asc';

  // Load Zones
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await api.get('/zones/public');
        setZones(res.data || []);
      } catch (err) {
        console.error('Failed to load zones:', err);
      }
    };
    fetchZones();
  }, []);

  // Fetch Adult Members
  const fetchAdults = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        search: searchTerm,
        zone: zoneFilter,
        gender: genderFilter,
        sortBy,
        sortOrder
      };

      const response = await api.get('/members/adults', { params });
      setData(
        (response.data || [])
          .sort((a, b) => Number(a.uniqueNumber || 0) - Number(b.uniqueNumber || 0))
      );
    } catch (err) {
      console.error('Error fetching adult members:', err);
      setError(err.response?.data?.error || 'પુખ્ત સભ્યોની યાદી મેળવવામાં નિષ્ફળ.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, zoneFilter, genderFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchAdults();
  }, [fetchAdults]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleZoneChange = (e) => {
    setZoneFilter(e.target.value);
  };

  const handleGenderChange = (event, newGender) => {
    if (newGender !== null) {
      setGenderFilter(newGender);
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = {};
      if (zoneFilter) params.zone = zoneFilter;
      if (genderFilter) params.gender = genderFilter;
      const response = await api.get('/export/adults', { params, responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'LuharSamaj_Adult_Members_Report.xlsx');
    } catch (err) {
      console.error('Excel export failed:', err);
      alert('Excel નિકાસ કરવામાં નિષ્ફળ.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Page Header */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Typography variant="h5" fontWeight={700} color="primary" sx={{ mb: 2 }}>
          પુખ્ત સભ્યોની યાદી (ઉંમર ૧૮ કે તેથી વધુ)
        </Typography>

        {/* Filters and Actions */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              variant="outlined"
              placeholder="શોધો (નામ, રેશન નંબર, મોબાઇલ...)"
              size="small"
              fullWidth
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <Close fontSize="small" />
                  </IconButton>
                )
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="zone-filter-label">ઝોન ફિલ્ટર</InputLabel>
              <Select
                labelId="zone-filter-label"
                value={zoneFilter}
                onChange={handleZoneChange}
                label="ઝોન ફિલ્ટર"
              >
                <MenuItem value="">બધા ઝોન</MenuItem>
                {zones.map((zone) => (
                  <MenuItem key={zone._id} value={zone._id}>
                    {zone.number} - {zone.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <ToggleButtonGroup
              value={genderFilter}
              exclusive
              onChange={handleGenderChange}
              size="small"
              color="primary"
              fullWidth
            >
              <ToggleButton value="">બધા (All)</ToggleButton>
              <ToggleButton value="male">પુરુષ (Male)</ToggleButton>
              <ToggleButton value="female">સ્ત્રી (Female)</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1.5, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<Download />}
              onClick={handleExportExcel}
              fullWidth
            >
              Excel ડાઉનલોડ
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<Print />}
              onClick={handlePrint}
              fullWidth
            >
              પ્રિન્ટ
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Members Grid / Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : data.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <Typography color="text.secondary">કોઈ પુખ્ત સભ્યો મળ્યા નથી.</Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>સભ્ય નંબર</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>મુખ્ય નામ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>સભ્ય નામ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>લિંગ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ઉંમર</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>મોબાઇલ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ઝોન</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>સરનામું</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row._id} hover>
                    <TableCell>{row.uniqueNumber || 'N/A'}</TableCell>
                    <TableCell>{row.headName}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.memberName}</TableCell>
                    <TableCell>{row.gender === 'male' ? 'પુરુષ' : row.gender === 'female' ? 'સ્ત્રી' : 'અન્ય'}</TableCell>
                    <TableCell>{row.age}</TableCell>
                    <TableCell>{row.mobile}</TableCell>
                    <TableCell>{row.zone?.name || 'N/A'}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.address}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

        </Paper>
      )}
    </Container>
  );
}
