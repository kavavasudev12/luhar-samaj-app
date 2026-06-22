// frontend/src/pages/Zones.js
import React, { useState, useEffect } from 'react';
import {
  Container, Button, Grid, Card, CardContent, Typography, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TableContainer, Paper,
  Table, TableHead, TableRow, TableCell, TableBody, TableFooter, Box
} from '@mui/material';
import { PeopleAlt, Download } from '@mui/icons-material';
import ZoneForm from '../components/ZoneForm';
import api from '../services/api';

function Zones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);

  // State for the members detail dialog
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState(null);
  const [selectedZoneForDetails, setSelectedZoneForDetails] = useState(null);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await api.get('/zones');
      setZones(response.data.map(z => ({ ...z, id: z._id })));
    } catch (err) {
      console.error('Error fetching zones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShowMembers = async (zone) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setSelectedZoneForDetails(zone);
    setDetailsData(null);
    try {
      const response = await api.get(`/zones/${zone.id}/people`);
      setDetailsData(response.data);
    } catch (err) {
      console.error('Error fetching people for zone:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setDetailsData(null);
    setSelectedZoneForDetails(null);
  };
  
  // ✅ **FIXED**: Sticker generation logic is now complete.
  const handleGenerateStickers = async (zone) => {
    try {
      const res = await api.get(`/zones/${zone.id}/stickers`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stickers_${zone.name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Sticker generation failed:', err);
      alert('Sticker generation failed. This zone may not have any members.');
    }
  };

  // ✅ **NEW**: Excel export handler for the zone details.
  const handleExportDetailsToExcel = async () => {
    if (!selectedZoneForDetails) return;
    try {
      const res = await api.get(`/export/zone/${selectedZoneForDetails.id}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `members_${selectedZoneForDetails.name}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Excel export failed:', err);
      alert('Excel export failed. This zone may not have any members.');
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Zone Management</Typography>
      <Button variant="outlined" color="primary" sx={{ mb: 3 }} onClick={() => { setSelectedZone(null); setShowForm(true); }}>
        Add New Zone
      </Button>
      {showForm && <ZoneForm zone={selectedZone} onClose={() => { setShowForm(false); setSelectedZone(null); }} onSave={() => { setShowForm(false); fetchZones(); }} />}

      {loading ? (<CircularProgress />) : (
        <Grid container spacing={2}>
          {zones.map((zone) => (
            <Grid item xs={12} sm={6} md={4} key={zone.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{zone.name}</Typography>
                  <Typography>Zone Number: {zone.number}</Typography>
                  <Typography>Total People: {zone.totalPeople || 0}</Typography>
                  <Button size="small" color="secondary" sx={{ mt: 1, mr: 1 }} onClick={() => handleShowMembers(zone)} startIcon={<PeopleAlt />}>Show Members</Button>
                  <Button size="small" color="primary" sx={{ mt: 1, mr: 1 }} onClick={() => handleGenerateStickers(zone)}>Stickers</Button>
                  <Button size="small" sx={{ mt: 1, mr: 1 }} onClick={() => { setSelectedZone(zone); setShowForm(true); }}>Edit</Button>
                  <Button size="small" color="error" sx={{ mt: 1 }} onClick={async () => { if (window.confirm('Are you sure you want to delete this zone?')) { try { await api.delete(`/zones/${zone.id}`); fetchZones(); } catch (err) { alert('Cannot delete zone with assigned members.'); } } }}>Delete</Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={detailsOpen} onClose={handleCloseDetails} fullWidth maxWidth="md">
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Members in Zone: {selectedZoneForDetails?.name}
            {/* ✅ **NEW**: Excel Export Button added to the dialog */}
            <Button
              variant="contained"
              color="success"
              startIcon={<Download />}
              onClick={handleExportDetailsToExcel}
              disabled={!detailsData || detailsLoading}
            >
              Export to Excel
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {detailsLoading ? <CircularProgress /> : !detailsData ? <Typography>No member data found for this zone.</Typography> : (
            <TableContainer component={Paper}>
              <Table stickyHeader>
                <TableHead><TableRow><TableCell>Family Head Name</TableCell><TableCell align="right">Total Male</TableCell><TableCell align="right">Total Female</TableCell><TableCell align="right">Total Members</TableCell></TableRow></TableHead>
                <TableBody>{detailsData.heads.map((family) => (<TableRow hover key={family.id}><TableCell>{family.headName}</TableCell><TableCell align="right">{family.male}</TableCell><TableCell align="right">{family.female}</TableCell><TableCell align="right"><strong>{family.total}</strong></TableCell></TableRow>))}</TableBody>
                <TableFooter><TableRow sx={{ '& > *': { fontWeight: 'bold', fontSize: '1rem' } }}><TableCell>Grand Total</TableCell><TableCell align="right">{detailsData.totals.male}</TableCell><TableCell align="right">{detailsData.totals.female}</TableCell><TableCell align="right">{detailsData.totals.total}</TableCell></TableRow></TableFooter>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions><Button onClick={handleCloseDetails}>Close</Button></DialogActions>
      </Dialog>
    </Container>
  );
}

export default Zones;