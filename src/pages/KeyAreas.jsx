// src/pages/KeyAreas.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import TaskActivityModal from "../components/calendar/TaskActivityModal";
import {
    FaPlus,
    FaLock,
    FaEdit,
    FaBars,
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
} from "react-icons/fa";

function InlineAddActivity({ onAdd }) {
    const [value, setValue] = useState("");
    const submit = () => {
        const t = (value || "").trim();
        if (!t) return;
        onAdd && onAdd(t);
        setValue("");
    };
    return (
        <div className="flex items-center gap-2">
            <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                }}
                placeholder="Activity name"
                className="flex-1 p-2 border rounded text-sm"
            />
            <button type="button" onClick={submit} className="px-3 py-2 bg-slate-100 rounded text-sm text-slate-700">
                Add activity
            </button>
        </div>
    );
}

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

// Activity helpers
const activityDefaults = {
    id: 0,
    activity_name: "",
    completed: 0,
    priority: 2, // 1 low, 2 normal, 3 high
    date_start: "",
    date_end: "",
    deadline: "",
    duration: "",
    task_id: "",
    goal_id: "",
    responsible: "",
    notes: "",
    // createdAt removed
};

const loadActivitiesMap = () => {
    try {
        const raw = localStorage.getItem("pm:kaActivities");
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
};
const saveActivitiesMap = (map) => {
    try {
        localStorage.setItem("pm:kaActivities", JSON.stringify(map || {}));
    } catch {}
};

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

// Backend service for Key Areas with localStorage fallback
import keyAreaService from "../services/keyAreaService";

const api = {
    async listKeyAreas() {
        try {
            const items = await keyAreaService.list({ includeTaskCount: true });
            // cache last good list to speed up sidebar
            try {
                localStorage.setItem("pm:keyareas", JSON.stringify(items));
            } catch {}
            return items;
        } catch (e) {
            // fallback to cache/seed
            try {
                const raw = localStorage.getItem("pm:keyareas");
                const cached = raw ? JSON.parse(raw) : [];
                if (Array.isArray(cached) && cached.length) return cached;
            } catch {}
            const seed = [
                { id: 1, title: "Marketing", description: "Grow brand and leads", position: 1 },
                { id: 2, title: "Sales", description: "Close deals", position: 2 },
                { id: 3, title: "Product", description: "Build and ship", position: 3 },
                { id: 10, title: "Ideas", description: "Locked ideas slot", position: 10, is_default: true },
            ];
            try {
                localStorage.setItem("pm:keyareas", JSON.stringify(seed));
            } catch {}
            return seed;
        }
    },
    async listGoals() {
        return [];
    },
    async updateKeyArea(id, data) {
        try {
            const updated = await keyAreaService.update(id, data);
            const raw = JSON.parse(localStorage.getItem("pm:keyareas") || "[]");
            const next = (Array.isArray(raw) ? raw : []).map((k) =>
                String(k.id) === String(id) ? { ...k, ...updated } : k,
            );
            try {
                localStorage.setItem("pm:keyareas", JSON.stringify(next));
            } catch {}
            return updated;
        } catch (e) {
            // local optimistic fallback
            const raw = JSON.parse(localStorage.getItem("pm:keyareas") || "[]");
            const next = (Array.isArray(raw) ? raw : []).map((k) =>
                String(k.id) === String(id) ? { ...k, ...data } : k,
            );
            try {
                localStorage.setItem("pm:keyareas", JSON.stringify(next));
            } catch {}
            return next.find((k) => String(k.id) === String(id)) || data;
        }
    },
    async createKeyArea(data) {
        try {
            const created = await keyAreaService.create(data);
            const raw = JSON.parse(localStorage.getItem("pm:keyareas") || "[]");
            const next = [...(Array.isArray(raw) ? raw : []), created];
            try {
                localStorage.setItem("pm:keyareas", JSON.stringify(next));
            } catch {}
            return created;
        } catch (e) {
            // local fallback id
            const raw = JSON.parse(localStorage.getItem("pm:keyareas") || "[]");
            const item = { id: data.id || Date.now(), ...data };
            const next = [...(Array.isArray(raw) ? raw : []), item];
            try {
                localStorage.setItem("pm:keyareas", JSON.stringify(next));
            } catch {}
            return item;
        }
    },
    async deleteKeyArea(id) {
        try {
            await keyAreaService.remove(id);
        } catch (e) {
            // ignore network failure and still remove locally for UX
        }
        const raw = JSON.parse(localStorage.getItem("pm:keyareas") || "[]");
        const next = (Array.isArray(raw) ? raw : []).filter((k) => String(k.id) !== String(id));
        try {
            localStorage.setItem("pm:keyareas", JSON.stringify(next));
        } catch {}
        return true;
    },
    async listTasks(keyAreaId) {
        try {
            const raw = localStorage.getItem(`pm:tasks:${keyAreaId}`);
            const existing = raw ? JSON.parse(raw) : [];
            if (Array.isArray(existing) && existing.length > 0) return existing;
            const now = Date.now();
            const seed = [
                {
                    id: now,
                    key_area_id: keyAreaId,
                    title: `Kickoff planning (KA ${keyAreaId})`,
                    description: "Define scope, owners, and timeline",
                    assignee: "Alex",
                    status: "open",
                    priority: "med",
                    start_date: new Date(now + 1000 * 60 * 60 * 24 * 1).toISOString(),
                    goal_id: "",
                    tags: "q3,planning",
                    attachments: "",
                    deadline: new Date(now + 1000 * 60 * 60 * 24 * 3).toISOString(),
                    end_date: new Date(now + 1000 * 60 * 60 * 24 * 7).toISOString(),
                    list_index: 1,
                    recurrence: "",
                },
                {
                    id: now + 1,
                    key_area_id: keyAreaId,
                    title: `Baseline metrics (KA ${keyAreaId})`,
                    description: "Collect current KPIs to compare",
                    assignee: "Jamie",
                    status: "in_progress",
                    priority: "high",
                    start_date: new Date(now + 1000 * 60 * 60 * 60 * 24 * 8).toISOString(),
                    goal_id: "",
                    tags: "metrics,report",
                    attachments: "",
                    deadline: new Date(now + 1000 * 60 * 60 * 60 * 24 * 10).toISOString(),
                    end_date: new Date(now + 1000 * 60 * 60 * 60 * 24 * 14).toISOString(),
                    list_index: 2,
                    recurrence: "",
                },
            ];
            try {
                localStorage.setItem(`pm:tasks:${keyAreaId}`, JSON.stringify(seed));
            } catch (e) {}
            return seed;
        } catch {
            return [];
        }
    },
    async createTask(task) {
        const id = task.id || Date.now();
        const ka = task.key_area_id;
        const raw = await this.listTasks(ka);
        const item = { ...task, id };
        localStorage.setItem(`pm:tasks:${ka}`, JSON.stringify([...raw, item]));
        return item;
    },
    async updateTask(id, task) {
        const ka = task.key_area_id || task.keyAreaId || task.key_area;
        const raw = await this.listTasks(ka);
        const next = raw.map((t) => (String(t.id) === String(id) ? { ...t, ...task } : t));
        localStorage.setItem(`pm:tasks:${ka}`, JSON.stringify(next));
        return next.find((t) => String(t.id) === String(id)) || task;
    },
    async deleteTask(id) {
        const allKeys = Object.keys(localStorage).filter((k) => k.startsWith("pm:tasks:"));
        for (const key of allKeys) {
            const arr = JSON.parse(localStorage.getItem(key) || "[]");
            const next = arr.filter((t) => String(t.id) !== String(id));
            if (next.length !== arr.length) localStorage.setItem(key, JSON.stringify(next));
        }
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
        try {
            const raw = localStorage.getItem("pm:kaActivities");
            const map = raw ? JSON.parse(raw) : {};
            const list = map[String(task.id)] || [];
            setTaskActivities(Array.isArray(list) ? list : []);
        } catch (e) {
            setTaskActivities([]);
        }
    }, [task, initialTab, hideActivitiesTab]);

    // If asked to hide activities, ensure we stay on details
    useEffect(() => {
        if (hideActivitiesTab && activeTab !== "details") setActiveTab("details");
    }, [hideActivitiesTab, activeTab]);

    // When switching target (this task vs new), load that list
    useEffect(() => {
        if (!task) return;
        try {
            const raw = localStorage.getItem("pm:kaActivities");
            const map = raw ? JSON.parse(raw) : {};
            const list = map[String(activitiesTarget)] || [];
            setTaskActivities(Array.isArray(list) ? list : []);
        } catch (e) {
            setTaskActivities([]);
        }
    }, [activitiesTarget, task]);

    const persistActivities = (list) => {
        setTaskActivities(list);
        try {
            const raw = localStorage.getItem("pm:kaActivities");
            const map = raw ? JSON.parse(raw) : {};
            map[String(activitiesTarget)] = list;
            localStorage.setItem("pm:kaActivities", JSON.stringify(map));
            // notify parent to refresh its in-memory cache
            window.dispatchEvent(new CustomEvent("ka-activities-updated", { detail: { activities: map } }));
        } catch (e) {}
    };

    const addActivity = () => {
        const text = (newActivity || "").trim();
        if (!text) return;
        const item = { id: Date.now(), text };
        persistActivities([...(taskActivities || []), item]);
        setNewActivity("");
    };

    const removeActivity = (id) => {
        persistActivities((taskActivities || []).filter((a) => a.id !== id));
    };

    const clearActivities = () => {
        if (!confirm("Clear all activities for this selection?")) return;
        persistActivities([]);
    };

    if (!task || !form) return null;

    const submit = (e) => {
        e.preventDefault();
        if (readOnly) return;
        const attachmentsNames = (form.attachmentsFiles || []).map((f) => f.name || f).filter(Boolean);
        const payload = {
            ...form,
            attachments: attachmentsNames.join(","),
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
                                                            <div className="text-[11px] text-slate-600">List (Tab)</div>
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm"
                                                                value={form.list_index || 1}
                                                                onChange={(e) =>
                                                                    setForm((s) => ({
                                                                        ...s,
                                                                        list_index: Number(e.target.value || 1),
                                                                    }))
                                                                }
                                                                disabled={readOnly}
                                                            />
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
                                                    { key: "deadline", label: "Deadline" },
                                                    { key: "end_date", label: "Planned End" },
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

                            <div className="mt-3 space-y-3">
                                <div className="flex items-center gap-2">
                                    <select
                                        value={activitiesTarget}
                                        onChange={(e) => setActivitiesTarget(e.target.value)}
                                        className="p-2 border rounded bg-white text-sm"
                                        aria-label="Select task for activity"
                                    >
                                        <option value={String(task.id)}>This task</option>
                                        <option value="new">New (unattached)</option>
                                    </select>

                                    <div className="flex-1 flex items-stretch">
                                        <label
                                            htmlFor="slideover-add-activity"
                                            className="inline-flex items-center justify-center w-20 px-2 text-xs font-semibold bg-blue-600 text-white border border-blue-600 rounded-l"
                                        >
                                            New
                                        </label>
                                        <input
                                            id="slideover-add-activity"
                                            value={newActivity}
                                            onChange={(e) => setNewActivity(e.target.value)}
                                            placeholder="Activity name..."
                                            className="flex-1 p-2 border border-l-0 rounded-r text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={addActivity}
                                        className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
                                    >
                                        Add
                                    </button>

                                    {taskActivities && taskActivities.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={clearActivities}
                                            className="px-2 py-2 bg-slate-100 rounded text-sm text-slate-700"
                                        >
                                            Clear
                                        </button>
                                    )}
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
}) {
    const [tab, setTab] = useState(initialTab || "activities");
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState(task || null);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const [newActivity, setNewActivity] = useState("");
    const [showDetailsPopup, setShowDetailsPopup] = useState(false);
    const [openActivityRows, setOpenActivityRows] = useState(new Set());
    const [activityModal, setActivityModal] = useState({ open: false, item: null });

    useEffect(() => {
        setTab(initialTab || "activities");
    }, [initialTab]);

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

    const addActivity = (text) => {
        const t = (text || "").trim();
        if (!t) return;
        const rich = {
            ...activityDefaults,
            id: Date.now(),
            activity_name: t,
        };
        setList([...(list || []), rich]);
    };
    const removeActivity = (id) => {
        setList(list.filter((a) => a.id !== id));
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

    // Save handler for details tab
    const save = async () => {
        if (onSave) {
            await onSave(form);
        }
        setIsEditing(false);
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
                            <div className="relative truncate font-bold text-slate-900 text-base md:text-lg pl-6">
                                {/* subtle stop icon behind the task name, with left padding to avoid overlap */}
                                <FaStop
                                    className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none text-[20px] text-[#4DC3D8]"
                                    aria-hidden="true"
                                />
                                <span className="relative z-10">{form?.title || task?.title || "Untitled task"}</span>
                            </div>
                            {/* Ellipsis menu next to the title */}
                            <div className="relative shrink-0" ref={menuRef}>
                                <button
                                    type="button"
                                    aria-haspopup="menu"
                                    aria-expanded={menuOpen ? "true" : "false"}
                                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
                                    onClick={() => setMenuOpen((s) => !s)}
                                    title="More actions"
                                >
                                    <FaEllipsisV />
                                </button>
                                {menuOpen && (
                                    <div
                                        role="menu"
                                        className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow z-10"
                                    >
                                        <button
                                            role="menuitem"
                                            className="block w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
                                            onClick={() => {
                                                setMenuOpen(false);
                                                setTab("details");
                                                setIsEditing(true);
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
                                const title = a.activity_name || a.text || "";
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
                                                <input
                                                    className="w-full bg-transparent outline-none font-medium"
                                                    value={title}
                                                    onChange={(e) =>
                                                        updateField(
                                                            a.id,
                                                            a.activity_name != null ? "activity_name" : "text",
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Activity name"
                                                />
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
                                            <div className="mt-3 border-t border-slate-200 pt-3">
                                                <div className="grid grid-cols-12 gap-3 text-sm">
                                                    <div className="col-span-12 md:col-span-3 space-y-3">
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
                                                    </div>
                                                    <div className="col-span-12 md:col-span-9 space-y-3">
                                                        <div className="grid md:grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-[11px] text-slate-600">
                                                                    Task
                                                                </label>
                                                                <input
                                                                    value={a.task_id || ""}
                                                                    onChange={(e) =>
                                                                        updateField(a.id, "task_id", e.target.value)
                                                                    }
                                                                    placeholder="Task"
                                                                    className="w-full border rounded px-2 py-1"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] text-slate-600">
                                                                    Goal
                                                                </label>
                                                                <input
                                                                    value={a.goal_id || ""}
                                                                    onChange={(e) =>
                                                                        updateField(a.id, "goal_id", e.target.value)
                                                                    }
                                                                    placeholder="Goal"
                                                                    className="w-full border rounded px-2 py-1"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="grid md:grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-[11px] text-slate-600">
                                                                    Priority
                                                                </label>
                                                                <select
                                                                    value={a.priority || 2}
                                                                    onChange={(e) =>
                                                                        updateField(
                                                                            a.id,
                                                                            "priority",
                                                                            Number(e.target.value),
                                                                        )
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
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] text-slate-600">
                                                                Notes
                                                            </label>
                                                            <textarea
                                                                value={a.notes || ""}
                                                                onChange={(e) =>
                                                                    updateField(a.id, "notes", e.target.value)
                                                                }
                                                                className="w-full border rounded px-2 py-1 min-h-[88px]"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 flex items-stretch">
                            <label
                                htmlFor="taskfull-add-activity"
                                className="inline-flex items-center justify-center w-20 px-2 text-xs font-semibold bg-blue-600 text-white border border-blue-600 rounded-l-lg"
                            >
                                New
                            </label>
                            <input
                                id="taskfull-add-activity"
                                className="flex-1 px-3 py-2 border border-l-0 rounded-r-lg bg-white"
                                placeholder="Add activity"
                                value={newActivity}
                                onChange={(e) => setNewActivity(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        const t = (newActivity || "").trim();
                                        if (!t) return;
                                        addActivity(t);
                                        setNewActivity("");
                                    }
                                }}
                            />
                        </div>
                        <button
                            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => {
                                const t = (newActivity || "").trim();
                                if (!t) return;
                                addActivity(t);
                                setNewActivity("");
                            }}
                        >
                            Add
                        </button>
                        <button
                            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                            onClick={clearActivities}
                        >
                            Clear all
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
                                            <div className="text-[11px] text-slate-600">List (Tab)</div>
                                            <input
                                                type="number"
                                                min={1}
                                                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-700"
                                                value={
                                                    isEditing && !readOnly ? form.list_index || 1 : task.list_index || 1
                                                }
                                                onChange={(e) =>
                                                    setForm((s) => ({
                                                        ...s,
                                                        list_index: Number(e.target.value || 1),
                                                    }))
                                                }
                                                readOnly={!isEditing || readOnly}
                                                disabled={!isEditing || readOnly}
                                            />
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
                                    { key: "deadline", label: "Deadline" },
                                    { key: "end_date", label: "Planned End" },
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

                    {/* Actions under details when not editing */}
                    {!isEditing && (
                        <div className="md:col-span-3 mt-1 flex items-center gap-2">
                            {!readOnly && (
                                <button
                                    className="px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
                                    onClick={() => {
                                        setTab("details");
                                        setIsEditing(true);
                                    }}
                                >
                                    Edit
                                </button>
                            )}
                            {!readOnly && (
                                <button
                                    className="px-2.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs"
                                    onClick={() => {
                                        if (!confirm("Delete this task?")) return;
                                        onDelete && onDelete(task);
                                    }}
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
            {showDetailsPopup && (
                <TaskSlideOver
                    task={task}
                    goals={goals}
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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [listNames, setListNames] = useState({}); // per-key-area custom names for lists/tabs
    const [showViewMenu, setShowViewMenu] = useState(false);
    const viewMenuRef = useRef(null);
    const [openListMenu, setOpenListMenu] = useState(null); // list number for context menu
    const [listMenuPos, setListMenuPos] = useState({ top: 0, left: 0 }); // popup menu position
    const composerModalRef = useRef(null);
    const tabsRef = useRef(null);
    // Mass edit UI toggle and anchor
    const [showMassEdit, setShowMassEdit] = useState(false);
    const tasksDisplayRef = useRef(null);

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
        priority: "med",
        tags: "",
        recurrence: "",
        attachments: "",
        attachmentsFiles: [],
        assignee: "",
    });

    // Expanded inline activities (tree mode) per task id
    const [expandedActivityRows, setExpandedActivityRows] = useState(new Set());
    const [editingActivity, setEditingActivity] = useState(null); // { taskId, id }
    const [openActivityDetails, setOpenActivityDetails] = useState(new Set()); // Set of activity ids for a given task row render
    const toggleActivitiesRow = (id) => {
        setExpandedActivityRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Activities associated to tasks: { [taskIdOrNew]: [{ id, text }] }
    const [activitiesByTask, setActivitiesByTask] = useState({});
    const [activityTaskId, setActivityTaskId] = useState("new");
    const [activityName, setActivityName] = useState("");

    // load persisted activities
    useEffect(() => {
        setActivitiesByTask(loadActivitiesMap());
    }, []);

    useEffect(() => {
        saveActivitiesMap(activitiesByTask);
    }, [activitiesByTask]);

    // keep in-memory activities in sync if slide-over updates them
    useEffect(() => {
        const handler = (e) => {
            const map = e?.detail?.activities;
            if (map && typeof map === "object") setActivitiesByTask(map);
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

    // Auto-hide mass edit when selection is cleared
    useEffect(() => {
        if (selectedIds.size === 0 && showMassEdit) setShowMassEdit(false);
    }, [selectedIds, showMassEdit]);

    useEffect(() => {
        (async () => {
            const [kas, gs] = await Promise.all([api.listKeyAreas(), api.listGoals()]);
            const sorted = (kas || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0));
            setKeyAreas(sorted);
            try {
                localStorage.setItem("pm:keyareas", JSON.stringify(sorted));
            } catch (e) {}
            // emit key areas so sidebar can populate its dropdown
            try {
                window.dispatchEvent(new CustomEvent("sidebar-keyareas-data", { detail: { keyAreas: sorted } }));
            } catch (e) {
                // ignore if window not available or dispatch fails
            }
            setGoals(gs || []);
            setLoading(false);
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

    // Prime Sidebar with cached key areas immediately (before async load completes)
    useEffect(() => {
        try {
            const raw = localStorage.getItem("pm:keyareas");
            const cached = raw ? JSON.parse(raw) : [];
            if (Array.isArray(cached) && cached.length) {
                window.dispatchEvent(new CustomEvent("sidebar-keyareas-data", { detail: { keyAreas: cached } }));
            }
        } catch (e) {}
    }, []);

    // Re-emit to Sidebar whenever the in-memory list changes (after edits/deletes)
    useEffect(() => {
        if (loading) return;
        try {
            const sorted = [...keyAreas].sort((a, b) => (a.position || 0) - (b.position || 0));
            window.dispatchEvent(new CustomEvent("sidebar-keyareas-data", { detail: { keyAreas: sorted } }));
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

    // load persisted list names from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem("pm:listNames");
            if (raw) setListNames(JSON.parse(raw));
        } catch (e) {
            // ignore parse errors
        }
    }, []);

    // persist list names whenever they change
    useEffect(() => {
        try {
            localStorage.setItem("pm:listNames", JSON.stringify(listNames));
        } catch (e) {
            // ignore
        }
    }, [listNames]);

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
                const synth = {
                    id: "ideas-synth",
                    title: "Ideas",
                    description: "Locked ideas slot",
                    position: 99,
                    is_default: true,
                };
                setKeyAreas((prev) => {
                    if (prev.some((k) => (k.id && k.id === synth.id) || (k.title || "").toLowerCase() === "ideas"))
                        return prev;
                    return [...prev, synth].sort((a, b) => (a.position || 0) - (b.position || 0));
                });
                setSelectedKA(null);
                setAllTasks([]);
                setFilter("Ideas");
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

    const canAdd = useMemo(() => keyAreas.length < 10, [keyAreas.length]);

    const filteredKAs = useMemo(() => {
        const q = filter.trim().toLowerCase();
        const params = new URLSearchParams(location.search);
        const explicitSelect = params.get("select");

        // If the URL explicitly requests Ideas, show only Ideas
        if (explicitSelect === "ideas") {
            return keyAreas.filter((k) => (k.title || "").toLowerCase() === "ideas" || k.is_default);
        }

        // Default Key Areas listing: exclude Ideas slot (position 10 or title 'Ideas') unless user filtered for it
        const base = keyAreas.filter((k) => (k.title || "").toLowerCase() !== "ideas" && !k.is_default);
        if (!q) return base;
        return base.filter((k) => k.title.toLowerCase().includes(q) || (k.description || "").toLowerCase().includes(q));
    }, [keyAreas, filter]);

    const paramsForRender = new URLSearchParams(location.search);
    const showOnlyIdeas = paramsForRender.get("select") === "ideas";
    const ideaForShow = keyAreas.find((k) => (k.title || "").toLowerCase() === "ideas") ||
        keyAreas.find((k) => k.is_default) || {
            id: "ideas-synth",
            title: "Ideas",
            description: "Locked ideas slot",
            position: 99,
            is_default: true,
        };

    const onSaveKA = async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const payload = {
            title: form.get("title").toString().trim(),
            description: form.get("description").toString().trim(),
        };
        if (!payload.title) return;

        if (editing) {
            const updated = await api.updateKeyArea(editing.id, { ...editing, ...payload });
            setKeyAreas((prev) => prev.map((k) => (k.id === editing.id ? { ...k, ...updated } : k)));
            // emit updated list
            try {
                const updatedList = (keyAreas || []).map((k) => (k.id === editing.id ? { ...k, ...updated } : k));
                try {
                    localStorage.setItem("pm:keyareas", JSON.stringify(updatedList));
                } catch (e) {}
                window.dispatchEvent(new CustomEvent("sidebar-keyareas-data", { detail: { keyAreas: updatedList } }));
            } catch (e) {}
        } else {
            const used = new Set(keyAreas.map((k) => k.position));
            let pos = 1;
            while (used.has(pos) && pos <= 9) pos++;
            const created = await api.createKeyArea({ ...payload, position: pos, is_default: false });
            setKeyAreas((prev) =>
                [...prev.filter((k) => k.position !== pos), { ...created, position: pos }].sort(
                    (a, b) => a.position - b.position,
                ),
            );
            // emit updated list after create
            try {
                const after = [
                    ...(keyAreas || []).filter((k) => k.position !== pos),
                    { ...created, position: pos },
                ].sort((a, b) => a.position - b.position);
                try {
                    localStorage.setItem("pm:keyareas", JSON.stringify(after));
                } catch (e) {}
                window.dispatchEvent(new CustomEvent("sidebar-keyareas-data", { detail: { keyAreas: after } }));
            } catch (e) {}
        }
        setShowForm(false);
        setEditing(null);
    };

    const onDeleteKA = async (ka) => {
        if (ka.is_default) return;
        if (!confirm(`Delete "${ka.title}"? Tasks will need reassignment.`)) return;
        await api.deleteKeyArea(ka.id);
        const next = (keyAreas || []).filter((k) => k.id !== ka.id);
        setKeyAreas(next);
        try {
            try {
                localStorage.setItem("pm:keyareas", JSON.stringify(next));
            } catch (e) {}
            window.dispatchEvent(new CustomEvent("sidebar-keyareas-data", { detail: { keyAreas: next } }));
        } catch (e) {}
        if (selectedKA?.id === ka.id) {
            setSelectedKA(null);
            setAllTasks([]);
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
        if (kaParam && keyAreas.length) {
            const found = keyAreas.find((k) => String(k.id) === String(kaParam));
            if (found) openKA(found);
        }
    }, [location.search, keyAreas]);

    const openKA = async (ka) => {
        // Close any open task full view when switching Key Areas
        setSelectedTaskFull(null);
        setSelectedKA(ka);
        const t = await api.listTasks(ka.id);
        setAllTasks(t);
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
            ? Object.keys(listNames[kaId] || {})
                  .map((k) => Number(k))
                  .filter(Boolean)
            : [];
        const maxFromNames = nameKeys.length ? Math.max(...nameKeys) : 0;
        return Math.max(4, maxFromTabs, maxFromNames);
    }, [selectedKA, listNames, tabNumbers]);

    // Helpers to manage per-key-area list names
    const getListName = (kaId, n) => {
        if (!kaId) return `List ${n}`;
        const names = listNames[kaId] || {};
        return names[n] || `List ${n}`;
    };

    const renameList = (n) => {
        if (!selectedKA) return;
        const current = getListName(selectedKA.id, n);
        const val = prompt("Rename list", current);
        if (val === null) return; // cancelled
        setListNames((prev) => {
            const copy = { ...(prev || {}) };
            copy[selectedKA.id] = { ...(copy[selectedKA.id] || {}), [n]: val };
            return copy;
        });
    };

    const deleteList = (n) => {
        if (!selectedKA) return;
        const kaId = selectedKA.id;
        // do not allow deleting a list that has tasks
        const hasTasks = (allTasks || []).some(
            (t) => (t.list_index || 1) === n && String(t.key_area_id) === String(kaId),
        );
        if (hasTasks) {
            alert("Cannot delete list while it contains tasks. Move or remove tasks first.");
            return;
        }
        const names = listNames[kaId] || {};
        if (!names || !names[n]) {
            if (!confirm(`Remove list ${n}? This will reset any custom name.`)) return;
        }
        setListNames((prev) => {
            const copy = { ...(prev || {}) };
            if (!copy[kaId]) return copy;
            const { [n]: _rem, ...rest } = copy[kaId];
            copy[kaId] = { ...rest };
            return copy;
        });
        if (taskTab === n) setTaskTab(1);
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
        if (bulkForm.priority) patch.priority = bulkForm.priority;
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
        if (!selectedKA) return;
        // prevent creating tasks in Ideas/locked key area
        if (selectedKA.is_default || (selectedKA.title || "").toLowerCase() === "ideas") return;
        const f = new FormData(e.currentTarget);
        const title = f.get("title").toString().trim();
        if (!title) return;

        const category = f.get("category").toString();
        const status = f.get("status").toString();
        const priority = f.get("priority").toString();
        const tags = f.get("tags").toString();
        const recurrence = f.get("recurrence").toString();
        // gather attachments from device uploads and composer state (including storage picks)
        const deviceFiles = f.getAll("attachments_files") || [];
        const deviceNames = deviceFiles.map((file) => file.name);
        const stateNames =
            taskForm && taskForm.attachmentsFiles ? taskForm.attachmentsFiles.map((ff) => ff.name || ff) : [];
        const allNames = Array.from(new Set([...(stateNames || []), ...deviceNames]));
        const attachments = allNames.join(",");
        const assignee = f.get("assignee").toString();
        const start_date = f.get("start_date") ? toDateOnly(f.get("start_date")) : null;
        const deadline = f.get("deadline") ? toDateOnly(f.get("deadline")) : null;
        const end_date = f.get("end_date") ? toDateOnly(f.get("end_date")) : null;

        const payload = {
            key_area_id: selectedKA.id,
            title,
            description: f.get("description").toString(),
            status,
            priority,
            category,
            goal_id: f.get("goal_id").toString() || null,
            list_index: Number(f.get("list_index")) || 1,
            start_date,
            deadline,
            end_date,
            tags,
            recurrence,
            attachments,
            assignee,
        };

        payload.eisenhower_quadrant = computeEisenhowerQuadrant({ deadline, end_date, priority });

        const created = await api.createTask(payload);
        setAllTasks((prev) => [...prev, created]);

        setTaskForm((s) => ({
            ...s,
            title: "",
            description: "",
            goal_id: "",
            start_date: "",
            deadline: "",
            end_date: "",
            tags: "",
            recurrence: "",
            attachments: "",
            attachmentsFiles: [],
            assignee: "",
        }));
        setShowTaskComposer(false);
    };

    const handleSaveTask = async (updated) => {
        const q = computeEisenhowerQuadrant({
            deadline: updated.deadline,
            end_date: updated.end_date,
            priority: updated.priority,
        });
        const payload = { ...updated, eisenhower_quadrant: q };
        const saved = await api.updateTask(payload.id, payload);
        setAllTasks((prev) => prev.map((t) => (t.id === saved.id ? { ...t, ...saved } : t)));
        setSelectedTask(null);
    };

    const handleDeleteTask = async (task) => {
        await api.deleteTask(task.id);
        setAllTasks((prev) => prev.filter((t) => t.id !== task.id));
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
                                                    className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow z-10"
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
                                    readOnly={
                                        selectedKA?.is_default || (selectedKA?.title || "").toLowerCase() === "ideas"
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
                                    <div className="rounded-xl border bg-white shadow-sm p-6 space-y-6">
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
                                                                    onClick={() => {
                                                                        if (!selectedKA) return;
                                                                        const kaId = selectedKA.id;
                                                                        const currentCount = leftListCount;
                                                                        const next = currentCount + 1;
                                                                        setListNames((prev) => {
                                                                            const copy = { ...(prev || {}) };
                                                                            copy[kaId] = { ...(copy[kaId] || {}) };
                                                                            copy[kaId][next] = `List ${next}`;
                                                                            return copy;
                                                                        });
                                                                        setTaskTab(next);
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
                                                                Planned End
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
                                                                                <td className="px-3 py-2 align-top">
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
                                                                                            className="text-blue-700 hover:underline font-semibold"
                                                                                            title="Click to open task"
                                                                                            onClick={() => {
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
                                                                                                const remove = (id) =>
                                                                                                    setList(
                                                                                                        list.filter(
                                                                                                            (a) =>
                                                                                                                a.id !==
                                                                                                                id,
                                                                                                        ),
                                                                                                    );
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

                                                                                                const addNew = (
                                                                                                    name,
                                                                                                ) => {
                                                                                                    const text = (
                                                                                                        name || ""
                                                                                                    ).trim();
                                                                                                    if (!text) return;
                                                                                                    const item = {
                                                                                                        ...activityDefaults,
                                                                                                        id: Date.now(),
                                                                                                        activity_name:
                                                                                                            text,
                                                                                                    };
                                                                                                    setList([
                                                                                                        ...list,
                                                                                                        item,
                                                                                                    ]);
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
                                                                                                                                    <input
                                                                                                                                        value={
                                                                                                                                            a.activity_name ||
                                                                                                                                            ""
                                                                                                                                        }
                                                                                                                                        onChange={(
                                                                                                                                            e,
                                                                                                                                        ) =>
                                                                                                                                            updateField(
                                                                                                                                                a.id,
                                                                                                                                                "activity_name",
                                                                                                                                                e
                                                                                                                                                    .target
                                                                                                                                                    .value,
                                                                                                                                            )
                                                                                                                                        }
                                                                                                                                        placeholder="Activity name"
                                                                                                                                        className={`w-full border rounded px-2 py-1 pr-16 ${
                                                                                                                                            a.completed
                                                                                                                                                ? "line-through text-slate-500"
                                                                                                                                                : ""
                                                                                                                                        }`}
                                                                                                                                    />
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
                                                                                                                            {/* Details */}
                                                                                                                            <div className="mt-2">
                                                                                                                                <button
                                                                                                                                    type="button"
                                                                                                                                    className="text-xs text-blue-700 hover:underline"
                                                                                                                                    onClick={() =>
                                                                                                                                        toggleDetails(
                                                                                                                                            a.id,
                                                                                                                                        )
                                                                                                                                    }
                                                                                                                                >
                                                                                                                                    {openActivityDetails.has(
                                                                                                                                        a.id,
                                                                                                                                    )
                                                                                                                                        ? "Hide details"
                                                                                                                                        : "Show details"}
                                                                                                                                </button>
                                                                                                                                {openActivityDetails.has(
                                                                                                                                    a.id,
                                                                                                                                ) && (
                                                                                                                                    <div className="mt-2 grid grid-cols-12 gap-3">
                                                                                                                                        <div className="col-span-12 md:col-span-3 space-y-3">
                                                                                                                                            <div>
                                                                                                                                                <label className="block text-xs text-slate-700">
                                                                                                                                                    Start
                                                                                                                                                    Date
                                                                                                                                                </label>
                                                                                                                                                <input
                                                                                                                                                    type="date"
                                                                                                                                                    value={
                                                                                                                                                        toDateOnly(
                                                                                                                                                            a.date_start,
                                                                                                                                                        ) ||
                                                                                                                                                        ""
                                                                                                                                                    }
                                                                                                                                                    onChange={(
                                                                                                                                                        e,
                                                                                                                                                    ) =>
                                                                                                                                                        updateField(
                                                                                                                                                            a.id,
                                                                                                                                                            "date_start",
                                                                                                                                                            e
                                                                                                                                                                .target
                                                                                                                                                                .value,
                                                                                                                                                        )
                                                                                                                                                    }
                                                                                                                                                    className="w-full border rounded px-2 py-1"
                                                                                                                                                />
                                                                                                                                            </div>
                                                                                                                                            <div>
                                                                                                                                                <label className="block text-xs text-slate-700">
                                                                                                                                                    End
                                                                                                                                                    Date
                                                                                                                                                </label>
                                                                                                                                                <input
                                                                                                                                                    type="date"
                                                                                                                                                    value={
                                                                                                                                                        toDateOnly(
                                                                                                                                                            a.date_end,
                                                                                                                                                        ) ||
                                                                                                                                                        ""
                                                                                                                                                    }
                                                                                                                                                    onChange={(
                                                                                                                                                        e,
                                                                                                                                                    ) =>
                                                                                                                                                        updateField(
                                                                                                                                                            a.id,
                                                                                                                                                            "date_end",
                                                                                                                                                            e
                                                                                                                                                                .target
                                                                                                                                                                .value,
                                                                                                                                                        )
                                                                                                                                                    }
                                                                                                                                                    className="w-full border rounded px-2 py-1"
                                                                                                                                                />
                                                                                                                                            </div>
                                                                                                                                            <div>
                                                                                                                                                <label className="block text-xs text-slate-700">
                                                                                                                                                    Deadline
                                                                                                                                                </label>
                                                                                                                                                <input
                                                                                                                                                    type="date"
                                                                                                                                                    value={
                                                                                                                                                        toDateOnly(
                                                                                                                                                            a.deadline,
                                                                                                                                                        ) ||
                                                                                                                                                        ""
                                                                                                                                                    }
                                                                                                                                                    onChange={(
                                                                                                                                                        e,
                                                                                                                                                    ) =>
                                                                                                                                                        updateField(
                                                                                                                                                            a.id,
                                                                                                                                                            "deadline",
                                                                                                                                                            e
                                                                                                                                                                .target
                                                                                                                                                                .value,
                                                                                                                                                        )
                                                                                                                                                    }
                                                                                                                                                    className="w-full border rounded px-2 py-1"
                                                                                                                                                />
                                                                                                                                            </div>
                                                                                                                                            <div>
                                                                                                                                                <label className="block text-xs text-slate-700">
                                                                                                                                                    Duration
                                                                                                                                                </label>
                                                                                                                                                <input
                                                                                                                                                    type="time"
                                                                                                                                                    value={
                                                                                                                                                        a.duration ||
                                                                                                                                                        ""
                                                                                                                                                    }
                                                                                                                                                    onChange={(
                                                                                                                                                        e,
                                                                                                                                                    ) =>
                                                                                                                                                        updateField(
                                                                                                                                                            a.id,
                                                                                                                                                            "duration",
                                                                                                                                                            e
                                                                                                                                                                .target
                                                                                                                                                                .value,
                                                                                                                                                        )
                                                                                                                                                    }
                                                                                                                                                    className="w-full border rounded px-2 py-1"
                                                                                                                                                />
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                        <div className="col-span-12 md:col-span-9 space-y-3">
                                                                                                                                            <div className="grid md:grid-cols-2 gap-3">
                                                                                                                                                <div>
                                                                                                                                                    <label className="block text-xs text-slate-700">
                                                                                                                                                        Task
                                                                                                                                                    </label>
                                                                                                                                                    <input
                                                                                                                                                        value={
                                                                                                                                                            a.task_id ||
                                                                                                                                                            ""
                                                                                                                                                        }
                                                                                                                                                        onChange={(
                                                                                                                                                            e,
                                                                                                                                                        ) =>
                                                                                                                                                            updateField(
                                                                                                                                                                a.id,
                                                                                                                                                                "task_id",
                                                                                                                                                                e
                                                                                                                                                                    .target
                                                                                                                                                                    .value,
                                                                                                                                                            )
                                                                                                                                                        }
                                                                                                                                                        placeholder="Task"
                                                                                                                                                        className="w-full border rounded px-2 py-1"
                                                                                                                                                    />
                                                                                                                                                </div>
                                                                                                                                                <div>
                                                                                                                                                    <label className="block text-xs text-slate-700">
                                                                                                                                                        Goal
                                                                                                                                                    </label>
                                                                                                                                                    <input
                                                                                                                                                        value={
                                                                                                                                                            a.goal_id ||
                                                                                                                                                            ""
                                                                                                                                                        }
                                                                                                                                                        onChange={(
                                                                                                                                                            e,
                                                                                                                                                        ) =>
                                                                                                                                                            updateField(
                                                                                                                                                                a.id,
                                                                                                                                                                "goal_id",
                                                                                                                                                                e
                                                                                                                                                                    .target
                                                                                                                                                                    .value,
                                                                                                                                                            )
                                                                                                                                                        }
                                                                                                                                                        placeholder="Goal"
                                                                                                                                                        className="w-full border rounded px-2 py-1"
                                                                                                                                                    />
                                                                                                                                                </div>
                                                                                                                                            </div>
                                                                                                                                            <div className="grid md:grid-cols-2 gap-3">
                                                                                                                                                <div>
                                                                                                                                                    <label className="block text-xs text-slate-700">
                                                                                                                                                        Priority
                                                                                                                                                    </label>
                                                                                                                                                    <select
                                                                                                                                                        value={
                                                                                                                                                            a.priority ||
                                                                                                                                                            2
                                                                                                                                                        }
                                                                                                                                                        onChange={(
                                                                                                                                                            e,
                                                                                                                                                        ) =>
                                                                                                                                                            updateField(
                                                                                                                                                                a.id,
                                                                                                                                                                "priority",
                                                                                                                                                                Number(
                                                                                                                                                                    e
                                                                                                                                                                        .target
                                                                                                                                                                        .value,
                                                                                                                                                                ),
                                                                                                                                                            )
                                                                                                                                                        }
                                                                                                                                                        className="w-full border rounded px-2 py-1"
                                                                                                                                                    >
                                                                                                                                                        <option
                                                                                                                                                            value={
                                                                                                                                                                3
                                                                                                                                                            }
                                                                                                                                                        >
                                                                                                                                                            High
                                                                                                                                                        </option>
                                                                                                                                                        <option
                                                                                                                                                            value={
                                                                                                                                                                2
                                                                                                                                                            }
                                                                                                                                                        >
                                                                                                                                                            Normal
                                                                                                                                                        </option>
                                                                                                                                                        <option
                                                                                                                                                            value={
                                                                                                                                                                1
                                                                                                                                                            }
                                                                                                                                                        >
                                                                                                                                                            Low
                                                                                                                                                        </option>
                                                                                                                                                    </select>
                                                                                                                                                </div>
                                                                                                                                                <div>
                                                                                                                                                    <label className="block text-xs text-slate-700">
                                                                                                                                                        Responsible
                                                                                                                                                    </label>
                                                                                                                                                    <input
                                                                                                                                                        value={
                                                                                                                                                            a.responsible ||
                                                                                                                                                            ""
                                                                                                                                                        }
                                                                                                                                                        onChange={(
                                                                                                                                                            e,
                                                                                                                                                        ) =>
                                                                                                                                                            updateField(
                                                                                                                                                                a.id,
                                                                                                                                                                "responsible",
                                                                                                                                                                e
                                                                                                                                                                    .target
                                                                                                                                                                    .value,
                                                                                                                                                            )
                                                                                                                                                        }
                                                                                                                                                        placeholder="Responsible"
                                                                                                                                                        className="w-full border rounded px-2 py-1"
                                                                                                                                                    />
                                                                                                                                                </div>
                                                                                                                                            </div>
                                                                                                                                            <div>
                                                                                                                                                <label className="block text-xs text-slate-700">
                                                                                                                                                    Notes
                                                                                                                                                </label>
                                                                                                                                                <textarea
                                                                                                                                                    value={
                                                                                                                                                        a.notes ||
                                                                                                                                                        ""
                                                                                                                                                    }
                                                                                                                                                    onChange={(
                                                                                                                                                        e,
                                                                                                                                                    ) =>
                                                                                                                                                        updateField(
                                                                                                                                                            a.id,
                                                                                                                                                            "notes",
                                                                                                                                                            e
                                                                                                                                                                .target
                                                                                                                                                                .value,
                                                                                                                                                        )
                                                                                                                                                    }
                                                                                                                                                    className="w-full border rounded px-2 py-1 min-h-[88px]"
                                                                                                                                                />
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                )}
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    ),
                                                                                                                )}
                                                                                                            </div>
                                                                                                        )}
                                                                                                        {/* Add new */}
                                                                                                        <InlineAddActivity
                                                                                                            onAdd={
                                                                                                                addNew
                                                                                                            }
                                                                                                        />
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
                                                <p className="text-sm text-slate-700 ml-2">
                                                    This Key Area is read-only (cannot edit or delete).
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredKAs.map((ka) => (
                                            <div
                                                key={ka.id}
                                                className="bg-white rounded-2xl shadow border border-slate-200 p-4 flex flex-col"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-lg font-bold text-slate-900">
                                                                {ka.title}
                                                            </h3>
                                                            {ka.is_default && (
                                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                                    <FaLock /> Locked
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                                            {ka.description || "—"}
                                                        </p>
                                                        <p className="text-xs text-slate-700 mt-2">
                                                            Position: {ka.position}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex items-center gap-2">
                                                    <button
                                                        className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-2 py-1 text-sm border border-slate-200"
                                                        onClick={() => openKA(ka)}
                                                    >
                                                        <FaListUl /> Open Lists
                                                    </button>
                                                    <button
                                                        className="rounded-lg bg-white font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 px-2 py-1 text-sm border border-slate-200"
                                                        onClick={() => {
                                                            setEditing(ka);
                                                            setShowForm(true);
                                                        }}
                                                    >
                                                        <FaEdit /> Edit
                                                    </button>
                                                    <button
                                                        disabled={ka.is_default}
                                                        className={`rounded-lg font-semibold flex items-center gap-2 px-2 py-1 text-sm border border-slate-200 ${
                                                            ka.is_default
                                                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                                                : "bg-white border text-red-600 hover:bg-red-50"
                                                        }`}
                                                        onClick={() => onDeleteKA(ka)}
                                                    >
                                                        <FaTrash /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
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
                                            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xl w-[92vw] max-w-3xl max-h-[85vh] overflow-auto"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <h2 className="text-lg font-bold text-slate-900">New Task</h2>
                                                <button
                                                    type="button"
                                                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                                                    onClick={() => setShowTaskComposer(false)}
                                                    aria-label="Close"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                            <form onSubmit={onCreateTask}>
                                                <div className="grid md:grid-cols-2 gap-6">
                                                    {/* Left column: Title + Extra info */}
                                                    <div className="flex flex-col gap-4">
                                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                            <label className="text-sm font-semibold text-slate-900 block">
                                                                Task Title *
                                                            </label>
                                                            <input
                                                                name="title"
                                                                required
                                                                value={taskForm.title}
                                                                onChange={(e) =>
                                                                    setTaskForm((s) => ({
                                                                        ...s,
                                                                        title: e.target.value,
                                                                    }))
                                                                }
                                                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                                placeholder="e.g., Draft Q3 campaign brief"
                                                            />
                                                        </div>

                                                        <div className="grid gap-4">
                                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                                <label className="text-sm font-semibold text-slate-900">
                                                                    Tags (comma separated)
                                                                </label>
                                                                <input
                                                                    name="tags"
                                                                    value={taskForm.tags}
                                                                    onChange={(e) =>
                                                                        setTaskForm((s) => ({
                                                                            ...s,
                                                                            tags: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                                    placeholder="e.g., q3,campaign,urgent"
                                                                />
                                                            </div>

                                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                                <label className="text-sm font-semibold text-slate-900">
                                                                    Start Date
                                                                </label>
                                                                <input
                                                                    name="start_date"
                                                                    type="date"
                                                                    value={toDateOnly(taskForm.start_date)}
                                                                    onChange={(e) =>
                                                                        setTaskForm((s) => ({
                                                                            ...s,
                                                                            start_date: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                                />
                                                            </div>

                                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                                <label className="text-sm font-semibold text-slate-900">
                                                                    Deadline
                                                                </label>
                                                                <input
                                                                    name="deadline"
                                                                    type="date"
                                                                    value={toDateOnly(taskForm.deadline)}
                                                                    onChange={(e) =>
                                                                        setTaskForm((s) => ({
                                                                            ...s,
                                                                            deadline: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                                />
                                                            </div>

                                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                                <label className="text-sm font-semibold text-slate-900">
                                                                    Planned End
                                                                </label>
                                                                <input
                                                                    name="end_date"
                                                                    type="date"
                                                                    value={toDateOnly(taskForm.end_date)}
                                                                    onChange={(e) =>
                                                                        setTaskForm((s) => ({
                                                                            ...s,
                                                                            end_date: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                                />
                                                            </div>

                                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                                <label className="text-sm font-semibold text-slate-900">
                                                                    Recurrence
                                                                </label>
                                                                <input
                                                                    name="recurrence"
                                                                    value={taskForm.recurrence}
                                                                    onChange={(e) =>
                                                                        setTaskForm((s) => ({
                                                                            ...s,
                                                                            recurrence: e.target.value,
                                                                        }))
                                                                    }
                                                                    className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                                    placeholder='e.g., {"freq":"weekly","interval":1}'
                                                                />
                                                            </div>

                                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                                <label className="text-sm font-semibold text-slate-900">
                                                                    Attachments
                                                                </label>
                                                                <div className="mt-1">
                                                                    <input
                                                                        ref={(el) =>
                                                                            (window.__composerModalFileInput = el)
                                                                        }
                                                                        name="attachments_files"
                                                                        type="file"
                                                                        multiple
                                                                        onChange={(e) => {
                                                                            const incoming = Array.from(
                                                                                e.target.files || [],
                                                                            );
                                                                            setTaskForm((s) => {
                                                                                const existing =
                                                                                    s.attachmentsFiles || [];
                                                                                const combined = [
                                                                                    ...existing,
                                                                                    ...incoming,
                                                                                ];
                                                                                const uniq = Array.from(
                                                                                    new Map(
                                                                                        combined.map((f) => [
                                                                                            f.name,
                                                                                            f,
                                                                                        ]),
                                                                                    ).values(),
                                                                                );
                                                                                return { ...s, attachmentsFiles: uniq };
                                                                            });
                                                                        }}
                                                                        className="hidden"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            window.__composerModalFileInput &&
                                                                            window.__composerModalFileInput.click()
                                                                        }
                                                                        className="px-3 py-2 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                                                    >
                                                                        Choose files
                                                                    </button>
                                                                </div>
                                                                {taskForm.attachmentsFiles &&
                                                                taskForm.attachmentsFiles.length > 0 ? (
                                                                    <ul className="mt-2 space-y-1 text-sm">
                                                                        {taskForm.attachmentsFiles.map((f, i) => (
                                                                            <li
                                                                                key={i}
                                                                                className="flex items-center justify-between bg-white p-2 rounded border border-slate-100"
                                                                            >
                                                                                <span className="truncate">
                                                                                    {f.name}
                                                                                </span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        setTaskForm((s) => ({
                                                                                            ...s,
                                                                                            attachmentsFiles:
                                                                                                s.attachmentsFiles.filter(
                                                                                                    (_, idx) =>
                                                                                                        idx !== i,
                                                                                                ),
                                                                                        }))
                                                                                    }
                                                                                    className="text-xs rounded-lg text-slate-500 ml-2"
                                                                                >
                                                                                    Remove
                                                                                </button>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                ) : null}
                                                                {/* storage picker removed */}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right column: Meta + reordered fields per request */}
                                                    <div className="flex flex-col gap-4">
                                                        <div>
                                                            <div className="grid md:grid-cols-2 gap-4">
                                                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                                    <label className="text-sm font-semibold text-slate-900">
                                                                        List (Tab)
                                                                    </label>
                                                                    <input
                                                                        name="list_index"
                                                                        type="number"
                                                                        min={1}
                                                                        value={taskForm.list_index}
                                                                        onChange={(e) =>
                                                                            setTaskForm((s) => ({
                                                                                ...s,
                                                                                list_index: Number(e.target.value || 1),
                                                                            }))
                                                                        }
                                                                        className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                            <label className="text-sm font-semibold text-slate-900">
                                                                Category
                                                            </label>
                                                            <select
                                                                name="category"
                                                                value={taskForm.category}
                                                                onChange={(e) =>
                                                                    setTaskForm((s) => ({
                                                                        ...s,
                                                                        category: e.target.value,
                                                                    }))
                                                                }
                                                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                            >
                                                                <option>Key Areas</option>
                                                                <option>Don’t Forget</option>
                                                            </select>
                                                        </div>

                                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                            <label className="text-sm font-semibold text-slate-900">
                                                                Linked Goal (optional)
                                                            </label>
                                                            <select
                                                                name="goal_id"
                                                                value={taskForm.goal_id}
                                                                onChange={(e) =>
                                                                    setTaskForm((s) => ({
                                                                        ...s,
                                                                        goal_id: e.target.value,
                                                                    }))
                                                                }
                                                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                            >
                                                                <option value="">— None (Activity Trap) —</option>
                                                                {goals.map((g) => (
                                                                    <option key={g.id} value={g.id}>
                                                                        {g.title}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                            <label className="text-sm font-semibold text-slate-900">
                                                                Assignee
                                                            </label>
                                                            <input
                                                                name="assignee"
                                                                value={taskForm.assignee}
                                                                onChange={(e) =>
                                                                    setTaskForm((s) => ({
                                                                        ...s,
                                                                        assignee: e.target.value,
                                                                    }))
                                                                }
                                                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                                placeholder="Name or ID"
                                                            />
                                                        </div>

                                                        <div>
                                                            <div className="grid md:grid-cols-2 gap-4">
                                                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                                    <label className="text-sm font-semibold text-slate-900">
                                                                        Status
                                                                    </label>
                                                                    <select
                                                                        name="status"
                                                                        value={taskForm.status}
                                                                        onChange={(e) =>
                                                                            setTaskForm((s) => ({
                                                                                ...s,
                                                                                status: e.target.value,
                                                                            }))
                                                                        }
                                                                        className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                                    >
                                                                        <option value="open">Open</option>
                                                                        <option value="in_progress">In Progress</option>
                                                                        <option value="done">Done</option>
                                                                        <option value="cancelled">Cancelled</option>
                                                                    </select>
                                                                </div>

                                                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                                    <label className="text-sm font-semibold text-slate-900">
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
                                                                        className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                                    >
                                                                        <option value="low">Low</option>
                                                                        <option value="med">Medium</option>
                                                                        <option value="high">High</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                            <label className="text-sm font-semibold text-slate-900 block">
                                                                Description
                                                            </label>
                                                            <textarea
                                                                name="description"
                                                                rows={3}
                                                                value={taskForm.description}
                                                                onChange={(e) =>
                                                                    setTaskForm((s) => ({
                                                                        ...s,
                                                                        description: e.target.value,
                                                                    }))
                                                                }
                                                                className="mt-2 w-full rounded-md border-0 bg-transparent p-2"
                                                                placeholder="Details…"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions (span both columns) */}
                                                <div className="mt-4 flex items-center gap-3 justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <button className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-2 py-1 text-sm border border-slate-200">
                                                            <FaSave /> Add Task
                                                        </button>
                                                        <span className="text-xs text-slate-700 flex items-center gap-1">
                                                            <FaExclamationCircle /> Tasks must belong to the current Key
                                                            Area.
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowTaskComposer(false)}
                                                            className="rounded-lg text-sm text-slate-600 hover:underline"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            </form>
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
                                                className="mt-1 w-full rounded-lg border-slate-300 focus:ring-2 focus:ring-slate-400"
                                                placeholder="e.g., Finance"
                                            />
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
