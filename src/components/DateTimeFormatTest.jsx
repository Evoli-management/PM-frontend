// Test component to verify date format integration across the system
// This file can be deleted after testing

import React from 'react';
import { useCalendarPreferences } from '../hooks/useCalendarPreferences';

const DateTimeFormatTest = () => {
    const { 
        dateFormat,
        timeFormat, 
        formatDate, 
        formatTime, 
        use24Hour, 
        loading, 
        updateDateFormat,
        updateTimeFormat 
    } = useCalendarPreferences();

    const testDates = [
        new Date(2024, 0, 15), // January 15, 2024
        new Date(2024, 5, 30), // June 30, 2024
        new Date(2024, 11, 25), // December 25, 2024
        new Date(), // Today
    ];

    const testTimes = [
        '08:00', '12:30', '15:45', '18:00', '23:59'
    ];

    const dateFormatOptions = [
        { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (US Format)' },
        { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (European Format)' },
        { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (ISO Format)' },
        { value: 'MMM dd, yyyy', label: 'MMM DD, YYYY (Long Format)' }
    ];

    const timeFormatOptions = [
        { value: '12h', label: '12 Hour' },
        { value: '24h', label: '24 Hour' }
    ];

    if (loading) {
        return <div>Loading preferences...</div>;
    }

    return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm max-w-6xl">
            <h2 className="text-xl font-bold mb-6">Complete Date & Time Format Integration Test</h2>
            
            {/* Format Controls */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                    <h3 className="font-semibold mb-3">Date Format</h3>
                    <select 
                        value={dateFormat}
                        onChange={(e) => updateDateFormat(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                        {dateFormatOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <p className="text-sm text-gray-600 mt-2">
                        Current: <strong>{dateFormat}</strong>
                    </p>
                </div>
                
                <div>
                    <h3 className="font-semibold mb-3">Time Format</h3>
                    <select 
                        value={timeFormat}
                        onChange={(e) => updateTimeFormat(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                        {timeFormatOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <p className="text-sm text-gray-600 mt-2">
                        Current: <strong>{use24Hour ? '24-hour' : '12-hour'}</strong>
                    </p>
                </div>
            </div>

            {/* Date Formatting Examples */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                    <h3 className="font-semibold mb-3">Date Formatting Examples</h3>
                    <div className="space-y-3">
                        {testDates.map((date, idx) => (
                            <div key={idx} className="border border-gray-200 rounded p-3">
                                <div className="text-sm text-gray-600 mb-1">
                                    Raw: {date.toISOString().split('T')[0]}
                                </div>
                                <div className="font-mono text-lg">
                                    {formatDate(date)}
                                </div>
                                <div className="text-sm text-blue-600">
                                    With weekday: {formatDate(date, { includeWeekday: true })}
                                </div>
                                <div className="text-sm text-green-600">
                                    Relative: {formatDate(date, { relative: true })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div>
                    <h3 className="font-semibold mb-3">Time Formatting Examples</h3>
                    <div className="space-y-3">
                        {testTimes.map((time, idx) => (
                            <div key={idx} className="border border-gray-200 rounded p-3">
                                <div className="text-sm text-gray-600 mb-1">
                                    Raw: {time}
                                </div>
                                <div className="font-mono text-lg">
                                    {formatTime(time)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Format Comparison Table */}
            <div className="mb-6">
                <h3 className="font-semibold mb-3">Format Comparison Table</h3>
                <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left">Date Format</th>
                                <th className="px-4 py-2 text-left">Example</th>
                                <th className="px-4 py-2 text-left">Time Format</th>
                                <th className="px-4 py-2 text-left">Example</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dateFormatOptions.map((dateOpt, idx) => (
                                <tr key={idx} className="border-t">
                                    <td className="px-4 py-2 font-mono text-sm">{dateOpt.value}</td>
                                    <td className="px-4 py-2">{formatDate(testDates[0])}</td>
                                    <td className="px-4 py-2 font-mono text-sm">
                                        {timeFormatOptions[idx % 2]?.value}
                                    </td>
                                    <td className="px-4 py-2">
                                        {formatTime(testTimes[idx % testTimes.length])}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Integration Areas */}
            <div className="bg-blue-50 p-4 rounded">
                <h3 className="font-semibold mb-3">Areas Where Formatting Will Be Applied</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <h4 className="font-medium mb-2">Calendar Views:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li>Day view date headers</li>
                            <li>Week view date ranges</li>
                            <li>Month view headers</li>
                            <li>Time slot labels</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-medium mb-2">Throughout the App:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li>Dashboard goal due dates</li>
                            <li>Task deadlines</li>
                            <li>Activity timestamps</li>
                            <li>Report date ranges</li>
                        </ul>
                    </div>
                </div>
                <p className="text-xs text-gray-600 mt-4">
                    All date and time displays throughout the application will automatically 
                    respect your format preferences for a consistent experience.
                </p>
            </div>
        </div>
    );
};

export default DateTimeFormatTest;