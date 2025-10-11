// Test component to verify time format integration
// This file can be deleted after testing

import React from 'react';
import { useCalendarPreferences } from '../hooks/useCalendarPreferences';

const TimeFormatTest = () => {
    const { 
        timeFormat, 
        formatTime, 
        use24Hour, 
        loading, 
        updateTimeFormat 
    } = useCalendarPreferences();

    const testTimes = [
        '08:00', '08:30', '09:00', '12:00', '12:30', 
        '13:00', '15:30', '17:00', '18:30', '23:59'
    ];

    const handleToggleFormat = () => {
        const newFormat = use24Hour ? '12h' : '24h';
        updateTimeFormat(newFormat);
    };

    if (loading) {
        return <div>Loading time format preferences...</div>;
    }

    return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Time Format Integration Test</h3>
            
            <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                    Current format: <strong>{use24Hour ? '24-hour' : '12-hour'}</strong>
                </p>
                <button 
                    onClick={handleToggleFormat}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Switch to {use24Hour ? '12-hour' : '24-hour'} format
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h4 className="font-medium mb-2">Raw Times:</h4>
                    <ul className="text-sm space-y-1">
                        {testTimes.map(time => (
                            <li key={time} className="font-mono">{time}</li>
                        ))}
                    </ul>
                </div>
                
                <div>
                    <h4 className="font-medium mb-2">Formatted Times:</h4>
                    <ul className="text-sm space-y-1">
                        {testTimes.map(time => (
                            <li key={time} className="font-mono">
                                {formatTime(time)}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-600">
                    This test shows how times are formatted based on user preferences. 
                    The calendar views will use the same formatting logic.
                </p>
            </div>
        </div>
    );
};

export default TimeFormatTest;