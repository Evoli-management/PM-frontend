import React, { useState, useEffect, Suspense } from "react";
import { FaChevronDown } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import QuarterView from "./QuarterView";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import DayView from "./DayView";
import ListView from "./ListView";
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
import { withinBusinessHours, clampToBusinessHours } from "../../utils/businessHours";
import { normalizeActivity } from '../../utils/keyareasHelpers';
import AppointmentModal from "./AppointmentModal";
import DebugEventModal from "./DebugEventModal";

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
                const gs = await goalsSvc.getGoals().catch(() => []);
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
                const [evs, tds, appointments] = await Promise.all([
                    calendarService.listEvents({ from: fromISO, to: toISO, view }),
                    calendarService.listTodos({ from: fromISO, to: toISO }),
                    calendarService.listAppointments({ from: fromISO, to: toISO }),
                ]);
                
                // Merge events and appointments
                const allEvents = [...(Array.isArray(evs) ? evs : []), ...(Array.isArray(appointments) ? appointments : [])];
                setEvents(allEvents);
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
                        setWeekActivities(flat);
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
                    setWeekActivities(flat);
                } catch {
                    setWeekActivities([]);
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

    // Drag-and-drop: create an appointment for an activity
    const handleActivityDrop = async (activityOrObj, date) => {
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
            const title =
                (typeof activityOrObj === "object" && (activityOrObj.text || activityOrObj.title)) ||
                "Activity";
            const description = typeof activityOrObj === "object" ? activityOrObj.description || "" : "";
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
            setEvents((prev) => [...prev, created]);
            addToast({ title: "Event created", description: `${title} at ${start.toLocaleTimeString()}`, variant: "success" });
        } catch (err) {
            console.warn("Failed to create calendar event from activity drop", err);
            addToast({ title: "Failed to create event", description: String(err?.message || err), variant: "error" });
        }
    };

    // Event modal logic
    // Event modal logic
    const openModal = (event = null, action = null) => {
        if (action === 'delete') {
            handleDeleteEvent(event);
        } else if (action === 'edit') {
            setSelectedEvent(event);
            setModalOpen(true);
        } else {
            // Default behavior (legacy support)
            setSelectedEvent(event);
            setModalOpen(true);
        }
    };

    const handleDeleteEvent = async (event) => {
        if (!event?.id) return;
        
        const confirmed = window.confirm(`Are you sure you want to delete "${event.title}"?`);
        if (!confirmed) return;
        
        try {
            await calendarService.deleteEvent(event.id);
            setEvents((prev) => prev.filter((e) => e.id !== event.id));
            addToast({ title: "Appointment deleted", variant: "success" });
        } catch (error) {
            console.error("Delete error:", error);
            addToast({ 
                title: "Failed to delete appointment", 
                message: error.message,
                variant: "error" 
            });
        }
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
            if (!withinBusinessHours(newStartDate)) {
                addToast({
                    title: "Outside business hours",
                    description: "Allowed window 08:00–17:00",
                    variant: "error",
                });
                return;
            }
            // Determine end time: use provided newEndDate (resize) or default 30 minutes (move)
            const targetEnd = newEndDate ? newEndDate : new Date(newStartDate.getTime() + 30 * 60 * 1000);
            if (!withinBusinessHours(targetEnd)) {
                addToast({
                    title: "Outside business hours",
                    description: "Allowed window 08:00–17:00",
                    variant: "error",
                });
                return;
            }
            const payload = { start: newStartDate.toISOString(), end: targetEnd.toISOString() };
            // Decide endpoint based on event kind in current state
            const current = events.find((e) => e.id === eventId);
            const isAppointment = current?.kind === "appointment";
            const updated = await (isAppointment
                ? calendarService.updateAppointment(eventId, payload)
                : calendarService.updateEvent(eventId, payload));
            setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            addToast({
                title: "Event updated",
                description: `Moved to ${newStartDate.toLocaleString()}${targetEnd ? ` - ${targetEnd.toLocaleTimeString()}` : ""}`,
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
                        onEventClick={(ev, action) => openModal(ev, action)}
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
                        onEventClick={(ev, action) => (ev?.taskId ? openEditTask(ev.taskId) : openModal(ev, action))}
                        onTaskClick={openEditTask}
                        activities={weekActivities}
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
                        unattachedActivities={unattachedActivities}
                        loading={loading}
                        categories={EVENT_CATEGORIES}
                        onTaskDrop={handleTaskDrop}
                        onActivityDrop={handleActivityDrop}
                        onEventMove={handleEventMove}
                        onEventClick={(ev, action) => (ev?.taskId ? openEditTask(ev.taskId) : openModal(ev, action))}
                        onTaskClick={openEditTask}
                        onActivityClick={openEditActivity}
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
                        onEventClick={(ev, action) => (ev?.taskId ? openEditTask(ev.taskId) : openModal(ev, action))}
                        onTaskClick={openEditTask}
                    />
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
                                key_area_id: "",
                                taskId: "",
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
                                            if (!withinBusinessHours(start)) {
                                                addToast({ title: 'Outside business hours', description: 'Adjusted to business hours', variant: 'warning' });
                                            }
                                            const { end } = clampToBusinessHours(start, 60);
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
                    defaultDurationMinutes={30}
                    users={usersList}
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
            {/* Unified AppointmentModal: also used for editing */}
            {modalOpen && selectedEvent && (
                <AppointmentModal
                    event={selectedEvent}
                    users={usersList}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedEvent(null);
                    }}
                    onUpdated={(updated) => {
                        if (updated && updated.id) {
                            setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
                        }
                        setModalOpen(false);
                        setSelectedEvent(null);
                        addToast({ title: "Appointment updated", variant: "success" });
                    }}
                    defaultDurationMinutes={30}
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
                        key_area_id: editItem.key_area_id || editItem.keyAreaId || "",
                        keyAreaId: editItem.key_area_id || editItem.keyAreaId || "",
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
        </div>
    );
};

export default CalendarContainer;
