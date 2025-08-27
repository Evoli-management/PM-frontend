import React, { useState, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import QuarterView from "./QuarterView";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import DayView from "./DayView";
import ListView from "./ListView";
import EventModal from "./EventModal";
import AvailabilityBlock from "./AvailabilityBlock";

const VIEWS = ["day", "week", "month", "quarter", "list"];
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
    const [currentDate, setCurrentDate] = useState(new Date());
    const today = new Date();
    const dateKey = currentDate.toISOString().slice(0, 10);
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
    const [view, setView] = useState("day");
    const [events, setEvents] = useState([]);
    const [todos, setTodos] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [filterType, setFilterType] = useState("all");
    const [showViewMenu, setShowViewMenu] = useState(false);
    const viewMenuRef = React.useRef(null);

    // Fetch events and todos from Key Areas (mocked for now)
    useEffect(() => {
        // TODO: Replace with real API calls to Key Areas
        // Example: fetch('/api/key-areas/tasks')
        const keyAreaTasks = JSON.parse(localStorage.getItem("tasks")) || [];
        // Only include tasks/events with a valid date and not deleted/archived
        const filtered = keyAreaTasks.filter(
            (t) => (t.dueDate || t.deadline || t.end_date) && !t.deleted && !t.archived,
        );
        // Map to calendar event format
        const mapped = filtered.map((t) => ({
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
        setTodos(filtered.filter((t) => t.type === "todo"));
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

    // Shift current date depending on active view
    const shiftDate = (delta) => {
        const d = new Date(currentDate);
        switch (view) {
            case "day":
                d.setDate(d.getDate() + delta);
                break;
            case "week":
                d.setDate(d.getDate() + 7 * delta);
                break;
            case "month":
                d.setMonth(d.getMonth() + delta);
                break;
            case "quarter":
                d.setMonth(d.getMonth() + 3 * delta);
                break;
            case "list":
                d.setMonth(d.getMonth() + delta);
                break;
            default:
                d.setDate(d.getDate() + delta);
        }
        setCurrentDate(d);
    };

    // Human-readable label for current range (day/week/month/quarter)
    const rangeLabel = (() => {
        const d = new Date(currentDate);
        const fmtDay = (dt, opts = {}) =>
            dt.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
                ...opts,
            });
        if (view === "day") {
            return fmtDay(d);
        }
        if (view === "week") {
            const weekStart = new Date(d);
            weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();
            const startStr = weekStart.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: sameYear ? undefined : "numeric",
            });
            const endStr = weekEnd.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
            return `${startStr} — ${endStr}`;
        }
        if (view === "month") {
            return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
        }
        if (view === "quarter") {
            const q = Math.floor(d.getMonth() / 3) + 1;
            return `Q${q} ${d.getFullYear()}`;
        }
        if (view === "list") {
            return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
        }
        return "";
    })();

    // Close View dropdown on outside click / Esc
    React.useEffect(() => {
        function handleClickOutside(e) {
            if (viewMenuRef.current && !viewMenuRef.current.contains(e.target)) {
                setShowViewMenu(false);
            }
        }
        function handleKey(e) {
            if (e.key === "Escape") setShowViewMenu(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKey);
        };
    }, []);

    return (
        <div className="w-full">
            {/* Unified calendar card */}
            <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-4">
                <div className="flex gap-2 mb-4 flex-wrap items-center">
                    {/* View dropdown */}
                    <div className="relative" ref={viewMenuRef}>
                        <button
                            className="px-3 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center gap-2"
                            style={{ minWidth: 44, minHeight: 36 }}
                            onClick={() => setShowViewMenu((s) => !s)}
                            aria-haspopup="menu"
                            aria-expanded={showViewMenu}
                        >
                            <span>View</span>
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                {view.charAt(0).toUpperCase() + view.slice(1)}
                            </span>
                            <FaChevronDown
                                className={`${showViewMenu ? "rotate-180" : "rotate-0"} transition-transform`}
                            />
                        </button>
                        {showViewMenu && (
                            <div
                                role="menu"
                                className="absolute z-10 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
                            >
                                {VIEWS.map((v) => {
                                    const label = v.charAt(0).toUpperCase() + v.slice(1);
                                    const active = view === v;
                                    return (
                                        <button
                                            key={v}
                                            role="menuitemradio"
                                            aria-checked={active}
                                            className={`w-full text-left px-3 py-2 text-sm ${active ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
                                            onClick={() => {
                                                setView(v);
                                                setShowViewMenu(false);
                                            }}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Filter and Add Event: hide on mobile, show on desktop */}
                    <div className="hidden md:flex items-center gap-2 flex-1">
                        <select
                            className="ml-2 px-3 py-2 rounded border text-sm font-semibold text-blue-900 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-700"
                            style={{ minHeight: 36 }}
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            aria-label="Filter event types"
                        >
                            <option value="all">All Types</option>
                            <option value="task">Tasks</option>
                            <option value="reminder">Reminders</option>
                            <option value="meeting">Meetings</option>
                            <option value="custom">Custom</option>
                        </select>
                        <button
                            className="ml-auto bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-700"
                            style={{ minWidth: 44, minHeight: 36 }}
                            onClick={() => openModal()}
                            aria-label="Add new event"
                        >
                            + Add Event
                        </button>
                    </div>
                </div>
                {/* Each view renders its own navigation header */}
                {/* Elephant Task Input */}
                <div
                    className="w-full flex items-center gap-3 mb-4 bg-gradient-to-r from-sky-100 to-blue-50 border border-sky-200 px-4 py-3 rounded-lg"
                    style={{ minHeight: 56 }}
                >
                    <span className="text-3xl mr-2" title="Your most important task of the day.">
                        🐘
                    </span>
                    <input
                        type="text"
                        value={elephantInput}
                        onChange={(e) => setElephantInput(e.target.value)}
                        placeholder="Enter your elephant task..."
                        className="flex-1 px-4 py-3 rounded-lg border border-sky-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    {elephantInput && (
                        <button
                            className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-3 rounded-lg font-semibold transition-all duration-150 ml-2 shadow"
                            onClick={handleSaveElephant}
                        >
                            {elephantTasks[dateKey] ? "Update" : "Save"}
                        </button>
                    )}
                    {elephantTasks[dateKey] && (
                        <button
                            className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded-lg ml-2"
                            onClick={handleDeleteElephant}
                            title="Delete Elephant Task"
                        >
                            ✕
                        </button>
                    )}
                </div>
                {/* Active view content */}
                {view === "quarter" && (
                    <QuarterView
                        currentDate={currentDate}
                        onShiftDate={shiftDate}
                        events={events.filter((e) => filterType === "all" || e.type === filterType)}
                        categories={EVENT_CATEGORIES}
                        onDayClick={openModal}
                    />
                )}
                {view === "month" && (
                    <MonthView
                        currentDate={currentDate}
                        onShiftDate={shiftDate}
                        events={events.filter((e) => filterType === "all" || e.type === filterType)}
                        categories={EVENT_CATEGORIES}
                        onEventClick={openModal}
                    />
                )}
                {view === "week" && (
                    <WeekView
                        currentDate={currentDate}
                        onShiftDate={shiftDate}
                        events={events.filter((e) => filterType === "all" || e.type === filterType)}
                        todos={todos}
                        categories={EVENT_CATEGORIES}
                        onTaskDrop={handleTaskDrop}
                        onEventClick={openModal}
                    />
                )}
                {view === "day" && (
                    <DayView
                        currentDate={currentDate}
                        onShiftDate={shiftDate}
                        events={events.filter((e) => filterType === "all" || e.type === filterType)}
                        todos={todos}
                        categories={EVENT_CATEGORIES}
                        onTaskDrop={handleTaskDrop}
                        onEventClick={openModal}
                        onPlanTomorrow={() => {}}
                    />
                )}
                {view === "list" && (
                    <ListView
                        currentDate={currentDate}
                        onShiftDate={shiftDate}
                        events={events.filter((e) => filterType === "all" || e.type === filterType)}
                        onEventClick={openModal}
                    />
                )}
            </div>
            {modalOpen && (
                <EventModal
                    event={selectedEvent}
                    onClose={() => setModalOpen(false)}
                    categories={EVENT_CATEGORIES}
                    timezone={timezone}
                />
            )}
        </div>
    );
};

export default CalendarContainer;
