
import React from "react";
import Sidebar from "../components/shared/Sidebar.jsx";
import CalendarContainer from "../components/calendar/CalendarContainer.jsx";

export default function Calendar() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={{ name: "Hussein" }} />
      <main className="flex-1 p-4 md:p-8">
        <h1 className="text-3xl font-bold text-blue-700 mb-2">Calendar</h1>
        <p className="text-gray-500 text-base mb-4">Modern interactive calendar. All views enabled. Tasks & activities shown as events.</p>
        <CalendarContainer />
      </main>
    </div>
  );
}
