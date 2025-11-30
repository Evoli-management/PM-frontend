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

// Add Authorization header if token exists in localStorage
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Debug logging only in development to avoid slowdowns from frequent logging
        if (import.meta.env.DEV) {
            try {
                console.debug("API Request:", {
                    method: config.method?.toUpperCase(),
                    url: `${config.baseURL || ""}${config.url || ""}`,
                    hasToken: !!token,
                    hasAuth: !!config.headers.Authorization,
                    withCredentials: config.withCredentials,
                });
            } catch (__) {}
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
    (response) => {
        if (import.meta.env.DEV) {
            try {
                console.debug("API Response:", {
                    status: response.status,
                    url: response.config.url,
                    success: true,
                });
            } catch (__) {}
        }
        return response;
    },
    (error) => {
        // Print a more detailed, inspectable error object so devs can see server
        // error details directly in the browser console (stringify safely).
        let respData = null;
        try {
            respData = error.response?.data;
        } catch (e) {
            respData = undefined;
        }
        // Log a concise error; avoid expensive stringify operations on large response
        try {
            if (import.meta.env.DEV) {
                console.error("API Error:", {
                    status: error.response?.status,
                    url: error.config?.url,
                    message: error.message,
                    responseData: respData,
                });
            } else {
                console.error("API Error:", error.message || error);
            }
        } catch (e) {
            // Fallback to basic logging
            console.error("API Error (fallback):", error);
        }
        
        if (error.response?.status === 401) {
            try {
                const m = error.config?.method?.toUpperCase?.() || "GET";
                const u = error.config?.baseURL
                    ? `${error.config.baseURL}${error.config.url || ""}`
                    : error.config?.url || "";
                // Helpful log to pinpoint which call failed auth
                console.warn(`401 Unauthorized: ${m} ${u}`);
            } catch {}
            // Token expired or not logged in
            localStorage.removeItem("access_token");
            // Use HashRouter
            window.location.hash = "#/login";
        }
        return Promise.reject(error);
    },
);

export default apiClient;
