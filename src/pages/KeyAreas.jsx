// src/pages/KeyAreas.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import TaskActivityModal from "../components/calendar/TaskActivityModal";
import {
    FaPlus,
    FaChevronLeft,
    FaSearch,
    FaEllipsisV,
    FaTimes,
    FaSave,
    FaTrash,
    FaListUl,
    FaExclamationCircle,
    FaRegCircle,
    FaCheckCircle,
    FaAlignJustify,
    FaTag,
    FaAngleDoubleLeft,
    FaChevronDown,
    FaChevronUp,
    FaStop,
    FaBars,
    FaEdit,
    FaLock,
} from "react-icons/fa";

// InlineAddActivity removed per UI simplification

// Small UI helpers for table chips/indicators
const EmptyState = ({ title = "List is empty.", hint = "" }) => (
    <div className="p-4 border border-dashed border-slate-200 rounded-lg bg-slate-50 text-slate-600">
        <div className="text-sm font-medium">{title}</div>
        {hint ? <div className="text-xs text-slate-500 mt-1">{hint}</div> : null}
    </div>
);

const StatusIndicator = ({ status = "open" }) => {
    const s = String(status).toLowerCase();
    const color =
        s === "done" || s === "closed"
            ? "bg-emerald-500"
            : s === "in_progress"
              ? "bg-blue-500"
              : s === "blocked"
                ? "bg-red-500"
                : "bg-slate-400"; // open/other
    return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} aria-hidden="true" />;
};

const PriorityBadge = ({ priority = "med" }) => {
    const p = String(priority).toLowerCase();
    const map = {
        high: { cls: "text-red-700 bg-red-50 border-red-200", label: "High" },
        med: { cls: "text-amber-700 bg-amber-50 border-amber-200", label: "Normal" },
        low: { cls: "text-emerald-700 bg-emerald-50 border-emerald-200", label: "Low" },
    };
    const m = map[p] || map.med;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${m.cls}`}>{m.label}</span>
    );
};

const QuadrantBadge = ({ q = 4 }) => {
    const n = Number(q) || 4;
    const map = {
        1: { cls: "text-white bg-red-600", label: "Q1" },
        2: { cls: "text-white bg-amber-600", label: "Q2" },
        3: { cls: "text-white bg-blue-600", label: "Q3" },
        4: { cls: "text-white bg-emerald-600", label: "Q4" },
    };
    const m = map[n] || map[4];
    return (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${m.cls}`}>
            {m.label}
        </span>
    );
};

// normalize a date value (ISO string or YYYY-MM-DD) to YYYY-MM-DD
const toDateOnly = (val) => {
    if (!val) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
};

// Normalize a UI date value to ISO date-time at midnight UTC expected by BE (@IsDateString date-time)
const toIsoMidnightOrNull = (val, allowUndefined = false) => {
    if (val === undefined) return allowUndefined ? undefined : null;
    if (val === null || val === "") return null;
    const dOnly = toDateOnly(val);
    return dOnly ? `${dOnly}T00:00:00.000Z` : null;
};

// Coerce empty string to null for optional strings; optionally allow undefined passthrough
const nullableString = (val, allowUndefined = false) => {
    if (val === undefined) return allowUndefined ? undefined : null;
    if (val === null) return null;
    const s = String(val);
    return s.trim() === "" ? null : s;
};

// format duration between two ISO timestamps (start, end)
const formatDuration = (startIso, endIso) => {
    if (!startIso || !endIso) return "—";
    const start = new Date(toDateOnly(startIso)).getTime();
    const end = new Date(toDateOnly(endIso)).getTime();
    if (isNaN(start) || isNaN(end)) return "—";
    const days = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    return `${days}d`;
};

// Priority normalization: accepts string ("low"|"med"|"high") or number/number-string (1|2|3)
const getPriorityLevel = (val) => {
    if (val === undefined || val === null || val === "") return 2;
    if (typeof val === "number") return [1, 2, 3].includes(val) ? val : 2;
    const v = String(val).toLowerCase();
    if (v === "1" || v === "low") return 1;
    if (v === "3" || v === "high") return 3;
    return 2; // med or default
};

// Activity helpers (client-only fields retained for UI but not persisted)
// Backend shape: { id, text, taskId, createdAt, updatedAt }

// very small heuristic for quadrant based on priority and time
const computeEisenhowerQuadrant = ({ deadline, end_date, priority = "med" }) => {
    const important = priority === "high" || priority === "med";
    const dueSoon = (() => {
        const ref = deadline || end_date;
        if (!ref) return false;
        const diff = new Date(ref).getTime() - Date.now();
        return diff <= 1000 * 60 * 60 * 24 * 2; // within 2 days
    })();
    if (important && dueSoon) return 1;
    if (important && !dueSoon) return 2;
    if (!important && dueSoon) return 3;
    return 4;
};

// Pick a decorative image for a Key Area title from public assets
const kaImageFor = (title = "") => {
    const t = String(title).toLowerCase();
    if (t.includes("marketing")) return "/key-area.png";
    if (t.includes("sales")) return "/team.png";
    if (t.includes("product")) return "/goals.png";
    if (t.includes("idea")) return "/ideas.png";
    return "/key-area.png"; // fallback
};

// Backend service for Key Areas (no localStorage fallback)
import keyAreaService from "../services/keyAreaService";
import usersService from "../services/usersService";
import taskService from "../services/taskService";
import activityService from "../services/activityService";
// ...existing code...

// Normalize backend task status to UI status
const mapTaskStatusToUi = (s) => {
    const v = String(s || "todo").toLowerCase();
    if (v === "todo") return "open";
    if (v === "in_progress") return "in_progress";
    if (v === "completed") return "done";
    if (v === "cancelled" || v === "canceled") return "blocked";
    return "open";
};

