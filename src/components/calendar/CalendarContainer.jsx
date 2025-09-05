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
import calendarService from "../../services/calendarService";
import { useToast } from "../shared/ToastProvider.jsx";

const VIEWS = ["day", "week", "month", "quarter", "list"];
const EVENT_CATEGORIES = {
    focus: { color: "bg-blue-500", icon: "🧠" },
    meeting: { color: "bg-yellow-500", icon: "📅" },
    travel: { color: "bg-purple-500", icon: "✈️" },
    green: { color: "bg-green-400", icon: "✔️" },
    red: { color: "bg-red-400", icon: "⛔" },
    custom: { color: "bg-gray-300", icon: "•" },
};

const CalendarContainer = () => {
    const { addToast } = useToast();
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
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [filterType, setFilterType] = useState("all");
    const [showViewMenu, setShowViewMenu] = useState(false);
    const viewMenuRef = React.useRef(null);

    // Load persisted view/date on mount
    useEffect(() => {
        try {
            const savedView = localStorage.getItem("calendar:view");
            if (savedView && ["day", "week", "month", "quarter", "list"].includes(savedView)) {
                setView(savedView);
            }
            const savedDate = localStorage.getItem("calendar:date");
            if (savedDate) {
                const d = new Date(savedDate);
                if (!isNaN(d.getTime())) setCurrentDate(d);
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist view/date
    useEffect(() => {
        try {
            localStorage.setItem("calendar:view", view);
            localStorage.setItem("calendar:date", currentDate.toISOString());
        } catch {}
    }, [view, currentDate]);

    // Fetch events/todos from backend for day/week/month/quarter/list views
    useEffect(() => {
        const load = async () => {
            // Compute range based on view
            const start = new Date(currentDate);
            const end = new Date(currentDate);
            if (view === "week") {
                // start Monday
                start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
                end.setTime(start.getTime());
                end.setDate(start.getDate() + 6);
            } else if (view === "month") {
                start.setDate(1);
                end.setMonth(start.getMonth() + 1, 0); // last day of month
            } else if (view === "quarter") {
                const q = Math.floor(start.getMonth() / 3);
                start.setMonth(q * 3, 1);
                end.setMonth(q * 3 + 3, 0); // last day of quarter
            } else if (view === "list") {
                // Use current month for list view range
                start.setDate(1);
                end.setMonth(start.getMonth() + 1, 0);
            }
            const fromISO = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0).toISOString();
            const toISO = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString();

            try {
                setLoading(true);
                const [evs, tds] = await Promise.all([
                    calendarService.listEvents({ from: fromISO, to: toISO, view }),
                    calendarService.listTodos({ from: fromISO, to: toISO }),
                ]);
                setEvents(Array.isArray(evs) ? evs : []);
                setTodos(Array.isArray(tds) ? tds : []);
            } catch (err) {
                console.warn("Failed to load calendar data", err);
                setEvents([]);
                setTodos([]);
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, timezone, currentDate]);

    // Drag-and-drop: create a calendar event (timebox) for a task
    const handleTaskDrop = async (taskOrId, date) => {
        try {
            const defaultMinutes = 60;
            const start = new Date(date);
            const end = new Date(start.getTime() + defaultMinutes * 60 * 1000);
            const taskId = typeof taskOrId === "string" ? taskOrId : taskOrId?.id;
            // Try to find a title from todos if not provided
            let title =
                (typeof taskOrId === "object" && taskOrId?.title) ||
                todos.find((t) => String(t.id) === String(taskId))?.title ||
                "Task";
            const payload = {
                title,
                start: start.toISOString(),
                end: end.toISOString(),
                allDay: false,
                taskId: taskId || undefined,
                kind: "custom",
            };
            const created = await calendarService.createEvent(payload);
            // Optimistic merge
            setEvents((prev) => [...prev, created]);
            addToast({
                title: "Event created",
                description: `${title} at ${start.toLocaleTimeString()}`,
                variant: "success",
            });
        } catch (err) {
            console.warn("Failed to create calendar event from drop", err);
            addToast({ title: "Failed to create event", description: String(err?.message || err), variant: "error" });
        }
    };

    // Event modal logic
    const openModal = (event = null) => {
        setSelectedEvent(event);
        setModalOpen(true);
    };

    // Quick create event on double-click
    const handleQuickCreate = async (date, options = {}) => {
        try {
            const start = new Date(date);
            const end = new Date(start.getTime() + (options.minutes || 60) * 60 * 1000);
            const payload = {
                title: options.title || "New event",
                start: start.toISOString(),
                end: end.toISOString(),
                allDay: false,
                kind: options.kind || "custom",
            };
            const created = await calendarService.createEvent(payload);
            setEvents((prev) => [...prev, created]);
            addToast({ title: "Event created", description: start.toLocaleString(), variant: "success" });
        } catch (err) {
            console.warn("Quick create failed", err);
            addToast({ title: "Failed to create", description: String(err?.message || err), variant: "error" });
        }
    };

    // Move event (drag existing event into a new slot)
    const handleEventMove = async (eventId, newStartDate, newEndDate) => {
        try {
            const payload = { start: newStartDate.toISOString() };
            if (newEndDate) payload.end = newEndDate.toISOString();
            const updated = await calendarService.updateEvent(eventId, payload);
            setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            addToast({
                title: "Event updated",
                description: `Moved to ${newStartDate.toLocaleString()}`,
                variant: "success",
            });
        } catch (err) {
            console.warn("Failed to move event", err);
            addToast({ title: "Failed to update event", description: String(err?.message || err), variant: "error" });
        }
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
            <div className="bg-white border border-blue-200 rounded-lg shadow-sm p-3">
                {/* Controls moved into each view header per request */}
                {/* Each view renders its own navigation header */}
                {/* Elephant Task Input */}
                <div
                    className="w-full flex items-center gap-2 mb-2 bg-gradient-to-r from-sky-100 to-blue-50 border border-sky-200 px-2 py-1 rounded"
                    style={{ minHeight: 36 }}
                >
                    <span className="text-2xl mr-2" title="Your most important task of the day.">
                        🐘
                    </span>
                    <input
                        type="text"
                        value={elephantInput}
                        onChange={(e) => setElephantInput(e.target.value)}
                        placeholder="Enter your elephant task..."
                        className="flex-1 px-2 py-1 rounded border border-sky-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    {elephantInput && (
                        <button
                            className="bg-sky-500 hover:bg-sky-600 text-white px-2 py-1 rounded font-semibold text-sm transition-all duration-150 ml-1 shadow"
                            onClick={handleSaveElephant}
                        >
                            {elephantTasks[dateKey] ? "Update" : "Save"}
                        </button>
                    )}
                    {elephantTasks[dateKey] && (
                        <button
                            className="bg-red-100 hover:bg-red-200 text-red-600 px-1.5 py-1 rounded ml-1"
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
                        view={view}
                        onChangeView={setView}
                        filterType={filterType}
                        onChangeFilter={setFilterType}
                        events={events.filter((e) => filterType === "all" || e.kind === filterType)}
                        categories={EVENT_CATEGORIES}
                        onDayClick={openModal}
                    />
                )}
                {view === "month" && (
                    <MonthView
                        currentDate={currentDate}
                        onShiftDate={shiftDate}
                        view={view}
                        onChangeView={setView}
                        filterType={filterType}
                        onChangeFilter={setFilterType}
                        events={events.filter((e) => filterType === "all" || e.kind === filterType)}
                        categories={EVENT_CATEGORIES}
                        onEventClick={openModal}
                    />
                )}
                {view === "week" && (
                    <WeekView
                        currentDate={currentDate}
                        onShiftDate={shiftDate}
                        onSetDate={setCurrentDate}
                        onQuickCreate={handleQuickCreate}
                        view={view}
                        onChangeView={setView}
                        filterType={filterType}
                        onChangeFilter={setFilterType}
                        events={events.filter((e) => filterType === "all" || e.kind === filterType)}
                        todos={todos}
                        loading={loading}
                        categories={EVENT_CATEGORIES}
                        onTaskDrop={handleTaskDrop}
                        onEventMove={handleEventMove}
                        onEventClick={openModal}
                    />
                )}
                {view === "day" && (
                    <DayView
                        currentDate={currentDate}
                        onShiftDate={shiftDate}
                        onSetDate={setCurrentDate}
                        onQuickCreate={handleQuickCreate}
                        view={view}
                        onChangeView={setView}
                        filterType={filterType}
                        onChangeFilter={setFilterType}
                        events={events.filter((e) => filterType === "all" || e.kind === filterType)}
                        todos={todos}
                        loading={loading}
                        categories={EVENT_CATEGORIES}
                        onTaskDrop={handleTaskDrop}
                        onEventMove={handleEventMove}
                        onEventClick={openModal}
                        onPlanTomorrow={() => {}}
                    />
                )}
                {view === "list" && (
                    <ListView
                        currentDate={currentDate}
                        onShiftDate={shiftDate}
                        view={view}
                        onChangeView={setView}
                        filterType={filterType}
                        onChangeFilter={setFilterType}
                        events={events.filter((e) => filterType === "all" || e.kind === filterType)}
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
                    onEventUpdated={(ev) => {
                        setEvents((prev) => prev.map((e) => (e.id === ev.id ? ev : e)));
                        if (selectedEvent && selectedEvent.id === ev.id) setSelectedEvent(ev);
                        addToast({ title: "Event updated", variant: "success" });
                    }}
                    onEventDeleted={(id) => {
                        setEvents((prev) => prev.filter((e) => e.id !== id));
                        addToast({ title: "Event deleted", variant: "success" });
                    }}
                />
            )}
        </div>
    );
};

export default CalendarContainer;
