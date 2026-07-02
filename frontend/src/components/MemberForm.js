import React, { useEffect, useState } from "react";
import {
  TextField, Button, Grid, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Alert, IconButton, Typography, Box, Stack, Paper,
  Stepper, Step, StepLabel, Card, useTheme, useMediaQuery
} from "@mui/material";
import { Add, Delete, ArrowBack } from "@mui/icons-material";
import api from "../services/api";

const steps = ["મુખ્ય સભ્યની વિગતો (Step 1)", "પરિવારના સભ્યો (Step 2)"];

const calculateAge = (dateStr) => {
  if (!dateStr) return "";
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export default function MemberForm({ memberToEdit, onSubmit, loading, error, existingMembers, onCancel }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeStep, setActiveStep] = useState(0);

  // Form Fields State
  const [form, setForm] = useState({
    headName: "",
    rationNo: "",
    address: "",
    city: "સાવરકુંડલા", 
    mobile: "",
    pincode: "",
    zone: "",
    uniqueNumber: "",
    issueDate: "",
  });

  const [requestNumber, setRequestNumber] = useState(""); 
  const [additionalMobiles, setAdditionalMobiles] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [validationError, setValidationError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load Zones
  useEffect(() => {
    const initData = async () => {
      try {
        setLoadingZones(true);
        const zoneRes = await api.get("/zones/public");
        setZones(zoneRes.data || []);
      } catch (e) {
        console.error("Failed to load zones", e);
      } finally {
        setLoadingZones(false);
      }
    };
    initData();
  }, []);

  // Populate data when editing
  useEffect(() => {
    setRequestNumber(""); 
    setValidationError("");
    setActiveStep(0);

    if (!memberToEdit) {
      setForm({
        headName: "", 
        rationNo: "", address: "", city: "સાવરકુંડલા", mobile: "",
        pincode: "", zone: "", uniqueNumber: "", issueDate: "",
      });
      setAdditionalMobiles([]);
      familyMembersStateUpdate([]);
      return;
    }

    const z = typeof memberToEdit.zone === "object" ? memberToEdit.zone?._id : memberToEdit.zone;

    setForm({
      _id: memberToEdit._id,
      headName: memberToEdit.head?.name || "",
      rationNo: memberToEdit.rationNo || "",
      address: memberToEdit.address || "",
      city: memberToEdit.city || "સાવરકુંડલા",
      mobile: memberToEdit.mobile || "",
      pincode: memberToEdit.pincode || "",
      zone: z || "",
      uniqueNumber: memberToEdit.uniqueNumber || "",
      issueDate: memberToEdit.issueDate ? String(memberToEdit.issueDate).slice(0, 10) : "",
    });
    
    setAdditionalMobiles(memberToEdit.additionalMobiles || []);

    familyMembersStateUpdate(
      Array.isArray(memberToEdit.familyMembers)
        ? memberToEdit.familyMembers.map((m) => ({
            name: m.name || "",
            relation: m.relation || "",
            birthdate: m.birthdate ? String(m.birthdate).slice(0, 10) : "",
            age: m.age || (m.birthdate ? calculateAge(String(m.birthdate).slice(0, 10)) : ""),
            gender: m.gender || "",
          }))
        : []
    );
  }, [memberToEdit]);

  const familyMembersStateUpdate = (members) => {
    setFamilyMembers(members);
  };

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

  const validateStep1 = () => {
    if (!form.headName || form.headName.trim() === "") {
      return "મુખ્ય નામ જરૂરી છે. (Head Name is required)";
    }
    if (form.headName.trim().length < 3) {
      return "મુખ્ય નામ ઓછામાં ઓછું 3 અક્ષરનું હોવું જોઈએ. (Head Name must be at least 3 characters)";
    }
    const nameRegex = /^[a-zA-Z\s.\u0A80-\u0AFF]+$/;
    if (!nameRegex.test(form.headName)) {
      return "મુખ્ય નામમાં માત્ર અંગ્રેજી અથવા ગુજરાતી અક્ષરો હોવા જોઈએ. (Head Name must contain only English or Gujarati characters)";
    }

    if (!requestNumber || requestNumber.trim() === "") {
      return "રિક્વેસ્ટ નંબર જરૂરી છે. (Request Number is required)";
    }

    if (form.uniqueNumber === undefined || form.uniqueNumber === null || String(form.uniqueNumber).trim() === "") {
      return "સભ્ય નંબર (Sabhya Number) જરૂરી છે. (Sabhya Number is required)";
    }
    const parsedUnique = Number(form.uniqueNumber);
    if (isNaN(parsedUnique) || !Number.isInteger(parsedUnique) || parsedUnique <= 0) {
      return "સભ્ય નંબર ધન પૂર્ણાંક હોવો જોઈએ. (Sabhya Number must be a positive integer)";
    }

    if (existingMembers) {
      const isTaken = existingMembers.some(
        (m) => Number(m.uniqueNumber) === parsedUnique && m._id !== form._id
      );
      if (isTaken) {
        return `સભ્ય નંબર ${parsedUnique} પહેલાથી જ ઉપયોગમાં છે. (Sabhya Number ${parsedUnique} is already assigned.)`;
      }
    }

    if (!form.rationNo || form.rationNo.trim() === "") {
      return "રેશન નંબર જરૂરી છે. (Ration Number is required)";
    }
    if (form.rationNo.trim().length < 3) {
      return "રેશન નંબર ઓછામાં ઓછું 3 અક્ષરનું હોવું જોઈએ. (Ration Number must be at least 3 characters)";
    }

    if (!form.mobile || form.mobile.trim() === "") {
      return "મોબાઇલ નંબર જરૂરી છે. (Mobile number is required)";
    }
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(form.mobile)) {
      return "મોબાઇલ નંબર 10 આંકડાનો અને સાચો હોવો જોઈએ. (Mobile number must be a valid 10-digit number starting with 6-9)";
    }

    if (!form.issueDate) {
      return "જારી તારીખ જરૂરી છે. (Issue Date is required)";
    }
    const d = new Date(form.issueDate);
    if (isNaN(d.getTime())) {
      return "અમાન્ય જારી તારીખ. (Invalid Issue Date)";
    }

    if (!form.zone) {
      return "ઝોન પસંદ કરવો જરૂરી છે. (Zone is required)";
    }

    if (!form.address || form.address.trim() === "") {
      return "સરનામું જરૂરી છે. (Address is required)";
    }
    if (form.address.trim().length < 10) {
      return "સરનામું ઓછામાં ઓછું 10 અક્ષરનું હોવું જોઈએ. (Address must be at least 10 characters)";
    }

    return null;
  };

  const validateStep2 = () => {
    if (familyMembers.length > 0) {
      for (let i = 0; i < familyMembers.length; i++) {
        const fm = familyMembers[i];
        if (!fm.name || fm.name.trim() === "") {
          return `સભ્ય ${i + 1} નું નામ જરૂરી છે. (Family member ${i + 1} name is required)`;
        }
        if (!fm.relation || fm.relation.trim() === "") {
          return `સભ્ય ${i + 1} નો સંબંધ જરૂરી છે. (Family member ${i + 1} relation is required)`;
        }
        if (!fm.gender || !["male", "female", "other"].includes(String(fm.gender).toLowerCase())) {
          return `સભ્ય ${i + 1} નું લિંગ જરૂરી છે. (Family member ${i + 1} gender is required)`;
        }
        let age = fm.age;
        if (fm.birthdate) {
          age = calculateAge(fm.birthdate);
        }
        if (age === undefined || age === null || String(age).trim() === "") {
          return `સભ્ય ${i + 1} ની ઉંમર જરૂરી છે. (Family member ${i + 1} age is required)`;
        }
        const ageNum = Number(age);
        if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
          return `સભ્ય ${i + 1} ની ઉંમર 0 થી 120 ની વચ્ચે હોવી જોઈએ. (Family member ${i + 1} age must be between 0 and 120)`;
        }
      }
    }
    return null;
  };

  const handleNext = () => {
    if (activeStep === 0) {
      const err = validateStep1();
      if (err) {
        setValidationError(err);
        return;
      }
    }
    setValidationError("");
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setValidationError("");
    setActiveStep((prev) => prev - 1);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setValidationError("");

    const err1 = validateStep1();
    if (err1) {
      setValidationError(err1);
      return;
    }

    const err2 = validateStep2();
    if (err2) {
      setValidationError(err2);
      return;
    }

    setSubmitting(true);
    const payload = {
      _id: form._id,
      head: { name: form.headName },
      rationNo: form.rationNo,
      address: form.address,
      city: form.city,
      mobile: form.mobile,
      additionalMobiles,
      pincode: form.pincode,
      zone: form.zone,
      uniqueNumber: form.uniqueNumber,
      familyMembers,
      issueDate: form.issueDate,
    };

    try {
      if (payload._id) {
        await api.put(`/members/${payload._id}`, { ...payload, requestNumber });
      } else {
        await api.post('/members', { ...payload, requestNumber });
      }
      onSubmit(payload, requestNumber);
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'માહિતી સંગ્રહિત કરવામાં ભૂલ';
      setValidationError(message);
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Back Button */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={onCancel}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          પાછળ
        </Button>
      </Box>

      {/* Stepper Header */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {validationError && <Alert severity="error" sx={{ mb: 3 }}>{validationError}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper 
        variant={isMobile ? "none" : "outlined"} 
        sx={{ 
          p: { xs: 0, sm: 3 }, 
          borderRadius: 2, 
          mb: { xs: 2, sm: 3 },
          border: isMobile ? 'none' : undefined,
          bgcolor: 'transparent'
        }}
      >
        {/* STEP 1: Head Member details */}
        {activeStep === 0 && (
          <Stack spacing={{ xs: 2.5, sm: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} color="primary">
              મુખ્ય વ્યક્તિની માહિતી
            </Typography>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              <Grid item xs={12}>
                <TextField label="મુખ્ય નામ" name="headName" value={form.headName} onChange={handleChange} fullWidth required size={isMobile ? "medium" : "small"} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  label="રિક્વેસ્ટ નંબર (Audit Request #)" 
                  name="requestNumber" 
                  value={requestNumber} 
                  onChange={(e) => setRequestNumber(e.target.value)} 
                  required 
                  fullWidth 
                  size={isMobile ? "medium" : "small"} 
                  helperText="આ ફેરફારને લૉગ કરવા માટે રિક્વેસ્ટ નંબર લખો."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="સભ્ય નંબર (Unique Number)" name="uniqueNumber" value={form.uniqueNumber} onChange={handleChange} required fullWidth size={isMobile ? "medium" : "small"} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="રેશન નંબર" name="rationNo" value={form.rationNo} onChange={handleChange} required fullWidth size={isMobile ? "medium" : "small"} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="મોબાઇલ નંબર" name="mobile" value={form.mobile} onChange={handleChange} required fullWidth size={isMobile ? "medium" : "small"} />
              </Grid>

              {/* Extra Mobile Numbers Section immediately after Primary Mobile Number */}
              <Grid item xs={12}>
                <Box sx={{ mt: 0.5, mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>વધારાના મોબાઇલ નંબર</Typography>
                  <Stack spacing={1.5}>
                    {additionalMobiles.map((m, idx) => (
                      <Card key={idx} variant="outlined" sx={{ bgcolor: 'background.default', border: isMobile ? undefined : 'none', p: isMobile ? 1.5 : 0 }}>
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
                      </Card>
                    ))}
                  </Stack>
                  <Button 
                    startIcon={<Add />} 
                    onClick={addAdditionalMobile} 
                    variant="outlined" 
                    size={isMobile ? "medium" : "small"} 
                    fullWidth={isMobile}
                    sx={{ mt: 1.5 }}
                  >
                    મોબાઇલ ઉમેરો
                  </Button>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField label="જારી તારીખ (Issue Date)" name="issueDate" type="date" InputLabelProps={{ shrink: true }} value={form.issueDate} onChange={handleChange} required fullWidth size={isMobile ? "medium" : "small"} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required size={isMobile ? "medium" : "small"}>
                  <InputLabel id="zone-label">ઝોન પસંદ કરો</InputLabel>
                  <Select labelId="zone-label" id="zone" name="zone" value={form.zone} onChange={handleChange} disabled={loadingZones} label="ઝોન પસંદ કરો">
                    {loadingZones ? <MenuItem disabled><CircularProgress size={20} /></MenuItem> : zones.map((zone) => (<MenuItem key={zone._id} value={zone._id}>{zone.number} - {zone.name}</MenuItem>))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField label="સરનામું" name="address" value={form.address} onChange={handleChange} required fullWidth size={isMobile ? "medium" : "small"} multiline minRows={2} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="શહેર" name="city" value={form.city} onChange={handleChange} fullWidth size={isMobile ? "medium" : "small"} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="પિનકોડ" name="pincode" value={form.pincode} onChange={handleChange} fullWidth size={isMobile ? "medium" : "small"} inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 }} />
              </Grid>
            </Grid>
          </Stack>
        )}

        {/* STEP 2: Family Members */}
        {activeStep === 1 && (
          <Stack spacing={3}>
            <Typography variant="subtitle1" fontWeight={600} color="primary">
              પરિવારના સભ્યો
            </Typography>
            {familyMembers.length === 0 && (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">કોઈ સભ્યો ઉમેરાયા નથી.</Typography>
            )}
            {familyMembers.map((m, idx) => (
              <Card key={idx} variant="outlined" sx={{ p: 2, position: 'relative' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" fontWeight={600}>સભ્ય {idx + 1}</Typography>
                  <IconButton color="error" onClick={() => removeMember(idx)}>
                    <Delete />
                  </IconButton>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <TextField label="નામ" value={m.name} onChange={(e) => handleMemberChange(idx, "name", e.target.value)} fullWidth size="small" required />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField label="સબંધ" value={m.relation} onChange={(e) => handleMemberChange(idx, "relation", e.target.value)} fullWidth size="small" required />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField label="જન્મતારીખ" type="date" InputLabelProps={{ shrink: true }} value={m.birthdate} onChange={(e) => handleMemberChange(idx, "birthdate", e.target.value)} fullWidth size="small" />
                  </Grid>
                  <Grid item xs={6} sm={2}>
                    <TextField label="ઉંમર" type="number" value={m.age} onChange={(e) => handleMemberChange(idx, "age", e.target.value)} fullWidth size="small" required />
                  </Grid>
                  <Grid item xs={6} sm={2}>
                    <FormControl fullWidth size="small" required>
                      <InputLabel id={`gender-label-${idx}`}>લિંગ</InputLabel>
                      <Select labelId={`gender-label-${idx}`} value={m.gender} onChange={(e) => handleMemberChange(idx, "gender", e.target.value)} label="લિંગ">
                        <MenuItem value="male">પુરુષ</MenuItem>
                        <MenuItem value="female">સ્ત્રી</MenuItem>
                        <MenuItem value="other">અન્ય</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Card>
            ))}
            <Button startIcon={<Add />} onClick={addMember} variant="outlined" sx={{ alignSelf: 'flex-start' }}>પરિવારનો સભ્ય ઉમેરો</Button>
          </Stack>
        )}
      </Paper>

      {/* Stepper Navigation Buttons */}
      <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: 'wrap', gap: 1.5, mt: 2 }}>
        <Button 
          disabled={activeStep === 0 || loading} 
          onClick={handleBack}
          variant="outlined"
          fullWidth={isMobile}
        >
          પાછા જાઓ
        </Button>
        {activeStep < 1 ? (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleNext}
            fullWidth={isMobile}
          >
            આગળ વધો
          </Button>
        ) : (
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleFinalSubmit}
            disabled={submitting}
            fullWidth={isMobile}
          >
            {submitting ? "Saving..." : "સાચવો"}
          </Button>
        )}
      </Box>
    </Box>
  );
}