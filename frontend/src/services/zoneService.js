// src/services/zoneService.js
import api from './api';

// Get all zones
export const getZones = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await api.get('/zones', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return res.data;
  } catch (err) {
    console.error('❌ [ZoneService] Error fetching zones:', err.response?.data || err.message);
    throw err;
  }
};

// Add new zone
export const addZone = async (zone) => {
  try {
    const token = localStorage.getItem('token');
    const res = await api.post('/zones', zone, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return res.data;
  } catch (err) {
    console.error('❌ [ZoneService] Error adding zone:', err.response?.data || err.message);
    throw err;
  }
};

// Delete zone
export const deleteZone = async (id) => {
  try {
    const token = localStorage.getItem('token');
    const res = await api.delete(`/zones/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return res.data;
  } catch (err) {
    console.error('❌ [ZoneService] Error deleting zone:', err.response?.data || err.message);
    throw err;
  }
};
