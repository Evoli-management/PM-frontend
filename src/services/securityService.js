// src/services/securityService.js
import apiClient from "./apiClient";

class SecurityService {
    /**
     * Change user password
     * @param {Object} passwordData - { currentPassword, newPassword }
     * @returns {Promise<Object>} - { message }
     */
    async changePassword({ currentPassword, newPassword }) {
        const res = await apiClient.patch("/auth/change-password", {
            currentPassword,
            newPassword
        });
        return res.data;
    }

    /**
     * Request password change via email verification
     * @param {string} email - User's email
     * @returns {Promise<Object>} - { message }
     */
    async requestPasswordChange(email) {
        const res = await apiClient.post("/auth/request-password-change", { email });
        return res.data;
    }

    // === 2FA METHODS ===

    /**
     * Start 2FA setup - generates secret and QR code
     * @returns {Promise<Object>} - { secret, qrCodeUrl, backupCodes }
     */
    async start2FASetup() {
        const res = await apiClient.post("/auth/2fa/setup");
        return res.data;
    }

    /**
     * Verify 2FA setup with TOTP code
     * @param {string} code - 6-digit TOTP code
     * @returns {Promise<Object>} - { message, backupCodes }
     */
    async verify2FASetup(code) {
        const res = await apiClient.post("/auth/2fa/verify-setup", { code });
        return res.data;
    }

    /**
     * Disable 2FA with verification
     * @param {string} code - 6-digit TOTP code or backup code
     * @returns {Promise<Object>} - { message }
     */
    async disable2FA(code) {
        const res = await apiClient.post("/auth/2fa/disable", { code });
        return res.data;
    }

    /**
     * Get 2FA status
     * @returns {Promise<Object>} - { enabled, backupCodesRemaining }
     */
    async get2FAStatus() {
        const res = await apiClient.get("/auth/2fa/status");
        return res.data;
    }

    /**
     * Generate new backup codes (requires 2FA verification)
     * @param {string} code - 6-digit TOTP code
     * @returns {Promise<Object>} - { backupCodes }
     */
    async generateBackupCodes(code) {
        const res = await apiClient.post("/auth/2fa/backup-codes", { code });
        return res.data;
    }

    // === SESSION MANAGEMENT ===

    /**
     * Get active sessions
     * @returns {Promise<Object>} - { sessions: [...] }
     */
    async getActiveSessions() {
        const res = await apiClient.get("/auth/sessions");
        return res.data;
    }

    /**
     * Revoke a specific session
     * @param {string} sessionId - Session ID to revoke
     * @returns {Promise<Object>} - { message }
     */
    async revokeSession(sessionId) {
        const res = await apiClient.delete(`/auth/sessions/${sessionId}`);
        return res.data;
    }

    /**
     * Logout from all sessions except current
     * @returns {Promise<Object>} - { message, revokedCount }
     */
    async logoutAllSessions() {
        const res = await apiClient.post("/auth/sessions/logout-all");
        return res.data;
    }

    /**
     * Get login history
     * @param {number} limit - Number of entries to return (default: 50)
     * @returns {Promise<Object>} - { history: [...] }
     */
    async getLoginHistory(limit = 50) {
        const res = await apiClient.get(`/auth/login-history?limit=${limit}`);
        return res.data;
    }

    // === SECURITY SETTINGS ===

    /**
     * Update security settings
     * @param {Object} settings - Security preferences
     * @returns {Promise<Object>} - { message }
     */
    async updateSecuritySettings(settings) {
        const res = await apiClient.patch("/auth/security-settings", settings);
        return res.data;
    }

    /**
     * Get security settings
     * @returns {Promise<Object>} - User's security settings
     */
    async getSecuritySettings() {
        const res = await apiClient.get("/auth/security-settings");
        return res.data;
    }

    // === EMAIL VERIFICATION ===

    /**
     * Request email change
     * @param {string} newEmail - New email address
     * @param {string} password - Current password for verification
     * @returns {Promise<Object>} - { message }
     */
    async requestEmailChange(newEmail, password) {
        const res = await apiClient.post("/auth/change-email", {
            newEmail,
            password
        });
        return res.data;
    }

    /**
     * Verify email change with token
     * @param {string} token - Email verification token
     * @returns {Promise<Object>} - { message }
     */
    async verifyEmailChange(token) {
        const res = await apiClient.post("/auth/verify-email-change", { token });
        return res.data;
    }

    // === DEVICE MANAGEMENT ===

    /**
     * Get trusted devices
     * @returns {Promise<Object>} - { devices: [...] }
     */
    async getTrustedDevices() {
        const res = await apiClient.get("/auth/trusted-devices");
        return res.data;
    }

    /**
     * Remove trusted device
     * @param {string} deviceId - Device ID to remove
     * @returns {Promise<Object>} - { message }
     */
    async removeTrustedDevice(deviceId) {
        const res = await apiClient.delete(`/auth/trusted-devices/${deviceId}`);
        return res.data;
    }

    // === ACCOUNT SECURITY ===

    /**
     * Get security overview (recent activity, suspicious logins, etc.)
     * @returns {Promise<Object>} - Security dashboard data
     */
    async getSecurityOverview() {
        const res = await apiClient.get("/auth/security-overview");
        return res.data;
    }

    /**
     * Report suspicious activity
     * @param {Object} report - { type, description, sessionId? }
     * @returns {Promise<Object>} - { message }
     */
    async reportSuspiciousActivity(report) {
        const res = await apiClient.post("/auth/report-suspicious", report);
        return res.data;
    }
}

export default new SecurityService();