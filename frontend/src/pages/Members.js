import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
    Container,
    Grid,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
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
    Collapse,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import {
    Add,
    Search,
    Close,
    Download,
    Description,
    Edit,
    Delete,
    ExpandMore,
    KeyboardArrowDown,
    KeyboardArrowUp,
    Visibility,
} from '@mui/icons-material';
import MemberForm from '../components/MemberForm';
import {
    getMembers,
    createMember,
    updateMember,
} from '../services/memberService';
import api, { deleteMember } from '../services/api';

// Helper function to format date
function fmtDate(d, locale = "gu-IN") {
    if (!d) return "-";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString(locale);
}

// Main Members Page Component
export default function Members() {
    const [members, setMembers] = useState([]);
    const [filteredMembers, setFilteredMembers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [currentMember, setCurrentMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [generatingPdfId, setGeneratingPdfId] = useState(null);
    const [selectedMemberId, setSelectedMemberId] = useState(null);



    // Data Loading & Snackbar
    const showSnackbar = useCallback((message, severity) => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const loadMembers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getMembers();
            const sortedMembers = response.sort((a, b) => (a.uniqueNumber || 0) - (b.uniqueNumber || 0));
            setMembers(sortedMembers);
            setFilteredMembers(sortedMembers);
        } catch (err) {
            showSnackbar('સભ્યો મેળવવામાં નિષ્ફળ: ' + (err.message || ''), 'error');
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        loadMembers();
    }, [loadMembers]);



    // Search and Filter Logic
    useEffect(() => {
        let results = members.filter(member => {
            const searchLower = searchTerm.toLowerCase();
            const familyMatches = member.familyMembers?.some(fm => 
                fm.name?.toLowerCase().includes(searchLower)
            ) || false;

            return (
                member.head?.name?.toLowerCase().includes(searchLower) ||
                member.rationNo?.toLowerCase().includes(searchLower) ||
                member.mobile?.toLowerCase().includes(searchLower) ||
                (member.additionalMobiles?.join(' ').toLowerCase() || "").includes(searchLower) ||
                member.address?.toLowerCase().includes(searchLower) ||
                String(member.uniqueNumber)?.toLowerCase().includes(searchLower) ||
                (member.zone?.name && member.zone.name.toLowerCase().includes(searchLower)) ||
                familyMatches
            );
        });
        results.sort((a, b) => (a.uniqueNumber || 0) - (b.uniqueNumber || 0));
        setFilteredMembers(results);
    }, [searchTerm, members]);

    // Statistics for the FILTERED view (Top bar)
    const stats = useMemo(() => {
        const totalFamilies = filteredMembers.length;
        let totalPeople = 0;
        let maleCount = 0;
        let femaleCount = 0;
        filteredMembers.forEach(member => {
            if (member.familyMembers && member.familyMembers.length > 0) {
                totalPeople += member.familyMembers.length;
                member.familyMembers.forEach(fm => {
                    if (fm.gender === 'male') maleCount++;
                    if (fm.gender === 'female') femaleCount++;
                });
            }
        });
        return { totalFamilies, totalPeople, maleCount, femaleCount };
    }, [filteredMembers]);

    // Statistics for the EXCEL EXPORT (all members)
    const exportStats = useMemo(() => {
        const totalFamilies = members.length;
        let totalPeople = 0;
        let maleCount = 0;
        let femaleCount = 0;
        members.forEach(member => {
            if (member.familyMembers && member.familyMembers.length > 0) {
                totalPeople += member.familyMembers.length;
                member.familyMembers.forEach(fm => {
                    if (fm.gender === 'male') maleCount++;
                    if (fm.gender === 'female') femaleCount++;
                });
            }
        });
        return { totalFamilies, totalPeople, maleCount, femaleCount };
    }, [members]);

    // Handlers
    const handlePreviewCard = async (memberId) => {
        try {
            setGeneratingPdfId(memberId);
            const res = await api.get(`/members/${memberId}/pdf?preview=true`, { responseType: "blob" });
            const blob = new Blob([res.data], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (err) {
            showSnackbar(`PDF પૂર્વાવલોકન બનાવવામાં નિષ્ફળ: ${err.message}`, "error");
        } finally {
            setGeneratingPdfId(null);
        }
    };

    const handleDownloadCard = async (member) => {
        try {
            setGeneratingPdfId(member._id);
            const res = await api.get(`/members/${member._id}/card/download`, { responseType: "blob" });
            const blob = new Blob([res.data], { type: "application/pdf" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `LGS-SK-${member.uniqueNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(link.href), 10000);
        } catch (err) {
            showSnackbar(`PDF ડાઉનલોડ કરવામાં નિષ્ફળ: ${err.message}`, "error");
        } finally {
            setGeneratingPdfId(null);
        }
    };

    const handleExportExcel = () => {
        try {
            // 1. Summary Stats Sheet
            const statsData = [
                { "આંકડા": "કુલ પરિવારો", "કુલ": exportStats.totalFamilies },
                { "આંકડા": "કુલ સભ્યો", "કુલ": exportStats.totalPeople },
                { "આંકડા": "પુરુષ", "કુલ": exportStats.maleCount },
                { "આંકડા": "સ્ત્રી", "કુલ": exportStats.femaleCount },
            ];
            const ws_stats = XLSX.utils.json_to_sheet(statsData);

            // 2. Family Summary Sheet - One row per family with counts
            const familySummaryData = members.map(member => {
                let maleCount = 0;
                let femaleCount = 0;
                member.familyMembers?.forEach(fm => {
                    if (fm.gender === 'male') maleCount++;
                    if (fm.gender === 'female') femaleCount++;
                });
                const totalFamily = member.familyMembers?.length || 0;

                return {
                    "સભ્ય નંબર": member.uniqueNumber || 'N/A',
                    "મુખ્ય નામ": member.head?.name || 'N/A',
                    "મોબાઇલ નંબર": member.mobile || 'N/A',
                    "શહેર": member.city || 'N/A',
                    "પુરુષ": maleCount,
                    "સ્ત્રી": femaleCount,
                    "કુલ સભ્યો": totalFamily
                };
            });

            // 3. All Members Detail Sheet - All family members with full details
            const allMembersData = [];
            members.forEach(family => {
                family.familyMembers?.forEach(member => {
                    allMembersData.push({
                        "યુનિક નંબર": family.uniqueNumber || 'N/A',
                        "રેશન કાર્ડ નંબર": family.rationNo || 'N/A',
                        "નામ": member.name || 'N/A',
                        "જાતિ": member.gender === 'male' ? 'પુરુષ' : member.gender === 'female' ? 'સ્ત્રી' : 'અન્ય',
                        "ઉંમર": member.age || 'N/A',
                        "સંબંધ": member.relation || 'N/A',
                        "મોબાઈલ": "",
                        "સરનામું": family.address || 'N/A',
                        "શહેર": family.city || 'N/A',
                        "ઝોન": family.zone?.name || 'N/A'
                    });
                });
                // Add empty row between families for better readability
                allMembersData.push({});
            });

            if (familySummaryData.length === 0) {
                showSnackbar('નિકાસ કરવા માટે કોઈ ડેટા નથી', 'warning');
                return;
            }

            // Create worksheets
            const ws_familySummary = XLSX.utils.json_to_sheet(familySummaryData);
            const ws_allMembers = XLSX.utils.json_to_sheet(allMembersData);

            // Create workbook and append sheets
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws_familySummary, "Family Summary");
            XLSX.utils.book_append_sheet(wb, ws_allMembers, "All Members Detail");
            XLSX.utils.book_append_sheet(wb, ws_stats, "Statistics");

            // Download file
            XLSX.writeFile(wb, "LuharSamaj_Members_Report.xlsx");
            showSnackbar('Excel સફળતાપૂર્વક નિકાસ થઈ', 'success');
        } catch (err) {
            console.error("Excel export failed:", err);
            showSnackbar('Excel નિકાસ કરવામાં નિષ્ફળ', 'error');
        }
    };

    const handleAddMember = () => {
        setCurrentMember(null);
        setOpenDialog(true);
    };

    const handleEditMember = (member) => {
        setCurrentMember(member);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setCurrentMember(null);
        setOpenDialog(false);
    };

    const handleSubmit = async (formData, requestNumber) => {
        try {
            await loadMembers();
            handleCloseDialog();
            showSnackbar(formData._id ? 'સભ્ય સફળતાપૂર્વક અપડેટ થયો' : 'સભ્ય સફળતાપૂર્વક ઉમેરાયો', 'success');
        } catch (err) {
            showSnackbar('સભ્યો અપડેટ કરવામાં નિષ્ફળ', 'error');
        }
    };

    const handleDeleteMember = async (memberId) => {
        if (!window.confirm('શું તમે આ સભ્યને કાઢી નાખવા ઈચ્છો છો?')) return;
        try {
            await deleteMember(memberId);
            showSnackbar('સભ્ય કાઢી નાખવામાં આવ્યો', 'success');
            await loadMembers();
        } catch (err) {
            showSnackbar(err.response?.data?.error || 'સભ્ય કાઢવામાં નિષ્ફળ', 'error');
        }
    };

    const handleToggleDetails = (memberId) => {
        setSelectedMemberId(prev => (prev === memberId ? null : memberId));
    };

    // Render
    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header and Actions */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <TextField
                        variant="outlined"
                        placeholder="સભ્યો શોધો..."
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                        sx={{ minWidth: 300, flexGrow: 1 }}
                    />
                    <Box sx={{ display: "flex", gap: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<Add />} onClick={handleAddMember}>
                            સભ્ય ઉમેરો
                        </Button>
                        <Button variant="outlined" color="success" startIcon={<Download />} onClick={handleExportExcel}>
                            Excelમાં નિકાસ કરો
                        </Button>
                    </Box>
                </Box>
                <Grid container spacing={2} sx={{ mt: 2, textAlign: 'center' }}>
                    <Grid item xs={6} sm={3}>
                        <Typography variant="h6">{stats.totalFamilies}</Typography>
                        <Typography color="text.secondary">કુલ પરિવારો</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Typography variant="h6">{stats.totalPeople}</Typography>
                        <Typography color="text.secondary">કુલ સભ્યો</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Typography variant="h6">{stats.maleCount}</Typography>
                        <Typography color="text.secondary">પુરુષ</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Typography variant="h6">{stats.femaleCount}</Typography>
                        <Typography color="text.secondary">સ્ત્રી</Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* Member Table */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress />
                </Box>
            ) : filteredMembers.length === 0 ? (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <Typography>
                        {searchTerm ? 'કોઈ મેળ ખાતો સભ્ય મળ્યો નથી' : 'કોઈ સભ્યો ઉપલબ્ધ નથી'}
                    </Typography>
                </Box>
            ) : (
                <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <TableContainer>
                        <Table stickyHeader aria-label="members table">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: '10px' }} />
                                    <TableCell sx={{ fontWeight: 'bold' }}>સભ્ય નંબર</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>મુખ્ય નામ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>મોબાઇલ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>શહેર</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>પુરુષ</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>સ્ત્રી</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>કુલ સભ્યો</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredMembers
                                    .sort((a, b) => Number(a.uniqueNumber || 0) - Number(b.uniqueNumber || 0))
                                    .map((member) => {
                                    const isSelected = selectedMemberId === member._id;
                                    const isGenerating = generatingPdfId === member._id;

                                    let maleCount = 0;
                                    let femaleCount = 0;

                                    member.familyMembers?.forEach(fm => {
                                        if (fm.gender === 'male') {
                                            maleCount++;
                                        }
                                        if (fm.gender === 'female') {
                                            femaleCount++;
                                        }
                                    });

                                    const totalFamily = member.familyMembers?.length || 0;

                                    return (
                                        <React.Fragment key={member._id}>
                                            <TableRow
                                                hover
                                                onClick={() => handleToggleDetails(member._id)}
                                                sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }}
                                            >
                                                <TableCell>
                                                    <IconButton aria-label="expand row" size="small">
                                                        {isSelected ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                                    </IconButton>
                                                </TableCell>
                                                <TableCell>{member.uniqueNumber || 'N/A'}</TableCell>
                                                <TableCell component="th" scope="row">
                                                    {member.head?.name}
                                                </TableCell>
                                                <TableCell>{member.mobile || 'N/A'}</TableCell>
                                                <TableCell>{member.city || 'N/A'}</TableCell>
                                                <TableCell align="center">{maleCount}</TableCell>
                                                <TableCell align="center">{femaleCount}</TableCell>
                                                <TableCell align="center">{totalFamily}</TableCell>
                                            </TableRow>

                                            <TableRow>
                                                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                                                    <Collapse in={isSelected} timeout="auto" unmountOnExit>
                                                        <Box sx={{ margin: 1, p: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
                                                            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                                                મુખ્ય વ્યક્તિની માહિતી
                                                            </Typography>
                                                            <Grid container spacing={1} sx={{ mb: 2 }}>
                                                                <Grid item xs={12} sm={6}>
                                                                    <Typography variant="body2">
                                                                        <strong>નામ:</strong> {member.head?.name}
                                                                    </Typography>
                                                                </Grid>
                                                                
                                                                <Grid item xs={12} sm={6}>
                                                                    <Typography variant="body2">
                                                                        <strong>સભ્ય નંબર:</strong> {member.uniqueNumber}
                                                                    </Typography>
                                                                </Grid>
                                                            </Grid>

                                                            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                                                સરનામું અને સંપર્ક
                                                            </Typography>
                                                            <Grid container spacing={1} sx={{ mb: 2 }}>
                                                                <Grid item xs={12} sm={6}>
                                                                    <Typography variant="body2">
                                                                        <strong>રેશન નંબર:</strong> {member.rationNo}
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid item xs={12} sm={6}>
                                                                    <Typography variant="body2">
                                                                        <strong>મોબાઇલ:</strong> {member.mobile || 'N/A'}
                                                                    </Typography>
                                                                </Grid>
                                                                {member.additionalMobiles && member.additionalMobiles.length > 0 && (
                                                                    <Grid item xs={12} sm={6}>
                                                                        <Typography variant="body2">
                                                                            <strong>મોબાઇલ:</strong> {member.additionalMobiles.join(', ')}
                                                                        </Typography>
                                                                    </Grid>
                                                                )}
                                                                <Grid item xs={12}>
                                                                    <Typography variant="body2">
                                                                        <strong>સરનામું:</strong> {member.address}
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid item xs={6} sm={4}>
                                                                    <Typography variant="body2">
                                                                        <strong>શહેર:</strong> {member.city || 'N/A'}
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid item xs={6} sm={4}>
                                                                    <Typography variant="body2">
                                                                        <strong>પિનકોડ:</strong> {member.pincode || 'N/A'}
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid item xs={12} sm={4}>
                                                                    <Typography variant="body2">
                                                                        <strong>ઝોન:</strong> {member.zone?.name || 'N/A'}
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid item xs={12} sm={6}>
                                                                    <Typography variant="body2">
                                                                        <strong>જારી તારીખ:</strong> {fmtDate(member.issueDate)}
                                                                    </Typography>
                                                                </Grid>
                                                            </Grid>

                                                            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                                                પરિવારના સભ્યો ({member.familyMembers?.length || 0})
                                                            </Typography>
                                                            {member.familyMembers && member.familyMembers.length > 0 ? (
                                                                <Box>
                                                                    {member.familyMembers.map((fm, idx) => (
                                                                        <Accordion key={idx} sx={{ mb: 1 }} defaultExpanded={idx === 0}>
                                                                            <AccordionSummary expandIcon={<ExpandMore />}>
                                                                                <Typography variant="body2">
                                                                                    {fm.name} ({fm.relation})
                                                                                </Typography>
                                                                            </AccordionSummary>
                                                                            <AccordionDetails sx={{ backgroundColor: '#fafafa' }}>
                                                                                <Grid container spacing={1}>
                                                                                    <Grid item xs={6}>
                                                                                        <Typography variant="body2">
                                                                                            <strong>સબંધ:</strong> {fm.relation}
                                                                                        </Typography>
                                                                                    </Grid>
                                                                                    <Grid item xs={6}>
                                                                                        <Typography variant="body2">
                                                                                            <strong>લિંગ:</strong> {fm.gender === 'male' ? 'પુરુષ' : fm.gender === 'female' ? 'સ્ત્રી' : 'અન્ય'}
                                                                                        </Typography>
                                                                                    </Grid>
                                                                                    <Grid item xs={6}>
                                                                                        <Typography variant="body2">
                                                                                            <strong>જન્મતારીખ:</strong> {fmtDate(fm.birthdate)}
                                                                                        </Typography>
                                                                                    </Grid>
                                                                                    <Grid item xs={6}>
                                                                                        <Typography variant="body2">
                                                                                            <strong>ઉંમર:</strong> {fm.age}
                                                                                        </Typography>
                                                                                    </Grid>
                                                                                </Grid>
                                                                            </AccordionDetails>
                                                                        </Accordion>
                                                                    ))}
                                                                </Box>
                                                            ) : (
                                                                <Typography variant="body2" sx={{ mb: 2 }}>
                                                                    કોઈ પરિવારના સભ્યો ઉમેરાયા નથી.
                                                                </Typography>
                                                            )}

                                                            <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-start' }}>
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    startIcon={isGenerating ? <CircularProgress size={14} /> : <Visibility />}
                                                                    onClick={() => handlePreviewCard(member._id)}
                                                                    disabled={isGenerating}
                                                                >
                                                                    👁️ Preview PDF
                                                                </Button>
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="primary"
                                                                    startIcon={isGenerating ? <CircularProgress size={14} /> : <Download />}
                                                                    onClick={() => handleDownloadCard(member)}
                                                                    disabled={isGenerating}
                                                                >
                                                                    ⬇️ Download PDF
                                                                </Button>
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="secondary"
                                                                    startIcon={<Edit />}
                                                                    onClick={() => handleEditMember(member)}
                                                                >
                                                                    Edit
                                                                </Button>
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    startIcon={<Delete />}
                                                                    onClick={() => handleDeleteMember(member._id)}
                                                                    color="error"
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </Box>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>

                </Paper>
            )}

            {/* Dialogs and Snackbar */}
            <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
                <DialogTitle>{currentMember ? 'સભ્ય સંપાદિત કરો' : 'નવો સભ્ય ઉમેરો'}</DialogTitle>
                <DialogContent dividers>
                    <MemberForm onSubmit={handleSubmit} memberToEdit={currentMember} loading={false} error={null} existingMembers={members} />
                </DialogContent>
            </Dialog>
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">{snackbar.message}</Alert>
            </Snackbar>
        </Container>
    );
}