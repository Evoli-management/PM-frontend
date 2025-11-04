import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar.jsx";
import { FiAlertTriangle, FiClock } from "react-icons/fi";
import { FaCheck, FaExclamation, FaLongArrowAltDown, FaTimes, FaTrash, FaBars } from "react-icons/fa";
const DontForgetComposer = React.lazy(() => import("../components/tasks/DontForgetComposer.jsx"));

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

export default function Tasks() {
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
    const [showMassEdit, setShowMassEdit] = useState(false);
    // Editor modal for DF task details
    const [editModal, setEditModal] = useState({ open: false, id: null, form: null });
    const [massEdit, setMassEdit] = useState({
        dueDate: "",
        start_date: "",
        end_date: "",
        time: "",
        duration: "",
        assignee: "",
        status: "",
        priority: "",
        quadrant: "",
        goal: "",
        tags: "",
        listIndex: "",
        completed: "", // '', 'done', 'todo'
    });

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
        const name = (payload?.name ?? dfName).trim();
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
                description: payload?.notes || "",
                assignee: payload?.assignee || "",
                startDate: payload?.start_date ? new Date(payload.start_date).toISOString() : undefined,
                endDate: payload?.end_date ? new Date(payload.end_date).toISOString() : undefined,
                dueDate: payload?.dueDate ? new Date(payload.dueDate).toISOString() : undefined,
                duration: payload?.duration ? String(payload.duration) : undefined,
                // Only include status/priority if provided, else let backend defaults apply
                ...(mappedStatus ? { status: mappedStatus } : {}),
                ...(mappedPriority ? { priority: mappedPriority } : {}),
            };
            if (payload?.keyAreaId) body.keyAreaId = payload.keyAreaId;
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
    // Row expansion removed in DF view

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

    const applyMassEdit = async () => {
        if (selectedIds.size === 0) return;
        const ids = Array.from(selectedIds);
        try {
            await Promise.all(
                ids.map(async (id) => {
                    const patch = {};
                    if (massEdit.dueDate) patch.dueDate = new Date(massEdit.dueDate).toISOString();
                    if (massEdit.start_date) patch.startDate = new Date(massEdit.start_date).toISOString();
                    if (massEdit.end_date) patch.endDate = new Date(massEdit.end_date).toISOString();
                    if (massEdit.duration) patch.duration = massEdit.duration;
                    if (massEdit.assignee) patch.assignee = massEdit.assignee;
                    if (massEdit.status) patch.status = massEdit.status;
                    if (massEdit.priority) patch.priority = massEdit.priority;
                    // Non-API fields will be applied locally after
                    if (Object.keys(patch).length > 0) {
                        try {
                            await (await getTaskService()).update(id, patch);
                        } catch (e) {
                            console.warn("Failed to update", id, e);
                        }
                    }
                }),
            );
            setTasks((prev) =>
                prev.map((t) => {
                    if (!selectedIds.has(t.id)) return t;
                    const u = { ...t };
                    if (massEdit.dueDate) u.dueDate = massEdit.dueDate;
                    if (massEdit.start_date) u.start_date = massEdit.start_date;
                    if (massEdit.end_date) u.end_date = massEdit.end_date;
                    if (massEdit.time) u.time = massEdit.time;
                    if (massEdit.duration) u.duration = massEdit.duration;
                    if (massEdit.assignee) u.assignee = massEdit.assignee;
                    if (massEdit.status) u.status = massEdit.status;
                    if (massEdit.priority) u.priority = massEdit.priority;
                    if (massEdit.quadrant) u.quadrant = massEdit.quadrant;
                    if (massEdit.goal) u.goal = massEdit.goal;
                    if (massEdit.tags) u.tags = massEdit.tags;
                    if (massEdit.listIndex) u.listIndex = Number(massEdit.listIndex);
                    if (massEdit.completed === "done") u.completed = true;
                    if (massEdit.completed === "todo") u.completed = false;
                    return u;
                }),
            );
            ids.forEach((id) => markSaving(id, 800));
            setShowMassEdit(false);
        } catch (e) {
            console.error("Mass edit failed", e);
        }
    };

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
                                            onClick={() => setShowMassEdit(true)}
                                        >
                                            Mass Edit
                                        </button>
                                    </div>
                                </div>
                                {showMassEdit && selectedIds.size > 0 && (
                                    <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
                                        <div className="text-sm text-blue-900 font-medium mb-3">
                                            Mass edit {selectedIds.size} task{selectedIds.size > 1 ? "s" : ""}
                                        </div>
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs text-blue-900">Start Date</label>
                                                <input
                                                    type="date"
                                                    value={massEdit.start_date}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, start_date: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">End Date</label>
                                                <input
                                                    type="date"
                                                    value={massEdit.end_date}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, end_date: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Deadline</label>
                                                <input
                                                    type="date"
                                                    value={massEdit.dueDate}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, dueDate: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Time</label>
                                                <input
                                                    type="time"
                                                    value={massEdit.time}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, time: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Duration</label>
                                                <input
                                                    value={massEdit.duration}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, duration: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                    placeholder="e.g., 1h, 1d"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Responsible</label>
                                                <input
                                                    value={massEdit.assignee}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, assignee: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                    placeholder="Name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Status</label>
                                                <select
                                                    value={massEdit.status}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, status: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-0 focus:border-gray-300"
                                                >
                                                    <option value="">(leave as is)</option>
                                                    <option value="open">Open</option>
                                                    <option value="in progress">In progress</option>
                                                    <option value="done">Done</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Priority</label>
                                                <select
                                                    value={massEdit.priority}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, priority: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-0 focus:border-gray-300"
                                                >
                                                    <option value="">(leave as is)</option>
                                                    <option value="high">High</option>
                                                    <option value="normal">Normal</option>
                                                    <option value="low">Low</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Quadrant</label>
                                                <select
                                                    value={massEdit.quadrant}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, quadrant: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-0 focus:border-gray-300"
                                                >
                                                    <option value="">(leave as is)</option>
                                                    <option value="Q1">Q1</option>
                                                    <option value="Q2">Q2</option>
                                                    <option value="Q3">Q3</option>
                                                    <option value="Q4">Q4</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Goal</label>
                                                <input
                                                    value={massEdit.goal}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, goal: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                    placeholder="Goal"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Tags</label>
                                                <input
                                                    value={massEdit.tags}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, tags: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                    placeholder="e.g., q3,planning"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">List</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={availableDfLists.length ? Math.max(...availableDfLists) : 4}
                                                    value={massEdit.listIndex}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, listIndex: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-blue-900">Completed</label>
                                                <select
                                                    value={massEdit.completed}
                                                    onChange={(e) =>
                                                        setMassEdit((m) => ({ ...m, completed: e.target.value }))
                                                    }
                                                    className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-0 focus:border-gray-300"
                                                >
                                                    <option value="">(leave as is)</option>
                                                    <option value="done">Mark done</option>
                                                    <option value="todo">Mark to-do</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                onClick={() =>
                                                    setMassEdit({
                                                        dueDate: "",
                                                        start_date: "",
                                                        end_date: "",
                                                        time: "",
                                                        duration: "",
                                                        assignee: "",
                                                        status: "",
                                                        priority: "",
                                                        quadrant: "",
                                                        goal: "",
                                                        tags: "",
                                                        listIndex: "",
                                                        completed: "",
                                                    })
                                                }
                                                className="px-3 py-1.5 bg-slate-200 text-slate-900 rounded-md hover:bg-slate-300"
                                            >
                                                Clear all
                                            </button>
                                            <button
                                                onClick={applyMassEdit}
                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                            >
                                                Apply
                                            </button>
                                            <button
                                                onClick={() => setShowMassEdit(false)}
                                                className="px-3 py-1.5 text-blue-700 hover:underline"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
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
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {dontForgetTasks.map((task) => (
                                                <React.Fragment key={task.id}>
                                                    <tr className="border-t border-slate-200 hover:bg-slate-50">
                                                        <td className="px-2 sm:px-3 py-2 align-top">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected(task.id)}
                                                                onChange={() => toggleSelect(task.id)}
                                                                aria-label={`Select ${task.name}`}
                                                            />
                                                        </td>
                                                        <td className="px-2 sm:px-3 py-2 align-top w-[160px] sm:w-[220px]">
                                                            <button
                                                                type="button"
                                                                className="flex items-start gap-1 sm:gap-2 text-left hover:underline cursor-pointer w-full"
                                                                onClick={() => openDfTaskEditor(task)}
                                                                title="Edit task"
                                                            >
                                                                <img
                                                                    alt="Don't forget"
                                                                    className="w-4 h-4 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                                                                    src={`${import.meta.env.BASE_URL}dont-forget.png`}
                                                                    onError={(e) => {
                                                                        if (e?.currentTarget)
                                                                            e.currentTarget.src = "/dont-forget.png";
                                                                    }}
                                                                />
                                                                <span
                                                                    className={`truncate text-xs sm:text-sm ${task.completed ? "line-through text-gray-400" : "text-gray-900"}`}
                                                                    title={task.name}
                                                                >
                                                                    {task.name}
                                                                </span>
                                                            </button>
                                                            {savingIds.has(task.id) && (
                                                                <div className="text-xs text-blue-600 mt-1">
                                                                    Saving...
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-2 sm:px-3 py-2 align-top text-slate-800 hidden sm:table-cell">
                                                            {task.assignee || ""}
                                                        </td>
                                                        <td className="px-2 sm:px-3 py-2 align-top">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400"
                                                                    aria-hidden="true"
                                                                ></span>
                                                                <span className="capitalize text-slate-800 text-xs sm:text-sm">
                                                                    {task.status || "open"}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 sm:px-3 py-2 align-top hidden md:table-cell">
                                                            {task.priority === "high" ? (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs border text-red-700 bg-red-50 border-red-200">
                                                                    High
                                                                </span>
                                                            ) : task.priority === "low" ? (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs border text-slate-600 bg-slate-50 border-slate-200">
                                                                    Low
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs border text-amber-700 bg-amber-50 border-amber-200">
                                                                    Normal
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-2 sm:px-3 py-2 align-top hidden lg:table-cell">
                                                            <span
                                                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-white ${task.quadrant === "Q1" ? "bg-rose-600" : task.quadrant === "Q2" ? "bg-amber-600" : task.quadrant === "Q3" ? "bg-blue-600" : "bg-emerald-600"}`}
                                                            >
                                                                {task.quadrant || "—"}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 sm:px-3 py-2 align-top text-slate-800 hidden lg:table-cell">
                                                            {task.goal ? (
                                                                task.goal
                                                            ) : (
                                                                <span className="text-slate-500">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-2 sm:px-3 py-2 align-top max-w-[180px] sm:max-w-[240px] hidden xl:table-cell">
                                                            <span className="block truncate text-slate-800 text-xs sm:text-sm">
                                                                {task.tags ? task.tags : "—"}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 sm:px-3 py-2 align-top text-slate-800 text-xs sm:text-sm hidden xl:table-cell">
                                                            {task.start_date || ""}
                                                        </td>
                                                        <td className="px-2 sm:px-3 py-2 align-top text-slate-800 text-xs sm:text-sm hidden xl:table-cell">
                                                            {task.end_date || ""}
                                                        </td>
                                                        <td className="px-2 sm:px-3 py-2 align-top text-slate-800 text-xs sm:text-sm hidden lg:table-cell">
                                                            {task.dueDate || ""}
                                                        </td>
                                                        <td className="px-2 sm:px-3 py-2 align-top text-slate-800 text-xs sm:text-sm hidden xl:table-cell">
                                                            {task.duration ||
                                                                formatDurationDays(
                                                                    task.start_date || task.dueDate,
                                                                    task.end_date,
                                                                )}
                                                        </td>
                                                    </tr>
                                                    {/* Row expansion removed per new design */}
                                                </React.Fragment>
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
                                <Suspense fallback={<div role="status" aria-live="polite" className="p-4">Loading…</div>}>
                                    <DontForgetComposer
                                        open={showComposer}
                                        onClose={() => setShowComposer(false)}
                                        onAdd={(data) => addDontForgetTask(data)}
                                    />
                                </Suspense>

                                {editModal.open && (
                                    <div
                                        className="fixed inset-0 z-50 grid place-items-center"
                                        role="dialog"
                                        aria-modal="true"
                                    >
                                        <div
                                            className="absolute inset-0 bg-black/40"
                                            onClick={() => setEditModal({ open: false, id: null, form: null })}
                                        />
                                        <div className="relative bg-white border border-slate-200 rounded-xl p-2 shadow-xl w-[90vw] max-w-xl">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <h2 className="text-base font-semibold text-slate-900">Edit Task</h2>
                                                <button
                                                    type="button"
                                                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700"
                                                    onClick={() => setEditModal({ open: false, id: null, form: null })}
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                            <div className="grid gap-1">
                                                <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5">
                                                    <label className="text-xs font-semibold text-slate-900 block">
                                                        Title *
                                                    </label>
                                                    <input
                                                        value={editModal.form?.name || ""}
                                                        onChange={(e) =>
                                                            setEditModal((m) => ({
                                                                ...m,
                                                                form: { ...m.form, name: e.target.value },
                                                            }))
                                                        }
                                                        className="mt-0.5 w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-xs h-8"
                                                        placeholder="Task title"
                                                    />
                                                </div>
                                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                                    <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5">
                                                        <label className="text-xs font-semibold text-slate-900 block">
                                                            Start Date
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={editModal.form?.start_date || ""}
                                                            onChange={(e) =>
                                                                setEditModal((m) => ({
                                                                    ...m,
                                                                    form: { ...m.form, start_date: e.target.value },
                                                                }))
                                                            }
                                                            className="mt-0.5 w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-xs h-8"
                                                        />
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5">
                                                        <label className="text-xs font-semibold text-slate-900 block">
                                                            End Date
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={editModal.form?.end_date || ""}
                                                            onChange={(e) =>
                                                                setEditModal((m) => ({
                                                                    ...m,
                                                                    form: { ...m.form, end_date: e.target.value },
                                                                }))
                                                            }
                                                            className="mt-0.5 w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-xs h-8"
                                                        />
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5">
                                                        <label className="text-xs font-semibold text-slate-900 block">
                                                            Deadline
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={editModal.form?.dueDate || ""}
                                                            onChange={(e) =>
                                                                setEditModal((m) => ({
                                                                    ...m,
                                                                    form: { ...m.form, dueDate: e.target.value },
                                                                }))
                                                            }
                                                            className="mt-0.5 w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-xs h-8"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                                    <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5">
                                                        <label className="text-xs font-semibold text-slate-900 block">
                                                            Status
                                                        </label>
                                                        <select
                                                            value={editModal.form?.status || "open"}
                                                            onChange={(e) =>
                                                                setEditModal((m) => ({
                                                                    ...m,
                                                                    form: { ...m.form, status: e.target.value },
                                                                }))
                                                            }
                                                            className="mt-0.5 w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-xs h-8"
                                                        >
                                                            <option value="open">Open</option>
                                                            <option value="in progress">In progress</option>
                                                            <option value="done">Done</option>
                                                            <option value="cancelled">Cancelled</option>
                                                        </select>
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5">
                                                        <label className="text-xs font-semibold text-slate-900 block">
                                                            Priority
                                                        </label>
                                                        <select
                                                            value={editModal.form?.priority || "normal"}
                                                            onChange={(e) =>
                                                                setEditModal((m) => ({
                                                                    ...m,
                                                                    form: { ...m.form, priority: e.target.value },
                                                                }))
                                                            }
                                                            className="mt-0.5 w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-xs h-8"
                                                        >
                                                            <option value="high">High</option>
                                                            <option value="normal">Normal</option>
                                                            <option value="low">Low</option>
                                                        </select>
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5">
                                                        <label className="text-xs font-semibold text-slate-900 block">
                                                            Responsible
                                                        </label>
                                                        <input
                                                            value={editModal.form?.assignee || ""}
                                                            onChange={(e) =>
                                                                setEditModal((m) => ({
                                                                    ...m,
                                                                    form: { ...m.form, assignee: e.target.value },
                                                                }))
                                                            }
                                                            className="mt-0.5 w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-xs h-8"
                                                            placeholder="Name"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                                    <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5 md:col-span-2">
                                                        <label className="text-xs font-semibold text-slate-900 block">
                                                            Move to Key Area
                                                        </label>
                                                        <select
                                                            value={editModal.form?.keyAreaId || ""}
                                                            onChange={(e) =>
                                                                setEditModal((m) => ({
                                                                    ...m,
                                                                    form: { ...m.form, keyAreaId: e.target.value },
                                                                }))
                                                            }
                                                            className="mt-0.5 w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-xs h-8"
                                                        >
                                                            <option value="">— Keep in Don’t Forget —</option>
                                                            {dfKeyAreas.map((ka) => (
                                                                <option key={ka.id} value={ka.id}>
                                                                    {ka.title}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <>
                                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                                        <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5">
                                                            <label className="text-xs font-semibold text-slate-900 block">
                                                                Quadrant (auto)
                                                            </label>
                                                            <div className="mt-0.5">
                                                                <span
                                                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-white ${
                                                                        (editModal.form?.quadrant || "") === "Q1"
                                                                            ? "bg-rose-600"
                                                                            : (editModal.form?.quadrant || "") === "Q2"
                                                                              ? "bg-amber-600"
                                                                              : (editModal.form?.quadrant || "") ===
                                                                                  "Q3"
                                                                                ? "bg-blue-600"
                                                                                : (editModal.form?.quadrant || "") ===
                                                                                    "Q4"
                                                                                  ? "bg-emerald-600"
                                                                                  : "bg-slate-500"
                                                                    }`}
                                                                >
                                                                    {editModal.form?.quadrant || "—"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5">
                                                            <label className="text-xs font-semibold text-slate-900 block">
                                                                Goal
                                                            </label>
                                                            <input
                                                                value={editModal.form?.goal || ""}
                                                                onChange={(e) =>
                                                                    setEditModal((m) => ({
                                                                        ...m,
                                                                        form: { ...m.form, goal: e.target.value },
                                                                    }))
                                                                }
                                                                className="mt-0.5 w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-xs h-8"
                                                                placeholder="Goal"
                                                            />
                                                        </div>
                                                        <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5">
                                                            <label className="text-xs font-semibold text-slate-900 block">
                                                                Tags
                                                            </label>
                                                            <input
                                                                value={editModal.form?.tags || ""}
                                                                onChange={(e) =>
                                                                    setEditModal((m) => ({
                                                                        ...m,
                                                                        form: { ...m.form, tags: e.target.value },
                                                                    }))
                                                                }
                                                                className="mt-0.5 w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-xs h-8"
                                                                placeholder="e.g., q3,planning"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                                        <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5">
                                                            <label className="text-xs font-semibold text-slate-900 block">
                                                                Time
                                                            </label>
                                                            <input
                                                                type="time"
                                                                value={editModal.form?.time || ""}
                                                                onChange={(e) =>
                                                                    setEditModal((m) => ({
                                                                        ...m,
                                                                        form: { ...m.form, time: e.target.value },
                                                                    }))
                                                                }
                                                                className="mt-0.5 w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-xs h-8"
                                                            />
                                                        </div>
                                                        <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5">
                                                            <label className="text-xs font-semibold text-slate-900 block">
                                                                Duration
                                                            </label>
                                                            <input
                                                                value={editModal.form?.duration || ""}
                                                                onChange={(e) =>
                                                                    setEditModal((m) => ({
                                                                        ...m,
                                                                        form: { ...m.form, duration: e.target.value },
                                                                    }))
                                                                }
                                                                className="mt-0.5 w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-xs h-8"
                                                                placeholder="e.g., 1h, 1d"
                                                            />
                                                        </div>
                                                        <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5">
                                                            <label className="text-xs font-semibold text-slate-900 block">
                                                                {`List — ${getDfListName(editModal.form?.listIndex || 1)}`}
                                                            </label>
                                                            <select
                                                                value={String(editModal.form?.listIndex || 1)}
                                                                onChange={(e) =>
                                                                    setEditModal((m) => ({
                                                                        ...m,
                                                                        form: {
                                                                            ...m.form,
                                                                            listIndex: Number(e.target.value || 1),
                                                                        },
                                                                    }))
                                                                }
                                                                className="mt-0.5 w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-xs h-8"
                                                            >
                                                                {availableDfLists.map((n) => (
                                                                    <option key={n} value={String(n)}>
                                                                        {getDfListName(n)}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5">
                                                        <label className="text-xs font-semibold text-slate-900 block">
                                                            Notes
                                                        </label>
                                                        <textarea
                                                            rows={2}
                                                            value={editModal.form?.notes || ""}
                                                            onChange={(e) =>
                                                                setEditModal((m) => ({
                                                                    ...m,
                                                                    form: { ...m.form, notes: e.target.value },
                                                                }))
                                                            }
                                                            className="mt-0.5 w-full rounded-md border-0 bg-transparent px-1.5 py-1 text-xs"
                                                            placeholder="Add notes..."
                                                        />
                                                    </div>
                                                </>
                                                <div className="mt-1 flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        className="rounded-md text-xs text-slate-600 hover:underline px-2 py-1"
                                                        onClick={() =>
                                                            setEditModal({ open: false, id: null, form: null })
                                                        }
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-2.5 py-1 text-xs"
                                                        onClick={saveDfTaskEdit}
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {assignModal.open && (
                                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                                        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4">
                                            <div className="text-lg font-semibold mb-2">Move task to Key Area</div>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-sm text-slate-700 mb-1">
                                                        Key Area
                                                    </label>
                                                    <select
                                                        className="w-full border rounded px-2 py-1"
                                                        value={assignModal.kaId}
                                                        onChange={(e) =>
                                                            setAssignModal((m) => ({ ...m, kaId: e.target.value }))
                                                        }
                                                    >
                                                        {dfKeyAreas.length === 0 && (
                                                            <option value="">No key areas found</option>
                                                        )}
                                                        {dfKeyAreas.map((ka) => (
                                                            <option key={ka.id} value={ka.id}>
                                                                {ka.title}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-700 mb-1">
                                                        {`List — ${getDfListName(assignModal.listIndex || 1)}`}
                                                    </label>
                                                    <select
                                                        className="w-full border rounded px-2 py-1"
                                                        value={String(assignModal.listIndex || 1)}
                                                        onChange={(e) =>
                                                            setAssignModal((m) => ({
                                                                ...m,
                                                                listIndex: Number(e.target.value || 1),
                                                            }))
                                                        }
                                                    >
                                                        {availableDfLists.map((n) => (
                                                            <option key={n} value={String(n)}>
                                                                {getDfListName(n)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex items-center justify-end gap-2">
                                                <button
                                                    className="px-3 py-1.5 rounded border"
                                                    onClick={() =>
                                                        setAssignModal({
                                                            open: false,
                                                            task: null,
                                                            kaId: "",
                                                            listIndex: 1,
                                                        })
                                                    }
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50"
                                                    disabled={!assignModal.kaId}
                                                    onClick={confirmAssignAndOpen}
                                                >
                                                    Move & Open
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
