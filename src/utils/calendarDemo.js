// src/utils/calendarDemo.js

/**
 * Demo utility to show how working hours affect calendar views
 */

import { generateTimeSlots, formatTimeForDisplay } from './timeUtils';

/**
 * Generate a demo comparison showing different working hours
 * @param {Array} workingHoursExamples - Array of {startTime, endTime, label} objects
 * @returns {Array} - Array of demo data showing time slot differences
 */
export const generateWorkingHoursDemo = (workingHoursExamples = [
    { startTime: '08:00', endTime: '17:00', label: 'Standard Office Hours' },
    { startTime: '06:00', endTime: '22:00', label: 'Extended Hours' },
    { startTime: '09:30', endTime: '15:30', label: 'Part-time Schedule' },
    { startTime: '22:00', endTime: '06:00', label: 'Night Shift' } // This will show validation
]) => {
    return workingHoursExamples.map(({ startTime, endTime, label }) => {
        const timeSlots = generateTimeSlots(startTime, endTime, 30);
        
        return {
            label,
            startTime,
            endTime,
            timeSlots,
            totalSlots: timeSlots.length - 1, // Excluding boundary
            workingHours: (() => {
                const start = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
                const end = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
                const totalMinutes = end > start ? end - start : (24 * 60) - start + end;
                return Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal
            })(),
            displayRange: `${formatTimeForDisplay(startTime)} - ${formatTimeForDisplay(endTime)}`,
            sampleSlots: timeSlots.slice(0, 5) // First 5 slots for preview
        };
    });
};

/**
 * Get calendar view benefits description
 * @returns {Array} - Array of benefit descriptions
 */
export const getCalendarViewBenefits = () => [
    'Calendar views automatically adjust to show only your working hours',
    'No more scrolling through irrelevant 24-hour time periods',
    'Focused view improves productivity and reduces visual clutter', 
    'Consistent experience across daily and weekly calendar views',
    'Time slots dynamically generated based on your preferences',
    'Real-time updates when you change your working hours'
];

/**
 * Example of how calendar components use working hours
 * @param {string} startTime - Working start time
 * @param {string} endTime - Working end time
 * @returns {Object} - Example calendar configuration
 */
export const getCalendarConfig = (startTime = '09:00', endTime = '17:00') => {
    const timeSlots = generateTimeSlots(startTime, endTime, 30);
    
    return {
        workingHours: { startTime, endTime },
        timeSlots,
        viewConfig: {
            dayView: {
                visibleHours: timeSlots.length - 1,
                startHour: startTime,
                endHour: endTime,
                slotDuration: 30
            },
            weekView: {
                visibleHours: timeSlots.length - 1,
                startHour: startTime,
                endHour: endTime,
                slotDuration: 30
            }
        },
        benefits: {
            reducedScrolling: true,
            focusedView: true,
            improvedProductivity: true,
            customizedToUser: true
        }
    };
};

/**
 * Simulate calendar view before and after working hours integration
 * @returns {Object} - Before/after comparison
 */
export const getBeforeAfterComparison = () => {
    const standardWorkingHours = { startTime: '09:00', endTime: '17:00' };
    
    return {
        before: {
            description: 'Traditional 24-hour calendar view',
            timeSlots: generateTimeSlots('00:00', '24:00', 60), // Full day, 1-hour slots
            totalSlots: 24,
            scrollingRequired: true,
            relevantTimeVisible: '33%', // 8 hours out of 24
            userExperience: 'Cluttered, requires scrolling'
        },
        after: {
            description: 'Working hours-focused calendar view',
            timeSlots: generateTimeSlots(standardWorkingHours.startTime, standardWorkingHours.endTime, 30),
            totalSlots: 16, // 8 hours * 2 (30-min slots)
            scrollingRequired: false,
            relevantTimeVisible: '100%',
            userExperience: 'Clean, focused, all relevant time visible'
        },
        improvement: {
            timeSlotReduction: '67%', // From 24 to 8 hours
            scrollingReduction: '100%',
            relevancyIncrease: '200%',
            productivityBoost: 'Significant'
        }
    };
};