const api = {
    async listKeyAreas() {
        try {
            return await keyAreaService.list({ includeTaskCount: true });
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
        return [];
    },
    async updateKeyArea(id, data) {
        // Only update via backend; no local fallbacks
        return await keyAreaService.update(id, data);
    },
    async createKeyArea(data) {
        // Only create via backend; no local fallbacks
        return await keyAreaService.create(data);
    },
    async deleteKeyArea(id) {
        await keyAreaService.remove(id);
        return true;
    },
    async listTasks(keyAreaId) {
        // Fetch from backend and normalize for UI
        try {
            const rows = await taskService.list({ keyAreaId });
            return (Array.isArray(rows) ? rows : []).map((t) => ({
                ...t,
                status: mapTaskStatusToUi(t.status),
                // normalize for UI naming
                due_date: t.dueDate || t.due_date || null,
                deadline: t.dueDate || t.due_date || null,
                start_date: t.startDate || t.start_date || null,
                end_date: t.endDate || t.end_date || null,
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
        };
        const created = await taskService.create(payload);
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
        const updated = await taskService.update(id, payload);
        // Normalize BE response back to UI shape
        const normalized = {
            ...updated,
            status: (() => {
                const s = String(updated.status || "todo").toLowerCase();
                if (s === "todo") return "open";
                if (s === "in_progress") return "in_progress";
                if (s === "completed") return "done";
                if (s === "cancelled" || s === "canceled") return "blocked";
                return "open";
            })(),
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
        await taskService.remove(id);
        return true;
    },
};

// Minimal placeholders to keep non-list views functional
const KanbanView = ({ tasks = [], onSelect, selectedIds = new Set(), toggleSelect = () => {} }) => {
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-full">
                {groups.map((col) => (
                    <div key={col.key} className="bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="px-3 py-2 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
                            <span>{col.label}</span>
                            <span className="text-slate-500">{col.items.length}</span>
                        </div>
                        <div className="p-2 space-y-2 max-h-[48vh] overflow-auto">
                            {col.items.length === 0 ? (
                                <div className="text-xs text-slate-500">Empty</div>
                            ) : (
                                col.items.map((t) => (
                                    <div
                                        key={t.id}
                                        className="w-full bg-white border border-slate-200 rounded-md shadow-sm hover:shadow px-2 py-2"
                                    >
                                        <div className="flex items-start gap-2">
                                            <input
                                                type="checkbox"
                                                aria-label={`Select ${t.title}`}
                                                className="mt-0.5"
                                                checked={selectedIds.has(t.id)}
                                                onChange={() => toggleSelect(t.id)}
                                            />
                                            {priorityBadge(t.priority)}
                                            <button
                                                type="button"
                                                onClick={() => onSelect && onSelect(t)}
                                                className="flex-1 text-left"
                                                title={t.title}
                                            >
                                                <div className="min-w-0">
                                                    <div className="font-medium truncate text-slate-900">{t.title}</div>
                                                    {t.assignee ? (
                                                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                                            {t.assignee}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CalendarView = ({ tasks = [], onSelect, selectedIds = new Set(), toggleSelect = () => {} }) => {
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
                                        <div className="font-medium truncate text-slate-900">{t.title}</div>
                                        <div className="text-[11px] text-slate-500 mt-0.5 truncate capitalize">
                                            {String(t.status || "open").replace("_", " ")}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

/* --------------------------- Slide Over (Edit) --------------------------- */
function TaskSlideOver({
    task,
    goals,
    onClose,
    onSave,
    onDelete,
    readOnly = false,
    activitiesByTask = {},
    onAddActivity,
    onDeleteActivity,
    onClearActivities,
    initialTab = "details",
    hideActivitiesTab = false,
    listNames = {},
    kaId = null,
    listNumbers = [],
}) {
    const [form, setForm] = useState(null);
    const [activeTab, setActiveTab] = useState("details"); // details | activities
    const [taskActivities, setTaskActivities] = useState([]);
    const [newActivity, setNewActivity] = useState("");
    // Allow attaching activities to this task or keep as 'new' (unattached)
    const [activitiesTarget, setActivitiesTarget] = useState("new"); // String(task.id) | "new"

    useEffect(() => {
        if (!task) {
            setForm(null);
            setTaskActivities([]);
            return;
        }

        setActiveTab(hideActivitiesTab ? "details" : initialTab || "details");
        setForm({
            ...task,
            attachmentsFiles: task.attachments
                ? task.attachments
                      .split(",")
                      .filter(Boolean)
                      .map((n) => ({ name: n }))
                : [],
        });
        // default target to this task when opening
        setActivitiesTarget(String(task.id));
        (async () => {
            try {
                const list = await activityService.list({ taskId: task.id });
                setTaskActivities(Array.isArray(list) ? list : []);
            } catch (e) {
                console.error("Failed to load activities", e);
                setTaskActivities([]);
            }
        })();
    }, [task, initialTab, hideActivitiesTab]);

    // If asked to hide activities, ensure we stay on details
    useEffect(() => {
        if (hideActivitiesTab && activeTab !== "details") setActiveTab("details");
    }, [hideActivitiesTab, activeTab]);

    // When switching target (this task vs new), load that list from backend
    useEffect(() => {
        if (!task) return;
        (async () => {
            try {
                if (activitiesTarget === "new") {
                    const list = await activityService.list();
                    // Unattached activities: filter those without taskId
                    setTaskActivities((Array.isArray(list) ? list : []).filter((a) => !a.taskId));
                } else {
                    const list = await activityService.list({ taskId: activitiesTarget });
                    setTaskActivities(Array.isArray(list) ? list : []);
                }
            } catch (e) {
                console.error("Failed to load activities", e);
                setTaskActivities([]);
            }
        })();
    }, [activitiesTarget, task]);

    // When activities are updated elsewhere (e.g., via global composer), refresh this task's list
    useEffect(() => {
        if (!task?.id) return;
        const handler = async (e) => {
            const tid = e?.detail?.taskId;
            if (tid && String(tid) !== String(task.id)) return; // ignore events for other tasks
            try {
                const list = await activityService.list({ taskId: task.id });
                setTaskActivities(Array.isArray(list) ? list : []);
            } catch (err) {
                // ignore
            }
        };
        window.addEventListener("ka-activities-updated", handler);
        return () => window.removeEventListener("ka-activities-updated", handler);
    }, [task?.id]);

    const addActivity = async () => {
        const text = (newActivity || "").trim();
        if (!text) return;
        try {
            const created = await activityService.create({
                text,
                taskId: activitiesTarget === "new" ? null : activitiesTarget,
            });
            setTaskActivities((prev) => [...prev, created]);
            // notify parent to refresh
            window.dispatchEvent(new CustomEvent("ka-activities-updated", { detail: { refresh: true } }));
        } catch (e) {
            console.error("Failed to add activity", e);
        }
        setNewActivity("");
    };

    const removeActivity = async (id) => {
        try {
            await activityService.remove(id);
            setTaskActivities((prev) => prev.filter((a) => a.id !== id));
            window.dispatchEvent(new CustomEvent("ka-activities-updated", { detail: { refresh: true } }));
        } catch (e) {
            console.error("Failed to delete activity", e);
        }
    };

    const clearActivities = async () => {
        if (!confirm("Clear all activities for this selection?")) return;
        try {
            // delete each activity shown
            const ids = (taskActivities || []).map((a) => a.id);
            await Promise.all(ids.map((id) => activityService.remove(id)));
            setTaskActivities([]);
            window.dispatchEvent(new CustomEvent("ka-activities-updated", { detail: { refresh: true } }));
        } catch (e) {
            console.error("Failed to clear activities", e);
        }
    };

    if (!task || !form) return null;

    const listNameFor = (n) => {
        if (!kaId) return `List ${n}`;
        const names = listNames[String(kaId)] || {};
        return names[String(n)] || `List ${n}`;
    };

    const submit = (e) => {
        e.preventDefault();
        if (readOnly) return;
        const attachmentsNames = (form.attachmentsFiles || []).map((f) => f.name || f).filter(Boolean);
        const payload = {
            ...form,
            attachments: attachmentsNames.join(",") || null,
            start_date: form.start_date ? toDateOnly(form.start_date) : null,
            deadline: form.deadline ? toDateOnly(form.deadline) : null,
            end_date: form.end_date ? toDateOnly(form.end_date) : null,
        };
        onSave(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            <div className="relative w-full max-w-3xl">
                <div className="bg-slate-50 rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900">Task</h3>
                        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-700" onClick={onClose}>
                            <FaTimes />
                        </button>
                    </div>

                    {/* Tabs (single source of truth below) */}

                    {/* Tabs: Details (default). Hide Activities tab when requested */}
                    {!hideActivitiesTab && (
                        <div className="px-4 pt-3 border-b border-slate-200 bg-white">
                            <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                <button
                                    className={`px-3 py-1 rounded-md text-sm font-semibold ${activeTab === "details" ? "bg-white text-slate-900 shadow" : "text-slate-700 hover:bg-slate-200"}`}
                                    onClick={() => setActiveTab("details")}
                                    type="button"
                                >
                                    Details
                                </button>
                                <button
                                    className={`px-3 py-1 rounded-md text-sm font-semibold ${activeTab === "activities" ? "bg-white text-slate-900 shadow" : "text-slate-700 hover:bg-slate-200"}`}
                                    onClick={() => setActiveTab("activities")}
                                    type="button"
                                >
                                    Activities
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "details" ? (
                        hideActivitiesTab ? (
                            <form onSubmit={submit} className="p-3">
                                <div className="grid md:grid-cols-3 gap-2 items-stretch text-sm">
                                    {/* Left column: Title + Description + Meta */}
                                    <div className="md:col-span-2 h-full flex flex-col">
                                        <div className="grid grid-rows-[auto_1fr] gap-1 flex-1">
                                            <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5 h-full flex flex-col">
                                                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                                                    Title
                                                </div>
                                                <textarea
                                                    rows={2}
                                                    className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-base leading-snug"
                                                    value={form.title || ""}
                                                    onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                                                    placeholder="Enter a descriptive task name…"
                                                    disabled={readOnly}
                                                />
                                            </div>
                                            <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5 h-full flex flex-col">
                                                <div className="text-[10px] uppercase tracking-wide text-slate-500">
                                                    Description
                                                </div>
                                                <textarea
                                                    rows={4}
                                                    className="mt-1.5 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm"
                                                    value={form.description || ""}
                                                    onChange={(e) =>
                                                        setForm((s) => ({ ...s, description: e.target.value }))
                                                    }
                                                    placeholder="Add more context…"
                                                    disabled={readOnly}
                                                />
                                                {/* Meta inline */}
                                                <div className="mt-2 border-t border-slate-200 pt-2">
                                                    <div className="grid md:grid-cols-3 gap-2">
                                                        <div>
                                                            <div className="text-[11px] text-slate-600">
                                                                Linked Goal
                                                            </div>
                                                            <select
                                                                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm"
                                                                value={form.goal_id || ""}
                                                                onChange={(e) =>
                                                                    setForm((s) => ({ ...s, goal_id: e.target.value }))
                                                                }
                                                                disabled={readOnly}
                                                            >
                                                                <option value="">— None —</option>
                                                                {goals.map((g) => (
                                                                    <option key={g.id} value={g.id}>
                                                                        {g.title}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <div className="text-[11px] text-slate-600">Tags</div>
                                                            <input
                                                                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm"
                                                                value={form.tags || ""}
                                                                onChange={(e) =>
                                                                    setForm((s) => ({ ...s, tags: e.target.value }))
                                                                }
                                                                placeholder="comma,separated"
                                                                disabled={readOnly}
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="text-[11px] text-slate-600">{`List (Tab) — ${listNameFor(form.list_index || 1)}`}</div>
                                                            <select
                                                                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm"
                                                                value={String(form.list_index || 1)}
                                                                onChange={(e) =>
                                                                    setForm((s) => ({
                                                                        ...s,
                                                                        list_index: Number(e.target.value || 1),
                                                                    }))
                                                                }
                                                                disabled={readOnly}
                                                            >
                                                                {(listNumbers && listNumbers.length
                                                                    ? listNumbers
                                                                    : Array.from({ length: 10 }, (_, i) => i + 1)
                                                                ).map((n) => (
                                                                    <option key={n} value={String(n)}>
                                                                        {listNameFor(n)}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {!readOnly && (
                                            <div className="mt-1.5 flex items-center gap-2">
                                                <button className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 px-2.5 py-1.5 text-xs">
                                                    <FaSave /> Save changes
                                                </button>
                                                <button
                                                    type="button"
                                                    className="px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
                                                    onClick={onClose}
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {/* Right column: Summary & Schedule */}
                                    <div className="grid grid-rows-[1fr_1fr] gap-1.5 h-full">
                                        <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5 h-full flex flex-col">
                                            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">
                                                Summary
                                            </div>
                                            <div className="mb-1.5">
                                                <div className="text-[11px] text-slate-600">Assignee</div>
                                                <input
                                                    className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm"
                                                    value={form.assignee || ""}
                                                    onChange={(e) =>
                                                        setForm((s) => ({ ...s, assignee: e.target.value }))
                                                    }
                                                    disabled={readOnly}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <div>
                                                    <div className="text-[11px] text-slate-600">Status</div>
                                                    <select
                                                        className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm"
                                                        value={form.status || "open"}
                                                        onChange={(e) =>
                                                            setForm((s) => ({ ...s, status: e.target.value }))
                                                        }
                                                        disabled={readOnly}
                                                    >
                                                        <option value="open">Open</option>
                                                        <option value="in_progress">In Progress</option>
                                                        <option value="done">Done</option>
                                                        <option value="cancelled">Cancelled</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <div className="text-[11px] text-slate-600">Priority</div>
                                                    <select
                                                        className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm"
                                                        value={form.priority || "med"}
                                                        onChange={(e) =>
                                                            setForm((s) => ({ ...s, priority: e.target.value }))
                                                        }
                                                        disabled={readOnly}
                                                    >
                                                        <option value="low">Low</option>
                                                        <option value="med">Medium</option>
                                                        <option value="high">High</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5 h-full flex flex-col">
                                            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">
                                                Schedule
                                            </div>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {[
                                                    { key: "start_date", label: "Start" },
                                                    { key: "end_date", label: "End date" },
                                                    { key: "deadline", label: "Deadline" },
                                                ].map((f) => (
                                                    <div key={f.key}>
                                                        <div className="text-[11px] text-slate-600">{f.label}</div>
                                                        <input
                                                            type="date"
                                                            className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm"
                                                            value={toDateOnly(form[f.key]) || ""}
                                                            onChange={(e) =>
                                                                setForm((s) => ({ ...s, [f.key]: e.target.value }))
                                                            }
                                                            disabled={readOnly}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Footer for readOnly state */}
                                {readOnly && (
                                    <div className="mt-3 flex items-center">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="ml-auto rounded-lg text-sm text-slate-700 hover:underline"
                                        >
                                            Close
                                        </button>
                                    </div>
                                )}
                            </form>
                        ) : (
                            <form onSubmit={submit} className="p-4 max-h-[80vh] overflow-auto">
                                {/* ...existing detailed layout with attachments/recurrence... */}
                            </form>
                        )
                    ) : (
                        <div className="p-4 max-h-[80vh] overflow-auto">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold">Your activities</div>
                                <div className="text-xs text-slate-500">Attach to a task or keep as new</div>
                            </div>

                            <div className="mt-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        window.dispatchEvent(
                                            new CustomEvent("ka-open-activity-composer", {
                                                detail: { taskId: task?.id },
                                            }),
                                        )
                                    }
                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                                >
                                    Add Activity
                                </button>
                            </div>
                            <div>
                                {taskActivities && taskActivities.length > 0 ? (
                                    <div className="mt-2 space-y-2">
                                        {taskActivities.map((a) => (
                                            <div
                                                key={a.id}
                                                className="flex items-start justify-between p-2 border rounded bg-white"
                                            >
                                                <div className="flex-1">
                                                    <div className="text-sm text-slate-800">{a.text}</div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        {/* createdAt removed */}
                                                    </div>
                                                </div>
                                                <div className="ml-3 flex items-start">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeActivity(a.id)}
                                                        className="text-xs text-red-600 px-2 py-1 rounded hover:bg-red-50"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-500 mt-2">No activities yet.</div>
                                )}
                            </div>

                            <div className="mt-4 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="ml-auto rounded-lg text-sm text-slate-700 hover:underline"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ------------------------ Full Page Task Detail View ------------------------ */
function TaskFullView({
    task,
    goals,
    kaTitle,
    readOnly = false,
    onBack,
    onSave,
    onDelete,
    activitiesByTask = {},
    onUpdateActivities,
    initialTab = "activities",
    listNames = {},
    kaId = null,
    listNumbers = [],
}) {
    const [tab, setTab] = useState(initialTab || "activities");
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState(task || null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const menuRef = useRef(null);
    const [newActivity, setNewActivity] = useState("");
    const [showDetailsPopup, setShowDetailsPopup] = useState(false);
    const [openActivityRows, setOpenActivityRows] = useState(new Set());
    const [activityModal, setActivityModal] = useState({ open: false, item: null });

    useEffect(() => {
        setTab(initialTab || "activities");
    }, [initialTab]);

    // Removed: global activity composer listener belongs to KeyAreas component

    useEffect(() => {
        setForm(task || null);
    }, [task]);

    useEffect(() => {
        if (!menuOpen) return;
        const onClick = (e) => {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [menuOpen]);

    if (!task) return null;

    const list = activitiesByTask[String(task.id)] || [];

    const setList = (next) => {
        const payload = typeof next === "function" ? next(list) : next;
        onUpdateActivities && onUpdateActivities(String(task.id), payload);
    };

    const addActivity = async (text) => {
        const t = (text || "").trim();
        if (!t) return;
        try {
            const created = await activityService.create({ text: t, taskId: task.id });
            setList([...(list || []), created]);
            window.dispatchEvent(new CustomEvent("ka-activities-updated", { detail: { refresh: true } }));
        } catch (e) {
            console.error("Failed to add activity", e);
        }
    };
    const removeActivity = async (id) => {
        try {
            await activityService.remove(id);
            setList(list.filter((a) => a.id !== id));
            window.dispatchEvent(new CustomEvent("ka-activities-updated", { detail: { refresh: true } }));
        } catch (e) {
            console.error("Failed to delete activity", e);
        }
        setOpenActivityRows((prev) => {
            const copy = new Set(prev);
            copy.delete(id);
            return copy;
        });
    };
    const toggleCompleted = (id) => {
        setList(list.map((a) => (a.id === id ? { ...a, completed: a.completed ? 0 : 1 } : a)));
    };
    const setPriorityValue = (id, value) => {
        // set priority explicitly via icon click; icons stay visible regardless of value
        setList(list.map((a) => (a.id === id ? { ...a, priority: value } : a)));
    };
    const createTaskFromActivity = (item) => {
        // lightweight hook for future integration
        try {
            window.dispatchEvent(
                new CustomEvent("ka-create-task-from-activity", { detail: { taskId: task.id, activity: item } }),
            );
        } catch {}
    };
    const toggleRow = (id) => {
        setOpenActivityRows((prev) => {
            // If clicking the already open row, close it
            if (prev.has(id)) return new Set();
            // If switching to a different row, "save" current list and open only this one
            if (prev.size > 0 && !prev.has(id)) {
                onUpdateActivities && onUpdateActivities(String(task.id), list);
            }
            return new Set([id]);
        });
    };

    // When hovering another activity, close any open one (and save), but don't open the hovered.
    const closeOnHoverDifferent = (id) => {
        setOpenActivityRows((prev) => {
            if (prev.size > 0 && !prev.has(id)) {
                onUpdateActivities && onUpdateActivities(String(task.id), list);
                return new Set();
            }
            return prev;
        });
    };
    const updateField = (id, field, value) => {
        setList(list.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
    };
    const clearActivities = () => {
        if (!confirm("Clear all activities for this task?")) return;
        onUpdateActivities && onUpdateActivities(String(task.id), []);
    };

    const listNameFor = (n) => {
        if (!kaId) return `List ${n}`;
        const names = listNames[String(kaId)] || {};
        return names[String(n)] || `List ${n}`;
    };

    // Save handler for details tab
    const save = async () => {
        if (onSave) {
            await onSave(form);
        }
        setIsEditing(false);
        // Close the details card after saving
        if (onBack) onBack();
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200">
            {/* Header: row 1 (back + title + actions), row 2 (Key Area pill fully left-aligned) */}
            <div className="p-2 border-b border-slate-200">
                <div className="flex items-start gap-2">
                    {onBack && (
                        <button
                            type="button"
                            className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                            aria-label="Back"
                            onClick={onBack}
                            style={{ minWidth: 36, minHeight: 36 }}
                        >
                            <FaChevronLeft />
                        </button>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            {(() => {
                                const lvl = getPriorityLevel(form?.priority ?? task?.priority);
                                if (lvl === 2) return null; // hide for medium
                                const cls = lvl === 3 ? "text-red-600" : "text-emerald-600";
                                const label = lvl === 3 ? "High" : "Low";
                                return (
                                    <span
                                        className={`mt-0.5 inline-block text-sm font-bold ${cls}`}
                                        title={`Priority: ${label}`}
                                    >
                                        !
                                    </span>
                                );
                            })()}
                            <div className="relative truncate font-bold text-slate-900 text-base md:text-lg pl-6 z-10">
                                {/* subtle stop icon behind the task name, with left padding to avoid overlap */}
                                <FaStop
                                    className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none text-[20px] text-[#4DC3D8]"
                                    aria-hidden="true"
                                />
                                <span className="relative z-10">{form?.title || task?.title || "Untitled task"}</span>
                            </div>
                            {/* Ellipsis menu next to the title */}
                            <div className="relative shrink-0 z-50" ref={menuRef}>
                                <button
                                    type="button"
                                    aria-haspopup="menu"
                                    aria-expanded={menuOpen ? "true" : "false"}
                                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const gap = 6; // slight offset below/right
                                        const menuWidth = 160; // Tailwind w-40
                                        // Preferred position: right and just below the dots
                                        let top = rect.bottom + window.scrollY + gap;
                                        let left = rect.right + window.scrollX + gap;
                                        // If it overflows right edge, flip to left side of the button
                                        const viewportRight = window.scrollX + window.innerWidth - gap;
                                        if (left + menuWidth > viewportRight) {
                                            left = rect.left + window.scrollX - menuWidth - gap;
                                        }
                                        setMenuPos({ top, left });
                                        setMenuOpen((s) => !s);
                                    }}
                                    title="More actions"
                                >
                                    <FaEllipsisV />
                                </button>
                                {menuOpen && (
                                    <div
                                        role="menu"
                                        className="fixed w-40 bg-white border border-slate-200 rounded-lg shadow z-50"
                                        style={{ top: menuPos.top, left: menuPos.left }}
                                    >
                                        <button
                                            role="menuitem"
                                            className="block w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
                                            onClick={() => {
                                                setMenuOpen(false);
                                                // Open unified Task modal in edit mode
                                                window.dispatchEvent(
                                                    new CustomEvent("ka-open-task-editor", { detail: { task } }),
                                                );
                                            }}
                                        >
                                            Edit details
                                        </button>
                                        {!readOnly && (
                                            <button
                                                role="menuitem"
                                                className="block w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    if (!confirm("Delete this task?")) return;
                                                    onDelete && onDelete(task);
                                                }}
                                            >
                                                Delete task
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Key Area tracking pill below, fully left-aligned with its icon */}
                {kaTitle && (
                    <div className="pt-2">
                        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 rounded-md px-2 py-0.5 text-xs">
                            <img
                                alt="Key Areas"
                                className="w-4 h-4 object-contain opacity-70"
                                src={`${import.meta.env.BASE_URL}key-area.png`}
                                onError={(e) => {
                                    if (e?.currentTarget) e.currentTarget.src = "/key-area.png";
                                }}
                            />
                            <span className="font-medium truncate max-w-full" title={kaTitle}>
                                {kaTitle}
                            </span>
                        </div>
                    </div>
                )}
            </div>
            {/* Professional summary card under header */}
            {(() => {
                const vt = form || task;
                const assignee = vt?.assignee || "—";
                const statusText = String(vt?.status || "open").replace("_", " ");
                const priorityLabel = (() => {
                    const p = String(vt?.priority || "med").toLowerCase();
                    if (p === "med" || p === "medium") return "Normal";
                    if (p === "low") return "Low";
                    if (p === "high") return "High";
                    return p;
                })();
                const q = computeEisenhowerQuadrant({
                    deadline: vt?.deadline,
                    end_date: vt?.end_date,
                    priority: String(vt?.priority || "med").toLowerCase(),
                });
                const goalTitle = (() => {
                    const id = vt?.goal_id;
                    if (!id) return "—";
                    const g = (goals || []).find((x) => String(x.id) === String(id));
                    return g?.title || `#${id}`;
                })();
                const rawTags = vt?.tags || "";
                const tagsArr = rawTags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);
                const tags = tagsArr.length ? tagsArr : null;
                const startD = toDateOnly(vt?.start_date) || "—";
                const deadlineD = toDateOnly(vt?.deadline) || "—";
                const endD = toDateOnly(vt?.end_date) || "—";
                const durationText = vt?.start_date && vt?.end_date ? formatDuration(vt.start_date, vt.end_date) : "—";
                return (
                    <div className="px-3 pt-3 pb-2 border-b border-slate-200 bg-white">
                        <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2">
                            <div className="text-sm">
                                {/* Row 1: Labels in exact order */}
                                <div className="grid grid-cols-10 gap-x-1">
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Assignee</div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Status</div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Priority</div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Quadrant</div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Goal</div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Tags</div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Start Date</div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">End date</div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Deadline</div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Duration</div>
                                </div>
                                {/* Row 2: Values aligned under each label */}
                                <div className="grid grid-cols-10 gap-x-1 mt-0.5">
                                    {/* Assignee value */}
                                    <div className="text-slate-900 truncate min-w-0">{assignee}</div>
                                    {/* Status value */}
                                    <div className="text-slate-900 capitalize truncate min-w-0 inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
                                        {statusText}
                                    </div>
                                    {/* Priority value */}
                                    <div className="text-slate-900 truncate min-w-0 inline-flex items-center gap-1 whitespace-nowrap">
                                        <span>{priorityLabel}</span>
                                        {(() => {
                                            const lvl = getPriorityLevel(vt?.priority || "med");
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
                                    </div>
                                    {/* Quadrant value */}
                                    <div className="min-w-0">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-medium">{`Q${q}`}</span>
                                    </div>
                                    {/* Goal value */}
                                    <div className="text-slate-900 truncate min-w-0" title={goalTitle}>
                                        {goalTitle}
                                    </div>
                                    {/* Tags value (compact) */}
                                    <div className="text-slate-900 truncate min-w-0">
                                        {(() => {
                                            if (!tags) return "—";
                                            const maxTags = 2;
                                            const shown = tags.slice(0, maxTags);
                                            const extra = Math.max(0, tags.length - shown.length);
                                            return `${shown.join(", ")}${extra ? `, +${extra}` : ""}`;
                                        })()}
                                    </div>
                                    {/* Start Date value */}
                                    <div className="text-slate-900 truncate min-w-0 whitespace-nowrap">{startD}</div>
                                    {/* End date value */}
                                    <div className="text-slate-900 truncate min-w-0 whitespace-nowrap">{endD}</div>
                                    {/* Deadline value */}
                                    <div className="text-slate-900 truncate min-w-0 whitespace-nowrap">{deadlineD}</div>
                                    {/* Duration value */}
                                    <div className="text-slate-900 truncate min-w-0 whitespace-nowrap">
                                        {durationText}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {/* Local tabs for Activities / Details */}
            <div className="px-2 pt-2 border-b border-slate-200 bg-white">
                <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    <button
                        type="button"
                        className={`px-3 py-1 rounded-md text-sm font-semibold ${tab === "activities" ? "bg-white text-slate-900 shadow" : "text-slate-700 hover:bg-slate-200"}`}
                        onClick={() => setTab("activities")}
                    >
                        <span className="inline-flex items-center gap-1">
                            <svg
                                className={`w-4 h-4 ${tab === "activities" ? "text-[#4DC3D8]" : ""}`}
                                viewBox="0 0 448 512"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                                focusable="false"
                                fill="currentColor"
                            >
                                <path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z" />
                            </svg>
                            Activities
                        </span>
                    </button>
                </div>
            </div>
            {tab === "activities" ? (
                <div className="p-4">
                    {list.length === 0 ? (
                        <EmptyState title="No activities for this task yet." hint="Add a new activity below." />
                    ) : (
                        <ul className="space-y-2">
                            {list.map((a) => {
                                const title = a.text || a.activity_name || "";
                                const isOpen = openActivityRows.has(a.id);
                                return (
                                    <li
                                        key={a.id}
                                        className="bg-slate-50 border border-slate-200 rounded-lg p-2"
                                        onMouseEnter={() => closeOnHoverDifferent(a.id)}
                                    >
                                        <div
                                            className="text-sm text-slate-800 flex items-start gap-2 cursor-pointer select-none"
                                            onClick={() => toggleRow(a.id)}
                                            role="button"
                                            aria-expanded={isOpen ? "true" : "false"}
                                            title={isOpen ? "Hide details" : "Show details"}
                                        >
                                            {/* Complete toggle */}
                                            <button
                                                type="button"
                                                className="mt-0.5 text-slate-500 hover:text-blue-600"
                                                title={a.completed ? "Mark incomplete" : "Mark completed"}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleCompleted(a.id);
                                                }}
                                            >
                                                {a.completed ? (
                                                    <FaCheckCircle className="w-4 h-4" />
                                                ) : (
                                                    <FaRegCircle className="w-4 h-4" />
                                                )}
                                            </button>

                                            {/* Reorder handle (visual) */}
                                            <span className="mt-0.5 text-[#4DC3D8]" title="Drag to reorder">
                                                <FaAlignJustify className="w-4 h-4" />
                                            </span>
                                            <div className="flex-1">
                                                <div className="w-full font-medium text-slate-800 truncate">
                                                    {title || "Untitled activity"}
                                                </div>
                                                {/* createdAt removed */}
                                            </div>
                                            {/* Tag icon (placeholder) */}
                                            <button
                                                type="button"
                                                className="p-1 rounded hover:bg-slate-100 text-[#4DC3D8]"
                                                title="Tag"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // placeholder for tag picker
                                                }}
                                            >
                                                <FaTag className="w-4 h-4" />
                                            </button>
                                            {/* Priority indicator (single icon like task) */}
                                            {(() => {
                                                const eff =
                                                    a.priority !== undefined && a.priority !== null && a.priority !== ""
                                                        ? a.priority
                                                        : task?.priority;
                                                const lvl = getPriorityLevel(eff);
                                                if (lvl === 2) return null; // hide when normal/medium
                                                const color = lvl === 3 ? "text-red-600" : "text-emerald-600";
                                                const label = lvl === 3 ? "high" : "low";
                                                return (
                                                    <span
                                                        className={`mt-0.5 inline-block text-sm font-bold ${color}`}
                                                        title={`Priority: ${label}`}
                                                    >
                                                        !
                                                    </span>
                                                );
                                            })()}
                                            {/* Delete */}
                                            <button
                                                type="button"
                                                className="p-1 rounded hover:bg-slate-100 text-red-600"
                                                title="Delete activity"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeActivity(a.id);
                                                }}
                                            >
                                                <FaTrash className="w-4 h-4" />
                                            </button>
                                            {/* Edit activity */}
                                            <button
                                                type="button"
                                                className="p-1 rounded hover:bg-slate-100 text-slate-700"
                                                title="Edit activity"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.dispatchEvent(
                                                        new CustomEvent("ka-open-activity-editor", {
                                                            detail: { activity: a, taskId: task.id },
                                                        }),
                                                    );
                                                }}
                                            >
                                                <FaEdit className="w-4 h-4" />
                                            </button>
                                            {/* Create as task (disabled if already created) */}
                                            <button
                                                type="button"
                                                className={`p-1 rounded hover:bg-slate-100 ${
                                                    a.created_task_id
                                                        ? "text-slate-300 cursor-not-allowed"
                                                        : "text-slate-700"
                                                }`}
                                                title={
                                                    a.created_task_id
                                                        ? "Already created a task from this activity"
                                                        : "Create as task"
                                                }
                                                disabled={!!a.created_task_id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (a.created_task_id) return;
                                                    createTaskFromActivity(a);
                                                }}
                                            >
                                                <FaAngleDoubleLeft className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {isOpen && (
                                            <div className="mt-2 border-t border-slate-200 pt-2">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                                    {/* Row 1 */}
                                                    <div>
                                                        <label className="block text-[11px] text-slate-600">
                                                            Activity Name
                                                        </label>
                                                        <input
                                                            value={a.text != null ? a.text : a.activity_name || ""}
                                                            onChange={(e) =>
                                                                updateField(
                                                                    a.id,
                                                                    a.text != null ? "text" : "activity_name",
                                                                    e.target.value,
                                                                )
                                                            }
                                                            placeholder="Enter activity name"
                                                            className="w-full border rounded px-2 py-1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] text-slate-600">
                                                            Start Date
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={toDateOnly(a.date_start) || ""}
                                                            onChange={(e) =>
                                                                updateField(a.id, "date_start", e.target.value)
                                                            }
                                                            className="w-full border rounded px-2 py-1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] text-slate-600">
                                                            End Date
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={toDateOnly(a.date_end) || ""}
                                                            onChange={(e) =>
                                                                updateField(a.id, "date_end", e.target.value)
                                                            }
                                                            className="w-full border rounded px-2 py-1"
                                                        />
                                                    </div>
                                                    {/* Row 2 */}
                                                    <div>
                                                        <label className="block text-[11px] text-slate-600">
                                                            Deadline
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={toDateOnly(a.deadline) || ""}
                                                            onChange={(e) =>
                                                                updateField(a.id, "deadline", e.target.value)
                                                            }
                                                            className="w-full border rounded px-2 py-1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] text-slate-600">
                                                            Duration
                                                        </label>
                                                        <input
                                                            type="time"
                                                            value={a.duration || ""}
                                                            onChange={(e) =>
                                                                updateField(a.id, "duration", e.target.value)
                                                            }
                                                            className="w-full border rounded px-2 py-1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] text-slate-600">Task</label>
                                                        <input
                                                            value={a.task_id || ""}
                                                            onChange={(e) =>
                                                                updateField(a.id, "task_id", e.target.value)
                                                            }
                                                            placeholder="Task"
                                                            className="w-full border rounded px-2 py-1"
                                                        />
                                                    </div>
                                                    {/* Row 3 */}
                                                    <div>
                                                        <label className="block text-[11px] text-slate-600">
                                                            Priority
                                                        </label>
                                                        <select
                                                            value={a.priority || 2}
                                                            onChange={(e) =>
                                                                updateField(a.id, "priority", Number(e.target.value))
                                                            }
                                                            className="w-full border rounded px-2 py-1"
                                                        >
                                                            <option value={3}>High</option>
                                                            <option value={2}>Normal</option>
                                                            <option value={1}>Low</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] text-slate-600">
                                                            Responsible
                                                        </label>
                                                        <input
                                                            value={a.responsible || ""}
                                                            onChange={(e) =>
                                                                updateField(a.id, "responsible", e.target.value)
                                                            }
                                                            placeholder="Responsible"
                                                            className="w-full border rounded px-2 py-1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] text-slate-600">
                                                            Notes
                                                        </label>
                                                        <textarea
                                                            rows={2}
                                                            value={a.notes || ""}
                                                            onChange={(e) => updateField(a.id, "notes", e.target.value)}
                                                            className="w-full border rounded px-2 py-1"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-end gap-2 mt-2">
                                                    <button
                                                        type="button"
                                                        className="px-2 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                                                        onClick={async () => {
                                                            const newTitle = (
                                                                (a.text != null ? a.text : a.activity_name) || ""
                                                            ).trim();
                                                            if (!newTitle) return;
                                                            try {
                                                                await activityService.update(a.id, { text: newTitle });
                                                                window.dispatchEvent(
                                                                    new CustomEvent("ka-activities-updated", {
                                                                        detail: { refresh: true },
                                                                    }),
                                                                );
                                                            } catch (err) {
                                                                console.error("Failed to save activity", err);
                                                            }
                                                        }}
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                        <button
                            type="button"
                            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() =>
                                window.dispatchEvent(
                                    new CustomEvent("ka-open-activity-composer", { detail: { taskId: task?.id } }),
                                )
                            }
                        >
                            Add Activity
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-2 grid md:grid-cols-3 gap-2 items-stretch">
                    {/* Left column: Title + Description */}
                    <div className="md:col-span-2 h-full flex flex-col text-sm">
                        <div className="grid grid-rows-[auto_1fr] gap-1 flex-1">
                            <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5 h-full flex flex-col">
                                <div className="text-[10px] uppercase tracking-wide text-slate-500">Title</div>
                                <textarea
                                    rows={2}
                                    className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-base leading-snug disabled:bg-slate-100 disabled:text-slate-700"
                                    value={isEditing && !readOnly ? (form.title ?? "") : (task.title ?? "")}
                                    onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                                    placeholder="Enter a descriptive task name…"
                                    readOnly={!isEditing || readOnly}
                                    disabled={!isEditing || readOnly}
                                />
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5 h-full flex flex-col">
                                <div className="text-[10px] uppercase tracking-wide text-slate-500">Description</div>
                                <textarea
                                    rows={5}
                                    className="mt-1.5 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-700"
                                    value={isEditing && !readOnly ? form.description || "" : task.description || ""}
                                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                                    placeholder="Add more context…"
                                    readOnly={!isEditing || readOnly}
                                    disabled={!isEditing || readOnly}
                                />
                                {/* Meta (moved here) */}
                                <div className="mt-2 border-t border-slate-200 pt-2">
                                    <div className="grid md:grid-cols-3 gap-2">
                                        {/* Linked Goal */}
                                        <div>
                                            <div className="text-[11px] text-slate-600">Linked Goal</div>
                                            <select
                                                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-700"
                                                value={isEditing && !readOnly ? form.goal_id || "" : task.goal_id || ""}
                                                onChange={(e) => setForm((s) => ({ ...s, goal_id: e.target.value }))}
                                                disabled={!isEditing || readOnly}
                                            >
                                                <option value="">— None —</option>
                                                {goals.map((g) => (
                                                    <option key={g.id} value={g.id}>
                                                        {g.title}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* Tags */}
                                        <div>
                                            <div className="text-[11px] text-slate-600">Tags</div>
                                            <input
                                                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-700"
                                                value={isEditing && !readOnly ? form.tags || "" : task.tags || ""}
                                                onChange={(e) => setForm((s) => ({ ...s, tags: e.target.value }))}
                                                placeholder="comma,separated"
                                                readOnly={!isEditing || readOnly}
                                                disabled={!isEditing || readOnly}
                                            />
                                        </div>
                                        {/* List (Tab) */}
                                        <div>
                                            <div className="text-[11px] text-slate-600">{`List (Tab) — ${listNameFor((isEditing && !readOnly ? form.list_index || 1 : task.list_index || 1) || 1)}`}</div>
                                            <select
                                                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-700"
                                                value={String(
                                                    isEditing && !readOnly
                                                        ? form.list_index || 1
                                                        : task.list_index || 1,
                                                )}
                                                onChange={(e) =>
                                                    setForm((s) => ({
                                                        ...s,
                                                        list_index: Number(e.target.value || 1),
                                                    }))
                                                }
                                                disabled={!isEditing || readOnly}
                                            >
                                                {(listNumbers && listNumbers.length
                                                    ? listNumbers
                                                    : Array.from({ length: 10 }, (_, i) => i + 1)
                                                ).map((n) => (
                                                    <option key={n} value={String(n)}>
                                                        {listNameFor(n)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {isEditing && !readOnly ? (
                            <div className="mt-1.5 flex items-center gap-2">
                                <button
                                    className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
                                    onClick={save}
                                >
                                    <FaSave /> Save changes
                                </button>
                                <button
                                    className="px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setForm(task);
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {/* Right column: Summary, Schedule, Meta */}
                    <div className="grid grid-rows-[1fr_1fr] gap-1.5 h-full text-sm">
                        {/* Summary */}
                        <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5 h-full flex flex-col">
                            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">Summary</div>
                            {/* Assignee */}
                            <div className="mb-1.5">
                                <div className="text-[11px] text-slate-600">Assignee</div>
                                <input
                                    className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-700"
                                    value={isEditing && !readOnly ? form.assignee || "" : task.assignee || ""}
                                    onChange={(e) => setForm((s) => ({ ...s, assignee: e.target.value }))}
                                    readOnly={!isEditing || readOnly}
                                    disabled={!isEditing || readOnly}
                                />
                            </div>
                            {/* Status & Priority */}
                            <div className="grid grid-cols-2 gap-1.5">
                                <div>
                                    <div className="text-[11px] text-slate-600">Status</div>
                                    <select
                                        className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-700"
                                        value={isEditing && !readOnly ? form.status || "open" : task.status || "open"}
                                        onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                                        disabled={!isEditing || readOnly}
                                    >
                                        <option value="open">Open</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="done">Done</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div>
                                    <div className="text-[11px] text-slate-600">Priority</div>
                                    <select
                                        className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-700"
                                        value={isEditing && !readOnly ? form.priority || "med" : task.priority || "med"}
                                        onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))}
                                        disabled={!isEditing || readOnly}
                                    >
                                        <option value="low">Low</option>
                                        <option value="med">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Schedule */}
                        <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5 h-full flex flex-col">
                            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">Schedule</div>
                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { key: "start_date", label: "Start" },
                                    { key: "end_date", label: "End date" },
                                    { key: "deadline", label: "Deadline" },
                                ].map((f) => (
                                    <div key={f.key}>
                                        <div className="text-[11px] text-slate-600">{f.label}</div>
                                        <input
                                            type="date"
                                            className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-700"
                                            value={
                                                isEditing && !readOnly
                                                    ? toDateOnly(form[f.key]) || ""
                                                    : toDateOnly(task[f.key]) || ""
                                            }
                                            onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                                            readOnly={!isEditing || readOnly}
                                            disabled={!isEditing || readOnly}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* (Meta moved to left column) */}
                    </div>

                    {/* Bottom Edit/Delete actions removed per request */}
                </div>
            )}
            {showDetailsPopup && (
                <TaskSlideOver
                    task={task}
                    goals={goals}
                    listNames={listNames}
                    kaId={selectedKA?.id}
                    listNumbers={availableListNumbers}
                    readOnly={readOnly}
                    initialTab="details"
                    hideActivitiesTab
                    onClose={() => setShowDetailsPopup(false)}
                    onSave={async (payload) => {
                        if (onSave) await onSave(payload);
                        setShowDetailsPopup(false);
                    }}
                    onDelete={async (tsk) => {
                        if (onDelete) await onDelete(tsk);
                        setShowDetailsPopup(false);
                    }}
                />
            )}
            {/* no popup modal for activities in TaskFullView; inline expansion used */}
        </div>
    );
}

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

    const [taskTab, setTaskTab] = useState(1);
    const [allTasks, setAllTasks] = useState([]);
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
    const [showActivityComposer, setShowActivityComposer] = useState(false);
    const [editingActivityId, setEditingActivityId] = useState(null);
    const [showTaskHelp, setShowTaskHelp] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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
    const [activityAttachTaskId, setActivityAttachTaskId] = useState(null);

    // Open global activity composer on request (from various UI spots)
    useEffect(() => {
        const handler = (e) => {
            const tid = e?.detail?.taskId ?? null;
            setActivityAttachTaskId(tid ? String(tid) : null);
            setShowActivityComposer(true);
        };
        window.addEventListener("ka-open-activity-composer", handler);
        return () => window.removeEventListener("ka-open-activity-composer", handler);
    }, []);

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

    // Open activity editor (reuse Add Activity modal) populated for editing
    useEffect(() => {
        const handler = (e) => {
            const activity = e?.detail?.activity;
            if (!activity) return;
            const tid = e?.detail?.taskId ?? null;
            setActivityAttachTaskId(tid ? String(tid) : null);
            const mapPriority = (v) => {
                const n = Number(v);
                if (!Number.isNaN(n)) return n === 3 ? "high" : n === 1 ? "low" : "normal";
                return String(v || "normal").toLowerCase();
            };
            setActivityForm({
                title: activity.text || activity.activity_name || "",
                description: activity.notes || "",
                list: activity.list || "",
                key_area_id: selectedKA?.id || "",
                assignee: activity.responsible || "",
                priority: mapPriority(activity.priority),
                goal: activity.goal || "",
                start_date: toDateOnly(activity.date_start) || "",
                end_date: toDateOnly(activity.date_end) || "",
                deadline: toDateOnly(activity.deadline) || "",
                finish_date: toDateOnly(activity.finish_date) || "",
                duration: activity.duration || "",
                _endAuto: false,
            });
            setEditingActivityId(activity.id);
            setShowActivityComposer(true);
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
            const list = await activityService.list({ taskId });
            setActivitiesByTask((prev) => ({ ...prev, [String(taskId)]: Array.isArray(list) ? list : [] }));
        } catch (e) {
            console.error("Failed to refresh activities", e);
            setActivitiesByTask((prev) => ({ ...prev, [String(taskId)]: [] }));
        }
    };
    // Helper: refresh all tasks currently in state
    const refreshAllActivities = async () => {
        if (!Array.isArray(allTasks) || allTasks.length === 0) return;
        try {
            const entries = await Promise.all(
                allTasks.map(async (t) => {
                    try {
                        const list = await activityService.list({ taskId: t.id });
                        return [String(t.id), Array.isArray(list) ? list : []];
                    } catch {
                        return [String(t.id), []];
                    }
                }),
            );
            const grouped = Object.fromEntries(entries);
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

            // Map activity fields into a new task
            const payload = {
                key_area_id: kaId,
                title: (activity.activity_name || "").trim() || "Untitled activity",
                description: (activity.notes || "").trim() || `Created from activity in task "${parent.title || ""}"`,
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

                // Ask whether to convert (remove the activity) or just copy
                const shouldRemove = window.confirm(
                    "Task created. Do you want to remove the original activity (convert)?",
                );
                if (shouldRemove) {
                    setActivitiesByTask((prev) => {
                        const arr = (prev[key] || []).filter((a) => String(a.id) !== String(activity.id));
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
            if (e.key === "Escape") setShowTaskComposer(false);
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
        };
        if (!payload.title) return;

        if (editing) {
            // Only update fields changed in the form (no color)
            const updated = await api.updateKeyArea(editing.id, {
                title: payload.title,
                description: payload.description,
            });
            setKeyAreas((prev) => prev.map((k) => (k.id === editing.id ? { ...k, ...updated } : k)));
            // emit updated list for sidebar (alphabetical with Ideas last)
            try {
                const updatedList = (keyAreas || []).map((k) => (k.id === editing.id ? { ...k, ...updated } : k));
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
        // Persist changes (only those that changed position)
        const changed = withPos.filter((k, i) => ordered[i]?.id !== k.id || ordered[i]?.position !== k.position);
        try {
            await Promise.all(changed.map((k) => api.updateKeyArea(k.id, { ...k, position: k.position })));
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
            // swap positions and persist both
            await Promise.all([
                api.updateKeyArea(a.id, { ...a, position: b.position }),
                api.updateKeyArea(b.id, { ...b, position: a.position }),
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
        setAllTasks(t);
        // refresh activities for these tasks
        try {
            const entries = await Promise.all(
                (t || []).map(async (row) => {
                    try {
                        const list = await activityService.list({ taskId: row.id });
                        return [String(row.id), Array.isArray(list) ? list : []];
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
        if (selectedKA.is_default || (selectedKA.title || "").toLowerCase() === "ideas") {
            alert("Cannot rename lists for the Ideas key area.");
            return;
        }
        const current = getListName(selectedKA.id, n);
        const val = prompt("Rename list", current);
        if (val === null) return; // cancelled
        const newMap = { ...(listNames[String(selectedKA.id)] || {}), [String(n)]: val };
        setListNames((prev) => ({ ...prev, [String(selectedKA.id)]: newMap }));
        try {
            await keyAreaService.update(selectedKA.id, { listNames: newMap });
        } catch (e) {
            console.error("Failed to persist list names", e);
            alert("Failed to save list name. Please try again.");
        }
    };

    const deleteList = async (n) => {
        if (!selectedKA) return;
        if (selectedKA.is_default || (selectedKA.title || "").toLowerCase() === "ideas") {
            alert("Cannot edit lists for the Ideas key area.");
            return;
        }
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
            await keyAreaService.update(kaId, { listNames: newMap });
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
        if (!selectedKA && !editingTaskId) return;
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
    };

    // Create Activity using the same UI fields; persist only supported backend fields
    const onCreateActivity = async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const title = (f.get("title") || "").toString().trim();
        if (!title) return;

        try {
            if (editingActivityId) {
                await activityService.update(editingActivityId, { text: title });
                const tid = activityAttachTaskId;
                if (tid) {
                    try {
                        const list = await activityService.list({ taskId: tid });
                        setActivitiesByTask((prev) => ({ ...prev, [String(tid)]: Array.isArray(list) ? list : [] }));
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
                const created = await activityService.create(payload);
                // Update local state immediately for the specific task (if attached)
                if (activityAttachTaskId) {
                    try {
                        const list = await activityService.list({ taskId: activityAttachTaskId });
                        setActivitiesByTask((prev) => ({
                            ...prev,
                            [String(activityAttachTaskId)]: Array.isArray(list) ? list : [],
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
        const saved = await api.updateTask(payload.id, payload);
        // Update UI immediately with server payload (already normalized by api.updateTask)
        setAllTasks((prev) => prev.map((t) => (t.id === saved.id ? { ...t, ...saved } : t)));
        await refreshActivitiesForTask(saved.id);
        setSelectedTask(null);
    };

    const handleDeleteTask = async (task) => {
        // Prevent deleting a task that still has activities
        try {
            let list = activitiesByTask[String(task.id)];
            if (!Array.isArray(list)) {
                // fetch latest to be sure
                list = await activityService.list({ taskId: task.id });
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
                                            <span className="relative text-base md:text-lg font-bold text-slate-900 truncate px-1">
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
                        {selectedTaskFull && selectedKA && (
                            <div className="mb-4">
                                <TaskFullView
                                    task={selectedTaskFull}
                                    goals={goals}
                                    kaTitle={selectedKA?.title}
                                    listNames={listNames}
                                    kaId={selectedKA?.id}
                                    listNumbers={availableListNumbers}
                                    readOnly={
                                        Boolean(selectedKA?.is_default) &&
                                        (selectedKA?.title || "").toLowerCase() !== "ideas"
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
                                        {/* Top Row: Task Lists + Mass Edit */}
                                        <div className="grid grid-cols-3 gap-4">
                                            {/* Left: Task Lists (2/3 width) */}
                                            <div className="col-span-3 md:col-span-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="text-sm font-semibold whitespace-nowrap mr-1">
                                                        Task Lists
                                                    </div>
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
                                                                                        setTaskForm((s) => ({
                                                                                            ...s,
                                                                                            list_index: n,
                                                                                        }));
                                                                                        setShowTaskComposer(true);
                                                                                        setOpenListMenu(null);
                                                                                    }}
                                                                                    className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                                                                >
                                                                                    Add Task
                                                                                </button>
                                                                                <button
                                                                                    role="menuitem"
                                                                                    onClick={() => {
                                                                                        setActivityForm((s) => ({
                                                                                            ...s,
                                                                                            key_area_id:
                                                                                                selectedKA?.id ||
                                                                                                s.key_area_id,
                                                                                        }));
                                                                                        setActivityAttachTaskId(null);
                                                                                        setShowActivityComposer(true);
                                                                                        setOpenListMenu(null);
                                                                                    }}
                                                                                    className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                                                                >
                                                                                    Add Activity
                                                                                </button>
                                                                                <button
                                                                                    role="menuitem"
                                                                                    onClick={() => {
                                                                                        renameList(n);
                                                                                        setOpenListMenu(null);
                                                                                    }}
                                                                                    className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                                                                >
                                                                                    Rename
                                                                                </button>
                                                                                <button
                                                                                    role="menuitem"
                                                                                    onClick={() => {
                                                                                        deleteList(n);
                                                                                        setOpenListMenu(null);
                                                                                    }}
                                                                                    className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                                                                >
                                                                                    Delete
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
                                                                            await keyAreaService.update(kaId, {
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
                                                                    className="px-2 py-1 rounded-lg border bg-white text-slate-800 hover:bg-slate-50"
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
                                                                        <path d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path>
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Mass Edit (1/3 width) as a button */}
                                            <div className="col-span-3 md:col-span-1 flex items-center justify-end gap-3">
                                                <span className="text-sm text-gray-600" aria-live="polite">
                                                    {selectedIds.size} selected
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={selectedIds.size === 0}
                                                    onClick={() => {
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
                                                    }}
                                                    className="px-4 py-2 rounded-md text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                                    aria-label="Open mass edit"
                                                    title={
                                                        selectedIds.size === 0
                                                            ? "Select tasks to enable mass edit"
                                                            : `Mass edit (${selectedIds.size})`
                                                    }
                                                >
                                                    Mass Edit
                                                </button>
                                            </div>
                                        </div>

                                        {/* Bottom Row: Tasks Display (full width) */}
                                        <div ref={tasksDisplayRef}>
                                            {showMassEdit && selectedIds.size > 0 && (
                                                <form
                                                    onSubmit={applyBulkEdit}
                                                    aria-label="Mass edit selected tasks"
                                                    className="mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg"
                                                >
                                                    <div className="text-sm text-blue-900 font-medium mb-3">
                                                        Mass edit {selectedIds.size} task
                                                        {selectedIds.size > 1 ? "s" : ""}
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
                                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
                                                        hint="Use the three-dots menu to add a task."
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
                                                                    <th className="px-3 py-2 text-left font-semibold">
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
                                                                        Deadline
                                                                    </th>
                                                                    <th className="px-3 py-2 text-left font-semibold">
                                                                        End date
                                                                    </th>
                                                                    <th className="px-3 py-2 text-left font-semibold">
                                                                        Duration
                                                                    </th>
                                                                    <th
                                                                        className="px-3 py-2 text-center font-semibold w-16"
                                                                        title="Activities"
                                                                    >
                                                                        <span className="inline-flex items-center justify-center w-full text-slate-700">
                                                                            <svg
                                                                                xmlns="http://www.w3.org/2000/svg"
                                                                                width="16"
                                                                                height="16"
                                                                                viewBox="0 0 24 24"
                                                                                fill="none"
                                                                                stroke="currentColor"
                                                                                strokeWidth="2"
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                            >
                                                                                <line x1="3" y1="6" x2="21" y2="6" />
                                                                                <line x1="3" y1="12" x2="21" y2="12" />
                                                                                <line x1="3" y1="18" x2="21" y2="18" />
                                                                            </svg>
                                                                        </span>
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
                                                                            <tr
                                                                                className="border-t border-slate-200 hover:bg-slate-50"
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
                                                                                            setExpandedActivityRows(
                                                                                                new Set(),
                                                                                            );
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <td className="px-3 py-2 align-top">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        aria-label={`Select ${t.title}`}
                                                                                        checked={isSelected(t.id)}
                                                                                        onChange={() =>
                                                                                            toggleSelect(t.id)
                                                                                        }
                                                                                    />
                                                                                </td>
                                                                                <td
                                                                                    className="px-3 py-2 align-top cursor-pointer"
                                                                                    onClick={() => {
                                                                                        setSelectedTaskFull(t);
                                                                                        setTaskFullInitialTab(
                                                                                            "activities",
                                                                                        );
                                                                                    }}
                                                                                    title="Open task"
                                                                                >
                                                                                    <div className="flex items-start gap-2">
                                                                                        {(() => {
                                                                                            const lvl =
                                                                                                getPriorityLevel(
                                                                                                    t.priority,
                                                                                                );
                                                                                            if (lvl === 2) return null; // hide for medium
                                                                                            const cls =
                                                                                                lvl === 3
                                                                                                    ? "text-red-600"
                                                                                                    : "text-emerald-600";
                                                                                            const label =
                                                                                                lvl === 3
                                                                                                    ? "High"
                                                                                                    : "Low";
                                                                                            return (
                                                                                                <span
                                                                                                    className={`mt-0.5 inline-block text-sm font-bold ${cls}`}
                                                                                                    title={`Priority: ${label}`}
                                                                                                >
                                                                                                    !
                                                                                                </span>
                                                                                            );
                                                                                        })()}
                                                                                        <button
                                                                                            type="button"
                                                                                            className="text-blue-700 hover:underline font-semibold"
                                                                                            title="Click to open task"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setSelectedTaskFull(t);
                                                                                                setTaskFullInitialTab(
                                                                                                    "activities",
                                                                                                );
                                                                                            }}
                                                                                        >
                                                                                            {t.title}
                                                                                        </button>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-3 py-2 align-top text-slate-800">
                                                                                    {t.assignee || "—"}
                                                                                </td>
                                                                                <td className="px-3 py-2 align-top">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <StatusIndicator
                                                                                            status={t.status || "open"}
                                                                                        />
                                                                                        <span className="capitalize text-slate-800">
                                                                                            {String(
                                                                                                t.status || "open",
                                                                                            ).replace("_", " ")}
                                                                                        </span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-3 py-2 align-top">
                                                                                    <PriorityBadge
                                                                                        priority={t.priority || "med"}
                                                                                    />
                                                                                </td>
                                                                                <td className="px-3 py-2 align-top">
                                                                                    <QuadrantBadge q={q} />
                                                                                </td>
                                                                                <td className="px-3 py-2 align-top text-slate-800">
                                                                                    {t.goal_id ? (
                                                                                        `#${t.goal_id}`
                                                                                    ) : (
                                                                                        <span className="text-slate-500">
                                                                                            Trap
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-3 py-2 align-top max-w-[240px]">
                                                                                    <span className="block truncate text-slate-800">
                                                                                        {(t.tags || "")
                                                                                            .split(",")
                                                                                            .filter(Boolean)
                                                                                            .slice(0, 4)
                                                                                            .join(", ") || "—"}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-3 py-2 align-top text-slate-800">
                                                                                    {toDateOnly(t.start_date) || "—"}
                                                                                </td>
                                                                                <td className="px-3 py-2 align-top text-slate-800">
                                                                                    {toDateOnly(t.deadline) || "—"}
                                                                                </td>
                                                                                <td className="px-3 py-2 align-top text-slate-800">
                                                                                    {toDateOnly(t.end_date) || "—"}
                                                                                </td>
                                                                                <td className="px-3 py-2 align-top text-slate-800">
                                                                                    {formatDuration(
                                                                                        t.start_date || t.deadline,
                                                                                        t.end_date,
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-3 py-2 align-top text-center w-16">
                                                                                    <button
                                                                                        type="button"
                                                                                        title="Show activities inline"
                                                                                        onClick={() =>
                                                                                            toggleActivitiesRow(t.id)
                                                                                        }
                                                                                        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-semibold min-w-[1.5rem] border ${
                                                                                            expandedActivityRows.has(
                                                                                                t.id,
                                                                                            )
                                                                                                ? "bg-blue-100 text-blue-700 border-blue-200"
                                                                                                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                                                                                        }`}
                                                                                    >
                                                                                        {(() => {
                                                                                            const c = (
                                                                                                activitiesByTask[
                                                                                                    String(t.id)
                                                                                                ] || []
                                                                                            ).length;
                                                                                            return c || 0;
                                                                                        })()}
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                            {expandedActivityRows.has(t.id) && (
                                                                                <tr className="bg-slate-50">
                                                                                    <td className="px-3 py-2" />
                                                                                    <td
                                                                                        colSpan={12}
                                                                                        className="px-0 py-2"
                                                                                    >
                                                                                        <div className="ml-6 pl-6 border-l-2 border-slate-200">
                                                                                            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
                                                                                                Activities
                                                                                            </div>
                                                                                            {(() => {
                                                                                                const taskKey = String(
                                                                                                    t.id,
                                                                                                );
                                                                                                const list = (
                                                                                                    activitiesByTask[
                                                                                                        taskKey
                                                                                                    ] || []
                                                                                                ).slice();
                                                                                                const setList = (
                                                                                                    updater,
                                                                                                ) => {
                                                                                                    const nextList =
                                                                                                        typeof updater ===
                                                                                                        "function"
                                                                                                            ? updater(
                                                                                                                  list,
                                                                                                              )
                                                                                                            : updater;
                                                                                                    setActivitiesByTask(
                                                                                                        (prev) => ({
                                                                                                            ...prev,
                                                                                                            [taskKey]:
                                                                                                                nextList,
                                                                                                        }),
                                                                                                    );
                                                                                                };

                                                                                                const toggleComplete = (
                                                                                                    id,
                                                                                                ) => {
                                                                                                    setList(
                                                                                                        list.map((a) =>
                                                                                                            a.id === id
                                                                                                                ? {
                                                                                                                      ...a,
                                                                                                                      completed:
                                                                                                                          a.completed
                                                                                                                              ? 0
                                                                                                                              : 1,
                                                                                                                  }
                                                                                                                : a,
                                                                                                        ),
                                                                                                    );
                                                                                                };
                                                                                                const remove = async (
                                                                                                    id,
                                                                                                ) => {
                                                                                                    try {
                                                                                                        await activityService.remove(
                                                                                                            id,
                                                                                                        );
                                                                                                        setList(
                                                                                                            list.filter(
                                                                                                                (a) =>
                                                                                                                    a.id !==
                                                                                                                    id,
                                                                                                            ),
                                                                                                        );
                                                                                                        window.dispatchEvent(
                                                                                                            new CustomEvent(
                                                                                                                "ka-activities-updated",
                                                                                                                {
                                                                                                                    detail: {
                                                                                                                        refresh: true,
                                                                                                                    },
                                                                                                                },
                                                                                                            ),
                                                                                                        );
                                                                                                    } catch (e) {
                                                                                                        console.error(
                                                                                                            "Failed to delete activity",
                                                                                                            e,
                                                                                                        );
                                                                                                    }
                                                                                                };
                                                                                                const move = (
                                                                                                    id,
                                                                                                    dir,
                                                                                                ) => {
                                                                                                    const idx =
                                                                                                        list.findIndex(
                                                                                                            (a) =>
                                                                                                                a.id ===
                                                                                                                id,
                                                                                                        );
                                                                                                    if (idx < 0) return;
                                                                                                    const swapIdx =
                                                                                                        dir === "up"
                                                                                                            ? idx - 1
                                                                                                            : idx + 1;
                                                                                                    if (
                                                                                                        swapIdx < 0 ||
                                                                                                        swapIdx >=
                                                                                                            list.length
                                                                                                    )
                                                                                                        return;
                                                                                                    const copy =
                                                                                                        list.slice();
                                                                                                    const tmp =
                                                                                                        copy[idx];
                                                                                                    copy[idx] =
                                                                                                        copy[swapIdx];
                                                                                                    copy[swapIdx] = tmp;
                                                                                                    setList(copy);
                                                                                                };
                                                                                                const updateField = (
                                                                                                    id,
                                                                                                    field,
                                                                                                    value,
                                                                                                ) => {
                                                                                                    setList(
                                                                                                        list.map((a) =>
                                                                                                            a.id === id
                                                                                                                ? {
                                                                                                                      ...a,
                                                                                                                      [field]:
                                                                                                                          value,
                                                                                                                  }
                                                                                                                : a,
                                                                                                        ),
                                                                                                    );
                                                                                                };

                                                                                                const toggleDetails = (
                                                                                                    id,
                                                                                                ) => {
                                                                                                    setOpenActivityDetails(
                                                                                                        (prev) => {
                                                                                                            const next =
                                                                                                                new Set(
                                                                                                                    prev,
                                                                                                                );
                                                                                                            if (
                                                                                                                next.has(
                                                                                                                    id,
                                                                                                                )
                                                                                                            )
                                                                                                                next.delete(
                                                                                                                    id,
                                                                                                                );
                                                                                                            else
                                                                                                                next.add(
                                                                                                                    id,
                                                                                                                );
                                                                                                            return next;
                                                                                                        },
                                                                                                    );
                                                                                                };

                                                                                                const addNew = async (
                                                                                                    name,
                                                                                                ) => {
                                                                                                    const text = (
                                                                                                        name || ""
                                                                                                    ).trim();
                                                                                                    if (!text) return;
                                                                                                    try {
                                                                                                        const created =
                                                                                                            await activityService.create(
                                                                                                                {
                                                                                                                    text,
                                                                                                                    taskId: t.id,
                                                                                                                },
                                                                                                            );
                                                                                                        setList([
                                                                                                            ...(list ||
                                                                                                                []),
                                                                                                            created,
                                                                                                        ]);
                                                                                                        window.dispatchEvent(
                                                                                                            new CustomEvent(
                                                                                                                "ka-activities-updated",
                                                                                                                {
                                                                                                                    detail: {
                                                                                                                        refresh: true,
                                                                                                                    },
                                                                                                                },
                                                                                                            ),
                                                                                                        );
                                                                                                    } catch (e) {
                                                                                                        console.error(
                                                                                                            "Failed to add activity",
                                                                                                            e,
                                                                                                        );
                                                                                                    }
                                                                                                };

                                                                                                return (
                                                                                                    <div className="space-y-2">
                                                                                                        {/* Activities rows */}
                                                                                                        {list.length ===
                                                                                                        0 ? (
                                                                                                            <EmptyState
                                                                                                                title="No activities for this task yet."
                                                                                                                hint="Add a new activity below."
                                                                                                            />
                                                                                                        ) : (
                                                                                                            <div>
                                                                                                                {list.map(
                                                                                                                    (
                                                                                                                        a,
                                                                                                                        index,
                                                                                                                    ) => (
                                                                                                                        <div
                                                                                                                            key={
                                                                                                                                a.id
                                                                                                                            }
                                                                                                                            className="bg-white rounded border border-slate-200 p-2 mb-2"
                                                                                                                        >
                                                                                                                            {/* Basic row */}
                                                                                                                            <div className="flex items-center">
                                                                                                                                <button
                                                                                                                                    type="button"
                                                                                                                                    className="mr-2 text-blue-700"
                                                                                                                                    title={
                                                                                                                                        a.completed
                                                                                                                                            ? "Unmark"
                                                                                                                                            : "Mark completed"
                                                                                                                                    }
                                                                                                                                    onClick={() =>
                                                                                                                                        toggleComplete(
                                                                                                                                            a.id,
                                                                                                                                        )
                                                                                                                                    }
                                                                                                                                >
                                                                                                                                    {a.completed ? (
                                                                                                                                        <FaCheckCircle />
                                                                                                                                    ) : (
                                                                                                                                        <FaRegCircle />
                                                                                                                                    )}
                                                                                                                                </button>
                                                                                                                                <span
                                                                                                                                    className="inline-flex items-center justify-center w-9 h-8 border rounded mr-2 text-[#4DC3D8]"
                                                                                                                                    title="Drag handle"
                                                                                                                                >
                                                                                                                                    <FaAlignJustify />
                                                                                                                                </span>
                                                                                                                                <div className="relative flex-1">
                                                                                                                                    <div
                                                                                                                                        className={`w-full border rounded px-2 py-1 pr-16 bg-white ${
                                                                                                                                            a.completed
                                                                                                                                                ? "line-through text-slate-500"
                                                                                                                                                : "text-slate-800"
                                                                                                                                        }`}
                                                                                                                                    >
                                                                                                                                        {(
                                                                                                                                            a.text ||
                                                                                                                                            a.activity_name ||
                                                                                                                                            ""
                                                                                                                                        ).trim() ||
                                                                                                                                            "Untitled activity"}
                                                                                                                                    </div>
                                                                                                                                    <button
                                                                                                                                        type="button"
                                                                                                                                        className="absolute right-14 top-1.5 text-[#4DC3D8]"
                                                                                                                                        title="Tag"
                                                                                                                                    >
                                                                                                                                        <FaTag />
                                                                                                                                    </button>
                                                                                                                                </div>
                                                                                                                                <div className="ml-2 flex items-center gap-2 text-slate-600">
                                                                                                                                    {/* Priority indicator (single icon like task); hide for medium */}
                                                                                                                                    {(() => {
                                                                                                                                        const eff =
                                                                                                                                            a.priority ??
                                                                                                                                            t.priority ??
                                                                                                                                            2;
                                                                                                                                        const lvl =
                                                                                                                                            getPriorityLevel(
                                                                                                                                                eff,
                                                                                                                                            );
                                                                                                                                        if (
                                                                                                                                            lvl ===
                                                                                                                                            2
                                                                                                                                        )
                                                                                                                                            return null; // hide on medium/normal
                                                                                                                                        const cls =
                                                                                                                                            lvl ===
                                                                                                                                            3
                                                                                                                                                ? "text-red-600"
                                                                                                                                                : "text-emerald-600";
                                                                                                                                        const label =
                                                                                                                                            lvl ===
                                                                                                                                            3
                                                                                                                                                ? "high"
                                                                                                                                                : "low";
                                                                                                                                        return (
                                                                                                                                            <span
                                                                                                                                                className={`inline-block text-sm font-bold ${cls}`}
                                                                                                                                                title={`Priority: ${label}`}
                                                                                                                                            >
                                                                                                                                                !
                                                                                                                                            </span>
                                                                                                                                        );
                                                                                                                                    })()}
                                                                                                                                    <button
                                                                                                                                        type="button"
                                                                                                                                        className="text-red-600"
                                                                                                                                        title="Delete activity"
                                                                                                                                        onClick={() =>
                                                                                                                                            remove(
                                                                                                                                                a.id,
                                                                                                                                            )
                                                                                                                                        }
                                                                                                                                    >
                                                                                                                                        <FaTrash />
                                                                                                                                    </button>
                                                                                                                                    {/* Edit activity (opens the global editor modal) */}
                                                                                                                                    <button
                                                                                                                                        type="button"
                                                                                                                                        className="text-slate-700"
                                                                                                                                        title="Edit activity"
                                                                                                                                        onClick={() => {
                                                                                                                                            try {
                                                                                                                                                window.dispatchEvent(
                                                                                                                                                    new CustomEvent(
                                                                                                                                                        "ka-open-activity-editor",
                                                                                                                                                        {
                                                                                                                                                            detail: {
                                                                                                                                                                activity:
                                                                                                                                                                    a,
                                                                                                                                                                taskId: t.id,
                                                                                                                                                            },
                                                                                                                                                        },
                                                                                                                                                    ),
                                                                                                                                                );
                                                                                                                                            } catch {}
                                                                                                                                        }}
                                                                                                                                    >
                                                                                                                                        <FaEdit />
                                                                                                                                    </button>
                                                                                                                                    <button
                                                                                                                                        type="button"
                                                                                                                                        className={
                                                                                                                                            a.created_task_id
                                                                                                                                                ? "text-slate-300 cursor-not-allowed"
                                                                                                                                                : "text-slate-700"
                                                                                                                                        }
                                                                                                                                        title={
                                                                                                                                            a.created_task_id
                                                                                                                                                ? "Already created a task from this activity"
                                                                                                                                                : "Create as task"
                                                                                                                                        }
                                                                                                                                        disabled={
                                                                                                                                            !!a.created_task_id
                                                                                                                                        }
                                                                                                                                        onClick={() => {
                                                                                                                                            if (
                                                                                                                                                a.created_task_id
                                                                                                                                            )
                                                                                                                                                return;
                                                                                                                                            try {
                                                                                                                                                window.dispatchEvent(
                                                                                                                                                    new CustomEvent(
                                                                                                                                                        "ka-create-task-from-activity",
                                                                                                                                                        {
                                                                                                                                                            detail: {
                                                                                                                                                                taskId: t.id,
                                                                                                                                                                activity:
                                                                                                                                                                    a,
                                                                                                                                                            },
                                                                                                                                                        },
                                                                                                                                                    ),
                                                                                                                                                );
                                                                                                                                            } catch {}
                                                                                                                                        }}
                                                                                                                                    >
                                                                                                                                        <FaAngleDoubleLeft />
                                                                                                                                    </button>
                                                                                                                                    <div className="flex flex-col ml-1">
                                                                                                                                        <button
                                                                                                                                            type="button"
                                                                                                                                            className="text-slate-500 disabled:opacity-40"
                                                                                                                                            title="Move up"
                                                                                                                                            onClick={() =>
                                                                                                                                                move(
                                                                                                                                                    a.id,
                                                                                                                                                    "up",
                                                                                                                                                )
                                                                                                                                            }
                                                                                                                                            disabled={
                                                                                                                                                index ===
                                                                                                                                                0
                                                                                                                                            }
                                                                                                                                        >
                                                                                                                                            <FaChevronUp />
                                                                                                                                        </button>
                                                                                                                                        <button
                                                                                                                                            type="button"
                                                                                                                                            className="text-slate-500 disabled:opacity-40"
                                                                                                                                            title="Move down"
                                                                                                                                            onClick={() =>
                                                                                                                                                move(
                                                                                                                                                    a.id,
                                                                                                                                                    "down",
                                                                                                                                                )
                                                                                                                                            }
                                                                                                                                            disabled={
                                                                                                                                                index ===
                                                                                                                                                list.length -
                                                                                                                                                    1
                                                                                                                                            }
                                                                                                                                        >
                                                                                                                                            <FaChevronDown />
                                                                                                                                        </button>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            {/* Message row */}
                                                                                                                            <div
                                                                                                                                className="mt-1 text-xs text-amber-700"
                                                                                                                                id={`activity-message-${a.id}`}
                                                                                                                            ></div>
                                                                                                                        </div>
                                                                                                                    ),
                                                                                                                )}
                                                                                                            </div>
                                                                                                        )}
                                                                                                        {/* Inline add activity removed */}
                                                                                                    </div>
                                                                                                );
                                                                                            })()}
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
                                                />
                                            )}
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
                        {/* LIST: Key Areas */}
                        {!selectedKA && (
                            <div>
                                {loading ? (
                                    <div className="text-slate-700">Loading…</div>
                                ) : showOnlyIdeas ? (
                                    // render Ideas as a single centered full-width card
                                    <div className="flex justify-center">
                                        <div
                                            key={ideaForShow.id}
                                            className="w-full max-w-3xl bg-white rounded-2xl shadow border border-slate-200 p-6 flex flex-col"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-xl font-bold text-slate-900">
                                                            {ideaForShow.title}
                                                        </h3>
                                                        {ideaForShow.is_default && (
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                                <FaLock /> Locked
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-600 mt-2">
                                                        {ideaForShow.description || "—"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-6 flex items-center gap-2">
                                                <button
                                                    className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-2 py-1 text-sm border border-slate-200"
                                                    onClick={() => openKA(ideaForShow)}
                                                >
                                                    <FaListUl /> Open Lists
                                                </button>
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs border border-slate-200">
                                                    Position: 10
                                                </span>
                                                <p className="text-sm text-slate-700 ml-2">
                                                    This Key Area is read-only (cannot edit or delete).
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white border border-slate-200 rounded-xl">
                                        <ol className="divide-y divide-slate-200">
                                            {filteredKAs
                                                .slice()
                                                .sort((a, b) => {
                                                    // Ideas/default areas always go to the end
                                                    const aIsIdeas = (a.title || "").toLowerCase() === "ideas" || a.is_default;
                                                    const bIsIdeas = (b.title || "").toLowerCase() === "ideas" || b.is_default;
                                                    if (aIsIdeas && !bIsIdeas) return 1;
                                                    if (!aIsIdeas && bIsIdeas) return -1;
                                                    // For non-Ideas areas, sort by position
                                                    return (a.position || 0) - (b.position || 0);
                                                })
                                                .map((ka, idx) => (
                                                    <li
                                                        key={ka.id}
                                                        className="flex items-center justify-between px-3 py-2"
                                                        draggable={!ka.is_default}
                                                        onDragStart={(e) => {
                                                            if (ka.is_default) return;
                                                            setDragKAId(String(ka.id));
                                                            e.dataTransfer.effectAllowed = "move";
                                                        }}
                                                        onDragOver={(e) => {
                                                            if (ka.is_default) return;
                                                            e.preventDefault();
                                                            e.dataTransfer.dropEffect = "move";
                                                        }}
                                                        onDrop={async (e) => {
                                                            e.preventDefault();
                                                            if (!dragKAId || String(dragKAId) === String(ka.id)) return;
                                                            await reorderByDrop(String(dragKAId), String(ka.id));
                                                            setDragKAId(null);
                                                        }}
                                                        onDragEnd={() => setDragKAId(null)}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold shrink-0">
                                                                {ka.position && ka.position > 0 ? ka.position : idx + 1}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className="font-semibold text-slate-900 truncate">
                                                                        {ka.title}
                                                                    </span>
                                                                    {ka.is_default && (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                                            <FaLock /> Locked
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {ka.description ? (
                                                                    <div className="text-xs text-slate-600 truncate">
                                                                        {ka.description}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 px-2 py-1 text-xs"
                                                                onClick={() => openKA(ka)}
                                                            >
                                                                <FaListUl /> Open Lists
                                                            </button>
                                                            {!ka.is_default && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        title="Move up"
                                                                        className="rounded-md bg-white font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 px-2 py-1 text-xs border border-slate-200"
                                                                        onClick={() => reorderKA(ka, "up")}
                                                                    >
                                                                        <FaChevronUp />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        title="Move down"
                                                                        className="rounded-md bg-white font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 px-2 py-1 text-xs border border-slate-200"
                                                                        onClick={() => reorderKA(ka, "down")}
                                                                    >
                                                                        <FaChevronDown />
                                                                    </button>
                                                                </>
                                                            )}
                                                            <button
                                                                className="rounded-md bg-white font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 px-2 py-1 text-xs border border-slate-200"
                                                                onClick={() => {
                                                                    setEditing(ka);
                                                                    setShowForm(true);
                                                                }}
                                                            >
                                                                <FaEdit /> Edit
                                                            </button>
                                                            <button
                                                                disabled={ka.is_default}
                                                                title={
                                                                    ka.is_default
                                                                        ? undefined
                                                                        : typeof ka.taskCount === "number" &&
                                                                            ka.taskCount > 0
                                                                          ? `${ka.taskCount} task(s) present`
                                                                          : undefined
                                                                }
                                                                className={`rounded-md font-semibold flex items-center gap-1.5 px-2 py-1 text-xs border ${
                                                                    ka.is_default
                                                                        ? "bg-gray-200 text-gray-500 cursor-not-allowed border-slate-200"
                                                                        : "bg-white text-red-600 hover:bg-red-50 border-red-200"
                                                                }`}
                                                                onClick={() => onDeleteKA(ka)}
                                                            >
                                                                <FaTrash /> Delete
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                        </ol>
                                    </div>
                                )}

                                {/* Info message removed per request */}
                            </div>
                        )}
                        {/* DETAIL: Tabs */}
                        {selectedKA && (
                            <div className="mt-4 space-y-4">
                                {/* Composer — rendered from left card; show form only when requested */}
                                {showTaskComposer && (
                                    <div
                                        className="fixed inset-0 bg-black/40 z-50 grid place-items-center"
                                        onClick={() => setShowTaskComposer(false)}
                                    >
                                        <div
                                            ref={composerModalRef}
                                            className="relative bg-white border border-slate-300 rounded-xl shadow-2xl w-[95vw] max-w-4xl overflow-hidden"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {/* Header strip */}
                                            <div className="bg-white text-slate-900 border-b border-slate-200 py-3 px-4 text-center font-semibold">
                                                {editingTaskId ? "Edit Task" : "Add Task"}
                                            </div>
                                            <form onSubmit={onCreateTask} className="p-4 md:p-6">
                                                {/* Task name field under header */}
                                                <div className="mb-4">
                                                    <label className="sr-only" htmlFor="ka-task-title">
                                                        Task name
                                                    </label>
                                                    <input
                                                        id="ka-task-title"
                                                        name="title"
                                                        required
                                                        value={taskForm.title}
                                                        onChange={(e) =>
                                                            setTaskForm((s) => ({ ...s, title: e.target.value }))
                                                        }
                                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="Task name"
                                                    />
                                                </div>
                                                {/* Two-column layout */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                                    {/* Left column */}
                                                    <div className="grid gap-3 content-start">
                                                        {/* Description */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Description
                                                            </label>
                                                            <input
                                                                name="description"
                                                                value={taskForm.description}
                                                                onChange={(e) =>
                                                                    setTaskForm((s) => ({
                                                                        ...s,
                                                                        description: e.target.value,
                                                                    }))
                                                                }
                                                                className="mt-1 h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                placeholder="Brief description"
                                                            />
                                                        </div>
                                                        {/* Start date */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Start date
                                                            </label>
                                                            <div className="relative mt-1">
                                                                <input
                                                                    type="date"
                                                                    name="start_date"
                                                                    value={toDateOnly(taskForm.start_date)}
                                                                    onChange={(e) =>
                                                                        setTaskForm((s) => ({
                                                                            ...s,
                                                                            start_date: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                                                    ref={(el) => (taskForm._startRef = el)}
                                                                />
                                                                <span
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    aria-label="Open date picker"
                                                                    onClick={() => {
                                                                        try {
                                                                            taskForm._startRef?.focus();
                                                                            taskForm._startRef?.showPicker?.();
                                                                        } catch {}
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" || e.key === " ") {
                                                                            try {
                                                                                taskForm._startRef?.focus();
                                                                                taskForm._startRef?.showPicker?.();
                                                                            } catch {}
                                                                        }
                                                                    }}
                                                                    className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                                                >
                                                                    📅
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {/* End date */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                End date
                                                            </label>
                                                            <div className="relative mt-1">
                                                                <input
                                                                    type="date"
                                                                    name="end_date"
                                                                    value={toDateOnly(taskForm.end_date)}
                                                                    onChange={(e) =>
                                                                        setTaskForm((s) => ({
                                                                            ...s,
                                                                            end_date: e.target.value,
                                                                            _endAuto: false,
                                                                        }))
                                                                    }
                                                                    className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                                                    ref={(el) => (taskForm._endRef = el)}
                                                                />
                                                                <span
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    aria-label="Open date picker"
                                                                    onClick={() => {
                                                                        try {
                                                                            taskForm._endRef?.focus();
                                                                            taskForm._endRef?.showPicker?.();
                                                                        } catch {}
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" || e.key === " ") {
                                                                            try {
                                                                                taskForm._endRef?.focus();
                                                                                taskForm._endRef?.showPicker?.();
                                                                            } catch {}
                                                                        }
                                                                    }}
                                                                    className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                                                >
                                                                    📅
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {/* Deadline */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Deadline
                                                            </label>
                                                            <div className="relative mt-1">
                                                                <input
                                                                    type="date"
                                                                    name="deadline"
                                                                    value={toDateOnly(taskForm.deadline)}
                                                                    onChange={(e) =>
                                                                        setTaskForm((s) => ({
                                                                            ...s,
                                                                            deadline: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                                                    ref={(el) => (taskForm._dueRef = el)}
                                                                />
                                                                <span
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    aria-label="Open date picker"
                                                                    onClick={() => {
                                                                        try {
                                                                            taskForm._dueRef?.focus();
                                                                            taskForm._dueRef?.showPicker?.();
                                                                        } catch {}
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" || e.key === " ") {
                                                                            try {
                                                                                taskForm._dueRef?.focus();
                                                                                taskForm._dueRef?.showPicker?.();
                                                                            } catch {}
                                                                        }
                                                                    }}
                                                                    className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                                                >
                                                                    📅
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-[11px] text-slate-500">
                                                                No later than
                                                            </p>
                                                        </div>
                                                        {/* Date (finish) */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Date (finish)
                                                            </label>
                                                            <div className="relative mt-1">
                                                                <input
                                                                    type="date"
                                                                    name="finish_date"
                                                                    value={toDateOnly(taskForm.finish_date)}
                                                                    onChange={(e) =>
                                                                        setTaskForm((s) => ({
                                                                            ...s,
                                                                            finish_date: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                                                    ref={(el) => (taskForm._finishRef = el)}
                                                                />
                                                                <span
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    aria-label="Open date picker"
                                                                    onClick={() => {
                                                                        try {
                                                                            taskForm._finishRef?.focus();
                                                                            taskForm._finishRef?.showPicker?.();
                                                                        } catch {}
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" || e.key === " ") {
                                                                            try {
                                                                                taskForm._finishRef?.focus();
                                                                                taskForm._finishRef?.showPicker?.();
                                                                            } catch {}
                                                                        }
                                                                    }}
                                                                    className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                                                >
                                                                    📅
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {/* Duration */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Duration
                                                            </label>
                                                            <div className="relative mt-1">
                                                                <input
                                                                    name="duration"
                                                                    value={taskForm.duration || ""}
                                                                    onChange={(e) =>
                                                                        setTaskForm((s) => ({
                                                                            ...s,
                                                                            duration: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    placeholder="e.g., 1h, 1d"
                                                                />
                                                                <span className="absolute inset-y-0 right-2 grid place-items-center text-base">
                                                                    📅
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Right column */}
                                                    <div className="grid gap-3 content-start">
                                                        {/* List */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                List
                                                            </label>
                                                            <input
                                                                name="list"
                                                                value={taskForm.list || ""}
                                                                onChange={(e) =>
                                                                    setTaskForm((s) => ({ ...s, list: e.target.value }))
                                                                }
                                                                className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                placeholder="List name"
                                                            />
                                                        </div>
                                                        {/* Key Area */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Key Area
                                                            </label>
                                                            <select
                                                                name="key_area_id"
                                                                value={taskForm.key_area_id || selectedKA?.id || ""}
                                                                onChange={(e) =>
                                                                    setTaskForm((s) => ({
                                                                        ...s,
                                                                        key_area_id: e.target.value,
                                                                    }))
                                                                }
                                                                className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            >
                                                                {/* Current selection first */}
                                                                {selectedKA && !taskForm.key_area_id && (
                                                                    <option value={selectedKA.id}>
                                                                        {selectedKA.name}
                                                                    </option>
                                                                )}
                                                                {/* Other KAs */}
                                                                {keyAreas
                                                                    .filter(
                                                                        (ka) =>
                                                                            !selectedKA ||
                                                                            String(ka.id) !== String(selectedKA.id),
                                                                    )
                                                                    .map((ka) => (
                                                                        <option key={ka.id} value={ka.id}>
                                                                            {ka.title || ka.name}
                                                                        </option>
                                                                    ))}
                                                            </select>
                                                        </div>
                                                        {/* Respons. */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Respons.
                                                            </label>
                                                            <select
                                                                name="assignee"
                                                                value={taskForm.assignee}
                                                                onChange={(e) =>
                                                                    setTaskForm((s) => ({
                                                                        ...s,
                                                                        assignee: e.target.value,
                                                                    }))
                                                                }
                                                                className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            >
                                                                <option value="">— Unassigned —</option>
                                                                {users?.map((u) => (
                                                                    <option key={u.id} value={u.name}>
                                                                        {u.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        {/* Priority */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Priority
                                                            </label>
                                                            <select
                                                                name="priority"
                                                                value={taskForm.priority}
                                                                onChange={(e) =>
                                                                    setTaskForm((s) => ({
                                                                        ...s,
                                                                        priority: e.target.value,
                                                                    }))
                                                                }
                                                                className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            >
                                                                <option value="high">High</option>
                                                                <option value="normal">Normal</option>
                                                                <option value="low">Low</option>
                                                            </select>
                                                        </div>
                                                        {/* Goal */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Goal
                                                            </label>
                                                            <input
                                                                name="goal"
                                                                value={taskForm.goal || ""}
                                                                onChange={(e) =>
                                                                    setTaskForm((s) => ({ ...s, goal: e.target.value }))
                                                                }
                                                                className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                placeholder="Goal"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Footer actions */}
                                                <div className="mt-6 flex items-center justify-between">
                                                    {showTaskHelp ? (
                                                        <div className="text-xs text-slate-600">
                                                            • OK saves the task • Cancel closes without saving • Dates
                                                            use your local timezone.
                                                        </div>
                                                    ) : (
                                                        <span />
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="submit"
                                                            className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-4 py-2 text-sm"
                                                        >
                                                            <FaSave /> {editingTaskId ? "Save" : "OK"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowTaskComposer(false);
                                                                setEditingTaskId(null);
                                                            }}
                                                            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowTaskHelp((v) => !v)}
                                                            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                                        >
                                                            Help
                                                        </button>
                                                    </div>
                                                </div>
                                            </form>
                                            {/* Close button (corner X) */}
                                            <button
                                                type="button"
                                                className="absolute top-2 right-2 p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                                                onClick={() => setShowTaskComposer(false)}
                                                aria-label="Close"
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {showActivityComposer && (
                                    <div
                                        className="fixed inset-0 bg-black/40 z-50 grid place-items-center"
                                        onClick={() => setShowActivityComposer(false)}
                                    >
                                        <div
                                            className="relative bg-white border border-slate-300 rounded-xl shadow-2xl w-[95vw] max-w-4xl overflow-hidden"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {/* Header strip */}
                                            <div className="bg-white text-slate-900 border-b border-slate-200 py-3 px-4 text-center font-semibold">
                                                {editingActivityId ? "Edit Activity" : "Add Activity"}
                                                {activityAttachTaskId && (
                                                    <span className="ml-2 text-xs font-normal text-slate-500">
                                                        (attaching to task #{activityAttachTaskId})
                                                    </span>
                                                )}
                                            </div>
                                            <form onSubmit={onCreateActivity} className="p-4 md:p-6">
                                                {/* Activity name field under header */}
                                                <div className="mb-4">
                                                    <label className="sr-only" htmlFor="ka-activity-title">
                                                        Activity name
                                                    </label>
                                                    <input
                                                        id="ka-activity-title"
                                                        name="title"
                                                        required
                                                        value={activityForm.title}
                                                        onChange={(e) =>
                                                            setActivityForm((s) => ({ ...s, title: e.target.value }))
                                                        }
                                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="Activity name"
                                                    />
                                                </div>
                                                {/* Two-column layout */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                                    {/* Left column */}
                                                    <div className="grid gap-3 content-start">
                                                        {/* Description */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Description
                                                            </label>
                                                            <input
                                                                name="description"
                                                                value={activityForm.description}
                                                                onChange={(e) =>
                                                                    setActivityForm((s) => ({
                                                                        ...s,
                                                                        description: e.target.value,
                                                                    }))
                                                                }
                                                                className="mt-1 h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                placeholder="Brief description"
                                                            />
                                                        </div>
                                                        {/* Start date */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Start date
                                                            </label>
                                                            <div className="relative mt-1">
                                                                <input
                                                                    type="date"
                                                                    name="start_date"
                                                                    value={toDateOnly(activityForm.start_date)}
                                                                    onChange={(e) =>
                                                                        setActivityForm((s) => ({
                                                                            ...s,
                                                                            start_date: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                                                />
                                                                <span
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    aria-label="Open date picker"
                                                                    onClick={(e) => {
                                                                        try {
                                                                            const el =
                                                                                e.currentTarget.previousElementSibling;
                                                                            el?.focus();
                                                                            el?.showPicker?.();
                                                                        } catch {}
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" || e.key === " ") {
                                                                            try {
                                                                                const el =
                                                                                    e.currentTarget
                                                                                        .previousElementSibling;
                                                                                el?.focus();
                                                                                el?.showPicker?.();
                                                                            } catch {}
                                                                        }
                                                                    }}
                                                                    className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                                                >
                                                                    📅
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {/* End date */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                End date
                                                            </label>
                                                            <div className="relative mt-1">
                                                                <input
                                                                    type="date"
                                                                    name="end_date"
                                                                    value={toDateOnly(activityForm.end_date)}
                                                                    onChange={(e) =>
                                                                        setActivityForm((s) => ({
                                                                            ...s,
                                                                            end_date: e.target.value,
                                                                            _endAuto: false,
                                                                        }))
                                                                    }
                                                                    className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                                                />
                                                                <span
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    aria-label="Open date picker"
                                                                    onClick={(e) => {
                                                                        try {
                                                                            const el =
                                                                                e.currentTarget.previousElementSibling;
                                                                            el?.focus();
                                                                            el?.showPicker?.();
                                                                        } catch {}
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" || e.key === " ") {
                                                                            try {
                                                                                const el =
                                                                                    e.currentTarget
                                                                                        .previousElementSibling;
                                                                                el?.focus();
                                                                                el?.showPicker?.();
                                                                            } catch {}
                                                                        }
                                                                    }}
                                                                    className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                                                >
                                                                    📅
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {/* Deadline */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Deadline
                                                            </label>
                                                            <div className="relative mt-1">
                                                                <input
                                                                    type="date"
                                                                    name="deadline"
                                                                    value={toDateOnly(activityForm.deadline)}
                                                                    onChange={(e) =>
                                                                        setActivityForm((s) => ({
                                                                            ...s,
                                                                            deadline: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                                                />
                                                                <span
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    aria-label="Open date picker"
                                                                    onClick={(e) => {
                                                                        try {
                                                                            const el =
                                                                                e.currentTarget.previousElementSibling;
                                                                            el?.focus();
                                                                            el?.showPicker?.();
                                                                        } catch {}
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" || e.key === " ") {
                                                                            try {
                                                                                const el =
                                                                                    e.currentTarget
                                                                                        .previousElementSibling;
                                                                                el?.focus();
                                                                                el?.showPicker?.();
                                                                            } catch {}
                                                                        }
                                                                    }}
                                                                    className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                                                >
                                                                    📅
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-[11px] text-slate-500">
                                                                No later than
                                                            </p>
                                                        </div>
                                                        {/* Date (finish) */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Date (finish)
                                                            </label>
                                                            <div className="relative mt-1">
                                                                <input
                                                                    type="date"
                                                                    name="finish_date"
                                                                    value={toDateOnly(activityForm.finish_date)}
                                                                    onChange={(e) =>
                                                                        setActivityForm((s) => ({
                                                                            ...s,
                                                                            finish_date: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                                                                />
                                                                <span
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    aria-label="Open date picker"
                                                                    onClick={(e) => {
                                                                        try {
                                                                            const el =
                                                                                e.currentTarget.previousElementSibling;
                                                                            el?.focus();
                                                                            el?.showPicker?.();
                                                                        } catch {}
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" || e.key === " ") {
                                                                            try {
                                                                                const el =
                                                                                    e.currentTarget
                                                                                        .previousElementSibling;
                                                                                el?.focus();
                                                                                el?.showPicker?.();
                                                                            } catch {}
                                                                        }
                                                                    }}
                                                                    className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                                                                >
                                                                    📅
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {/* Duration */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Duration
                                                            </label>
                                                            <div className="relative mt-1">
                                                                <input
                                                                    name="duration"
                                                                    value={activityForm.duration || ""}
                                                                    onChange={(e) =>
                                                                        setActivityForm((s) => ({
                                                                            ...s,
                                                                            duration: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    placeholder="e.g., 1h, 1d"
                                                                />
                                                                <span className="absolute inset-y-0 right-2 grid place-items-center text-base">
                                                                    📅
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Right column */}
                                                    <div className="grid gap-3 content-start">
                                                        {/* List */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                List
                                                            </label>
                                                            <input
                                                                name="list"
                                                                value={activityForm.list || ""}
                                                                onChange={(e) =>
                                                                    setActivityForm((s) => ({
                                                                        ...s,
                                                                        list: e.target.value,
                                                                    }))
                                                                }
                                                                className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                placeholder="List name"
                                                            />
                                                        </div>
                                                        {/* Key Area */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Key Area
                                                            </label>
                                                            <select
                                                                name="key_area_id"
                                                                value={activityForm.key_area_id || selectedKA?.id || ""}
                                                                onChange={(e) =>
                                                                    setActivityForm((s) => ({
                                                                        ...s,
                                                                        key_area_id: e.target.value,
                                                                    }))
                                                                }
                                                                className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            >
                                                                {selectedKA && !activityForm.key_area_id && (
                                                                    <option value={selectedKA.id}>
                                                                        {selectedKA.name}
                                                                    </option>
                                                                )}
                                                                {keyAreas
                                                                    .filter(
                                                                        (ka) =>
                                                                            !selectedKA ||
                                                                            String(ka.id) !== String(selectedKA.id),
                                                                    )
                                                                    .map((ka) => (
                                                                        <option key={ka.id} value={ka.id}>
                                                                            {ka.title || ka.name}
                                                                        </option>
                                                                    ))}
                                                            </select>
                                                        </div>
                                                        {/* Respons. */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Respons.
                                                            </label>
                                                            <select
                                                                name="assignee"
                                                                value={activityForm.assignee}
                                                                onChange={(e) =>
                                                                    setActivityForm((s) => ({
                                                                        ...s,
                                                                        assignee: e.target.value,
                                                                    }))
                                                                }
                                                                className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            >
                                                                <option value="">— Unassigned —</option>
                                                                {users?.map((u) => (
                                                                    <option key={u.id} value={u.name}>
                                                                        {u.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        {/* Priority */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Priority
                                                            </label>
                                                            <select
                                                                name="priority"
                                                                value={activityForm.priority}
                                                                onChange={(e) =>
                                                                    setActivityForm((s) => ({
                                                                        ...s,
                                                                        priority: e.target.value,
                                                                    }))
                                                                }
                                                                className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            >
                                                                <option value="high">High</option>
                                                                <option value="normal">Normal</option>
                                                                <option value="low">Low</option>
                                                            </select>
                                                        </div>
                                                        {/* Goal */}
                                                        <div className="flex flex-col">
                                                            <label className="text-xs font-semibold text-slate-700">
                                                                Goal
                                                            </label>
                                                            <input
                                                                name="goal"
                                                                value={activityForm.goal || ""}
                                                                onChange={(e) =>
                                                                    setActivityForm((s) => ({
                                                                        ...s,
                                                                        goal: e.target.value,
                                                                    }))
                                                                }
                                                                className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                placeholder="Goal"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Footer actions */}
                                                <div className="mt-6 flex items-center justify-between">
                                                    <span />
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="submit"
                                                            className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-4 py-2 text-sm"
                                                        >
                                                            <FaSave /> {editingActivityId ? "Save" : "OK"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowActivityComposer(false);
                                                                setEditingActivityId(null);
                                                                setActivityAttachTaskId(null);
                                                            }}
                                                            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                                            disabled
                                                        >
                                                            Help
                                                        </button>
                                                    </div>
                                                </div>
                                            </form>
                                            {/* Close button (corner X) */}
                                            <button
                                                type="button"
                                                className="absolute top-2 right-2 p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                                                onClick={() => setShowActivityComposer(false)}
                                                aria-label="Close"
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Tasks list rendering moved inside the Task Lists card above */}

                                {/* Kanban/Calendar already rendered above based on view */}
                            </div>
                        )}
                        {/* Create/Edit KA Modal */}
                        {showForm && (
                            <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
                                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-[92vw] max-w-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h2 className="text-lg font-bold text-slate-900">
                                            {editing ? "Edit Key Area" : "New Key Area"}
                                        </h2>
                                        <button
                                            className="p-2 rounded-lg hover:bg-slate-50"
                                            onClick={() => {
                                                setShowForm(false);
                                                setEditing(null);
                                            }}
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                    <form onSubmit={onSaveKA} className="grid gap-3">
                                        <div>
                                            <label className="text-sm font-semibold text-slate-900">Title *</label>
                                            <input
                                                name="title"
                                                required
                                                defaultValue={editing?.title || ""}
                                                readOnly={
                                                    Boolean(editing?.is_default) ||
                                                    (editing?.title || "").toLowerCase() === "ideas"
                                                }
                                                disabled={
                                                    Boolean(editing?.is_default) ||
                                                    (editing?.title || "").toLowerCase() === "ideas"
                                                }
                                                className="mt-1 w-full rounded-lg border-slate-300 focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-700"
                                                placeholder="e.g., Finance"
                                            />
                                            {Boolean(editing?.is_default) ||
                                            (editing?.title || "").toLowerCase() === "ideas" ? (
                                                <p className="text-xs text-slate-600 mt-1">
                                                    The "Ideas" key area cannot be renamed.
                                                </p>
                                            ) : null}
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-slate-900">Description</label>
                                            <textarea
                                                name="description"
                                                rows={3}
                                                defaultValue={editing?.description || ""}
                                                className="mt-1 w-full rounded-lg border-slate-300 focus:ring-2 focus:ring-slate-400"
                                                placeholder="What belongs to this area?"
                                            />
                                        </div>
                                        {/* Color inputs removed per request */}
                                        <div className="flex items-center gap-2">
                                            <button className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2">
                                                <FaSave /> Save
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowForm(false);
                                                    setEditing(null);
                                                }}
                                                className="px-3 py-2 rounded-lg bg-white border text-slate-700 hover:bg-slate-50 font-semibold"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                        <div className="text-xs text-slate-700 flex items-start gap-2">
                                            <FaExclamationCircle className="mt-0.5" />
                                            <span>
                                                “Ideas” is locked and always at position 10. Enforce max 10 on server
                                                too.
                                            </span>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
