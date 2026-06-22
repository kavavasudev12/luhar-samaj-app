// frontend/src/pages/RequestForm.js
import React, { useEffect, useState } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Box,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
} from "@mui/material";
import { Add, Delete, Person, Home, LocationCity } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { submitRequest } from "../services/requestService";

const calculateAge = (dateStr) => {
  if (!dateStr) return "";
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export default function RequestForm() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [form, setForm] = useState({
    headName: "",
    rationNo: "",
    address: "",
    city: "",
    mobile: "",
    pincode: "",
    zone: "",
    requestType: "New Membership",
  });

  const [additionalMobiles, setAdditionalMobiles] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [zones, setZones] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        setLoadingZones(true);
        const res = await api.get("/zones/public");
        setZones(res.data || []);
      } catch (e) {
        console.error("Failed to load zones", e);
        setError("ઝોન લોડ કરવામાં નિષ્ફળ.");
      } finally {
        setLoadingZones(false);
      }
    };
    fetchZones();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };
  
  const addAdditionalMobile = () => setAdditionalMobiles(prev => [...prev, ""]);
  const removeAdditionalMobile = (idx) => setAdditionalMobiles(prev => prev.filter((_, i) => i !== idx));
  const handleAdditionalMobileChange = (idx, value) => {
    const sanitized = value.replace(/\D/g, "").slice(0, 10);
    setAdditionalMobiles(prev => {
      const copy = [...prev];
      copy[idx] = sanitized;
      return copy;
    });
  };

  const handleMemberChange = (index, field, value) => {
    const updated = [...familyMembers];
    if (field === "birthdate") {
      updated[index].birthdate = value;
      updated[index].age = calculateAge(value);
    } else {
      updated[index][field] = value;
    }
    setFamilyMembers(updated);
  };

  const addMember = () => setFamilyMembers(prev => [...prev, { name: "", relation: "", birthdate: "", age: "", gender: "" }]);
  const removeMember = (idx) => setFamilyMembers(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Enforce strict client-side checks on submit: Name, Mobile (10 digits starting with 6-9), Zone, Address, Request Type.
    if (!form.headName || form.headName.trim().length < 3) {
      setError("મુખ્ય નામ ઓછામાં ઓછું 3 અક્ષરનું હોવું જોઈએ. (Head Name must be at least 3 characters)");
      setLoading(false);
      return;
    }
    const nameRegex = /^[a-zA-Z\s.\u0A80-\u0AFF]+$/;
    if (!nameRegex.test(form.headName)) {
      setError("મુખ્ય નામમાં માત્ર અંગ્રેજી અથવા ગુજરાતી અક્ષરો હોવા જોઈએ. (Head Name must contain only English or Gujarati characters)");
      setLoading(false);
      return;
    }
    if (!form.rationNo || form.rationNo.trim().length < 3) {
      setError("રેશન નંબર ઓછામાં ઓછું 3 અક્ષરનું હોવું જોઈએ. (Ration Number must be at least 3 characters)");
      setLoading(false);
      return;
    }
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!form.mobile || !mobileRegex.test(form.mobile)) {
      setError("મોબાઇલ નંબર 10 આંકડાનો અને સાચો હોવો જોઈએ. (Mobile number must be a valid 10-digit number starting with 6-9)");
      setLoading(false);
      return;
    }
    if (!form.zone) {
      setError("ઝોન પસંદ કરવો જરૂરી છે. (Zone is required)");
      setLoading(false);
      return;
    }
    if (!form.address || form.address.trim().length < 10) {
      setError("સરનામું ઓછામાં ઓછું 10 અક્ષરનું હોવું જોઈએ. (Address must be at least 10 characters)");
      setLoading(false);
      return;
    }

    // Validate family members
    if (familyMembers && familyMembers.length > 0) {
      for (let i = 0; i < familyMembers.length; i++) {
        const fm = familyMembers[i];
        if (!fm.name || fm.name.trim() === "") {
          setError(`સભ્ય ${i + 1} નું નામ જરૂરી છે. (Family member ${i + 1} name is required)`);
          setLoading(false);
          return;
        }
        if (!fm.relation || fm.relation.trim() === "") {
          setError(`સભ્ય ${i + 1} નો સંબંધ જરૂરી છે. (Family member ${i + 1} relation is required)`);
          setLoading(false);
          return;
        }
        if (!fm.gender || !["male", "female", "other"].includes(String(fm.gender).toLowerCase())) {
          setError(`સભ્ય ${i + 1} નું લિંગ જરૂરી છે. (Family member ${i + 1} gender is required)`);
          setLoading(false);
          return;
        }
        if (fm.age === undefined || fm.age === null || String(fm.age).trim() === "") {
          setError(`સભ્ય ${i + 1} ની ઉંમર જરૂરી છે. (Family member ${i + 1} age is required)`);
          setLoading(false);
          return;
        }
        const ageNum = Number(fm.age);
        if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
          setError(`સભ્ય ${i + 1} ની ઉંમર 0 થી 120 ની વચ્ચે હોવી જોઈએ. (Family member ${i + 1} age must be between 0 and 120)`);
          setLoading(false);
          return;
        }
      }
    }

    const payload = {
      head: {
        name: form.headName,
      },
      rationNo: form.rationNo,
      address: form.address,
      city: form.city,
      mobile: form.mobile,
      additionalMobiles,
      pincode: form.pincode,
      zone: form.zone,
      familyMembers,
      requestType: form.requestType,
    };

    try {
      await submitRequest(payload);
      setSuccessOpen(true);
    } catch (err) {
      console.error("Submit error:", err.response || err);
      setError(err.response?.data?.error || "અરજી સબમિટ કરવામાં નિષ્ફળ. કૃપા કરી ફરી પ્રયાસ કરો.");
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    navigate('/');
  };

  return (
    <Container 
      component="main" 
      maxWidth="md" 
      sx={{ 
        mt: { xs: 2, sm: 3, md: 4 }, 
        mb: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1, sm: 2 }
      }}
    >
      <Paper 
        elevation={isMobile ? 0 : 3}
        sx={{ 
          p: { xs: 2, sm: 3, md: 4 }, 
          borderRadius: { xs: 2, sm: 3 },
          bgcolor: isMobile ? 'transparent' : 'background.paper'
        }}
      >
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          component="h1" 
          align="center" 
          gutterBottom 
          sx={{ fontWeight: 600, mb: 1 }}
        >
          સભ્ય નોંધણી ફોર્મ
        </Typography>
        <Typography 
          variant={isMobile ? "body2" : "body1"} 
          align="center" 
          gutterBottom
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          કૃપા કરીને નીચેની વિગતો કાળજીપૂર્વક ભરો.
        </Typography>
        
        {error && (
          <Alert 
            sx={{ mb: 2 }} 
            severity="error"
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <Stack spacing={{ xs: 2.5, sm: 3 }}>
            
            {/* Head Information Section */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Person color="primary" />
                <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 600 }}>
                  મુખ્ય વ્યક્તિની માહિતી
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                <Grid item xs={12}>
                  <TextField 
                    label="મુખ્ય નામ" 
                    name="headName" 
                    value={form.headName} 
                    onChange={handleChange} 
                    fullWidth 
                    required 
                    size={isMobile ? "medium" : "small"}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Contact & Address Section */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Home color="primary" />
                <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 600 }}>
                  સંપર્ક અને સરનામાં
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="રેશન નંબર" 
                    name="rationNo" 
                    value={form.rationNo} 
                    onChange={handleChange} 
                    required 
                    fullWidth 
                    size={isMobile ? "medium" : "small"}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    label="મોબાઇલ નંબર" 
                    name="mobile" 
                    value={form.mobile} 
                    onChange={handleChange} 
                    required 
                    fullWidth 
                    size={isMobile ? "medium" : "small"}
                    inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 10 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    {additionalMobiles.map((m, idx) => (
                      <Card key={idx} variant="outlined" sx={{ bgcolor: 'background.default' }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <TextField 
                              label={`મોબાઇલ ${idx + 2}`} 
                              value={m} 
                              onChange={(e) => handleAdditionalMobileChange(idx, e.target.value)} 
                              fullWidth 
                              size={isMobile ? "medium" : "small"}
                              type="tel" 
                              inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 10 }}
                            />
                            <IconButton 
                              aria-label="remove" 
                              onClick={() => removeAdditionalMobile(idx)}
                              color="error"
                              size={isMobile ? "medium" : "small"}
                            >
                              <Delete />
                            </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                  
                  <Button 
                    startIcon={<Add />} 
                    onClick={addAdditionalMobile} 
                    variant="outlined" 
                    sx={{ mt: 2 }}
                    fullWidth={isMobile}
                    size={isMobile ? "medium" : "small"}
                    disabled={additionalMobiles.length >= 2}
                  >
                    મોબાઇલ ઉમેરો
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <TextField 
                    label="સરનામું" 
                    name="address" 
                    value={form.address} 
                    onChange={handleChange} 
                    required 
                    fullWidth 
                    size={isMobile ? "medium" : "small"}
                    multiline 
                    minRows={2}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField 
                    label="શહેર" 
                    name="city" 
                    value={form.city} 
                    onChange={handleChange} 
                    fullWidth 
                    size={isMobile ? "medium" : "small"}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField 
                    label="પિનકોડ" 
                    name="pincode" 
                    value={form.pincode} 
                    onChange={handleChange} 
                    fullWidth 
                    size={isMobile ? "medium" : "small"}
                    inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth required size={isMobile ? "medium" : "small"}>
                    <InputLabel id="zone-label">ઝોન પસંદ કરો</InputLabel>
                    <Select 
                      labelId="zone-label" 
                      id="zone" 
                      name="zone" 
                      value={form.zone} 
                      onChange={handleChange} 
                      disabled={loadingZones} 
                      label="ઝોન પસંદ કરો"
                    >
                      {loadingZones ? (
                        <MenuItem disabled><CircularProgress size={20} /></MenuItem>
                      ) : (
                        zones.map((zone) => (
                          <MenuItem key={zone._id} value={zone._id}>
                            {zone.number} - {zone.name}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>
                
              </Grid>
            </Box>
            
            {/* Family Members Section */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <LocationCity color="primary" />
                <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 600 }}>
                  પરિવારના સભ્યો
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              
              {familyMembers.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                  કોઈ પરિવારના સભ્યો ઉમેર્યા નથી
                </Typography>
              )}
              
              <Stack spacing={2}>
                {familyMembers.map((m, idx) => (
                  <Card key={idx} variant="outlined" sx={{ bgcolor: 'background.default' }}>
                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>
                          સભ્ય {idx + 1}
                        </Typography>
                        <IconButton 
                          onClick={() => removeMember(idx)}
                          color="error"
                          size="small"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                      
                      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                        <Grid item xs={12} sm={6}>
                          <TextField 
                            label="નામ" 
                            value={m.name} 
                            onChange={(e) => handleMemberChange(idx, "name", e.target.value)} 
                            fullWidth 
                            required
                            size={isMobile ? "medium" : "small"}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField 
                            label="સબંધ" 
                            value={m.relation} 
                            onChange={(e) => handleMemberChange(idx, "relation", e.target.value)} 
                            fullWidth 
                            required
                            size={isMobile ? "medium" : "small"}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField 
                            label="જન્મતારીખ" 
                            type="date" 
                            InputLabelProps={{ shrink: true }} 
                            value={m.birthdate} 
                            onChange={(e) => handleMemberChange(idx, "birthdate", e.target.value)} 
                            fullWidth 
                            size={isMobile ? "medium" : "small"}
                          />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField 
                            label="ઉંમર" 
                            type="number" 
                            value={m.age} 
                            onChange={(e) => handleMemberChange(idx, "age", e.target.value)} 
                            fullWidth 
                            required
                            size={isMobile ? "medium" : "small"}
                          />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <FormControl fullWidth required size={isMobile ? "medium" : "small"}>
                            <InputLabel id={`gender-label-${idx}`}>લિંગ</InputLabel>
                            <Select 
                              labelId={`gender-label-${idx}`} 
                              value={m.gender} 
                              onChange={(e) => handleMemberChange(idx, "gender", e.target.value)} 
                              label="લિંગ"
                            >
                              <MenuItem value="male">પુરુષ</MenuItem>
                              <MenuItem value="female">સ્ત્રી</MenuItem>
                              <MenuItem value="other">અન્ય</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
              
              <Button 
                startIcon={<Add />} 
                onClick={addMember} 
                variant="outlined" 
                sx={{ mt: 2 }}
                fullWidth={isMobile}
                size={isMobile ? "medium" : "small"}
                disabled={familyMembers.length >= 10}
              >
                પરિવારનો સભ્ય ઉમેરો
              </Button>
            </Box>
            
            {/* Submit Button */}
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              disabled={loading} 
              fullWidth 
              sx={{ 
                p: { xs: 1.5, sm: 1.5 }, 
                fontSize: { xs: '1rem', sm: '1.1rem' },
                fontWeight: 600,
                mt: 2
              }}
              size="large"
            >
              {loading ? <CircularProgress size={24} /> : "અરજી સબમિટ કરો"}
            </Button>
          </Stack>
        </form>
      </Paper>

      {/* Success Dialog */}
      <Dialog 
        open={successOpen} 
        onClose={handleSuccessClose}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          અરજી સફળ
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
            તમારી અરજી સફળતાપૂર્વક સબમિટ કરવામાં આવી છે. એડમિન દ્વારા મંજૂરી મળ્યા બાદ તમારો સંપર્ક કરવામાં આવશે.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 2 } }}>
          <Button 
            onClick={handleSuccessClose} 
            autoFocus 
            variant="contained"
            fullWidth={isMobile}
            size={isMobile ? "large" : "medium"}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
