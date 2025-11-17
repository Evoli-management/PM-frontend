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
import ActivityList from '../components/key-areas/ActivityList';
import TaskSlideOver from '../components/key-areas/TaskSlideOver';
import TaskFullView from '../components/key-areas/TaskFullView';
import { FaTimes, FaSave, FaTag, FaTrash, FaAngleDoubleLeft, FaChevronLeft, FaStop, FaEllipsisV, FaEdit, FaSearch, FaPlus, FaBars, FaLock, FaExclamationCircle } from 'react-icons/fa';
import {
    safeParseDate,
    toIsoMidnightOrNull,
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
    async listTasks(keyAreaId) {
        // Fetch from backend and normalize for UI
        try {
            const rows = await (await getTaskService()).list({ keyAreaId });
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
            startDate: toIsoMidnightOrNull(task.start_date ?? task.startDate),
            dueDate: toIsoMidnightOrNull(task.deadline ?? task.due_date ?? task.dueDate),
            endDate: toIsoMidnightOrNull(task.end_date ?? task.endDate),
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
            title: task.title,
            description: nullableString(task.description, true),
            assignee: nullableString(task.assignee, true),
            startDate: toIsoMidnightOrNull(task.start_date ?? task.startDate, true),
            dueDate: toIsoMidnightOrNull(task.deadline ?? task.due_date ?? task.dueDate, true),
            endDate: toIsoMidnightOrNull(task.end_date ?? task.endDate, true),
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
                    priority: normalized.priority,
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
                                                Completed: {new Date(t.completionDate).toLocaleString()}
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
    const [allTasks, setAllTasks] = useState([]);
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
            const server = await taskService.get(id);
            if (server) {
                const normalized = {
                    ...server,
                    // server returned via taskService.get is already FE-friendly
                    status: server.status,
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
                const rows = await taskService.list({ keyAreaId: selectedKA?.id });
                const server = (Array.isArray(rows) ? rows : []).find((r) => r.id === id);
                if (server) {
                    const normalized = {
                        ...server,
                        // server returned via taskService.list/get is already FE-friendly
                        status: server.status,
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
    const [quadrant, setQuadrant] = useState("all");
    const [selectedTask, setSelectedTask] = useState(null);
    const [slideOverInitialTab, setSlideOverInitialTab] = useState("details");
    // Full page task view state
    const [selectedTaskFull, setSelectedTaskFull] = useState(null);
    const [taskFullInitialTab, setTaskFullInitialTab] = useState("activities");
    // Inline Activities popover state
    const [openActivitiesMenu, setOpenActivitiesMenu] = useState(null); // task id or null
    const [activitiesMenuPos, setActivitiesMenuPos] = useState({ top: 0, left: 0 });
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
    const [view, setView] = useState("list");
    const [goals, setGoals] = useState([]);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [showTaskComposer, setShowTaskComposer] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingActivityViaTaskModal, setEditingActivityViaTaskModal] = useState(null); // { id, taskId }
    const [showActivityComposer, setShowActivityComposer] = useState(false);
    const [editingActivityId, setEditingActivityId] = useState(null);
    const [showTaskHelp, setShowTaskHelp] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [listNames, setListNames] = useState({}); // { [keyAreaId]: { [index]: name } }
    const [showViewMenu, setShowViewMenu] = useState(false);
    const viewMenuRef = useRef(null);
    const [openListMenu, setOpenListMenu] = useState(null); // list number for context menu
    const [listMenuPos, setListMenuPos] = useState({ top: 0, left: 0 }); // popup menu position
    const composerModalRef = useRef(null);
    const tabsRef = useRef(null);
    // Mass edit UI toggle and anchor
    const [showMassEdit, setShowMassEdit] = useState(false);
    const tasksDisplayRef = useRef(null);
    const [users, setUsers] = useState([]);

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
                // Reset form and editing state for new activity
                setEditingActivityId(null);
                setActivityForm({
                    title: "",
                    description: "",
                    list: "",
                    key_area_id: selectedKA?.id || "",
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
            setActivityAttachTaskId(tid ? String(tid) : null);
            setShowActivityComposer(true);
        };
        window.addEventListener("ka-open-activity-composer", handler);
        return () => window.removeEventListener("ka-open-activity-composer", handler);
        }, [selectedKA]);

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
                priority: mapPriority(task.priority),
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
                key_area_id: task.key_area_id || selectedKA?.id || "",
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
                priority: mapPriority(norm.priority),
                tags: "",
                recurrence: "",
                attachments: "",
                attachmentsFiles: [],
                assignee: norm.assignee || norm.responsible || "",
                key_area_id: norm.key_area_id || selectedKA?.id || "",
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
                key_area_id: norm.key_area_id || selectedKA?.id || "",
                assignee: norm.assignee || norm.responsible || "",
                priority: mapPriority(norm.priority),
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
                const list = await usersService.list();
                setUsers(list);
            } catch {
                setUsers([]);
            }
        })();
    }, []);

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
        key_area_id: "",
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
        if (selectedIds.size === 0 && showMassEdit) setShowMassEdit(false);
    }, [selectedIds, showMassEdit]);

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

        // also respect query params when navigated via Link
        const params = new URLSearchParams(location.search);
        if (params.get("view") === "all") showAll();
        if (params.get("select") === "ideas") selectIdeas();

        return () => {
            window.removeEventListener("sidebar-keyareas-click", showAll);
            window.removeEventListener("sidebar-ideas-click", selectIdeas);
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
        const t = await api.listTasks(ka.id);
        try { console.info('KeyAreas.openKA loaded tasks', { kaId: String(ka.id), count: Array.isArray(t) ? t.length : 0 }); } catch (__) {}
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
        setSearchTerm("");
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
        const val = prompt("Rename list", current);
        if (val === null) return; // cancelled
        const newMap = { ...(listNames[String(selectedKA.id)] || {}), [String(n)]: val };
        setListNames((prev) => ({ ...prev, [String(selectedKA.id)]: newMap }));
        try {
            const svc = await getKeyAreaService();
            await svc.update(selectedKA.id, { listNames: newMap });
        } catch (e) {
            console.error("Failed to persist list names", e);
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
        const newMap = { ...rest };
        setListNames((prev) => ({ ...prev, [String(kaId)]: newMap }));
        if (taskTab === n) setTaskTab(1);
        try {
            const svc = await getKeyAreaService();
            await svc.update(kaId, { listNames: newMap });
        } catch (e) {
            console.error("Failed to persist list names", e);
            alert("Failed to delete list. Please try again.");
        }
    };

    const visibleTasks = useMemo(() => {
        let arr = allTasks.filter((t) => (t.list_index || 1) === taskTab);
        if (searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            arr = arr.filter(
                (t) => (t.title || "").toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q),
            );
        }
        if (quadrant !== "all") arr = arr.filter((t) => String(t.eisenhower_quadrant || "") === quadrant);
        return arr;
    }, [allTasks, taskTab, searchTerm, quadrant]);

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
        const allSelected = visibleTasks.every((t) => all.has(t.id));
        if (allSelected) {
            // unselect all visible
            visibleTasks.forEach((t) => all.delete(t.id));
        } else {
            visibleTasks.forEach((t) => all.add(t.id));
        }
        setSelectedIds(all);
    };

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
                priority: next.priority,
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
                const mapPriorityToNum = (p) => {
                    const s = String(p || "normal").toLowerCase();
                    if (s === "low") return 1;
                    if (s === "high") return 3;
                    return 2;
                };
                const body = {
                    text: title,
                    completed: (f.get("status") || "open").toString() === "done",
                    priority: mapPriorityToNum(priority),
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
                key_area_id: "",
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
            priority: updated.priority,
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
            // Normalize incoming payload for API shape
            const body = {
                text: (payload.text || payload.activity_name || payload.title || "").trim(),
                completed: !!payload.completed,
            };
            // Allow task attachment if provided
            if (payload.taskId || payload.task_id) body.taskId = payload.taskId || payload.task_id;

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
                if (tid) {
                    try {
                        const list = await svc.list({ taskId: tid });
                        setActivitiesByTask((prev) => ({ ...prev, [String(tid)]: Array.isArray(list) ? list.map(normalizeActivity) : [] }));
                    } catch (e) {
                        // ignore
                    }
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
        <div className="min-h-screen bg-slate-50">
            <div className="flex w-full overflow-x-hidden">
                {" "}
                {/* ensure wrapper hides overflow */}
                <Sidebar
                    user={{ name: "User" }}
                    collapsed={sidebarCollapsed}
                    onCollapseToggle={() => setSidebarCollapsed((c) => !c)}
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
                <main
                    className={`flex-1 min-w-0 w-full transition-all ${mobileSidebarOpen ? "ml-64" : "ml-0"} md:ml-[3mm]`}
                >
                    {" "}
                    {/* min-w-0 prevents overflow of flex children */}
                    <div className="max-w-full overflow-x-hidden">
                        {" "}
                        {/* content constrained to available width */}
                        {/* Header / Search / New KA */}
                        <div
                            className="flex items-center justify-between gap-3 mb-4 mt-4 md:mt-6"
                            style={{ display: selectedTaskFull ? "none" : undefined }}
                        >
                            {!selectedKA ? (
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
                                                <FaPlus /> New Key Area
                                            </button>
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

                                    {/* Show selected KA icon then title inline */}
                                    {selectedKA && (
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
                                                style={{ color: selectedKA.color || '#1F2937' }}
                                            >
                                                {selectedKA.title}
                                            </span>
                                        </div>
                                    )}

                                    <div className="ml-auto flex items-center gap-2">
                                        <div className="flex items-center bg-white rounded-lg px-2 py-1 shadow border border-slate-200">
                                            <FaSearch className="text-slate-700 mr-2" />
                                            <input
                                                placeholder={`Search tasks in "${selectedKA.title}"…`}
                                                className="bg-transparent outline-none text-sm w-40 sm:w-56"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>

                                        <select
                                            className="bg-white rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                            value={quadrant}
                                            onChange={(e) => setQuadrant(e.target.value)}
                                            title="Focus quadrant"
                                        >
                                            <option value="all">All Quadrants</option>
                                            <option value="1">Q1 • Important & Urgent</option>
                                            <option value="2">Q2 • Important, Not Urgent</option>
                                            <option value="3">Q3 • Not Important, Urgent</option>
                                            <option value="4">Q4 • Not Important, Not Urgent</option>
                                        </select>

                                        {/* View dropdown */}
                                        <div className="relative" ref={viewMenuRef}>
                                            <button
                                                onClick={() => setShowViewMenu((s) => !s)}
                                                className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm font-semibold hover:bg-slate-50"
                                                aria-haspopup="menu"
                                                aria-expanded={showViewMenu ? "true" : "false"}
                                            >
                                                View
                                                <svg
                                                    className={`w-4 h-4 transition-transform ${showViewMenu ? "rotate-180" : "rotate-0"}`}
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M6 9l6 6 6-6" />
                                                </svg>
                                            </button>
                                            {showViewMenu && (
                                                <div
                                                    role="menu"
                                                    className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow z-50"
                                                >
                                                    {[
                                                        { key: "list", label: "List" },
                                                        { key: "kanban", label: "Kanban" },
                                                        { key: "calendar", label: "Calendar" },
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.key}
                                                            role="menuitem"
                                                            onClick={() => {
                                                                setView(opt.key);
                                                                setShowViewMenu(false);
                                                            }}
                                                            className={`block w-full text-left px-3 py-2 text-sm ${
                                                                view === opt.key
                                                                    ? "bg-blue-100 text-blue-700 font-semibold"
                                                                    : "text-slate-800 hover:bg-slate-50"
                                                            }`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
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
                                            priority: mapPriority(task.priority),
                                            tags: task.tags || "",
                                            recurrence: task.recurrence || "",
                                            attachments: task.attachments || "",
                                            attachmentsFiles: task.attachments
                                                ? task.attachments.split(",").filter(Boolean).map((n) => ({ name: n }))
                                                : [],
                                            assignee: task.assignee || "",
                                            key_area_id: (selectedKA && selectedKA.id) || task.key_area_id || task.keyAreaId || "",
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
                        {selectedKA && (
                            <div className="mb-4" style={{ display: selectedTaskFull ? "none" : undefined }}>
                                <div className="max-w-7xl mx-auto p-6">
                                    <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-6 space-y-6">
                                        {/* Header Row: Task Lists Label + Mass Edit Control */}
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-700">Task Lists:</span>
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
                                                        if (showMassEdit) {
                                                            setShowMassEdit(false);
                                                        } else {
                                                            setShowMassEdit(true);
                                                            // Scroll to Tasks Display area where the form appears
                                                            setTimeout(() => {
                                                                if (tasksDisplayRef.current) {
                                                                    tasksDisplayRef.current.scrollIntoView({
                                                                        behavior: "smooth",
                                                                        block: "start",
                                                                    });
                                                                }
                                                            }, 0);
                                                        }
                                                    }}
                                                    className="px-4 py-2 rounded-md text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                                    aria-label="mass edit"
                                                    title={selectedIds.size === 0 ? "Select tasks to enable mass edit" : "Mass edit selected tasks"}
                                                >
                                                    {showMassEdit ? "Exit Mass Edit" : "Mass Edit"}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Tabs Section */}
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
                                            {showMassEdit && (
                                                <form
                                                    onSubmit={applyBulkEdit}
                                                    aria-label="Mass edit selected tasks"
                                                    className="mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg"
                                                >
                                                    <div className="text-sm text-blue-900 font-medium mb-3">
                                                        {selectedIds.size === 0 
                                                            ? "Mass Edit Mode: Select tasks to edit multiple tasks at once"
                                                            : `Mass edit ${selectedIds.size} task${selectedIds.size > 1 ? "s" : ""}`
                                                        }
                                                    </div>
                                                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                        <div>
                                                            <label className="block text-xs text-blue-900">
                                                                Assignee
                                                            </label>
                                                            <input
                                                                value={bulkForm.assignee}
                                                                onChange={(e) =>
                                                                    setBulkForm((s) => ({
                                                                        ...s,
                                                                        assignee: e.target.value,
                                                                    }))
                                                                }
                                                                className="w-full border rounded px-2 py-1 bg-white"
                                                                placeholder="Name"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-blue-900">
                                                                Status
                                                            </label>
                                                            <select
                                                                value={bulkForm.status}
                                                                onChange={(e) =>
                                                                    setBulkForm((s) => ({
                                                                        ...s,
                                                                        status: e.target.value,
                                                                    }))
                                                                }
                                                                className="w-full border rounded px-2 py-1 bg-white"
                                                            >
                                                                <option value="">(leave as is)</option>
                                                                <option value="open">Open</option>
                                                                <option value="in_progress">In Progress</option>
                                                                <option value="done">Done</option>
                                                                <option value="cancelled">Cancelled</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-blue-900">
                                                                Priority
                                                            </label>
                                                            <select
                                                                value={bulkForm.priority}
                                                                onChange={(e) =>
                                                                    setBulkForm((s) => ({
                                                                        ...s,
                                                                        priority: e.target.value,
                                                                    }))
                                                                }
                                                                className="w-full border rounded px-2 py-1 bg-white"
                                                            >
                                                                <option value="">(leave as is)</option>
                                                                <option value="low">Low</option>
                                                                <option value="med">Medium</option>
                                                                <option value="high">High</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-blue-900">
                                                                Start Date
                                                            </label>
                                                            <input
                                                                type="date"
                                                                value={bulkForm.start_date}
                                                                onChange={(e) =>
                                                                    setBulkForm((s) => ({
                                                                        ...s,
                                                                        start_date: e.target.value,
                                                                    }))
                                                                }
                                                                className="w-full border rounded px-2 py-1 bg-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-blue-900">
                                                                Deadline
                                                            </label>
                                                            <input
                                                                type="date"
                                                                value={bulkForm.deadline}
                                                                onChange={(e) =>
                                                                    setBulkForm((s) => ({
                                                                        ...s,
                                                                        deadline: e.target.value,
                                                                    }))
                                                                }
                                                                className="w-full border rounded px-2 py-1 bg-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-blue-900">
                                                                End date
                                                            </label>
                                                            <input
                                                                type="date"
                                                                value={bulkForm.end_date}
                                                                onChange={(e) =>
                                                                    setBulkForm((s) => ({
                                                                        ...s,
                                                                        end_date: e.target.value,
                                                                    }))
                                                                }
                                                                className="w-full border rounded px-2 py-1 bg-white"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setBulkForm({
                                                                    assignee: "",
                                                                    status: "",
                                                                    priority: "",
                                                                    start_date: "",
                                                                    deadline: "",
                                                                    end_date: "",
                                                                })
                                                            }
                                                            className="px-3 py-1.5 bg-slate-200 text-slate-900 rounded-md hover:bg-slate-300"
                                                        >
                                                            Clear all
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            disabled={selectedTasks.length === 0}
                                                            className={`px-3 py-1.5 rounded-md ${
                                                                selectedTasks.length === 0
                                                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                            }`}
                                                        >
                                                            Apply
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowMassEdit(false)}
                                                            className="px-3 py-1.5 text-blue-700 hover:underline"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </form>
                                            )}
                                            {view === "list" ? (
                                                visibleTasks.length === 0 ? (
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
                                                                                visibleTasks.length > 0 &&
                                                                                visibleTasks.every((t) =>
                                                                                    selectedIds.has(t.id),
                                                                                )
                                                                            }
                                                                            onChange={selectAllVisible}
                                                                        />
                                                                    </th>
                                                                    <th className="px-3 py-2 text-left font-semibold w-[160px] sm:w-[220px]">
                                                                        Task
                                                                    </th>
                                                                    <th className="px-3 py-2 text-left font-semibold">
                                                                        Assignee
                                                                    </th>
                                                                    <th className="px-3 py-2 text-left font-semibold">
                                                                        Status
                                                                    </th>
                                                                    <th className="px-3 py-2 text-left font-semibold">
                                                                        Priority
                                                                    </th>
                                                                    <th className="px-3 py-2 text-left font-semibold">
                                                                        Quadrant
                                                                    </th>
                                                                    <th className="px-3 py-2 text-left font-semibold">
                                                                        Goal
                                                                    </th>
                                                                    <th className="px-3 py-2 text-left font-semibold">
                                                                        Tags
                                                                    </th>
                                                                    <th className="px-3 py-2 text-left font-semibold">
                                                                        Start Date
                                                                    </th>
                                                                    <th className="px-3 py-2 text-left font-semibold">
                                                                        End date
                                                                    </th>
                                                                    <th className="px-3 py-2 text-left font-semibold">
                                                                        Deadline
                                                                    </th>
                                                                    <th className="px-3 py-2 text-left font-semibold">
                                                                        Duration
                                                                    </th>
                                                                    <th className="px-3 py-2 text-left font-semibold">
                                                                        Completed
                                                                    </th>
                                                                    <th className="px-3 py-2 text-center font-semibold w-24" title="Actions">
                                                                        Actions
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white">
                                                                {visibleTasks.map((t) => {
                                                                    const q =
                                                                        t.eisenhower_quadrant ||
                                                                        computeEisenhowerQuadrant({
                                                                            deadline: t.deadline,
                                                                            end_date: t.end_date,
                                                                            priority: t.priority,
                                                                        });
                                                                    return (
                                                                        <React.Fragment key={t.id}>
                                                                            <TaskRow
                                                                                t={t}
                                                                                goals={goals}
                                                                                goalMap={goalTitleMap}
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
                                                                                        priority: mapPriority(t.priority),
                                                                                        tags: t.tags || "",
                                                                                        recurrence: t.recurrence || "",
                                                                                        attachments: t.attachments || "",
                                                                                        attachmentsFiles: t.attachments
                                                                                            ? t.attachments.split(",").filter(Boolean).map((n) => ({ name: n }))
                                                                                            : [],
                                                                                        assignee: t.assignee || "",
                                                                                        key_area_id: t.key_area_id || t.keyAreaId || selectedKA?.id || "",
                                                                                        list: "",
                                                                                        finish_date: t.finish_date || "",
                                                                                        duration: t.duration || "",
                                                                                        _endAuto: false,
                                                                                    });
                                                                                    setEditingTaskId(t.id);
                                                                                    setShowTaskComposer(true);
                                                                                }}
                                                                                onDeleteClick={() => handleDeleteTask(t)}
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
                                        
                                        {/* Add Task Footer */}
                                        <div className="flex justify-end pr-10 pt-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTaskForm((s) => ({
                                                        ...s,
                                                        list_index: taskTab,
                                                        // Prefill key area with the currently selected Key Area when creating a new task
                                                        key_area_id: selectedKA?.id || s.key_area_id || s.keyAreaId || "",
                                                    }));
                                                    setShowTaskComposer(true);
                                                }}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                aria-label="Add task"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                                Add Task
                                            </button>
                                        </div>
                                    </div>
                                </div>
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
                        {!selectedKA && (
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

                                {/* Tasks list rendering moved inside the Task Lists card above */}

                                {/* Kanban/Calendar already rendered above based on view */}
                            </div>
                        )}
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
                    </div>
                </main>
            </div>
        </div>
    );
}
