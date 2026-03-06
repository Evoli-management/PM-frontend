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
        const deviceFingerprint = this._getDeviceFingerprint();
        const res = await apiClient.post("/auth/login", { email, password, deviceFingerprint });
        const data = res.data; // { message, user, token } OR { mfaRequired: true, mfaPendingToken }

        // Store token in localStorage for mobile compatibility
        if (data.token) {
            localStorage.setItem("access_token", data.token);
        }

        return data;
    }

    async completeMfaLogin({ mfaPendingToken, code, trustDevice = false, deviceName }) {
        const deviceFingerprint = this._getDeviceFingerprint();
        const res = await apiClient.post("/auth/2fa/login", {
            mfaPendingToken,
            code,
            trustDevice,
            deviceFingerprint,
            deviceName: deviceName || this._getDeviceName(),
        });
        const data = res.data;
        if (data.token) {
            localStorage.setItem("access_token", data.token);
        }
        return data;
    }

    async getMfaStatus() {
        const res = await apiClient.get("/auth/2fa/status");
        return res.data; // { enabled, backupCodesRemaining }
    }

    async setupMfa() {
        const res = await apiClient.post("/auth/2fa/setup");
        return res.data; // { secret, qrCodeUrl, manualEntryKey }
    }

    async verifyMfaSetup(code) {
        const res = await apiClient.post("/auth/2fa/verify-setup", { code });
        return res.data; // { backupCodes }
    }

    async disableMfa(code) {
        const res = await apiClient.post("/auth/2fa/disable", { code });
        return res.data;
    }

    async regenerateBackupCodes(code) {
        const res = await apiClient.post("/auth/2fa/backup-codes", { code });
        return res.data; // { backupCodes }
    }

    _getDeviceFingerprint() {
        let fp = localStorage.getItem("device_fingerprint");
        if (!fp) {
            fp = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
            localStorage.setItem("device_fingerprint", fp);
        }
        return fp;
    }

    _getDeviceName() {
        const ua = navigator.userAgent;
        const browser = /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : /Edge/.test(ua) ? "Edge" : "Browser";
        const os = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : "Unknown OS";
        return `${browser} on ${os}`;
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

    async verify() {
        try {
            const res = await apiClient.get("/users/me");
            return res.data; // Returns user data if authenticated
        } catch (err) {
            // Not authenticated
            throw err;
        }
    }

    async checkEmailExists(email) {
        try {
            // This is a public endpoint that checks if an email exists without authentication
            const res = await apiClient.post("/auth/check-email", { email });
            return res.data?.exists || false;
        } catch (err) {
            // If endpoint doesn't exist, default to false (safer option)
            console.warn("Email check endpoint not available");
            return false;
        }
    }

    async sendRegistrationLink(email) {
        // Send registration link to email
        // Always returns success for security (don't reveal if email exists)
        const res = await apiClient.post("/auth/send-registration-link", { email });
        return res.data; // { message }
    }
}

export default new AuthService();
