// frontend/src/pages/DeletedMembers.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Container,
    TextField,
    CircularProgress,
    Snackbar,
    Alert,
    Box,
    Typography,
    Paper,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Grid,
    Divider,
    Card,
    CardContent,
    Chip
} from '@mui/material';
import {
    Search as SearchIcon,
    Close as CloseIcon,
    Visibility as ViewIcon,
    RestoreFromTrash as RestoreIcon,
    Delete as DeleteIcon,
    FileDownload as DownloadIcon
} from '@mui/icons-material';
import {
    getDeletedMembers,
    restoreMember,
    permanentDeleteMember
} from '../services/memberService';
import api from '../services/api';
import { saveAs } from 'file-saver';

function fmtDate(d, locale = "gu-IN") {
    if (!d) return "-";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString(locale);
}

export default function DeletedMembers() {
    const [members, setMembers] = useState([]);
    const [filteredMembers, setFilteredMembers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);

    const [restoreOpen, setRestoreOpen] = useState(false);
    const [memberToRestore, setMemberToRestore] = useState(null);
    const [restoreRequestNumber, setRestoreRequestNumber] = useState('');
    const [restoreReason, setRestoreReason] = useState('');

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState(null);

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const userRole = localStorage.getItem('userRole');

    const showSnackbar = useCallback((message, severity) => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const loadMembers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getDeletedMembers();
            setMembers(response);
            setFilteredMembers(response);
        } catch (err) {
            showSnackbar('ડિલીટ કરેલા સભ્યો મેળવવામાં નિષ્ફળ: ' + (err.message || ''), 'error');
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        loadMembers();
    }, [loadMembers]);

    // Search filter
    useEffect(() => {
        let results = members.filter(member => {
            const searchLower = searchTerm.toLowerCase();
            return (
                member.head?.name?.toLowerCase().includes(searchLower) ||
                member.rationNo?.toLowerCase().includes(searchLower) ||
                member.mobile?.toLowerCase().includes(searchLower) ||
                String(member.uniqueNumber)?.toLowerCase().includes(searchLower)
            );
        });
        setFilteredMembers(results);
    }, [searchTerm, members]);

    const handleOpenDetails = (member) => {
        setSelectedMember(member);
        setDetailsOpen(true);
    };

    const handleCloseDetails = () => {
        setDetailsOpen(false);
        setSelectedMember(null);
    };

    const handleOpenRestore = (member) => {
        setMemberToRestore(member);
        setRestoreRequestNumber('');
        setRestoreReason('');
        setRestoreOpen(true);
    };

    const handleCloseRestore = () => {
        setRestoreOpen(false);
        setMemberToRestore(null);
        setRestoreRequestNumber('');
        setRestoreReason('');
    };

    const handleConfirmRestore = async () => {
        if (!memberToRestore) return;
        if (!restoreRequestNumber.trim()) {
            showSnackbar('રિક્વેસ્ટ નંબર જરૂરી છે. (Request Number is required)', 'error');
            return;
        }
        try {
            await restoreMember(memberToRestore._id, {
                requestNumber: restoreRequestNumber.trim(),
                reason: restoreReason.trim()
            });
            showSnackbar('સભ્ય સફળતાપૂર્વક પુનઃસ્થાપિત થયો', 'success');
            handleCloseRestore();
            await loadMembers();
        } catch (err) {
            showSnackbar(err || 'સભ્ય પુનઃસ્થાપિત કરવામાં નિષ્ફળ', 'error');
        }
    };

    const handleOpenDelete = (member) => {
        setMemberToDelete(member);
        setDeleteOpen(true);
    };

    const handleCloseDelete = () => {
        setDeleteOpen(false);
        setMemberToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!memberToDelete) return;
        try {
            await permanentDeleteMember(memberToDelete._id);
            showSnackbar('સભ્ય કાયમ માટે કાઢી નાખવામાં આવ્યો છે', 'success');
            handleCloseDelete();
            await loadMembers();
        } catch (err) {
            showSnackbar(err.message || 'સભ્ય કાઢી નાખવામાં નિષ્ફળ', 'error');
        }
    };

    const handleExportExcel = async () => {
        try {
            const response = await api.get('/export/deleted', { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, 'LuharSamaj_Deleted_Members.xlsx');
            showSnackbar('Excel ફાઇલ સફળતાપૂર્વક ડાઉનલોડ થઈ', 'success');
        } catch (err) {
            showSnackbar('Excel નિકાસ કરવામાં નિષ્ફળ.', 'error');
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get('/export/deleted/csv', { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
            saveAs(blob, 'LuharSamaj_Deleted_Members.csv');
            showSnackbar('CSV ફાઇલ સફળતાપૂર્વક ડાઉનલોડ થઈ', 'success');
        } catch (err) {
            showSnackbar('CSV નિકાસ કરવામાં નિષ્ફળ.', 'error');
        }
    };

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        કાઢી નાખેલ સભ્યો (Deleted Members)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                            variant="outlined"
                            placeholder="શોધો (નંબર, નામ, રેશનકાર્ડ, મોબાઈલ)..."
                            size="small"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm && (
                                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                )
                            }}
                            sx={{ minWidth: 320 }}
                        />
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<DownloadIcon />}
                            onClick={handleExportExcel}
                            sx={{ borderRadius: 2 }}
                        >
                            Excel ડાઉનલોડ
                        </Button>
                        <Button
                            variant="outlined"
                            color="success"
                            startIcon={<DownloadIcon />}
                            onClick={handleExportCSV}
                            sx={{ borderRadius: 2 }}
                        >
                            CSV ડાઉનલોડ
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                    <CircularProgress size={45} />
                </Box>
            ) : filteredMembers.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                    <Typography color="text.secondary">
                        {searchTerm ? 'કોઈ મેળ ખાતો સભ્ય મળ્યો નથી' : 'કોઈ ડિલીટ કરેલા સભ્યો ઉપલબ્ધ નથી'}
                    </Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>સભ્ય નંબર</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>મુખ્ય નામ</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>રેશનકાર્ડ નંબર</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>મોબાઈલ</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>ઝોન</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>ડિલીટ તારીખ</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>દ્વારા ડિલીટ</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'center' }}>ક્રિયાઓ</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredMembers
                                .sort((a, b) => Number(a.uniqueNumber || 0) - Number(b.uniqueNumber || 0))
                                .map((member) => (
                                    <TableRow key={member._id} hover>
                                        <TableCell>{member.uniqueNumber || 'N/A'}</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>{member.head?.name}</TableCell>
                                        <TableCell>{member.rationNo}</TableCell>
                                        <TableCell>{member.mobile}</TableCell>
                                        <TableCell>{member.zone?.name || 'N/A'}</TableCell>
                                        <TableCell>{fmtDate(member.deletedAt)}</TableCell>
                                        <TableCell>{member.deletedBy?.name || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="primary"
                                                    startIcon={<ViewIcon />}
                                                    onClick={() => handleOpenDetails(member)}
                                                    sx={{ borderRadius: 1.5 }}
                                                >
                                                    વિગતો
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="success"
                                                    startIcon={<RestoreIcon />}
                                                    onClick={() => handleOpenRestore(member)}
                                                    sx={{ borderRadius: 1.5 }}
                                                >
                                                    પુનઃસ્થાપિત
                                                </Button>
                                                {userRole === 'admin' && (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="error"
                                                        startIcon={<DeleteIcon />}
                                                        onClick={() => handleOpenDelete(member)}
                                                        sx={{ borderRadius: 1.5 }}
                                                    >
                                                        કાયમી ડિલીટ
                                                    </Button>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* --- Details Dialog --- */}
            <Dialog
                open={detailsOpen}
                onClose={handleCloseDetails}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                {selectedMember && (
                    <>
                        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>સભ્ય વિગતો - {selectedMember.head?.name}</span>
                            <IconButton onClick={handleCloseDetails} size="small">
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <Divider />
                        <DialogContent sx={{ py: 3 }}>
                            <Grid container spacing={3.5}>
                                {/* Membership Section */}
                                <Grid item xs={12}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: 'primary.main' }}>
                                        સભ્યપદ વિગતો (Membership Info)
                                    </Typography>
                                    <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'action.hover' }}>
                                        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="caption" color="text.secondary">સભ્ય નંબર (Sabhya Number)</Typography>
                                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedMember.uniqueNumber || 'N/A'}</Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="caption" color="text.secondary">જારી તારીખ (Issue Date)</Typography>
                                                    <Typography variant="body1">{fmtDate(selectedMember.issueDate)}</Typography>
                                                </Grid>
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                </Grid>

                                {/* Personal Info */}
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                                        પ્રાથમિક વિગતો (Primary Info)
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">મુખ્ય નામ</Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedMember.head?.name}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">રેશનકાર્ડ નંબર</Typography>
                                            <Typography variant="body1">{selectedMember.rationNo}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">મોબાઈલ નંબર</Typography>
                                            <Typography variant="body1">{selectedMember.mobile}</Typography>
                                        </Box>
                                        {selectedMember.additionalMobiles?.length > 0 && (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">વધારાના મોબાઈલ</Typography>
                                                <Typography variant="body1">{selectedMember.additionalMobiles.join(', ')}</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Grid>

                                {/* Location & Deletion Info */}
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                                        સરનામું અને ઝોન (Address & Zone)
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">ઝોન</Typography>
                                            <Typography variant="body1">{selectedMember.zone?.name || 'N/A'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">સરનામું</Typography>
                                            <Typography variant="body1">{selectedMember.address}</Typography>
                                        </Box>
                                    </Box>

                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'error.main' }}>
                                        ડિલીટ વિગતો (Deletion Info)
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">ડિલીટ તારીખ</Typography>
                                            <Typography variant="body1">{fmtDate(selectedMember.deletedAt)}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">દ્વારા ડિલીટ</Typography>
                                            <Typography variant="body1">{selectedMember.deletedBy?.name || 'N/A'}</Typography>
                                        </Box>
                                    </Box>
                                </Grid>

                                {/* Family Members */}
                                <Grid item xs={12}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: 'primary.main' }}>
                                        પરિવારના સભ્યો (Family Members) ({selectedMember.familyMembers?.length || 0})
                                    </Typography>
                                    {selectedMember.familyMembers && selectedMember.familyMembers.length > 0 ? (
                                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                                            <Table size="small">
                                                <TableHead sx={{ bgcolor: 'action.hover' }}>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 600 }}>નામ</TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>સંબંધ</TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>લિંગ</TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>ઉંમર</TableCell>
                                                        <TableCell sx={{ fontWeight: 600 }}>જન્મ તારીખ</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {selectedMember.familyMembers.map((fm, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell>{fm.name}</TableCell>
                                                            <TableCell>{fm.relation || 'N/A'}</TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={fm.gender === 'male' ? 'પુરુષ' : fm.gender === 'female' ? 'સ્ત્રી' : 'અન્ય'}
                                                                    size="small"
                                                                    color={fm.gender === 'male' ? 'primary' : fm.gender === 'female' ? 'secondary' : 'default'}
                                                                    variant="outlined"
                                                                />
                                                            </TableCell>
                                                            <TableCell>{fm.age || 'N/A'}</TableCell>
                                                            <TableCell>{fmtDate(fm.birthdate)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">કોઈ પરિવારના સભ્યો નથી.</Typography>
                                    )}
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <Divider />
                        <DialogActions sx={{ p: 2 }}>
                            <Button variant="outlined" onClick={handleCloseDetails} sx={{ borderRadius: 2 }}>બંધ કરો</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* --- Restore Confirmation Dialog --- */}
            <Dialog
                open={restoreOpen}
                onClose={handleCloseRestore}
                PaperProps={{ sx: { borderRadius: 3, p: 1, minWidth: 320 } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Restore Member</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <DialogContentText>
                            આ સભ્યને પુનઃસ્થાપિત કરવા માટે રિક્વેસ્ટ નંબર અને કારણ દાખલ કરો.
                        </DialogContentText>
                        <TextField
                            label="Request Number *"
                            value={restoreRequestNumber}
                            onChange={(e) => setRestoreRequestNumber(e.target.value)}
                            fullWidth
                            required
                            size="small"
                        />
                        <TextField
                            label="Reason"
                            value={restoreReason}
                            onChange={(e) => setRestoreReason(e.target.value)}
                            fullWidth
                            multiline
                            rows={2}
                            size="small"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button variant="outlined" onClick={handleCloseRestore} sx={{ borderRadius: 2 }}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleConfirmRestore}
                        sx={{ borderRadius: 2 }}
                        disabled={!restoreRequestNumber.trim()}
                    >
                        Restore
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- Permanent Delete Confirmation Dialog --- */}
            <Dialog
                open={deleteOpen}
                onClose={handleCloseDelete}
                PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Permanent Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ fontWeight: 500 }}>
                        Are you sure? This action cannot be undone.
                    </DialogContentText>
                    <DialogContentText sx={{ mt: 1, fontSize: '0.875rem' }}>
                        આ સભ્યનો તમામ ડેટા સિસ્ટમમાંથી કાયમ માટે કાઢી નાખવામાં આવશે.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button variant="outlined" onClick={handleCloseDelete} sx={{ borderRadius: 2 }}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleConfirmDelete} sx={{ borderRadius: 2 }}>Yes</Button>
                </DialogActions>
            </Dialog>

            {/* --- Snackbar --- */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Container>
    );
}