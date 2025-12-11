/**
 * Global Date & Time Formatter Service
 * 
 * Centralized service for formatting dates and times based on user preferences.
 * Ensures consistency across the entire application.
 * 
 * Used by: Calendar views, appointments, events, goals, tasks, reports, dashboard
 */

import userPreferencesService from './userPreferencesService';

class DateTimeFormatterService {
    constructor() {
        this.cachedPreferences = null;
        this.preferencesCacheTime = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get user preferences with caching
     */
    async getPreferences() {
        const now = Date.now();
        
        // Return cached preferences if still valid
        if (
            this.cachedPreferences &&
            this.preferencesCacheTime &&
            now - this.preferencesCacheTime < this.CACHE_DURATION
        ) {
            return this.cachedPreferences;
        }

        try {
            const prefs = await userPreferencesService.getPreferences();
            this.cachedPreferences = prefs;
            this.preferencesCacheTime = now;
            return prefs;
        } catch (error) {
            console.error('Failed to get user preferences:', error);
            // Return safe defaults
            return {
                dateFormat: 'MM/dd/yyyy',
                timeFormat: '12h'
            };
        }
    }

    /**
     * Invalidate cached preferences
     */
    invalidateCache() {
        this.cachedPreferences = null;
        this.preferencesCacheTime = null;
    }

    /**
     * Format a date according to user's date format preference
     * @param {Date|string|number} date - The date to format
     * @param {string} dateFormat - Optional override of date format (uses preference if not provided)
     * @returns {string} - Formatted date string
     */
    async formatDate(date, dateFormat = null) {
        const preferences = await this.getPreferences();
        const format = dateFormat || preferences.dateFormat || 'MM/dd/yyyy';
        
        if (!date) return '';

        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return String(date);

        return this._formatDateSync(dateObj, format);
    }

    /**
     * Format a date synchronously (use with caution - no cache refresh)
     * Only use when preferences are already loaded
     */
    formatDateSync(date, dateFormat = 'MM/dd/yyyy') {
        if (!date) return '';

        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return String(date);

        return this._formatDateSync(dateObj, dateFormat);
    }

    /**
     * Internal sync date formatting function
     */
    _formatDateSync(dateObj, format) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        
        switch (format) {
            case 'MM/dd/yyyy':
                // US Format: 12/25/2024
                return `${month}/${day}/${year}`;
            
            case 'dd/MM/yyyy':
                // European Format: 25/12/2024
                return `${day}/${month}/${year}`;
            
            case 'yyyy-MM-dd':
                // ISO Format: 2024-12-25
                return `${year}-${month}-${day}`;
            
            case 'MMM dd, yyyy': {
                // Long Format: Dec 25, 2024
                const monthNames = [
                    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                ];
                return `${monthNames[dateObj.getMonth()]} ${day}, ${year}`;
            }
            
            default:
                return `${month}/${day}/${year}`; // Fallback to US format
        }
    }

    /**
     * Format a time according to user's time format preference
     * @param {string} timeStr - Time in HH:MM format
     * @param {string} timeFormat - Optional override ('12h' or '24h')
     * @returns {string} - Formatted time string
     */
    async formatTime(timeStr, timeFormat = null) {
        const preferences = await this.getPreferences();
        const format = timeFormat || preferences.timeFormat || '12h';
        
        return this.formatTimeSync(timeStr, format);
    }

    /**
     * Format a time synchronously
     */
    formatTimeSync(timeStr, timeFormat = '12h') {
        if (!timeStr) return '';

        const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return timeStr;

        let hours = parseInt(match[1], 10);
        const minutes = match[2];

        if (timeFormat === '24h') {
            // 24-hour format: 14:30
            return `${String(hours).padStart(2, '0')}:${minutes}`;
        } else {
            // 12-hour format: 2:30 PM
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
            return `${displayHour}:${minutes} ${period}`;
        }
    }

