// src/hooks/useWorkingHours.js
import { useState, useEffect } from 'react';
import userPreferencesService from '../services/userPreferencesService';
import { generateTimeSlots, getDefaultTimeSlots } from '../utils/timeUtils';

/**
 * Custom hook to manage working hours preferences for calendar views
 * @param {number} slotSizeMinutes - Size of time slots in minutes (default: 30)
 * @param {Function} onWorkingHoursChange - Callback when working hours change
 * @returns {Object} - Working hours data and utilities
 */
export const useWorkingHours = (slotSizeMinutes = 30, onWorkingHoursChange = null) => {
    const [workingHours, setWorkingHours] = useState({
        startTime: '08:00',
        endTime: '17:00'
    });
    const [timeSlots, setTimeSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load working hours from user preferences
    const loadWorkingHours = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const preferences = await userPreferencesService.getPreferences();
            
            const newWorkingHours = {
                startTime: preferences.workStartTime || '08:00',
                endTime: preferences.workEndTime || '17:00'
            };
            
            setWorkingHours(newWorkingHours);
            
            // Generate time slots based on working hours
            const slots = generateTimeSlots(
                newWorkingHours.startTime,
                newWorkingHours.endTime,
                slotSizeMinutes
            );
            setTimeSlots(slots);
            
            // Trigger callback if provided
            if (onWorkingHoursChange) {
                onWorkingHoursChange(newWorkingHours, slots);
            }
            
        } catch (err) {
            console.warn('Failed to load working hours preferences, using defaults:', err);
            setError(err);
            
            // Fallback to default working hours
            const defaultHours = { startTime: '08:00', endTime: '17:00' };
            setWorkingHours(defaultHours);
            setTimeSlots(getDefaultTimeSlots(slotSizeMinutes));
        } finally {
            setLoading(false);
        }
    };

    // Refresh time slots when slot size changes
    const updateSlotSize = (newSlotSize) => {
        const slots = generateTimeSlots(
            workingHours.startTime,
            workingHours.endTime,
            newSlotSize
        );
        setTimeSlots(slots);
    };

    // Manually update working hours (useful for preferences page)
    const updateWorkingHours = (startTime, endTime) => {
        const newWorkingHours = { startTime, endTime };
        setWorkingHours(newWorkingHours);
        
        const slots = generateTimeSlots(startTime, endTime, slotSizeMinutes);
        setTimeSlots(slots);
        
        // Trigger callback if provided
        if (onWorkingHoursChange) {
            onWorkingHoursChange(newWorkingHours, slots);
        }
    };

    // Load working hours on mount
    useEffect(() => {
        loadWorkingHours();
    }, []);

    // Listen for working hours changes from preferences
    useEffect(() => {
        const handleWorkingHoursChanged = (event) => {
            const { startTime, endTime } = event.detail;
            updateWorkingHours(startTime, endTime);
        };

        window.addEventListener('workingHoursChanged', handleWorkingHoursChanged);
        return () => {
            window.removeEventListener('workingHoursChanged', handleWorkingHoursChanged);
        };
    }, [onWorkingHoursChange]);

    // Refresh when slot size changes
    useEffect(() => {
        if (!loading && workingHours.startTime && workingHours.endTime) {
            updateSlotSize(slotSizeMinutes);
        }
    }, [slotSizeMinutes]);

    return {
        // Working hours data
        workingHours,
        timeSlots,
        loading,
        error,
        
        // Utilities
        refreshWorkingHours: loadWorkingHours,
        updateWorkingHours,
        updateSlotSize,
        
        // Computed values
        isWorkingTime: (timeStr) => {
            const timeMinutes = parseInt(timeStr.split(':')[0]) * 60 + parseInt(timeStr.split(':')[1]);
            const startMinutes = parseInt(workingHours.startTime.split(':')[0]) * 60 + parseInt(workingHours.startTime.split(':')[1]);
            const endMinutes = parseInt(workingHours.endTime.split(':')[0]) * 60 + parseInt(workingHours.endTime.split(':')[1]);
            return timeMinutes >= startMinutes && timeMinutes < endMinutes;
        },
        
        // Quick access
        startTime: workingHours.startTime,
        endTime: workingHours.endTime,
        totalSlots: timeSlots.length,
        workingMinutes: (() => {
            const start = parseInt(workingHours.startTime.split(':')[0]) * 60 + parseInt(workingHours.startTime.split(':')[1]);
            const end = parseInt(workingHours.endTime.split(':')[0]) * 60 + parseInt(workingHours.endTime.split(':')[1]);
            return end - start;
        })()
    };
};