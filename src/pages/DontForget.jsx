import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar.jsx";
import { useToast } from "../components/shared/ToastProvider.jsx";
import { FiAlertTriangle, FiClock } from "react-icons/fi";
import { FaCheck, FaExclamation, FaLongArrowAltDown, FaTimes, FaTrash, FaBars } from "react-icons/fa";
import CreateTaskModal from "../components/key-areas/CreateTaskModal.jsx";
import EditTaskModal from "../components/key-areas/EditTaskModal.jsx";
import TaskRow from "../components/key-areas/TaskRow.jsx";

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

    // Key Areas for assignment dialog
    const [dfKeyAreas, setDfKeyAreas] = useState([]);
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

    // Load DF tasks from backend when view opens
    useEffect(() => {
        if (viewMode !== "dont-forget") return;
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
                        priority: t.priority || "normal",
                        quadrant: t.eisenhowerQuadrant ? `Q${t.eisenhowerQuadrant}` : "Q3",
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
                        listIndex: 1,
                        completed: t.status === "done", // FE semantic
                        imported: false,
                    }));
                    setTasks(mapped);
                }
            } catch (e) {
                console.error("Failed to load Don’t Forget tasks", e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [viewMode]);

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
    const [showCompleted, setShowCompleted] = useState(true);
    const [savingIds, setSavingIds] = useState(new Set());
    const [dfName, setDfName] = useState("");
    const [showComposer, setShowComposer] = useState(false);
    // When true, the EditTaskModal is being used to edit multiple selected tasks
    const [massEditingMode, setMassEditingMode] = useState(false);
    // Editor modal for DF task details
    const [editModal, setEditModal] = useState({ open: false, id: null, form: null });

    const dontForgetTasks = useMemo(
        () => tasks.filter((t) => !t.keyArea && (showImported || !t.imported) && (showCompleted || !t.completed)),
        [tasks, showImported, showCompleted],
    );

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
    const getDfListName = (n) => (dfListNames?.[n] ? dfListNames[n] : `List ${n}`);
    const addDfList = () => {
        const max = availableDfLists.length ? Math.max(...availableDfLists) : 0;
        const next = (max || 0) + 1;
        setDfListNames((prev) => ({ ...(prev || {}), [next]: `List ${next}` }));
    };
    const renameDfList = (n) => {
        const current = getDfListName(n);
        const val = prompt("Rename list", current);
        if (val === null) return;
        setDfListNames((prev) => ({ ...(prev || {}), [n]: val }));
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
            return { ...rest };
        });
        setOpenDfListMenu(null);
    };

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
            // support keyArea naming variants
            if (payload?.keyAreaId) body.keyAreaId = payload.keyAreaId;
            if (payload?.key_area_id) body.keyAreaId = payload.key_area_id;
            const created = await (await getTaskService()).create(body);
            // Push to local list
            if (!payload?.keyAreaId) {
                setTasks((prev) => [
                    ...prev,
                    {
                        id: created.id,
                        name: created.title,
                        assignee: created.assignee || "",
                        status: created.status || "open",
                        priority: created.priority || "normal",
                        quadrant: created.eisenhowerQuadrant
                            ? `Q${created.eisenhowerQuadrant}`
                            : payload?.quadrant || "Q3",
                        goal: payload?.goal || "",
                        tags: payload?.tags || "",
                        start_date: created.startDate ? created.startDate.slice(0, 10) : "",
                        dueDate: created.dueDate ? created.dueDate.slice(0, 10) : "",
                        end_date: created.endDate ? created.endDate.slice(0, 10) : "",
                        duration: created.duration || "",
                        time: payload?.time || "",
                        notes: created.description || "",
                        keyArea: "",
                        listIndex: payload?.listIndex || 1,
                        completed: created.status === "done",
                        imported: !!payload?.imported,
                    },
                ]);
            }
            setDfName("");
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
            try {
                if (newStatus === 'done') addToast && addToast({ title: 'Marked completed', variant: 'success' });
                else addToast && addToast({ title: 'Marked open', variant: 'info' });
            } catch {}
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
            await taskService.update(id, { status: s });
            setTasks((prev) =>
                prev.map((t) =>
                    t.id === id
                        ? { ...t, status: s, completed: s === 'done' }
                        : t,
                ),
            );
            markSaving(id);
            // show a success toast for completed tasks
            try {
                if (s === 'done') {
                    addToast && addToast({ title: 'Marked completed', variant: 'success' });
                } else if (s === 'open') {
                    addToast && addToast({ title: 'Marked open', variant: 'info' });
                }
            } catch {}
        } catch (e) {
            console.error('Failed to update status', e);
        }
    };
    const deleteTask = async (id) => {
        try {
            await (await getTaskService()).remove(id);
            setTasks((prev) => prev.filter((t) => t.id !== id));
        } catch (e) {
            console.error("Failed to delete task", e);
        }
    };
    const updateField = async (id, key, value) => {
        const patch = {};
        if (key === "name") patch.title = value;
        else if (key === "notes") patch.description = value;
        else if (key === "assignee") patch.assignee = value;
        else if (key === "start_date") patch.startDate = value ? new Date(value).toISOString() : null;
        else if (key === "end_date") patch.endDate = value ? new Date(value).toISOString() : null;
        else if (key === "dueDate") patch.dueDate = value ? new Date(value).toISOString() : null;
        else if (key === "duration") patch.duration = value;
        else if (key === "status") patch.status = value;
        else {
            // Not backed by API (quadrant, goal, tags, time, listIndex)
            setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, [key]: value } : t)));
            markSaving(id);
            return;
        }
        try {
            const updated = await (await getTaskService()).update(id, patch);
            setTasks((prev) =>
                prev.map((t) =>
                    t.id === id
                        ? {
                              ...t,
                              name: updated.title,
                              notes: updated.description || "",
                              assignee: updated.assignee || "",
                              start_date: updated.startDate ? updated.startDate.slice(0, 10) : "",
                              end_date: updated.endDate ? updated.endDate.slice(0, 10) : "",
                              dueDate: updated.dueDate ? updated.dueDate.slice(0, 10) : "",
                              duration: updated.duration || "",
                              status: updated.status,
                          }
                        : t,
                ),
            );
            markSaving(id);
        } catch (e) {
            console.error("Failed to update field", e);
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
                priority: task.priority || "normal",
                start_date: task.start_date || "",
                end_date: task.end_date || "",
                dueDate: task.dueDate || "",
                duration: task.duration || "",
                quadrant: task.quadrant || "Q3",
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
    const confirmAssignAndOpen = async () => {
        const { task, kaId } = assignModal;
        if (!task || !kaId) return;
            try {
                // Assign to the selected Key Area (UUID) — omit listIndex (not supported by API)
            await (await getTaskService()).update(task.id, { keyAreaId: kaId });
            // Remove from DF view
            setTasks((prev) => prev.filter((t) => t.id !== task.id));
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
                                  priority: updated.priority || form.priority || "normal",
                                  quadrant: updated.eisenhowerQuadrant
                                      ? `Q${updated.eisenhowerQuadrant}`
                                      : form.quadrant || t.quadrant,
                                  goal: form.goal || t.goal,
                                  tags: form.tags || t.tags,
                                  time: form.time || t.time,
                                  listIndex: form.listIndex || t.listIndex || 1,
                              }
                            : t,
                    ),
                );
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
            priority: f.priority || "normal",
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
                                  priority: updated.priority || payload.priority || "normal",
                                  quadrant: updated.eisenhowerQuadrant ? `Q${updated.eisenhowerQuadrant}` : payload.quadrant || t.quadrant,
                                  goal: payload.goal || t.goal,
                                  tags: payload.tags || t.tags,
                                  time: payload.time || t.time,
                                  listIndex: payload.list_index || t.listIndex || 1,
                              }
                            : t,
                    ),
                );
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
            }

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
            setAssignModal({ open: false, task: null, kaId: "", listIndex: 1 });
            navigate({ pathname: "/key-areas", search: `?ka=${payload.key_area_id}&openKA=1&task=${task.id}` });
        } catch (e) {
            const msg = e?.response?.data?.message || e?.message || "Failed to move task";
            alert(msg);
        }
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50">
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

            <main className="flex-1 p-4 sm:p-6">
                {/* Mobile menu button */}
                <button
                    className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-gray-200"
                    onClick={() => setMobileSidebarOpen(true)}
                >
                    <FaBars className="h-5 w-5 text-gray-600" />
                </button>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {viewMode === "dont-forget" ? (
                        <div className="p-6">
                            {/* Page header */}
                            <div className="flex items-center gap-3 mb-4">
                                <img
                                    alt="Don't forget"
                                    className="w-8 h-8 object-contain"
                                    src={`${import.meta.env.BASE_URL}dont-forget.png`}
                                    onError={(e) => {
                                        if (e?.currentTarget) e.currentTarget.src = "/dont-forget.png";
                                    }}
                                />
                                <h2 className="text-xl font-semibold text-slate-900">Don't Forget</h2>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-6 space-y-6">
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
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold border transition bg-white text-slate-900 border-slate-300 shadow"
                                                            title={`List ${n}`}
                                                            type="button"
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
                                                                    const rect =
                                                                        e.currentTarget.getBoundingClientRect();
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
                                                        className="px-2 py-1 rounded-lg border bg-white text-slate-800 hover:bg-slate-50"
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
                                        <thead className="bg-slate-50 border border-slate-200 text-slate-700">
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
                                                <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden sm:table-cell">Assignee</th>
                                                <th className="px-2 sm:px-3 py-2 text-left font-semibold">Status</th>
                                                <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden md:table-cell">Priority</th>
                                                <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden lg:table-cell">Quadrant</th>
                                                <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden lg:table-cell">Goal</th>
                                                <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden xl:table-cell">Tags</th>
                                                <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden xl:table-cell">Start Date</th>
                                                <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden xl:table-cell">End date</th>
                                                <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden lg:table-cell">Deadline</th>
                                                <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden xl:table-cell">Duration</th>
                                                <th className="px-2 sm:px-3 py-2 text-left font-semibold hidden xl:table-cell">Completed</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {dontForgetTasks.map((task) => (
                                                <TaskRow
                                                    key={task.id}
                                                    t={{ ...task, title: task.name, deadline: task.dueDate }}
                                                    q={task.quadrant}
                                                    goals={goals}
                                                    goalMap={null}
                                                    isSelected={isSelected(task.id)}
                                                    onToggleSelect={() => toggleSelect(task.id)}
                                                    onOpenTask={() => openDfTaskEditor(task)}
                                                    onStatusChange={(s) => setStatus(task.id, s)}
                                                    onToggleActivitiesRow={() => {}}
                                                    activityCount={0}
                                                    getPriorityLevel={null}
                                                    toDateOnly={toDateOnly}
                                                    formatDuration={formatDurationDays}
                                                    onMouseEnter={() => {}}
                                                    expandedActivity={false}
                                                    isSaving={savingIds.has(task.id)}
                                                />
                                            ))}

                                            <tr className="bg-gray-50">
                                                <td className="px-4 py-3" />
                                                <td className="pl-2 pr-6 py-3" colSpan={3}>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowComposer(true)}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                            title="Open Add Task dialog"
                                                        >
                                                            Add Task
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {dontForgetTasks.length === 0 && (
                                                <tr>
                                                    <td className="px-6 py-8 text-gray-500" colSpan={4}>
                                                        No items yet
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                    <CreateTaskModal
                                        isOpen={Boolean(showComposer)}
                                        initialData={{}}
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
                                            users={users}
                                            goals={goals}
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
                                    users={users}
                                    goals={goals}
                                    modalTitle={massEditingMode ? `Mass editing ${selectedIds.size} tasks` : undefined}
                                />

                                <EditTaskModal
                                    isOpen={Boolean(assignModal.open)}
                                    initialData={_mapAssignInitial()}
                                    onCancel={() => setAssignModal({ open: false, task: null, kaId: "", listIndex: 1 })}
                                    onSave={(payload) => handleAssignSave({ key_area_id: payload.key_area_id || payload.keyAreaId || assignModal.kaId })}
                                    isSaving={false}
                                    keyAreas={dfKeyAreas}
                                    availableLists={availableDfLists}
                                    users={users}
                                    goals={goals}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 text-gray-500">Select a view.</div>
                    )}
                </div>
            </main>
        </div>
    );
}
