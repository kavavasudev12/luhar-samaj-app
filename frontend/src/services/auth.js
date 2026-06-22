import api from "./api";

export const login = async (email, password) => {
  try {
    const response = await api.post("/auth/login", { email, password }); // ✅ fixed
    localStorage.setItem("token", response.data.token);
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Login failed";
  }
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userRole");
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get("/auth/me"); // ✅ fixed
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to fetch user";
  }
};

export const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};
