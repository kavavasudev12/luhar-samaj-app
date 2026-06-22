import api from './api';

// Fetch overall dashboard stats
export const getDashboardData = async () => {
  try {
    const response = await api.get('/dashboard'); // backend route for overall stats
    return response.data;
  } catch (error) {
    console.error('Dashboard API error:', error.response?.data || error.message);
    throw new Error('Failed to fetch dashboard data');
  }
};

// Fetch all zones with family counts
export const getZonesWithFamilies = async () => {
  try {
    const response = await api.get('/zones'); 
    // Expecting backend to return: [{ _id, name, totalPeople, totalFamilies }]
    return response.data;
  } catch (error) {
    console.error('Zones API error:', error.response?.data || error.message);
    throw new Error('Failed to fetch zones data');
  }
};
