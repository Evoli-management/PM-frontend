import React, { useState, useEffect } from "react";
import Sidebar from "../components/shared/Sidebar.jsx";
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
const locales = {
  "en-US": enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [view, setView] = useState(Views.WEEK);

  // Simulate fetching tasks from localStorage (shared with Tasks page)
  useEffect(() => {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    // Only add tasks with a valid date (for demo, use today at 10am)
    const today = new Date();
    const calendarEvents = tasks.map((task, idx) => ({
      title: task.name + (task.tag ? ` [${task.tag}]` : ""),
      start: today,
      end: new Date(today.getTime() + 60 * 60 * 1000), // 1 hour duration
      desc: task.assignee ? `Assigned to ${task.assignee}` : "",
      allDay: false,
    }));
    setEvents(calendarEvents);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={{ name: "Hussein" }} />
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-700 mb-2">Calendar</h1>
          <p className="text-gray-500 text-base mb-4">Modern interactive calendar. All views enabled. Tasks & activities shown as events.</p>
          {/* Modern calendar controls */}
          <div className="flex items-center gap-4 mb-4">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition">Today</button>
            <button className="bg-gray-200 px-4 py-2 rounded-lg shadow hover:bg-gray-300 transition">Back</button>
            <span className="font-semibold text-gray-700">{format(new Date(), 'MM/dd/yyyy')}</span>
            <select className="ml-auto px-3 py-2 rounded-lg border border-gray-300" value={view} onChange={e => setView(e.target.value)}>
              {Object.entries(Views).map(([key, value]) => (
                <option key={key} value={value}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-2xl p-6 border border-gray-100">
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 650, borderRadius: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
            views={Object.values(Views)}
            view={view}
            onView={setView}
            popup
            messages={{
              noEventsInRange: "No events to display."
            }}
          />
        </div>
        <div className="text-center text-gray-400 text-xs mt-8">No events yet. Add tasks/activities to see them here.</div>
      </main>
    </div>
  );
}
