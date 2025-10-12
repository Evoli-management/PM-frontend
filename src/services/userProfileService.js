// src/services/userProfileService.js
import apiClient from "./apiClient";

class UserProfileService {
    /**
     * Get current user profile
     * @returns {Promise<Object>} - User profile data
     */
    async getProfile() {
        const res = await apiClient.get("/user/profile");
        console.log('Raw API response from /user/profile:', res.data);
        return res.data;
    }

    /**
     * Update user profile
     * @param {Object} profileData - Profile data to update
     * @returns {Promise<Object>} - Updated profile data
     */
    async updateProfile(profileData) {
        const res = await apiClient.patch("/user/profile", profileData);
        return res.data;
    }

    /**
     * Update personal information (name and phone only)
     * @param {Object} personalData - { name, phone }
     * @returns {Promise<Object>} - Updated profile data
     */
    async updatePersonalInfo({ name, phone }) {
        // Split name into firstName and lastName
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const profileData = {
            firstName,
            lastName,
            phone
        };

        return this.updateProfile(profileData);
    }

    /**
     * Update professional information
     * @param {Object} professionalData - { jobTitle, department, manager, bio, skills }
     * @returns {Promise<Object>} - Updated profile data
     */
    async updateProfessionalInfo(professionalData) {
        return this.updateProfile(professionalData);
    }

    /**
     * Update avatar
     * @param {string} avatarUrl - Avatar URL or base64 data
     * @returns {Promise<Object>} - Updated profile data
     */
    async updateAvatar(avatarUrl) {
        return this.updateProfile({ avatarUrl });
    }

    /**
     * Get user preferences
     * @returns {Promise<Object>} - User preferences
     */
    async getPreferences() {
        const res = await apiClient.get("/user/preferences");
        return res.data;
    }

    /**
     * Update user preferences
     * @param {Object} preferences - User preferences data
     * @returns {Promise<Object>} - Updated preferences
     */
    async updatePreferences(preferences) {
        const res = await apiClient.patch("/user/preferences", preferences);
        return res.data;
    }

    /**
     * Delete user account
     * @param {string} password - Current password for verification
     * @returns {Promise<Object>} - Deletion confirmation
     */
    async deleteAccount(password) {
        const res = await apiClient.delete("/user/profile", {
            data: { password }
        });
        return res.data;
    }

    /**
     * Request email change
     * @param {string} newEmail - New email address
     * @param {string} password - Current password for verification
     * @returns {Promise<Object>} - Change request confirmation
     */
    async requestEmailChange(newEmail, password) {
        const res = await apiClient.post("/user/profile/change-email", {
            newEmail,
            password
        });
        return res.data;
    }

    /**
     * Verify email change
     * @param {string} token - Email verification token
     * @returns {Promise<Object>} - Verification confirmation
     */
    async verifyEmailChange(token) {
        const res = await apiClient.post("/user/profile/verify-email-change", {
            token
        });
        return res.data;
    }

    /**
     * Get user activity log
     * @param {number} limit - Number of entries to return
     * @returns {Promise<Object>} - Activity log entries
     */
    async getActivityLog(limit = 50) {
        const res = await apiClient.get(`/user/activity?limit=${limit}`);
        return res.data;
    }

    /**
     * Format profile data for display
     * @param {Object} profileData - Raw profile data from API
     * @returns {Object} - Formatted profile data
     */
    formatProfileData(profileData) {
        console.log('formatProfileData input:', profileData);
        const { firstName, lastName, fullName, ...rest } = profileData;
        
        // Use fullName from backend if available, otherwise construct from firstName/lastName
        const displayName = fullName || `${firstName || ''} ${lastName || ''}`.trim() || '';
        console.log('Display name calculated:', displayName, { firstName, lastName, fullName });
        
        const result = {
            ...rest,
            name: displayName,
            fullName: displayName || 'Anonymous User',
            firstName,
            lastName
        };
        
        console.log('formatProfileData result:', result);
        return result;
    }

    /**
     * Validate profile data before saving
     * @param {Object} profileData - Profile data to validate
     * @returns {Object} - Validation result { isValid: boolean, errors: Object }
     */
    validateProfileData(profileData) {
        const errors = {};

        if (profileData.firstName !== undefined) {
            if (!profileData.firstName || profileData.firstName.trim().length === 0) {
                errors.firstName = 'First name is required';
            } else if (profileData.firstName.length > 50) {
                errors.firstName = 'First name must be less than 50 characters';
            }
        }

        if (profileData.lastName !== undefined) {
            if (profileData.lastName && profileData.lastName.length > 50) {
                errors.lastName = 'Last name must be less than 50 characters';
            }
        }

        if (profileData.email !== undefined) {
            if (!profileData.email || profileData.email.trim().length === 0) {
                errors.email = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
                errors.email = 'Invalid email format';
            }
        }

        if (profileData.phone !== undefined && profileData.phone) {
            if (!/^\+?[\d\s\-\(\)]+$/.test(profileData.phone)) {
                errors.phone = 'Invalid phone number format';
            }
        }

        if (profileData.bio !== undefined && profileData.bio) {
            if (profileData.bio.length > 1000) {
                errors.bio = 'Bio must be less than 1000 characters';
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
}

export default new UserProfileService();