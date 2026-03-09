import React, { useState } from "react";
import { useTranslation } from 'react-i18next';
// import CalendarCreateModal from "../modals/CalendarCreateModal.jsx";

// Example of how to integrate the CalendarCreateModal into your existing calendar
export default function CalendarIntegrationExample() {
    const { t } = useTranslation();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [defaultType, setDefaultType] = useState("task");

    const handleDateClick = (date) => {
        setSelectedDate(date);
        setShowCreateModal(true);
    };

    const handleQuickTaskCreate = (date) => {
        setSelectedDate(date);
        setDefaultType("task");
        setShowCreateModal(true);
    };

    const handleQuickActivityCreate = (date) => {
        setSelectedDate(date);
        setDefaultType("activity");
        setShowCreateModal(true);
    };

    const handleSave = (result, type) => {
        console.log(`${type} created:`, result);
        
        // Here you would typically:
        // 1. Refresh the calendar events
        // 2. Show a success notification
        // 3. Close the modal
        setShowCreateModal(false);
        
        // Example: Add to calendar state or refresh data
        // refreshCalendarEvents();
    };

    const handleModalClose = () => {
        setShowCreateModal(false);
        setSelectedDate(null);
    };

    return (
        <div className="calendar-container">
            {/* Calendar Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">{t("calendarIntegrationExample.title")}</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setDefaultType("task");
                            setShowCreateModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                        {t("calendarIntegrationExample.addTask")}
                    </button>
                    <button
                        onClick={() => {
                            setDefaultType("activity");
                            setShowCreateModal(true);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                    >
                        {t("calendarIntegrationExample.addActivity")}
                    </button>
                </div>
            </div>

            {/* Example Usage Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-blue-800 mb-3">
                    {t("calendarIntegrationExample.howToIntegrate")}
                </h2>
                <div className="space-y-3 text-blue-700">
                    <p>
                        <strong>{t("calendarIntegrationExample.step1Label")}</strong> Add <code className="bg-blue-100 px-1 rounded">import CalendarCreateModal from "../modals/CalendarCreateModal.jsx"</code> to your calendar component
                    </p>
                    <p>
                        <strong>{t("calendarIntegrationExample.step2Label")}</strong> Use <code className="bg-blue-100 px-1 rounded">const [showCreateModal, setShowCreateModal] = useState(false)</code>
                    </p>
                    <p>
                        <strong>{t("calendarIntegrationExample.step3Label")}</strong> Place "Add Task" and "Add Activity" buttons in your calendar header
                    </p>
                    <p>
                        <strong>{t("calendarIntegrationExample.step4Label")}</strong> Use the <code className="bg-blue-100 px-1 rounded">onSave</code> callback to refresh your calendar data
                    </p>
                </div>
            </div>

            {/* Sample Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 bg-slate-200 p-1 rounded-lg">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-slate-100 p-2 text-center text-sm font-medium text-slate-600">
                        {day}
                    </div>
                ))}
                
                {/* Calendar Days - Example for current month */}
                {Array.from({ length: 35 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - date.getDay() + i);
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    return (
                        <div
                            key={i}
                            className={`bg-white p-2 min-h-[80px] cursor-pointer hover:bg-slate-50 border-l border-t ${
                                isToday ? 'bg-blue-50 border-blue-200' : ''
                            }`}
                            onClick={() => handleDateClick(date)}
                        >
                            <div className="text-sm text-slate-600 mb-1">
                                {date.getDate()}
                            </div>
                            
                            {/* Quick Action Buttons on Hover */}
                            <div className="opacity-0 hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickTaskCreate(date);
                                    }}
                                    className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded mr-1 hover:bg-blue-200"
                                    title={t("calendarIntegrationExample.addTaskTitle")}
                                >
                                    📋
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickActivityCreate(date);
                                    }}
                                    className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded hover:bg-green-200"
                                    title={t("calendarIntegrationExample.addActivityTitle")}
                                >
                                    ⚡
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Integration Code Example */}
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">{t("calendarIntegrationExample.quickIntegrationCode")}</h3>
                <pre className="text-xs text-slate-600 overflow-x-auto">
{`// In your existing calendar component:
import CalendarCreateModal from "../modals/CalendarCreateModal.jsx";

const [showCreateModal, setShowCreateModal] = useState(false);

const handleSave = (result, type) => {
    console.log(\`\${type} created:\`, result);
    // Refresh your calendar data here
    setShowCreateModal(false);
};

// Add this to your JSX:
<CalendarCreateModal
    isOpen={showCreateModal}
    onClose={() => setShowCreateModal(false)}
    onSave={handleSave}
    defaultType="task" // or "activity"
/>`}
                </pre>
            </div>

            {/* Create Modal */}
            {/* Modal removed as per new integration */}
        </div>
    );
}