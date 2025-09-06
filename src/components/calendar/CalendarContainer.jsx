import React, { useState, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import QuarterView from "./QuarterView";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import DayView from "./DayView";
import ListView from "./ListView";
import EventModal from "./EventModal";
import TaskActivityModal from "./TaskActivityModal";
import taskService from "../../services/taskService";
import activityService from "../../services/activityService";
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
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addDate, setAddDate] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null); // { type: 'task'|'activity', id, ...fields }
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
            } else if (view === "day") {
                // Fetch a wider window around the selected day so multi-day tasks overlapping this day are included
                const s = new Date(currentDate);
                s.setDate(s.getDate() - 7);
                const e = new Date(currentDate);
                e.setDate(e.getDate() + 7);
                start.setTime(s.getTime());
                end.setTime(e.getTime());
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

    const refreshTodosForRange = async () => {
        // Reuse the same range logic as above for listTodos only
        const start = new Date(currentDate);
        const end = new Date(currentDate);
        if (view === "week") {
            start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
            end.setTime(start.getTime());
            end.setDate(start.getDate() + 6);
        } else if (view === "day") {
            const s = new Date(currentDate);
            s.setDate(s.getDate() - 7);
            const e = new Date(currentDate);
            e.setDate(e.getDate() + 7);
            start.setTime(s.getTime());
            end.setTime(e.getTime());
        } else if (view === "month" || view === "list") {
            start.setDate(1);
            end.setMonth(start.getMonth() + 1, 0);
        } else if (view === "quarter") {
            const q = Math.floor(start.getMonth() / 3);
            start.setMonth(q * 3, 1);
            end.setMonth(q * 3 + 3, 0);
        }
        const fromISO = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0).toISOString();
        const toISO = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString();
        try {
            const tds = await calendarService.listTodos({ from: fromISO, to: toISO });
            setTodos(Array.isArray(tds) ? tds : []);
        } catch {}
    };

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

    const [addDefaultTab, setAddDefaultTab] = useState("task");
    const openAddModal = (date, options = {}) => {
        setAddDate(date instanceof Date ? date : new Date(date));
        setAddDefaultTab(options.defaultTab === "activity" ? "activity" : "task");
        setAddModalOpen(true);
    };

    // Open edit modal for a task from MonthView bars
    const openEditTask = async (taskOrId) => {
        if (!taskOrId) return;
        let task = taskOrId;
        try {
            if (typeof taskOrId === "string") {
                task = await taskService.get(taskOrId);
            }
        } catch (e) {
            addToast({ title: "Task not found", variant: "error" });
            return;
        }
        const toDateStr = (d) => {
            if (!d) return "";
            const dt = new Date(d);
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, "0");
            const day = String(dt.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };
        const toTimeStr = (d) => {
            if (!d) return "00:00";
            const dt = new Date(d);
            const hh = String(dt.getHours()).padStart(2, "0");
            const mm = String(dt.getMinutes()).padStart(2, "0");
            return `${hh}:${mm}`;
        };
        const item = {
            id: task.id,
            type: "task",
            title: task.title || "",
            description: task.description || "",
            keyAreaId: task.keyAreaId || "",
            date: toDateStr(task.startDate || task.dueDate || task.endDate),
            time: toTimeStr(task.startDate),
            dueDate: toDateStr(task.dueDate),
            endDate: toDateStr(task.endDate),
            priority: task.priority || "medium",
            assignee: task.assignee || "",
        };
        setEditItem(item);
        setEditModalOpen(true);
    };

    const handleAddSave = async (form) => {
        // form: { title, type: 'task'|'activity', date: 'YYYY-MM-DD', time?: 'HH:MM', description? }
        const when = (() => {
            try {
                const [y, m, d] = String(form.date || "")
                    .split("-")
                    .map((v) => parseInt(v, 10));
                const [hh, mm] = String(form.time || "00:00")
                    .split(":")
                    .map((v) => parseInt(v, 10));
                const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
                // Snap to 30-minute slots
                const minutes = dt.getMinutes();
                const snapped = minutes < 15 ? 0 : minutes < 45 ? 30 : 0; // round to nearest half hour
                if (snapped === 0 && minutes >= 45) dt.setHours(dt.getHours() + 1);
                dt.setMinutes(snapped, 0, 0);
                // Clamp to visible range 00:00–23:30 (full day)
                if (dt.getHours() < 0) dt.setHours(0, 0, 0, 0);
                if (dt.getHours() > 23 || (dt.getHours() === 23 && dt.getMinutes() > 30)) dt.setHours(23, 30, 0, 0);
                return dt;
            } catch {
                return addDate || new Date();
            }
        })();
        try {
            if (form.type === "activity") {
                await activityService.create({ text: form.text || form.title, taskId: form.taskId || null });
                addToast({ title: "Activity added", variant: "success" });
            } else {
                const toEndOfDayIso = (dateStr) => {
                    if (!dateStr) return null;
                    try {
                        const [yy, mm, dd] = String(dateStr)
                            .split("-")
                            .map((v) => parseInt(v, 10));
                        const d = new Date(yy, (mm || 1) - 1, dd || 1, 23, 59, 59, 999);
                        return d.toISOString();
                    } catch {
                        return null;
                    }
                };
                const dueIso = toEndOfDayIso(form.dueDate);
                const endIso = toEndOfDayIso(form.endDate);
                const createdTask = await taskService.create({
                    title: form.title,
                    description: form.description || null,
                    startDate: when.toISOString(),
                    dueDate: dueIso,
                    endDate: endIso,
                    status: "open",
                    priority: "medium",
                    keyAreaId: form.keyAreaId || undefined,
                });
                addToast({ title: "Task added", variant: "success" });
                // Immediately create a calendar event at the selected time for this new task
                try {
                    const start = new Date(when);
                    const end = new Date(start.getTime() + 60 * 60 * 1000); // default 60 minutes
                    const ev = await calendarService.createEvent({
                        title: form.title,
                        start: start.toISOString(),
                        end: end.toISOString(),
                        allDay: false,
                        taskId: createdTask.id,
                        keyAreaId: form.keyAreaId || undefined,
                        kind: "custom",
                    });
                    setEvents((prev) => [...prev, ev]);
                } catch (e) {
                    // Event creation failure shouldn't block task creation
                    console.warn("Failed to create calendar event for task", e);
                }
            }
            await refreshTodosForRange();
        } catch (e) {
            addToast({ title: "Failed to add", description: String(e?.message || e), variant: "error" });
        }
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
                        todos={todos}
                        categories={EVENT_CATEGORIES}
                        onEventClick={openModal}
                        onTaskClick={openEditTask}
                    />
                )}
                {view === "week" && (
                    <WeekView
                        currentDate={currentDate}
                        onShiftDate={shiftDate}
                        onSetDate={setCurrentDate}
                        onQuickCreate={handleQuickCreate}
                        onAddTaskOrActivity={openAddModal}
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
                        onEventClick={(ev) => (ev?.taskId ? openEditTask(ev.taskId) : openModal(ev))}
                        onTaskClick={openEditTask}
                    />
                )}
                {view === "day" && (
                    <DayView
                        currentDate={currentDate}
                        onShiftDate={shiftDate}
                        onSetDate={setCurrentDate}
                        onQuickCreate={handleQuickCreate}
                        onAddTaskOrActivity={openAddModal}
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
                        onEventClick={(ev) => (ev?.taskId ? openEditTask(ev.taskId) : openModal(ev))}
                        onTaskClick={openEditTask}
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
                        onEventClick={(ev) => (ev?.taskId ? openEditTask(ev.taskId) : openModal(ev))}
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
            {addModalOpen && (
                <TaskActivityModal
                    item={{
                        title: "",
                        type: addDefaultTab,
                        // Use local date to avoid UTC shift (off-by-one day)
                        date: (() => {
                            const d = addDate || new Date();
                            const y = d.getFullYear();
                            const m = String(d.getMonth() + 1).padStart(2, "0");
                            const day = String(d.getDate()).padStart(2, "0");
                            return `${y}-${m}-${day}`;
                        })(),
                        // Let the modal choose its default time (e.g., 08:00)
                        time: undefined,
                        status: "pending",
                        description: "",
                    }}
                    onClose={() => setAddModalOpen(false)}
                    onSave={handleAddSave}
                />
            )}
            {editModalOpen && editItem && (
                <TaskActivityModal
                    item={editItem}
                    onClose={() => {
                        setEditModalOpen(false);
                        setEditItem(null);
                    }}
                    onSave={async (form) => {
                        try {
                            if (editItem?.type === "task") {
                                const toEndOfDayIso = (dateStr) => {
                                    if (!dateStr) return null;
                                    try {
                                        const [yy, mm, dd] = String(dateStr)
                                            .split("-")
                                            .map((v) => parseInt(v, 10));
                                        const d = new Date(yy, (mm || 1) - 1, dd || 1, 23, 59, 59, 999);
                                        return d.toISOString();
                                    } catch {
                                        return null;
                                    }
                                };
                                const when = (() => {
                                    try {
                                        const [y, m, d] = String(form.date || "")
                                            .split("-")
                                            .map((v) => parseInt(v, 10));
                                        const [hh, mm] = String(form.time || "00:00")
                                            .split(":")
                                            .map((v) => parseInt(v, 10));
                                        const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
                                        // snap to nearest 30m
                                        const minutes = dt.getMinutes();
                                        const snapped = minutes < 15 ? 0 : minutes < 45 ? 30 : 0;
                                        if (snapped === 0 && minutes >= 45) dt.setHours(dt.getHours() + 1);
                                        dt.setMinutes(snapped, 0, 0);
                                        return dt;
                                    } catch {
                                        return new Date();
                                    }
                                })();
                                const payload = {
                                    title: form.title,
                                    description: form.description || null,
                                    startDate: when.toISOString(),
                                    dueDate: toEndOfDayIso(form.dueDate),
                                    endDate: toEndOfDayIso(form.endDate),
                                    priority: form.priority || "medium",
                                    keyAreaId: form.keyAreaId || undefined,
                                };
                                const updated = await taskService.update(editItem.id, payload);
                                // reflect change locally (todos source)
                                await refreshTodosForRange();
                                addToast({ title: "Task updated", variant: "success" });
                            } else if (editItem?.type === "activity") {
                                // Optional support
                                await activityService.update(editItem.id, {
                                    text: form.text,
                                    taskId: form.taskId || null,
                                });
                                addToast({ title: "Activity updated", variant: "success" });
                            }
                        } catch (e) {
                            addToast({
                                title: "Failed to update",
                                description: String(e?.message || e),
                                variant: "error",
                            });
                        }
                    }}
                    onDelete={async () => {
                        try {
                            if (editItem?.type === "task") {
                                await taskService.remove(editItem.id);
                                await refreshTodosForRange();
                                addToast({ title: "Task deleted", variant: "success" });
                            } else if (editItem?.type === "activity") {
                                await activityService.remove(editItem.id);
                                addToast({ title: "Activity deleted", variant: "success" });
                            }
                            setEditModalOpen(false);
                            setEditItem(null);
                        } catch (e) {
                            addToast({
                                title: "Failed to delete",
                                description: String(e?.message || e),
                                variant: "error",
                            });
                        }
                    }}
                />
            )}
        </div>
    );
};

export default CalendarContainer;