    /**
     * Format a date and time together
     * @param {Date|string} dateTime - The date/time to format
     * @param {Object} options - { dateFormat, timeFormat, separator }
     * @returns {string} - Formatted date and time
     */
    async formatDateTime(dateTime, options = {}) {
        const { separator = ' at ' } = options;
        const date = await this.formatDate(dateTime, options.dateFormat);
        const time = await this.formatTime(dateTime, options.timeFormat);
        
        return date && time ? `${date}${separator}${time}` : (date || time);
    }

    /**
     * Format date and time synchronously
     */
    formatDateTimeSync(dateTime, options = {}) {
        const { 
            dateFormat = 'MM/dd/yyyy', 
            timeFormat = '12h',
            separator = ' at '
        } = options;

        if (!dateTime) return '';

        const dateObj = new Date(dateTime);
        if (isNaN(dateObj.getTime())) return String(dateTime);

        const date = this._formatDateSync(dateObj, dateFormat);
        
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;
        
        const time = this.formatTimeSync(timeStr, timeFormat);
        
        return `${date}${separator}${time}`;
    }

    /**
     * Format a relative date (e.g., "Today", "Tomorrow", "3 days ago")
     * @param {Date|string} date - The date to format
     * @returns {string} - Relative date string
     */
    formatRelativeDate(date) {
        const dateObj = new Date(date);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const dateStr = dateObj.toDateString();
        const todayStr = today.toDateString();
        const tomorrowStr = tomorrow.toDateString();
        const yesterdayStr = yesterday.toDateString();

        if (dateStr === todayStr) return 'Today';
        if (dateStr === tomorrowStr) return 'Tomorrow';
        if (dateStr === yesterdayStr) return 'Yesterday';

        // For dates within 7 days, show day of week
        const diff = Math.floor((dateObj - today) / (1000 * 60 * 60 * 24));
        if (diff > 0 && diff < 7) {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return dayNames[dateObj.getDay()];
        }

        // Otherwise return formatted date
        return this.formatDateSync(dateObj, 'MM/dd/yyyy');
    }

    /**
     * Get date format pattern
     */
    getDateFormatPattern(dateFormat = 'MM/dd/yyyy') {
        const patterns = {
            'MM/dd/yyyy': 'MM/DD/YYYY',
            'dd/MM/yyyy': 'DD/MM/YYYY',
            'yyyy-MM-dd': 'YYYY-MM-DD',
            'MMM dd, yyyy': 'MMM DD, YYYY'
        };
        return patterns[dateFormat] || 'MM/DD/YYYY';
    }

    /**
     * Get example date based on format
     */
    getExampleDate(dateFormat = 'MM/dd/yyyy') {
        const exampleDate = new Date(2024, 11, 25); // December 25, 2024
        return this.formatDateSync(exampleDate, dateFormat);
    }

    /**
     * Get example time based on format
     */
    getExampleTime(timeFormat = '12h') {
        return this.formatTimeSync('14:30', timeFormat);
    }

    /**
     * Parse time string to minutes
     */
    timeToMinutes(timeStr) {
        const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return 0;

        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        return hours * 60 + minutes;
    }

    /**
     * Format minutes to time string
     */
    minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    /**
     * List all available date formats
     */
    getDateFormats() {
        return [
            { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (US)', example: '12/25/2024' },
            { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (European)', example: '25/12/2024' },
            { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (ISO)', example: '2024-12-25' },
            { value: 'MMM dd, yyyy', label: 'MMM DD, YYYY (Long)', example: 'Dec 25, 2024' }
        ];
    }

    /**
     * List all available time formats
     */
    getTimeFormats() {
        return [
            { value: '12h', label: '12 Hour', example: '2:30 PM' },
            { value: '24h', label: '24 Hour', example: '14:30' }
        ];
    }
}

export const dateTimeFormatterService = new DateTimeFormatterService();
export default dateTimeFormatterService;
