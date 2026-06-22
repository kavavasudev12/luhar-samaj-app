import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

// Attach JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

/* ------------------- AUTH ------------------- */
export const registerUser = (data) => api.post("/auth/register", data);

export const loginUser = async (data) => {
  const res = await api.post("/auth/login", data);

  if (res.data?.token) {
    localStorage.setItem("token", res.data.token);
  } else {
    console.warn("⚠️ No token found in login response:", res.data);
  }

  return res;
};

export const getProfile = () => api.get("/auth/me");

/* ------------------- MEMBERS ------------------- */
// Note: publicRegisterMember seems redundant if using the /requests flow
// export const publicRegisterMember = (data) =>
//   api.post("/members/register", data);

export const getMembers = () => api.get("/members");
// Note: getPendingMembers seems redundant if using the /requests flow with status
// export const getPendingMembers = () => api.get("/members/pending");
// Note: approveMember/rejectMember seem redundant if using the /requests flow
// export const approveMember = (id) => api.post(`/members/${id}/approve`);
// export const rejectMember = (id) => api.post(`/members/${id}/reject`);

// Ensure updateMember and deleteMember use the correct ID format
// Assuming 'member' object has '_id' property
export const updateMember = (member, data) =>
  api.put(`/members/${member._id}`, data);

// Assuming 'member' object has '_id' property, pass ID directly
export const deleteMember = (memberId) =>
  api.delete(`/members/${memberId}`);


export const downloadMemberPdf = (id) =>
  api.get(`/members/${id}/pdf`, { responseType: "blob" });

export const verifyCard = (cardId) => api.get(`/members/verify/${cardId}`);

/* ------------------- ZONES ------------------- */
export const getPublicZones = () => api.get("/zones/public");
export const getZones = () => api.get("/zones");
export const createZone = (data) => api.post("/zones", data);
export const updateZone = (id, data) => api.put(`/zones/${id}`, data);
export const deleteZone = (id) => api.delete(`/zones/${id}`);

/* ------------------- REQUESTS ------------------- */
export const getRequests = () => api.get("/requests");

// 🔹 MODIFIED: This now sends the entire payload object (which contains uniqueNumber and requestNumber)
export const approveRequest = (id, payload) =>
  api.post(`/requests/${id}/approve`, payload);

// ✅ FIX: Use DELETE method and remove reviewNotes parameter
// This matches the backend route: router.delete("/:id", auth, ...)
export const declineRequest = (id) =>
  api.delete(`/requests/${id}`); // Use DELETE and don't send notes

export const updateRequest = (id, data) =>
  api.put(`/requests/${id}`, data);

export const getPublicStats = () =>
  api.get("/dashboard/public-stats");

export default api; // Keep default export for the configured axios instance