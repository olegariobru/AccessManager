import axios from "axios";
import { clearSession, getCsrfToken, setCsrfToken } from "../utils/auth";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
export const api = axios.create({ baseURL: apiUrl, timeout: 15000, withCredentials: true,
  headers: { "Content-Type": "application/json" } });
let csrfRequest;
api.interceptors.request.use(async (config) => {
  if (!["get", "head", "options"].includes(String(config.method || "get").toLowerCase())) {
    if (!getCsrfToken()) {
      csrfRequest ||= api.get("/auth/csrf").then(({ data }) => setCsrfToken(data.csrfToken))
        .finally(() => { csrfRequest = null; });
      await csrfRequest;
    }
    config.headers.set("X-CSRF-Token", getCsrfToken());
  }
  return config;
});
api.interceptors.response.use((response) => {
  if (response.data?.csrfToken) setCsrfToken(response.data.csrfToken);
  return response;
}, (error) => {
  if (error.response?.status === 401 && !String(error.config?.url || "").includes("/auth/login")) clearSession();
  if (error.response?.data?.code === "CSRF_INVALID") setCsrfToken(null);
  return Promise.reject(error);
});
export default api;
