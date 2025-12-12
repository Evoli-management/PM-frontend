/**
 * Custom Hook: useFormattedDate
 * 
 * Provides easy access to date/time formatting functions based on user preferences.
 * Automatically updates when preferences change.
 * 
 * Usage:
 * const { formatDate, formatTime, formatDateTime } = useFormattedDate();
 * 
 * formatDate(new Date()) -> "12/25/2024"
 * formatTime("14:30") -> "2:30 PM"
 * formatDateTime(new Date()) -> "12/25/2024 at 2:30 PM"
 */

import { useState, useEffect, useCallback } from 'react';
import dateTimeFormatterService from '../services/dateTimeFormatterService';

export const useFormattedDate = () => {
    const [preferences, setPreferences] = useState({
        dateFormat: 'MM/dd/yyyy',
        timeFormat: '12h'
    });

    // Listen for preference changes
    useEffect(() => {
        // Load preferences on mount
        const loadPreferences = async () => {
            const prefs = await dateTimeFormatterService.getPreferences();
            setPreferences({
                dateFormat: prefs.dateFormat || 'MM/dd/yyyy',
                timeFormat: prefs.timeFormat || '12h'
            });
        };

        loadPreferences();

        // Listen for preference change events
        const handleDateFormatChanged = (event) => {
            setPreferences(prev => ({
                ...prev,
                dateFormat: event.detail?.dateFormat || prev.dateFormat
            }));
            dateTimeFormatterService.invalidateCache();
        };

        const handleTimeFormatChanged = (event) => {
            setPreferences(prev => ({
                ...prev,
                timeFormat: event.detail?.timeFormat || prev.timeFormat
            }));
            dateTimeFormatterService.invalidateCache();
        };

        const handlePreferencesChanged = (event) => {
            const newPrefs = event.detail?.preferences;
            if (newPrefs) {
                setPreferences({
                    dateFormat: newPrefs.dateFormat || 'MM/dd/yyyy',
                    timeFormat: newPrefs.timeFormat || '12h'
                });
                dateTimeFormatterService.invalidateCache();
            }
        };

        window.addEventListener('dateFormatChanged', handleDateFormatChanged);
        window.addEventListener('timeFormatChanged', handleTimeFormatChanged);
        window.addEventListener('calendarPreferencesChanged', handlePreferencesChanged);

        return () => {
            window.removeEventListener('dateFormatChanged', handleDateFormatChanged);
            window.removeEventListener('timeFormatChanged', handleTimeFormatChanged);
            window.removeEventListener('calendarPreferencesChanged', handlePreferencesChanged);
        };
    }, []);

    // Memoize formatting functions
    const formatDate = useCallback((date) => {
        return dateTimeFormatterService.formatDateSync(date, preferences.dateFormat);
    }, [preferences.dateFormat]);

    const formatTime = useCallback((timeStr) => {
        return dateTimeFormatterService.formatTimeSync(timeStr, preferences.timeFormat);
    }, [preferences.timeFormat]);

    const formatDateTime = useCallback((dateTime, options = {}) => {
        return dateTimeFormatterService.formatDateTimeSync(dateTime, {
            dateFormat: preferences.dateFormat,
            timeFormat: preferences.timeFormat,
            ...options
        });
    }, [preferences.dateFormat, preferences.timeFormat]);

    const formatRelativeDate = useCallback((date) => {
        return dateTimeFormatterService.formatRelativeDate(date);
    }, []);

    return {
        // Formatting functions
        formatDate,
        formatTime,
        formatDateTime,
        formatRelativeDate,
        
        // Current preferences
        dateFormat: preferences.dateFormat,
        timeFormat: preferences.timeFormat,
        
        // Utility functions
        getDateFormatPattern: (fmt = preferences.dateFormat) => 
            dateTimeFormatterService.getDateFormatPattern(fmt),
        
        getExampleDate: (fmt = preferences.dateFormat) => 
            dateTimeFormatterService.getExampleDate(fmt),
        
        getExampleTime: (fmt = preferences.timeFormat) => 
            dateTimeFormatterService.getExampleTime(fmt),
        
        timeToMinutes: (timeStr) => 
            dateTimeFormatterService.timeToMinutes(timeStr),
        
        minutesToTime: (minutes) => 
            dateTimeFormatterService.minutesToTime(minutes),
        
        // Get all available formats
        dateFormats: dateTimeFormatterService.getDateFormats(),
        timeFormats: dateTimeFormatterService.getTimeFormats()
    };
};

export default useFormattedDate;
