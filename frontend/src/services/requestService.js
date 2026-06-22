// frontend/src/services/requestService.js
import axios from "axios";

// Create axios instance
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

// Attach token to every request (if needed for admin actions later)
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ---------------- PUBLIC API ---------------- */

// Submit a new registration request
// ✅ EXPORT as named function
export const submitRequest = async (payload) => {
  try {
      const res = await API.post("/requests", payload);
      return res.data;
  } catch (error) {
      console.error("Error submitting request:", error.response || error.message || error); // Log detailed error
      // Re-throw the error so the calling function (handleSubmit) knows it failed
      // and can display the error message from the backend if available
      throw error;
  }
};


/* ---------------- ADMIN APIS ---------------- */
// (These are needed by the admin Requests page)

// Get all pending requests (used by Requests.js, keep it named)
// ✅ EXPORT as named function
export const fetchPendingRequests = async () => {
  const res = await API.get("/requests");
  return res.data;
};

// Approve a request with uniqueNumber (used by Requests.js, keep it named)
// ✅ EXPORT as named function
export const approveRequest = async (id, uniqueNumber) => {
  const res = await API.post(`/requests/${id}/approve`, { uniqueNumber });
  return res.data;
};

// Decline (mark as rejected) a request (used by Requests.js, keep it named)
// ✅ EXPORT as named function
export const declineRequest = async (id) => {
  // Match the backend route which now uses DELETE to set status to rejected
  const res = await API.delete(`/requests/${id}`);
  return res.data;
};


// ✅ REMOVE the default export block entirely
/*
const requestService = {
  submitRequest,
  fetchPendingRequests,
  approveRequest,
  declineRequest,
};
export default requestService;
*/