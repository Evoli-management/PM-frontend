import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../components/shared/ToastProvider.jsx';
import Sidebar from '../components/shared/Sidebar';
import TaskFormModal from '../components/key-areas/TaskFormModal';
import CreateTaskModal from '../components/key-areas/CreateTaskModal';
import KeyAreasList from '../components/key-areas/KeyAreasList';
import CreateActivityFormModal from '../components/modals/CreateActivityFormModal';
import KeyAreaModal from '../components/key-areas/KeyAreaModal';
import EditTaskModal from '../components/key-areas/EditTaskModal';
import EditActivityModal from '../components/key-areas/EditActivityModal';
import EmptyState from '../components/goals/EmptyState.jsx';
import TaskRow from '../components/key-areas/TaskRow';
import ViewTabsNavigation from '../components/key-areas/ViewTabsNavigation';
import ActivityList from '../components/key-areas/ActivityList';
import TaskSlideOver from '../components/key-areas/TaskSlideOver';
import TaskFullView from '../components/key-areas/TaskFullView';
import UnifiedTaskActivityTable from '../components/key-areas/UnifiedTaskActivityTable';
import PendingDelegationsSection from '../components/key-areas/PendingDelegationsSection';
import TripleViewLayout from '../components/key-areas/TripleViewLayout';
import TaskListPanel from '../components/key-areas/TaskListPanel';
import ActivityListPanel from '../components/key-areas/ActivityListPanel';
import ResizablePanels from '../components/key-areas/ResizablePanels';
import KeyAreasTripleView from '../components/key-areas/KeyAreasTripleView';
import taskDelegationService from '../services/taskDelegationService';
import activityDelegationService from '../services/activityDelegationService';
import { FaTimes, FaSave, FaTag, FaTrash, FaAngleDoubleLeft, FaChevronLeft, FaStop, FaEllipsisV, FaEdit, FaSearch, FaPlus, FaBars, FaLock, FaExclamationCircle } from 'react-icons/fa';
import '../styles/triple-view.css';
import {
    safeParseDate,
    nullableString,
    computeEisenhowerQuadrant,
    getPriorityLevel,
    toDateOnly,
    formatDuration,
    mapUiStatusToServer,
    mapServerStatusToUi,
    normalizeActivity,
} from '../utils/keyareasHelpers';

// Lazy getters for services to allow code-splitting and avoid circular imports
let _taskService = null;
const getTaskService = async () => {
    if (_taskService) return _taskService;
    const mod = await import('../services/taskService');
    _taskService = mod.default || mod;
    return _taskService;
};

let _keyAreaService = null;
const getKeyAreaService = async () => {
    if (_keyAreaService) return _keyAreaService;
    const mod = await import('../services/keyAreaService');
    _keyAreaService = mod.default || mod;
    return _keyAreaService;
};

let _activityService = null;
const getActivityService = async () => {
    if (_activityService) return _activityService;
    const mod = await import('../services/activityService');
    _activityService = mod.default || mod;
    return _activityService;
};

let _usersService = null;
const getUsersService = async () => {
    if (_usersService) return _usersService;
    const mod = await import('../services/usersService');
    _usersService = mod.default || mod;
    return _usersService;
};

let _userProfileService = null;
const getUserProfileService = async () => {
    if (_userProfileService) return _userProfileService;
    const mod = await import('../services/userProfileService');
    _userProfileService = mod.default || mod;
    return _userProfileService;
};

const api = {
    async listKeyAreas() {
        try {
            return await (await getKeyAreaService()).list({ includeTaskCount: true });
        } catch (e) {
            // if unauthorized, let global axios handler redirect to login
            if (e?.response?.status === 401) {
                throw e;
            }
            // surface errors to caller; do not use local cache
            throw e;
        }
    },
    async listGoals() {
        try {
            const mod = await import('../services/goalService');
            const fn = mod?.getGoals || mod?.default?.getGoals || mod?.default;
            if (typeof fn === 'function') {
                return await fn();
            }
            // fallback: call default export if it returns an object with getGoals
            return [];
        } catch (e) {
            console.error('Failed to load goals', e);
            return [];
        }
    },
    async updateKeyArea(id, data) {
        // Only update via backend; no local fallbacks
        return await (await getKeyAreaService()).update(id, data);
    },
    async createKeyArea(data) {
        // Only create via backend; no local fallbacks
        return await (await getKeyAreaService()).create(data);
    },
    async deleteKeyArea(id) {
        await (await getKeyAreaService()).remove(id);
        return true;
    },
    async listTasks(keyAreaId, opts = {}) {
        // Fetch from backend and normalize for UI
        try {
            const rows = await (await getTaskService()).list({ keyAreaId, withoutGoal: opts.withoutGoal });
            return (Array.isArray(rows) ? rows : []).map((t) => ({
                ...t,
                // `taskService.list` already maps backend enums to FE-friendly values
                status: t.status,
                // normalize for UI naming
                due_date: t.dueDate || t.due_date || null,
                deadline: t.dueDate || t.due_date || null,
                start_date: t.startDate || t.start_date || null,
                end_date: t.endDate || t.end_date || null,
                // expose completion date for UI (nullable ISO string)
                completionDate: t.completionDate || t.completion_date || null,
                assignee: t.assignee ?? null,
                duration: t.duration ?? null,
                key_area_id: t.keyAreaId || t.key_area_id || keyAreaId,
            }));
        } catch (e) {
            if (e?.response?.status === 401) throw e;
            console.error("Failed to list tasks", e);
            return [];
        }
    },
    async createTask(task) {
        const payload = {
            keyAreaId: task.key_area_id || task.keyAreaId || task.key_area || task.keyArea,
            title: task.title,
            description: nullableString(task.description),
            assignee: nullableString(task.assignee),
            startDate: toDateOnly(task.start_date ?? task.startDate),
            dueDate: toDateOnly(task.deadline ?? task.due_date ?? task.dueDate),
            endDate: toDateOnly(task.end_date ?? task.endDate),
            status: (() => {
                const s = String(task.status || "todo").toLowerCase();
                if (s === "open") return "todo";
                if (s === "blocked") return "cancelled";
                if (s === "done" || s === "closed" || s === "completed") return "completed";
                if (s === "cancelled" || s === "canceled") return "cancelled";
                if (s === "in_progress") return "in_progress";
                return "todo";
            })(),
            priority: (() => {
                const p = String(task.priority || "medium").toLowerCase();
                if (p === "low" || p === "medium" || p === "high") return p;
                return "medium";
            })(),
            delegatedToUserId: task.delegatedToUserId ?? null,
            // Accept client-provided list index when creating so server persists list membership
            listIndex: typeof task.list_index !== 'undefined' ? task.list_index : (typeof task.listIndex !== 'undefined' ? task.listIndex : undefined),
        };
    const created = await (await getTaskService()).create(payload);
        // normalize for UI
        return {
            ...created,
            status: "open",
            due_date: created.dueDate || null,
            deadline: created.dueDate || null,
            start_date: created.startDate || null,
            end_date: created.endDate || null,
            assignee: created.assignee ?? payload.assignee ?? null,
            duration: created.duration ?? null,
            key_area_id: created.keyAreaId || payload.keyAreaId,
            // expose list index to UI under both conventions
            list_index: typeof created.listIndex !== 'undefined' ? created.listIndex : (typeof created.list_index !== 'undefined' ? created.list_index : 1),
            listIndex: typeof created.listIndex !== 'undefined' ? created.listIndex : (typeof created.list_index !== 'undefined' ? created.list_index : 1),
        };
    },
    async updateTask(id, task) {
        const payload = {
            keyAreaId: task.key_area_id || task.keyAreaId || task.key_area || task.keyArea,
            goalId: task.goal_id || task.goalId || task.goal || null,
            title: task.title,
            description: nullableString(task.description, true),
            assignee: nullableString(task.assignee, true),
            startDate: (toDateOnly(task.start_date ?? task.startDate) || undefined),
            dueDate: (toDateOnly(task.deadline ?? task.due_date ?? task.dueDate) || undefined),
            endDate: (toDateOnly(task.end_date ?? task.endDate) || undefined),
            // Ensure client-side list membership is sent to the backend when present
            listIndex: typeof task.list_index !== 'undefined' ? task.list_index : (typeof task.listIndex !== 'undefined' ? task.listIndex : undefined),
            status: (() => {
                const s = String(task.status || "").toLowerCase();
                if (!s) return undefined;
                if (s === "open") return "todo";
                if (s === "blocked") return "cancelled";
                if (s === "done" || s === "closed" || s === "completed") return "completed";
                if (s === "cancelled" || s === "canceled") return "cancelled";
                if (s === "in_progress") return "in_progress";
                return undefined;
            })(),
            priority: (() => {
                const raw = task.priority;
                if (raw === undefined || raw === null || raw === "") return undefined;
                // numeric mapping (1|2|3)
                const n = Number(raw);
                if (!Number.isNaN(n)) {
                    if (n === 1) return "low";
                    if (n === 3) return "high";
                    return "medium"; // 2 or others → medium
                }
                const p = String(raw).toLowerCase();
                if (p === "med" || p === "medium" || p === "normal") return "medium";
                if (p === "low") return "low";
                if (p === "high") return "high";
                return undefined;
            })(),
        };
    const updated = await (await getTaskService()).update(id, payload);
        // Normalize BE response back to UI shape
                const normalized = {
                    ...updated,
                    // `taskService.update` already returns FE-friendly status strings
                    status: updated.status || "open",
            due_date: updated.dueDate || null,
            deadline: updated.dueDate || null,
            start_date: updated.startDate || null,
            end_date: updated.endDate || null,
            assignee: updated.assignee ?? payload.assignee ?? null,
            duration: updated.duration ?? null,
            key_area_id: updated.keyAreaId || payload.keyAreaId,
        };
        // Carry over UI-only fields not persisted by backend so table/view keeps them
        const uiOnly = ((t) => ({
            tags: t.tags ?? "",
            list_index: t.list_index ?? 1,
            goal_id: t.goal_id ?? "",
            recurrence: t.recurrence ?? "",
            attachments: t.attachments ?? "",
            attachmentsFiles: t.attachmentsFiles ?? [],
            eisenhower_quadrant:
                t.eisenhower_quadrant ??
                computeEisenhowerQuadrant({
                    deadline: normalized.due_date || normalized.deadline,
                    end_date: normalized.end_date,
                    start_date: normalized.start_date,
                    priority: normalized.priority,
                    status: normalized.status,
                    key_area_id: normalized.key_area_id,
                }),
            category: t.category ?? "Key Areas",
        }))(task || {});
        return { ...normalized, ...uiOnly };
    },
    async deleteTask(id) {
        const svc = await getTaskService();
        await svc.remove(id);
        return true;
    },
};

const normalizeActivityWithTask = (activity, task) => {
    const norm = normalizeActivity(activity || {});
    if (!norm) return norm;

    const taskId = task?.id ?? task?.task_id ?? task?.taskId ?? null;
    const keyAreaId =
        norm.key_area_id ??
        task?.key_area_id ??
        task?.keyAreaId ??
        task?.keyArea ??
        null;
    const listIndex =
        norm.list ??
        task?.list_index ??
        task?.listIndex ??
        task?.list ??
        null;
    const goalId =
        norm.goal_id ??
        norm.goalId ??
        task?.goal_id ??
        task?.goalId ??
        task?.goal ??
        null;
    const assignee = norm.assignee ?? task?.assignee ?? null;

    return {
        ...norm,
        title: norm.title || norm.text || norm.activity_name || norm.name || '',
        name: norm.name || norm.title || norm.text || norm.activity_name || '',
        taskId: norm.taskId || taskId || null,
        key_area_id: keyAreaId,
        keyAreaId,
        list: listIndex,
        list_index: listIndex,
        listIndex,
        goal_id: goalId,
        goalId,
        assignee,
        responsible: norm.responsible ?? assignee ?? null,
    };
};

// Shared helpers (imported from utils/keyareasHelpers)

// Minimal placeholders to keep non-list views functional
const KanbanView = ({ tasks = [], onSelect, selectedIds = new Set(), toggleSelect = () => {}, onStatusChange = () => {} }) => {
    const cols = [
        { key: "open", label: "Open" },
        { key: "in_progress", label: "In progress" },
        { key: "blocked", label: "Blocked" },
        { key: "done", label: "Done" },
    ];
    const groups = cols.map((c) => ({
        ...c,
        items: tasks.filter((t) => String(t.status || "open").toLowerCase() === c.key),
    }));
    const leftovers = tasks.filter((t) => !cols.some((c) => String(t.status || "open").toLowerCase() === c.key));
    if (leftovers.length) groups.push({ key: "other", label: "Other", items: leftovers });

    const priorityBadge = (p) => {
        const lvl = getPriorityLevel(p);
        if (lvl === 2) return null;
        const cls = lvl === 3 ? "text-red-600" : "text-emerald-600";
        const label = lvl === 3 ? "High" : "Low";
        return (
            <span className={`inline-block text-xs font-bold ${cls}`} title={`Priority: ${label}`} aria-hidden>
                !
            </span>
        );
    };

    return (
        <div className="p-2 overflow-auto">
            <DndContext
                sensors={useSensors(
                    useSensor(PointerSensor),
                    useSensor(KeyboardSensor, {
                        coordinateGetter: sortableKeyboardCoordinates,
                    })
                )}
                collisionDetection={closestCenter}
                onDragEnd={({ active, over }) => {
                    if (!over || active.id === over.id) return;
                    const oldIdx = keyAreas.findIndex((ka) => ka.id === active.id);
                    const newIdx = keyAreas.findIndex((ka) => ka.id === over.id);
                    // Prevent moving 'Ideas' or moving anything to 'Ideas' position
                    if (keyAreas[oldIdx]?.is_fixed || keyAreas[newIdx]?.is_fixed) return;
                    const newOrder = arrayMove(keyAreas, oldIdx, newIdx);
                    setKeyAreas(newOrder);
                    // TODO: Persist new order to backend
                }}
            >
                <SortableContext items={keyAreas.filter(ka => !ka.is_fixed).map(ka => ka.id)}>
                    {keyAreas.map((ka, idx) => (
                        ka.is_fixed ? (
                            <FixedKeyAreaRow key={ka.id} ka={ka} onOpen={openKA} />
                        ) : (
                            <SortableKeyAreaRow key={ka.id} ka={ka} idx={idx} moveKeyArea={moveKeyArea} onOpen={openKA} />
                        )
                    ))}
                </SortableContext>
            </DndContext>
        </div>
    );
};

