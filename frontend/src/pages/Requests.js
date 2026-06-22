// frontend/src/pages/Requests.js
import React, { useEffect, useState, useCallback } from "react";
import {
  Container,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
  InputAdornment,
  useMediaQuery,
  useTheme,
  Box,
  Chip,
  Grid,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
} from "@mui/material";
import {
  Check,
  Close,
  Search,
  Visibility,
  ExpandMore,
  Edit,
  Add,
} from "@mui/icons-material";
// Import all functions from 'services/api.js'
// --- FIX APPLIED: Removed 'api,' which was unused ---
import {
  getRequests,
  approveRequest,
  declineRequest,
  getPublicZones, // Use the function from api.js
  updateRequest,
} from "../services/api";

// --- Helper Functions ---
function calcAgeFromDOB(dob) {
  if (!dob) return undefined;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function fmtDate(d, locale = "gu-IN") {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString(locale);
}

// --- Main Requests Page Component ---
export default function Requests() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [approveOpen, setApproveOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sabhyaNo, setSabhyaNo] = useState("");
  const [requestNumber, setRequestNumber] = useState(""); // 🔹 NEW: State for manual request number
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [zones, setZones] = useState([]);
  const [zoneMap, setZoneMap] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Edit Mode States
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    headName: "",
    rationNo: "",
    mobile: "",
    address: "",
    city: "",
    pincode: "",
    zone: "",
    uniqueNumber: "",
    issueDate: "",
    familyMembers: [],
  });
  const [additionalMobiles, setAdditionalMobiles] = useState([]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const calculateAge = (dateStr) => {
    if (!dateStr) return "";
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const startEdit = (req) => {
    setDetailRequest(req);
    const data = getRequestData(req);
    setEditForm({
      headName: data.headName === "-" ? "" : data.headName || "",
      rationNo: data.rationNo === "-" ? "" : data.rationNo || "",
      mobile: data.mobile === "-" ? "" : data.mobile || "",
      address: data.address === "-" ? "" : data.address || "",
      city: data.city === "-" ? "" : data.city || "",
      pincode: data.pincode === "-" ? "" : data.pincode || "",
      zone: data.zone ? (typeof data.zone === "object" ? data.zone._id : data.zone) : "",
      uniqueNumber: req.uniqueNumber || "",
      issueDate: req.issueDate ? new Date(req.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      familyMembers: data.familyMembers ? data.familyMembers.map(fm => ({
        name: fm.name || "",
        relation: fm.relation || "",
        birthdate: fm.birthdate ? new Date(fm.birthdate).toISOString().split('T')[0] : "",
        age: fm.age !== undefined ? fm.age : "",
        gender: fm.gender || "",
      })) : [],
    });
    setAdditionalMobiles(data.additionalMobiles || []);
    setEditMode(true);
    setDetailOpen(true);
  };

  const handleFamilyMemberChange = (index, field, value) => {
    const updated = [...editForm.familyMembers];
    if (field === "birthdate") {
      updated[index].birthdate = value;
      updated[index].age = calculateAge(value);
    } else {
      updated[index][field] = value;
    }
    setEditForm({ ...editForm, familyMembers: updated });
  };

  const addFamilyMember = () => {
    setEditForm({
      ...editForm,
      familyMembers: [
        ...editForm.familyMembers,
        { name: "", relation: "", birthdate: "", age: "", gender: "" }
      ]
    });
  };

  const removeFamilyMember = (idx) => {
    setEditForm({
      ...editForm,
      familyMembers: editForm.familyMembers.filter((_, i) => i !== idx)
    });
  };

  const validateEditForm = () => {
    if (!editForm.headName || editForm.headName.trim().length < 3) {
      return "મુખ્ય નામ ઓછામાં ઓછું 3 અક્ષરનું હોવું જોઈએ. (Head Name must be at least 3 characters)";
    }
    const nameRegex = /^[a-zA-Z\s.\u0A80-\u0AFF]+$/;
    if (!nameRegex.test(editForm.headName)) {
      return "મુખ્ય નામમાં માત્ર અંગ્રેજી અથવા ગુજરાતી અક્ષરો હોવા જોઈએ. (Head Name must contain only English or Gujarati characters)";
    }
    if (!editForm.rationNo || editForm.rationNo.trim().length < 3) {
      return "રેશન નંબર ઓછામાં ઓછું 3 અક્ષરનું હોવું જોઈએ. (Ration Number must be at least 3 characters)";
    }
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!editForm.mobile || !mobileRegex.test(editForm.mobile)) {
      return "મોબાઇલ નંબર 10 આંકડાનો અને સાચો હોવો જોઈએ. (Mobile number must be a valid 10-digit number starting with 6-9)";
    }
    if (!editForm.address || editForm.address.trim().length < 10) {
      return "સરનામું ઓછામાં ઓછું 10 અક્ષરનું હોવું જોઈએ. (Address must be at least 10 characters)";
    }
    if (!editForm.zone) {
      return "ઝોન પસંદ કરવો જરૂરી છે. (Zone is required)";
    }
    if (editForm.uniqueNumber !== undefined && editForm.uniqueNumber !== null && String(editForm.uniqueNumber).trim() !== "") {
      const parsedUnique = Number(editForm.uniqueNumber);
      if (isNaN(parsedUnique) || !Number.isInteger(parsedUnique) || parsedUnique <= 0) {
        return "સભ્ય નંબર હકારાત્મક પૂર્ણાંક હોવો જોઈએ. (Unique Number must be a positive integer)";
      }
    }

    // Validate family members
    if (editForm.familyMembers && editForm.familyMembers.length > 0) {
      for (let i = 0; i < editForm.familyMembers.length; i++) {
        const fm = editForm.familyMembers[i];
        if (!fm.name || fm.name.trim() === "") {
          return `સભ્ય ${i + 1} નું નામ જરૂરી છે. (Family member ${i + 1} name is required)`;
        }
        if (!fm.relation || fm.relation.trim() === "") {
          return `સભ્ય ${i + 1} નો સંબંધ જરૂરી છે. (Family member ${i + 1} relation is required)`;
        }
        if (!fm.gender || !["male", "female", "other"].includes(String(fm.gender).toLowerCase())) {
          return `સભ્ય ${i + 1} નું લિંગ જરૂરી છે. (Family member ${i + 1} gender is required)`;
        }
        if (fm.age === undefined || fm.age === null || String(fm.age).trim() === "") {
          return `સભ્ય ${i + 1} ની ઉંમર જરૂરી છે. (Family member ${i + 1} age is required)`;
        }
        const ageNum = Number(fm.age);
        if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
          return `સભ્ય ${i + 1} ની ઉંમર 0 થી 120 ની વચ્ચે હોવી જોઈએ. (Family member ${i + 1} age must be between 0 and 120)`;
        }
      }
    }
    return null;
  };

  const onSaveEdit = async () => {
    const validationError = validateEditForm();
    if (validationError) {
      showSnackbar(validationError, "error");
      return null;
    }

    setSubmitting(true);
    try {
      const payload = {
        head: { name: editForm.headName },
        rationNo: editForm.rationNo,
        address: editForm.address,
        city: editForm.city,
        mobile: editForm.mobile,
        additionalMobiles,
        pincode: editForm.pincode,
        zone: editForm.zone,
        familyMembers: editForm.familyMembers,
        uniqueNumber: editForm.uniqueNumber !== "" ? Number(editForm.uniqueNumber) : undefined,
        issueDate: editForm.issueDate,
      };

      const res = await updateRequest(detailRequest._id, payload);
      showSnackbar("Request updated successfully!", "success");
      setEditMode(false);
      setDetailRequest(res.data.request);
      await load();
      return res.data.request;
    } catch (e) {
      showSnackbar(e?.response?.data?.error || "Failed to update request", "error");
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const onApproveFromEdit = async () => {
    const updatedReq = await onSaveEdit();
    if (updatedReq) {
      setDetailOpen(false);
      onOpenApprove(updatedReq);
    }
  };

  const onDeclineFromEdit = () => {
    setDetailOpen(false);
    onOpenDecline(detailRequest);
  };

  // This helper is correct for the aligned schema
  const getRequestData = (request) => {
    if (!request) return {};
    return {
      headName: request.head?.name || "-", 
      rationNo: request.rationNo || "-", 
      address: request.address || "-",
      city: request.city || "-", 
      mobile: request.mobile || "-", 
      additionalMobiles: request.additionalMobiles || [],
      pincode: request.pincode || "-", 
      zone: request.zone || null,
      familyMembers: request.familyMembers || []
    };
  };

  const renderZone = useCallback((r) => {
    const z = getRequestData(r).zone;
    if (!z) return "-";
    if (typeof z === "string") return zoneMap[z] || z;
    // Handle populated zone object
    if (typeof z === "object" && z !== null) {
      return z.number && z.name ? `${z.number} - ${z.name}` : z.name || z.number || "-";
    }
    return zoneMap[z] || z; // Fallback
  }, [zoneMap]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: reqs }, { data: zs }] = await Promise.all([ 
        getRequests(), 
        getPublicZones() 
      ]);
      
      setRows((reqs || []).map(req => ({ ...req, status: (req.status || 'pending').toLowerCase() })));
      setZones(zs || []);
      const zmap = {};
      (zs || []).forEach((z) => { zmap[z._id] = `${z.number} - ${z.name}`; });
      setZoneMap(zmap);
    } catch (e) {
      showSnackbar(e?.response?.data?.error || "Data loading failed", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let filtered = rows;
    if (statusFilter !== "all") filtered = filtered.filter((row) => row.status === statusFilter);
    if (zoneFilter !== "all") {
      filtered = filtered.filter((row) => {
        const zoneData = getRequestData(row).zone;
        const zoneId = typeof zoneData === 'string' ? zoneData : zoneData?._id;
        return zoneId === zoneFilter;
      });
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((row) => {
        const data = getRequestData(row);
        return (
          (data.headName?.toLowerCase() || "").includes(term) ||
          (data.mobile?.toLowerCase() || "").includes(term) ||
          (data.rationNo?.toLowerCase() || "").includes(term) ||
          (data.additionalMobiles.join(' ').toLowerCase() || "").includes(term) ||
          (renderZone(row).toLowerCase() || "").includes(term)
        );
      });
    }
    setFilteredRows(filtered);
  }, [searchTerm, statusFilter, zoneFilter, rows, zoneMap, renderZone]);

  const sortedRequests = [...filteredRows].sort((a, b) => Number(a.uniqueNumber || 0) - Number(b.uniqueNumber || 0));

  const onOpenApprove = (row) => {
    setSelected(row); 
    setSabhyaNo(row.uniqueNumber ? String(row.uniqueNumber) : ""); 
    setRequestNumber(""); // 🔹 NEW: Clear request number state on open
    setApproveOpen(true);
  };

  const onApprove = async () => {
    // 🔹 MODIFIED: Check for requestNumber as well
    if (!selected?._id || !sabhyaNo.trim() || !requestNumber.trim()) return;
    if (submitting) return;

    const parsedUnique = Number(sabhyaNo);
    if (isNaN(parsedUnique) || !Number.isInteger(parsedUnique) || parsedUnique <= 0) {
      showSnackbar("સભ્ય નંબર ધન પૂર્ણાંક હોવો જોઈએ. (Sabhya Number must be a positive integer)", "error");
      return;
    }

    const parsedReqNum = Number(requestNumber);
    if (isNaN(parsedReqNum) || !Number.isInteger(parsedReqNum) || parsedReqNum <= 0) {
      showSnackbar("રિક્વેસ્ટ નંબર ધન પૂર્ણાંક હોવો જોઈએ. (Request Number must be a positive integer)", "error");
      return;
    }
    
    setSubmitting(true);
    try {
      // 🔹 MODIFIED: Pass an object with uniqueNumber and requestNumber
      const payload = {
        uniqueNumber: sabhyaNo,
        requestNumber: requestNumber
      };
      await approveRequest(selected._id, payload); 
      
      showSnackbar("Request approved and member created!", "success");
      setApproveOpen(false);
      await load();
    } catch (e) {
      showSnackbar(e?.response?.data?.error || "Approval failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const onOpenDecline = (row) => {
    setSelected(row); setDeclineOpen(true);
  };

  const onDeclineConfirm = async () => {
    if (!selected?._id) return;
    setSubmitting(true);
    try {
      // ✅ FIX: Removed the second argument ("Rejected by admin") 
      // to match the backend DELETE route which doesn't accept notes.
      await declineRequest(selected._id); 
      showSnackbar("Request rejected.", "info");
      setDeclineOpen(false);
      await load();
    } catch (e) {
      showSnackbar(e?.response?.data?.error || "Rejection failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const onOpenDetails = (row) => {
    setDetailRequest(row); setDetailOpen(true);
  };

  const renderStatusChip = (status) => {
    let color = "default", label = "અજ્ઞાત";
    switch (status) {
      case "pending": color = "warning"; label = "બાકી"; break;
      case "approved": color = "success"; label = "મંજૂર"; break;
      case "rejected": color = "error"; label = "નામંજૂર"; break;
      default: break;
    }
    return <Chip label={label} color={color} size="small" />;
  };
  
  const renderMobileRow = (r) => {
    const data = getRequestData(r);
    return (
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }} elevation={1}>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Typography variant="subtitle1" fontWeight="bold">{data.headName}</Typography><Box>{renderStatusChip(r.status)}</Box></Stack>
          <Typography variant="body2"><Box component="span" fontWeight="bold">મોબાઇલ:</Box> {data.mobile}</Typography>
          <Typography variant="body2"><Box component="span" fontWeight="bold">ઝોન:</Box> {renderZone(r)}</Typography>
          <Typography variant="body2"><Box component="span" fontWeight="bold">રેશન નંબર:</Box> {data.rationNo}</Typography>
          <Typography variant="body2" color="text.secondary">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</Typography>
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
            <IconButton onClick={() => onOpenDetails(r)} size="small" title="વિગતો જુઓ"><Visibility /></IconButton>
            <IconButton onClick={() => startEdit(r)} size="small" title="સુધારો કરો" disabled={r.status !== "pending"}><Edit /></IconButton>
            <IconButton onClick={() => onOpenApprove(r)} size="small" title="મંજૂર કરો" disabled={r.status !== "pending"}><Check color={r.status === "pending" ? "success" : "disabled"} /></IconButton>
            <IconButton onClick={() => onOpenDecline(r)} size="small" title="નામંજૂર કરો" disabled={r.status !== "pending"}><Close color={r.status === "pending" ? "error" : "disabled"} /></IconButton>
          </Stack>
        </Stack>
      </Paper>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 2, px: isMobile ? 1 : 4 }}>
      <Stack spacing={2}>
        <Typography variant="h5" sx={{ fontWeight: 600, fontSize: isMobile ? "1.3rem" : "inherit" }}>નોંધણી અરજીઓ</Typography>
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems="center">
            <TextField variant="outlined" placeholder="શોધો..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>), }} sx={{ flexGrow: 1 }} />
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel id="zone-filter-label">ઝોન</InputLabel>
              <Select labelId="zone-filter-label" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} label="ઝોન">
                <MenuItem value="all">બધા ઝોન</MenuItem>
                {zones.map((zone) => (<MenuItem key={zone._id} value={zone._id}>{zone.number} - {zone.name}</MenuItem>))}
              </Select>
            </FormControl>
          </Stack>
          <Tabs value={statusFilter} onChange={(e, v) => setStatusFilter(v)} sx={{ mt: 2 }} variant={isMobile ? "scrollable" : "standard"}>
            <Tab label="બધી અરજીઓ" value="all" />
            <Tab label="બાકી" value="pending" />
            <Tab label="મંજૂર" value="approved" />
            <Tab label="નામંજૂર" value="rejected" />
          </Tabs>
        </Paper>
        {loading ? (<Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>) : (
          <>
            {isMobile ? (
              <Stack>
                {filteredRows.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: "center", borderRadius: 3 }}><Typography>{searchTerm || statusFilter !== "all" || zoneFilter !== "all" ? "કોઈ અરજીઓ મળી નથી" : "કોઈ અરજીઓ નથી"}</Typography></Paper>
                ) : (
                  <Box sx={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>{sortedRequests.map((r) => (<Box key={r._id}>{renderMobileRow(r)}</Box>))}</Box>
                )}
              </Stack>
            ) : (
              <Paper sx={{ p: 2, borderRadius: 3, overflow: "hidden" }}>
                <Box sx={{ overflowX: "auto" }}>
                  <Table sx={{ minWidth: 1000 }}>
                    <TableHead><TableRow><TableCell>સ્થિતિ</TableCell><TableCell>મુખ્ય સભ્ય નામ</TableCell><TableCell>મોબાઇલ</TableCell><TableCell>ઝોન</TableCell><TableCell>રેશન નંબર</TableCell><TableCell>તારીખ</TableCell><TableCell align="right">ક્રિયા</TableCell></TableRow></TableHead>
                    <TableBody>
                      {filteredRows.length === 0 ? (<TableRow><TableCell colSpan={7} align="center">{searchTerm || statusFilter !== "all" || zoneFilter !== "all" ? "કોઈ અરજીઓ મળી નથી" : "કોઈ અરજીઓ નથી"}</TableCell></TableRow>) : (
                        sortedRequests.map((r) => {
                          const data = getRequestData(r);
                          return (
                            <TableRow key={r._id} hover>
                              <TableCell>{renderStatusChip(r.status)}</TableCell><TableCell>{data.headName}</TableCell><TableCell>{data.mobile}</TableCell><TableCell>{renderZone(r)}</TableCell><TableCell>{data.rationNo}</TableCell><TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</TableCell>
                              <TableCell align="right">
                                <IconButton onClick={() => onOpenDetails(r)} title="વિગતો જુઓ"><Visibility /></IconButton>
                                <IconButton onClick={() => startEdit(r)} title="સુધારો કરો" disabled={r.status !== "pending"}><Edit /></IconButton>
                                <IconButton onClick={() => onOpenApprove(r)} title="મંજૂર કરો" disabled={r.status !== "pending"}><Check color={r.status === "pending" ? "success" : "disabled"} /></IconButton>
                                <IconButton onClick={() => onOpenDecline(r)} title="નામંજૂર કરો" disabled={r.status !== "pending"}><Close color={r.status === "pending" ? "error" : "disabled"} /></IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            )}
          </>
        )}
      </Stack>
      
      {/* Details Dialog */}
      <Dialog open={detailOpen} onClose={() => { setDetailOpen(false); setEditMode(false); }} fullWidth maxWidth="md" fullScreen={isMobile}>
        <DialogTitle>{editMode ? "અરજી સુધારો (Edit Request)" : "અરજી વિગતો (Request Details)"}</DialogTitle>
        <DialogContent>
          {detailRequest && (
            editMode ? (
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, borderBottom: '1px solid rgba(0,0,0,0.1)', pb: 1 }}>
                    Request Details (અરજી વિગતો)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="મુખ્ય નામ" 
                        value={editForm.headName} 
                        onChange={(e) => setEditForm({ ...editForm, headName: e.target.value })} 
                        fullWidth 
                        required 
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="રેશન કૉર્ડ નંબર" 
                        value={editForm.rationNo} 
                        onChange={(e) => setEditForm({ ...editForm, rationNo: e.target.value })} 
                        fullWidth 
                        required 
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="મોબાઇલ નંબર" 
                        value={editForm.mobile} 
                        onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} 
                        fullWidth 
                        required 
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required>
                        <InputLabel id="edit-zone-label">ઝોન</InputLabel>
                        <Select
                          labelId="edit-zone-label"
                          value={editForm.zone}
                          onChange={(e) => setEditForm({ ...editForm, zone: e.target.value })}
                          label="ઝોન"
                        >
                          {zones.map((z) => (
                            <MenuItem key={z._id} value={z._id}>
                              {z.number} - {z.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField 
                        label="સરનામું" 
                        value={editForm.address} 
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} 
                        fullWidth 
                        multiline 
                        rows={2} 
                        required 
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="શહેર" 
                        value={editForm.city} 
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} 
                        fullWidth 
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="પિનકોડ" 
                        value={editForm.pincode} 
                        onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })} 
                        fullWidth 
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, borderBottom: '1px solid rgba(0,0,0,0.1)', pb: 1 }}>
                    Family Members (પરિવારના સભ્યો) ({editForm.familyMembers.length})
                  </Typography>
                  <Stack spacing={2}>
                    {editForm.familyMembers.map((member, index) => (
                      <Card key={index} variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" color="primary">સભ્ય {index + 1}</Typography>
                          <IconButton onClick={() => removeFamilyMember(index)} color="error" size="small"><Close fontSize="small" /></IconButton>
                        </Stack>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField 
                              label="નામ" 
                              value={member.name} 
                              onChange={(e) => handleFamilyMemberChange(index, "name", e.target.value)} 
                              fullWidth 
                              required 
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField 
                              label="સબંધ" 
                              value={member.relation} 
                              onChange={(e) => handleFamilyMemberChange(index, "relation", e.target.value)} 
                              fullWidth 
                              required 
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField 
                              label="જન્મતારીખ" 
                              type="date" 
                              InputLabelProps={{ shrink: true }} 
                              value={member.birthdate} 
                              onChange={(e) => handleFamilyMemberChange(index, "birthdate", e.target.value)} 
                              fullWidth 
                            />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <TextField 
                              label="ઉંમર" 
                              type="number" 
                              value={member.age} 
                              onChange={(e) => handleFamilyMemberChange(index, "age", e.target.value)} 
                              fullWidth 
                              required 
                            />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <FormControl fullWidth required>
                              <InputLabel>લિંગ</InputLabel>
                              <Select 
                                value={member.gender} 
                                onChange={(e) => handleFamilyMemberChange(index, "gender", e.target.value)} 
                                label="લિંગ"
                              >
                                <MenuItem value="male">પુરુષ</MenuItem>
                                <MenuItem value="female">સ્ત્રી</MenuItem>
                                <MenuItem value="other">અન્ય</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                        </Grid>
                      </Card>
                    ))}
                    <Button startIcon={<Add />} onClick={addFamilyMember} variant="outlined" sx={{ alignSelf: "flex-start" }}>સભ્ય ઉમેરો</Button>
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="h6" color="error" sx={{ fontWeight: 'bold', mb: 2, borderBottom: '1px solid rgba(0,0,0,0.1)', pb: 1 }}>
                    Admin Section (એડમિન વિભાગ)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="સભ્ય નંબર (Unique Number) *" 
                        value={editForm.uniqueNumber} 
                        onChange={(e) => setEditForm({ ...editForm, uniqueNumber: e.target.value })} 
                        fullWidth 
                        type="number"
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="ઇસ્યુ તારીખ (Issue Date) *" 
                        type="date" 
                        InputLabelProps={{ shrink: true }} 
                        value={editForm.issueDate} 
                        onChange={(e) => setEditForm({ ...editForm, issueDate: e.target.value })} 
                        fullWidth 
                        required
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Stack>
            ) : (
              // Read only view
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{renderStatusChip(detailRequest.status)}<Typography variant="body2" color="text.secondary">અરજી તારીખ: {detailRequest.createdAt ? new Date(detailRequest.createdAt).toLocaleString() : "-"}</Typography></Box>
                
                <Box>
                  <Typography variant="h6" gutterBottom>મુખ્ય સભ્યની માહિતી</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><TextField label="નામ" value={getRequestData(detailRequest).headName} fullWidth InputProps={{ readOnly: true }} /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="સભ્ય નંબર (Unique Number)" value={detailRequest.uniqueNumber || "-"} fullWidth InputProps={{ readOnly: true }} /></Grid>
                  </Grid>
                </Box>

                <Box>
                  <Typography variant="h6" gutterBottom>સરનામું અને સંપર્ક</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><TextField label="રેશન કાર્ડ નંબર" value={getRequestData(detailRequest).rationNo} fullWidth InputProps={{ readOnly: true }} /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="મોબાઇલ નંબર" value={getRequestData(detailRequest).mobile} fullWidth InputProps={{ readOnly: true }} /></Grid>
                    {getRequestData(detailRequest).additionalMobiles && getRequestData(detailRequest).additionalMobiles.length > 0 && (<Grid item xs={12} sm={6}><TextField label="વધારાના મોબાઇલ નંબર" value={getRequestData(detailRequest).additionalMobiles.join(', ')} fullWidth InputProps={{ readOnly: true }} /></Grid>)}
                    <Grid item xs={12}><TextField label="સરનામું" value={getRequestData(detailRequest).address} fullWidth multiline rows={2} InputProps={{ readOnly: true }} /></Grid>
                    <Grid item xs={12} sm={4}><TextField label="શહેર" value={getRequestData(detailRequest).city} fullWidth InputProps={{ readOnly: true }} /></Grid>
                    <Grid item xs={12} sm={4}><TextField label="પિનકોડ" value={getRequestData(detailRequest).pincode} fullWidth InputProps={{ readOnly: true }} /></Grid>
                    <Grid item xs={12} sm={4}><TextField label="ઝોન" value={renderZone(detailRequest)} fullWidth InputProps={{ readOnly: true }} /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="ઇસ્યુ તારીખ (Issue Date)" value={fmtDate(detailRequest.issueDate)} fullWidth InputProps={{ readOnly: true }} /></Grid>
                  </Grid>
                </Box>
                
                <Box>
                  <Typography variant="h6" gutterBottom>પરિવારના સભ્યો ({getRequestData(detailRequest).familyMembers.length})</Typography>
                  {getRequestData(detailRequest).familyMembers && getRequestData(detailRequest).familyMembers.length > 0 ? (<Stack spacing={2}>{getRequestData(detailRequest).familyMembers.map((member, index) => (<Accordion key={index} defaultExpanded={index === 0}><AccordionSummary expandIcon={<ExpandMore />}><Typography>{member.name || "અજ્ઞાત"} ({member.relation || "અજ્ઞાત સંબંધ"})</Typography></AccordionSummary><AccordionDetails><Grid container spacing={2}><Grid item xs={12} sm={6}><TextField label="નામ" value={member.name || "-"} fullWidth InputProps={{ readOnly: true }} /></Grid><Grid item xs={12} sm={6}><TextField label="સબંધ" value={member.relation || "-"} fullWidth InputProps={{ readOnly: true }} /></Grid><Grid item xs={12} sm={6}><TextField label="જન્મતારીખ" value={fmtDate(member.birthdate)} fullWidth InputProps={{ readOnly: true }} /></Grid><Grid item xs={12} sm={6}><TextField label="ઉંમર" value={member.age || calcAgeFromDOB(member.birthdate) || "-"} fullWidth InputProps={{ readOnly: true }} /></Grid><Grid item xs={12}><TextField label="લિંગ" value={member.gender === 'male' ? 'પુરુષ' : member.gender === 'female' ? 'સ્ત્રી' : 'અન્ય'} fullWidth InputProps={{ readOnly: true }} /></Grid></Grid></AccordionDetails></Accordion>))}</Stack>) : (<Typography variant="body2">કોઈ પરિવારના સભ્યો નથી</Typography>)}
                </Box>
              </Stack>
            )
          )}
        </DialogContent>
        <DialogActions>
          {editMode ? (
            <>
              <Button onClick={() => setEditMode(false)}>રદ કરો (Cancel)</Button>
              <Button onClick={onDeclineFromEdit} color="error" variant="contained" disabled={submitting}>નામંજૂર કરો (Reject)</Button>
              <Button onClick={onSaveEdit} color="primary" variant="contained" disabled={submitting}>સેવ કરો (Save Changes)</Button>
              <Button onClick={onApproveFromEdit} color="success" variant="contained" disabled={submitting}>મંજૂર કરો (Approve)</Button>
            </>
          ) : (
            <>
              <Button onClick={() => setDetailOpen(false)}>બંધ કરો (Close)</Button>
              {detailRequest?.status === "pending" && (
                <>
                  <Button onClick={() => startEdit(detailRequest)} color="primary">સુધારો (Edit)</Button>
                  <Button onClick={() => { setDetailOpen(false); onOpenDecline(detailRequest); }} color="error">નામંજૂર કરો (Reject)</Button>
                  <Button onClick={() => { setDetailOpen(false); onOpenApprove(detailRequest); }} color="success" variant="contained">મંજૂર કરો (Approve)</Button>
                </>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onClose={() => setApproveOpen(false)} fullScreen={isMobile}>
        <DialogTitle>અરજી મંજૂર કરો</DialogTitle>
        <DialogContent>
          {/* 🔹 MODIFIED: Wrapped in Stack and updated text */}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography>કૃપા કરી આ સભ્ય માટે <strong>સભ્ય નંબર</strong> અને <strong>રિક્વેસ્ટ નંબર</strong> દાખલ કરો:</Typography>
            <TextField 
              label="સભ્ય નંબર" 
              value={sabhyaNo} 
              onChange={(e) => setSabhyaNo(e.target.value)} 
              fullWidth 
              autoFocus 
              inputProps={{ maxLength: 20 }} 
            />
            {/* 🔹 NEW: Added TextField for Request Number */}
            <TextField 
              label="રિક્વેસ્ટ નંબર" 
              value={requestNumber} 
              onChange={(e) => setRequestNumber(e.target.value)} 
              fullWidth 
              inputProps={{ maxLength: 20 }} 
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveOpen(false)}>રદ કરો</Button>
          {/* 🔹 MODIFIED: Updated disabled check */}
          <Button 
            variant="contained" 
            onClick={onApprove} 
            disabled={submitting || !sabhyaNo.trim() || !requestNumber.trim()}
          >
            {submitting ? "મંજૂરી થઈ રહી છે..." : "મંજૂર કરો"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={declineOpen} onClose={() => setDeclineOpen(false)} fullScreen={isMobile}>
        <DialogTitle>નામંજૂરીની ખાતરી કરો</DialogTitle>
        <DialogContent><Typography>શું તમે આ અરજી <strong>નામંજૂર</strong> કરવા ઈચ્છો છો?</Typography></DialogContent>
        <DialogActions><Button onClick={() => setDeclineOpen(false)}>રદ કરો</Button><Button variant="contained" color="error" onClick={onDeclineConfirm} disabled={submitting}>{submitting ? "નામંજૂરી થઈ રહી છે..." : "નામંજૂર કરો"}</Button></DialogActions>
      </Dialog>
      
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "top", horizontal: "center" }} sx={{ "& .MuiSnackbarContent-root": { width: isMobile ? "90%" : "auto" } }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: "100%" }}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
}