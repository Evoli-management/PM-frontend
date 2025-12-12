// src/services/userPreferencesService.js
import apiClient from "./apiClient";

class UserPreferencesService {
    /**
     * Get user preferences
     * @returns {Promise<Object>} - User preferences data
     */
    async getPreferences() {
        const res = await apiClient.get("/user/preferences");
        return res.data;
    }

    /**
     * Update user preferences
     * @param {Object} preferences - Preferences data to update
     * @returns {Promise<Object>} - Updated preferences data
     */
    async updatePreferences(preferences) {
        const res = await apiClient.patch("/user/preferences", preferences);
        return res.data;
    }

    /**
     * Reset user preferences to defaults
     * @returns {Promise<Object>} - Default preferences data
     */
    async resetPreferences() {
        const res = await apiClient.post("/user/preferences/reset");
        return res.data;
    }

    /**
     * Validate preference data before saving
     * NOTE: Do NOT validate time format here - it's validated on the frontend
     * during input (TimePicker ensures HH:MM format) and on the backend.
     * Additional validation here can cause false positives.
     * 
     * @param {Object} preferences - Preferences data to validate
     * @returns {Object} - Validation result { isValid: boolean, errors: Object }
     */
    validatePreferences(preferences) {
        const errors = {};

        // NOTE: Work hours validation removed from here
        // Reasons:
        // 1. TimePicker component ensures HH:MM format on input
        // 2. Frontend saves() method has additional validation
        // 3. Backend DTO has @Matches validator for format
        // 4. Double validation causes false "invalid format" errors

        // Time constraint validation only (not format)
        if (preferences.workStartTime && preferences.workEndTime) {
            if (preferences.workStartTime >= preferences.workEndTime) {
                errors.workTimes = 'Work start time must be before end time';
            }
        }

        // Validate reminder timing values
        const validTimings = ['5min', '15min', '30min', '1hour', '2hours', '1day'];
        
        if (preferences.goalReminderTiming !== undefined) {
            if (!validTimings.includes(preferences.goalReminderTiming)) {
                errors.goalReminderTiming = 'Invalid goal reminder timing';
            }
        }

        if (preferences.pmReminderTiming !== undefined) {
            if (!validTimings.includes(preferences.pmReminderTiming)) {
                errors.pmReminderTiming = 'Invalid PracticalManager reminder timing';
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Check if a time string is in valid HH:MM format
     * @param {string} time - Time string to validate
     * @returns {boolean} - Whether the time format is valid
     */
    isValidTimeFormat(time) {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(time);
    }

    /**
     * Format preferences data for display
     * @param {Object} preferences - Raw preferences data from API
     * @returns {Object} - Formatted preferences data
     */
    formatPreferencesData(preferences) {
        return {
            ...preferences,
            workHours: {
                start: preferences.workStartTime || '09:00',
                end: preferences.workEndTime || '17:00'
            },
            goalReminders: {
                email: preferences.goalRemindersEmail ?? true,
                desktop: preferences.goalRemindersDesktop ?? true,
                timing: preferences.goalReminderTiming || '1hour'
            },
            pmReminders: {
                email: preferences.pmRemindersEmail ?? true,
                desktop: preferences.pmRemindersDesktop ?? true,
                timing: preferences.pmReminderTiming || '30min'
            }
        };
    }

    /**
     * Convert formatted preferences data back to API format
     * @param {Object} formattedPreferences - Formatted preferences data
     * @returns {Object} - API-compatible preferences data
     */
    formatPreferencesForAPI(formattedPreferences) {
        const apiData = {};

        if (formattedPreferences.workHours) {
            if (formattedPreferences.workHours.start !== undefined) {
                apiData.workStartTime = formattedPreferences.workHours.start;
            }
            if (formattedPreferences.workHours.end !== undefined) {
                apiData.workEndTime = formattedPreferences.workHours.end;
            }
        }

        if (formattedPreferences.goalReminders) {
            if (formattedPreferences.goalReminders.email !== undefined) {
                apiData.goalRemindersEmail = formattedPreferences.goalReminders.email;
            }
            if (formattedPreferences.goalReminders.desktop !== undefined) {
                apiData.goalRemindersDesktop = formattedPreferences.goalReminders.desktop;
            }
            if (formattedPreferences.goalReminders.timing !== undefined) {
                apiData.goalReminderTiming = formattedPreferences.goalReminders.timing;
            }
        }

        if (formattedPreferences.pmReminders) {
            if (formattedPreferences.pmReminders.email !== undefined) {
                apiData.pmRemindersEmail = formattedPreferences.pmReminders.email;
            }
            if (formattedPreferences.pmReminders.desktop !== undefined) {
                apiData.pmRemindersDesktop = formattedPreferences.pmReminders.desktop;
            }
            if (formattedPreferences.pmReminders.timing !== undefined) {
                apiData.pmReminderTiming = formattedPreferences.pmReminders.timing;
            }
        }

        return apiData;
    }

    /**
     * Get default preferences values
     * @returns {Object} - Default preferences
     */
    getDefaultPreferences() {
        return {
            workStartTime: '09:00',
            workEndTime: '17:00',
            goalRemindersEmail: true,
            goalRemindersDesktop: true,
            goalReminderTiming: '1hour',
            pmRemindersEmail: true,
            pmRemindersDesktop: true,
            pmReminderTiming: '30min'
        };
    }

    /**
     * Get available reminder timing options
     * @returns {Array} - Available timing options with labels
     */
    getReminderTimingOptions() {
        return [
            { value: '5min', label: '5 minutes before' },
            { value: '15min', label: '15 minutes before' },
            { value: '30min', label: '30 minutes before' },
            { value: '1hour', label: '1 hour before' },
            { value: '2hours', label: '2 hours before' },
            { value: '1day', label: '1 day before' }
        ];
    }
}

export default new UserPreferencesService();