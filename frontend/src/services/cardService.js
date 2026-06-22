import api from './api';

export const generateMemberCard = async (memberId) => {
  try {
    const response = await api.post(`/api/cards/generate/${memberId}`);
    return response.data.pdfUrl;
  } catch (error) {
    throw error.response?.data?.error || 'Card generation failed';
  }
};

export const generateZoneCards = async (zoneId) => {
  try {
    const response = await api.post(`/api/cards/generate/zone/${zoneId}`);
    return response.data.zipUrl;
  } catch (error) {
    throw error.response?.data?.error || 'Batch generation failed';
  }
};