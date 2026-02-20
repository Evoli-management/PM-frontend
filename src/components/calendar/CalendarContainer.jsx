import React, { useState, useEffect, Suspense } from "react";
import { FaChevronDown } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import QuarterView from "./QuarterView";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import DayView from "./DayView";
import EventModal from "./EventModal";
const CreateTaskModal = React.lazy(() => import("../key-areas/CreateTaskModal.jsx"));
// The activities modal file is named CreateActivityFormModal.jsx in /components/modals
const CreateActivityModal = React.lazy(() => import("../modals/CreateActivityFormModal"));
const EditActivityModal = React.lazy(() => import("../key-areas/EditActivityModal.jsx"));
const EditTaskModal = React.lazy(() => import("../key-areas/EditTaskModal.jsx"));
import ElephantTaskModal from "./ElephantTaskModal";
import ElephantTaskInput from "./ElephantTaskInput";
// taskService and activityService are loaded on demand to keep them out of the main chunk
let _taskService = null;
const getTaskService = async () => {
    if (_taskService) return _taskService;
    const mod = await import("../../services/taskService");
    _taskService = mod?.default || mod;
    return _taskService;
};

let _activityService = null;
const getActivityService = async () => {
    if (_activityService) return _activityService;
    const mod = await import("../../services/activityService");
    _activityService = mod?.default || mod;
    return _activityService;
};
import elephantTaskService from "../../services/elephantTaskService";
import AvailabilityBlock from "./AvailabilityBlock";
import calendarService from "../../services/calendarService";
import { useToast } from "../shared/ToastProvider.jsx";
import { normalizeActivity } from '../../utils/keyareasHelpers';
import AppointmentModal from "./AppointmentModal";
import DebugEventModal from "./DebugEventModal";
import useCalendarPreferences from '../../hooks/useCalendarPreferences';

