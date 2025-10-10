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
import ElephantTaskModal from "./ElephantTaskModal";
import ElephantTaskInput from "./ElephantTaskInput";
import taskService from "../../services/taskService";
import activityService from "../../services/activityService";
import elephantTaskService from "../../services/elephantTaskService";
import AvailabilityBlock from "./AvailabilityBlock";
import calendarService from "../../services/calendarService";
import { useToast } from "../shared/ToastProvider.jsx";
import { withinBusinessHours, clampToBusinessHours } from "../../utils/businessHours";
import AppointmentModal from "./AppointmentModal";

const VIEWS = ["day", "week", "month", "quarter", "list"];
const EVENT_CATEGORIES = {
    focus: { color: "bg-blue-500", icon: "🧠" },
    meeting: { color: "bg-yellow-500", icon: "📅" },
    travel: { color: "bg-purple-500", icon: "✈️" },
    elephant_bite: { color: "bg-orange-500", icon: "🐘" },
    appointment: { color: "bg-indigo-400", icon: "📌" },
    green: { color: "bg-green-400", icon: "✔️" },
    red: { color: "bg-red-400", icon: "⛔" },
    custom: { color: "bg-gray-300", icon: "•" },
};

const CalendarContainer = () => {
    const { addToast } = useToast();
    // Elephant Task state
    const [elephantTasks, setElephantTasks] = useState([]);
    const [elephantTaskModalOpen, setElephantTaskModalOpen] = useState(false);
    const [selectedTaskForElephant, setSelectedTaskForElephant] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const today = new Date();
    const dateKey = currentDate.toISOString().slice(0, 10);

    // Load elephant tasks
    const loadElephantTasks = async () => {
        try {
            const tasks = await elephantTaskService.getElephantTasks();
            setElephantTasks(tasks || []);
        } catch (error) {
            console.error("Error loading elephant tasks:", error);
        }
    };

    const handleCreateElephantTask = (taskId = null) => {
        setSelectedTaskForElephant(taskId);
        setElephantTaskModalOpen(true);
    };

    const handleElephantTaskSaved = () => {
        loadElephantTasks();
        loadEvents(); // Reload calendar events to show new elephant bites
        setElephantTaskModalOpen(false);
        setSelectedTaskForElephant(null);
    };
    const [view, setView] = useState("day");
    const [events, setEvents] = useState([]);
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activitiesByTask, setActivitiesByTask] = useState({}); // { taskId: Activity[] }
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addDate, setAddDate] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null); // { type: 'task'|'activity', id, ...fields }
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
    const [appointmentInitialStart, setAppointmentInitialStart] = useState(null);
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

    // Helper: determine if a todo spans the given day (date-only compare)
    const isTodoInRangeOfDay = (t, dayDate) => {
        try {
            const toDateOnly = (iso) => {
                if (!iso) return null;
                const d = new Date(iso);
                return new Date(d.getFullYear(), d.getMonth(), d.getDate());
            };
            const todayOnly = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
            let start = toDateOnly(t.startDate) || toDateOnly(t.dueDate) || toDateOnly(t.endDate);
            let end = toDateOnly(t.endDate) || toDateOnly(t.dueDate) || toDateOnly(t.startDate);
            if (!start && !end) return false;
            if (start && end && start > end) {
                const tmp = start;
                start = end;
                end = tmp;
            }
            if (!start) start = end;
            if (!end) end = start;
            return start <= todayOnly && todayOnly <= end;
        } catch {
            return false;
        }
    };

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
                // Fetch exactly the selected day; tasks spanning the day will be included by backend overlap logic
                start.setTime(currentDate.getTime());
                end.setTime(currentDate.getTime());
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

                // Load elephant tasks
                try {
                    const elephantTasksData = await elephantTaskService.getElephantTasks();
                    setElephantTasks(elephantTasksData || []);
                } catch (error) {
                    console.warn("Failed to load elephant tasks:", error);
                }

                // If Day view, also fetch activities for tasks that are dated today
                if (view === "day") {
                    try {
                        const todayTodos = (Array.isArray(tds) ? tds : []).filter((t) =>
                            isTodoInRangeOfDay(t, currentDate),
                        );
                        const uniqueIds = Array.from(new Set(todayTodos.map((t) => String(t.id))));
                        const pairs = await Promise.all(
                            uniqueIds.map(async (id) => {
                                try {
                                    const list = await activityService.list({ taskId: id });
                                    return [id, Array.isArray(list) ? list : []];
                                } catch {
                                    return [id, []];
                                }
                            }),
                        );
                        const map = Object.fromEntries(pairs);
                        setActivitiesByTask(map);
                    } catch {
                        setActivitiesByTask({});
                    }
                } else {
                    setActivitiesByTask({});
                }
            } catch (err) {
                console.warn("Failed to load calendar data", err);
                setEvents([]);
                setTodos([]);
                setActivitiesByTask({});
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
            // Exact day range for refresh
            start.setTime(currentDate.getTime());
            end.setTime(currentDate.getTime());
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
            // Also refresh activities map if day view
            if (view === "day") {
                try {
                    const todayTodos = (Array.isArray(tds) ? tds : []).filter((t) =>
                        isTodoInRangeOfDay(t, currentDate),
                    );
                    const uniqueIds = Array.from(new Set(todayTodos.map((t) => String(t.id))));
                    const pairs = await Promise.all(
                        uniqueIds.map(async (id) => {
                            try {
                                const list = await activityService.list({ taskId: id });
                                return [id, Array.isArray(list) ? list : []];
                            } catch {
                                return [id, []];
                            }
                        }),
                    );
                    const map = Object.fromEntries(pairs);
                    setActivitiesByTask(map);
                } catch {
                    setActivitiesByTask({});
                }
            }
        } catch {}
    };

    // Drag-and-drop: create an appointment for a task
    const handleTaskDrop = async (taskOrId, date) => {
        try {
            const defaultMinutes = 30;
            let start = new Date(date);
            if (!withinBusinessHours(start)) {
                addToast({
                    title: "Outside business hours",
                    description: "Schedule only between 08:00 and 17:00",
                    variant: "warning",
                });
                return;
            }
            const { end } = clampToBusinessHours(start, defaultMinutes);
            const taskId = typeof taskOrId === "string" ? taskOrId : taskOrId?.id;
            // Try to find a title from todos if not provided
            let title =
                (typeof taskOrId === "object" && taskOrId?.title) ||
                todos.find((t) => String(t.id) === String(taskId))?.title ||
                "Task";
            const description = typeof taskOrId === "object" ? taskOrId.description || "" : "";
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
            const toOffsetISO = (d) => {
                const pad = (n) => String(n).padStart(2, "0");
                const y = d.getFullYear();
                const m = pad(d.getMonth() + 1);
                const day = pad(d.getDate());
                const hh = pad(d.getHours());
                const mm = pad(d.getMinutes());
                const ss = "00";
                const off = -d.getTimezoneOffset();
                const sign = off >= 0 ? "+" : "-";
                const oh = pad(Math.floor(Math.abs(off) / 60));
                const om = pad(Math.abs(off) % 60);
                return `${y}-${m}-${day}T${hh}:${mm}:${ss}${sign}${oh}:${om}`;
            };
            const created = await calendarService.createAppointment({
                title,
                description,
                start: toOffsetISO(start),
                end: toOffsetISO(end),
                timezone: tz,
            });
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
                    let start = new Date(when);
                    if (!withinBusinessHours(start)) {
                        addToast({
                            title: "Outside business hours",
                            description: "Adjusted to 08:00",
                            variant: "warning",
                        });
                    }
                    const { end } = clampToBusinessHours(start, 60); // default 60 minutes
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

    // Double-click now opens appointment modal instead of auto-creating
    const handleQuickCreate = (date) => {
        const start = new Date(date);
        if (!withinBusinessHours(start)) {
            addToast({
                title: "Outside business hours",
                description: "Use a slot between 08:00 and 17:00",
                variant: "warning",
            });
            return;
        }
        setAppointmentInitialStart(start);
        setAppointmentModalOpen(true);
    };

    // Move event (drag existing event into a new slot)
    const handleEventMove = async (eventId, newStartDate, newEndDate) => {
        try {
            if (!withinBusinessHours(newStartDate) || (newEndDate && !withinBusinessHours(newEndDate))) {
                addToast({
                    title: "Outside business hours",
                    description: "Allowed window 08:00–17:00",
                    variant: "error",
                });
                return;
            }
            // Enforce 30-minute duration when moving via grid
            const fixedEnd = new Date(newStartDate.getTime() + 30 * 60 * 1000);
            const payload = { start: newStartDate.toISOString(), end: fixedEnd.toISOString() };
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

    // Helper function to get date range for current view
    const getCurrentViewDateRange = () => {
        const start = new Date(currentDate);
        const end = new Date(currentDate);

        if (view === "day") {
            // Same day
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (view === "week") {
            // Start Monday, end Sunday
            start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
            start.setHours(0, 0, 0, 0);
            end.setTime(start.getTime());
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (view === "month") {
            // First day to last day of month
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
        } else if (view === "quarter") {
            // First day of quarter to last day of quarter
            const q = Math.floor(start.getMonth() / 3);
            start.setMonth(q * 3, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(q * 3 + 3, 0);
            end.setHours(23, 59, 59, 999);
        } else {
            // Default to current month for list view
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(start.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
        }

        return {
            dateStart: start.toISOString(),
            dateEnd: end.toISOString(),
        };
    };

    return (
        <div className="w-full">
            {/* Unified calendar card */}
            <div className="bg-white border border-blue-200 rounded-lg shadow-sm p-3">
                {/* Controls moved into each view header per request */}
                {/* Each view renders its own navigation header */}

                {/* New Calendar Elephant Task Input */}
                {view !== "list" &&
                    (() => {
                        const { dateStart, dateEnd } = getCurrentViewDateRange();
                        return (
                            <div className="mb-3">
                                <ElephantTaskInput
                                    viewType={view}
                                    dateStart={dateStart}
                                    dateEnd={dateEnd}
                                    onTaskChange={() => {
                                        // Optionally refresh calendar data when elephant task changes
                                    }}
                                />
                            </div>
                        );
                    })()}
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
                        todos={todos}
                        categories={EVENT_CATEGORIES}
                        onDayClick={(date) => openAddModal(date, { defaultTab: "task" })}
                        onEventClick={(ev) => (ev?.taskId ? openEditTask(ev.taskId) : openModal(ev))}
                        onTaskClick={openEditTask}
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
                        onTaskDrop={handleTaskDrop}
                        onQuickCreate={handleQuickCreate}
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
                        activitiesByTask={activitiesByTask}
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
                        todos={todos}
                        onEventClick={(ev) => (ev?.taskId ? openEditTask(ev.taskId) : openModal(ev))}
                        onTaskClick={openEditTask}
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
            {appointmentModalOpen && appointmentInitialStart && (
                <AppointmentModal
                    startDate={appointmentInitialStart}
                    defaultDurationMinutes={30}
                    onClose={() => {
                        setAppointmentModalOpen(false);
                        setAppointmentInitialStart(null);
                    }}
                    onCreated={(created) => {
                        setEvents((prev) => [...prev, created]);
                        addToast({ title: "Appointment created", variant: "success" });
                        setAppointmentModalOpen(false);
                        setAppointmentInitialStart(null);
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

            {/* Elephant Task Modal */}
            <ElephantTaskModal
                isOpen={elephantTaskModalOpen}
                onClose={() => {
                    setElephantTaskModalOpen(false);
                    setSelectedTaskForElephant(null);
                }}
                onSave={handleElephantTaskSaved}
                taskId={selectedTaskForElephant}
            />
        </div>
    );
};

export default CalendarContainer;
