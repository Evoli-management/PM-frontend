// src/utils/timeUtils.js

/**
 * Convert time string (HH:MM) to minutes since midnight
 * @param {string} timeStr - Time in HH:MM format
 * @returns {number} - Minutes since midnight
 */
export const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to time string (HH:MM)
 * @param {number} minutes - Minutes since midnight
 * @returns {string} - Time in HH:MM format
 */
export const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Generate time slots based on working hours and slot size
 * @param {string} startTime - Start time in HH:MM format (e.g., "06:00")
 * @param {string} endTime - End time in HH:MM format (e.g., "22:00")
 * @param {number} slotSizeMinutes - Slot size in minutes (default: 30)
 * @returns {Array<string>} - Array of time slots in HH:MM format
 */
export const generateTimeSlots = (startTime = "08:00", endTime = "17:00", slotSizeMinutes = 30) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    // Ensure valid time range
    if (startMinutes >= endMinutes) {
        console.warn('Invalid time range: start time must be before end time');
        return generateTimeSlots("08:00", "17:00", slotSizeMinutes); // fallback to defaults
    }
    
    const slots = [];
    
    // Generate slots from start to end (excluding the final end boundary)
    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotSizeMinutes) {
        slots.push(minutesToTime(minutes));
    }
    
    // Add the end time as a boundary label (non-interactive)
    slots.push(endTime);
    
    return slots;
};

/**
 * Generate default business hours (8:00 AM to 5:00 PM)
 * @param {number} slotSizeMinutes - Slot size in minutes (default: 30)
 * @returns {Array<string>} - Array of time slots
 */
export const getDefaultTimeSlots = (slotSizeMinutes = 30) => {
    return generateTimeSlots("08:00", "17:00", slotSizeMinutes);
};

/**
 * Check if a time slot is within working hours
 * @param {string} timeSlot - Time slot in HH:MM format
 * @param {string} startTime - Working start time
 * @param {string} endTime - Working end time
 * @returns {boolean} - Whether the slot is within working hours
 */
export const isWithinWorkingHours = (timeSlot, startTime, endTime) => {
    const slotMinutes = timeToMinutes(timeSlot);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
};

/**
 * Format time for display (e.g., "09:00" -> "9:00 AM")
 * @param {string} timeStr - Time in HH:MM format
 * @param {boolean} use24Hour - Whether to use 24-hour format
 * @returns {string} - Formatted time string
 */
export const formatTimeForDisplay = (timeStr, use24Hour = false) => {
    if (!timeStr) return '';
    
    if (use24Hour) {
        return timeStr;
    }
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

/**
 * Get the next available time slot
 * @param {string} currentTime - Current time in HH:MM format
 * @param {Array<string>} timeSlots - Available time slots
 * @returns {string|null} - Next available slot or null
 */
export const getNextTimeSlot = (currentTime, timeSlots) => {
    const currentMinutes = timeToMinutes(currentTime);
    
    for (const slot of timeSlots) {
        const slotMinutes = timeToMinutes(slot);
        if (slotMinutes > currentMinutes) {
            return slot;
        }
    }
    
    return null; // No more slots available
};

/**
 * Calculate the number of slots between two times
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @param {number} slotSizeMinutes - Slot size in minutes
 * @returns {number} - Number of slots
 */
export const calculateSlotCount = (startTime, endTime, slotSizeMinutes = 30) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const totalMinutes = endMinutes - startMinutes;
    
    return Math.ceil(totalMinutes / slotSizeMinutes);
};