const VIEWS = ["day", "week", "month", "quarter"];
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
    const { formatDate, formatTime } = useCalendarPreferences();
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
    const [prefsLoaded, setPrefsLoaded] = useState(false);
    const [events, setEvents] = useState([]);
    const [todos, setTodos] = useState([]);
    const [keyAreas, setKeyAreas] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [goalsList, setGoalsList] = useState([]);
    const [availableLists, setAvailableLists] = useState([1]);
    const [tasksList, setTasksList] = useState([]); // tasks used for modals (may include list_index)
    const [loading, setLoading] = useState(false);
    const [activitiesByTask, setActivitiesByTask] = useState({}); // { taskId: Activity[] }
    const [unattachedActivities, setUnattachedActivities] = useState([]); // activities not linked to a task
    const [weekActivities, setWeekActivities] = useState([]); // Flat list of activities for Week view
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    // Track where the modal was opened from so child modals can enable view-specific actions
    const [modalOpenSource, setModalOpenSource] = useState(null); // e.g. 'month', 'week', 'day'
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addDate, setAddDate] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null); // { type: 'task'|'activity', id, ...fields }
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
    const [appointmentInitialStart, setAppointmentInitialStart] = useState(null);
    const [appointmentInitialAllDay, setAppointmentInitialAllDay] = useState(false);
    const [filterType, setFilterType] = useState("all");
    const [showViewMenu, setShowViewMenu] = useState(false);
    const viewMenuRef = React.useRef(null);
    const deletePopoverRef = React.useRef(null);
    const simpleConfirmRef = React.useRef(null);
    // 5-day vs 7-day week preference (persisted)
    const [workWeek, setWorkWeek] = useState(() => {
        try {
            return localStorage.getItem('calendar:workWeek') === 'true';
        } catch (e) {
            return false;
        }
    });
    // Real-time refresh support (polling when external sync is enabled)
    const [syncActive, setSyncActive] = useState(false);
    const [refreshTick, setRefreshTick] = useState(0);

    // Listen for global appointment create requests (Quick Actions)
    useEffect(() => {
        const handler = (e) => {
            try {
                const start = e?.detail?.start ? new Date(e.detail.start) : new Date();
                if (isNaN(start.getTime())) {
                    setAppointmentInitialStart(new Date());
                } else {
                    setAppointmentInitialStart(start);
                }
                setAppointmentInitialAllDay(false);
                setAppointmentModalOpen(true);
            } catch (_) {
                setAppointmentInitialStart(new Date());
                setAppointmentInitialAllDay(false);
                setAppointmentModalOpen(true);
            }
        };
        window.addEventListener('open-create-appointment', handler);
        return () => window.removeEventListener('open-create-appointment', handler);
    }, []);

    // Load persisted view/date on mount
    useEffect(() => {
        try {
            const savedView = localStorage.getItem("calendar:view");
            if (
                savedView &&
                ["day", "week", "month", "quarter"].includes(savedView)
            ) {
                setView(savedView);
            }
            const savedDate = localStorage.getItem("calendar:date");
            if (savedDate) {
                const d = new Date(savedDate);
                if (!isNaN(d.getTime())) setCurrentDate(d);
            }
        } catch {}
        setPrefsLoaded(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Preload key areas, users and goals so modals have populated dropdowns
    useEffect(() => {
        let ignore = false;
        (async () => {
            try {
                const kaMod = await import('../../services/keyAreaService');
                const kaSvc = kaMod?.default || kaMod;
                const areas = await kaSvc.list({ includeTaskCount: false }).catch(() => []);
                if (!ignore) setKeyAreas(Array.isArray(areas) ? areas : []);
            } catch (e) {
                // non-fatal
                console.warn('Failed to load key areas for calendar', e);
            }
            try {
                const usersMod = await import('../../services/usersService');
                const usersSvc = usersMod?.default || usersMod;
                const us = await usersSvc.list().catch(() => []);
                if (!ignore) setUsersList(Array.isArray(us) ? us : []);
            } catch (e) {
                console.warn('Failed to load users for calendar', e);
            }
            try {
                const goalsMod = await import('../../services/goalService');
                const goalsSvc = goalsMod?.default || goalsMod;
                const gs = await goalsSvc.getGoals({ status: 'active' }).catch(() => []);
                if (!ignore) setGoalsList(Array.isArray(gs) ? gs : []);
            } catch (e) {
                console.warn('Failed to load goals for calendar', e);
            }
            // derive available lists from loaded key areas (max list count across areas)
            try {
                const maxLists = (keyAreas || []).reduce((acc, ka) => Math.max(acc, (ka.list_count || 1)), 1);
                const lists = Array.from({ length: Math.max(1, maxLists) }, (_, i) => i + 1);
                if (!ignore) setAvailableLists(lists);
            } catch (e) {
                if (!ignore) setAvailableLists([1]);
            }
        })();
        return () => {
            ignore = true;
        };
    }, []);

    // When the Add modal is opened, preload tasks from taskService so the
    // CreateActivityFormModal can filter tasks by key area and list index.
    useEffect(() => {
        let ignore = false;
        (async () => {
            if (!addModalOpen) return;
            try {
                const svc = await getTaskService();
                const list = await svc.list();
                if (!ignore) setTasksList(Array.isArray(list) ? list : []);
            } catch (e) {
                if (!ignore) setTasksList([]);
            }
        })();
        return () => { ignore = true; };
    }, [addModalOpen]);

    // Persist view/date
    useEffect(() => {
        if (!prefsLoaded) return;
        try {
            localStorage.setItem("calendar:view", view);
            localStorage.setItem("calendar:date", currentDate.toISOString());
            // persist workWeek preference as well
            try { localStorage.setItem('calendar:workWeek', workWeek ? 'true' : 'false'); } catch (_) {}
        } catch {}
    }, [view, currentDate, prefsLoaded]);
    // Check if external sync is enabled to start auto-refresh
    useEffect(() => {
        let ignore = false;
        (async () => {
            try {
                const status = await calendarService.getSyncStatus();
                if (!ignore) setSyncActive(!!(status?.syncToGoogle || status?.syncToOutlook));
            } catch (_) {
                if (!ignore) setSyncActive(false);
            }
        })();
        return () => { ignore = true; };
    }, []);

    // Auto-refresh interval when sync is active
    useEffect(() => {
        if (!syncActive) return;
        const id = setInterval(() => {
            setRefreshTick((t) => t + 1);
        }, 10000); // refresh every 10s
        return () => clearInterval(id);
    }, [syncActive]);

    // persist workWeek preference when changed
    useEffect(() => {
        try {
            localStorage.setItem('calendar:workWeek', workWeek ? 'true' : 'false');
        } catch (_) {}
    }, [workWeek]);

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

    // Fetch events/todos from backend for day/week/month/quarter views
    useEffect(() => {
        const load = async () => {
            // Compute range based on view
            const start = new Date(currentDate);
            const end = new Date(currentDate);
            if (view === "week") {
                // start Monday
                start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
                end.setTime(start.getTime());
                const daysCount = workWeek ? 5 : 7;
                end.setDate(start.getDate() + (daysCount - 1));
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
            }
            const fromISO = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0).toISOString();
            const toISO = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString();

            try {
                setLoading(true);
                const [evs, tds, appointments] = await Promise.all([
                    calendarService.listEvents({ from: fromISO, to: toISO, view }),
                    calendarService.listTodos({ from: fromISO, to: toISO }),
                    calendarService.listAppointments({ from: fromISO, to: toISO }),
                ]);
                
                // Merge events and appointments
                const allEvents = [...(Array.isArray(evs) ? evs : []), ...(Array.isArray(appointments) ? appointments : [])];
                // Attach human-friendly labels converted from UTC -> user's timezone
                try {
                    // Use the synchronous wrapper; preloadTzLib is called at app startup so this will work.
                    const { formatUtcForUserSync } = await import('../../utils/time');
                    const enriched = (allEvents || []).map((ev) => ({
                        ...ev,
                        formattedStart: ev.start ? formatUtcForUserSync(ev.start, timezone) : null,
                        formattedEnd: ev.end ? formatUtcForUserSync(ev.end, timezone) : null,
                    }));
                    setEvents(enriched);
                } catch (e) {
                    // Fallback: store raw events if utils fail
                    setEvents(allEvents);
                }
                // Filter out completed tasks (status 'done' or 'completed')
                const activeTodos = (Array.isArray(tds) ? tds : []).filter((t) => {
                    const status = String(t.status || '').toLowerCase();
                    return status !== 'done' && status !== 'completed';
                });
                setTodos(activeTodos);

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
                                    const svc = await getActivityService();
                                    const list = await svc.list({ taskId: id });
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
                    setWeekActivities([]);
                } else if (view === "week") {
                    // For Week view, gather activities for all tasks in the selected week and flatten
                    try {
                        const uniqueIds = Array.from(new Set((Array.isArray(tds) ? tds : []).map((t) => String(t.id))));
                        const lists = await Promise.all(
                            uniqueIds.map(async (id) => {
                                try {
                                    const svc = await getActivityService();
                                    const list = await svc.list({ taskId: id });
                                    return Array.isArray(list) ? list : [];
                                } catch {
                                    return [];
                                }
                            }),
                        );
                        const flat = ([]).concat(...lists).filter(Boolean);
                        // Filter out completed activities (check both completed flag and status)
                        const activeActivities = flat.filter((a) => !a.completed && a.status !== 'done');
                        setWeekActivities(activeActivities);
                        setActivitiesByTask({});
                    } catch {
                        setWeekActivities([]);
                        setActivitiesByTask({});
                    }
                } else {
                    setActivitiesByTask({});
                    setWeekActivities([]);
                }
            } catch (err) {
                console.warn("Failed to load calendar data", err);
                setEvents([]);
                setTodos([]);
                setActivitiesByTask({});
                setWeekActivities([]);
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, timezone, currentDate, refreshTick]);

    const refreshTodosForRange = async () => {
        // Reuse the same range logic as above for listTodos only
        const start = new Date(currentDate);
        const end = new Date(currentDate);
        if (view === "week") {
            start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
            end.setTime(start.getTime());
            const daysCount = workWeek ? 5 : 7;
            end.setDate(start.getDate() + (daysCount - 1));
        } else if (view === "day") {
            // Exact day range for refresh
            start.setTime(currentDate.getTime());
            end.setTime(currentDate.getTime());
        } else if (view === "month") {
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
            // Filter out completed tasks
            const activeTodos = (Array.isArray(tds) ? tds : []).filter((t) => {
                const status = String(t.status || '').toLowerCase();
                return status !== 'done' && status !== 'completed';
            });
            setTodos(activeTodos);
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
                                const svc = await getActivityService();
                                const list = await svc.list({ taskId: id });
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
            } else if (view === "week") {
                try {
                    const uniqueIds = Array.from(new Set((Array.isArray(tds) ? tds : []).map((t) => String(t.id))));
                    const lists = await Promise.all(
                        uniqueIds.map(async (id) => {
                            try {
                                const svc = await getActivityService();
                                const list = await svc.list({ taskId: id });
                                return Array.isArray(list) ? list : [];
                            } catch {
                                return [];
                            }
                        }),
                    );
                    const flat = ([]).concat(...lists).filter(Boolean);
                    // Filter out completed activities (check both completed flag and status)
                    const activeActivities = flat.filter((a) => !a.completed && a.status !== 'done');
                    setWeekActivities(activeActivities);
                } catch {
                    setWeekActivities([]);
                }
            }
        } catch {}
    };

    // Drag-and-drop: create an appointment for a task
    const handleTaskDrop = async (taskOrId, date, dropEffect, fallbackText) => {
        try {
            const defaultMinutes = 30;
            let start = new Date(date);
            // No business-hours restriction; compute end as simple duration offset
            const end = new Date(start.getTime() + defaultMinutes * 60000);
            const taskId = typeof taskOrId === "string" ? taskOrId : taskOrId?.id;
            const effect = String(dropEffect || "").toLowerCase();
            const isCopyDrop = effect.includes("copy");

            // If this was NOT a copy-drop and we dropped an existing task (id), update its start/end on the task service
            if (!isCopyDrop && taskId && todos.find((t) => String(t.id) === String(taskId))) {
                try {
                    const svc = await getTaskService();
                    const existing = todos.find((t) => String(t.id) === String(taskId));
                    // compute duration from existing task if present, otherwise defaultMinutes
                    let durationMs = defaultMinutes * 60000;
                    try {
                        const s0 = new Date(existing.startDate || existing.start_date || existing.date || null);
                        const e0 = new Date(existing.endDate || existing.end_date || existing.date || null);
                        if (!isNaN(s0.getTime()) && !isNaN(e0.getTime())) {
                            durationMs = Math.max(0, e0.getTime() - s0.getTime());
                        }
                    } catch (_) {}

                    const newEnd = new Date(start.getTime() + durationMs);
                    const toISO = (d) => d.toISOString();
                    const patch = { startDate: toISO(start), endDate: toISO(newEnd) };
                    const updated = await svc.update(taskId, patch);
                    // Update local todos
                    setTodos((prev) => prev.map((t) => (String(t.id) === String(taskId) ? updated : t)));
                    addToast({ title: "Task updated", description: `Moved to ${formatDate(start)} ${formatTime(`${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}`)}`, variant: "success" });
                } catch (err) {
                    console.warn("Failed to update task from drop", err);
                    addToast({ title: "Failed to update task", description: String(err?.message || err), variant: "error" });
                }
                return;
            }

            // Otherwise create a calendar appointment (existing behavior / copy-from-list)
            // Resolve the task first - look it up in todos if we only have an id
            let resolvedTask = null;
            if (typeof taskOrId === "string") {
                try {
                    resolvedTask = (todos || []).find((t) => String(t.id) === String(taskOrId));
                } catch (_) {
                    resolvedTask = null;
                }
            } else if (typeof taskOrId === "object") {
                resolvedTask = taskOrId;
            }

            // Extract title from resolved task, handling both 'title' and 'name' fields
            // Use fallbackText if task resolution failed
            let title = "Task";
            if (resolvedTask) {
                title = resolvedTask.title || resolvedTask.name || "Task";
            } else if (fallbackText) {
                title = fallbackText;
            }
            
            const description = (resolvedTask && resolvedTask.description) || "";
            const descriptionValue = description && description.trim() !== "" ? description.trim() : null;
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

            const keyAreaId = (resolvedTask && (resolvedTask.keyAreaId || resolvedTask.key_area_id || resolvedTask.keyArea)) || null;
            const goalId = (resolvedTask && (resolvedTask.goalId || resolvedTask.goal_id || resolvedTask.goal)) || null;
            const assignee = (resolvedTask && (resolvedTask.assignee || resolvedTask.assigneeId || resolvedTask.assignee_name || resolvedTask.assigned_to)) || null;

            // Build payload with only valid, non-empty values
            const payload = {
                title,
                start: toOffsetISO(start),
                end: toOffsetISO(end),
                timezone: tz,
            };
            
            // Only add description if it has a value
            if (descriptionValue) {
                payload.description = descriptionValue;
            }
            
            // Only include goalId and keyAreaId if they are valid UUIDs
            if (goalId && String(goalId).trim() !== '' && String(goalId).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                payload.goalId = String(goalId);
            }
            if (keyAreaId && String(keyAreaId).trim() !== '' && String(keyAreaId).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                payload.keyAreaId = String(keyAreaId);
            }
            if (import.meta.env.DEV) {
                try { console.debug('Creating appointment payload', payload); } catch (_) {}
            }
            // Show progress while creating appointment
            try { setLoading(true); } catch (_) {}
            const created = await calendarService.createAppointment(payload);
            if (import.meta.env.DEV) {
                try { console.debug('Appointment created (server response)', created); } catch (_) {}
            }
            // Attach client-side assignee info so the appointment modal can prefill
            // the Assignee select immediately after creation (this is client-only
            // metadata; backend does not currently persist assignee for appointments).
            const createdWithMeta = { ...(created || {}), ...(assignee ? { assignee } : {}) };
            if (import.meta.env.DEV) {
                try { console.debug('Appointment merged client-side meta', createdWithMeta); } catch (_) {}
            }
            // Optimistic merge: add the created appointment to the calendar but
            // do NOT open the editor automatically. The user can click the
            // event to edit it when they're ready.
            setEvents((prev) => [...prev, createdWithMeta]);
            addToast({
                title: "Event created",
                description: `${title} at ${formatTime(`${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}`)} — click the event to edit`,
                variant: "success",
            });
            try { setLoading(false); } catch (_) {}
        } catch (err) {
            console.warn("Failed to create calendar event from drop", err);
            // Try to extract server-provided details for better user feedback
            const serverData = err?.response?.data;
            let details = String(err?.message || err);
            try {
                if (serverData) {
                    const serverMsg = serverData.message || serverData.error || serverData.detail || JSON.stringify(serverData);
                    details = String(serverMsg);
                }
            } catch (_) {}
            addToast({ title: "Failed to create event", description: details, variant: "error" });
        } finally {
            try { setLoading(false); } catch (_) {}
        }
    };

    // Drag-and-drop: create an appointment for an activity
    const handleActivityDrop = async (activityOrObj, date, dropEffect, fallbackText) => {
        try {
            const defaultMinutes = 30;
            let start = new Date(date);
            // No business-hours restriction; compute end as simple duration offset
            const end = new Date(start.getTime() + defaultMinutes * 60000);

            // If an existing activity id was dropped, update its date
            const activityId = typeof activityOrObj === "string" ? activityOrObj : activityOrObj?.id;
            const effect = String(dropEffect || "").toLowerCase();
            const isCopyDrop = effect.includes("copy");
            if (!isCopyDrop && activityId && (Array.isArray(weekActivities) ? weekActivities : []).some((a) => String(a.id) === String(activityId))) {
                try {
                    const svc = await getActivityService();
                    const toISO = (d) => d.toISOString();
                    // activities may use `date` or `startDate` fields; prefer `date`
                    const payload = { date: toISO(start) };
                    const updated = await svc.update(activityId, payload);
                    // update local weekActivities and unattachedActivities if present
                    setWeekActivities((prev) => prev.map((a) => (String(a.id) === String(activityId) ? updated : a)));
                    setUnattachedActivities((prev) => prev.map((a) => (String(a.id) === String(activityId) ? updated : a)));
                    addToast({ title: "Activity updated", description: `Moved to ${formatDate(start)} ${formatTime(`${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}`)}`, variant: "success" });
                } catch (err) {
                    console.warn("Failed to update activity from drop", err);
                    addToast({ title: "Failed to update activity", description: String(err?.message || err), variant: "error" });
                }
                return;
            }

            // Resolve the activity first - look it up if we only have an id
            let resolvedActivity = null;
            if (typeof activityOrObj === "string") {
                try {
                    resolvedActivity = (weekActivities || []).find((a) => String(a.id) === String(activityOrObj)) ||
                        (unattachedActivities || []).find((a) => String(a.id) === String(activityOrObj)) ||
                        null;
                } catch (_) {
                    resolvedActivity = null;
                }
            } else if (typeof activityOrObj === "object") {
                resolvedActivity = activityOrObj;
            }

            // Extract title from resolved activity, handling both 'text' and 'title' fields
            // Use fallbackText if activity resolution failed
            let title = "Activity";
            if (resolvedActivity) {
                title = resolvedActivity.text || resolvedActivity.title || resolvedActivity.name || "Activity";
            } else if (fallbackText) {
                title = fallbackText;
            }
            
            const description = (resolvedActivity && resolvedActivity.description) || "";
            const descriptionValue = description && description.trim() !== "" ? description.trim() : null;
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

            let keyAreaId = null;
            let goalId = null;
            let assignee = null;
            if (resolvedActivity) {
                keyAreaId = resolvedActivity.keyAreaId || resolvedActivity.key_area_id || resolvedActivity.keyArea || null;
                goalId = resolvedActivity.goalId || resolvedActivity.goal_id || resolvedActivity.goal || null;
                assignee = resolvedActivity.assignee || resolvedActivity.assigneeId || resolvedActivity.assignee_name || resolvedActivity.assigned_to || null;
                // If activity doesn't have keyArea/goal, try parent task
                if ((!keyAreaId || !goalId) && (resolvedActivity.taskId || resolvedActivity.task_id || resolvedActivity.task)) {
                    try {
                        const parentId = resolvedActivity.taskId || resolvedActivity.task_id || resolvedActivity.task;
                        const parent = (todos || []).find((t) => String(t.id) === String(parentId));
                        if (parent) {
                            keyAreaId = keyAreaId || parent.keyAreaId || parent.key_area_id || null;
                            goalId = goalId || parent.goalId || parent.goal_id || parent.goal || null;
                            assignee = assignee || parent.assignee || parent.assigneeId || parent.assignee_name || parent.assigned_to || null;
                        }
                    } catch (_) {}
                }
            }

            // Build payload with only valid, non-empty values
            const payload = {
                title,
                start: toOffsetISO(start),
                end: toOffsetISO(end),
                timezone: tz,
            };
            
            // Only add description if it has a value
            if (descriptionValue) {
                payload.description = descriptionValue;
            }
            
            // Only include goalId and keyAreaId if they are valid UUIDs
            if (goalId && String(goalId).trim() !== '' && String(goalId).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                payload.goalId = String(goalId);
            }
            if (keyAreaId && String(keyAreaId).trim() !== '' && String(keyAreaId).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                payload.keyAreaId = String(keyAreaId);
            }
            
            if (import.meta.env.DEV) {
                try { console.debug('Creating appointment payload', payload); } catch (_) {}
            }
            const created = await calendarService.createAppointment(payload);
            const createdWithMeta = { ...(created || {}), ...(assignee ? { assignee } : {}) };
            setEvents((prev) => [...prev, createdWithMeta]);
            // Do not open the editor right away; let the user click the event to edit.
            addToast({ title: "Event created", description: `${title} at ${formatTime(`${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}`)} — click the event to edit`, variant: "success" });
        } catch (err) {
            console.warn("Failed to create calendar event from activity drop", err);
            const serverData = err?.response?.data;
            let details = String(err?.message || err);
            try {
                if (serverData) {
                    const serverMsg = serverData.message || serverData.error || serverData.detail || JSON.stringify(serverData);
                    details = String(serverMsg);
                }
            } catch (_) {}
            addToast({ title: "Failed to create event", description: details, variant: "error" });
        }
    };

    // Event modal logic
    // Event modal logic
    const openModal = (event = null, action = null, meta = null) => {
        if (import.meta.env.DEV) {
            try { console.debug('openModal called with event', event, 'action', action); } catch (_) {}
        }
        if (action === 'delete') {
            handleDeleteEvent(event);
        } else if (action === 'edit' || action === 'edit-month') {
            setSelectedEvent(event);
            setModalOpen(true);
            // mark source for month-specific behavior
            if (action === 'edit-month') setModalOpenSource('month');
            else setModalOpenSource(null);
        } else {
            // Default behavior (legacy support)
            setSelectedEvent(event);
            setModalOpen(true);
        }
    };

    // Delete popover state and handler (triggered from DayView/WeekView delete icon)
    const [deletePopoverVisible, setDeletePopoverVisible] = useState(false);
    const [deletePopoverPos, setDeletePopoverPos] = useState({ x: 0, y: 0 });
    const [deleteTargetEvent, setDeleteTargetEvent] = useState(null);
    const [deleteScopeChoice, setDeleteScopeChoice] = useState('occurrence');
    const [deleting, setDeleting] = useState(false);
    // Simple confirm for non-recurring deletes (custom top-center UI)
    const [simpleConfirmVisible, setSimpleConfirmVisible] = useState(false);
    const [simpleConfirmTarget, setSimpleConfirmTarget] = useState(null);
    const [simpleDeleting, setSimpleDeleting] = useState(false);

    // Update (drag/resize) popover for recurring appointments
    const [updatePopoverVisible, setUpdatePopoverVisible] = useState(false);
    const [updateScopeChoice, setUpdateScopeChoice] = useState('occurrence');
    const [updateTargetEvent, setUpdateTargetEvent] = useState(null);
    const [updatePending, setUpdatePending] = useState({ start: null, end: null });

    const handleDeleteRequest = (event, mouseEvent) => {
        if (!event) return;

        // If an appointment modal is open (for example the month edit modal), close it
        // when we open the delete confirmation/popover so the UI doesn't show both.
        try {
            if (modalOpen) {
                setModalOpen(false);
                setSelectedEvent(null);
                setModalOpenSource(null);
            }
            if (appointmentModalOpen) {
                setAppointmentModalOpen(false);
                setAppointmentInitialStart(null);
            }
        } catch (e) {
            // swallow any state errors
        }

        // If the appointment is NOT recurring, show the custom top-center confirmation UI
        // Use a robust check similar to the modal: recurrence info may be present
        // under several keys (recurringPattern, recurrence, seriesId) or the UI
        // may use generated ids like `<base>_<iso>` or `ex_<uuid>` for exceptions.
        const isRecurring = Boolean(
            event && (
                event.recurringPattern ||
                event.recurrence ||
                event.seriesId ||
                event.occurrenceStart ||
                (typeof event.id === 'string' && (event.id.includes('_') || event.id.startsWith('ex_')))
            )
        );
        if (!isRecurring) {
            setSimpleConfirmTarget(event);
            setSimpleConfirmVisible(true);
            return;
        }

        // For recurring appointments, show the scoped delete popover
        // position popover near click; use clientX/clientY (still tracked if needed)
        const x = (mouseEvent && mouseEvent.clientX) || (window.innerWidth / 2);
        const y = (mouseEvent && mouseEvent.clientY) || (window.innerHeight / 2);
        setDeletePopoverPos({ x, y });
        setDeleteTargetEvent(event);
        setDeleteScopeChoice('occurrence');
        setDeletePopoverVisible(true);
    };

    const confirmSimpleDelete = async () => {
        const event = simpleConfirmTarget;
        if (!event || !event.id) return;
        try {
            setSimpleDeleting(true);
            if (event.kind === 'appointment') {
                await calendarService.deleteAppointment(event.id);
            } else {
                await calendarService.deleteEvent(event.id);
            }
            // Remove any matching representations (exact id or series/occurrence)
            setEvents((prev) => prev.filter((e) => {
                try {
                    if (e.id === event.id) return false;
                    if (event.seriesId && e.seriesId === event.seriesId) return false;
                    if (event.start && e.occurrenceStart === event.start) return false;
                    if (event.seriesId && event.start && typeof e.id === 'string' && e.id === `${event.seriesId}_${event.start}`) return false;
                } catch (__) {}
                return true;
            }));
            addToast({ title: 'Appointment deleted', variant: 'success' });
            setSimpleConfirmVisible(false);
            setSimpleConfirmTarget(null);
        } catch (err) {
            console.error('Delete error:', err);
            addToast({ title: 'Failed to delete appointment', description: String(err?.message || err), variant: 'error' });
        } finally {
            setSimpleDeleting(false);
        }
    };

    const cancelSimpleDelete = () => {
        setSimpleConfirmVisible(false);
        setSimpleConfirmTarget(null);
    };

    const confirmDeleteFromPopover = async () => {
        const event = deleteTargetEvent;
        if (!event || !event.id) return;
        try {
            setDeleting(true);
            if (event.kind === 'appointment') {
                const opts = {};
                if (deleteScopeChoice === 'occurrence') {
                    opts.editScope = 'occurrence';
                    opts.occurrenceStart = event.start;
                } else if (deleteScopeChoice === 'future') {
                    opts.editScope = 'future';
                    opts.occurrenceStart = event.start;
                } else if (deleteScopeChoice === 'series') {
                    opts.editScope = 'series';
                }
                await calendarService.deleteAppointment(event.id, opts);
            } else {
                await calendarService.deleteEvent(event.id);
            }
            // Remove matching representations from local state. The server may
            // delete an exception row (ex_<uuid>) while the UI stores a generated
            // occurrence id (`<seriesId>_<occurrenceStart>`). Remove both exact
            // id matches and matches by seriesId+occurrenceStart when available.
            setEvents((prev) => prev.filter((e) => {
                try {
                    // If series delete, remove all with same seriesId
                    if (deleteScopeChoice === 'series' && event.seriesId && e.seriesId === event.seriesId) return false;
                    // If occurrence/future, remove occurrence matches
                    if ((deleteScopeChoice === 'occurrence' || deleteScopeChoice === 'future') && event.seriesId && event.start) {
                        if (e.seriesId === event.seriesId && (e.occurrenceStart === event.start || e.start === event.start)) return false;
                        if (typeof e.id === 'string' && e.id === `${event.seriesId}_${event.start}`) return false;
                    }
                    // Remove exact id match (covers non-recurring deletes)
                    if (e.id === event.id) return false;
                } catch (__) {}
                return true;
            }));
            addToast({ title: 'Appointment deleted', variant: 'success' });
            setDeletePopoverVisible(false);
        } catch (err) {
            console.error('Delete error:', err);
            addToast({ title: 'Failed to delete appointment', description: String(err?.message || err), variant: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    const confirmUpdateFromPopover = async () => {
        const event = updateTargetEvent;
        if (!event || !event.id) return;
        try {
            const opts = {};
            if (updateScopeChoice === 'occurrence') {
                opts.editScope = 'occurrence';
                opts.occurrenceStart = event.start;
            } else if (updateScopeChoice === 'future') {
                opts.editScope = 'future';
                opts.occurrenceStart = event.start;
            } else if (updateScopeChoice === 'series') {
                opts.editScope = 'series';
            }

            // Combine pending start/end with opts and send
            const payload = {
                start: updatePending.start,
                end: updatePending.end,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                ...opts,
            };

            const updated = await calendarService.updateAppointment(event.id, payload);
            setEvents((prev) => {
                // Remove the original occurrence representation if the backend
                // returned a new exception row for the same series/occurrence.
                const filtered = prev.filter((e) => {
                    try {
                        if (updated.seriesId && updated.occurrenceStart) {
                            if (e.seriesId === updated.seriesId && (e.occurrenceStart === updated.occurrenceStart || e.start === updated.occurrenceStart)) {
                                return false;
                            }
                            if (typeof e.id === 'string' && e.id === `${updated.seriesId}_${updated.occurrenceStart}`) {
                                return false;
                            }
                        }
                        if (event && event.id && event.id !== updated.id && e.id === event.id) {
                            return false;
                        }
                    } catch (__) {}
                    return true;
                });

                const found = filtered.some((e) => e.id === updated.id);
                return found ? filtered.map((e) => (e.id === updated.id ? updated : e)) : [...filtered, updated];
            });
            addToast({ title: 'Appointment updated', variant: 'success' });
            setUpdatePopoverVisible(false);
            setUpdateTargetEvent(null);
        } catch (err) {
            console.error('Update error:', err);
            let details = String(err?.message || err);
            try {
                const respData = err?.response?.data;
                if (respData) {
                    if (typeof respData === 'string') details = respData;
                    else if (Array.isArray(respData?.message)) details = respData.message.join('; ');
                    else if (respData?.message) details = String(respData.message);
                    else details = JSON.stringify(respData);
                }
            } catch (_) {}
            addToast({ title: 'Failed to update appointment', description: details, variant: 'error' });
        }
    };

    const handleDeleteEvent = async (event) => {
        // Delegate to the popover flow so the user is presented with scoped delete options
        // instead of browser prompts. The popover will position itself; pass null for mouseEvent
        // when we don't have a click position.
        if (!event) return;
        handleDeleteRequest(event, null);
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
                const svc = await getTaskService();
                task = await svc.get(taskOrId);
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
            // include both camelCase and snake_case shapes so modals can read either
            startDate: task.startDate || task.start_date || null,
            start_date: task.startDate || task.start_date || null,
            date: toDateStr(task.startDate || task.dueDate || task.endDate),
            time: toTimeStr(task.startDate),
            dueDate: toDateStr(task.dueDate || task.deadline),
            deadline: toDateStr(task.dueDate || task.deadline),
            endDate: toDateStr(task.endDate),
            end_date: task.endDate || task.end_date || null,
            priority: task.priority || task.priority_level || "medium",
            duration: task.duration || task.duration_minutes || null,
            list_index: task.list_index || task.listIndex || task.list || 1,
            list: task.list_index || task.listIndex || task.list || 1,
            goal: task.goal || task.goal_id || task.goalId || null,
            goal_id: task.goal || task.goal_id || task.goalId || null,
            key_area_id: task.keyAreaId || task.key_area_id || null,
            assignee: task.assignee || "",
        };
        // Ensure tasksList contains the task for this activity so the Task dropdown
        // in EditActivityModal can show the current selection. Load the single task
        // if it's not already present in tasksList.
        try {
            const activityTaskId = item.taskId || item.task_id || null;
            if (activityTaskId) {
                const exists = (tasksList || []).some((t) => String(t.id) === String(activityTaskId));
                if (!exists) {
                    try {
                        const tsvc = await getTaskService();
                        const fetched = await tsvc.get(String(activityTaskId));
                        if (fetched && fetched.id) {
                            setTasksList((prev) => {
                                const copy = Array.isArray(prev) ? prev.slice() : [];
                                // prepend so it's available in the dropdown
                                copy.unshift(fetched);
                                return copy;
                            });
                        }
                    } catch (e) {
                        // ignore fetch failure; dropdown will simply not include the task
                    }
                }
            }
        } catch (e) {
            // non-fatal
        }
        // Ensure the activity's task is present in tasksList so the Task select
        // in the edit modal can pre-select the correct task.
        try {
            const activityTaskId = item.taskId || item.task_id || null;
            if (activityTaskId) {
                const exists = (tasksList || []).some((t) => String(t.id) === String(activityTaskId));
                if (!exists) {
                    try {
                        const tsvc = await getTaskService();
                        const fetched = await tsvc.get(String(activityTaskId));
                        if (fetched && fetched.id) {
                            setTasksList((prev) => {
                                const copy = Array.isArray(prev) ? prev.slice() : [];
                                // prepend to make it immediately available
                                copy.unshift(fetched);
                                return copy;
                            });
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            }
        } catch (e) {
            // non-fatal
        }

        // Debug info to help trace prefill issues in the browser console
        try { console.debug('Opening EditActivityModal with item', item, 'tasksList snapshot', tasksList); } catch (__) {}

        setEditItem(item);
        setEditModalOpen(true);
    };

    // Open edit modal for an activity
    const openEditActivity = async (activityOrId) => {
        if (!activityOrId) return;
        let activity = activityOrId;
        try {
            if (typeof activityOrId === "string") {
                const svc = await getActivityService();
                activity = await svc.get(activityOrId);
            }
        } catch (e) {
            addToast({ title: "Activity not found", variant: "error" });
            return;
        }
            try { console.debug('[Calendar] openEditActivity - resolved activity (raw)', activityOrId, 'fetched:', activity); } catch (__) {}
            // Ensure the activity's task is present in tasksList so the Task select
            // in the edit modal can pre-select the correct task and we can fall back
            // to the task's assignee when the activity itself has no assignee.
            try {
                const activityTaskId = activity?.taskId || activity?.task_id || activity?.task || null;
                if (activityTaskId) {
                    const exists = (tasksList || []).some((t) => String(t.id) === String(activityTaskId));
                    if (!exists) {
                        try {
                            const tsvc = await getTaskService();
                            const fetched = await tsvc.get(String(activityTaskId));
                            if (fetched && fetched.id) {
                                setTasksList((prev) => {
                                    const copy = Array.isArray(prev) ? prev.slice() : [];
                                    // prepend so it's available in the dropdown
                                    copy.unshift(fetched);
                                    return copy;
                                });
                                // also merge into localTasks in modal via props when it opens
                            }
                        } catch (e) {
                            // ignore fetch failure
                        }
                    }
                }
            } catch (e) {}

            // Normalize activity so we get consistent aliases (assignee, start_date, end_date, etc.)
            const normActivity = normalizeActivity(activity || {});
            try { console.debug('[Calendar] openEditActivity - normalized activity', normActivity); } catch (__) {}

            const item = {
            id: activity.id,
            type: "activity",
                taskId: normActivity.taskId || normActivity.task_id || normActivity.task || "",
                text: normActivity.text || normActivity.title || normActivity.activity_name || "",
                title: normActivity.text || normActivity.title || normActivity.activity_name || "",
                description: normActivity.description || normActivity.notes || normActivity.note || '',
                // use normalized date aliases
                start_date: normActivity.start_date || normActivity.startDate || normActivity.date_start || '',
                end_date: normActivity.end_date || normActivity.endDate || normActivity.date_end || '',
                deadline: normActivity.deadline || normActivity.dueDate || normActivity.due_date || '',
                duration: normActivity.duration || normActivity.duration_minutes || '',
                key_area_id: normActivity.key_area_id || normActivity.keyAreaId || normActivity.keyArea || '',
                list: normActivity.list || normActivity.list_index || normActivity.listIndex || normActivity.parent_list || normActivity.parentList || normActivity.list_number || undefined,
                assignee: normActivity.assignee || normActivity.responsible || normActivity.owner || normActivity.assigned_to || normActivity.assignee_name || '',
                priority: normActivity.priority ?? normActivity.priority_level ?? undefined,
                goal: normActivity.goal || normActivity.goal_id || normActivity.goalId || undefined,
                completed: normActivity.completed || false,
        };
        setEditItem(item);
        setEditModalOpen(true);
    };

    // Handler: Mark task as complete
    const handleTaskComplete = async (task) => {
        if (!task || !task.id) return;
        try {
            const svc = await getTaskService();
            await svc.update(task.id, { status: 'done' });
            // Update local state
            setTodos((prev) => prev.filter((t) => String(t.id) !== String(task.id)));
            addToast({ title: "Task completed", variant: "success" });
        } catch (err) {
            console.error("Failed to complete task", err);
            addToast({ title: "Failed to complete task", description: String(err?.message || err), variant: "error" });
        }
    };

    // Handler: Delete task
    const handleTaskDelete = async (task) => {
        if (!task || !task.id) return;
        if (!confirm(`Delete task "${task.title || task.name || 'Untitled'}"?`)) return;
        try {
            const svc = await getTaskService();
            await svc.remove(task.id);
            // Update local state
            setTodos((prev) => prev.filter((t) => String(t.id) !== String(task.id)));
            addToast({ title: "Task deleted", variant: "success" });
        } catch (err) {
            console.error("Failed to delete task", err);
            addToast({ title: "Failed to delete task", description: String(err?.message || err), variant: "error" });
        }
    };

    // Handler: Mark activity as complete
    const handleActivityComplete = async (activity) => {
        if (!activity || !activity.id) return;
        try {
            const svc = await getActivityService();
            // Set completed, status, and completionDate for compatibility with key areas table
            await svc.update(activity.id, { 
                completed: true,
                status: 'done',
                completionDate: new Date().toISOString()
            });
            // Update local state
            setWeekActivities((prev) => prev.filter((a) => String(a.id) !== String(activity.id)));
            setUnattachedActivities((prev) => prev.filter((a) => String(a.id) !== String(activity.id)));
            addToast({ title: "Activity completed", variant: "success" });
        } catch (err) {
            console.error("Failed to complete activity", err);
            addToast({ title: "Failed to complete activity", description: String(err?.message || err), variant: "error" });
        }
    };

    // Handler: Delete activity
    const handleActivityDelete = async (activity) => {
        if (!activity || !activity.id) return;
        if (!confirm(`Delete activity "${activity.text || activity.title || 'Untitled'}"?`)) return;
        try {
            const svc = await getActivityService();
            await svc.remove(activity.id);
            // Update local state
            setWeekActivities((prev) => prev.filter((a) => String(a.id) !== String(activity.id)));
            setUnattachedActivities((prev) => prev.filter((a) => String(a.id) !== String(activity.id)));
            addToast({ title: "Activity deleted", variant: "success" });
        } catch (err) {
            console.error("Failed to delete activity", err);
            addToast({ title: "Failed to delete activity", description: String(err?.message || err), variant: "error" });
        }
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
                {
                    const svc = await getActivityService();
                    await svc.create({ text: form.text || form.title, taskId: form.taskId || null });
                }
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
                const taskSvc = await getTaskService();
                const createdTask = await taskSvc.create({
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
                    // No business-hours restriction; default event length is 60 minutes
                    const end = new Date(start.getTime() + 60 * 60000);
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
    const handleQuickCreate = (date, opts = {}) => {
        const start = new Date(date);
        const isAllDay = Boolean(opts && opts.allDay);
        if (isAllDay) {
            // normalize to start of day
            start.setHours(0, 0, 0, 0);
        }
        setAppointmentInitialStart(start);
        setAppointmentInitialAllDay(isAllDay);
        setAppointmentModalOpen(true);
    };

    // Move event (drag existing event into a new slot)
    const handleEventMove = async (eventId, newStartDate, newEndDate) => {
        try {
            // Determine end time: use provided newEndDate (resize) or default 30 minutes (move)
            const targetEnd = newEndDate ? newEndDate : new Date(newStartDate.getTime() + 30 * 60 * 1000);
            // Include timezone for appointment updates to match create flow and
            // ensure server-side business-hours checks use the correct zone.
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

            // Format datetimes using local-offset ISO formatter (same as create flow)
            const toOffsetISO = (d) => {
                try {
                    const pad = (n) => String(n).padStart(2, "0");
                    const y = d.getFullYear();
                    const m = pad(d.getMonth() + 1);
                    const day = pad(d.getDate());
                    const hh = pad(d.getHours());
                    const mm = pad(d.getMinutes());
                    const ss = pad(d.getSeconds());
                    const off = -d.getTimezoneOffset();
                    const sign = off >= 0 ? "+" : "-";
                    const oh = pad(Math.floor(Math.abs(off) / 60));
                    const om = pad(Math.abs(off) % 60);
                    return `${y}-${m}-${day}T${hh}:${mm}:${ss}${sign}${oh}:${om}`;
                } catch (__) {
                    return d.toISOString();
                }
            };

            const payload = { start: toOffsetISO(newStartDate), end: toOffsetISO(targetEnd), timezone: tz };
            // Decide endpoint based on event kind in current state
            const current = events.find((e) => e.id === eventId);
            const isAppointment = current?.kind === "appointment";

            // If this is a recurring appointment, prompt for edit scope (occurrence/future/series)
            const isRecurring = Boolean(current?.recurringPattern || current?.recurrence || current?.seriesId);
            if (isAppointment && isRecurring) {
                // open update popover to ask scope before applying
                setUpdateTargetEvent(current);
                setUpdatePending({ start: toOffsetISO(newStartDate), end: toOffsetISO(targetEnd) });
                setUpdateScopeChoice('occurrence');
                setUpdatePopoverVisible(true);
                return;
            }

            const updated = await (isAppointment
                ? calendarService.updateAppointment(eventId, payload)
                : calendarService.updateEvent(eventId, payload));
            setEvents((prev) => {
                // Remove prior representation of the occurrence if the server
                // returned a new exception id for the same series/occurrence.
                const filtered = prev.filter((e) => {
                    try {
                        if (updated.seriesId && updated.occurrenceStart) {
                            if (e.seriesId === updated.seriesId && (e.occurrenceStart === updated.occurrenceStart || e.start === updated.occurrenceStart)) {
                                return false;
                            }
                            if (typeof e.id === 'string' && e.id === `${updated.seriesId}_${updated.occurrenceStart}`) {
                                return false;
                            }
                        }
                        if (current && current.id && current.id !== updated.id && e.id === current.id) {
                            return false;
                        }
                    } catch (__) {}
                    return true;
                });

                const found = filtered.some((e) => e.id === updated.id);
                return found ? filtered.map((e) => (e.id === updated.id ? updated : e)) : [...filtered, updated];
            });
            addToast({
                title: "Event updated",
                description: `Moved to ${formatDate(newStartDate)} ${formatTime(`${String(newStartDate.getHours()).padStart(2,'0')}:${String(newStartDate.getMinutes()).padStart(2,'0')}`)}${targetEnd ? ` - ${formatTime(`${String(targetEnd.getHours()).padStart(2,'0')}:${String(targetEnd.getMinutes()).padStart(2,'0')}`)}` : ""}`,
                variant: "success",
            });
        } catch (err) {
            // Try to extract meaningful server error details (validation messages)
            console.warn("Failed to move event", err);
            let details = String(err?.message || err);
            try {
                const respData = err?.response?.data;
                if (respData) {
                    // backend usually returns { statusCode, message, error }
                    if (typeof respData === 'string') details = respData;
                    else if (Array.isArray(respData?.message)) details = respData.message.join('; ');
                    else if (respData?.message) details = String(respData.message);
                    else details = JSON.stringify(respData);
                }
            } catch (_) {}
            addToast({ title: "Failed to update event", description: details, variant: "error" });
        }
    };

    // Shift current date depending on active view
    const shiftDate = (delta) => {
        // Backwards-compatible: delta can be a number (meaning shift by current view units)
        // or an object like { months: n } to explicitly shift by months regardless of view.
        const d = new Date(currentDate);

        if (typeof delta === "object" && delta !== null) {
            if (typeof delta.months === "number") {
                d.setMonth(d.getMonth() + delta.months);
                setCurrentDate(d);
                return;
            }
            if (typeof delta.days === "number") {
                d.setDate(d.getDate() + delta.days);
                setCurrentDate(d);
                return;
            }
            // unknown object shape — fallthrough to numeric behavior if possible
            delta = Number(delta) || 0;
        }

        // numeric delta: keep previous behavior (shift by unit according to active view)
        switch (view) {
            case "day":
                d.setDate(d.getDate() + delta);
                break;
            case "week":
                d.setDate(d.getDate() + (workWeek ? 5 * delta : 7 * delta));
                break;
            case "month":
                d.setMonth(d.getMonth() + delta);
                break;
            case "quarter":
                // Treat numeric deltas as single-month steps for the quarter view
                // so navigation (both view-local and global header) scrolls the
                // 3-month window by one month at a time (Jan-Mar -> Feb-Apr).
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
        const fmtDay = (dt, opts = {}) => formatDate(dt, { includeWeekday: true, ...opts });
        if (view === "day") {
            return fmtDay(d);
        }
        if (view === "week") {
            const weekStart = new Date(d);
            weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday
            const weekEnd = new Date(weekStart);
            const daysCount = workWeek ? 5 : 7;
            weekEnd.setDate(weekEnd.getDate() + (daysCount - 1));
            const startStr = formatDate(weekStart);
            const endStr = formatDate(weekEnd);
            return `${startStr} — ${endStr}`;
        }
        if (view === "month") {
            return formatDate(d, { longMonth: true });
        }
        if (view === "quarter") {
            const q = Math.floor(d.getMonth() / 3) + 1;
            return `Q${q} ${d.getFullYear()}`;
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

    // Close delete popover when clicking outside of it
    React.useEffect(() => {
        function handleOutside(e) {
            try {
                if (!deletePopoverVisible) return;
                const root = deletePopoverRef.current;
                if (!root) return;
                if (!root.contains(e.target)) {
                    setDeletePopoverVisible(false);
                }
            } catch (__) {}
        }
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [deletePopoverVisible]);

    // Close simple top-center confirm when clicking outside it
    React.useEffect(() => {
        function handleOutsideSimple(e) {
            try {
                if (!simpleConfirmVisible) return;
                const root = simpleConfirmRef.current;
                if (!root) return;
                if (!root.contains(e.target)) {
                    setSimpleConfirmVisible(false);
                    setSimpleConfirmTarget(null);
                }
            } catch (__) {}
        }
        document.addEventListener('mousedown', handleOutsideSimple);
        return () => document.removeEventListener('mousedown', handleOutsideSimple);
    }, [simpleConfirmVisible]);

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
            const daysCount = workWeek ? 5 : 7;
            end.setDate(start.getDate() + (daysCount - 1));
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
            // Default to current month for any fallback view
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
        <div className="w-full h-screen flex flex-col">
            {/* Unified calendar card */}
            <div className="bg-white border border-blue-200 rounded-lg shadow-sm p-3 flex flex-col flex-1 overflow-hidden">
                {/* Controls moved into each view header per request */}
                {/* Each view renders its own navigation header */}

                {/* New Calendar Elephant Task Input */}
                {(() => {
                    const { dateStart, dateEnd } = getCurrentViewDateRange();
                    return (
                        <div className="mb-3 flex-shrink-0">
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
                {/* Active view content - flex-1 to fill available space */}
                {view === "quarter" && (
                    <div className="flex-1 overflow-hidden">
                    <QuarterView
                        currentDate={currentDate}
                        onShiftDate={shiftDate}
                        onSetDate={setCurrentDate}
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
                    </div>
                )}
                {view === "month" && (
                    <div className="flex-1 overflow-hidden">
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
                        onEventClick={(ev, action) => openModal(ev, action)}
                        onTaskClick={openEditTask}
                        onTaskDrop={handleTaskDrop}
                        onQuickCreate={handleQuickCreate}
                        enableQuickCreate={false}
                    />
                    </div>
                )}
                {view === "week" && (
                    <div className="flex-1 overflow-hidden">
                    <WeekView
                        currentDate={currentDate}
                        onShiftDate={shiftDate}
                        onSetDate={setCurrentDate}
                        onQuickCreate={handleQuickCreate}
                        onAddTaskOrActivity={openAddModal}
                        view={view}
                        onChangeView={setView}
                            workWeek={workWeek}
                            setWorkWeek={setWorkWeek}
                        filterType={filterType}
                        onChangeFilter={setFilterType}
                        events={events.filter((e) => filterType === "all" || e.kind === filterType)}
                        todos={todos}
                        loading={loading}
                        categories={EVENT_CATEGORIES}
                        onTaskDrop={handleTaskDrop}
                        onEventMove={handleEventMove}
                        onEventClick={(ev, action) => (ev?.taskId ? openEditTask(ev.taskId) : openModal(ev, action))}
                        onDeleteRequest={(ev, mouseEvent) => handleDeleteRequest(ev, mouseEvent)}
                        onTaskClick={openEditTask}
                        activities={weekActivities}
                    />
                    </div>
                )}
                {view === "day" && (
                    <div className="flex-1 overflow-hidden">
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
                        unattachedActivities={unattachedActivities}
                        loading={loading}
                        categories={EVENT_CATEGORIES}
                        onTaskDrop={handleTaskDrop}
                        onActivityDrop={handleActivityDrop}
                        onEventMove={handleEventMove}
                        onEventClick={(ev, action) => (ev?.taskId ? openEditTask(ev.taskId) : openModal(ev, action))}
                        onDeleteRequest={(ev, mouseEvent) => handleDeleteRequest(ev, mouseEvent)}
                        onTaskClick={openEditTask}
                        onActivityClick={openEditActivity}
                        onTaskComplete={handleTaskComplete}
                        onTaskEdit={openEditTask}
                        onTaskDelete={handleTaskDelete}
                        onActivityComplete={handleActivityComplete}
                        onActivityEdit={openEditActivity}
                        onActivityDelete={handleActivityDelete}
                        onPlanTomorrow={() => {}}
                    />
                    </div>
                )}
            </div>
            {addModalOpen && (
                addDefaultTab === "activity" ? (
                    <Suspense fallback={<div role="status" aria-live="polite" className="p-4">Loading…</div>}>
                        <CreateActivityModal
                            isOpen={addModalOpen}
                            onCancel={() => setAddModalOpen(false)}
                            initialData={{
                                text: "",
                                // Do NOT auto-fill key area or task when creating from calendar; user should choose explicitly.
                                key_area_id: null,
                                taskId: null,
                            }}
                            tasks={Array.isArray(tasksList) ? tasksList : []}
                            keyAreas={keyAreas}
                            users={usersList}
                            goals={goalsList}
                            availableLists={availableLists}
                            onSave={async (payload) => {
                                try {
                                    const svc = await getActivityService();
                                    // Build a payload that matches CreateActivityDto on the backend.
                                    // The backend uses ValidationPipe with whitelist/forbidNonWhitelisted,
                                    // so sending unknown keys (key_area_id, list, etc.) will cause a 400.
                                    const body = {
                                        text: (payload.text || payload.title || '').trim(),
                                    };
                                    // optional fields mapping
                                    if (payload.taskId || payload.task_id) body.taskId = payload.taskId || payload.task_id;
                                    if (payload.status) body.status = payload.status;
                                    if (payload.priority) body.priority = payload.priority;
                                    if (payload.startDate || payload.start_date) body.startDate = payload.startDate || payload.start_date;
                                    if (payload.endDate || payload.end_date) body.endDate = payload.endDate || payload.end_date;
                                    if (payload.deadline || payload.dueDate || payload.due_date) body.deadline = payload.deadline || payload.dueDate || payload.due_date;
                                    if (payload.goalId || payload.goal || payload.goal_id) body.goalId = payload.goalId || payload.goal || payload.goal_id;
                                    if (typeof payload.completed !== 'undefined') body.completed = Boolean(payload.completed);
                                    if (payload.completionDate) body.completionDate = payload.completionDate;

                                    const created = await svc.create(body);
                                    console.log('Activity created:', created);
                                    // Optimistically refresh activities map for the attached task so UI updates immediately
                                    const createdTaskId = created?.taskId || created?.task_id || body.taskId || body.task_id || null;
                                    if (createdTaskId) {
                                        try {
                                            const list = await svc.list({ taskId: body.taskId });
                                            setActivitiesByTask((prev) => ({
                                                ...prev,
                                                [String(createdTaskId)]: Array.isArray(list) ? list.map(normalizeActivity) : [],
                                            }));
                                        } catch (__) {}
                                    }
                                    // If created activity is not attached to a task, add it to unattachedActivities
                                    if (!createdTaskId) {
                                        try {
                                            setUnattachedActivities((prev) => [normalizeActivity(created || {}), ...prev]);
                                        } catch (__) {}
                                    }
                                    await refreshTodosForRange();
                                    try {
                                        // notify other parts of the app to refresh activity lists
                                        window.dispatchEvent(new CustomEvent('ka-activities-updated', { detail: { refresh: true, taskId: body.taskId || undefined } }));
                                    } catch (__) {}
                                    setAddModalOpen(false);
                                    addToast({ title: 'Activity created successfully', description: 'The activity has been added', variant: 'success' });
                                } catch (e) {
                                    // Axios errors have response objects with useful info
                                    console.error('Failed to create activity', e);
                                    try {
                                        const details = e?.response?.data || e?.toString();
                                        addToast({ title: 'Failed to create activity', description: String(details), variant: 'error' });
                                    } catch (_) {
                                        addToast({ title: 'Failed to create activity', description: String(e?.message || e), variant: 'error' });
                                    }
                                }
                            }}
                        />
                    </Suspense>
                ) : (
                    <Suspense fallback={<div role="status" aria-live="polite" className="p-4">Loading…</div>}>
                        <CreateTaskModal
                            isOpen={addModalOpen}
                            onCancel={() => setAddModalOpen(false)}
                            initialData={{
                                date: (() => {
                                    const d = addDate || new Date();
                                    return d.toISOString().slice(0, 10);
                                })(),
                                time: (() => {
                                    try {
                                        const d = addDate || new Date();
                                        const hh = String(d.getHours()).padStart(2, '0');
                                        const mm = String(d.getMinutes()).padStart(2, '0');
                                        return `${hh}:${mm}`;
                                    } catch { return '09:30'; }
                                })(),
                            }}
                            onSave={async (data) => {
                                // data follows CreateTaskModal payload (title, description, date, time, dueDate, endDate, key_area_id, list_index, ...)
                                try {
                                    const svc = await getTaskService();
                                    const title = (data.title || data.name || '').trim();
                                    if (!title) {
                                        addToast({ title: 'Task title required', variant: 'error' });
                                        return;
                                    }
                                    const toIsoDateTime = (dateStr, timeStr) => {
                                        try {
                                            if (!dateStr) return null;
                                            if (timeStr) return new Date(`${dateStr}T${timeStr}`).toISOString();
                                            return new Date(dateStr).toISOString();
                                        } catch { return null; }
                                    };
                                    const body = {
                                        title,
                                        description: data.description || data.notes || null,
                                        assignee: data.assignee || null,
                                        startDate: toIsoDateTime(data.date || data.start_date, data.time) || undefined,
                                        endDate: data.endDate || data.end_date ? (new Date(data.endDate || data.end_date)).toISOString() : undefined,
                                        dueDate: data.dueDate || data.deadline ? (new Date(data.dueDate || data.deadline)).toISOString() : undefined,
                                        status: data.status || 'open',
                                        priority: data.priority || 'medium',
                                        keyAreaId: data.key_area_id || data.keyAreaId || undefined,
                                        listIndex: data.listIndex || data.list_index || undefined,
                                    };
                                    const createdTask = await svc.create(body);
                                    addToast({ title: 'Task added', variant: 'success' });

                                    // If modal provided a date+time, create a calendar event for this task
                                    try {
                                        if (data.date && data.time) {
                                            let start = new Date(`${data.date}T${data.time}`);
                                            // No business-hours restriction; default event length is 60 minutes
                                            const end = new Date(start.getTime() + 60 * 60000);
                                            const ev = await calendarService.createEvent({
                                                title: createdTask.title,
                                                start: start.toISOString(),
                                                end: end.toISOString(),
                                                allDay: false,
                                                taskId: createdTask.id,
                                                keyAreaId: body.keyAreaId || undefined,
                                                kind: 'custom',
                                            });
                                            setEvents((prev) => [...prev, ev]);
                                        }
                                    } catch (e) {
                                        console.warn('Failed to create calendar event for new task', e);
                                    }

                                    await refreshTodosForRange();
                                    setAddModalOpen(false);
                                } catch (e) {
                                    console.error('Failed to create task from calendar modal', e);
                                    addToast({ title: 'Failed to add', description: String(e?.message || e), variant: 'error' });
                                }
                            }}
                        />
                    </Suspense>
                )
            )}
            {appointmentModalOpen && appointmentInitialStart && (
                <AppointmentModal
                    startDate={appointmentInitialStart}
                    allDayDefault={appointmentInitialAllDay}
                    defaultDurationMinutes={30}
                    users={usersList}
                    goals={goalsList}
                    keyAreas={keyAreas}
                    onClose={() => {
                        setAppointmentModalOpen(false);
                        setAppointmentInitialStart(null);
                        setAppointmentInitialAllDay(false);
                    }}
                    onCreated={(created) => {
                        setEvents((prev) => [...prev, created]);
                        addToast({ title: "Appointment created", variant: "success" });
                        setAppointmentModalOpen(false);
                        setAppointmentInitialStart(null);
                        setAppointmentInitialAllDay(false);
                    }}
                />
            )}
            {/* Unified AppointmentModal: also used for editing */}
            {modalOpen && selectedEvent && (
                <AppointmentModal
                    event={selectedEvent}
                    users={usersList}
                    goals={goalsList}
                    keyAreas={keyAreas}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedEvent(null);
                        setModalOpenSource(null);
                    }}
                    onUpdated={(updated) => {
                        if (updated && updated.id) {
                            setEvents((prev) => {
                                // Remove the previous occurrence representation when the
                                // server returned a new exception row (new id). Match by
                                // seriesId + occurrenceStart (preferred) or by the
                                // modal's selectedEvent id as a fallback.
                                const filtered = prev.filter((e) => {
                                    try {
                                        // If updated contains seriesId and occurrenceStart,
                                        // filter out any event that represents that same
                                        // occurrence (either stored as occurrenceStart or
                                        // as a generated id like `${seriesId}_${occurrenceStart}`).
                                        if (updated.seriesId && updated.occurrenceStart) {
                                            if (e.seriesId === updated.seriesId && (e.occurrenceStart === updated.occurrenceStart || e.start === updated.occurrenceStart)) {
                                                return false;
                                            }
                                            if (typeof e.id === 'string' && e.id === `${updated.seriesId}_${updated.occurrenceStart}`) {
                                                return false;
                                            }
                                        }

                                        // If the modal was opened for `selectedEvent`, remove
                                        // that original id when it's different from the
                                        // returned updated.id to avoid duplicate bars.
                                        if (selectedEvent && selectedEvent.id && selectedEvent.id !== updated.id && e.id === selectedEvent.id) {
                                            return false;
                                        }
                                    } catch (__) {}
                                    return true;
                                });

                                const found = filtered.some((e) => e.id === updated.id);
                                return found ? filtered.map((e) => (e.id === updated.id ? updated : e)) : [...filtered, updated];
                            });
                        }
                        setModalOpen(false);
                        setSelectedEvent(null);
                        setModalOpenSource(null);
                        addToast({ title: "Appointment updated", variant: "success" });
                    }}
                    
                    defaultDurationMinutes={30}
                    // Show a delete action when the modal was opened from Month view
                    showDelete={modalOpenSource === 'month'}
                    onDelete={() => { if (selectedEvent) handleDeleteEvent(selectedEvent); }}
                    // Allow modal to directly notify that an item was deleted
                    onDeleted={(deleted) => {
                        // `deleted` may be a string id or an object with details
                        // { id, scope, seriesId, occurrenceStart }
                        setEvents((prev) => {
                            try {
                                const info = typeof deleted === 'string' ? { id: deleted } : (deleted || {});
                                const sid = info.seriesId || (selectedEvent && selectedEvent.seriesId) || null;
                                const occ = info.occurrenceStart || (selectedEvent && selectedEvent.start) || null;
                                const scope = info.scope || null;

                                return prev.filter((e) => {
                                    try {
                                        // If deleting entire series, remove all events with same seriesId
                                        if (scope === 'series' && sid) {
                                            if (e.seriesId === sid) return false;
                                        }
                                        // If deleting occurrence/future, remove matches for the specific occurrence
                                        if ((scope === 'occurrence' || scope === 'future') && sid && occ) {
                                            if (e.seriesId === sid && (e.occurrenceStart === occ || e.start === occ)) return false;
                                            if (typeof e.id === 'string' && e.id === `${sid}_${occ}`) return false;
                                        }
                                        // Always remove any exact id matches
                                        if (info.id && e.id === info.id) return false;
                                    } catch (__) {}
                                    return true;
                                });
                            } catch (__) {
                                return prev;
                            }
                        });
                        setModalOpen(false);
                        setSelectedEvent(null);
                        setModalOpenSource(null);
                        addToast({ title: 'Appointment deleted', variant: 'success' });
                    }}
                />
            )}
            {editModalOpen && editItem && editItem.type === "task" && (
                    <EditTaskModal
                    isOpen={editModalOpen}
                    onCancel={() => {
                        setEditModalOpen(false);
                        setEditItem(null);
                    }}
                    initialData={{
                        id: editItem.id,
                        // provide both snake_case and camelCase keys expected by modal
                        key_area_id: editItem.key_area_id || editItem.keyAreaId || null,
                        keyAreaId: editItem.key_area_id || editItem.keyAreaId || null,
                        title: editItem.title || "",
                        description: editItem.description || "",
                        start_date: editItem.start_date || editItem.startDate || editItem.date || "",
                        startDate: editItem.start_date || editItem.startDate || editItem.date || "",
                        time: editItem.time || "09:00",
                        deadline: editItem.deadline || editItem.dueDate || "",
                        dueDate: editItem.deadline || editItem.dueDate || "",
                        end_date: editItem.end_date || editItem.endDate || "",
                        endDate: editItem.end_date || editItem.endDate || "",
                        list_index: editItem.list_index || editItem.listIndex || editItem.list || 1,
                        list: editItem.list_index || editItem.listIndex || editItem.list || 1,
                        priority: editItem.priority || editItem.priority_level || "medium",
                        duration: editItem.duration || editItem.duration_minutes || "",
                        goal: editItem.goal || editItem.goal_id || editItem.goalId || "",
                        goal_id: editItem.goal || editItem.goal_id || editItem.goalId || "",
                        assignee: editItem.assignee || "",
                        status: editItem.status || "todo",
                    }}
                    keyAreas={keyAreas}
                    users={usersList}
                    goals={goalsList}
                    availableLists={availableLists}
                    onSave={async (payload) => {
                        try {
                            const id = editItem.id;
                            if (!id) return;
                            const patch = {};
                            if (payload.title !== undefined) patch.title = payload.title;
                            if (payload.description !== undefined) patch.description = payload.description;
                            if (payload.assignee !== undefined) patch.assignee = payload.assignee;
                            if (payload.status !== undefined) patch.status = payload.status;
                            if (payload.priority !== undefined) patch.priority = payload.priority;
                            if (payload.date !== undefined || payload.time !== undefined) {
                                try {
                                    if (payload.date && payload.time) patch.startDate = new Date(`${payload.date}T${payload.time}`).toISOString();
                                    else if (payload.date) patch.startDate = new Date(payload.date).toISOString();
                                } catch (e) {}
                            }
                            if (payload.endDate !== undefined || payload.end_date !== undefined) patch.endDate = payload.endDate ? new Date(payload.endDate).toISOString() : null;
                            if (payload.dueDate !== undefined || payload.deadline !== undefined) patch.dueDate = payload.dueDate ? new Date(payload.dueDate).toISOString() : null;
                            if (payload.key_area_id || payload.keyAreaId) patch.keyAreaId = payload.key_area_id || payload.keyAreaId;
                            if (payload.list_index !== undefined || payload.listIndex !== undefined) patch.listIndex = payload.list_index ?? payload.listIndex;

                            if (Object.keys(patch).length > 0) {
                                const svc = await getTaskService();
                                await svc.update(id, patch);
                            }
                            await refreshTodosForRange();
                            setEditModalOpen(false);
                            setEditItem(null);
                            addToast({ title: "Task updated", variant: "success" });
                        } catch (e) {
                            console.error('Failed to update task from calendar modal', e);
                            addToast({ title: 'Failed to update', description: String(e?.message || e), variant: 'error' });
                        }
                    }}
                />
            )}
            {editModalOpen && editItem && editItem.type === "activity" && (
                <EditActivityModal
                    isOpen={editModalOpen}
                    onCancel={() => {
                        setEditModalOpen(false);
                        setEditItem(null);
                    }}
                    initialData={(function(){
                        try {
                            const parent = (Array.isArray(tasksList) ? tasksList.find((t) => String(t.id) === String(editItem.taskId || editItem.task_id || '')) : null) || null;
                            return {
                                id: editItem.id,
                                // task linkage
                                task_id: editItem.taskId || editItem.task_id || "",
                                taskId: editItem.taskId || editItem.task_id || "",
                                // text/title/description
                                text: editItem.text || editItem.title || "",
                                title: editItem.text || editItem.title || "",
                                description: editItem.description || editItem.notes || editItem.note || '',
                                // dates - provide both snake_case and camelCase aliases
                                start_date: editItem.start_date || editItem.startDate || editItem.date || '',
                                startDate: editItem.start_date || editItem.startDate || editItem.date || '',
                                end_date: editItem.end_date || editItem.endDate || '',
                                endDate: editItem.end_date || editItem.endDate || '',
                                deadline: editItem.deadline || editItem.dueDate || editItem.due_date || '',
                                duration: editItem.duration || editItem.duration_minutes || '',
                                // key area / list / task mapping (fall back to parent task when activity lacks them)
                                key_area_id: editItem.key_area_id || editItem.keyAreaId || editItem.keyArea || (parent && (parent.key_area_id || parent.keyAreaId || parent.keyArea)) || '',
                                list: editItem.list || editItem.list_index || editItem.listIndex || (parent && (parent.list || parent.list_index || parent.listIndex)) || '',
                                list_index: editItem.list || editItem.list_index || editItem.listIndex || (parent && (parent.list || parent.list_index || parent.listIndex)) || '',
                                // assignee/priority/goal/completed
                                assignee: editItem.assignee || editItem.responsible || (parent && (parent.assignee || parent.responsible)) || '',
                                priority: editItem.priority ?? editItem.priority_level ?? 2,
                                goal: editItem.goal || editItem.goal_id || editItem.goalId || '',
                                completed: typeof editItem.completed !== 'undefined' ? editItem.completed : false,
                            };
                        } catch (e) {
                            return {
                                id: editItem.id,
                                task_id: editItem.taskId || editItem.task_id || "",
                                taskId: editItem.taskId || editItem.task_id || "",
                                text: editItem.text || editItem.title || "",
                                title: editItem.text || editItem.title || "",
                                description: editItem.description || editItem.notes || editItem.note || '',
                            };
                        }
                    })()}
                    tasks={Array.isArray(tasksList) ? tasksList : []}
                    keyAreas={keyAreas}
                    users={usersList}
                    goals={goalsList}
                    availableLists={availableLists}
                    onSave={async (payload) => {
                        try {
                            const svc = await getActivityService();
                            if (editItem.id) {
                                // Map only allowed update fields to avoid ValidationPipe whitelist errors
                                // helper: normalize date-only (YYYY-MM-DD) to ISO datetime string
                                const normDate = (val) => {
                                    if (val === null) return null;
                                    if (typeof val === 'string' && val.trim() === '') return null;
                                    if (!val) return undefined;
                                    const s = String(val);
                                    // ISO date only (YYYY-MM-DD)
                                    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
                                        try {
                                            return new Date(s + 'T00:00:00Z').toISOString();
                                        } catch { return s; }
                                    }
                                    // otherwise try Date parse and toISOString
                                    try {
                                        const d = new Date(s);
                                        if (!isNaN(d.getTime())) return d.toISOString();
                                    } catch {}
                                    return s;
                                };
                                const normPriority = (p) => {
                                    if (p === null) return null;
                                    if (p === undefined) return undefined;
                                    if (typeof p === 'number') return p === 3 ? 'high' : p === 1 ? 'low' : 'normal';
                                    const ps = String(p).toLowerCase();
                                    if (['1','2','3'].includes(ps)) return ps === '3' ? 'high' : ps === '1' ? 'low' : 'normal';
                                    if (['high','normal','low'].includes(ps)) return ps;
                                    return undefined;
                                };

                                const patch = {};
                                if (payload.text !== undefined) patch.text = payload.text;
                                if (payload.taskId !== undefined || payload.task_id !== undefined) patch.taskId = (payload.taskId ?? payload.task_id) ? (payload.taskId ?? payload.task_id) : null;
                                if (payload.status !== undefined) patch.status = payload.status;
                                if (payload.completed !== undefined) patch.completed = Boolean(payload.completed);
                                if (payload.completionDate !== undefined) {
                                    const cd = normDate(payload.completionDate);
                                    // allow explicitly setting to null
                                    patch.completionDate = typeof cd === 'undefined' ? undefined : cd;
                                }
                                if (payload.priority !== undefined) {
                                    const pp = normPriority(payload.priority);
                                    if (pp !== undefined) patch.priority = pp;
                                }
                                if (payload.startDate !== undefined || payload.start_date !== undefined) {
                                    const sd = normDate(payload.startDate ?? payload.start_date);
                                    patch.startDate = typeof sd === 'undefined' ? undefined : sd;
                                }
                                if (payload.endDate !== undefined || payload.end_date !== undefined) {
                                    const ed = normDate(payload.endDate ?? payload.end_date);
                                    patch.endDate = typeof ed === 'undefined' ? undefined : ed;
                                }
                                if (payload.deadline !== undefined || payload.dueDate !== undefined || payload.due_date !== undefined) {
                                    const dd = normDate(payload.deadline ?? payload.dueDate ?? payload.due_date);
                                    patch.deadline = typeof dd === 'undefined' ? undefined : dd;
                                }
                                if (payload.goalId !== undefined || payload.goal !== undefined || payload.goal_id !== undefined) patch.goalId = (payload.goalId ?? payload.goal ?? payload.goal_id) ? (payload.goalId ?? payload.goal ?? payload.goal_id) : null;
                                // Debug: show the exact payload being sent to the backend so we can inspect validation errors
                                try {
                                    console.debug('[Calendar] updating activity payload', { id: editItem.id, patch });
                                } catch (__) {}
                                await svc.update(editItem.id, patch);
                            } else {
                                const toCreate = { text: payload.text || payload.title || '' };
                                if (payload.taskId || payload.task_id) toCreate.taskId = payload.taskId || payload.task_id;
                                await svc.create(toCreate);
                            }
                                await refreshTodosForRange();
                                // If the activity belongs to a task, refresh that task's activities immediately
                                try {
                                    const tid = editItem?.taskId || editItem?.task_id || null;
                                    if (tid) {
                                        const list = await (await getActivityService()).list({ taskId: tid });
                                        setActivitiesByTask((prev) => ({ ...prev, [String(tid)]: Array.isArray(list) ? list.map(normalizeActivity) : [] }));
                                    }
                                } catch (__) {}
                            try {
                                window.dispatchEvent(new CustomEvent('ka-activities-updated', { detail: { refresh: true, taskId: editItem?.taskId || undefined } }));
                            } catch (__) {}
                            setEditModalOpen(false);
                            setEditItem(null);
                            addToast({ title: "Activity updated", variant: "success" });
                        } catch (e) {
                            try {
                                // Log richer axios response info when available
                                console.error('Failed to update/create activity', e, e?.response && e.response.data ? e.response.data : null);
                                const serverMsg = e?.response?.data?.message || e?.response?.data || e?.message || String(e);
                                addToast({ title: 'Failed to save activity', description: String(serverMsg), variant: 'error' });
                            } catch (outer) {
                                console.error('Failed to update/create activity (and failed to stringify error)', outer, e);
                                addToast({ title: 'Failed to save activity', description: String(e?.message || e), variant: 'error' });
                            }
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

            {/* Simple top-center confirm for non-recurring deletes */}
            {simpleConfirmVisible && simpleConfirmTarget && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="simple-delete-title"
                    ref={simpleConfirmRef}
                    className="fixed top-4 left-1/2 transform -translate-x-1/2 rounded-md border border-slate-200 bg-white shadow-lg p-3 text-sm z-[9999] w-80"
                >
                    <div id="simple-delete-title" className="font-semibold">Delete appointment</div>
                    <div className="mt-2 text-sm">Are you sure you want to delete "{simpleConfirmTarget?.title}"?</div>
                    <div className="mt-3 flex items-center gap-2">
                        <button
                            type="button"
                            className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
                            onClick={confirmSimpleDelete}
                            disabled={simpleDeleting}
                        >
                            {simpleDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                        <button
                            type="button"
                            className="rounded-md border border-slate-300 px-3 py-1 text-sm"
                            onClick={cancelSimpleDelete}
                            disabled={simpleDeleting}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Delete popover anchored to click when delete icon clicked on an appointment */}
            {deletePopoverVisible && deleteTargetEvent && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-popover-title"
                    ref={deletePopoverRef}
                    className="fixed top-4 left-1/2 transform -translate-x-1/2 rounded-md border border-slate-200 bg-white shadow-lg p-3 text-sm z-[9999] w-100"
                >
                    <div className="font-semibold">Delete recurring appointment</div>

                    <div className="mt-2 flex flex-col gap-2">
                        <label className="inline-flex items-center gap-2">
                            <input
                                type="radio"
                                name="delete-scope-pop"
                                value="occurrence"
                                checked={deleteScopeChoice === 'occurrence'}
                                onChange={() => setDeleteScopeChoice('occurrence')}
                            />
                            <span>Delete this occurrence only</span>
                        </label>

                        <label className="inline-flex items-center gap-2">
                            <input
                                type="radio"
                                name="delete-scope-pop"
                                value="future"
                                checked={deleteScopeChoice === 'future'}
                                onChange={() => setDeleteScopeChoice('future')}
                            />
                            <span>Delete this and all future occurrences</span>
                        </label>

                        <label className="inline-flex items-center gap-2">
                            <input
                                type="radio"
                                name="delete-scope-pop"
                                value="series"
                                checked={deleteScopeChoice === 'series'}
                                onChange={() => setDeleteScopeChoice('series')}
                            />
                            <span>Delete the entire series</span>
                        </label>

                        <p className="text-xs text-slate-500">
                            Note: you can delete a single occurrence, truncate a series (future occurrences), or delete the entire series.
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                            <button
                                type="button"
                                className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
                                onClick={confirmDeleteFromPopover}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting...' : 'Confirm delete'}
                            </button>
                            <button
                                type="button"
                                className="rounded-md border border-slate-300 px-3 py-1 text-sm"
                                onClick={() => setDeletePopoverVisible(false)}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Update popover for drag/resize of recurring appointments */}
            {updatePopoverVisible && updateTargetEvent && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="update-popover-title"
                    className="fixed top-4 left-1/2 transform -translate-x-1/2 rounded-md border border-slate-200 bg-white shadow-lg p-3 text-sm z-[9999] w-100"
                >
                    <div className="font-semibold">Edit recurring appointment</div>

                    <div className="mt-2 flex flex-col gap-2">
                        <label className="inline-flex items-center gap-2">
                            <input
                                type="radio"
                                name="update-scope-pop"
                                value="occurrence"
                                checked={updateScopeChoice === 'occurrence'}
                                onChange={() => setUpdateScopeChoice('occurrence')}
                            />
                            <span>Edit this occurrence only</span>
                        </label>

                        <label className="inline-flex items-center gap-2">
                            <input
                                type="radio"
                                name="update-scope-pop"
                                value="future"
                                checked={updateScopeChoice === 'future'}
                                onChange={() => setUpdateScopeChoice('future')}
                            />
                            <span>Edit this and all future occurrences</span>
                        </label>

                        <label className="inline-flex items-center gap-2">
                            <input
                                type="radio"
                                name="update-scope-pop"
                                value="series"
                                checked={updateScopeChoice === 'series'}
                                onChange={() => setUpdateScopeChoice('series')}
                            />
                            <span>Edit the entire series</span>
                        </label>

                        <p className="text-xs text-slate-500">
                            Choose whether this drag/resize should affect only this occurrence, future occurrences, or the whole series.
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                            <button
                                type="button"
                                className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
                                onClick={confirmUpdateFromPopover}
                            >
                                Apply
                            </button>
                            <button
                                type="button"
                                className="rounded-md bg-slate-100 px-3 py-1 text-sm"
                                onClick={() => { setUpdatePopoverVisible(false); setUpdateTargetEvent(null); }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarContainer;
