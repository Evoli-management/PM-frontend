// src/hooks/useCalendarPreferences.js
import { useState, useEffect } from 'react';
import userPreferencesService from '../services/userPreferencesService';
import { 
    generateTimeSlots, 
    getDefaultTimeSlots, 
    formatTimeForDisplay,
    formatDateForDisplay,
    formatDateWithOptions,
    getRelativeDateString
} from '../utils/timeUtils';

/**
 * Comprehensive hook for calendar preferences including working hours and time format
 * @param {number} slotSizeMinutes - Size of time slots in minutes (default: 30)
 * @param {Function} onPreferencesChange - Callback when preferences change
 * @returns {Object} - Calendar preferences data and utilities
 */
export const useCalendarPreferences = (slotSizeMinutes = 30, onPreferencesChange = null) => {
    const [preferences, setPreferences] = useState({
        workingHours: {
            startTime: '08:00',
            endTime: '17:00'
        },
        timeFormat: '12h', // '12h' or '24h'
        dateFormat: 'MM/dd/yyyy', // 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd', 'MMM dd, yyyy'
        timezone: 'UTC'
    });
    
    const [timeSlots, setTimeSlots] = useState([]);
    const [formattedTimeSlots, setFormattedTimeSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load all calendar preferences from backend
    const loadPreferences = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const userPrefs = await userPreferencesService.getPreferences();
            
            const newPreferences = {
                workingHours: {
                    startTime: userPrefs.workStartTime || '08:00',
                    endTime: userPrefs.workEndTime || '17:00'
                },
                timeFormat: userPrefs.timeFormat || '12h',
                dateFormat: userPrefs.dateFormat || 'MM/dd/yyyy',
                timezone: userPrefs.timezone || 'UTC'
            };
            
            setPreferences(newPreferences);
            
            // Generate time slots for the full day (no working-hours restriction)
            const slots = generateTimeSlots(
                "00:00",
                "24:00",
                slotSizeMinutes
            );
            setTimeSlots(slots);
            
            // Generate formatted time slots based on time format preference
            const use24Hour = newPreferences.timeFormat === '24h';
            const formatted = slots.map(time => ({
                value: time,
                display: formatTimeForDisplay(time, use24Hour),
                is24Hour: use24Hour
            }));
            setFormattedTimeSlots(formatted);
            
            // Trigger callback if provided
            if (onPreferencesChange) {
                onPreferencesChange(newPreferences, slots, formatted);
            }
            
        } catch (err) {
            console.warn('Failed to load calendar preferences, using defaults:', err);
            setError(err);
            
            // Fallback to default preferences
            const defaultPrefs = {
                workingHours: { startTime: '08:00', endTime: '17:00' },
                timeFormat: '12h',
                dateFormat: 'MM/dd/yyyy',
                timezone: 'UTC'
            };
            setPreferences(defaultPrefs);
            
            const defaultSlots = getDefaultTimeSlots(slotSizeMinutes);
            setTimeSlots(defaultSlots);
            
            const formatted = defaultSlots.map(time => ({
                value: time,
                display: formatTimeForDisplay(time, false),
                is24Hour: false
            }));
            setFormattedTimeSlots(formatted);
        } finally {
            setLoading(false);
        }
    };

    // Format a time string according to user preference
    const formatTime = (timeStr) => {
        const use24Hour = preferences.timeFormat === '24h';
        return formatTimeForDisplay(timeStr, use24Hour);
    };

    // Format a date according to user preference
    const formatDate = (date, options = {}) => {
        if (options.relative) {
            return getRelativeDateString(date, preferences.dateFormat);
        }
        if (options.includeWeekday || options.longMonth) {
            return formatDateWithOptions(date, preferences.dateFormat, options);
        }
        return formatDateForDisplay(date, preferences.dateFormat);
    };

    // Update time slots when preferences change
    const updateTimeSlots = (workingHours = preferences.workingHours, timeFormat = preferences.timeFormat) => {
        // Keep behavior consistent: update time slots as full-day slots
        const slots = generateTimeSlots(
            "00:00",
            "24:00",
            slotSizeMinutes
        );
        setTimeSlots(slots);
        
        const use24Hour = timeFormat === '24h';
        const formatted = slots.map(time => ({
            value: time,
            display: formatTimeForDisplay(time, use24Hour),
            is24Hour: use24Hour
        }));
        setFormattedTimeSlots(formatted);
        
        return { slots, formatted };
    };

    // Update working hours
    const updateWorkingHours = (startTime, endTime) => {
        const newWorkingHours = { startTime, endTime };
        const newPreferences = {
            ...preferences,
            workingHours: newWorkingHours
        };
        
        setPreferences(newPreferences);
        const { slots, formatted } = updateTimeSlots(newWorkingHours, preferences.timeFormat);
        
        // Trigger callback if provided
        if (onPreferencesChange) {
            onPreferencesChange(newPreferences, slots, formatted);
        }
    };

    // Update time format
    const updateTimeFormat = (newTimeFormat) => {
        const newPreferences = {
            ...preferences,
            timeFormat: newTimeFormat
        };
        
        setPreferences(newPreferences);
        const { slots, formatted } = updateTimeSlots(preferences.workingHours, newTimeFormat);
        
        // Trigger callback if provided
        if (onPreferencesChange) {
            onPreferencesChange(newPreferences, slots, formatted);
        }
    };

    // Update date format
    const updateDateFormat = (newDateFormat) => {
        const newPreferences = {
            ...preferences,
            dateFormat: newDateFormat
        };
        
        setPreferences(newPreferences);
        const { slots, formatted } = updateTimeSlots(preferences.workingHours, preferences.timeFormat);
        
        // Trigger callback if provided
        if (onPreferencesChange) {
            onPreferencesChange(newPreferences, slots, formatted);
        }
    };

    // Update all preferences at once
    const updateAllPreferences = (newPrefs) => {
        setPreferences(newPrefs);
        const { slots, formatted } = updateTimeSlots(newPrefs.workingHours, newPrefs.timeFormat);
        
        // Trigger callback if provided
        if (onPreferencesChange) {
            onPreferencesChange(newPrefs, slots, formatted);
        }
    };

    // Load preferences on mount
    useEffect(() => {
        loadPreferences();
    }, []);

    // Listen for preference changes from other components
    useEffect(() => {
        const handleWorkingHoursChanged = (event) => {
            const { startTime, endTime } = event.detail;
            updateWorkingHours(startTime, endTime);
        };

        const handleTimeFormatChanged = (event) => {
            const { timeFormat } = event.detail;
            updateTimeFormat(timeFormat);
        };

        const handleDateFormatChanged = (event) => {
            const { dateFormat } = event.detail;
            updateDateFormat(dateFormat);
        };

        const handlePreferencesChanged = (event) => {
            const { preferences: newPrefs } = event.detail;
            updateAllPreferences(newPrefs);
        };

        window.addEventListener('workingHoursChanged', handleWorkingHoursChanged);
        window.addEventListener('timeFormatChanged', handleTimeFormatChanged);
        window.addEventListener('dateFormatChanged', handleDateFormatChanged);
        window.addEventListener('calendarPreferencesChanged', handlePreferencesChanged);
        
        return () => {
            window.removeEventListener('workingHoursChanged', handleWorkingHoursChanged);
            window.removeEventListener('timeFormatChanged', handleTimeFormatChanged);
            window.removeEventListener('dateFormatChanged', handleDateFormatChanged);
            window.removeEventListener('calendarPreferencesChanged', handlePreferencesChanged);
        };
    }, [onPreferencesChange]);

    // Refresh time slots when slot size changes
    useEffect(() => {
        if (!loading && preferences.workingHours.startTime && preferences.workingHours.endTime) {
            updateTimeSlots();
        }
    }, [slotSizeMinutes]);

    return {
        // Main preferences data
        preferences,
        timeSlots,
        formattedTimeSlots,
        loading,
        error,
        
        // Specific preferences
        workingHours: preferences.workingHours,
        timeFormat: preferences.timeFormat,
        dateFormat: preferences.dateFormat,
        timezone: preferences.timezone,
        use24Hour: preferences.timeFormat === '24h',
        
        // Utility functions
        formatTime,
        formatDate,
        refreshPreferences: loadPreferences,
        updateWorkingHours,
        updateTimeFormat,
        updateDateFormat,
        updateAllPreferences,
        
        // Working time checker
        isWorkingTime: (timeStr) => {
            const timeMinutes = parseInt(timeStr.split(':')[0]) * 60 + parseInt(timeStr.split(':')[1]);
            const startMinutes = parseInt(preferences.workingHours.startTime.split(':')[0]) * 60 + parseInt(preferences.workingHours.startTime.split(':')[1]);
            const endMinutes = parseInt(preferences.workingHours.endTime.split(':')[0]) * 60 + parseInt(preferences.workingHours.endTime.split(':')[1]);
            return timeMinutes >= startMinutes && timeMinutes < endMinutes;
        },
        
        // Quick access computed values
        startTime: preferences.workingHours.startTime,
        endTime: preferences.workingHours.endTime,
        formattedStartTime: formatTime(preferences.workingHours.startTime),
        formattedEndTime: formatTime(preferences.workingHours.endTime),
        totalSlots: timeSlots.length,
        workingMinutes: (() => {
            const start = parseInt(preferences.workingHours.startTime.split(':')[0]) * 60 + parseInt(preferences.workingHours.startTime.split(':')[1]);
            const end = parseInt(preferences.workingHours.endTime.split(':')[0]) * 60 + parseInt(preferences.workingHours.endTime.split(':')[1]);
            return end - start;
        })()
    };
};

export default useCalendarPreferences;