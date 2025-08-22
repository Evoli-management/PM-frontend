import React, { useState, useEffect } from "react";
import QuarterView from "./QuarterView";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import DayView from "./DayView";
import ListView from "./ListView";
import TodoPanel from "./TodoPanel";
import EventModal from "./EventModal";
import AvailabilityBlock from "./AvailabilityBlock";

const VIEWS = ["quarter", "month", "week", "day", "list"];
const EVENT_CATEGORIES = {
  focus: { color: "bg-blue-500", icon: "🧠" },
  meeting: { color: "bg-yellow-500", icon: "📅" },
  travel: { color: "bg-purple-500", icon: "✈️" },
  green: { color: "bg-green-400", icon: "✔️" },
  red: { color: "bg-red-400", icon: "⛔" },
};

const CalendarContainer = () => {
  // Elephant Task state (mock)
  const [elephantTasks, setElephantTasks] = useState({}); // { '2025-08-22': '...' }
  const today = new Date();
  const dateKey = today.toISOString().slice(0,10);
  const [elephantInput, setElephantInput] = useState("");
  useEffect(() => {
    setElephantInput(elephantTasks[dateKey] || "");
  }, [dateKey, elephantTasks]);

  function handleSaveElephant() {
    setElephantTasks({ ...elephantTasks, [dateKey]: elephantInput });
  }
  function handleDeleteElephant() {
    const copy = { ...elephantTasks };
    delete copy[dateKey];
    setElephantTasks(copy);
    setElephantInput("");
  }
  const [view, setView] = useState("month");
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [filterType, setFilterType] = useState("all");

  // Fetch events and todos from Key Areas (mocked for now)
  useEffect(() => {
    // TODO: Replace with real API calls to Key Areas
    // Example: fetch('/api/key-areas/tasks')
    const keyAreaTasks = JSON.parse(localStorage.getItem("tasks")) || [];
    // Only include tasks/events with a valid date and not deleted/archived
    const filtered = keyAreaTasks.filter(t => (t.dueDate || t.deadline || t.end_date) && !t.deleted && !t.archived);
    // Map to calendar event format
    const mapped = filtered.map(t => ({
      id: t.id,
      title: t.name || t.title,
      type: t.type || "task",
      start: t.dueDate || t.deadline || t.start,
      end: t.dueDate || t.end_date || t.end,
      source: t.keyArea ? `Tab: ${t.keyArea}` : undefined,
      desc: t.description || "",
      allDay: false,
    }));
    setEvents(mapped);
    setTodos(filtered.filter(t => t.type === "todo"));
  }, [view, timezone]);

  // Drag-and-drop logic placeholder
  const handleTaskDrop = async (task, date) => {
    // TODO: Implement API call to timebox task
    setView(view);
  };

  // Event modal logic
  const openModal = (event = null) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  return (
    <div className="w-full">
      {/* Elephant Task Input - Screenshot Style */}
      <div className="w-full flex items-center gap-3 mb-4 bg-gradient-to-r from-sky-100 to-blue-50 border border-sky-200 px-6 py-4 rounded-xl shadow-sm" style={{ minHeight: 56 }}>
        <span className="text-3xl mr-2" title="Your most important task of the day.">🐘</span>
        <input
          type="text"
          value={elephantInput}
          onChange={e => setElephantInput(e.target.value)}
          placeholder="Enter your elephant task..."
          className="flex-1 px-4 py-3 rounded-lg border border-sky-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        {elephantInput && (
          <button className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-3 rounded-lg font-semibold transition-all duration-150 ml-2 shadow" onClick={handleSaveElephant}>
            {elephantTasks[dateKey] ? "Update" : "Save"}
          </button>
        )}
        {elephantTasks[dateKey] && (
          <button className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded-lg ml-2" onClick={handleDeleteElephant} title="Delete Elephant Task">✕</button>
        )}
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {VIEWS.map(v => (
          <button key={v} className={`px-4 py-2 rounded ${view===v?"bg-blue-600 text-white":"bg-gray-200"}`} onClick={()=>setView(v)}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
        ))}
        <select className="ml-2 px-3 py-2 rounded border" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="task">Tasks</option>
          <option value="reminder">Reminders</option>
          <option value="meeting">Meetings</option>
          <option value="custom">Custom</option>
        </select>
        <button className="ml-auto bg-green-500 text-white px-3 py-2 rounded" onClick={()=>openModal()}>+ Add Event</button>
      </div>
      {/* Filter events by type */}
      {view === "quarter" && <QuarterView events={events.filter(e => filterType === "all" || e.type === filterType)} categories={EVENT_CATEGORIES} onDayClick={openModal} />}
      {view === "month" && <MonthView events={events.filter(e => filterType === "all" || e.type === filterType)} categories={EVENT_CATEGORIES} onEventClick={openModal} />}
      {view === "week" && <WeekView events={events.filter(e => filterType === "all" || e.type === filterType)} todos={todos} categories={EVENT_CATEGORIES} onTaskDrop={handleTaskDrop} onEventClick={openModal} />}
      {view === "day" && <DayView events={events.filter(e => filterType === "all" || e.type === filterType)} todos={todos} categories={EVENT_CATEGORIES} onTaskDrop={handleTaskDrop} onEventClick={openModal} onPlanTomorrow={()=>{}} />}
      {view === "list" && <ListView events={events.filter(e => filterType === "all" || e.type === filterType)} onEventClick={openModal} />}
      <TodoPanel todos={todos} onTaskDrop={handleTaskDrop} />
      {modalOpen && <EventModal event={selectedEvent} onClose={()=>setModalOpen(false)} categories={EVENT_CATEGORIES} timezone={timezone} />}
    </div>
  );
};

export default CalendarContainer;
