// src/services/apiClient.js
import axios from "axios";


// Use VITE_API_BASE_URL from .env for all API requests
const apiBase = import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.DEV ? "/api" : "https://practicalmanager-4241d0bfc5ed.herokuapp.com/api");

const apiClient = axios.create({
    baseURL: apiBase,
    timeout: 10000,
    withCredentials: true,
});

// No Authorization header injection; rely on httpOnly cookie only

// Response interceptor to handle errors
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            try {
                const m = error.config?.method?.toUpperCase?.() || "GET";
                const u = error.config?.baseURL
                    ? `${error.config.baseURL}${error.config.url || ""}`
                    : error.config?.url || "";
                // Helpful log to pinpoint which call failed auth
                console.warn(`401 Unauthorized: ${m} ${u}`);
            } catch {}
            // Token expired or not logged in; rely on cookie-based auth
            localStorage.removeItem("access_token");
            // Use HashRouter
            window.location.hash = "#/login";
        }
        return Promise.reject(error);
    },
);

export default apiClient;
