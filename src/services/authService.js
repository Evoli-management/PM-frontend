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

    // Secure password change methods
    async requestPasswordChange(currentPassword, newPassword) {
        const res = await apiClient.post("/auth/request-password-change", {
            currentPassword,
            newPassword
        });
        return res.data; // { message }
    }

    async confirmPasswordChange(token) {
        // Use GET to match backend convenience endpoint
        const res = await apiClient.get(`/auth/confirm-password-change`, { params: { token } });
        return res.data; // { message }
    }

    // Secure email change methods
    async requestEmailChange(newEmail, currentPassword) {
        const res = await apiClient.post("/auth/request-email-change", {
            newEmail,
            currentPassword
        });
        return res.data; // { message }
    }

    async confirmEmailChange(token) {
        // Use GET to match backend convenience endpoint
        const res = await apiClient.get(`/auth/confirm-email-change`, { params: { token } });
        return res.data; // { message }
    }
}

export default new AuthService();
