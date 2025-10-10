// src/services/authService.js
import apiClient from "./apiClient";

class AuthService {
    async forgotPassword(email) {
        const res = await apiClient.post("/auth/forgot-password", { email });
        return res.data; // { message }
    }

    async resetPassword(token, newPassword) {
        const res = await apiClient.post("/auth/reset-password", { token, newPassword });
        return res.data; // { message }
    }
    async register({ firstName, lastName, email, password }) {
        const res = await apiClient.post("/auth/register", {
            firstName,
            lastName,
            email,
            password,
        });
        const data = res.data; // { message, token }
        
        // Store token in localStorage for mobile compatibility
        if (data.token) {
            localStorage.setItem("access_token", data.token);
        }
        
        return data;
    }

    async login({ email, password }) {
        const res = await apiClient.post("/auth/login", { email, password });
        const data = res.data; // { message, user, token }
        
        // Store token in localStorage for mobile compatibility
        if (data.token) {
            localStorage.setItem("access_token", data.token);
        }
        
        return data;
    }

    async verifyToken() {
        const res = await apiClient.get("/users/me");
        return res.data; // { message, user }
    }

    async verifyEmail(token) {
        // Use GET to match backend convenience endpoint
        const res = await apiClient.get(`/auth/verify-email`, { params: { token } });
        return res.data; // string message
    }

    async resendVerification(email) {
        const res = await apiClient.post(`/auth/resend-verification`, { email });
        return res.data; // { message }
    }

    async logout() {
        try {
            await apiClient.post("/auth/logout");
        } catch (error) {
            console.log("Logout API call failed:", error);
        } finally {
            localStorage.removeItem("access_token");
        }
    }
}

export default new AuthService();
