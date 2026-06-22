import api from './api';

// Returns an array of people for a given zoneId
export async function getPeopleByZone(zoneId) {
  const { data } = await api.get(`/zones/${zoneId}/people`);
  return data; // expect: [{ _id, name, age, phone?, address?, relation?, isHead? }]
}
