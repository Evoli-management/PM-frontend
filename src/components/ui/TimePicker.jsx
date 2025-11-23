import React, { useState, useEffect } from 'react';
import { formatTimeForDisplay } from '../../utils/timeUtils';

/**
 * Custom time picker that respects user's time format preference
 * @param {Object} props - Component props
 * @param {string} props.value - Current time value in HH:MM format
 * @param {function} props.onChange - Callback when time changes
 * @param {boolean} props.use24Hour - Whether to use 24-hour format
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.label - Accessible label for the input
 */
const TimePicker = ({ 
    value = '09:00', 
    onChange, 
    use24Hour = false, 
    // outerClassName is applied to the visible button/control
    outerClassName = '',
    // innerClassName is applied to the dropdown selects only; keep minimal to avoid overriding external fields
    innerClassName = 'w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500',
    label = 'Time'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [hours, setHours] = useState(9);
    const [minutes, setMinutes] = useState(0);
    const [period, setPeriod] = useState('AM');

    // Parse time value when it changes
    useEffect(() => {
        if (value) {
            const [h, m] = value.split(':').map(Number);
            setHours(h);
            setMinutes(m);
            setPeriod(h >= 12 ? 'PM' : 'AM');
        }
    }, [value]);

    // Generate hour options based on format
    const generateHourOptions = () => {
        if (use24Hour) {
            return Array.from({ length: 24 }, (_, i) => i);
        } else {
            return Array.from({ length: 12 }, (_, i) => i + 1);
        }
    };

    // Generate minute options (15-minute intervals)
    const generateMinuteOptions = () => {
        return Array.from({ length: 4 }, (_, i) => i * 15);
    };

    // Convert 12-hour to 24-hour format
    const convertTo24Hour = (hour12, period) => {
        if (period === 'AM') {
            return hour12 === 12 ? 0 : hour12;
        } else {
            return hour12 === 12 ? 12 : hour12 + 12;
        }
    };

    // Handle time change
    const handleTimeChange = (newHours, newMinutes, newPeriod = period) => {
        let hour24 = newHours;
        
        if (!use24Hour) {
            hour24 = convertTo24Hour(newHours, newPeriod);
        }

        const timeString = `${hour24.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
        
        setHours(hour24);
        setMinutes(newMinutes);
        setPeriod(newPeriod);
        
        if (onChange) {
            onChange(timeString);
        }
        
        setIsOpen(false);
    };

    // Format display value
    const displayValue = formatTimeForDisplay(value, use24Hour);
    
    // Get display hour for 12-hour format
    const getDisplayHour = () => {
        if (use24Hour) return hours;
        if (hours === 0) return 12;
        if (hours > 12) return hours - 12;
        return hours;
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                // Use the exact classes provided by the parent for outer appearance
                className={`${outerClassName} text-left appointment-time-control`}
                aria-label={label}
            >
                <span className="text-slate-900">{displayValue}</span>
                <svg
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg">
                    <div className="p-4">
                        <div className="text-sm font-medium text-gray-700 mb-3">Select Time</div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            {/* Hours */}
                            <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Hour</div>
                                <select
                                    value={getDisplayHour()}
                                    onChange={(e) => {
                                        const newHour = parseInt(e.target.value);
                                        handleTimeChange(newHour, minutes, period);
                                    }}
                                    className={`${innerClassName}`}
                                >
                                    {generateHourOptions().map(hour => (
                                        <option key={hour} value={hour}>
                                            {use24Hour ? hour.toString().padStart(2, '0') : hour}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Minutes */}
                            <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Min</div>
                                <select
                                    value={minutes}
                                    onChange={(e) => {
                                        const newMinutes = parseInt(e.target.value);
                                        handleTimeChange(getDisplayHour(), newMinutes, period);
                                    }}
                                    className={`${innerClassName}`}
                                >
                                    {generateMinuteOptions().map(minute => (
                                        <option key={minute} value={minute}>
                                            {minute.toString().padStart(2, '0')}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* AM/PM for 12-hour format */}
                            {!use24Hour && (
                                <div>
                                    <div className="text-xs font-medium text-gray-500 mb-1">Period</div>
                                    <select
                                            value={period}
                                            onChange={(e) => {
                                                const newPeriod = e.target.value;
                                                handleTimeChange(getDisplayHour(), minutes, newPeriod);
                                            }}
                                            className={`${innerClassName}`}
                                        >
                                        <option value="AM">AM</option>
                                        <option value="PM">PM</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="mt-3 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlay to close dropdown when clicking outside */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

export default TimePicker;