const CalendarView = ({ tasks = [], onSelect, selectedIds = new Set(), toggleSelect = () => {}, onStatusChange = () => {} }) => {
    // Group by deadline date (YYYY-MM-DD); undated last
    const byDate = tasks.reduce((acc, t) => {
        const key = toDateOnly(t.deadline) || "No date";
        acc[key] = acc[key] || [];
        acc[key].push(t);
        return acc;
    }, {});
    const keys = Object.keys(byDate).sort((a, b) => {
        if (a === "No date") return 1;
        if (b === "No date") return -1;
        return a.localeCompare(b);
    });

    const fmt = (d) => {
        if (d === "No date") return d;
        try {
            const dd = new Date(d + "T00:00:00");
            return dd.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
        } catch {
            return d;
        }
    };

    return (
        <div className="p-2 space-y-3">
            {keys.map((k) => (
                <div key={k} className="bg-white border border-slate-200 rounded-lg">
                    <div className="px-3 py-2 border-b border-slate-200 text-xs font-semibold text-slate-700">
                        {fmt(k)}
                    </div>
                    <div className="p-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {byDate[k].map((t) => (
                            <div
                                key={t.id}
                                className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100"
                                title={t.title}
                            >
                                <div className="flex items-start gap-2">
                                    <input
                                        type="checkbox"
                                        aria-label={`Select ${t.title}`}
                                        className="mt-0.5"
                                        checked={selectedIds.has(t.id)}
                                        onChange={() => toggleSelect(t.id)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => onSelect && onSelect(t)}
                                        className="flex-1 text-left"
                                    >
                                        <div className={`font-medium truncate ${String(t.status || "").toLowerCase() === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{t.title}</div>
                                        <div className="text-[11px] text-slate-500 mt-0.5 truncate capitalize">
                                            {String(t.status || "open").replace("_", " ")}
                                        </div>
                                        
                                        {/* Show read-only completion date when present */}
                                        {t.completionDate ? (
                                            <div className="text-[11px] text-slate-500 mt-1 truncate">
                                                Completed: {toDateOnly(t.completionDate || t.completion_date)}
                                            </div>
                                        ) : null}
                                    </button>

                                    {/* Inline 3-option status control (open / in_progress / done) */}
                                    <div className="ml-2 w-36">
                                        <select
                                            aria-label={`Change status for ${t.title}`}
                                            className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm"
                                            value={String(t.status || "open").toLowerCase()}
                                            onChange={async (e) => {
                                                const next = e.target.value;
                                                try {
                                                    // optimistic UI update handled by parent callback
                                                    onStatusChange && onStatusChange(t.id, next);
                                                } catch (err) {
                                                    console.error("Failed to update status", err);
                                                }
                                            }}
                                        >
                                            <option value="open">Open</option>
                                            <option value="in_progress">In progress</option>
                                            <option value="done">Done</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

/* SlideOver is now extracted to src/components/key-areas/TaskSlideOver.jsx */

/* Full page TaskFullView has been moved to src/components/key-areas/TaskFullView.jsx */

/* --------------------------------- Screen -------------------------------- */
export default function KeyAreas() {
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [keyAreas, setKeyAreas] = useState([]);
    const [filter, setFilter] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [selectedKA, setSelectedKA] = useState(null);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const [taskTab, setTaskTab] = useState(1);
    // Main view tab: 'active-tasks' | 'delegated' | 'todo' | 'activity-trap' | 'my-focus'
    const [viewTab, setViewTab] = useState('active-tasks');
    // Sub-filter for ACTIVE TASKS view: 'active' (no completed) or 'all' (including completed)
    const [activeFilter, setActiveFilter] = useState('active');
    const isGlobalTasksView = viewTab === 'delegated' || viewTab === 'todo' || viewTab === 'activity-trap';
    const [allTasks, setAllTasks] = useState([]);
    const [pendingDelegations, setPendingDelegations] = useState([]); // For DELEGATED tab - pending only
    const [savingIds, setSavingIds] = useState(new Set());
    // Handler: change a task's status (UI value: open | in_progress | done)
    const handleTaskStatusChange = async (id, uiStatus) => {
        // optimistic update: set status locally (completionDate will be reconciled from server)
        setAllTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, status: uiStatus } : t)),
        );

        try {
            // Send request to update the status
            await api.updateTask(id, { status: uiStatus });
            // Fetch canonical server state for this task so UI reflects server-side completionDate and status
            const taskService = await getTaskService();
            const server = await taskService.get(id);
                if (server) {
                const normalized = {
                    ...server,
                    // Normalize server status to UI values (open|in_progress|done)
                    status: mapServerStatusToUi(server.status),
                    completionDate: server.completionDate || server.completion_date || null,
                    due_date: server.dueDate || server.due_date || null,
                    start_date: server.startDate || server.start_date || null,
                    end_date: server.endDate || server.end_date || null,
                    assignee: server.assignee ?? null,
                    duration: server.duration ?? null,
                    key_area_id: server.keyAreaId || server.key_area_id || selectedKA?.id,
                };
                setAllTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...normalized } : t)));
                setSelectedTaskFull((prev) => (prev && prev.id === id ? { ...prev, ...normalized } : prev));
                return;
            }
        } catch (err) {
            console.error("Failed to update task status", err);
            // revert optimistic change by fetching the task list from backend if possible
                try {
                const taskService = await getTaskService();
                const rows = await taskService.list({ keyAreaId: selectedKA?.id });
                const server = (Array.isArray(rows) ? rows : []).find((r) => r.id === id);
                if (server) {
                    const normalized = {
                        ...server,
                        status: mapServerStatusToUi(server.status),
                        completionDate: server.completionDate || server.completion_date || null,
                    };
                    setAllTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...normalized } : t)));
                } else {
                    // If server doesn't return the task, clear optimistic completionDate and revert status
                    setAllTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "open", completionDate: null } : t)));
                }
            } catch (e) {
                // If we can't refresh, at least revert the optimistic status to open and clear completionDate
                setAllTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "open", completionDate: null } : t)));
            }
        }
    };
    const [searchTerm, setSearchTerm] = useState("");
    // site-wide search state (moved to top bar). When non-empty, triggers searchResults fetch
    const [siteSearch, setSiteSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [quadrant, setQuadrant] = useState("all");
    const [selectedTask, setSelectedTask] = useState(null);
    const [slideOverInitialTab, setSlideOverInitialTab] = useState("details");
    // Full page task view state
    const [selectedTaskFull, setSelectedTaskFull] = useState(null);
    const [taskFullInitialTab, setTaskFullInitialTab] = useState("activities");
    // Triple view left panel selected task
    const [selectedTaskInPanel, setSelectedTaskInPanel] = useState(null);
    // Inline Activities popover state
    const [openActivitiesMenu, setOpenActivitiesMenu] = useState(null); // task id or null
    const [activitiesMenuPos, setActivitiesMenuPos] = useState({ top: 0, left: 0 });
    const ActivityRowMenu = ({ activity, taskId }) => {
        const [open, setOpen] = useState(false);
        const btnRef = useRef(null);
        const menuRef = useRef(null);

        useEffect(() => {
            if (!open) return;
            const onDown = (e) => {
                if (menuRef.current && menuRef.current.contains(e.target)) return;
                if (btnRef.current && btnRef.current.contains(e.target)) return;
                setOpen(false);
            };
            const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
            document.addEventListener('mousedown', onDown);
            document.addEventListener('keydown', onKey);
            return () => {
                document.removeEventListener('mousedown', onDown);
                document.removeEventListener('keydown', onKey);
            };
        }, [open]);

        const toggle = (e) => {
            e.stopPropagation();
            setOpen((s) => !s);
        };

        const handleEdit = () => {
            setOpen(false);
            try {
                window.dispatchEvent(new CustomEvent('ka-open-activity-editor', { detail: { activity, taskId } }));
            } catch (e) {}
        };

        const handleDelete = async () => {
            setOpen(false);
            if (!confirm(`Delete activity "${(activity?.text || activity?.activity_name || 'Untitled activity')}"?`)) return;
            try {
                const activityService = await getActivityService();
                await activityService.remove(activity.id);
                setActivitiesByTask((prev) => {
                    const key = String(taskId || activity.task_id || activity.taskId || '');
                    if (!key) return prev;
                    const updated = { ...prev };
                    updated[key] = (updated[key] || []).filter((a) => a.id !== activity.id);
                    return updated;
                });
            } catch (error) {
                console.error('Failed to delete activity:', error);
            }
        };

        const handleConvert = () => {
            setOpen(false);
            try {
                window.dispatchEvent(new CustomEvent('ka-create-task-from-activity', { detail: { taskId, activity } }));
            } catch (e) {}
        };

        return (
            <div className="inline-block mr-1 relative">
                <button
                    type="button"
                    ref={btnRef}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    onClick={toggle}
                    className="p-1 rounded hover:bg-slate-100 text-slate-600"
                    title="More actions"
                >
                    <FaEllipsisV />
                </button>
                {open && (
                    <div
                        ref={menuRef}
                        className="absolute top-full left-0 mt-1 z-50 min-w-[176px] bg-white border border-slate-200 rounded shadow"
                    >
                        <button type="button" className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={handleEdit}>
                            <FaEdit className="text-slate-600" />
                            <span>Edit</span>
                        </button>
                        <button type="button" className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={handleDelete}>
                            <FaTrash />
                            <span>Delete</span>
                        </button>
                        <button type="button" className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={handleConvert}>
                            <FaAngleDoubleLeft />
                            <span>Convert to task</span>
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const saveActivityName = async (activity, taskId, value) => {
        const trimmed = String(value || '').trim();
        setActivityNameEditId(null);
        if (!trimmed) return;
        const current = (activity?.text || activity?.activity_name || '').trim();
        if (trimmed === current) return;
        try {
            const svc = await getActivityService();
            const result = await svc.update(activity.id, { text: trimmed });
            setActivitiesByTask((prev) => {
                const key = String(taskId || activity.taskId || activity.task_id || '');
                if (!key) return prev;
                const updated = { ...prev };
                updated[key] = (updated[key] || []).map((a) => (a.id === activity.id ? { ...a, ...result } : a));
                return updated;
            });
        } catch (error) {
            console.error('Failed to update activity name:', error);
        }
    };

    // Mass edit selection & form state
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkForm, setBulkForm] = useState({
        assignee: "",
        status: "",
        priority: "",
        start_date: "",
        deadline: "",
        end_date: "",
    });
    const [sortBy, setSortBy] = useState("manual");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterAssignee, setFilterAssignee] = useState("");
    const [filterTag, setFilterTag] = useState("");
    const [view, setView] = useState("list");
    const defaultVisible = {
        responsible: true,
        status: true,
        priority: true,
        quadrant: true,
        start_date: true,
        end_date: true,
        deadline: true,
        duration: true,
        completed: true,
    };
    const [showCompleted, setShowCompleted] = useState(() => {
        try {
            const raw = window.localStorage.getItem('keyareas.showCompleted');
            if (raw !== null) return raw === 'true';
        } catch (_) {}
        return true;
    });
    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const raw = window.localStorage.getItem('keyareas.visibleColumns');
            if (raw) {
                const parsed = JSON.parse(raw);
                // merge with defaults so newly-added keys default to true
                return { ...defaultVisible, ...parsed };
            }
        } catch (e) {
            // ignore
        }
        return defaultVisible;
    });

    // Persist visibleColumns to localStorage so user selection survives refresh
    useEffect(() => {
        try {
            window.localStorage.setItem('keyareas.visibleColumns', JSON.stringify(visibleColumns));
        } catch (e) {
            // ignore storage errors
        }
    }, [visibleColumns]);
    // Persist showCompleted preference
    useEffect(() => {
        try {
            window.localStorage.setItem('keyareas.showCompleted', String(!!showCompleted));
        } catch (_) {}
    }, [showCompleted]);

    // When siteSearch changes, perform a site-wide search across all Key Areas (debounced)
    useEffect(() => {
        const q = String(siteSearch || "").trim();
        let cancelled = false;
        let timer = null;
        if (q.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return () => {};
        }
        setIsSearching(true);
        timer = setTimeout(async () => {
            try {
                const kas = await api.listKeyAreas();
                const tasksLists = await Promise.all((kas || []).map((k) => api.listTasks(k.id)));
                const combined = (tasksLists || []).flat().map((t) => ({ ...t, key_area_id: t.key_area_id || t.keyAreaId || t.key_area }));
                const ql = q.toLowerCase();
                const filtered = (combined || []).filter((t) => {
                    const title = (t.title || t.name || '').toLowerCase();
                    const desc = (t.description || t.notes || '').toLowerCase();
                    return title.includes(ql) || desc.includes(ql);
                });
                if (!cancelled) setSearchResults(filtered);
            } catch (e) {
                if (!cancelled) setSearchResults([]);
            } finally {
                if (!cancelled) setIsSearching(false);
            }
        }, 300);
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [siteSearch]);
    const [goals, setGoals] = useState([]);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [showTaskComposer, setShowTaskComposer] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingActivityViaTaskModal, setEditingActivityViaTaskModal] = useState(null); // { id, taskId }
    const [showActivityComposer, setShowActivityComposer] = useState(false);
    const [editingActivityId, setEditingActivityId] = useState(null);
    const [activityNameEditId, setActivityNameEditId] = useState(null);
    const [activityNameEditValue, setActivityNameEditValue] = useState('');
    const [showTaskHelp, setShowTaskHelp] = useState(false);
    const [listNames, setListNames] = useState({}); // { [keyAreaId]: { [index]: name } }
    const [showViewMenu, setShowViewMenu] = useState(false);
    const viewMenuRef = useRef(null);
    const [showColumnsMenu, setShowColumnsMenu] = useState(false);
    const columnsMenuRef = useRef(null);
    const columnsButtonRef = useRef(null);
    const columnsMenuPopupRef = useRef(null);
    const [columnsAnchor, setColumnsAnchor] = useState(null);
    const [openListMenu, setOpenListMenu] = useState(null); // list number for context menu
    const [listMenuPos, setListMenuPos] = useState({ top: 0, left: 0 }); // popup menu position
    const composerModalRef = useRef(null);
    const tabsRef = useRef(null);
    // Mass edit UI toggle and anchor
    const [showMassEdit, setShowMassEdit] = useState(false);
    const [showMassEditModal, setShowMassEditModal] = useState(false);
    const tasksDisplayRef = useRef(null);
    const [users, setUsers] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);

    // Build a stable lookup map from any possible goal id key to the goal title.
    // This avoids repeated array scans in TaskRow and makes lookups resilient
    // to different id field names returned by the backend (_id, id, goalId, goal_id).
    const goalTitleMap = React.useMemo(() => {
        const m = new Map();
        try {
            (goals || []).forEach((g) => {
                const title = g && (g.title || g.name || g.label) ;
                const ids = [g && g.id, g && g._id, g && g.goalId, g && g.goal_id];
                ids.forEach((id) => {
                    if (id !== undefined && id !== null) m.set(String(id), title || "");
                });
            });
        } catch (_) {}
        return m;
    }, [goals]);

    // If goals load after tasks, force a shallow update to allTasks so TaskRow re-renders
    // and can resolve titles via the freshly-populated goalTitleMap.
    useEffect(() => {
        try {
            if (goals && goals.length && allTasks && allTasks.length) {
                // shallow copy to trigger subscribers without changing identity of items
                setAllTasks((prev) => (Array.isArray(prev) ? prev.slice() : prev));
            }
        } catch (_) {}
    }, [goals.length]);

    // Sync view tab and active filter from URL params
    useEffect(() => {
        const params = new URLSearchParams(location.search || "");
        const viewParam = params.get('view');
        const activeParam = params.get('active');
        const allowedViews = new Set(['active-tasks', 'delegated', 'todo', 'activity-trap', 'my-focus']);
        if (viewParam && allowedViews.has(viewParam) && viewParam !== viewTab) {
            setViewTab(viewParam);
        }
        if (activeParam && (activeParam === 'active' || activeParam === 'all') && activeParam !== activeFilter) {
            setActiveFilter(activeParam);
        }
    }, [location.search]);

    // Persist view tab and active filter to URL (keep other params intact)
    useEffect(() => {
        const params = new URLSearchParams(location.search || "");
        let changed = false;
        if (params.get('view') !== viewTab) {
            params.set('view', viewTab);
            changed = true;
        }
        if (viewTab === 'active-tasks') {
            if (params.get('active') !== activeFilter) {
                params.set('active', activeFilter);
                changed = true;
            }
        } else if (params.has('active')) {
            params.delete('active');
            changed = true;
        }
        if (changed) {
            navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
        }
    }, [viewTab, activeFilter]);

    // Reload tasks when viewTab or activeFilter changes
    useEffect(() => {
        // Handle MY FOCUS tab - navigate to separate page
        if (viewTab === 'my-focus') {
            navigate('/my-focus');
            return;
        }
        
        // Handle DELEGATED tab - show TWO sections: pending at top, all delegated below
        if (viewTab === 'delegated') {
            (async () => {
                try {
                    let delegatedToMe = [];
                    let delegatedActivities = [];
                    try {
                        // Get ALL delegated tasks (both pending and accepted)
                        delegatedToMe = await taskDelegationService.getDelegatedToMe();
                        
                        // Get ALL delegated activities (both pending and accepted)
                        delegatedActivities = await activityDelegationService.getDelegatedToMe();
                        
                        console.log('✅ getDelegatedToMe() returned:', { 
                            tasks: Array.isArray(delegatedToMe) ? delegatedToMe.length : 0,
                            tasksPending: delegatedToMe?.filter(t => (t.delegationStatus || t.delegation_status) === 'pending').length,
                            tasksAccepted: delegatedToMe?.filter(t => (t.delegationStatus || t.delegation_status) === 'accepted').length,
                            activities: Array.isArray(delegatedActivities) ? delegatedActivities.length : 0,
                            activitiesPending: delegatedActivities?.filter(a => (a.delegationStatus || a.delegation_status) === 'pending').length,
                            activitiesAccepted: delegatedActivities?.filter(a => (a.delegationStatus || a.delegation_status) === 'accepted').length,
                        });
                        
                        // Normalize both tasks and activities with type indicator
                        const normalizedTasks = (delegatedToMe || []).map(t => ({ ...t, type: 'task' }));
                        const normalizedActivities = (delegatedActivities || []).map(a => ({ ...a, type: 'activity' }));
                        
                        // Combine all delegated items
                        const allDelegated = [...normalizedTasks, ...normalizedActivities];
                        
                        // Separate pending delegations for top section
                        const pending = allDelegated.filter(item => 
                            (item.delegationStatus || item.delegation_status) === 'pending' || 
                            !(item.delegationStatus || item.delegation_status)
                        );
                        setPendingDelegations(pending);
                        
                        // Set all items for the bottom section (with filters)
                        setAllTasks(allDelegated);
                    } catch (err) {
                        console.error('❌ ERROR: getDelegatedToMe() failed:', err);
                        delegatedToMe = [];
                        delegatedActivities = [];
                        setPendingDelegations([]);
                    }

                    // Load activities for delegated tasks
                    const actSvc = await getActivityService();
                    const entries = await Promise.all(
                        (delegatedToMe || []).map(async (row) => {
                            try {
                                const list = await actSvc.list({ taskId: row.id });
                                const filtered = Array.isArray(list)
                                    ? list.filter((activity) => {
                                          if (!currentUserId) return true;
                                          const delegatedTo = activity.delegatedToUserId || activity.delegated_to_user_id;
                                          if (!delegatedTo) return true;
                                          return String(delegatedTo) === String(currentUserId);
                                      })
                                    : [];
                                return [String(row.id), filtered.map(normalizeActivity)];
                            } catch {
                                return [String(row.id), []];
                            }
                        }),
                    );
                    setActivitiesByTask(Object.fromEntries(entries));
                } catch (e) {
                    console.error('Failed to load delegated tasks', e);
                    setPendingDelegations([]);
                }
            })();
            return;
        }
        
        // Handle TODO tab - show all tasks across all key areas (no key area filter)
        if (viewTab === 'todo') {
            (async () => {
                try {
                    const svc = await getTaskService();
                    // Load ALL user tasks (empty opts = all tasks owned by user)
                    const allUserTasks = await svc.list({});
                    setAllTasks(allUserTasks || []);
                    
                    // Load activities for all tasks
                    const actSvc = await getActivityService();
                    const entries = await Promise.all(
                        (allUserTasks || []).map(async (row) => {
                            try {
                                const list = await actSvc.list({ taskId: row.id });
                                return [
                                    String(row.id),
                                    Array.isArray(list)
                                        ? list.map((activity) => normalizeActivityWithTask(activity, row))
                                        : [],
                                ];
                            } catch {
                                return [String(row.id), []];
                            }
                        }),
                    );
                    setActivitiesByTask(Object.fromEntries(entries));
                } catch (e) {
                    console.error('Failed to load all tasks', e);
                }
            })();
            return;
        }

        // Handle ACTIVITY TRAP tab - show tasks without goals from ALL key areas (no key area filter)
        if (viewTab === 'activity-trap') {
            (async () => {
                try {
                    const svc = await getTaskService();
                    // Load all tasks without goals (empty keyAreaId = all key areas)
                    const trapTasks = await svc.list({ withoutGoal: true });
                    setAllTasks(trapTasks || []);
                    
                    // Load activities for all trap tasks
                    const actSvc = await getActivityService();
                    const entries = await Promise.all(
                        (trapTasks || []).map(async (row) => {
                            try {
                                const list = await actSvc.list({ taskId: row.id });
                                return [
                                    String(row.id),
                                    Array.isArray(list)
                                        ? list.map((activity) => normalizeActivityWithTask(activity, row))
                                        : [],
                                ];
                            } catch {
                                return [String(row.id), []];
                            }
                        }),
                    );
                    setActivitiesByTask(Object.fromEntries(entries));
                } catch (e) {
                    console.error('Failed to load activity trap tasks', e);
                }
            })();
            return;
        }
        
        // For ACTIVE TASKS - require selected key area
        if (!selectedKA) return;
        (async () => {
            const opts = { keyAreaId: selectedKA.id };
            const t = await api.listTasks(selectedKA.id, opts);
            setAllTasks(t);
            // Reload activities for the filtered tasks
            try {
                const svc = await getActivityService();
                const entries = await Promise.all(
                    (t || []).map(async (row) => {
                        try {
                            const list = await svc.list({ taskId: row.id });
                            return [String(row.id), Array.isArray(list) ? list.map(normalizeActivity) : []];
                        } catch {
                            return [String(row.id), []];
                        }
                    }),
                );
                setActivitiesByTask(Object.fromEntries(entries));
            } catch (e) {
                // ignore activity load failures
            }
        })();
    }, [viewTab, activeFilter, selectedKA?.id, currentUserId, navigate]);
    
    const [activityAttachTaskId, setActivityAttachTaskId] = useState(null);
    // Toasts and saving state for activity updates
    const { addToast } = useToast ? useToast() : { addToast: () => {} };
    const [savingActivityIds, setSavingActivityIds] = useState(new Set());
    const [isSavingActivity, setIsSavingActivity] = useState(false);

    // Open global activity composer on request (from various UI spots)
    useEffect(() => {
        const handler = (e) => {
            const tid = e?.detail?.taskId ?? null;
            // debug: log event reception
            // eslint-disable-next-line no-console
            console.log('ka-open-activity-composer received', { tid });
            // Reset editing state
            setEditingActivityId(null);

            // If a taskId was provided, try to find the parent task so we can prefill
            // the activity's Key Area, List and Task selection in the composer modal.
            const parent = tid ? (allTasks || []).find((t) => String(t.id) === String(tid)) : null;

            setActivityForm({
                title: "",
                description: "",
                // Prefill list and key area from parent task when available
                list: parent ? (parent.list || parent.list_index || parent.listIndex || '') : '',
                key_area_id: parent ? (parent.key_area_id || parent.keyAreaId || parent.keyArea || selectedKA?.id || null) : (selectedKA?.id || null),
                assignee: parent ? (parent.assignee || '') : '',
                priority: "normal",
                goal: "",
                start_date: "",
                end_date: "",
                deadline: "",
                finish_date: "",
                duration: "",
                _endAuto: true,
                // Also set the taskId so the Task dropdown is preselected
                taskId: parent ? String(parent.id || parent.taskId || parent.task_id || '') : (tid ? String(tid) : ''),
            });

            setActivityAttachTaskId(tid ? String(tid) : null);
            setShowActivityComposer(true);
        };
        window.addEventListener("ka-open-activity-composer", handler);
        return () => window.removeEventListener("ka-open-activity-composer", handler);
    }, [selectedKA, allTasks]);

    // Open task editor (reuse Add Task modal) populated for editing
    useEffect(() => {
        const handler = (e) => {
            const task = e?.detail?.task;
            if (!task) return;
            // Prefill form from task
            const mapPriority = (p) => {
                const v = String(p || "normal").toLowerCase();
                if (v === "med" || v === "medium" || v === "normal") return "normal";
                if (v === "low") return "low";
                if (v === "high") return "high";
                return "normal";
            };
                        setTaskForm({
                // include id so edit modals receive a usable identifier for update flows
                id: task.id || task.taskId || task.task_id || task._id || null,
                title: task.title || "",
                description: task.description || "",
                list_index: task.list_index || 1,
                category: task.category || "Key Areas",
                goal_id: task.goal_id || "",
                start_date: toDateOnly(task.start_date) || "",
                deadline: toDateOnly(task.deadline) || "",
                end_date: toDateOnly(task.end_date) || "",
                                            status: task.status || "open",
                                            priority: (function(p) {
                                                const s = String(p || "normal").toLowerCase();
                                                if (s === "low" || s === "1") return 1;
                                                if (s === "high" || s === "3") return 3;
                                                return 2;
                                            })(task.priority),
                tags: task.tags || "",
                recurrence: task.recurrence || "",
                attachments: task.attachments || "",
                attachmentsFiles: task.attachments
                    ? task.attachments
                          .split(",")
                          .filter(Boolean)
                          .map((n) => ({ name: n }))
                    : [],
                assignee: task.assignee || "",
                key_area_id: task.key_area_id || selectedKA?.id || null,
                list: "",
                finish_date: "",
                duration: task.duration || "",
                _endAuto: false, // avoid auto-mirroring on edit
            });
            setEditingTaskId(task.id);
            setShowTaskComposer(true);
        };
        window.addEventListener("ka-open-task-editor", handler);
        return () => window.removeEventListener("ka-open-task-editor", handler);
    }, [selectedKA]);

    // Debug: log when the composer visibility changes so we can confirm
    useEffect(() => {
        // eslint-disable-next-line no-console
        console.log('showActivityComposer changed', { showActivityComposer });
    }, [showActivityComposer]);

    // control whether the external EditActivityModal is shown directly
    const [showEditActivityModal, setShowEditActivityModal] = useState(false);

    // Open activity editor — instead of the activity modal we reuse the Task composer modal
    // to give the activity a richer edit surface. We map activity -> taskForm and set
    // `editingActivityViaTaskModal` so the task submit handler knows to persist to activity service.
    useEffect(() => {
        const handler = (e) => {
            // Debug: log when the editor event is received and its payload
            // eslint-disable-next-line no-console
            console.log('KeyAreas: ka-open-activity-editor received', { detail: e && e.detail });
            const activity = e?.detail?.activity;
            if (!activity) return;
            const tid = e?.detail?.taskId ?? null;
            setActivityAttachTaskId(tid ? String(tid) : null);
            // Normalize incoming activity fields so aliases are consistent
            const norm = normalizeActivity(activity || {});
            const mapPriority = (v) => {
                const n = Number(v);
                if (!Number.isNaN(n)) return n === 3 ? "high" : n === 1 ? "low" : "normal";
                return String(v || "normal").toLowerCase();
            };

            // Ensure parent task is available in allTasks so the modal can look it up
            (async () => {
                try {
                    const tidVal = tid ? String(tid) : (norm.taskId || norm.task_id || norm.task || null);
                    if (tidVal) {
                        const exists = (allTasks || []).some((t) => String(t.id) === String(tidVal));
                        if (!exists) {
                            try {
                                const tsvc = await getTaskService();
                                const fetched = await tsvc.get(String(tidVal));
                                if (fetched && fetched.id) {
                                    setAllTasks((prev) => {
                                        const copy = Array.isArray(prev) ? prev.slice() : [];
                                        copy.unshift(fetched);
                                        return copy;
                                    });
                                }
                            } catch (e) {}
                        }
                    }
                } catch (e) {}
            })();

            // Populate taskForm with normalized activity values so the Task composer UI is reused
            setTaskForm({
                id: norm.id || null,
                title: norm.text || "",
                description: norm.description || norm.notes || "",
                list_index: norm.list || norm.list_index || 1,
                category: "Key Areas",
                goal_id: norm.goal || norm.goalId || norm.goal_id || "",
                start_date: toDateOnly(norm.start_date) || "",
                deadline: toDateOnly(norm.deadline) || "",
                end_date: toDateOnly(norm.end_date) || "",
                status: norm.completed ? "done" : "open",
                priority: (function(p) {
                    const s = String(p || "normal").toLowerCase();
                    if (s === "low" || s === "1") return 1;
                    if (s === "high" || s === "3") return 3;
                    return 2;
                })(norm.priority),
                tags: "",
                recurrence: "",
                attachments: "",
                attachmentsFiles: [],
                assignee: norm.assignee || norm.responsible || "",
                key_area_id: norm.key_area_id || selectedKA?.id || null,
                list: norm.list || "",
                finish_date: toDateOnly(norm.completionDate) || "",
                duration: norm.duration || "",
                _endAuto: false,
            });
            // Also set activityForm so the dedicated activity editor modal can be used
            setActivityForm({
                title: norm.text || "",
                description: norm.description || norm.notes || "",
                list: norm.list || "",
                key_area_id: norm.key_area_id || selectedKA?.id || null,
                assignee: norm.assignee || norm.responsible || "",
                priority: (function(p) {
                    const s = String(p || "normal").toLowerCase();
                    if (s === "low" || s === "1") return 1;
                    if (s === "high" || s === "3") return 3;
                    return 2;
                })(norm.priority),
                goal: norm.goal || "",
                start_date: toDateOnly(norm.start_date) || "",
                end_date: toDateOnly(norm.end_date) || "",
                deadline: toDateOnly(norm.deadline) || "",
                finish_date: toDateOnly(norm.completionDate) || "",
                duration: norm.duration || "",
                _endAuto: false,
            });
            // track that we're editing an activity
            setEditingActivityViaTaskModal({ id: activity.id, taskId: tid ? String(tid) : null });
            setEditingTaskId(null);
            // make sure any open activity composer (Add Activity) or task composer is closed
            // so only the dedicated EditActivityModal is shown
            setShowActivityComposer(false);
            setShowTaskComposer(false);
            // Debug: log that we will open the EditActivityModal and the ids involved
            // eslint-disable-next-line no-console
            console.log('KeyAreas: opening EditActivityModal', { activityId: activity.id, taskId: tid });
            // open external EditActivityModal directly instead of the Task composer
            setShowEditActivityModal(true);
        };
        window.addEventListener("ka-open-activity-editor", handler);
        return () => window.removeEventListener("ka-open-activity-editor", handler);
    }, [selectedKA]);

    useEffect(() => {
        (async () => {
            try {
                const uSvc = await getUsersService();
                const list = await uSvc.list();
                setUsers(Array.isArray(list) ? list : []);
            } catch {
                setUsers([]);
            }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const pSvc = await getUserProfileService();
                const profile = await pSvc.getProfile();
                const id = profile?.id || profile?.userId || profile?.sub || null;
                if (id) setCurrentUserId(id);
            } catch {
                // Keep null if profile fetch fails; auth guard will redirect on 401.
            }
        })();
    }, []);

    // small helper to mark a task as saving for UI feedback
    const markSaving = (id, timeout = 1200) => {
        try {
            setSavingIds((s) => new Set([...s, id]));
            if (timeout) {
                setTimeout(() => setSavingIds((s) => {
                    const copy = new Set(s);
                    copy.delete(id);
                    return copy;
                }), timeout);
            }
        } catch (e) {}
    };

    // Inline single-field update with optimistic UI (used by TaskRow)
    const updateField = async (id, key, value) => {
        const prev = Array.isArray(allTasks) ? allTasks.slice() : [];
        const prevTask = prev.find((t) => t.id === id);
        if (!prevTask) return;

        // optimistic transform
        const optimistic = (t) => {
            if (t.id !== id) return t;
            if (key === 'priority') {
                try { return { ...t, priority: getPriorityLevel(value) }; } catch (e) { return { ...t, priority: value }; }
            }
            return { ...t, [key]: value };
        };
        setAllTasks((prev) => prev.map(optimistic));
        markSaving(id, 2000);

        // build patch
        const patch = {};
        if (key === 'name') patch.title = value;
        else if (key === 'notes') patch.description = value;
        else if (key === 'assignee') patch.assignee = value;
        else if (key === 'start_date') patch.startDate = value ? new Date(value).toISOString() : null;
        else if (key === 'end_date') patch.endDate = value ? new Date(value).toISOString() : null;
        else if (key === 'dueDate' || key === 'deadline') patch.dueDate = value ? new Date(value).toISOString() : null;
        else if (key === 'duration') patch.duration = value;
        else if (key === 'priority') patch.priority = value;
        else if (key === 'status') patch.status = value;
        else {
            // UI-only field; nothing to persist
            return;
        }

        try {
            const updated = await api.updateTask(id, patch);
            // api.updateTask returns normalized UI-friendly task shape
            setAllTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
            setSelectedTaskFull((prevFull) =>
                prevFull && String(prevFull.id) === String(id) ? { ...prevFull, ...updated } : prevFull,
            );
            markSaving(id);
        } catch (err) {
            console.error('[KeyAreas] Failed to update task field', err);
            setAllTasks(prev);
            try { addToast && addToast({ type: 'error', message: err?.message || 'Failed to save' }); } catch (e) {}
        }
    };

    const [taskForm, setTaskForm] = useState({
        title: "",
        description: "",
        list_index: 1,
        category: "Key Areas",
        goal_id: "",
        start_date: "",
        deadline: "",
        end_date: "",
        status: "open",
        priority: "normal",
        tags: "",
        recurrence: "",
        attachments: "",
        attachmentsFiles: [],
        assignee: "",
        _endAuto: true, // internal flag: keep end date synced to start date until user changes it
    });

    // Activity composer form (mirrors task fields for UI consistency; most are UI-only)
    const [activityForm, setActivityForm] = useState({
        title: "",
        description: "",
        list: "",
        key_area_id: null,
        assignee: "",
        priority: "normal",
        goal: "",
        start_date: "",
        end_date: "",
        deadline: "",
        finish_date: "",
        duration: "",
        _endAuto: true,
    });

    // Expanded inline activities (tree mode) per task id
    const [expandedActivityRows, setExpandedActivityRows] = useState(new Set());
    const [editingActivity, setEditingActivity] = useState(null); // { taskId, id }
    const [openActivityDetails, setOpenActivityDetails] = useState(new Set()); // Set of activity ids for a given task row render
    // Sidebar sort: Alphabetical A→Z, with "Ideas" (or system default) always last
    const sortForSidebar = React.useCallback((arr) => {
        const items = Array.isArray(arr) ? arr.slice() : [];
        
        // Separate Ideas/default areas from regular areas
        const regularAreas = items.filter(item => {
            const isIdeas = (item.title || "").trim().toLowerCase() === "ideas" || !!item.is_default;
            return !isIdeas;
        });
        
        const ideasAreas = items.filter(item => {
            const isIdeas = (item.title || "").trim().toLowerCase() === "ideas" || !!item.is_default;
            return isIdeas;
        });
        
        // Sort regular areas by position
        const sortedRegular = regularAreas.sort((a, b) => (a.position || 0) - (b.position || 0));
        
        // Return regular areas first, then Ideas areas at the end (unordered)
        return [...sortedRegular, ...ideasAreas];
    }, []);
    const toggleActivitiesRow = (id) => {
        setExpandedActivityRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Activities associated to tasks: { [taskId]: Activity[] }
    const [activitiesByTask, setActivitiesByTask] = useState({});
    const [activityTaskId, setActivityTaskId] = useState("new");
    const [activityName, setActivityName] = useState("");

    // Helper: refresh activities for a specific task id
    const refreshActivitiesForTask = async (taskId) => {
        try {
            const svc = await getActivityService();
            const list = await svc.list({ taskId });
            // Diagnostic: log result length so we can tell if backend returned items
            try {
                console.info('KeyAreas.refreshActivitiesForTask', { taskId: String(taskId), returned: Array.isArray(list) ? list.length : 0 });
            } catch (__) {}
            setActivitiesByTask((prev) => ({ ...prev, [String(taskId)]: Array.isArray(list) ? list.map(normalizeActivity) : [] }));
        } catch (e) {
            console.error("Failed to refresh activities", e);
            setActivitiesByTask((prev) => ({ ...prev, [String(taskId)]: [] }));
        }
    };
    // Helper: refresh all tasks currently in state
    const refreshAllActivities = async () => {
        if (!Array.isArray(allTasks) || allTasks.length === 0) return;
        try {
            try { console.info('KeyAreas.refreshAllActivities starting', { taskCount: allTasks.length }); } catch (__) {}
            const svc = await getActivityService();
            const entries = await Promise.all(
                allTasks.map(async (t) => {
                    try {
                        const list = await svc.list({ taskId: t.id });
                        try { console.info('KeyAreas.refreshAllActivities.item', { taskId: String(t.id), returned: Array.isArray(list) ? list.length : 0 }); } catch (__) {}
                        return [String(t.id), Array.isArray(list) ? list.map(normalizeActivity) : []];
                    } catch {
                        return [String(t.id), []];
                    }
                }),
            );
            const grouped = Object.fromEntries(entries);
            try { console.info('KeyAreas.refreshAllActivities completed', { loadedTaskKeys: Object.keys(grouped).length }); } catch (__) {}
            setActivitiesByTask(grouped);
        } catch (e) {
            console.error("Failed to load activities for tasks", e);
        }
    };
    // On mount and when tasks change, refresh activities
    useEffect(() => {
        refreshAllActivities();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allTasks.length]);
    // Listen for refresh events from slide-over
    useEffect(() => {
        const handler = (e) => {
            if (e?.detail?.refresh) refreshAllActivities();
        };
        window.addEventListener("ka-activities-updated", handler);
        return () => window.removeEventListener("ka-activities-updated", handler);
    }, []);

    // Ensure activities for the currently selected full-task view are loaded.
    // When a user clicks a task to open the full view, we may not have primed
    // activitiesByTask for that single task (for example when viewing 'All' or
    // when selectedKA is null). Load activities on demand when selectedTaskFull changes.
    useEffect(() => {
        if (!selectedTaskFull || !selectedTaskFull.id) return;
        const key = String(selectedTaskFull.id);
        try {
            const existing = activitiesByTask[key];
            if (!Array.isArray(existing) || existing.length === 0) {
                // fire-and-forget; helper already logs errors
                refreshActivitiesForTask(selectedTaskFull.id).catch((err) => {
                    console.error('Failed to load activities for selectedTaskFull', err);
                });
            }
        } catch (e) {
            // defensive: still attempt to fetch
            refreshActivitiesForTask(selectedTaskFull.id).catch((err) => console.error(err));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTaskFull && selectedTaskFull.id]);

    // Create task from activity / Convert activity to task
    useEffect(() => {
        const handler = async (e) => {
            const detail = e?.detail || {};
            const taskId = detail.taskId;
            const activity = detail.activity;
            if (!taskId || !activity) return;

            // Find parent task to inherit fields
            const parent = allTasks.find((t) => String(t.id) === String(taskId));
            if (!parent) return;
            const kaId = parent.key_area_id || selectedKA?.id;
            if (!kaId) return;

            // Use latest activity state to prevent duplicates
            const key = String(taskId);
            const currentArr = (activitiesByTask[key] || []).slice();
            const currentItem = currentArr.find((a) => String(a.id) === String(activity.id));
            if (currentItem && currentItem.created_task_id) {
                // Already converted/created => no-op
                return;
            }

            // Priority: normalize numeric/string to task schema ("low"|"med"|"high")
            const lvl = getPriorityLevel(activity.priority ?? parent.priority ?? "med");
            const prio = lvl === 3 ? "high" : lvl === 1 ? "low" : "med";

            // Map activity fields into a new task (use activity text as title)
            const payload = {
                key_area_id: kaId,
                title: (activity.text || activity.activity_name || "").trim() || "Untitled activity",
                description: (activity.notes || activity.text || "").trim() || `Created from activity in task "${parent.title || ""}"`,
                status: "open",
                priority: prio,
                category: parent.category || "Key Areas",
                goal_id: parent.goal_id || "",
                list_index: parent.list_index || 1,
                start_date: toDateOnly(activity.date_start) || parent.start_date || "",
                deadline: toDateOnly(activity.deadline) || parent.deadline || "",
                end_date: toDateOnly(activity.date_end) || "",
                tags: parent.tags || "",
                recurrence: "",
                attachments: "",
                assignee: activity.responsible || parent.assignee || "",
            };

            try {
                const created = await api.createTask(payload);
                setAllTasks((prev) => [...prev, created]);

                // Mark activity as already used to create a task
                setActivitiesByTask((prev) => {
                    const arr = (prev[key] || []).map((a) =>
                        String(a.id) === String(activity.id)
                            ? { ...a, created_task_id: created.id, created_task_at: Date.now() }
                            : a,
                    );
                    return { ...prev, [key]: arr };
                });

                // Determine whether to remove the original activity. If the event provided
                // an explicit `remove` flag use it, otherwise fall back to a confirmation.
                const shouldRemove = typeof detail.remove === 'boolean' ? detail.remove : window.confirm(
                    "Task created. Do you want to remove the original activity (convert)?",
                );
                if (shouldRemove) {
                    try {
                        const svc = await getActivityService();
                        await svc.remove(activity.id);
                    } catch (err) {
                        console.error('Failed to remove activity after convert', err);
                    }
                    setActivitiesByTask((prev) => {
                        const arr = (prev[key] || []).filter((a) => String(a.id) !== String(activity.id));
                        return { ...prev, [key]: arr };
                    });
                    // notify other views
                    window.dispatchEvent(new CustomEvent('ka-activities-updated', { detail: { refresh: true, taskId } }));
                } else {
                    // Keep the activity but mark it as having an associated created task
                    setActivitiesByTask((prev) => {
                        const arr = (prev[key] || []).map((a) =>
                            String(a.id) === String(activity.id)
                                ? { ...a, created_task_id: created.id, created_task_at: Date.now() }
                                : a,
                        );
                        return { ...prev, [key]: arr };
                    });
                }
            } catch (err) {
                console.error("Failed creating task from activity", err);
            }
        };
        window.addEventListener("ka-create-task-from-activity", handler);
        return () => window.removeEventListener("ka-create-task-from-activity", handler);
    }, [allTasks, selectedKA, activitiesByTask]);

    // When the composer opens, ensure the visible tab matches the composer list_index
    useEffect(() => {
        if (showTaskComposer) {
            const idx = Number(taskForm?.list_index || 1);
            if (taskTab !== idx) setTaskTab(idx);
        }
    }, [showTaskComposer]);

    // If the user switches tabs while the composer is open, keep the composer list_index in sync
    useEffect(() => {
        if (showTaskComposer) {
            setTaskForm((s) => ({ ...s, list_index: taskTab }));
        }
    }, [taskTab]);

    // When start_date changes while auto mode is on (or end_date empty), mirror to end_date
    useEffect(() => {
        if (!showTaskComposer) return;
        setTaskForm((s) => {
            const start = s.start_date || "";
            if (s._endAuto || !s.end_date) {
                return { ...s, end_date: start };
            }
            return s;
        });
    }, [taskForm.start_date, showTaskComposer]);

    // Mirror start -> end for Activity composer
    useEffect(() => {
        if (!showActivityComposer) return;
        setActivityForm((s) => {
            const start = s.start_date || "";
            if (s._endAuto || !s.end_date) {
                return { ...s, end_date: start };
            }
            return s;
        });
    }, [activityForm.start_date, showActivityComposer]);

    // Auto-hide mass edit when selection is cleared
    useEffect(() => {
        if (selectedIds.size === 0) {
            if (showMassEdit) setShowMassEdit(false);
            if (showMassEditModal) setShowMassEditModal(false);
        }
    }, [selectedIds, showMassEdit, showMassEditModal]);

    useEffect(() => {
        (async () => {
            try {
                const [kas, gs] = await Promise.all([api.listKeyAreas(), api.listGoals()]);
                // Ensure Ideas always has position 10
                const processedKas = (kas || []).map(ka => {
                    const isIdeas = (ka.title || "").trim().toLowerCase() === "ideas" || !!ka.is_default;
                    if (isIdeas) {
                        return { ...ka, position: 10 };
                    }
                    return ka;
                });
                const sorted = processedKas.slice().sort((a, b) => (a.position || 0) - (b.position || 0));
                setKeyAreas(sorted);
                // Do not persist key areas in localStorage; always rely on backend
                // emit key areas so sidebar can populate its dropdown
                try {
                    const sidebarList = sortForSidebar(sorted);
                    window.dispatchEvent(
                        new CustomEvent("sidebar-keyareas-data", { detail: { keyAreas: sidebarList } }),
                    );
                } catch (e) {
                    // ignore if window not available or dispatch fails
                }
                setGoals(gs || []);
                setLoading(false);
            } catch (e) {
                const status = e?.response?.status;
                if (status === 401) {
                    window.location.hash = "#/login";
                    return;
                }
                setLoading(false);
            }
        })();
    }, []);

    // Close activities popover on Escape
    useEffect(() => {
        if (!openActivitiesMenu) return;
        const onKey = (e) => {
            if (e.key === "Escape") setOpenActivitiesMenu(null);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [openActivitiesMenu]);

    // no global listeners needed for initial tab

    // Removed: do not prime sidebar from cache; rely on backend

    // Re-emit to Sidebar whenever the in-memory list changes (after edits/deletes)
    useEffect(() => {
        if (loading) return;
        try {
            const sidebarList = sortForSidebar(keyAreas);
            window.dispatchEvent(new CustomEvent("sidebar-keyareas-data", { detail: { keyAreas: sidebarList } }));
        } catch (e) {}
    }, [keyAreas, loading]);

    // If navigated with openKA=1 but no specific ?ka, pick the first KA and open it.
    useEffect(() => {
        const isOnKeyAreas = location.pathname && location.pathname.startsWith("/key-areas");
        if (!isOnKeyAreas) return;
        const params = new URLSearchParams(location.search || "");
        const hasOpenKA = params.get("openKA") === "1";
        const hasKASelected = Boolean(params.get("ka"));
        if (!hasOpenKA || hasKASelected) return;
        if (!keyAreas || keyAreas.length === 0) return;
        // Prefer first non-Ideas KA; fallback to absolute first by position
        const sorted = [...keyAreas].sort((a, b) => (a.position || 0) - (b.position || 0));
        const firstNonIdeas = sorted.find((k) => !((k.title || "").toLowerCase() === "ideas" || k.is_default));
        const first = firstNonIdeas || sorted[0];
        if (!first?.id) return;
        const next = new URLSearchParams(location.search || "");
        next.set("ka", String(first.id));
        next.set("openKA", "1");
        navigate({ pathname: "/key-areas", search: `?${next.toString()}` }, { replace: true });
        try {
            window.dispatchEvent(new CustomEvent("sidebar-open-ka", { detail: { id: first.id } }));
        } catch (e) {}
    }, [location.pathname, location.search, keyAreas, navigate]);

    // close view dropdown on outside click or Escape
    useEffect(() => {
        if (!showViewMenu) return;
        const handleClick = (e) => {
            if (!viewMenuRef.current) return;
            if (!viewMenuRef.current.contains(e.target)) setShowViewMenu(false);
        };
        const handleKey = (e) => {
            if (e.key === "Escape") setShowViewMenu(false);
        };
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [showViewMenu]);

    // close columns (gear) menu on outside click or Escape
    useEffect(() => {
        if (!showColumnsMenu) return;
        const handleClick = (e) => {
            if (columnsMenuRef.current && columnsMenuRef.current.contains(e.target)) return;
            if (columnsMenuPopupRef.current && columnsMenuPopupRef.current.contains(e.target)) return;
            setShowColumnsMenu(false);
        };
        const handleKey = (e) => {
            if (e.key === "Escape") setShowColumnsMenu(false);
        };
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [showColumnsMenu]);

    // When columns menu is open, reposition it on scroll/resize so it follows the gear button
    useEffect(() => {
        if (!showColumnsMenu) return;
        let raf = null;
        const updateAnchor = () => {
            if (!columnsButtonRef.current) return;
            try {
                const rect = columnsButtonRef.current.getBoundingClientRect();
                const menuWidth = 224; // matches w-56
                const left = Math.max(8, rect.right - menuWidth + window.scrollX);
                const top = rect.bottom + window.scrollY + 6;
                setColumnsAnchor({ left, top });
            } catch (e) {}
        };
        const onScrollOrResize = () => {
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(updateAnchor);
        };
        window.addEventListener('scroll', onScrollOrResize, { passive: true });
        window.addEventListener('resize', onScrollOrResize);
        // update immediately
        updateAnchor();
        return () => {
            if (raf) cancelAnimationFrame(raf);
            window.removeEventListener('scroll', onScrollOrResize);
            window.removeEventListener('resize', onScrollOrResize);
        };
    }, [showColumnsMenu]);

    // close list ellipsis menu on outside click or Escape (based on the tabs container)
    useEffect(() => {
        if (openListMenu == null) return;
        const handleClick = (e) => {
            if (!tabsRef.current) return;
            if (!tabsRef.current.contains(e.target)) setOpenListMenu(null);
        };
        const handleKey = (e) => {
            if (e.key === "Escape") setOpenListMenu(null);
        };
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [openListMenu]);

    // also close when switching KA or view
    useEffect(() => {
        setShowViewMenu(false);
    }, [selectedKA, view]);

    // Close list menu on outside click or Escape
    useEffect(() => {
        if (openListMenu == null) return;
        const handleClick = (e) => {
            if (!tabsRef.current) return;
            if (!tabsRef.current.contains(e.target)) setOpenListMenu(null);
        };
        const handleKey = (e) => {
            if (e.key === "Escape") setOpenListMenu(null);
        };
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [openListMenu]);

    // Close Add Task modal on Escape
    useEffect(() => {
        if (!showTaskComposer) return;
        const onKey = (e) => {
            if (e.key === "Escape") {
                setShowTaskComposer(false);
                setEditingTaskId(null);
                setEditingActivityViaTaskModal(null);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [showTaskComposer]);

    // keep list names in state from backend
    useEffect(() => {
        // when key areas load, prime listNames map
        if (!Array.isArray(keyAreas) || keyAreas.length === 0) return;
        const m = {};
        keyAreas.forEach((ka) => {
            if (ka && ka.id) m[ka.id] = { ...(ka.listNames || {}) };
        });
        setListNames(m);
    }, [keyAreas]);

    // reset activities selector when switching key areas
    useEffect(() => {
        setActivityTaskId("new");
    }, [selectedKA]);

    // when a task is opened, default the activities selector to that task (if it belongs to the current KA)
    useEffect(() => {
        if (selectedTask && selectedKA && String(selectedTask.key_area_id) === String(selectedKA.id)) {
            setActivityTaskId(String(selectedTask.id));
        } else if (!selectedTask) {
            setActivityTaskId("new");
        }
    }, [selectedTask, selectedKA]);

    // React to sidebar clicks and query params: show all key areas or select Ideas
    useEffect(() => {
        const showAll = () => {
            setSelectedKA(null);
            setAllTasks([]);
            setFilter("");
        };

        const selectIdeas = async () => {
            if (loading) return;
            const found = keyAreas.find((k) => k.title?.toLowerCase() === "ideas" || k.is_default);
            // do NOT open the Ideas area; instead show it in the main list and make it read-only
            if (found) {
                setSelectedKA(null);
                setAllTasks([]);
                setFilter(found.title || "Ideas");
            } else {
                // If not found yet, avoid injecting synthetic items; wait for backend load
                return;
            }
        };

        window.addEventListener("sidebar-keyareas-click", showAll);
        window.addEventListener("sidebar-ideas-click", selectIdeas);
        
        // Listen for reorder events from sidebar drag-drop
        const handleSidebarReorder = async (e) => {
            const reorderedKAs = e?.detail?.keyAreas;
            if (Array.isArray(reorderedKAs)) {
                // Update local keyAreas state with the new order from sidebar
                setKeyAreas(reorderedKAs);
                // Persist the new order to backend
                try {
                    const svc = await getKeyAreaService();
                    const changed = reorderedKAs.filter((ka, idx) => {
                        const oldKa = keyAreas[idx];
                        return !oldKa || oldKa.id !== ka.id || oldKa.position !== ka.position;
                    });
                    if (changed.length > 0) {
                        await svc.reorder(changed);
                    }
                } catch (err) {
                    console.warn("Failed to persist sidebar reorder:", err);
                }
            }
        };
        window.addEventListener("sidebar-keyareas-reorder", handleSidebarReorder);

        // also respect query params when navigated via Link
        const params = new URLSearchParams(location.search);
        if (params.get("view") === "all") showAll();
        if (params.get("select") === "ideas") selectIdeas();

        return () => {
            window.removeEventListener("sidebar-keyareas-click", showAll);
            window.removeEventListener("sidebar-ideas-click", selectIdeas);
            window.removeEventListener("sidebar-keyareas-reorder", handleSidebarReorder);
        };
    }, [keyAreas, loading, location.search]);

    // storage picker removed

    const nonIdeasCount = useMemo(
        () => keyAreas.filter((k) => (k.title || "").toLowerCase() !== "ideas" && !k.is_default).length,
        [keyAreas],
    );
    // Allow up to 9 additional key areas besides Ideas
    const canAdd = useMemo(() => nonIdeasCount < 9, [nonIdeasCount]);

    const filteredKAs = useMemo(() => {
        const q = filter.trim().toLowerCase();
        const params = new URLSearchParams(location.search);
        const explicitSelect = params.get("select");

        // If the URL explicitly requests Ideas, show only Ideas
        if (explicitSelect === "ideas") {
            return keyAreas.filter((k) => (k.title || "").toLowerCase() === "ideas" || k.is_default);
        }

        // Modified: Include ALL key areas (including Ideas) and let the sorting handle the order
        const base = keyAreas; // Changed from filtering out Ideas
        if (!q) return base;
        return base.filter((k) => k.title.toLowerCase().includes(q) || (k.description || "").toLowerCase().includes(q));
    }, [keyAreas, filter]);

    const paramsForRender = new URLSearchParams(location.search);
    const showOnlyIdeas = paramsForRender.get("select") === "ideas";
    const ideaForShow = keyAreas.find((k) => (k.title || "").toLowerCase() === "ideas") || null;

    const onSaveKA = async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const payload = {
            title: form.get("title").toString().trim(),
            description: form.get("description").toString().trim(),
            color: form.get("color").toString().trim() || "#3B82F6",
        };
        if (!payload.title) return;

        if (editing) {
            // Update all fields including color
            const updated = await api.updateKeyArea(editing.id, {
                title: payload.title,
                description: payload.description,
                color: payload.color,
            });
                setKeyAreas((prev) => prev.map((k) => (k.id === editing.id ? { 
                    ...k, 
                    title: payload.title,
                    description: payload.description,
                    color: payload.color,
                    ...updated 
                } : k)));
            // emit updated list for sidebar (alphabetical with Ideas last)
            try {
                    const updatedList = (keyAreas || []).map((k) => (k.id === editing.id ? { 
                        ...k, 
                        title: payload.title,
                        description: payload.description,
                        color: payload.color,
                        ...updated 
                    } : k));
                const sidebarList = sortForSidebar(updatedList);
                window.dispatchEvent(new CustomEvent("sidebar-keyareas-data", { detail: { keyAreas: sidebarList } }));
            } catch (e) {}
        } else {
            // Only consider non-default, non-Ideas key areas for positions 1..9
            const isRegular = (k) => (k.title || "").toLowerCase() !== "ideas" && !k.is_default;
            const used = new Set(keyAreas.filter(isRegular).map((k) => k.position));
            let pos = 1;
            while (used.has(pos) && pos <= 9) pos++;
            try {
                const created = await api.createKeyArea({
                    title: payload.title,
                    description: payload.description,
                    color: payload.color,
                    position: pos,
                    is_default: false,
                });
                setKeyAreas((prev) => {
                    const regular = prev.filter(isRegular);
                    const others = prev.filter((k) => !isRegular(k));
                    const nextRegular = [
                        ...regular.filter((k) => k.position !== pos),
                        { ...created, position: pos },
                    ].sort((a, b) => (a.position || 0) - (b.position || 0));
                    return [...others, ...nextRegular].sort((a, b) => (a.position || 0) - (b.position || 0));
                });
                // emit updated list after create
                try {
                    const regular = (keyAreas || []).filter(isRegular);
                    const others = (keyAreas || []).filter((k) => !isRegular(k));
                    const nextRegular = [
                        ...regular.filter((k) => k.position !== pos),
                        { ...created, position: pos },
                    ].sort((a, b) => (a.position || 0) - (b.position || 0));
                    const after = [...others, ...nextRegular];
                    const sidebarList = sortForSidebar(after);
                    window.dispatchEvent(
                        new CustomEvent("sidebar-keyareas-data", { detail: { keyAreas: sidebarList } }),
                    );
                } catch (e) {}
            } catch (err) {
                const msg = err?.response?.data?.message || err?.message || "Action not allowed";
                alert(`Cannot create key area: ${msg}`);
            }
        }
        setShowForm(false);
        setEditing(null);
    };

    const onDeleteKA = async (ka) => {
        if (ka.is_default) return;
        // Warn if tasks exist but allow user to attempt deletion (server will enforce)
        const isSelected = selectedKA?.id && String(selectedKA.id) === String(ka.id);
        const loadedCount = isSelected && Array.isArray(allTasks) ? allTasks.length : 0;
        const serverCount = typeof ka.taskCount === "number" ? ka.taskCount : 0;
        const effectiveCount = Math.max(loadedCount, serverCount);

        let proceed = true;
        if (effectiveCount > 0) {
            proceed = confirm(
                `"${ka.title}" has ${effectiveCount} task(s).\n` +
                    `You need to move or delete these tasks first.\n\n` +
                    `Do you still want to try deleting the key area now?`,
            );
            if (!proceed) return;
        } else {
            proceed = confirm(`Delete "${ka.title}"?`);
            if (!proceed) return;
        }
        try {
            await api.deleteKeyArea(ka.id);
            const next = (keyAreas || []).filter((k) => k.id !== ka.id);
            setKeyAreas(next);
            try {
                const sidebarList = sortForSidebar(next);
                window.dispatchEvent(new CustomEvent("sidebar-keyareas-data", { detail: { keyAreas: sidebarList } }));
            } catch (e) {}
            if (selectedKA?.id === ka.id) {
                setSelectedKA(null);
                setAllTasks([]);
            }
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                "This key area has tasks and cannot be deleted until tasks are moved or removed.";
            alert(`Cannot delete "${ka.title}": ${msg}`);
            // Optionally refresh key areas to show latest taskCount
            try {
                const fresh = await api.listKeyAreas();
                setKeyAreas(fresh);
            } catch {}
        }
    };

    // Drag-and-drop reorder helpers
    const [dragKAId, setDragKAId] = useState(null);
    const reorderByDrop = async (fromId, toId) => {
        if (!fromId || !toId || fromId === toId) return;
        const ordered = (keyAreas || [])
            .filter((k) => (k.title || "").toLowerCase() !== "ideas" && !k.is_default)
            .sort((a, b) => (a.position || 0) - (b.position || 0));
        const fromIdx = ordered.findIndex((k) => String(k.id) === String(fromId));
        const toIdx = ordered.findIndex((k) => String(k.id) === String(toId));
        if (fromIdx < 0 || toIdx < 0) return;
        const nextOrdered = ordered.slice();
        const [moved] = nextOrdered.splice(fromIdx, 1);
        nextOrdered.splice(toIdx, 0, moved);
        // Reassign positions 1..N
        const withPos = nextOrdered.map((k, i) => ({ ...k, position: i + 1 }));
        // Persist changes via bulk endpoint (falls back to per-item)
        const changed = withPos.filter((k, i) => ordered[i]?.id !== k.id || ordered[i]?.position !== k.position);
        try {
            if (changed.length) {
                const svc = await getKeyAreaService();
                await svc.reorder(changed);
            }
            // Update local state
            setKeyAreas((prev) => {
                const map = new Map(prev.map((x) => [String(x.id), { ...x }]));
                withPos.forEach((k) => map.set(String(k.id), { ...map.get(String(k.id)), position: k.position }));
                const next = Array.from(map.values()).sort((a, b) => (a.position || 0) - (b.position || 0));
                try {
                    const sidebarList = sortForSidebar(next);
                    window.dispatchEvent(
                        new CustomEvent("sidebar-keyareas-data", { detail: { keyAreas: sidebarList } }),
                    );
                } catch {}
                return next;
            });
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Could not reorder";
            alert(msg);
        }
    };

    // Reorder a non-Ideas key area up or down among slots 1-9
    const reorderKA = async (ka, direction = "up") => {
        if (!ka || ka.is_default || (ka.title || "").toLowerCase() === "ideas") return;
        const ordered = (keyAreas || [])
            .filter((k) => (k.title || "").toLowerCase() !== "ideas" && !k.is_default)
            .sort((a, b) => (a.position || 0) - (b.position || 0));
        const idx = ordered.findIndex((k) => String(k.id) === String(ka.id));
        if (idx < 0) return;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= ordered.length) return; // boundary
        const a = ordered[idx];
        const b = ordered[targetIdx];
        try {
            // swap positions and persist via bulk reorder
            const svc = await getKeyAreaService();
            await svc.reorder([
                { id: a.id, position: b.position },
                { id: b.id, position: a.position },
            ]);
            // update local state and emit
            setKeyAreas((prev) => {
                const map = new Map(prev.map((x) => [String(x.id), { ...x }]));
                const na = { ...map.get(String(a.id)), position: b.position };
                const nb = { ...map.get(String(b.id)), position: a.position };
                map.set(String(a.id), na);
                map.set(String(b.id), nb);
                const next = Array.from(map.values()).sort((x, y) => (x.position || 0) - (y.position || 0));
                try {
                    window.dispatchEvent(new CustomEvent("sidebar-keyareas-data", { detail: { keyAreas: next } }));
                } catch {}
                return next;
            });
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Could not reorder";
            alert(msg);
        }
    };

    // respond to sidebar open requests (if sidebar dispatches an event)
    useEffect(() => {
        const handler = (e) => {
            const id = e?.detail?.id;
            if (!id) return;
            const found = (keyAreas || []).find((k) => String(k.id) === String(id));
            if (found) openKA(found);
        };
        window.addEventListener("sidebar-open-ka", handler);
        return () => window.removeEventListener("sidebar-open-ka", handler);
    }, [keyAreas]);

    // respond to ?ka=<id> query param
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const kaParam = params.get("ka");
        const taskParam = params.get("task");
        if (kaParam && keyAreas.length) {
            const found = keyAreas.find((k) => String(k.id) === String(kaParam));
            // Only (re)open if it's a different KA than the current selection
            if (found && (!selectedKA || String(selectedKA.id) !== String(found.id))) {
                openKA(found);
            }
        }
        // If task param present and we already have selectedKA tasks loaded, open it
        if (taskParam && selectedKA && String(selectedKA.id) === String(kaParam)) {
            const tId = String(taskParam);
            const hit = (allTasks || []).find((t) => String(t.id) === tId);
            if (hit) setSelectedTaskFull(hit);
        }
    }, [location.search, keyAreas, selectedKA, allTasks]);

    const openKA = async (ka) => {
        // Close any open task full view when switching Key Areas
        setSelectedTaskFull(null);
        setSelectedKA(ka);
        // Load tasks based on the view mode (all vs activity-trap)
        const opts = {};
        if (viewTab === 'activity-trap') {
            opts.withoutGoal = true;
        }
        const t = await api.listTasks(ka.id, opts);
        try { console.info('KeyAreas.openKA loaded tasks', { kaId: String(ka.id), count: Array.isArray(t) ? t.length : 0, viewTab }); } catch (__) {}
        setAllTasks(t);
        // refresh activities for these tasks
        try {
            const svc = await getActivityService();
            const entries = await Promise.all(
                (t || []).map(async (row) => {
                    try {
                        const list = await svc.list({ taskId: row.id });
                        return [String(row.id), Array.isArray(list) ? list.map(normalizeActivity) : []];
                    } catch {
                        return [String(row.id), []];
                    }
                }),
            );
            setActivitiesByTask(Object.fromEntries(entries));
        } catch (e) {
            // ignore activity load failures; UI will show zeroes
        }
        setTaskTab(1);
        // Reset view tab to 'all' when opening a new key area
        setViewTab('all');
    setSearchTerm("");
    setSiteSearch("");
        setQuadrant("all");
        setView("list");
    setShowTaskComposer(false);
    setEditingActivityViaTaskModal(null);
        setExpandedActivityRows(new Set());
        setOpenActivityDetails(new Set());
        setEditingActivity(null);
    };

    const tabNumbers = useMemo(() => {
        const s = new Set([1]);
        allTasks.forEach((t) => s.add(t.list_index || 1));
        return Array.from(s).sort((a, b) => a - b);
    }, [allTasks]);

    // Determine how many lists to show in the left card for the selected KA.
    const leftListCount = useMemo(() => {
        const kaId = selectedKA?.id;
        const maxFromTabs = tabNumbers && tabNumbers.length ? Math.max(...tabNumbers) : 4;
        const nameKeys = kaId
            ? Object.keys(listNames[String(kaId)] || {})
                  .map((k) => Number(k))
                  .filter(Boolean)
            : [];
        const maxFromNames = nameKeys.length ? Math.max(...nameKeys) : 0;
        // Allow fewer than 4 when empty; always show at least 1 list
        return Math.max(1, maxFromTabs, maxFromNames);
    }, [selectedKA, listNames, tabNumbers]);

    // Available lists for the selected KA: union of tabs (used by tasks) and named lists.
    const availableListNumbers = useMemo(() => {
        const s = new Set(tabNumbers);
        const kaId = selectedKA?.id;
        if (kaId) {
            const nameKeys = Object.keys(listNames[String(kaId)] || {})
                .map((k) => Number(k))
                .filter(Boolean);
            nameKeys.forEach((n) => s.add(n));
        }
        const arr = Array.from(s);
        arr.sort((a, b) => a - b);
        return arr;
    }, [selectedKA, listNames, tabNumbers]);

    // Helpers to manage per-key-area list names
    const getListName = (kaId, n) => {
        if (!kaId) return `List ${n}`;
        const names = listNames[String(kaId)] || {};
        return names[String(n)] || `List ${n}`;
    };

    const renameList = async (n) => {
        if (!selectedKA) return;
        const current = getListName(selectedKA.id, n);
        const raw = prompt("Rename list", current);
        if (raw === null) return; // cancelled
        const val = String(raw || "").trim();
        if (!val) {
            alert("List name cannot be empty.");
            return;
        }
        const existingNames = Object.values(listNames[String(selectedKA.id)] || {});
        const hasDuplicate = existingNames.some(
            (name) => String(name || "").toLowerCase() === val.toLowerCase() && String(name) !== String(current),
        );
        if (hasDuplicate) {
            alert("A list with this name already exists in this Key Area.");
            return;
        }

        const prevMap = { ...(listNames[String(selectedKA.id)] || {}) };
        const newMap = { ...prevMap, [String(n)]: val };
        setListNames((prev) => ({ ...prev, [String(selectedKA.id)]: newMap }));
        setKeyAreas((prev) =>
            (prev || []).map((ka) =>
                String(ka.id) === String(selectedKA.id) ? { ...ka, listNames: newMap } : ka,
            ),
        );
        try {
            const svc = await getKeyAreaService();
            await svc.update(selectedKA.id, { listNames: newMap });
        } catch (e) {
            console.error("Failed to persist list names", e);
            setListNames((prev) => ({ ...prev, [String(selectedKA.id)]: prevMap }));
            setKeyAreas((prev) =>
                (prev || []).map((ka) =>
                    String(ka.id) === String(selectedKA.id) ? { ...ka, listNames: prevMap } : ka,
                ),
            );
            alert("Failed to save list name. Please try again.");
        }
    };

    const deleteList = async (n) => {
        if (!selectedKA) return;
        const kaId = selectedKA.id;
        // Only allow deletion if the list has no tasks
        const hasTasks = (allTasks || []).some(
            (t) => (t.list_index || 1) === n && String(t.key_area_id) === String(kaId),
        );
        if (hasTasks) {
            alert("This list contains tasks. Move or update those tasks to another list before deleting.");
            return;
        }
        const names = listNames[String(kaId)] || {};
        const hasCustomName = !!(names && names[String(n)]);
        const msg = hasCustomName
            ? `Delete custom name for list ${n}? Tasks in this list will not be affected.`
            : `Remove list ${n}? It will disappear since it has no tasks.`;
        if (!confirm(msg)) return;
        const { [String(n)]: _rem, ...rest } = names;
        const prevMap = { ...names };
        const prevTab = taskTab;
        const newMap = { ...rest };
        setListNames((prev) => ({ ...prev, [String(kaId)]: newMap }));
        setKeyAreas((prev) =>
            (prev || []).map((ka) =>
                String(ka.id) === String(kaId) ? { ...ka, listNames: newMap } : ka,
            ),
        );
        if (taskTab === n) setTaskTab(1);
        try {
            const svc = await getKeyAreaService();
            await svc.update(kaId, { listNames: newMap });
        } catch (e) {
            console.error("Failed to persist list names", e);
            setListNames((prev) => ({ ...prev, [String(kaId)]: prevMap }));
            setKeyAreas((prev) =>
                (prev || []).map((ka) =>
                    String(ka.id) === String(kaId) ? { ...ka, listNames: prevMap } : ka,
                ),
            );
            setTaskTab(prevTab);
            alert("Failed to delete list. Please try again.");
        }
    };

    const visibleTasks = useMemo(() => {
        const isSearch = String(siteSearch || "").trim().length >= 2;
        let arr = isSearch ? (searchResults || []) : allTasks.filter((t) => (t.list_index || 1) === taskTab);
        // If not showing completed items, filter them out
        // ALSO: if in 'active-tasks' tab and activeFilter is 'active', filter out completed tasks
        if (!showCompleted || (viewTab === 'active-tasks' && activeFilter === 'active')) {
            arr = arr.filter((t) => {
                const s = String((t.status || "").toLowerCase());
                const completed = s === 'done' || s === 'completed' || Boolean(t.completionDate);
                return !completed;
            });
        }
        if (!isSearch && searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            arr = arr.filter(
                (t) => (t.title || "").toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q),
            );
        }
        if (filterStatus && filterStatus !== "all") {
            const fs = String(filterStatus).toLowerCase();
            arr = arr.filter((t) => String(t.status || "").toLowerCase() === fs);
        }
        if (filterAssignee) {
            const fa = String(filterAssignee).toLowerCase();
            arr = arr.filter((t) => String(t.assignee || t.responsible || "").toLowerCase() === fa);
        }
        if (filterTag.trim()) {
            const ft = filterTag.trim().toLowerCase();
            arr = arr.filter((t) => String(t.tags || "").toLowerCase().includes(ft));
        }
        // Site-wide search already filtered by query in the async fetch; apply quadrant filter if set
        if (quadrant !== "all") arr = arr.filter((t) => String(t.eisenhower_quadrant || "") === quadrant);
        return arr;
    }, [allTasks, taskTab, searchTerm, quadrant, siteSearch, searchResults, showCompleted, filterStatus, filterAssignee, filterTag, viewTab, activeFilter]);

    const sortedTasks = useMemo(() => {
        const arr = Array.isArray(visibleTasks) ? visibleTasks.slice() : [];
        switch (sortBy) {
            case "date":
                arr.sort((a, b) => {
                    const ad = a.deadline || a.due_date || a.dueDate || a.end_date || null;
                    const bd = b.deadline || b.due_date || b.dueDate || b.end_date || null;
                    if (!ad && !bd) return 0;
                    if (!ad) return 1;
                    if (!bd) return -1;
                    return new Date(ad).getTime() - new Date(bd).getTime();
                });
                break;
            case "priority":
                arr.sort((a, b) => getPriorityLevel(b.priority) - getPriorityLevel(a.priority));
                break;
            case "status":
                {
                    const order = { open: 0, in_progress: 1, done: 2, completed: 2, cancelled: 3, blocked: 3 };
                    arr.sort(
                        (a, b) =>
                            (order[String(a.status || "").toLowerCase()] ?? 99) -
                            (order[String(b.status || "").toLowerCase()] ?? 99),
                    );
                }
                break;
            default:
                break;
        }
        return arr;
    }, [visibleTasks, sortBy]);

    // Debug traces removed: temporary logging used during goal/title load debugging cleared.

    // Build a visible-tasks array that includes a pre-resolved goal title when possible.
    const visibleTasksWithResolvedGoal = React.useMemo(() => {
        try {
            return (visibleTasks || []).map((t) => {
                const existing = t.resolvedGoalTitle || null;
                if (existing) return { ...t, resolvedGoalTitle: existing };
                // determine goal id from several shapes
                const gid = t.goal_id ?? t.goalId ?? (t.goal && (t.goal.id || t.goal.goal_id)) ?? null;
                if (gid === null || gid === undefined) return { ...t, resolvedGoalTitle: null };
                // lookup in the goalTitleMap (supports Map or plain object)
                let resolved = null;
                try {
                    if (goalTitleMap && typeof goalTitleMap.get === 'function') resolved = goalTitleMap.get(String(gid)) || null;
                    else if (goalTitleMap) resolved = goalTitleMap[String(gid)] || null;
                } catch (_) {
                    resolved = null;
                }
                return { ...t, resolvedGoalTitle: resolved };
            });
        } catch (_) {
            return visibleTasks || [];
        }
    }, [visibleTasks, goalTitleMap]);

    // Targeted, rate-limited diagnostic: log tasks that reference a goal but have no resolved title.
    React.useEffect(() => {
        try {
            const missing = (visibleTasksWithResolvedGoal || []).filter((t) => {
                const hasRef = !!(t.goal_id || t.goalId || (t.goal && (t.goal.id || t.goal.goal_id)));
                return hasRef && !t.resolvedGoalTitle;
            }).slice(0, 10).map((t) => ({ id: t.id, title: t.title, goalRef: t.goal_id || t.goalId || (t.goal && (t.goal.id || t.goal.goal_id)) }));
            if (missing && missing.length) {
                // use console.info for targeted diagnostics (kept small)
                console.info('KeyAreas: tasks with goal ref but missing resolved title', { time: new Date().toISOString(), count: missing.length, sample: missing });
            }
        } catch (_) {}
    }, [visibleTasksWithResolvedGoal, goals.length]);

    // Selection helpers
    const isSelected = (id) => selectedIds.has(id);
    const toggleSelect = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };
    const clearSelection = () => setSelectedIds(new Set());
    const selectAllVisible = () => {
        const all = new Set(selectedIds);
        const allSelected = sortedTasks.every((t) => all.has(t.id));
        if (allSelected) {
            // unselect all visible
            sortedTasks.forEach((t) => all.delete(t.id));
        } else {
            sortedTasks.forEach((t) => all.add(t.id));
        }
        setSelectedIds(all);
    };

    const selectedTasks = useMemo(
        () => (Array.isArray(sortedTasks) ? sortedTasks.filter((t) => selectedIds.has(t.id)) : []),
        [sortedTasks, selectedIds],
    );

    const applyBulkEdit = async (e) => {
        e.preventDefault();
        if (!selectedKA) return;
        if (selectedIds.size === 0) return;
        // Build patch of only provided fields
        const patch = {};
        if (bulkForm.assignee.trim()) patch.assignee = bulkForm.assignee.trim();
        if (bulkForm.status) patch.status = bulkForm.status;
        if (bulkForm.priority) {
            const p = String(bulkForm.priority).toLowerCase();
            patch.priority = p === "med" ? "medium" : p;
        }
        if (bulkForm.start_date) patch.start_date = toDateOnly(bulkForm.start_date);
        if (bulkForm.deadline) patch.deadline = toDateOnly(bulkForm.deadline);
        if (bulkForm.end_date) patch.end_date = toDateOnly(bulkForm.end_date);
        const hasAny = Object.keys(patch).length > 0;
        if (!hasAny) return;

        const updates = [];
        for (const id of Array.from(selectedIds)) {
            const original = allTasks.find((t) => String(t.id) === String(id));
            if (!original) continue;
            const next = { ...original, ...patch };
            next.eisenhower_quadrant = computeEisenhowerQuadrant({
                deadline: next.deadline,
                end_date: next.end_date,
                start_date: next.start_date,
                priority: next.priority,
                status: next.status,
                key_area_id: next.key_area_id,
            });
            // Persist
            // eslint-disable-next-line no-await-in-loop
            const saved = await api.updateTask(next.id, next);
            updates.push(saved);
        }
        // Update state in one pass
        setAllTasks((prev) => {
            const map = new Map(prev.map((t) => [String(t.id), t]));
            updates.forEach((u) => map.set(String(u.id), { ...map.get(String(u.id)), ...u }));
            return Array.from(map.values());
        });
        // Reset bulk form, hide bar, and clear selection to return to normal state
        setBulkForm({ assignee: "", status: "", priority: "", start_date: "", deadline: "", end_date: "" });
        setShowMassEdit(false);
        clearSelection();
    };

    const onCreateTask = async (e) => {
    e.preventDefault();
    if (!selectedKA && !editingTaskId && !editingActivityViaTaskModal) return;
    const f = new FormData(e.currentTarget);
        const title = (f.get("title") || "").toString().trim();
        if (!title) return;

        // Only the requested fields
        const description = (f.get("description") || "").toString();
        const list = (f.get("list") || "").toString(); // UI-only
        const assignee = (f.get("assignee") || "").toString();
        const priorityRaw = (f.get("priority") || "normal").toString().toLowerCase();
        const priority = priorityRaw === "normal" ? "medium" : priorityRaw; // map to API enum
        const goal = (f.get("goal") || "").toString(); // UI-only
        const start_date = f.get("start_date") ? toDateOnly(f.get("start_date")) : null;
        const end_date = f.get("end_date") ? toDateOnly(f.get("end_date")) : null;
        const deadline = f.get("deadline") ? toDateOnly(f.get("deadline")) : null;
        const finish_date = f.get("finish_date") ? toDateOnly(f.get("finish_date")) : null; // UI-only
        const duration = (f.get("duration") || "").toString();

        const payload = {
            key_area_id: editingTaskId ? taskForm.key_area_id || selectedKA?.id : selectedKA.id,
            title,
            description,
            assignee,
            start_date,
            end_date,
            deadline,
            duration,
            priority,
            // UI-only fields kept for potential future use; not persisted by backend
            list,
            goal,
            finish_date,
        };
        // Determine whether this submission is intended to edit an activity.
        // Prefer explicit FormData marker (set when opening via activity editor) as a fallback
        const isEditingActivity = !!editingActivityViaTaskModal || !!f.get('__editing_activity');
        // If we're editing an activity via the Task modal, translate payload and update the activity instead
        if (isEditingActivity) {
            try {
                const svc = await getActivityService();
                const activityId = (editingActivityViaTaskModal && editingActivityViaTaskModal.id) || null;
                // If state lost, attempt to find id via form (not ideal) — fallback: abort
                if (!activityId) {
                    console.error("No activity id available for activity edit");
                    alert("Could not determine which activity to update.");
                    return;
                }
                const mapPriorityToApi = (p) => {
                    if (p === undefined || p === null || p === '') return undefined;
                    const num = Number(p);
                    if (!Number.isNaN(num)) {
                        if (num <= 1) return "low";
                        if (num >= 3) return "high";
                        return "normal";
                    }
                    const s = String(p).toLowerCase();
                    if (s === "low" || s === "normal" || s === "high") return s;
                    if (s === "medium" || s === "med") return "normal";
                    return undefined;
                };
                const body = {
                    text: title,
                    completed: (f.get("status") || "open").toString() === "done",
                    priority: mapPriorityToApi(priority),
                };
                // attach to task if available
                const tid = editingActivityViaTaskModal.taskId || activityAttachTaskId || null;
                if (tid) body.taskId = tid;
                await svc.update(activityId, body);
                // refresh activity lists
                if (body.taskId) await refreshActivitiesForTask(body.taskId);
                else await refreshAllActivities();
                window.dispatchEvent(new CustomEvent("ka-activities-updated", { detail: { refresh: true, taskId: body.taskId || undefined } }));
                setEditingActivityViaTaskModal(null);
                setShowTaskComposer(false);
                return;
            } catch (err) {
                console.error("Failed to update activity via task modal", err);
                alert("Could not save activity.");
                return;
            }
        }
        if (editingTaskId) {
            // Update existing task
            const updated = await api.updateTask(editingTaskId, { id: editingTaskId, ...payload });
            setAllTasks((prev) => prev.map((t) => (String(t.id) === String(editingTaskId) ? { ...t, ...updated } : t)));
        } else {
            const created = await api.createTask(payload);
            setAllTasks((prev) => [...prev, created]);
        }
        setEditingTaskId(null);
    setShowTaskComposer(false);
    setEditingActivityViaTaskModal(null);
    };

    // Create Activity using the same UI fields; persist only supported backend fields
    const onCreateActivity = async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const title = (f.get("title") || "").toString().trim();
        if (!title) return;

        try {
            const svc = await getActivityService();
            if (editingActivityId) {
                await svc.update(editingActivityId, { text: title });
                const tid = activityAttachTaskId;
                if (tid) {
                    try {
                        const list = await svc.list({ taskId: tid });
                        setActivitiesByTask((prev) => ({ ...prev, [String(tid)]: Array.isArray(list) ? list.map(normalizeActivity) : [] }));
                    } catch {}
                }
                window.dispatchEvent(
                    new CustomEvent("ka-activities-updated", {
                        detail: { refresh: true, taskId: activityAttachTaskId || undefined },
                    }),
                );
            } else {
                const payload = { text: title };
                if (activityAttachTaskId) payload.taskId = activityAttachTaskId;
                const created = await svc.create(payload);
                // Update local state immediately for the specific task (if attached)
                if (activityAttachTaskId) {
                    try {
                        const list = await svc.list({ taskId: activityAttachTaskId });
                        setActivitiesByTask((prev) => ({
                            ...prev,
                            [String(activityAttachTaskId)]: Array.isArray(list) ? list.map(normalizeActivity) : [],
                        }));
                    } catch {}
                }
                // Also broadcast a refresh event for any open views
                window.dispatchEvent(
                    new CustomEvent("ka-activities-updated", {
                        detail: { refresh: true, taskId: activityAttachTaskId || undefined },
                    }),
                );
            }
            setShowActivityComposer(false);
            setActivityForm({
                title: "",
                description: "",
                list: "",
                key_area_id: null,
                assignee: "",
                priority: "normal",
                goal: "",
                start_date: "",
                end_date: "",
                deadline: "",
                finish_date: "",
                duration: "",
                _endAuto: true,
            });
            setActivityAttachTaskId(null);
            setEditingActivityId(null);
        } catch (err) {
            console.error("Failed to create activity", err);
            alert("Could not create activity.");
        }
    };

    // Close activity composer with Escape
    useEffect(() => {
        if (!showActivityComposer) return;
        const onKey = (e) => {
            if (e.key === "Escape") {
                setShowActivityComposer(false);
                setActivityAttachTaskId(null);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [showActivityComposer]);

    const handleSaveTask = async (updated) => {
        const q = computeEisenhowerQuadrant({
            deadline: updated.deadline,
            end_date: updated.end_date,
            start_date: updated.start_date || updated.startDate,
            priority: updated.priority,
            status: updated.status,
            key_area_id: updated.key_area_id || updated.keyAreaId || updated.key_area || updated.keyArea,
        });
        const payload = {
            ...updated,
            priority: (() => {
                const raw = updated.priority;
                if (raw === undefined || raw === null || raw === "") return undefined;
                const n = Number(raw);
                if (!Number.isNaN(n)) return n === 1 ? "low" : n === 3 ? "high" : "medium";
                const p = String(raw).toLowerCase();
                if (p === "med" || p === "normal") return "medium";
                if (p === "low" || p === "medium" || p === "high") return p;
                return undefined;
            })(),
            eisenhower_quadrant: q,
        };
        // payload prepared for update
        const saved = await api.updateTask(payload.id, payload);
    // server returned updated task in `saved`
        // Update UI immediately with server payload (already normalized by api.updateTask)
        setAllTasks((prev) => prev.map((t) => (t.id === saved.id ? { ...t, ...saved } : t)));
        await refreshActivitiesForTask(saved.id);
        setSelectedTask(null);
    };

    // Handler for ActivityFormModal onSave -> accept normalized payload from modal
    const handleActivityModalSave = async (payload) => {
        setIsSavingActivity(true);
        try {
            const svc = await getActivityService();
            const mapPriorityToApi = (p) => {
                if (p === undefined || p === null || p === '') return undefined;
                const num = Number(p);
                if (!Number.isNaN(num)) {
                    if (num <= 1) return "low";
                    if (num >= 3) return "high";
                    return "normal";
                }
                const s = String(p).toLowerCase();
                if (s === "low" || s === "normal" || s === "high") return s;
                if (s === "medium" || s === "med") return "normal";
                return undefined;
            };
            // Normalize incoming payload for API shape
            const body = {
                text: (payload.text || payload.activity_name || payload.title || "").trim(),
                completed: !!payload.completed,
            };
            // Include optional date/metadata fields when provided by the modal so
            // activities created/updated from the composer retain start/end/deadline.
            if (payload.startDate || payload.start_date || payload.date_start) body.startDate = toDateOnly(payload.startDate || payload.start_date || payload.date_start);
            if (payload.endDate || payload.end_date || payload.date_end) body.endDate = toDateOnly(payload.endDate || payload.end_date || payload.date_end);
            if (payload.deadline || payload.dueDate || payload.due_date) body.deadline = toDateOnly(payload.deadline || payload.dueDate || payload.due_date);
            if (typeof payload.priority !== 'undefined') body.priority = mapPriorityToApi(payload.priority);
            if (payload.goalId || payload.goal || payload.goal_id) body.goalId = payload.goalId || payload.goal || payload.goal_id;
            if (payload.completionDate) body.completionDate = payload.completionDate;
            // Allow task attachment if provided
            if (payload.taskId || payload.task_id) body.taskId = payload.taskId || payload.task_id;
            // Allow delegation if provided
            if (payload.delegatedToUserId) body.delegatedToUserId = payload.delegatedToUserId;

            if (payload.id) {
                // update
                const updated = await svc.update(payload.id, body);
                // refresh the task bucket if attached
                const tid = body.taskId || payload.taskId || payload.task_id || activityAttachTaskId || null;
                if (tid) {
                    try {
                        const list = await svc.list({ taskId: tid });
                        setActivitiesByTask((prev) => ({ ...prev, [String(tid)]: Array.isArray(list) ? list.map(normalizeActivity) : [] }));
                    } catch (e) {
                        // ignore
                    }
                }
            } else {
                // create
                if (payload.taskId) body.taskId = payload.taskId;
                const created = await svc.create(body);
                const tid = body.taskId || activityAttachTaskId || null;
                // Immediately insert the created activity into local state so UI shows
                // the dates/fields the user provided even if the backend hasn't
                // returned them yet. Merge `body` into the server response and
                // normalize for UI consistency (same approach used for tasks).
                try {
                    if (tid) {
                        const key = String(tid);
                        const norm = normalizeActivity({ ...(created || {}), ...(body || {}) });
                        setActivitiesByTask((prev) => {
                            const copyArr = Array.isArray(prev[key]) ? prev[key].slice() : [];
                            copyArr.push(norm);
                            return { ...prev, [key]: copyArr };
                        });
                        // Try to refresh in background to pick up any server-side
                        // normalization differences, but don't block the UI.
                        (async () => {
                            try {
                                const list = await svc.list({ taskId: tid });
                                setActivitiesByTask((prev) => ({ ...prev, [String(tid)]: Array.isArray(list) ? list.map(normalizeActivity) : [] }));
                            } catch (__) {}
                        })();
                    }
                } catch (e) {
                    // ignore local update failure and fall back to simple refetch
                    try {
                        if (tid) {
                            const list = await svc.list({ taskId: tid });
                            setActivitiesByTask((prev) => ({ ...prev, [String(tid)]: Array.isArray(list) ? list.map(normalizeActivity) : [] }));
                        }
                    } catch (__) {}
                }
            }

            // notify other views and close modal
            window.dispatchEvent(new CustomEvent("ka-activities-updated", { detail: { refresh: true } }));
            setShowActivityComposer(false);
            setEditingActivityId(null);
            setActivityAttachTaskId(null);
        } catch (err) {
            console.error("Failed to save activity from modal", err);
            // If the server returned validation messages, log them to help debugging
            console.error('Save activity error response data:', err?.response?.data);
            alert("Could not save activity.");
        } finally {
            setIsSavingActivity(false);
        }
    };

    const handleDeleteTask = async (task) => {
        // Prevent deleting a task that still has activities
        try {
            let list = activitiesByTask[String(task.id)];
                if (!Array.isArray(list)) {
                // fetch latest to be sure
                const svc = await getActivityService();
                list = await svc.list({ taskId: task.id });
            }
            const count = Array.isArray(list) ? list.length : 0;
            if (count > 0) {
                alert(
                    `Cannot delete this task because it has ${count} activit${count === 1 ? "y" : "ies"}. Remove those activities first.`,
                );
                return;
            }
        } catch (e) {
            // If activities cannot be loaded, fail-safe and do not delete
            console.error("Failed to verify activities before delete", e);
            alert("Unable to verify activities for this task. Please try again.");
            return;
        }

        await api.deleteTask(task.id);
        setAllTasks((prev) => prev.filter((t) => t.id !== task.id));
        setActivitiesByTask((prev) => {
            const copy = { ...(prev || {}) };
            delete copy[String(task.id)];
            return copy;
        });
        setSelectedTask(null);
    };

    return (
        <div className="min-h-screen bg-[#EDEDED]">
            <div className="flex w-full min-h-screen">
                <Sidebar
                    user={{ name: "User" }}
                    mobileOpen={mobileSidebarOpen}
                    onMobileClose={() => setMobileSidebarOpen(false)}
                />
                {mobileSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-30 md:hidden"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                )}
                {/* External EditActivityModal rendered directly when requested */}
                {showEditActivityModal && editingActivityViaTaskModal && (
                    <EditActivityModal
                        isOpen={true}
                        currentUserId={currentUserId}
                        initialData={(function(){
                            try {
                                const id = editingActivityViaTaskModal.id;
                                const taskId = editingActivityViaTaskModal.taskId;
                                let raw = null;
                                if (taskId && activitiesByTask && activitiesByTask[String(taskId)]) {
                                    raw = activitiesByTask[String(taskId)].find(a => String(a.id) === String(id));
                                }
                                const source = raw || activityForm || {};
                                const norm = normalizeActivity(source || {});
                                // Attempt to fall back to parent task values when activity lacks key area/list/assignee
                                const parentTaskId = taskId ? String(taskId) : (norm.taskId || norm.task_id || norm.task ? String(norm.taskId || norm.task_id || norm.task) : null);
                                const parent = parentTaskId ? ((allTasks || []).find((t) => String(t.id) === String(parentTaskId)) || null) : null;
                                const resolvedKeyArea = norm.key_area_id || norm.keyAreaId || norm.keyArea || (parent && (parent.key_area_id || parent.keyAreaId || parent.keyArea)) || '';
                                const resolvedList = norm.list || norm.list_index || norm.listIndex || (parent && (parent.list || parent.list_index || parent.listIndex)) || '';
                                const resolvedAssignee = norm.assignee || norm.responsible || (parent && (parent.assignee || parent.responsible)) || '';
                                return {
                                    id: norm.id || norm.activityId || null,
                                    type: 'activity',
                                    taskId: norm.taskId || norm.task_id || norm.task || '',
                                    text: norm.text || norm.activity_name || '',
                                    title: norm.text || norm.activity_name || '',
                                    description: norm.description || norm.notes || norm.note || '',
                                    start_date: norm.start_date || norm.startDate || norm.date_start || '',
                                    startDate: norm.start_date || norm.startDate || norm.date_start || '',
                                    end_date: norm.end_date || norm.endDate || norm.date_end || '',
                                    endDate: norm.end_date || norm.endDate || norm.date_end || '',
                                    deadline: norm.deadline || norm.dueDate || norm.due_date || '',
                                    duration: norm.duration || norm.duration_minutes || '',
                                    key_area_id: resolvedKeyArea,
                                    list: resolvedList,
                                    list_index: resolvedList,
                                    assignee: resolvedAssignee,
                                    priority: norm.priority ?? norm.priority_level ?? undefined,
                                    goal: norm.goal || norm.goal_id || norm.goalId || undefined,
                                    completed: norm.completed || false,
                                };
                            } catch (e) {
                                return activityForm || {};
                            }
                        })()}
                        keyAreas={keyAreas}
                        users={users}
                        goals={goals}
                        tasks={allTasks}
                        availableLists={availableListNumbers}
                        onSave={async (payload) => {
                            await handleActivityModalSave(payload);
                            setEditingActivityViaTaskModal(null);
                            setShowEditActivityModal(false);
                        }}
                        onCancel={() => { setShowEditActivityModal(false); setEditingActivityViaTaskModal(null); }}
                        isSaving={isSavingActivity}
                    />
                )}
                <main className="flex-1 min-w-0 w-full min-h-screen transition-all overflow-y-auto">
                    {/* Main View Tabs (legacy pattern - at top like legacy UI) */}
                    <div className="md:hidden">
                        <ViewTabsNavigation 
                            viewTab={viewTab}
                            setViewTab={setViewTab}
                            activeFilter={activeFilter}
                            setActiveFilter={setActiveFilter}
                            pendingDelegationsCount={pendingDelegations.length}
                        />
                    </div>
                    
                    <div className="max-w-full overflow-x-hidden pb-1 min-h-full">
                        <div className="flex items-center justify-between gap-4 mb-0 p-0 pb-0">
                            <div className="flex items-center gap-4">
                                <button
                                    className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                                    onClick={() => setMobileSidebarOpen(true)}
                                    aria-label="Open sidebar"
                                >
                                    <FaBars />
                                </button>
                            </div>
                        </div>
                        <div className="px-1 md:px-2">
                            {/* Header / Search / New KA */}
                            <div
                                className="flex items-center justify-between gap-3 mb-4"
                                style={{ display: selectedTaskFull ? "none" : undefined }}
                            >
                            {!selectedKA && !isGlobalTasksView ? (
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-slate-900">Key Areas</h1>
                                    {!showOnlyIdeas && (
                                        <>
                                            <div className="flex items-center bg-white rounded-lg px-2 py-1 shadow border border-slate-200">
                                                <FaSearch className="text-slate-700 mr-2" />
                                                <input
                                                    placeholder="Search key areas..."
                                                    className="bg-transparent outline-none text-sm w-56"
                                                    value={filter}
                                                    onChange={(e) => setFilter(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex items-center bg-white rounded-lg px-2 py-1 shadow border border-slate-200">
                                                <FaSearch className="text-slate-700 mr-2" />
                                                <input
                                                    placeholder="Search tasks across all key areas..."
                                                    className="bg-transparent outline-none text-sm w-64"
                                                    value={siteSearch}
                                                    onChange={(e) => setSiteSearch(e.target.value)}
                                                />
                                            </div>
                                            <button
                                                className={`flex items-center gap-2 rounded-lg font-semibold shadow px-2 py-1 text-sm border border-slate-200 ${
                                                    canAdd
                                                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                                                        : "bg-gray-300 text-gray-600 cursor-not-allowed"
                                                }`}
                                                onClick={() => canAdd && (setShowForm(true), setEditing(null))}
                                                disabled={!canAdd}
                                                title={
                                                    canAdd
                                                        ? undefined
                                                        : "Limit reached: You can have up to 9 custom Key Areas (Ideas is fixed as the 10th)."
                                                }
                                            >
                                               New Key Area
                                            </button>
                                            {!canAdd && (
                                                <span className="text-xs text-slate-500">Max 10 Key Areas reached.</span>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 w-full">
                                    {/* mobile sidebar toggle */}
                                    <button
                                        className="md:hidden p-2 rounded-lg bg-white border border-slate-200 mr-2"
                                        onClick={() => setShowMobileSidebar(true)}
                                        aria-label="Open menu"
                                    >
                                        <FaBars />
                                    </button>
                                    {selectedKA && (
                                        <button
                                            className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                                            aria-label="Back"
                                            style={{ minWidth: 36, minHeight: 36 }}
                                            onClick={() => {
                                                setSelectedKA(null);
                                                setAllTasks([]);
                                                // Clear any URL params (like ?select=ideas) to show full list
                                                navigate("/key-areas", { replace: true });
                                            }}
                                        >
                                            <FaChevronLeft />
                                        </button>
                                    )}

                                    {/* Show selected KA icon then title inline - or special views */}
                                    {(selectedKA || isGlobalTasksView) && (
                                        <div className="inline-flex items-center gap-1">
                                            <img
                                                alt="Key Areas"
                                                className="w-7 h-7 md:w-8 md:h-8 object-contain"
                                                src={`${import.meta.env.BASE_URL}key-area.png`}
                                                onError={(e) => {
                                                    if (e?.currentTarget) e.currentTarget.src = "/key-area.png";
                                                }}
                                            />
                                            <span 
                                                className="relative text-base md:text-lg font-bold text-slate-900 truncate px-1"
                                                style={{ color: (selectedKA && selectedKA.color) || '#1F2937' }}
                                            >
                                                {viewTab === 'delegated' ? 'Delegated Tasks' : 
                                                 viewTab === 'todo' ? 'To-Do (All Tasks)' :
                                                 viewTab === 'activity-trap' ? 'Activity Trap' :
                                                 selectedKA?.title || ''}
                                            </span>
                                        </div>
                                    )}

                                    <div className="ml-auto flex items-center gap-1.5">
                                        {/* Columns (gear) placed beside View in header */}
                                        <div className="relative ml-1" ref={columnsMenuRef}>
                                            <button
                                                type="button"
                                                aria-haspopup="menu"
                                                aria-expanded={showColumnsMenu ? "true" : "false"}
                                                className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm font-semibold hover:bg-slate-50"
                                                onClick={() => setShowColumnsMenu((s) => !s)}
                                                title="Columns"
                                            >
                                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M487.4 315.7l-42.6-24.6c4.3-23.2 4.3-47 0-70.2l42.6-24.6c4.9-2.8 7.1-8.6 5.5-14-11.1-35.6-30-67.8-54.7-94.6-3.8-4.1-10-5.1-14.8-2.3L380.8 110c-17.9-15.4-38.5-27.3-60.8-35.1V25.8c0-5.6-3.9-10.5-9.4-11.7-36.7-8.2-74.3-7.8-109.2 0-5.5 1.2-9.4 6.1-9.4 11.7V75c-22.2 7.9-42.8 19.8-60.8 35.1L88.7 85.5c-4.9-2.8-11-1.9-14.8 2.3-24.7 26.7-43.6 58.9-54.7 94.6-1.7 5.4.6 11.2 5.5 14L67.3 221c-4.3 23.2-4.3 47 0 70.2l-42.6 24.6c-4.9 2.8-7.1 8.6-5.5 14 11.1 35.6 30 67.8 54.7 94.6 3.8 4.1 10 5.1 14.8 2.3l42.6-24.6c17.9 15.4 38.5 27.3 60.8 35.1v49.2c0 5.6 3.9 10.5 9.4 11.7 36.7 8.2 74.3 7.8 109.2 0 5.5-1.2 9.4-6.1 9.4-11.7v-49.2c22.2-7.9 42.8-19.8 60.8-35.1l42.6 24.6c4.9 2.8 11 1.9 14.8-2.3 24.7-26.7 43.6-58.9 54.7-94.6 1.5-5.5-.7-11.3-5.6-14.1zM256 336c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z"></path>
                                                </svg>
                                            </button>
                                            {showColumnsMenu && (
                                                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded shadow z-50 p-3 text-sm">
                                                    <div className="font-medium mb-2">Columns</div>
                                                    <label className="flex items-center gap-2 py-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!showCompleted}
                                                            onChange={() => setShowCompleted((s) => !s)}
                                                        />
                                                        <span className="capitalize">Show completed items</span>
                                                    </label>
                                                    {Object.keys(visibleColumns).map((key) => (
                                                        <label key={key} className="flex items-center gap-2 py-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!visibleColumns[key]}
                                                                onChange={() => setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))}
                                                            />
                                                            <span className="capitalize">{key.replace('_', ' ')}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            </div>
                        </div>
                        {/* Title block removed; title now shown inline with Back */}
                        {selectedTaskFull && (
                            <div className="mb-4">
                                <TaskFullView
                                    task={selectedTaskFull}
                                    goals={goals}
                                    kaTitle={(selectedKA && selectedKA.title) || (keyAreas.find(k => String(k.id) === String(selectedTaskFull.key_area_id)) || {}).title}
                                    listNames={listNames}
                                    kaId={(selectedKA && selectedKA.id) || selectedTaskFull.key_area_id}
                                    listNumbers={availableListNumbers}
                                    selectedKA={selectedKA || keyAreas.find(k => String(k.id) === String(selectedTaskFull.key_area_id))}
                                    users={users}
                                    currentUserId={currentUserId}
                                    allTasks={allTasks}
                                    savingActivityIds={savingActivityIds}
                                    setSavingActivityIds={setSavingActivityIds}
                                    readOnly={
                                        Boolean((selectedKA && selectedKA.is_default) || (selectedTaskFull && ((keyAreas.find(k => String(k.id) === String(selectedTaskFull.key_area_id)) || {}).is_default))) &&
                                        (((selectedKA && (selectedKA.title || "").toLowerCase()) || ((keyAreas.find(k => String(k.id) === String(selectedTaskFull.key_area_id)) || {}).title || "").toLowerCase()) !== "ideas")
                                    }
                                    onBack={() => setSelectedTaskFull(null)}
                                    onSave={async (payload) => {
                                        await handleSaveTask(payload);
                                        const updated = allTasks.find((x) => x.id === payload.id) || payload;
                                        setSelectedTaskFull(updated);
                                    }}
                                    onDelete={async (tsk) => {
                                        await handleDeleteTask(tsk);
                                        setSelectedTaskFull(null);
                                    }}
                                    onRequestEdit={async (task) => {
                                        // Map server task shape into the Task composer form and open the shared EditTaskModal
                                        const mapPriority = (p) => {
                                            const v = String(p || "normal").toLowerCase();
                                            if (v === "med" || v === "medium" || v === "normal") return "normal";
                                            if (v === "low") return "low";
                                            if (v === "high") return "high";
                                            return "normal";
                                        };
                                        setTaskForm({
                                            id: task.id || task.taskId || task.task_id || task._id || null,
                                            title: task.title || task.name || "",
                                            description: task.description || "",
                                            list_index: task.list_index || task.listIndex || 1,
                                            category: task.category || "Key Areas",
                                            goal_id: task.goal_id || "",
                                            start_date: toDateOnly(task.start_date) || toDateOnly(task.startDate) || "",
                                            deadline: toDateOnly(task.deadline) || toDateOnly(task.dueDate) || "",
                                            end_date: toDateOnly(task.end_date) || toDateOnly(task.endDate) || "",
                                            status: task.status || "open",
                                            priority: (function(p) {
                                                const s = String(p || "normal").toLowerCase();
                                                if (s === "low" || s === "1") return 1;
                                                if (s === "high" || s === "3") return 3;
                                                return 2;
                                            })(task.priority),
                                            tags: task.tags || "",
                                            recurrence: task.recurrence || "",
                                            attachments: task.attachments || "",
                                            attachmentsFiles: task.attachments
                                                ? task.attachments.split(",").filter(Boolean).map((n) => ({ name: n }))
                                                : [],
                                            assignee: task.assignee || "",
                                            key_area_id: (selectedKA && selectedKA.id) || task.key_area_id || task.keyAreaId || null,
                                            list: "",
                                            finish_date: "",
                                            duration: task.duration || "",
                                            _endAuto: false,
                                        });
                                        setEditingTaskId(task.id);
                                        setShowTaskComposer(true);
                                    }}
                                    activitiesByTask={activitiesByTask}
                                    onUpdateActivities={(id, nextList) => {
                                        setActivitiesByTask((prev) => ({ ...prev, [id]: nextList }));
                                    }}
                                    initialTab={taskFullInitialTab}
                                />
                            </div>
                        )}
                        {(selectedKA || viewTab === 'delegated' || viewTab === 'todo') && (viewTab !== 'delegated' && viewTab !== 'todo' && viewTab !== 'activity-trap') && (
                            <div className="flex-1 h-[calc(100vh-200px)] min-h-[600px]">
                                <ResizablePanels
                                    taskPanel={
                                    <div className="flex flex-col h-full bg-white">
                                        {/* Task Panel Content */}
                                        <div className="flex-1 overflow-y-auto px-3 py-3">
                                            <div className="space-y-6">
                                <div className="bg-white border border-blue-200 rounded-lg shadow-sm p-3 space-y-6">
                                        {/* Header Row: Task Lists Label + Mass Edit Control */}
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-700">
                                                    {viewTab === 'delegated' ? 'Delegated Tasks:' :
                                                     viewTab === 'todo' ? 'All Tasks:' :
                                                     'Task Lists:'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm">
                                                <span className="text-slate-500" aria-live="polite">
                                                    {selectedIds.size} selected
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={selectedIds.size === 0}
                                                    onClick={() => {
                                                        // Only allow entering mass edit when at least one task is selected
                                                        if (selectedIds.size === 0) return;
                                                        setShowMassEditModal(true);
                                                    }}
                                                    className="px-4 py-2 rounded-md text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                                    aria-label="mass edit"
                                                    title={selectedIds.size === 0 ? "Select tasks to enable mass edit" : "Mass edit selected tasks"}
                                                >
                                                    Mass Edit
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600">Sort by:</span>
                                                <select
                                                    value={sortBy}
                                                    onChange={(e) => setSortBy(e.target.value)}
                                                    className="border rounded px-2 py-1 text-sm bg-white"
                                                >
                                                    <option value="manual">Manual</option>
                                                    <option value="date">Due Date</option>
                                                    <option value="priority">Priority</option>
                                                    <option value="status">Status</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600">Status:</span>
                                                <select
                                                    value={filterStatus}
                                                    onChange={(e) => setFilterStatus(e.target.value)}
                                                    className="border rounded px-2 py-1 text-sm bg-white"
                                                >
                                                    <option value="all">All</option>
                                                    <option value="open">Open</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="done">Done</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600">Owner:</span>
                                                <select
                                                    value={filterAssignee}
                                                    onChange={(e) => setFilterAssignee(e.target.value)}
                                                    className="border rounded px-2 py-1 text-sm bg-white"
                                                >
                                                    <option value="">All</option>
                                                    {(users || []).map((u) => (
                                                        <option key={u.id} value={u.name}>{u.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-600">Tag:</span>
                                                <input
                                                    value={filterTag}
                                                    onChange={(e) => setFilterTag(e.target.value)}
                                                    className="border rounded px-2 py-1 text-sm bg-white max-w-20"
                                                    placeholder="Tag"
                                                />
                                            </div>
                                        </div>

                                        {/* List Tabs Section (left sidebar lists within the view) */}
                                        <div className="pt-3">
                                            <div
                                                ref={tabsRef}
                                                className="flex items-center gap-1 overflow-x-auto bg-slate-100 border border-slate-200 rounded-lg px-1 py-0.5"
                                            >
                                                        {Array.from({ length: leftListCount }).map((_, i) => {
                                                            const n = i + 1;
                                                            return (
                                                                <div key={n} className="relative">
                                                                    <button
                                                                        onClick={() => setTaskTab(n)}
                                                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold border transition ${
                                                                            taskTab === n
                                                                                ? "bg-white text-slate-900 border-slate-300 shadow"
                                                                                : "bg-transparent text-slate-800 border-transparent hover:bg-slate-200"
                                                                        }`}
                                                                    >
                                                                        <span>{getListName(selectedKA?.id, n)}</span>
                                                                        <span
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const rect =
                                                                                    e.currentTarget.getBoundingClientRect();
                                                                                setListMenuPos({
                                                                                    top:
                                                                                        rect.bottom +
                                                                                        window.scrollY +
                                                                                        6,
                                                                                    left: rect.left + window.scrollX,
                                                                                });
                                                                                setOpenListMenu((cur) =>
                                                                                    cur === n ? null : n,
                                                                                );
                                                                            }}
                                                                            aria-haspopup="menu"
                                                                            aria-expanded={
                                                                                openListMenu === n ? "true" : "false"
                                                                            }
                                                                            title={`Options for ${getListName(selectedKA?.id, n)}`}
                                                                            className={`ml-1 p-1 rounded cursor-pointer ${
                                                                                taskTab === n
                                                                                    ? "text-slate-600 hover:bg-slate-100"
                                                                                    : "text-slate-700 hover:bg-slate-200"
                                                                            }`}
                                                                            role="button"
                                                                        >
                                                                            <FaEllipsisV className="w-3.5 h-3.5" />
                                                                        </span>
                                                                    </button>
                                                                    {openListMenu === n && (
                                                                        <>
                                                                            <div
                                                                                className="fixed inset-0 z-40"
                                                                                onClick={() => setOpenListMenu(null)}
                                                                            />
                                                                            <div
                                                                                role="menu"
                                                                                className="fixed z-50 w-32 bg-white border border-slate-200 rounded-lg shadow"
                                                                                style={{
                                                                                    top: `${listMenuPos.top}px`,
                                                                                    left: `${listMenuPos.left}px`,
                                                                                }}
                                                                            >
                                                                                <button
                                                                                    role="menuitem"
                                                                                    onClick={() => {
                                                                                        renameList(n);
                                                                                        setOpenListMenu(null);
                                                                                    }}
                                                                                    className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                                                                    aria-label="Rename list"
                                                                                >
                                                                                    Rename List
                                                                                </button>
                                                                                <button
                                                                                    role="menuitem"
                                                                                    onClick={() => {
                                                                                        deleteList(n);
                                                                                        setOpenListMenu(null);
                                                                                    }}
                                                                                    className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                                                                    aria-label="Delete list"
                                                                                >
                                                                                    Delete List
                                                                                </button>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        {leftListCount < 10 && (
                                                            <div className="flex items-center">
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!selectedKA) return;
                                                                        if (
                                                                            selectedKA.is_default ||
                                                                            (selectedKA.title || "").toLowerCase() ===
                                                                                "ideas"
                                                                        ) {
                                                                            alert(
                                                                                "Cannot add lists for the Ideas key area.",
                                                                            );
                                                                            return;
                                                                        }
                                                                        const kaId = selectedKA.id;
                                                                        const currentCount = leftListCount;
                                                                        const next = currentCount + 1;
                                                                        const nextName = `List ${next}`;
                                                                        setListNames((prev) => {
                                                                            const copy = { ...(prev || {}) };
                                                                            copy[kaId] = { ...(copy[kaId] || {}) };
                                                                            copy[kaId][next] = nextName;
                                                                            return copy;
                                                                        });
                                                                        setTaskTab(next);
                                                                            try {
                                                                                const names = listNames[kaId] || {};
                                                                                const newMap = {
                                                                                    ...names,
                                                                                    [next]: nextName,
                                                                                };
                                                                                const svc = await getKeyAreaService();
                                                                                await svc.update(kaId, {
                                                                                    listNames: newMap,
                                                                                });
                                                                            } catch (e) {
                                                                                console.error(
                                                                                    "Failed to persist new list",
                                                                                    e,
                                                                                );
                                                                            }
                                                                    }}
                                                                    title="Add list"
                                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border bg-white text-slate-800 hover:bg-slate-50"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                                    </svg>
                                                                    Add List
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                        </div>

                                        {/* Bottom Row: Tasks Display (full width) */}
                                        <div ref={tasksDisplayRef}>
                                            {view === "list" ? (
                                                sortedTasks.length === 0 ? (
                                                    <EmptyState
                                                        title="List is empty."
                                                        hint="Use the 'Add Task' button below to create your first task."
                                                    />
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full text-sm">
                                                            <thead className="bg-slate-50 border border-slate-200 text-slate-700">
                                                                <tr>
                                                                    <th className="px-3 py-2 text-left w-8">
                                                                        <input
                                                                            type="checkbox"
                                                                            aria-label="Select all visible"
                                                                            checked={
                                                                                sortedTasks.length > 0 &&
                                                                                sortedTasks.every((t) =>
                                                                                    selectedIds.has(t.id),
                                                                                )
                                                                            }
                                                                            onChange={selectAllVisible}
                                                                        />
                                                                    </th>
                                                                    <th className="px-3 py-2 text-left font-semibold w-[160px] sm:w-[220px]">
                                                                        Task
                                                                    </th>
                                                                    {visibleColumns.responsible && (
                                                                        <th className="px-3 py-2 text-left font-semibold">
                                                                            Responsible
                                                                        </th>
                                                                    )}
                                                                    <th className="px-3 py-2 text-left font-semibold">
                                                                        Status
                                                                    </th>
                                                                    {visibleColumns.priority && (
                                                                        <th className="px-3 py-2 text-left font-semibold">
                                                                            Priority
                                                                        </th>
                                                                    )}
                                                                    {visibleColumns.quadrant && (
                                                                        <th className="px-3 py-2 text-left font-semibold">
                                                                            Quadrant
                                                                        </th>
                                                                    )}
                                                                    {/* Goal and Tags columns removed per UX request */}
                                                                    {visibleColumns.start_date && (
                                                                        <th className="px-3 py-2 text-left font-semibold">
                                                                            Start Date
                                                                        </th>
                                                                    )}
                                                                    {visibleColumns.end_date && (
                                                                        <th className="px-3 py-2 text-left font-semibold">
                                                                            End date
                                                                        </th>
                                                                    )}
                                                                    {visibleColumns.deadline && (
                                                                        <th className="px-3 py-2 text-left font-semibold">
                                                                            Deadline
                                                                        </th>
                                                                    )}
                                                                    {visibleColumns.duration && (
                                                                        <th className="px-3 py-2 text-left font-semibold">
                                                                            Duration
                                                                        </th>
                                                                    )}
                                                                    {visibleColumns.completed && (
                                                                        <th className="px-3 py-2 text-left font-semibold">
                                                                            Completed
                                                                        </th>
                                                                    )}
                                                                    {/* Actions column removed — actions available via row menu */}
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white">
                                                                {sortedTasks.map((t) => {
                                                                    const q = computeEisenhowerQuadrant({
                                                                        deadline: t.deadline,
                                                                        end_date: t.end_date,
                                                                        start_date: t.start_date || t.startDate,
                                                                        priority: t.priority,
                                                                        status: t.status,
                                                                        key_area_id: t.key_area_id || t.keyAreaId || t.key_area || t.keyArea,
                                                                    });
                                                                    return (
                                                                        <React.Fragment key={t.id}>
                                                                            <TaskRow
                                                                                t={t}
                                                                                goals={goals}
                                                                                goalMap={goalTitleMap}
                                                                                visibleColumns={visibleColumns}
                                                                                q={q}
                                                                                isSelected={isSelected(t.id)}
                                                                                onToggleSelect={() => toggleSelect(t.id)}
                                                                                onOpenTask={(task) => { setSelectedTaskFull(task); setTaskFullInitialTab("activities"); }}
                                                                                onStatusChange={(val) => handleTaskStatusChange(t.id, val)}
                                                                                onToggleActivitiesRow={() => toggleActivitiesRow(t.id)}
                                                                                activityCount={(activitiesByTask[String(t.id)] || []).length}
                                                                                getPriorityLevel={getPriorityLevel}
                                                                                toDateOnly={toDateOnly}
                                                                                formatDuration={formatDuration}
                                                                                // inline editing support (optimistic single-field updates)
                                                                                updateField={updateField}
                                                                                enableInlineEditing={!showMassEdit}
                                                                                users={users}
                                                                                currentUserId={currentUserId}
                                                                                isSaving={savingIds.has(t.id)}
                                                                                onMouseEnter={() => {
                                                                                    if (
                                                                                        expandedActivityRows &&
                                                                                        expandedActivityRows.size > 0
                                                                                    ) {
                                                                                        if (
                                                                                            !(
                                                                                                expandedActivityRows.size ===
                                                                                                    1 &&
                                                                                                expandedActivityRows.has(
                                                                                                    t.id,
                                                                                                )
                                                                                            )
                                                                                        ) {
                                                                                            setExpandedActivityRows(new Set());
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                expandedActivity={expandedActivityRows.has(t.id)}
                                                                                onEditClick={() => {
                                                                                    const mapPriority = (p) => {
                                                                                        const v = String(p || "normal").toLowerCase();
                                                                                        if (v === "med" || v === "medium" || v === "normal") return "normal";
                                                                                        if (v === "low") return "low";
                                                                                        if (v === "high") return "high";
                                                                                        return "normal";
                                                                                    };
                                                                                    setTaskForm({
                                                                                        id: t.id || t.taskId || t._id || null,
                                                                                        title: t.title || t.name || "",
                                                                                        description: t.description || t.notes || "",
                                                                                        list_index: t.list_index || t.listIndex || 1,
                                                                                        category: t.category || "Key Areas",
                                                                                        goal_id: t.goal_id || t.goalId || t.goal || "",
                                                                                        start_date: toDateOnly(t.start_date) || toDateOnly(t.startDate) || "",
                                                                                        deadline: toDateOnly(t.deadline) || toDateOnly(t.dueDate) || "",
                                                                                        end_date: toDateOnly(t.end_date) || toDateOnly(t.endDate) || "",
                                                                                        status: t.status || "open",
                                                                                        priority: (function(p) {
                                                                                            const s = String(p || "normal").toLowerCase();
                                                                                            if (s === "low" || s === "1") return 1;
                                                                                            if (s === "high" || s === "3") return 3;
                                                                                            return 2;
                                                                                        })(t.priority),
                                                                                        tags: t.tags || "",
                                                                                        recurrence: t.recurrence || "",
                                                                                        attachments: t.attachments || "",
                                                                                        attachmentsFiles: t.attachments
                                                                                            ? t.attachments.split(",").filter(Boolean).map((n) => ({ name: n }))
                                                                                            : [],
                                                                                        assignee: t.assignee || "",
                                                                                        key_area_id: t.key_area_id || t.keyAreaId || selectedKA?.id || null,
                                                                                        list: "",
                                                                                        finish_date: t.finish_date || "",
                                                                                        duration: t.duration || "",
                                                                                        _endAuto: false,
                                                                                    });
                                                                                    setEditingTaskId(t.id);
                                                                                    setShowTaskComposer(true);
                                                                                }}
                                                                                onDeleteClick={() => handleDeleteTask(t)}
                                                                                onRowClick={(task) => {
                                                                                    console.log('Task clicked:', task);
                                                                                    setSelectedTaskInPanel(task);
                                                                                }}
                                                                            />
                                                                            {expandedActivityRows.has(t.id) && (
                                                                                <tr className="bg-slate-50">
                                                                                    <td className="px-3 py-2" />
                                                                                    <td colSpan={14} className="px-0 py-2">
                                                                                        <div className="ml-6 pl-6 border-l-2 border-slate-200">
                                                                                            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Activities</div>
                                                                                            <ActivityList
                                                                                                task={t}
                                                                                                activitiesByTask={activitiesByTask}
                                                                                                setActivitiesByTask={setActivitiesByTask}
                                                                                                savingActivityIds={savingActivityIds}
                                                                                                setSavingActivityIds={setSavingActivityIds}
                                                                                                getPriorityLevel={getPriorityLevel}
                                                                                 addToast={addToast}
                                                                                                             enableInlineEditing={!showMassEdit}
                                                                                                             users={users}
                                                                                                             currentUserId={currentUserId}
                                                                                            />
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )
                                            ) : view === "kanban" ? (
                                                <KanbanView
                                                    tasks={visibleTasks}
                                                    selectedIds={selectedIds}
                                                    toggleSelect={toggleSelect}
                                                    onSelect={(t) => {
                                                        setSelectedTaskFull(t);
                                                        setTaskFullInitialTab("activities");
                                                    }}
                                                    onStatusChange={handleTaskStatusChange}
                                                />
                                            ) : (
                                                <CalendarView
                                                    tasks={visibleTasks}
                                                    selectedIds={selectedIds}
                                                    toggleSelect={toggleSelect}
                                                    onSelect={(t) => {
                                                        setSelectedTaskFull(t);
                                                        setTaskFullInitialTab("activities");
                                                    }}
                                                    onStatusChange={handleTaskStatusChange}
                                                />
                                            )}
                                        </div>
                                    </div>
                                        
                                    {/* Add Task Footer */}
                                    <div className="flex justify-end pr-10 pt-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTaskForm((s) => ({
                                                        ...s,
                                                        list_index: taskTab,
                                                        // Prefill key area with the currently selected Key Area when creating a new task
                                                        key_area_id: selectedKA?.id || s.key_area_id || s.keyAreaId || null,
                                                    }));
                                                    setShowTaskComposer(true);
                                                }}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                aria-label="Add task"
                                            >
                                                Add Task
                                            </button>
                                        </div>
                                        </div>
                                        </div>
                                    </div>
                                }
                                activityPanel={
                                    selectedTaskInPanel ? (
                                        <div className="flex flex-col h-full bg-slate-50">
                                            {/* Activity Panel Header */}
                                            <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {(() => {
                                                        const lvl = getPriorityLevel ? getPriorityLevel(selectedTaskInPanel?.priority) : 2;
                                                        if (lvl === 2) return null;
                                                        const cls = lvl === 3 ? "text-red-600" : "text-emerald-600";
                                                        const label = lvl === 3 ? "High" : "Low";
                                                        return (
                                                            <span
                                                                className={`inline-block text-sm font-bold ${cls}`}
                                                                title={`Priority: ${label}`}
                                                            >
                                                                !
                                                            </span>
                                                        );
                                                    })()}
                                                    <h3 className="text-sm font-semibold text-slate-900 truncate">{selectedTaskInPanel.title || 'Untitled Task'}</h3>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedTaskInPanel(null)}
                                                    className="ml-2 p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                                    aria-label="Close activity panel"
                                                >
                                                    <FaTimes className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Activity Panel Content */}
                                            <div className="flex-1 overflow-y-auto">
                                                {/* Activities Tab Header */}
                                                <div className="px-2 pt-2 bg-white">
                                                    <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                                        <div className="px-3 py-1 rounded-md text-sm font-semibold bg-white text-slate-900 shadow" aria-label="Activities">
                                                            <span className="inline-flex items-center gap-1">
                                                                <svg className="w-4 h-4" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" fill="currentColor" style={{ color: selectedKA?.color || 'rgb(16, 185, 129)' }}>
                                                                    <path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"></path>
                                                                </svg>
                                                                Activities
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Activities Table */}
                                                <div className="p-4">
                                                    <div className="mb-3">
                                                        {(() => {
                                                            const taskKey = String(selectedTaskInPanel.id);
                                                            const list = (activitiesByTask[taskKey] || []).slice();
                                                            
                                                            return Array.isArray(list) && list.length > 0 ? (
                                                                <div className="overflow-x-auto">
                                                                    <table className="min-w-full text-sm">
                                                                        <thead className="bg-slate-50 border border-slate-200 text-slate-700">
                                                                            <tr>
                                                                                <th className="px-3 py-2 text-left font-semibold w-[160px] sm:w-[220px]">Activity</th>
                                                                                {visibleColumns.responsible && (
                                                                                    <th className="px-3 py-2 text-left font-semibold">Responsible</th>
                                                                                )}
                                                                                {visibleColumns.status !== false && (
                                                                                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                                                                                )}
                                                                                {visibleColumns.priority && (
                                                                                    <th className="px-3 py-2 text-left font-semibold">Priority</th>
                                                                                )}
                                                                                {visibleColumns.start_date && (
                                                                                    <th className="px-3 py-2 text-left font-semibold">Start date</th>
                                                                                )}
                                                                                {visibleColumns.end_date && (
                                                                                    <th className="px-3 py-2 text-left font-semibold">End date</th>
                                                                                )}
                                                                                {visibleColumns.deadline && (
                                                                                    <th className="px-3 py-2 text-left font-semibold">Deadline</th>
                                                                                )}
                                                                                {visibleColumns.duration && (
                                                                                    <th className="px-3 py-2 text-left font-semibold">Duration</th>
                                                                                )}
                                                                                {visibleColumns.completed && (
                                                                                    <th className="px-3 py-2 text-left font-semibold">Completed</th>
                                                                                )}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {list.map((a) => (
                                                                                <tr key={a.id} className="bg-white border-b border-slate-100">
                                                                                    <td className="px-3 py-2 align-top">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <ActivityRowMenu activity={a} taskId={selectedTaskInPanel?.id} />
                                                                                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="w-4 h-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" style={{ color: selectedKA?.color || 'rgb(16, 185, 129)' }}>
                                                                                                <path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"></path>
                                                                                            </svg>
                                                                                            <div className="flex flex-col">
                                                                                                {activityNameEditId === a.id ? (
                                                                                                    <input
                                                                                                        autoFocus
                                                                                                        className="text-sm text-slate-800 border rounded px-1 py-0.5 max-w-[540px]"
                                                                                                        value={activityNameEditValue}
                                                                                                        onChange={(e) => setActivityNameEditValue(e.target.value)}
                                                                                                        onBlur={() => saveActivityName(a, selectedTaskInPanel?.id, activityNameEditValue)}
                                                                                                        onKeyDown={(e) => {
                                                                                                            if (e.key === 'Enter') {
                                                                                                                e.preventDefault();
                                                                                                                saveActivityName(a, selectedTaskInPanel?.id, activityNameEditValue);
                                                                                                            } else if (e.key === 'Escape') {
                                                                                                                setActivityNameEditId(null);
                                                                                                                setActivityNameEditValue((a.text || a.activity_name || '').trim());
                                                                                                            }
                                                                                                        }}
                                                                                                    />
                                                                                                ) : (
                                                                                                    <div
                                                                                                        className="text-sm text-slate-800 truncate max-w-[540px] cursor-pointer"
                                                                                                        onDoubleClick={() => {
                                                                                                            setActivityNameEditId(a.id);
                                                                                                            setActivityNameEditValue((a.text || a.activity_name || '').trim());
                                                                                                        }}
                                                                                                        title="Double click to edit"
                                                                                                    >
                                                                                                        {a.text || a.activity_name || 'Untitled activity'}
                                                                                                    </div>
                                                                                                )}
                                                                                                <div className="text-xs text-slate-500">{a.note || ''}</div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                    {visibleColumns.responsible && (
                                                                                        <td className="px-3 py-2 align-top text-slate-700">
                                                                                            {Array.isArray(users) && users.length ? (
                                                                                                <select className="text-sm rounded-md border bg-white px-2 py-1" value={a.assignee || selectedTaskInPanel.assignee || ''} disabled>
                                                                                                    <option value="">—</option>
                                                                                                    {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                                                                                                </select>
                                                                                            ) : (
                                                                                                a.assignee || selectedTaskInPanel.assignee || '—'
                                                                                            )}
                                                                                        </td>
                                                                                    )}
                                                                                    {visibleColumns.status && (
                                                                                        <td className="px-3 py-2 align-top">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${String(a.status || '').toLowerCase() === 'done' ? 'bg-emerald-500' : String(a.status || '').toLowerCase() === 'in_progress' ? 'bg-blue-500' : 'bg-slate-400'}`} aria-hidden="true" />
                                                                                                <select value={a.status || 'open'} disabled className="text-xs rounded-md border bg-white px-2 py-1" aria-label={`Change status for activity ${a.text}`}>
                                                                                                    <option value="open">Open</option>
                                                                                                    <option value="in_progress">In progress</option>
                                                                                                    <option value="done">Done</option>
                                                                                                </select>
                                                                                            </div>
                                                                                        </td>
                                                                                    )}
                                                                                    {visibleColumns.priority && (
                                                                                        <td className="px-3 py-2 align-top">
                                                                                            <select className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm" value={(function() {
                                                                                                const raw = a.priority ?? selectedTaskInPanel.priority;
                                                                                                if (raw === 1 || String(raw) === '1' || String(raw).toLowerCase() === 'low') return 'low';
                                                                                                if (raw === 3 || String(raw) === '3' || String(raw).toLowerCase() === 'high') return 'high';
                                                                                                return 'normal';
                                                                                            })()} disabled>
                                                                                                <option value="low">Low</option>
                                                                                                <option value="normal">Normal</option>
                                                                                                <option value="high">High</option>
                                                                                            </select>
                                                                                        </td>
                                                                                    )}
                                                                                    {visibleColumns.start_date && (
                                                                                        <td className="px-3 py-2 align-top">
                                                                                            <button className="hover:bg-slate-50 rounded px-1" title="Edit start date" disabled>
                                                                                                {(() => {
                                                                                                    const date = a.start_date || a.startDate;
                                                                                                    if (!date) return '—';
                                                                                                    try {
                                                                                                        const d = new Date(date);
                                                                                                        return d.toISOString().split('T')[0];
                                                                                                    } catch { return '—'; }
                                                                                                })()}
                                                                                            </button>
                                                                                        </td>
                                                                                    )}
                                                                                    {visibleColumns.end_date && (
                                                                                        <td className="px-3 py-2 align-top">
                                                                                            <button className="hover:bg-slate-50 rounded px-1" title="Edit end date" disabled>
                                                                                                {(() => {
                                                                                                    const date = a.end_date || a.endDate;
                                                                                                    if (!date) return '—';
                                                                                                    try {
                                                                                                        const d = new Date(date);
                                                                                                        return d.toISOString().split('T')[0];
                                                                                                    } catch { return '—'; }
                                                                                                })()}
                                                                                            </button>
                                                                                        </td>
                                                                                    )}
                                                                                    {visibleColumns.deadline && (
                                                                                        <td className="px-3 py-2 align-top">
                                                                                            <button className="hover:bg-slate-50 rounded px-1" title="Edit deadline" disabled>
                                                                                                {(() => {
                                                                                                    const date = a.deadline;
                                                                                                    if (!date) return '—';
                                                                                                    try {
                                                                                                        const d = new Date(date);
                                                                                                        return d.toISOString().split('T')[0];
                                                                                                    } catch { return '—'; }
                                                                                                })()}
                                                                                            </button>
                                                                                        </td>
                                                                                    )}
                                                                                    {visibleColumns.duration && (
                                                                                        <td className="px-3 py-2 align-top">{a.duration || '0d'}</td>
                                                                                    )}
                                                                                    {visibleColumns.completed && (
                                                                                        <td className="px-3 py-2 align-top text-slate-800">
                                                                                            {(() => {
                                                                                                const date = a.completionDate || a.completion_date;
                                                                                                if (!date) return '';
                                                                                                try {
                                                                                                    const d = new Date(date);
                                                                                                    return d.toISOString().split('T')[0];
                                                                                                } catch { return ''; }
                                                                                            })()}
                                                                                        </td>
                                                                                    )}
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : (
                                                                <div className="text-sm text-slate-500 mt-2">No activities yet.</div>
                                                            );
                                                        })()}
                                                    </div>
                                                    <div className="mt-3 flex items-center gap-2">
                                                        <button 
                                                            type="button" 
                                                            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 ml-auto"
                                                            onClick={() => window.dispatchEvent(new CustomEvent("ka-open-activity-composer", { detail: { taskId: selectedTaskInPanel?.id } }))}
                                                        >
                                                            Add Activity
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col h-full">
                                            {/* Activities Tab Header */}
                                            <div className="px-2 pt-2 bg-white">
                                                <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                                    <div className="px-3 py-1 rounded-md text-sm font-semibold bg-white text-slate-900 shadow" aria-label="Activities">
                                                        <span className="inline-flex items-center gap-1">
                                                            <svg className="w-4 h-4" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" fill="currentColor" style={{ color: 'rgb(16, 185, 129)' }}>
                                                                <path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"></path>
                                                            </svg>
                                                            Activities
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Activities Table */}
                                            <div className="flex-1 overflow-auto p-4">
                                                <div className="flex items-center justify-center h-full text-slate-500 text-center">
                                                    <div>
                                                        <p className="text-lg font-medium mb-2">Select a task</p>
                                                        <p className="text-sm">Choose a task from the left panel to view its activities</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                                initialTaskWidth={50}
                                minTaskWidth={30}
                                minActivityWidth={30}
                            />
                            </div>
                        )}

                        {/* DELEGATED TAB: Two-section layout - pending at top, all delegated below */}
                        {viewTab === 'delegated' && (
                            <div className="flex-1 overflow-auto px-4 py-4" style={{ display: selectedTaskFull ? "none" : undefined }}>
                                {/* Section 1: Pending Delegations */}
                                <PendingDelegationsSection
                                    pendingTasks={pendingDelegations}
                                    keyAreas={keyAreas}
                                    onTaskAccept={async (taskId) => {
                                        // Remove from pending
                                        setPendingDelegations(prev => prev.filter(t => t.id !== taskId));
                                        
                                        // Reload ALL delegated tasks from backend to show the newly created accepted task with keyAreaId
                                        try {
                                            const delegatedToMe = await taskDelegationService.getDelegatedToMe();
                                            setAllTasks(delegatedToMe || []);
                                            
                                            // Update pending list by filtering for pending status only
                                            const pending = (delegatedToMe || []).filter(t => 
                                                (t.delegationStatus || t.delegation_status) === 'pending' || 
                                                !(t.delegationStatus || t.delegation_status)
                                            );
                                            setPendingDelegations(pending);
                                        } catch (error) {
                                            console.error('Failed to reload delegated tasks after accept:', error);
                                        }
                                    }}
                                    onTaskReject={async (taskId) => {
                                        // Remove from pending
                                        setPendingDelegations(prev => prev.filter(t => t.id !== taskId));
                                        
                                        // Reload delegated tasks to refresh the list
                                        try {
                                            const delegatedToMe = await taskDelegationService.getDelegatedToMe();
                                            setAllTasks(delegatedToMe || []);
                                        } catch (error) {
                                            console.error('Failed to reload delegated tasks after reject:', error);
                                        }
                                    }}
                                    getDelegatorName={(task) => {
                                        // First try to get from delegatedByUser object (enriched by backend)
                                        if (task.delegatedByUser) {
                                            return `${task.delegatedByUser.firstName || ''} ${task.delegatedByUser.lastName || ''}`.trim();
                                        }
                                        
                                        // Fallback to delegatedByUserId with users list
                                        const delegatorId = task.delegatedByUserId || task.delegated_by_user_id;
                                        const delegator = users.find(u => u.id === delegatorId);
                                        return delegator ? `${delegator.firstName} ${delegator.lastName}` : 'Unknown';
                                    }}
                                    currentUserId={currentUserId}
                                />

                                {/* Section 2: All Delegated Tasks with filters */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        All Delegated Tasks ({allTasks.length})
                                    </h3>
                                    <UnifiedTaskActivityTable
                                        viewTab={viewTab}
                                        tasks={allTasks}
                                        activities={Object.values(activitiesByTask).flat()}
                                        keyAreas={keyAreas}
                                        users={users}
                                        goals={goals}
                                        currentUserId={currentUserId}
                                        onTaskClick={(task) => {
                                            setSelectedTaskFull(task);
                                            setTaskFullInitialTab("activities");
                                        }}
                                        onActivityClick={(activity) => {
                                            const task = allTasks.find(t => String(t.id) === String(activity.taskId || activity.task_id));
                                            if (task) {
                                                setSelectedTaskFull(task);
                                                setTaskFullInitialTab("activities");
                                            }
                                        }}
                                        onTaskUpdate={async (id, updatedTask) => {
                                            try {
                                                if (updatedTask.delegatedToUserId) {
                                                    const svc = await getTaskService();
                                                    const delegatedToMe = await svc.list({ delegatedTo: true });
                                                    setAllTasks(delegatedToMe || []);
                                                } else {
                                                    const result = await api.updateTask(id, updatedTask);
                                                    setAllTasks(prev => prev.map(t => t.id === id ? result : t));
                                                }
                                            } catch (error) {
                                                console.error('Failed to update task:', error);
                                            }
                                        }}
                                        onTaskDelete={async (id) => {
                                            try {
                                                await api.deleteTask(id);
                                                setAllTasks(prev => prev.filter(t => t.id !== id));
                                            } catch (error) {
                                                console.error('Failed to delete task:', error);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Unified Table View for TODO, ACTIVITY TRAP tabs */}
                        {(viewTab === 'todo' || viewTab === 'activity-trap') && (
                            <div className="flex-1 overflow-auto px-4 py-4" style={{ display: selectedTaskFull ? "none" : undefined }}>
                                <UnifiedTaskActivityTable
                                    viewTab={viewTab}
                                    tasks={allTasks}
                                    activities={Object.values(activitiesByTask).flat()}
                                    keyAreas={keyAreas}
                                    users={users}
                                    goals={goals}
                                    currentUserId={currentUserId}
                                    onTaskClick={(task) => {
                                        setSelectedTaskFull(task);
                                        setTaskFullInitialTab("activities");
                                    }}
                                    onActivityClick={(activity) => {
                                        const task = allTasks.find(t => String(t.id) === String(activity.taskId || activity.task_id));
                                        if (task) {
                                            setSelectedTaskFull(task);
                                            setTaskFullInitialTab("activities");
                                        }
                                    }}
                                    onTaskUpdate={async (id, updatedTask) => {
                                        try {
                                            // If delegation happened, refresh the task list for the current view
                                            if (updatedTask.delegatedToUserId) {
                                                // Task was delegated, reload the appropriate view
                                                if (viewTab === 'todo') {
                                                    const svc = await getTaskService();
                                                    const allUserTasks = await svc.list({});
                                                    setAllTasks(allUserTasks || []);
                                                } else if (viewTab === 'activity-trap') {
                                                    const svc = await getTaskService();
                                                    const trapTasks = await svc.list({ withoutGoal: true });
                                                    setAllTasks(trapTasks || []);
                                                } else if (selectedKA) {
                                                    // Active tasks view - reload selected key area tasks
                                                    const rows = await api.listTasks(selectedKA.id);
                                                    setAllTasks(rows || []);
                                                }
                                            } else {
                                                // Normal update
                                                const result = await api.updateTask(id, updatedTask);
                                                setAllTasks(prev => prev.map(t => t.id === id ? result : t));
                                            }
                                        } catch (error) {
                                            console.error('Failed to update task:', error);
                                        }
                                    }}
                                    onTaskDelete={async (id) => {
                                        try {
                                            await api.deleteTask(id);
                                            setAllTasks(prev => prev.filter(t => t.id !== id));
                                        } catch (error) {
                                            console.error('Failed to delete task:', error);
                                        }
                                    }}
                                    onActivityUpdate={async (id, updatedActivity) => {
                                        try {
                                            const activityService = await getActivityService();
                                            const result = await activityService.update(id, updatedActivity);
                                            // Update the activities in state
                                            setActivitiesByTask(prev => {
                                                const updated = { ...prev };
                                                for (let key in updated) {
                                                    updated[key] = updated[key].map(a => a.id === id ? result : a);
                                                }
                                                return updated;
                                            });
                                        } catch (error) {
                                            console.error('Failed to update activity:', error);
                                        }
                                    }}
                                    onActivityDelete={async (id) => {
                                        try {
                                            const activityService = await getActivityService();
                                            await activityService.remove(id);
                                            // Remove the activity from state
                                            setActivitiesByTask(prev => {
                                                const updated = { ...prev };
                                                for (let key in updated) {
                                                    updated[key] = updated[key].filter(a => a.id !== id);
                                                }
                                                return updated;
                                            });
                                        } catch (error) {
                                            console.error('Failed to delete activity:', error);
                                        }
                                    }}
                                    onMassEdit={(selected) => {
                                        // TODO: Implement mass edit modal
                                        console.log('Mass edit:', selected);
                                    }}
                                />
                            </div>
                        )}

                        {/* Global Activities popover (attached to hamburger) */}
                        {openActivitiesMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenActivitiesMenu(null)} />
                                <div
                                    className="fixed z-50 w-72 bg-white border border-slate-200 rounded-lg shadow"
                                    style={{ top: `${activitiesMenuPos.top}px`, left: `${activitiesMenuPos.left}px` }}
                                    role="dialog"
                                    aria-label="Task activities"
                                >
                                    <div className="px-3 py-2 border-b text-sm font-semibold text-slate-900">
                                        Activities
                                    </div>
                                    <div className="max-h-60 overflow-auto">
                                        {(() => {
                                            const list = activitiesByTask[String(openActivitiesMenu)] || [];
                                            if (!list.length)
                                                return (
                                                    <div className="px-3 py-3">
                                                        <EmptyState title="No activities for this task yet." />
                                                    </div>
                                                );
                                            return (
                                                <ul className="py-1">
                                                    {list.map((a) => (
                                                        <li
                                                            key={a.id}
                                                            className="px-3 py-2 text-sm text-slate-800 border-b last:border-b-0"
                                                        >
                                                            <div className="truncate">{a.text}</div>
                                                            {/* createdAt removed */}
                                                        </li>
                                                    ))}
                                                </ul>
                                            );
                                        })()}
                                    </div>
                                    <div className="px-3 py-2 border-t flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
                                            onClick={() => {
                                                const tsk = allTasks.find(
                                                    (x) => String(x.id) === String(openActivitiesMenu),
                                                );
                                                if (tsk) {
                                                    setTaskFullInitialTab("activities");
                                                    setSelectedTaskFull(tsk);
                                                }
                                                setOpenActivitiesMenu(null);
                                            }}
                                        >
                                            Open
                                        </button>
                                        <button
                                            type="button"
                                            className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 text-sm hover:bg-slate-50"
                                            onClick={() => setOpenActivitiesMenu(null)}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                        {!selectedKA && !isGlobalTasksView && (
                            <>
                                {String(siteSearch || "").trim().length >= 2 && (
                                    <div className="mb-4 bg-white border border-slate-200 rounded-lg shadow-sm p-3">
                                        <div className="text-sm font-semibold text-slate-700 mb-2">
                                            Search results for “{siteSearch.trim()}”
                                        </div>
                                        {isSearching ? (
                                            <div className="text-sm text-slate-500">Searching…</div>
                                        ) : (searchResults && searchResults.length ? (
                                            <ul className="space-y-2">
                                                {searchResults.map((t) => {
                                                    const ka = (keyAreas || []).find((k) => String(k.id) === String(t.key_area_id || t.keyAreaId || t.key_area));
                                                    return (
                                                        <li key={t.id} className="text-sm">
                                                            <span className="font-semibold text-slate-900">{t.title || t.name}</span>
                                                            {ka ? (
                                                                <span className="text-slate-500"> — {ka.title || ka.name}</span>
                                                            ) : null}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (
                                            <div className="text-sm text-slate-500">No matching tasks found.</div>
                                        ))}
                                    </div>
                                )}
                                <KeyAreasList
                                    loading={loading}
                                    showOnlyIdeas={showOnlyIdeas}
                                    ideaForShow={ideaForShow}
                                    filteredKAs={filteredKAs}
                                    dragKAId={dragKAId}
                                    openKA={openKA}
                                    reorderByDrop={reorderByDrop}
                                    setDragKAId={setDragKAId}
                                    setEditing={setEditing}
                                    setShowForm={setShowForm}
                                    onDeleteKA={onDeleteKA}
                                />
                            </>
                        )}
                        {/* DETAIL: Tabs */}
                        {selectedKA && (
                            <div className="mt-4 space-y-4">
                                {/* Composer — rendered from left card; show form only when requested */}
                                {showTaskComposer && (
                                    <>
                                        {editingTaskId ? (
                                            // Use external EditTaskModal when editing a task
                                            <EditTaskModal
                                                isOpen={true}
                                                // ensure we always pass a definitive id into the modal's initialData
                                                initialData={{ ...(taskForm || {}), id: editingTaskId || taskForm?.id || null }}
                                                onSave={async (payload) => {
                                                    await handleSaveTask(payload);
                                                    setEditingTaskId(null);
                                                    setShowTaskComposer(false);
                                                }}
                                                onCancel={() => { setShowTaskComposer(false); setEditingTaskId(null); }}
                                                isSaving={false}
                                                users={users}
                                                currentUserId={currentUserId}
                                                keyAreas={keyAreas}
                                                goals={goals}
                                                availableLists={[1]}
                                            />
                                        ) : editingActivityViaTaskModal ? (
                                            // Use external EditActivityModal when editing an activity via task modal
                                            <EditActivityModal
                                                isOpen={true}
                                                    initialData={(function(){
                                                        try {
                                                            const id = editingActivityViaTaskModal.id;
                                                            const taskId = editingActivityViaTaskModal.taskId;
                                                            let raw = null;
                                                            if (taskId && activitiesByTask && activitiesByTask[String(taskId)]) {
                                                                raw = activitiesByTask[String(taskId)].find(a => String(a.id) === String(id));
                                                            }
                                                            const source = raw || activityForm || {};
                                                            const norm = normalizeActivity(source || {});
                                                            const parentTaskId = taskId ? String(taskId) : (norm.taskId || norm.task_id || norm.task ? String(norm.taskId || norm.task_id || norm.task) : null);
                                                            const parent = parentTaskId ? ((allTasks || []).find((t) => String(t.id) === String(parentTaskId)) || null) : null;
                                                            const resolvedKeyArea = norm.key_area_id || norm.keyAreaId || norm.keyArea || (parent && (parent.key_area_id || parent.keyAreaId || parent.keyArea)) || '';
                                                            const resolvedList = norm.list || norm.list_index || norm.listIndex || (parent && (parent.list || parent.list_index || parent.listIndex)) || '';
                                                            const resolvedAssignee = norm.assignee || norm.responsible || (parent && (parent.assignee || parent.responsible)) || '';
                                    return {
                                        id: norm.id || norm.activityId || null,
                                        type: 'activity',
                                        taskId: norm.taskId || norm.task_id || norm.task || '',
                                        text: norm.text || norm.activity_name || '',
                                        title: norm.text || norm.activity_name || '',
                                        description: norm.description || norm.notes || norm.note || '',
                                        start_date: norm.start_date || norm.startDate || norm.date_start || '',
                                        startDate: norm.start_date || norm.startDate || norm.date_start || '',
                                        end_date: norm.end_date || norm.endDate || norm.date_end || '',
                                        endDate: norm.end_date || norm.endDate || norm.date_end || '',
                                        deadline: norm.deadline || norm.dueDate || norm.due_date || '',
                                        duration: norm.duration || norm.duration_minutes || '',
                                        key_area_id: resolvedKeyArea,
                                        list: resolvedList,
                                        list_index: resolvedList,
                                        assignee: resolvedAssignee,
                                        priority: norm.priority ?? norm.priority_level ?? undefined,
                                        goal: norm.goal || norm.goal_id || norm.goalId || undefined,
                                        completed: norm.completed || false,
                                    };
                                                        } catch (e) {
                                                            return activityForm || {};
                                                        }
                                                    })()}
                                                keyAreas={keyAreas}
                                                users={users}
                                                goals={goals}
                                                tasks={allTasks}
                                                availableLists={availableListNumbers}
                                                onSave={async (payload) => {
                                                    await handleActivityModalSave(payload);
                                                    setEditingActivityViaTaskModal(null);
                                                    setShowEditActivityModal(false);
                                                }}
                                                onCancel={() => { setShowEditActivityModal(false); setEditingActivityViaTaskModal(null); }}
                                                isSaving={isSavingActivity}
                                            />
                                        ) : (
                                            // Use a dedicated CreateTaskModal component for creating tasks
                                            <CreateTaskModal
                                                isOpen={true}
                                                initialData={taskForm}
                                                keyAreas={keyAreas}
                                                users={users}
                                                goals={goals}
                                                availableLists={availableListNumbers}
                                                parentListNames={selectedKA ? listNames[selectedKA.id] : null}
                                                currentUserId={currentUserId}
                                                onSave={async (payload) => {
                                                    try {
                                                        const created = await api.createTask(payload);
                                                        setAllTasks((prev) => [...prev, created]);
                                                    } catch (err) {
                                                        console.error('Failed to create task from modal', err);
                                                    }
                                                    setEditingTaskId(null);
                                                    setShowTaskComposer(false);
                                                    setEditingActivityViaTaskModal(null);
                                                }}
                                                onCancel={() => { setShowTaskComposer(false); setEditingTaskId(null); setEditingActivityViaTaskModal(null); }}
                                                isSaving={false}
                                            />
                                        )}
                                    </>
                                )}

                                {showActivityComposer && (
                                    <CreateActivityFormModal
                                        isOpen={showActivityComposer}
                                        currentUserId={currentUserId}
                                        initialData={activityForm}
                                        onSave={handleActivityModalSave}
                                        onCancel={() => { setShowActivityComposer(false); setEditingActivityId(null); setActivityAttachTaskId(null); }}
                                        isSaving={isSavingActivity}
                                        keyAreas={keyAreas}
                                        users={users}
                                        goals={goals}
                                        tasks={allTasks}
                                        availableLists={availableListNumbers}
                                    />
                                )}

                                {/* Mass Edit Modal */}
                                {showMassEditModal && selectedIds.size > 0 && (
                                    <EditTaskModal
                                        isOpen={true}
                                        initialData={{
                                            type: 'bulk',
                                            count: selectedIds.size,
                                            key_area_id: (() => {
                                                const firstId = Array.from(selectedIds)[0];
                                                const firstTask = allTasks.find((t) => String(t.id) === String(firstId));
                                                return firstTask?.key_area_id || firstTask?.keyAreaId || selectedKA?.id || null;
                                            })(),
                                        }}
                                        onSave={async (payload) => {
                                            // Apply bulk edit to all selected tasks
                                            const updates = [];
                                            for (const id of Array.from(selectedIds)) {
                                                const original = allTasks.find((t) => String(t.id) === String(id));
                                                if (!original) continue;
                                                const next = { ...original };
                                                
                                                // Apply only the fields that are being edited
                                                if (payload.assignee) next.assignee = payload.assignee;
                                                if (payload.status) next.status = payload.status;
                                                if (payload.priority) next.priority = payload.priority;
                                                if (payload.start_date) next.start_date = payload.start_date;
                                                if (payload.deadline) next.deadline = payload.deadline;
                                                if (payload.end_date) next.end_date = payload.end_date;
                                                
                                                next.eisenhower_quadrant = computeEisenhowerQuadrant({
                                                    deadline: next.deadline,
                                                    end_date: next.end_date,
                                                    start_date: next.start_date,
                                                    priority: next.priority,
                                                    status: next.status,
                                                    key_area_id: next.key_area_id,
                                                });
                                                
                                                // eslint-disable-next-line no-await-in-loop
                                                const saved = await api.updateTask(next.id, next);
                                                updates.push(saved);
                                            }
                                            
                                            // Update state
                                            setAllTasks((prev) => {
                                                const map = new Map(prev.map((t) => [String(t.id), t]));
                                                updates.forEach((u) => map.set(String(u.id), { ...map.get(String(u.id)), ...u }));
                                                return Array.from(map.values());
                                            });
                                            
                                            setShowMassEditModal(false);
                                            clearSelection();
                                        }}
                                        onCancel={() => setShowMassEditModal(false)}
                                        isSaving={false}
                                        keyAreas={keyAreas}
                                        users={users}
                                        goals={goals}
                                        availableLists={availableListNumbers}
                                    />
                                )}

                                {/* Tasks list rendering moved inside the Task Lists card above */}

                                {/* Kanban/Calendar already rendered above based on view */}
                            </div>
                        )}
                        
                        {/* Modals Container */}
                        <>
                            {/* Create/Edit KA Modal */}
                            <KeyAreaModal
                                isOpen={showForm}
                                editing={editing}
                                onSave={onSaveKA}
                                onCancel={() => {
                                    setShowForm(false);
                                    setEditing(null);
                                }}
                            />
                        </>
                    </div>
                </main>
            </div>
        </div>
    );
}
