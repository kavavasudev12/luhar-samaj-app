import React, { useState, useEffect } from 'react';
import { List, ListItem, ListItemText, Divider, Button, Typography } from '@mui/material';
import api from '../services/api';

const ZoneList = ({ onZoneSelect }) => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await api.get('/zones');
        setZones(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching zones:', err);
        setLoading(false);
      }
    };
    fetchZones();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this zone?')) {
      try {
        await api.delete(`/zones/${id}`);
        setZones(zones.filter(zone => zone._id !== id));
      } catch (err) {
        console.error('Error deleting zone:', err);
      }
    }
  };

  if (loading) return <Typography>Loading zones...</Typography>;
  if (zones.length === 0) return <Typography>No zones found</Typography>;

  return (
    <List>
      {zones.map((zone) => (
        <React.Fragment key={zone._id}>
          <ListItem>
            <ListItemText 
              primary={`${zone.number} - ${zone.name}`} 
              secondary={`Total members: ${zone.totalPeople || 0}`} 
            />
            <Button 
              variant="contained" 
              color="error"
              size="small"
              onClick={() => handleDelete(zone._id)}
              sx={{ ml: 2 }}
            >
              Delete
            </Button>
          </ListItem>
          <Divider />
        </React.Fragment>
      ))}
    </List>
  );
};

export default ZoneList;