// frontend/src/pages/ZoneForm.js
import React, { useState, useEffect } from 'react';
import { TextField, Button, Box } from '@mui/material';
import api from '../services/api';

const ZoneForm = ({ zone, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    number: '',
    name: ''
  });

  // ✅ Pre-fill when editing
  useEffect(() => {
    if (zone) {
      setFormData({
        number: zone.number || '',
        name: zone.name || ''
      });
    }
  }, [zone]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (zone && zone._id) {
        // ✏️ Update existing zone
        await api.put(`/zones/${zone._id}`, formData);
      } else {
        // ➕ Create new zone
        await api.post('/zones', formData);
      }
      onSave();
      onClose();
      setFormData({ number: '', name: '' }); // Reset form
    } catch (err) {
      console.error('Error saving zone:', err.response?.data || err.message);
    }
  };

  return (
    <Box 
      component="form" 
      onSubmit={handleSubmit} 
      sx={{ mt: 3, maxWidth: 500, mx: "auto" }}
    >
      <TextField
        fullWidth
        margin="normal"
        label="ઝોન નંબર *"
        name="number"
        value={formData.number}
        onChange={handleChange}
        required
        autoComplete="off"
      />
      <TextField
        fullWidth
        margin="normal"
        label="ઝોન નામ *"
        name="name"
        value={formData.name}
        onChange={handleChange}
        required
        autoComplete="off"
      />

      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 3 }}>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
        >
          {zone ? "અપડેટ કરો" : "સેવ કરો"}
        </Button>
        <Button 
          variant="outlined" 
          color="secondary" 
          onClick={onClose}
        >
          રદ કરો
        </Button>
      </Box>
    </Box>
  );
};

export default ZoneForm;
