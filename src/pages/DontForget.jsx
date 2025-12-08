import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar.jsx";
import { getPriorityLevel } from "../utils/keyareasHelpers";
import { useToast } from "../components/shared/ToastProvider.jsx";
import { FiAlertTriangle, FiClock } from "react-icons/fi";
import { FaCheck, FaExclamation, FaLongArrowAltDown, FaTimes, FaTrash, FaBars, FaCog, FaSearch } from "react-icons/fa";
import CreateTaskModal from "../components/key-areas/CreateTaskModal.jsx";
import EditTaskModal from "../components/key-areas/EditTaskModal.jsx";
import TaskRow from "../components/key-areas/TaskRow.jsx";
import TaskFullView from "../components/key-areas/TaskFullView";
// Activity composer removed from DontForget: activities are not fetched here

// Lazy getters for services to allow code-splitting
let _taskService = null;
const getTaskService = async () => {
    if (_taskService) return _taskService;
    const mod = await import("../services/taskService");
    _taskService = mod.default || mod;
    return _taskService;
};

let _keyAreaService = null;
const getKeyAreaService = async () => {
    if (_keyAreaService) return _keyAreaService;
    const mod = await import("../services/keyAreaService");
    _keyAreaService = mod.default || mod;
    return _keyAreaService;
};

let _usersService = null;
const getUsersService = async () => {
    if (_usersService) return _usersService;
    const mod = await import("../services/usersService");
    _usersService = mod.default || mod;
    return _usersService;
};

let _goalService = null;
const getGoalService = async () => {
    if (_goalService) return _goalService;
    const mod = await import("../services/goalService");
    _goalService = mod;
    return _goalService;
};

// Note: activityService loader removed for DontForget (no activity fetching)

export default function DontForget() {
    const location = useLocation();
    const navigate = useNavigate();

    // Open Don't Forget view if ?dontforget=1
    const [viewMode, setViewMode] = useState("list");
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Don’t Forget tasks: now server-backed (tasks without keyAreaId)
    const [tasks, setTasks] = useState([]);
    // DF header list names (local-only)
    const [dfListNames, setDfListNames] = useState(() => {
        try {
            const raw = localStorage.getItem("dfListNames");
            const parsed = raw ? JSON.parse(raw) : {};
            // ensure at least List 1 exists
            if (!parsed || Object.keys(parsed).length === 0) return { 1: "List 1" };
            return parsed;
        } catch {
            return { 1: "List 1" };
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem("dfListNames", JSON.stringify(dfListNames));
        } catch {}
    }, [dfListNames]);

    // Optional per-list descriptions shown when a list has no tasks
    const [dfListDescriptions, setDfListDescriptions] = useState(() => {
        try {
            const raw = localStorage.getItem('dfListDescriptions');
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem('dfListDescriptions', JSON.stringify(dfListDescriptions));
        } catch (e) {}
    }, [dfListDescriptions]);

    // (List descriptions feature removed) dfListDescriptions remains for potential future use

    // Key Areas for assignment dialog
    const [dfKeyAreas, setDfKeyAreas] = useState([]);
    // Backend Key Area id used to persist Don't Forget list names
    const [dfKeyAreaId, setDfKeyAreaId] = useState(null);
    // Users and goals to pre-populate selects in Create/Edit modals
    const [users, setUsers] = useState([]);
    const [goals, setGoals] = useState([]);
    const { addToast } = useToast ? useToast() : { addToast: () => {} };
    useEffect(() => {
        if (viewMode !== "dont-forget") return;
        (async () => {
            try {
                const list = await (await getKeyAreaService()).list({ includeTaskCount: false });
                // Exclude Ideas/default area from choices
                setDfKeyAreas(list.filter((k) => !k.is_default && (k.title || "").toLowerCase() !== "ideas"));
            } catch (e) {
                setDfKeyAreas([]);
            }
        })();
    }, [viewMode]);

    // Load or create a dedicated Key Area for Don't Forget so list names can be persisted
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const svc = await getKeyAreaService();
                const list = await svc.list({ includeTaskCount: false });
                if (cancelled) return;
                // normalize titles to compare (handle "Don't Forget" vs "Dont Forget")
                const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const targetKey = 'dontforget';
                const found = (list || []).find((k) => normalize(k.title) === targetKey);
                const localStored = (() => {
                    try {
                        const raw = localStorage.getItem('dfListNames');
                        return raw ? JSON.parse(raw) : null;
                    } catch (_) { return null; }
                })();
                if (found) {
                    setDfKeyAreaId(found.id);
                    // Prefer server listNames but merge local names as fallback
                    const serverNames = found.listNames || {};
                    const merged = { ...(localStored || {}), ...(serverNames || {}) };
                    setDfListNames(merged && Object.keys(merged).length ? merged : (localStored || serverNames || { 1: 'List 1' }));
                    // If we had local names but server lacks them, persist local names
                    if (localStored && (!found.listNames || Object.keys(found.listNames || {}).length === 0)) {
                        try {
                            await svc.update(found.id, { listNames: localStored });
                        } catch (e) {
                            // ignore persistence errors
                        }
                    }
                } else {
                    // No existing KA named DontForget - create one and persist any local names
                    const created = await svc.create({ title: "Don't Forget", description: 'Dont Forget lists' });
                    if (cancelled) return;
                    setDfKeyAreaId(created.id);
                    const toUse = (localStored && Object.keys(localStored).length) ? localStored : { 1: 'List 1' };
                    setDfListNames(toUse);
                    try {
                        await svc.update(created.id, { listNames: toUse });
                    } catch (e) {
                        // ignore
                    }
                }
            } catch (e) {
                // If key areas cannot be fetched, keep local list names (already set from localStorage)
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Columns / showCompleted preferences (persisted to same keys as KeyAreas for consistency)
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
    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const raw = window.localStorage.getItem('keyareas.visibleColumns');
            if (raw) return { ...defaultVisible, ...(JSON.parse(raw) || {}) };
        } catch (e) {}
        return defaultVisible;
    });
    const [showCompleted, setShowCompleted] = useState(() => {
        try {
            const raw = window.localStorage.getItem('keyareas.showCompleted');
            if (raw !== null) return raw === 'true';
        } catch (e) {}
        return true;
    });
    const [showColumnsMenu, setShowColumnsMenu] = useState(false);
    const columnsMenuRef = useRef(null);
    useEffect(() => {
        try { window.localStorage.setItem('keyareas.visibleColumns', JSON.stringify(visibleColumns)); } catch (e) {}
    }, [visibleColumns]);

    // force header re-mount when visibleColumns changes to ensure <thead> layout updates
    const [headerKey, setHeaderKey] = useState(0);
    useEffect(() => { try { setHeaderKey((k) => k + 1); } catch (e) {} }, [visibleColumns]);
    useEffect(() => { try { window.localStorage.setItem('keyareas.showCompleted', String(!!showCompleted)); } catch (e) {} }, [showCompleted]);
    // close columns menu on outside click / Escape
    useEffect(() => {
        if (!showColumnsMenu) return;
        const handleClick = (e) => { if (!columnsMenuRef.current) return; if (!columnsMenuRef.current.contains(e.target)) setShowColumnsMenu(false); };
        const handleKey = (e) => { if (e.key === 'Escape') setShowColumnsMenu(false); };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
    }, [showColumnsMenu]);

    

    // Fetch current user and goals to pass into modals so dropdowns are pre-populated
    useEffect(() => {
        if (viewMode !== "dont-forget") return;
        let cancelled = false;
        (async () => {
            try {
                const [uSvc, gSvc] = await Promise.all([getUsersService(), getGoalService()]);
                const usersArr = uSvc && typeof uSvc.list === "function" ? await uSvc.list() : [];
                const goalsArr = gSvc && typeof gSvc.getGoals === "function" ? await gSvc.getGoals() : [];
                if (cancelled) return;
                setUsers(usersArr || []);
                setGoals(goalsArr || []);
            } catch (e) {
                if (!cancelled) {
                    setUsers([]);
                    setGoals([]);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [viewMode]);

    // Assignment modal state
    const [assignModal, setAssignModal] = useState({ open: false, task: null, kaId: "", listIndex: 1 });

    // Load DF tasks from backend on mount (and keep once-updated list for the page)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await (await getTaskService()).list({ unassigned: true });
                if (!cancelled) {
                    // Map API fields to this view’s expected shape
                    const mapped = data.map((t) => ({
                        id: t.id,
                        name: t.title,
                        assignee: t.assignee || "",
                        status: t.status || "open",
                        priority: getPriorityLevel(t.priority),
                        quadrant: typeof t.eisenhowerQuadrant !== 'undefined' && t.eisenhowerQuadrant !== null ? Number(t.eisenhowerQuadrant) : 3,
                        goal: "", // not modeled on backend yet
                        tags: "", // not modeled on backend yet
                        start_date: t.startDate ? t.startDate.slice(0, 10) : "",
                        dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
                        end_date: t.endDate ? t.endDate.slice(0, 10) : "",
                        duration: t.duration || "",
                        // preserve raw ISO for completionDate so we can format locally
                        completionDate: t.completionDate || null,
                        time: "",
                        notes: t.description || "",
                        keyArea: "", // DF has no key area
                        listIndex: t.listIndex || t.list_index || 1,
                        completed: t.status === "done", // FE semantic
                        imported: false,
                    }));
                    // Apply any locally-stored DF list overrides so user selections persist
                    setTasks(applyDfMapTo(mapped));
                }
            } catch (e) {
                console.error("Failed to load Don’t Forget tasks", e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Listen for global "open-create-modal" events so DontForget can open its
    // local composer without relying on ModalManager. This lets the Navbar's
    // quick-create dispatch still open the composer when DontForget is visible.
    useEffect(() => {
        const handler = (e) => {
            try {
                const detail = e?.detail || e;
                const type = detail?.type || detail;
                if (String(type) === 'dontforget') {
                    setViewMode('dont-forget');
                    setShowComposer(true);
                }
            } catch (err) {
                // ignore
            }
        };
        window.addEventListener('open-create-modal', handler);
        return () => window.removeEventListener('open-create-modal', handler);
    }, []);

    // Listen for global 'dontforget-created' events (dispatched by ModalManager)
    // so that if a task is created via the global composer the DontForget page
    // still updates its local list. This decouples DontForget from needing the
    // ModalManager to render the composer itself.
    useEffect(() => {
        const handler = (e) => {
            const created = e && e.detail ? e.detail : null;
            if (!created) return;
            try {
                const mapped = {
                    id: created.id,
                    name: created.title,
                    assignee: created.assignee || "",
                    status: created.status || "open",
                    priority: getPriorityLevel(created.priority),
                    quadrant: typeof created.eisenhowerQuadrant !== 'undefined' && created.eisenhowerQuadrant !== null ? Number(created.eisenhowerQuadrant) : 3,
                    goal: "",
                    tags: "",
                    start_date: created.startDate ? (created.startDate.slice ? created.startDate.slice(0,10) : created.startDate) : "",
                    dueDate: created.dueDate ? (created.dueDate.slice ? created.dueDate.slice(0,10) : created.dueDate) : "",
                    end_date: created.endDate ? (created.endDate.slice ? created.endDate.slice(0,10) : created.endDate) : "",
                    duration: created.duration || "",
                    time: "",
                    notes: created.description || "",
                    keyArea: "",
                    listIndex: created.listIndex || created.list_index || 1,
                    completed: created.status === "done" || created.status === "completed",
                    imported: false,
                };
                setTasks((prev) => [...(prev || []), mapped]);
                // Persist DF list assignment if server didn't include it
                try {
                    const assigned = mapped.listIndex || mapped.list_index || 1;
                    setDfTaskListMap((p) => ({ ...(p || {}), [mapped.id]: assigned }));
                } catch (e) {}
            } catch (err) {
                console.error('Failed to apply dontforget-created event', err);
            }
        };
        window.addEventListener('dontforget-created', handler);
        return () => window.removeEventListener('dontforget-created', handler);
    }, []);

    // Activities are loaded on-demand per-task (when opening the full task view)
    // to avoid fetching activities for every DF task on page load. The
    // `openFullTaskView` handler fetches activities for the selected task.

    // If URL contains ?task=<id>, open that task in the full view when tasks are loaded
    useEffect(() => {
        if (viewMode !== "dont-forget") return;
        const params = new URLSearchParams(location.search || "");
        const taskParam = params.get("task");
        if (!taskParam) return;
        if (!tasks || tasks.length === 0) return;
        const found = tasks.find((t) => String(t.id) === String(taskParam));
        if (found) openFullTaskView(found);
    }, [location.search, viewMode, tasks]);


    useEffect(() => {
        const params = new URLSearchParams(location.search || "");
        if (params.get("dontforget") === "1") setViewMode("dont-forget");
    }, [location.search]);

    // Helpers
    const toDateOnly = (val) => {
        if (!val) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        const d = new Date(val);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().slice(0, 10);
    };
    const formatDurationDays = (start, end) => {
        const s = toDateOnly(start);
        const e = toDateOnly(end);
        if (!s || !e) return "";
        const ms = new Date(e + "T00:00:00Z").getTime() - new Date(s + "T00:00:00Z").getTime();
        if (!isFinite(ms)) return "";
        const days = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
        return `${days}d`;
    };

    // UI state
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showImported, setShowImported] = useState(true);
    const [savingIds, setSavingIds] = useState(new Set());
    const [dfName, setDfName] = useState("");
    const [showComposer, setShowComposer] = useState(false);
    // Full task view state (TaskFullView integration)
    const [selectedTask, setSelectedTask] = useState(null);

    // Site-wide search (local copy for header) and view dropdown state to match KeyAreas header
    const [siteSearch, setSiteSearch] = useState("");
    const [view, setView] = useState("list");
    const [showViewMenu, setShowViewMenu] = useState(false);
    const viewMenuRef = useRef(null);

    // close view dropdown on outside click or Escape (mirror KeyAreas behavior)
    useEffect(() => {
        if (!showViewMenu) return;
        const handleClick = (e) => {
            if (!viewMenuRef.current) return;
            if (!viewMenuRef.current.contains(e.target)) setShowViewMenu(false);
        };
        const handleKey = (e) => {
            if (e.key === "Escape") setShowViewMenu(false);
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [showViewMenu]);

    // Activity -> create-task handler removed: DontForget does not manage activities

    // Activity composer/refresh handlers removed: DontForget does not fetch activities

    // Fallback: listen for global edit requests dispatched by TaskFullView
    useEffect(() => {
        if (viewMode !== 'dont-forget') return;
        const handler = (ev) => {
            const tsk = ev && ev.detail ? ev.detail : null;
            if (!tsk) return;
            try {
                // eslint-disable-next-line no-console
                console.log('[DontForget] global ka-request-edit-task received for', tsk && tsk.id);
            } catch (e) {}
            const form = {
                name: tsk.name || "",
                notes: tsk.notes || "",
                assignee: tsk.assignee || "",
                status: tsk.status || "open",
                priority: getPriorityLevel(tsk.priority),
                start_date: tsk.start_date || "",
                end_date: tsk.end_date || "",
                dueDate: tsk.dueDate || "",
                duration: tsk.duration || "",
                keyAreaId: "",
                listIndex: tsk.listIndex || 1,
                goal: tsk.goal || "",
                tags: tsk.tags || "",
                time: tsk.time || "",
                completionDate: tsk.completionDate || null,
            };
            setEditModal({ open: true, id: tsk.id, form });
            setMassEditingMode(false);
        };
        window.addEventListener('ka-request-edit-task', handler);
        return () => window.removeEventListener('ka-request-edit-task', handler);
    }, [viewMode]);
    // When true, the EditTaskModal is being used to edit multiple selected tasks
    const [massEditingMode, setMassEditingMode] = useState(false);
    // Editor modal for DF task details
    const [editModal, setEditModal] = useState({ open: false, id: null, form: null });

    // NOTE: moved definition of dontForgetTasks below selectedDfList to avoid TDZ when
    // selectedDfList is referenced before initialization. See below after getDfListName().

    // DF lists available = union of explicit names and any task listIndex values
    const availableDfLists = useMemo(() => {
        const s = new Set([1]);
        tasks.forEach((t) => {
            if (t.listIndex) s.add(Number(t.listIndex));
        });
        Object.keys(dfListNames || {}).forEach((k) => {
            const n = Number(k);
            if (n) s.add(n);
        });
        return Array.from(s).sort((a, b) => a - b);
    }, [tasks, dfListNames]);
    // Which DF list is currently active/selected in the UI. Default to first available.
    const [selectedDfList, setSelectedDfList] = useState(() => {
        try {
            const raw = Object.keys(dfListNames || {});
            if (raw && raw.length) return Number(raw.sort((a,b) => a-b)[0]) || 1;
        } catch {}
        return 1;
    });
    useEffect(() => {
        if (!availableDfLists || availableDfLists.length === 0) return;
        if (!availableDfLists.includes(selectedDfList)) setSelectedDfList(availableDfLists[0]);
    }, [availableDfLists]);
    const getDfListName = (n) => (dfListNames?.[n] ? dfListNames[n] : `List ${n}`);
    const addDfList = () => {
        const max = availableDfLists.length ? Math.max(...availableDfLists) : 0;
        const next = (max || 0) + 1;
        const nextMap = (prev => ({ ...(prev || {}), [next]: `List ${next}` }))(dfListNames);
        setDfListNames(nextMap);
        // Persist to backend if we have a DontForget key area
        (async () => {
            if (!dfKeyAreaId) return;
            try {
                const svc = await getKeyAreaService();
                await svc.update(dfKeyAreaId, { listNames: nextMap });
            } catch (e) {
                // ignore persistence errors
            }
        })();
    };
    const renameDfList = (n) => {
        const current = getDfListName(n);
        const val = prompt("Rename list", current);
        if (val === null) return;
        const nextMap = { ...(dfListNames || {}), [n]: val };
        setDfListNames(nextMap);
        (async () => {
            if (!dfKeyAreaId) return;
            try {
                const svc = await getKeyAreaService();
                await svc.update(dfKeyAreaId, { listNames: nextMap });
            } catch (e) {
                // ignore persistence errors
            }
        })();
    };
    // Ellipsis menu per DF list chip (popup like Key Areas)
    const [openDfListMenu, setOpenDfListMenu] = useState(null); // number | null
    const [dfListMenuPos, setDfListMenuPos] = useState({ top: 0, left: 0 });
    const chipsRef = useRef(null);
    useEffect(() => {
        if (openDfListMenu == null) return;
        const onDown = (e) => {
            if (!chipsRef.current) return;
            if (!chipsRef.current.contains(e.target)) setOpenDfListMenu(null);
        };
        const onKey = (e) => {
            if (e.key === "Escape") setOpenDfListMenu(null);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [openDfListMenu]);
    const deleteDfList = (n) => {
        const hasTasks = (tasks || []).some((t) => Number(t.listIndex || 1) === Number(n));
        if (hasTasks) {
            alert("This list contains tasks. Move those tasks to another list before deleting.");
            return;
        }
        setDfListNames((prev) => {
            const { [n]: _removed, ...rest } = prev || {};
            const next = { ...rest };
            // Persist deletion to backend if we have a DontForget key area
            (async () => {
                if (!dfKeyAreaId) return;
                try {
                    const svc = await getKeyAreaService();
                    await svc.update(dfKeyAreaId, { listNames: next });
                } catch (e) {
                    // ignore persistence errors
                }
            })();
            return next;
        });
        setOpenDfListMenu(null);
    };

    // Persist per-task DF list assignments in localStorage as a fallback; the server-provided
    // `listIndex` (task.listIndex / task.list_index) is now authoritative and preferred when present.
    const [dfTaskListMap, setDfTaskListMap] = useState(() => {
        try {
            const raw = localStorage.getItem('dfTaskListMap');
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem('dfTaskListMap', JSON.stringify(dfTaskListMap));
        } catch (e) {}
    }, [dfTaskListMap]);

    // Sync changes to dfTaskListMap to server so list membership is persisted across devices.
    // We skip the initial mount (which loads localStorage) to avoid mass-syncing on page load.
    const _dfMapMounted = useRef(false);
    const _prevDfMap = useRef(dfTaskListMap);
    useEffect(() => {
        if (!_dfMapMounted.current) {
            _dfMapMounted.current = true;
            _prevDfMap.current = dfTaskListMap;
            return;
        }
        const prev = _prevDfMap.current || {};
        const curr = dfTaskListMap || {};
        const changed = Object.keys(curr).filter((k) => String(curr[k]) !== String(prev[k]));
        if (changed.length === 0) {
            _prevDfMap.current = { ...curr };
            return;
        }
        (async () => {
            for (const id of changed) {
                const value = curr[id];
                try {
                    // optimistic UI: show saving indicator while syncing
                    try { markSaving(id, 1200); } catch (e) {}
                    // send numeric listIndex to server
                    await (await getTaskService()).update(id, { listIndex: Number(value) });
                    // update local in-memory tasks to reflect server value
                    setTasks((prev) => prev.map((t) => (String(t.id) === String(id) ? { ...t, listIndex: Number(value) } : t)));
                } catch (err) {
                    // warn but don't block UI
                    // eslint-disable-next-line no-console
                    console.warn('[DontForget] Failed to persist listIndex for', id, err);
                }
            }
            _prevDfMap.current = { ...curr };
        })();
    }, [dfTaskListMap]);

    const applyDfMapTo = (arr) => (arr || []).map((t) => {
        // Prefer server-provided listIndex/list_index when available. Fall back to local mapping
        // stored in `dfTaskListMap` only when server value is absent. This makes the server
        // authoritative for DontForget list membership across devices.
        const serverVal = (typeof t.listIndex !== 'undefined' && t.listIndex !== null)
            ? t.listIndex
            : (typeof t.list_index !== 'undefined' && t.list_index !== null ? t.list_index : null);
        const localVal = dfTaskListMap && dfTaskListMap[t.id] ? Number(dfTaskListMap[t.id]) : null;
        const resolved = serverVal !== null ? serverVal : (localVal !== null ? localVal : 1);
        return { ...t, listIndex: resolved };
    });

    // Which DF tasks are visible in the list (filtered by selected DF list)
    const dontForgetTasks = useMemo(
        () =>
            (tasks || []).filter((t) => {
                if (t.keyArea) return false;
                if (!(showImported || !t.imported)) return false;
                if (!(showCompleted || !t.completed)) return false;
                // Only include tasks that belong to the selected DF list
                const idx = Number(t.listIndex ?? t.list_index ?? 1);
                if (selectedDfList && Number(selectedDfList) !== Number(idx)) return false;
                return true;
            }),
        [tasks, showImported, showCompleted, selectedDfList],
    );

    const addDontForgetTask = async (payload) => {
        // Accept either `name` (old composer) or `title` (CreateTaskModal)
        const name = (payload?.name ?? payload?.title ?? dfName).trim();
        if (!name) return;
        try {
            // Map UI values to backend enums where applicable
            const statusMap = {
                open: "todo",
                "in progress": "in_progress",
                done: "completed",
                cancelled: "cancelled",
            };
            const mappedStatus = payload?.status ? statusMap[payload.status] : undefined;
            const mappedPriority = payload?.priority === "normal" ? "medium" : payload?.priority;

            const body = {
                title: name,
                description: payload?.notes || payload?.description || "",
                assignee: payload?.assignee || "",
                startDate: payload?.start_date ? new Date(payload.start_date).toISOString() : undefined,
                endDate: payload?.end_date ? new Date(payload.end_date).toISOString() : undefined,
                // support both deadline (from CreateTaskModal) and dueDate
                dueDate: payload?.dueDate
                    ? new Date(payload.dueDate).toISOString()
                    : payload?.deadline
                    ? new Date(payload.deadline).toISOString()
                    : undefined,
                duration: payload?.duration ? String(payload.duration) : undefined,
                // Only include status/priority if provided, else let backend defaults apply
                ...(mappedStatus ? { status: mappedStatus } : {}),
                ...(mappedPriority ? { priority: mappedPriority } : {}),
            };
            try {
                // Debug: log payload being sent to the API
                // eslint-disable-next-line no-console
                console.log('[DontForget] creating task payload', body);
            } catch (e) {}
            // support keyArea naming variants
            if (payload?.keyAreaId) body.keyAreaId = payload.keyAreaId;
            if (payload?.key_area_id) body.keyAreaId = payload.key_area_id;
                try {
                    const created = await (await getTaskService()).create(body);
                    // Debug: log selected listIndex from payload and created response
                    try { console.log('[DontForget] payload.listIndex', payload?.listIndex, 'payload.list_index', payload?.list_index); } catch (e) {}
                    // Push to local list
                    if (!payload?.keyAreaId) {
                        const newItem = {
                            id: created.id,
                            name: created.title,
                            assignee: created.assignee || "",
                            status: created.status || "open",
                            priority: getPriorityLevel(created.priority),
                            quadrant: (function (v, fallback) {
                                if (typeof v !== 'undefined' && v !== null) return Number(v);
                                if (typeof fallback !== 'undefined' && fallback !== null) {
                                    const s = String(fallback || '').trim();
                                    if (/^Q?\d$/.test(s)) return Number(s.replace(/^Q/, '')) || 3;
                                }
                                return 3;
                            })(created.eisenhowerQuadrant, payload?.quadrant),
                            goal: payload?.goal || "",
                            tags: payload?.tags || "",
                            start_date: created.startDate ? created.startDate.slice(0, 10) : "",
                            dueDate: created.dueDate ? created.dueDate.slice(0, 10) : "",
                            end_date: created.endDate ? created.endDate.slice(0, 10) : "",
                            duration: created.duration || "",
                            time: payload?.time || "",
                            notes: created.description || "",
                            keyArea: "",
                            listIndex: payload?.listIndex ?? payload?.list_index ?? selectedDfList ?? 1,
                            completed: created.status === 'done',
                            imported: !!payload?.imported,
                        };
                        // Debug: show the new item being inserted locally
                        try { console.log('[DontForget] new DF task item', newItem); } catch (e) {}
                        setTasks((prev) => [...prev, newItem]);
                        // Persist the chosen list for this new task so it survives refresh
                        try {
                            setDfTaskListMap((prev) => ({ ...(prev || {}), [created.id]: newItem.listIndex }));
                        } catch (e) {}
                    }
                    setDfName("");
                } catch (err) {
                // Log detailed API error to console to help debug
                // eslint-disable-next-line no-console
                console.error('[DontForget] create task failed', err?.response?.status, err?.response?.data || err.message || err);
                throw err;
            }
            // no external key area select to reset
        } catch (e) {
            console.error("Failed to create task", e);
        }
    };

    // Saving indicator helper
    const markSaving = (id, delay = 600) => {
        setSavingIds((prev) => new Set(prev).add(id));
        window.setTimeout(() => {
            setSavingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }, delay);
    };

    // Selection helpers
    const isSelected = (id) => selectedIds.has(id);
    const toggleSelect = (id) =>
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    const clearSelection = () => setSelectedIds(new Set());
    const toggleSelectAllVisible = () => {
        const all = new Set(selectedIds);
        const visible = dontForgetTasks.map((t) => t.id);
        const allSelected = visible.length > 0 && visible.every((id) => all.has(id));
        if (allSelected) visible.forEach((id) => all.delete(id));
        else visible.forEach((id) => all.add(id));
        setSelectedIds(all);
    };

    // Mass edit actions
    const massDelete = async () => {
        if (selectedIds.size === 0) return;
        try {
            // Remove on server, ignore individual failures so we best-effort proceed
            await Promise.all(
                Array.from(selectedIds).map(async (id) => {
                    try {
                        await (await getTaskService()).remove(id);
                    } catch (e) {
                        console.warn("Failed to delete task", id, e);
                    }
                }),
            );
            setTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)));
        } finally {
            clearSelection();
        }
    };
    const massSetPriority = (p) =>
        setTasks((prev) => prev.map((t) => (selectedIds.has(t.id) ? { ...t, priority: p } : t)));
    const massComplete = (val) =>
        setTasks((prev) => prev.map((t) => (selectedIds.has(t.id) ? { ...t, completed: !!val } : t)));

    // Row actions
    const toggleCompleted = async (id) => {
        const t = tasks.find((x) => x.id === id);
        if (!t) return;
        const newCompleted = !t.completed;
        const newStatus = newCompleted ? "done" : "open";
        try {
            await (await getTaskService()).update(id, { status: newStatus });
            setTasks((prev) =>
                prev.map((x) => (x.id === id ? { ...x, completed: newCompleted, status: newStatus } : x)),
            );
            markSaving(id);
                // No toast in Don't Forget list to match KeyAreas behavior
        } catch (e) {
            console.error("Failed to update status", e);
        }
    };
    const setPriority = async (id, p) => {
        try {
            await (await getTaskService()).update(id, { priority: p });
            setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, priority: p } : t)));
            markSaving(id);
        } catch (e) {
            console.error("Failed to update priority", e);
        }
    };
    const setStatus = async (id, s) => {
        try {
            await (await getTaskService()).update(id, { status: s });
            setTasks((prev) =>
                prev.map((t) =>
                    t.id === id
                        ? { ...t, status: s, completed: s === 'done' }
                        : t,
                ),
            );
            markSaving(id);
            // show a success toast for completed tasks
            // No toast in Don't Forget list to match KeyAreas behavior
        } catch (e) {
            console.error('Failed to update status', e);
        }
    };
    const deleteTask = async (id) => {
        try {
            await (await getTaskService()).remove(id);
            setTasks((prev) => prev.filter((t) => t.id !== id));
            // Remove any local DF list mapping for this task
            try {
                setDfTaskListMap((prev) => {
                    const { [id]: _removed, ...rest } = prev || {};
                    return rest;
                });
            } catch (e) {}
        } catch (e) {
            console.error("Failed to delete task", e);
        }
    };
    const updateField = async (id, key, value) => {
        // Optimistic update: apply locally, send patch, rollback on failure
        const prevTasks = tasks;
        const prevTask = tasks.find((t) => t.id === id);
        if (!prevTask) return;

        // Local optimistic transform for display
        const optimistic = (t) => {
            if (t.id !== id) return t;
            if (key === 'priority') {
                try {
                    // store normalized numeric priority for consistent rendering
                    const lvl = getPriorityLevel(value);
                    return { ...t, priority: lvl };
                } catch (e) {
                    return { ...t, priority: value };
                }
            }
            return { ...t, [key]: value };
        };
        setTasks((prev) => prev.map(optimistic));
        markSaving(id, 2000);

        // Build patch body for API
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
            // Not backed by API: keep optimistic state only
            return;
        }

        try {
            const updated = await (await getTaskService()).update(id, patch);
            // reconcile server response into local task (format dates to YYYY-MM-DD)
            setTasks((prev) =>
                prev.map((t) =>
                    t.id === id
                        ? {
                              ...t,
                              name: updated.title || t.name,
                              notes: updated.description || t.notes || "",
                              assignee: updated.assignee || t.assignee || "",
                              start_date: updated.startDate ? updated.startDate.slice(0, 10) : (patch.startDate === null ? "" : t.start_date),
                              end_date: updated.endDate ? updated.endDate.slice(0, 10) : (patch.endDate === null ? "" : t.end_date),
                              dueDate: updated.dueDate ? updated.dueDate.slice(0, 10) : (patch.dueDate === null ? "" : t.dueDate),
                              duration: updated.duration || t.duration || "",
                              status: updated.status || t.status,
                              priority: typeof updated.priority !== 'undefined' ? getPriorityLevel(updated.priority) : t.priority,
                          }
                        : t,
                ),
            );
            // success
            markSaving(id);
        } catch (err) {
            // rollback optimistic update
            console.error('[DontForget] Failed to update field', err);
            setTasks(prevTasks);
            try {
                const msg = err?.response?.data?.message || err?.message || 'Failed to save';
                addToast && addToast({ type: 'error', message: msg });
            } catch (e) {}
        }
    };

    // Open DF task editor modal with full details
    const openDfTaskEditor = (task) => {
        setEditModal({
            open: true,
            id: task.id,
            form: {
                name: task.name || "",
                assignee: task.assignee || "",
                status: task.status || "open",
                priority: getPriorityLevel(task.priority),
                start_date: task.start_date || "",
                end_date: task.end_date || "",
                dueDate: task.dueDate || "",
                duration: task.duration || "",
                quadrant: (function normalizeQ(q) {
                    if (q === undefined || q === null) return 3;
                    if (typeof q === 'number') return q;
                    const s = String(q || '').trim();
                    if (/^Q?\d$/.test(s)) return Number(s.replace(/^Q/, '')) || 3;
                    return 3;
                })(task.quadrant),
                goal: task.goal || "",
                tags: task.tags || "",
                time: task.time || "",
                notes: task.notes || "",
                listIndex: task.listIndex || 1,
                // include completionDate (raw ISO) as read-only
                completionDate: task.completionDate || null,
                keyAreaId: "",
            },
        });
    };

    // Open the TaskFullView for a DF task (activities are not loaded here)
    const openFullTaskView = async (task) => {
        if (!task) return;
        setSelectedTask({ ...task, title: task.name });
    };
    const confirmAssignAndOpen = async () => {
        const { task, kaId } = assignModal;
        if (!task || !kaId) return;
            try {
                // Assign to the selected Key Area (UUID) — omit listIndex (not supported by API)
            await (await getTaskService()).update(task.id, { keyAreaId: kaId });
            // Remove from DF view
            setTasks((prev) => prev.filter((t) => t.id !== task.id));
            // Remove any local DF list mapping for this task when moving to a Key Area
            try {
                setDfTaskListMap((prev) => {
                    const { [task.id]: _removed, ...rest } = prev || {};
                    return rest;
                });
            } catch (e) {}
            setAssignModal({ open: false, task: null, kaId: "", listIndex: 1 });
            // Navigate and open full task view
            navigate({ pathname: "/key-areas", search: `?ka=${kaId}&openKA=1&task=${task.id}` });
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || "Failed to move task";
            alert(msg);
        }
    };

    // mass edit is now handled by EditTaskModal (handleMassEditSave)

    // Save DF task editor changes (maps to API where supported)
    const saveDfTaskEdit = async () => {
        const { id, form } = editModal;
        if (!id || !form) return;
        const patch = {};
        if (form.name !== undefined) patch.title = form.name;
        if (form.notes !== undefined) patch.description = form.notes;
        if (form.assignee !== undefined) patch.assignee = form.assignee;
        if (form.status !== undefined) patch.status = form.status;
        if (form.priority !== undefined) patch.priority = form.priority;
        if (form.start_date !== undefined)
            patch.startDate = form.start_date ? new Date(form.start_date).toISOString() : null;
        if (form.end_date !== undefined) patch.endDate = form.end_date ? new Date(form.end_date).toISOString() : null;
        if (form.dueDate !== undefined) patch.dueDate = form.dueDate ? new Date(form.dueDate).toISOString() : null;
        if (form.duration !== undefined) patch.duration = form.duration;
        if (form.keyAreaId) patch.keyAreaId = form.keyAreaId;
        try {
            const updated = await (await getTaskService()).update(id, patch);
            if (form.keyAreaId) {
                // Task moved to a Key Area: remove from DF list and open it in Key Areas
                setTasks((prev) => prev.filter((t) => t.id !== id));
                try {
                    setDfTaskListMap((prev) => {
                        const { [id]: _removed, ...rest } = prev || {};
                        return rest;
                    });
                } catch (e) {}
                navigate({ pathname: "/key-areas", search: `?ka=${form.keyAreaId}&openKA=1&task=${id}` });
            } else {
                // Update local task (including client-only fields)
                setTasks((prev) =>
                    prev.map((t) =>
                        t.id === id
                            ? {
                                  ...t,
                                  name: updated.title,
                                  notes: updated.description || form.notes || "",
                                  assignee: updated.assignee || form.assignee || "",
                                  start_date: updated.startDate
                                      ? updated.startDate.slice(0, 10)
                                      : form.start_date || "",
                                  end_date: updated.endDate ? updated.endDate.slice(0, 10) : form.end_date || "",
                                  dueDate: updated.dueDate ? updated.dueDate.slice(0, 10) : form.dueDate || "",
                                  duration: updated.duration || form.duration || "",
                                  status: updated.status || form.status || "open",
                                  priority: getPriorityLevel(updated.priority ?? form.priority),
                                  quadrant: (function (v, fallback) {
                                      if (typeof v !== 'undefined' && v !== null) return Number(v);
                                      if (typeof fallback !== 'undefined' && fallback !== null) {
                                          const s = String(fallback || '').trim();
                                          if (/^Q?\d$/.test(s)) return Number(s.replace(/^Q/, '')) || 3;
                                      }
                                      return 3;
                                  })(updated.eisenhowerQuadrant, form.quadrant || t.quadrant),
                                  goal: form.goal || t.goal,
                                  tags: form.tags || t.tags,
                                  time: form.time || t.time,
                                  listIndex: form.listIndex || t.listIndex || 1,
                              }
                            : t,
                    ),
                );
                // If listIndex changed, persist it locally
                try {
                    if (form.listIndex !== undefined) {
                        setDfTaskListMap((prev) => ({ ...(prev || {}), [id]: form.listIndex }));
                    }
                } catch (e) {}
            }
            setEditModal({ open: false, id: null, form: null });
            markSaving(id);
        } catch (e) {
            console.error("Failed to save edits", e);
            alert(e?.response?.data?.message || e?.message || "Failed to save");
        }
    };

    // Handlers to integrate external modal components (EditTaskModal)
    const _mapEditInitial = () => {
        const f = editModal.form || {};
        return {
            id: editModal.id,
            title: f.name || "",
            description: f.notes || "",
            assignee: f.assignee || "",
            status: f.status || "open",
            priority: getPriorityLevel(f.priority),
            start_date: f.start_date || "",
            end_date: f.end_date || "",
            deadline: f.dueDate || "",
            duration: f.duration || "",
            key_area_id: f.keyAreaId || "",
            list_index: f.listIndex || 1,
            goal: f.goal || "",
            tags: f.tags || "",
            time: f.time || "",
            completionDate: f.completionDate || null,
        };
    };

    const handleEditModalSave = async (payload) => {
        // payload shape follows EditTaskModal's onSave (title, description, start_date, end_date, deadline, etc.)
        const id = editModal.id;
        if (!id) return;
        const patch = {};
        if (payload.title !== undefined) patch.title = payload.title;
        if (payload.description !== undefined) patch.description = payload.description;
        if (payload.assignee !== undefined) patch.assignee = payload.assignee;
        if (payload.status !== undefined) patch.status = payload.status;
        if (payload.priority !== undefined) patch.priority = payload.priority;
        if (payload.start_date !== undefined)
            patch.startDate = payload.start_date ? new Date(payload.start_date).toISOString() : null;
        if (payload.end_date !== undefined) patch.endDate = payload.end_date ? new Date(payload.end_date).toISOString() : null;
        if (payload.deadline !== undefined) patch.dueDate = payload.deadline ? new Date(payload.deadline).toISOString() : null;
        if (payload.duration !== undefined) patch.duration = payload.duration;
        if (payload.key_area_id) patch.keyAreaId = payload.key_area_id;

        try {
            const updated = await (await getTaskService()).update(id, patch);
            // If moved to a Key Area, remove from DF and open in Key Areas
            if (payload.key_area_id) {
                setTasks((prev) => prev.filter((t) => t.id !== id));
                try {
                    setDfTaskListMap((prev) => {
                        const { [id]: _removed, ...rest } = prev || {};
                        return rest;
                    });
                } catch (e) {}
                navigate({ pathname: "/key-areas", search: `?ka=${payload.key_area_id}&openKA=1&task=${id}` });
            } else {
                setTasks((prev) =>
                    prev.map((t) =>
                        t.id === id
                            ? {
                                  ...t,
                                  name: updated.title,
                                  notes: updated.description || payload.description || "",
                                  assignee: updated.assignee || payload.assignee || "",
                                  start_date: updated.startDate ? updated.startDate.slice(0, 10) : payload.start_date || "",
                                  end_date: updated.endDate ? updated.endDate.slice(0, 10) : payload.end_date || "",
                                  dueDate: updated.dueDate ? updated.dueDate.slice(0, 10) : payload.deadline || "",
                                  duration: updated.duration || payload.duration || "",
                                  status: updated.status || payload.status || "open",
                                  priority: getPriorityLevel(updated.priority ?? payload.priority),
                                  quadrant: (function (v, fallback) {
                                      if (typeof v !== 'undefined' && v !== null) return Number(v);
                                      if (typeof fallback !== 'undefined' && fallback !== null) {
                                          const s = String(fallback || '').trim();
                                          if (/^Q?\d$/.test(s)) return Number(s.replace(/^Q/, '')) || 3;
                                      }
                                      return 3;
                                  })(updated.eisenhowerQuadrant, payload.quadrant || t.quadrant),
                                  goal: payload.goal || t.goal,
                                  tags: payload.tags || t.tags,
                                  time: payload.time || t.time,
                                  listIndex: payload.list_index || t.listIndex || 1,
                              }
                            : t,
                    ),
                );
                // Persist any list_index changes from external edit modal
                try {
                    if (payload.list_index !== undefined) {
                        setDfTaskListMap((prev) => ({ ...(prev || {}), [id]: payload.list_index }));
                    }
                } catch (e) {}
            }
            setEditModal({ open: false, id: null, form: null });
            markSaving(id);
        } catch (e) {
            console.error("Failed to save edits (external)", e);
            alert(e?.response?.data?.message || e?.message || "Failed to save");
        }
    };

    // Apply the same EditTaskModal payload to all selected tasks (mass edit)
    const handleMassEditSave = async (payload) => {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        try {
            await Promise.all(
                ids.map(async (id) => {
                    const patch = {};
                    if (payload.title !== undefined) patch.title = payload.title;
                    if (payload.description !== undefined) patch.description = payload.description;
                    if (payload.assignee !== undefined) patch.assignee = payload.assignee;
                    if (payload.status !== undefined) patch.status = payload.status;
                    if (payload.priority !== undefined) patch.priority = payload.priority;
                    if (payload.start_date !== undefined)
                        patch.startDate = payload.start_date ? new Date(payload.start_date).toISOString() : null;
                    if (payload.end_date !== undefined)
                        patch.endDate = payload.end_date ? new Date(payload.end_date).toISOString() : null;
                    if (payload.deadline !== undefined)
                        patch.dueDate = payload.deadline ? new Date(payload.deadline).toISOString() : null;
                    if (payload.duration !== undefined) patch.duration = payload.duration;
                    if (payload.key_area_id) patch.keyAreaId = payload.key_area_id;
                    try {
                        if (Object.keys(patch).length > 0) await (await getTaskService()).update(id, patch);
                    } catch (e) {
                        console.warn("Failed to update (mass)", id, e);
                    }
                }),
            );

            setTasks((prev) =>
                prev
                    .map((t) => {
                        if (!selectedIds.has(t.id)) return t;
                        // If key_area_id present, we'll remove the task from DF view (returned later)
                        const u = { ...t };
                        if (payload.start_date !== undefined) u.start_date = payload.start_date || "";
                        if (payload.end_date !== undefined) u.end_date = payload.end_date || "";
                        if (payload.deadline !== undefined) u.dueDate = payload.deadline || "";
                        if (payload.duration !== undefined) u.duration = payload.duration || "";
                        if (payload.assignee !== undefined) u.assignee = payload.assignee || "";
                        if (payload.status !== undefined) u.status = payload.status || u.status;
                        if (payload.priority !== undefined) u.priority = payload.priority || u.priority;
                        if (payload.list_index !== undefined) u.listIndex = payload.list_index || u.listIndex;
                        if (payload.goal !== undefined) u.goal = payload.goal || u.goal;
                        if (payload.tags !== undefined) u.tags = payload.tags || u.tags;
                        if (payload.key_area_id) return null; // remove moved tasks
                        return u;
                    })
                    .filter(Boolean),
            );

            // If tasks were moved to a key area, remove them from DF view
            if (payload.key_area_id) {
                setTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)));
                // Remove mapping for moved tasks
                try {
                    setDfTaskListMap((prev) => {
                        const next = { ...(prev || {}) };
                        ids.forEach((id) => {
                            delete next[id];
                        });
                        return next;
                    });
                } catch (e) {}
            }

            // If mass edit included list_index updates, persist them
            try {
                if (payload.list_index !== undefined) {
                    setDfTaskListMap((prev) => {
                        const next = { ...(prev || {}) };
                        ids.forEach((id) => {
                            next[id] = payload.list_index;
                        });
                        return next;
                    });
                }
            } catch (e) {}

            ids.forEach((id) => markSaving(id, 800));
            setEditModal({ open: false, id: null, form: null });
            setMassEditingMode(false);
            clearSelection();
        } catch (e) {
            console.error("Mass edit failed (modal)", e);
            alert(e?.message || "Mass edit failed");
        }
    };

    const _mapAssignInitial = () => {
        const t = assignModal.task || {};
        return {
            id: t.id,
            title: t.name || t.title || "",
            description: t.notes || t.description || "",
            key_area_id: assignModal.kaId || "",
            list_index: assignModal.listIndex || 1,
        };
    };

    const handleAssignSave = async (payload) => {
        // payload expected to contain key_area_id and optionally list_index
        const task = assignModal.task;
        if (!task || !payload || !payload.key_area_id) return;
        try {
            await (await getTaskService()).update(task.id, { keyAreaId: payload.key_area_id });
            setTasks((prev) => prev.filter((t) => t.id !== task.id));
            // Remove any local DF mapping for the moved task
            try {
                setDfTaskListMap((prev) => {
                    const { [task.id]: _removed, ...rest } = prev || {};
                    return rest;
                });
            } catch (e) {}
            setAssignModal({ open: false, task: null, kaId: "", listIndex: 1 });
            navigate({ pathname: "/key-areas", search: `?ka=${payload.key_area_id}&openKA=1&task=${task.id}` });
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || "Failed to move task";
            alert(msg);
        }
    };

    return (
        <div className="flex min-h-screen overflow-x-hidden">
            <Sidebar 
                user={{ name: "Hussein" }} 
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
            />

            {/* Mobile backdrop */}
            {mobileSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}

            <main className="flex-1 min-w-0 w-full min-h-screen transition-all overflow-y-auto">
                {/* Mobile menu button */}
                <button
                    className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-gray-200"
                    onClick={() => setMobileSidebarOpen(true)}
                >
                    <FaBars className="h-5 w-5 text-gray-600" />
                </button>
                {selectedTask ? (
                    <div>
                        <div className="bg-white rounded-xl border border-slate-200">
                            <div className="bg-white rounded-xl border border-slate-200">
                                <TaskFullView
                                    task={selectedTask}
                                    goals={goals}
                                    users={users}
                                    currentUserId={users && users[0] ? users[0].id : null}
                                    // DontForget does not fetch activities; provide empty map
                                    activitiesByTask={{}}
                                    onBack={() => setSelectedTask(null)}
                                    onSave={async (payload) => {
                                        try {
                                            const updated = await (await getTaskService()).update(selectedTask.id, payload);
                                            setTasks((prev) => prev.map((t) =>
                                                t.id === selectedTask.id
                                                    ? {
                                                          ...t,
                                                          name: updated.title,
                                                          notes: updated.description || t.notes || "",
                                                          assignee: updated.assignee || t.assignee || "",
                                                          start_date: updated.startDate ? updated.startDate.slice(0, 10) : t.start_date || "",
                                                          end_date: updated.endDate ? updated.endDate.slice(0, 10) : t.end_date || "",
                                                          dueDate: updated.dueDate ? updated.dueDate.slice(0, 10) : t.dueDate || "",
                                                          duration: updated.duration || t.duration || "",
                                                          status: updated.status || t.status || "open",
                                                          priority: getPriorityLevel(updated.priority ?? t.priority),
                                                      }
                                                    : t
                                            ));
                                            setSelectedTask(null);
                                        } catch (e) {
                                            console.error('Failed to save task from full view', e);
                                            throw e;
                                        }
                                    }}
                                    onDelete={async (tsk) => {
                                        await deleteTask(tsk.id);
                                        setSelectedTask(null);
                                    }}
                                    onRequestEdit={(tsk) => {
                                        try {
                                            // eslint-disable-next-line no-console
                                            console.log('[DontForget] onRequestEdit received for task', tsk && tsk.id);
                                        } catch (e) {}
                                        const form = {
                                            name: tsk.name || "",
                                            notes: tsk.notes || "",
                                            assignee: tsk.assignee || "",
                                            status: tsk.status || "open",
                                            priority: getPriorityLevel(tsk.priority),
                                            start_date: tsk.start_date || "",
                                            end_date: tsk.end_date || "",
                                            dueDate: tsk.dueDate || "",
                                            duration: tsk.duration || "",
                                            keyAreaId: "",
                                            listIndex: tsk.listIndex || 1,
                                            goal: tsk.goal || "",
                                            tags: tsk.tags || "",
                                            time: tsk.time || "",
                                            completionDate: tsk.completionDate || null,
                                        };
                                        setEditModal({ open: true, id: tsk.id, form });
                                        setMassEditingMode(false);
                                    }}
                                    // activity-saving props removed for DontForget
                                    isDontForget={true}
                                    kaTitle={"Don't Forget"}
                                    allTasks={tasks}
                                    listNumbers={availableDfLists}
                                    listNames={dfListNames}
                                />

                                {/* Edit modal must be available while TaskFullView is open */}
                                <EditTaskModal
                                    isOpen={Boolean(editModal.open)}
                                    initialData={_mapEditInitial()}
                                    onCancel={() => {
                                        setEditModal({ open: false, id: null, form: null });
                                        setMassEditingMode(false);
                                    }}
                                    onSave={(payload) => {
                                        if (massEditingMode) return handleMassEditSave(payload);
                                        return handleEditModalSave(payload);
                                    }}
                                    isSaving={editModal.id ? savingIds.has(editModal.id) : false}
                                    keyAreas={dfKeyAreas}
                                    availableLists={availableDfLists}
                                    parentListNames={dfListNames}
                                    users={users}
                                    goals={goals}
                                    modalTitle={massEditingMode ? `Mass editing ${selectedIds.size} tasks` : "edit don't forget task"}
                                    isDontForgetMode={true}
                                />
                                {/* Activity composer removed from DontForget */}
                                <EditTaskModal
                                    isOpen={Boolean(assignModal.open)}
                                    initialData={_mapAssignInitial()}
                                    onCancel={() => setAssignModal({ open: false, task: null, kaId: "", listIndex: 1 })}
                                    onSave={(payload) => handleAssignSave({ key_area_id: payload.key_area_id || payload.keyAreaId || assignModal.kaId })}
                                    isSaving={false}
                                    keyAreas={dfKeyAreas}
                                    availableLists={availableDfLists}
                                    parentListNames={dfListNames}
                                    users={users}
                                    goals={goals}
                                    isDontForgetMode={true}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-full overflow-x-hidden pb-1 min-h-full px-1 md:px-2">
                        {viewMode === "dont-forget" ? (
                            <div className="max-w-full overflow-x-hidden">
                                <div className="flex items-center justify-between gap-3 mb-4 mt-4 md:mt-6">
                                    <div className="flex items-center gap-2 w-full">
                                        {/* mobile sidebar toggle */}
                                        <button
                                            className="md:hidden p-2 rounded-lg bg-white border border-slate-200 mr-2"
                                            onClick={() => setMobileSidebarOpen(true)}
                                            aria-label="Open menu"
                                        >
                                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z"></path></svg>
                                        </button>
                                        <button
                                            className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                                            aria-label="Back"
                                            style={{ minWidth: 36, minHeight: 36 }}
                                            onClick={() => navigate(-1)}
                                        >
                                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 320 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M34.52 239.03L228.87 44.69c9.37 9.37 24.57 9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z"></path></svg>
                                        </button>

                                        <div className="inline-flex items-center gap-1">
                                            <img
                                                alt="Don't forget"
                                                className="w-7 h-7 md:w-8 md:h-8 object-contain"
                                                src={`${import.meta.env.BASE_URL}dont-forget.png`}
                                                onError={(e) => {
                                                    if (e?.currentTarget) e.currentTarget.src = "/dont-forget.png";
                                                }}
                                            />
                                            <span className="relative text-base md:text-lg font-bold text-slate-900 truncate px-1" style={{ color: 'rgba(196, 118, 15, 1)' }}>Don't Forget</span>
                                        </div>
                                    </div>

                                    <div className="ml-auto flex items-center gap-2">
                                        <div className="flex items-center bg-white rounded-lg px-2 py-1 shadow border border-slate-200">
                                            <FaSearch className="text-slate-700 mr-2" />
                                            <input
                                                placeholder={`Search tasks in "Don't Forget"…`}
                                                className="bg-transparent outline-none text-sm w-40 sm:w-56"
                                                value={siteSearch}
                                                onChange={(e) => setSiteSearch(e.target.value)}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/my-focus')}
                                            className="bg-white rounded-lg border border-slate-200 px-4 py-1 text-sm font-semibold hover:bg-slate-50"
                                            style={{ minWidth: 100 }}
                                        >
                                            My Focus
                                        </button>
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
                                                    {[{ key: "list", label: "List" }].map((opt) => (
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
                                        <div className="relative ml-1" ref={columnsMenuRef}>
                                            <button
                                                type="button"
                                                aria-haspopup="menu"
                                                aria-expanded={showColumnsMenu ? "true" : "false"}
                                                className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm font-semibold hover:bg-slate-50"
                                                onClick={() => setShowColumnsMenu((s) => !s)}
                                                title="Columns"
                                            >
                                                <FaCog />
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

                                <div className="mb-4">
                                        <div className="bg-white border border-blue-200 rounded-lg shadow-sm p-3 space-y-6">
                                {/* Header area */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-3 md:col-span-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="text-sm font-semibold whitespace-nowrap mr-1">
                                                Task Lists
                                            </div>
                                            <div
                                                ref={chipsRef}
                                                className="flex items-center gap-1 overflow-x-auto bg-slate-100 border border-slate-200 rounded-lg px-1 py-0.5"
                                            >
                                                {availableDfLists.map((n) => (
                                                    <div className="relative" key={`df-list-${n}`}>
                                                        <button
                                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold border transition ${
                                                                selectedDfList === n
                                                                    ? 'bg-white text-slate-900 border-slate-300 shadow'
                                                                    : 'bg-transparent text-slate-800 border-transparent hover:bg-slate-200'
                                                            }`}
                                                            title={`List ${n}`}
                                                            type="button"
                                                            onClick={() => setSelectedDfList(n)}
                                                        >
                                                            <span>{getDfListName(n)}</span>
                                                            <span
                                                                aria-haspopup="menu"
                                                                aria-expanded={openDfListMenu === n}
                                                                title={`Options for ${getDfListName(n)}`}
                                                                className="ml-1 p-1 rounded cursor-pointer text-slate-600 hover:bg-slate-100"
                                                                role="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    const scrollX = window.scrollX;
                                                                    const scrollY = window.scrollY;
                                                                    // Match Key Areas: place below the icon, left-aligned
                                                                    const gap = 6;
                                                                    const top = rect.bottom + scrollY + gap;
                                                                    const left = rect.left + scrollX;
                                                                    setDfListMenuPos({ top, left });
                                                                    setOpenDfListMenu((v) => (v === n ? null : n));
                                                                }}
                                                            >
                                                                <svg
                                                                    stroke="currentColor"
                                                                    fill="currentColor"
                                                                    strokeWidth="0"
                                                                    viewBox="0 0 192 512"
                                                                    className="w-3.5 h-3.5"
                                                                    height="1em"
                                                                    width="1em"
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                >
                                                                    <path d="M96 184c39.8 0 72 32.2 72 72s-32.2 72-72 72-72-32.2-72-72 32.2-72 72-72zM24 80c0 39.8 32.2 72 72 72s72-32.2 72-72S135.8 8 96 8 24 40.2 24 80zm0 352c0 39.8 32.2 72 72 72s72-32.2 72-72-32.2-72-72-72-72 32.2-72 72z"></path>
                                                                </svg>
                                                            </span>
                                                        </button>
                                                        {openDfListMenu === n && (
                                                            <>
                                                                <div
                                                                    className="fixed inset-0 z-40"
                                                                    onClick={() => setOpenDfListMenu(null)}
                                                                />
                                                                <div
                                                                    role="menu"
                                                                    className="fixed z-50 w-32 bg-white border border-slate-200 rounded-lg shadow"
                                                                    style={{
                                                                        top: `${dfListMenuPos.top}px`,
                                                                        left: `${dfListMenuPos.left}px`,
                                                                    }}
                                                                >
                                                                    {/* Edit description removed per request */}
                                                                    <button
                                                                        role="menuitem"
                                                                        className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                                                        onClick={() => {
                                                                            renameDfList(n);
                                                                            setOpenDfListMenu(null);
                                                                        }}
                                                                    >
                                                                        Rename
                                                                    </button>
                                                                    <button
                                                                        role="menuitem"
                                                                        className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                                                        onClick={() => deleteDfList(n)}
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                                <div className="flex items-center">
                                                    <button
                                                        title="Add list"
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold border transition bg-transparent text-slate-800 border-transparent hover:bg-slate-200"
                                                        onClick={addDfList}
                                                    >
                                                        <svg
                                                            stroke="currentColor"
                                                            fill="currentColor"
                                                            strokeWidth="0"
                                                            viewBox="0 0 448 512"
                                                            height="1em"
                                                            width="1em"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                        >
                                                            <path d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67-14.33 32 32 32h144v144c0 17.67 0 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-3 md:col-span-1 flex items-center justify-end gap-3">
                                        <span className="text-sm text-gray-600" aria-live="polite">
                                            {selectedIds.size} selected
                                        </span>
                                        <button
                                            type="button"
                                            disabled={selectedIds.size === 0}
                                            className="px-4 py-2 rounded-md text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                            aria-label="Open mass edit"
                                            title="Select tasks to enable mass edit"
                                            onClick={() => {
                                                    if (selectedIds.size === 0) return;
                                                    // For mass edit we intentionally open the EditTaskModal with
                                                    // empty initial fields so the user can set values that will
                                                    // be applied to all selected tasks (don't prefill from first task).
                                                    setEditModal({ open: true, id: null, form: {} });
                                                    setMassEditingMode(true);
                                                }}
                                        >
                                            Mass Edit
                                        </button>
                                    </div>
                                </div>
                                {/* Mass edit now uses the shared EditTaskModal component. Click "Mass Edit" to open it pre-filled from the first selected task. */}
                                    <div className="overflow-x-auto -mx-2 sm:mx-0">
                                        <table className="min-w-full text-sm whitespace-nowrap sm:whitespace-normal">
                                            {dontForgetTasks.length > 0 && (
                                                <thead key={headerKey} className="bg-slate-50 border border-slate-200 text-slate-700">
                                                    <tr>
                                                        <th className="px-2 sm:px-3 py-2 text-left w-8">
                                                            <input
                                                                aria-label="Select all visible"
                                                                type="checkbox"
                                                                onChange={toggleSelectAllVisible}
                                                                checked={
                                                                    dontForgetTasks.length > 0 &&
                                                                    dontForgetTasks.every((t) => isSelected(t.id))
                                                                }
                                                            />
                                                        </th>
                                                        <th className="px-2 sm:px-3 py-2 text-left font-semibold w-[160px] sm:w-[220px]">Task</th>
                                                        {visibleColumns.responsible && (
                                                            <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden sm:table-cell">Responsible</th>
                                                        )}
                                                        <th className="px-2 sm:px-3 py-2 text-left font-semibold">Status</th>
                                                        {visibleColumns.priority && (
                                                            <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden md:table-cell">Priority</th>
                                                        )}
                                                        {visibleColumns.quadrant && (
                                                            <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden lg:table-cell">Quadrant</th>
                                                        )}
                                                        {visibleColumns.start_date && (
                                                            <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden xl:table-cell">Start Date</th>
                                                        )}
                                                        {visibleColumns.end_date && (
                                                            <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden xl:table-cell">End date</th>
                                                        )}
                                                        {visibleColumns.deadline && (
                                                            <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden lg:table-cell">Deadline</th>
                                                        )}
                                                        {visibleColumns.duration && (
                                                            <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden xl:table-cell">Duration</th>
                                                        )}
                                                        {visibleColumns.completed && (
                                                            <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden xl:table-cell">Completed</th>
                                                        )}
                                                        {/* Actions column removed — use row menu instead */}
                                                    </tr>
                                                </thead>
                                            )}
                                            <tbody className="bg-white">
                                                {dontForgetTasks.map((task) => (
                                                    <TaskRow
                                                        key={task.id}
                                                        t={{ ...task, title: task.name, deadline: task.dueDate }}
                                                        q={task.quadrant}
                                                        goals={goals}
                                                        goalMap={null}
                                                        visibleColumns={visibleColumns}
                                                        disableOpen={true}
                                                        updateField={updateField}
                                                        enableInlineEditing={!massEditingMode}
                                                        isSaving={savingIds.has(task.id)}
                                                        users={users}
                                                        currentUserId={users && users[0] ? users[0].id : null}
                                                        isSelected={isSelected(task.id)}
                                                        onToggleSelect={() => toggleSelect(task.id)}
                                                        onOpenTask={() => openFullTaskView(task)}
                                                        onStatusChange={(s) => setStatus(task.id, s)}
                                                        onToggleActivitiesRow={() => {}}
                                                        activityCount={0}
                                                        getPriorityLevel={null}
                                                        toDateOnly={toDateOnly}
                                                        formatDuration={formatDurationDays}
                                                        onMouseEnter={() => {}}
                                                        expandedActivity={false}
                                                        onEditClick={() => {
                                                            const form = {
                                                                name: task.name || "",
                                                                notes: task.notes || "",
                                                                assignee: task.assignee || "",
                                                                status: task.status || "open",
                                                                priority: getPriorityLevel(task.priority || undefined),
                                                                start_date: task.start_date || "",
                                                                end_date: task.end_date || "",
                                                                dueDate: task.dueDate || "",
                                                                duration: task.duration || "",
                                                                keyAreaId: "",
                                                                listIndex: task.listIndex || 1,
                                                                goal: task.goal || "",
                                                                tags: task.tags || "",
                                                                time: task.time || "",
                                                                completionDate: task.completionDate || null,
                                                            };
                                                            setEditModal({ open: true, id: task.id, form });
                                                            setMassEditingMode(false);
                                                        }}
                                                        onDeleteClick={() => deleteTask(task.id)}
                                                    />
                                                ))}

                                                {/* Footer action: moved out of table into a right-aligned div below */}

                                                {dontForgetTasks.length === 0 && (
                                                    <tr>
                                                        <td className="px-6 py-8 text-gray-500" colSpan={12}>
                                                            {`This list has no tasks yet. Click "Add Task" to create one for ${getDfListName(selectedDfList)}.`}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex justify-end pr-10 pt-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // ensure composer defaults to selected DF list
                                                setShowComposer(true);
                                            }}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            aria-label="Add task"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                            Add Task
                                        </button>
                                    </div>

                                    <CreateTaskModal
                                        isOpen={Boolean(showComposer)}
                                        initialData={{ list_index: selectedDfList || (availableDfLists && availableDfLists[0]) || 1 }}
                                        onSave={(data) => {
                                            // CreateTaskModal returns fields like title, deadline, key_area_id, list_index
                                            // normalize names to the existing addDontForgetTask expectations
                                            const mapped = {
                                                ...data,
                                                name: data?.title || data?.name,
                                                dueDate: data?.dueDate || data?.deadline,
                                                keyAreaId: data?.keyAreaId || data?.key_area_id || data?.keyAreaId,
                                                listIndex: data?.listIndex || data?.list_index,
                                            };
                                            addDontForgetTask(mapped);
                                            setShowComposer(false);
                                        }}
                                        onCancel={() => setShowComposer(false)}
                                            isSaving={false}
                                            keyAreas={dfKeyAreas}
                                            availableLists={availableDfLists}
                                            parentListNames={dfListNames}
                                            users={users}
                                            goals={goals}
                                            isDontForgetMode={true}
                                    />

                                <EditTaskModal
                                    isOpen={Boolean(editModal.open)}
                                    initialData={_mapEditInitial()}
                                    onCancel={() => {
                                        setEditModal({ open: false, id: null, form: null });
                                        setMassEditingMode(false);
                                    }}
                                    onSave={(payload) => {
                                        if (massEditingMode) return handleMassEditSave(payload);
                                        return handleEditModalSave(payload);
                                    }}
                                    isSaving={editModal.id ? savingIds.has(editModal.id) : false}
                                    keyAreas={dfKeyAreas}
                                    availableLists={availableDfLists}
                                    parentListNames={dfListNames}
                                    users={users}
                                    goals={goals}
                                    modalTitle={massEditingMode ? `Mass editing ${selectedIds.size} tasks` : "Edit Don't forget task"}
                                    isDontForgetMode={true}
                                />

                                {/* Activity composer removed from DontForget */}

                                <EditTaskModal
                                    isOpen={Boolean(assignModal.open)}
                                    initialData={_mapAssignInitial()}
                                    onCancel={() => setAssignModal({ open: false, task: null, kaId: "", listIndex: 1 })}
                                    onSave={(payload) => handleAssignSave({ key_area_id: payload.key_area_id || payload.keyAreaId || assignModal.kaId })}
                                    isSaving={false}
                                    keyAreas={dfKeyAreas}
                                    availableLists={availableDfLists}
                                    parentListNames={dfListNames}
                                    users={users}
                                    goals={goals}
                                    isDontForgetMode={true}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                            <div className="p-2 text-gray-500">Select a view.</div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
