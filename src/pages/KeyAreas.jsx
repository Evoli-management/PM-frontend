// src/pages/KeyAreas.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
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
} from "react-icons/fa";

/* ------------------------------ Helpers/UI ------------------------------ */
const Chip = ({ children }) => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
        {children}
    </span>
);

function StatusIndicator({ status }) {
    const color =
        status === "done"
            ? "bg-green-500"
            : status === "in_progress"
              ? "bg-amber-500"
              : status === "cancelled"
                ? "bg-red-500"
                : "bg-slate-400";
    return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} title={`Status: ${status}`} />;
}

const PriorityBadge = ({ priority = "med" }) => {
    const map = {
        low: "bg-emerald-100 text-emerald-700",
        med: "bg-amber-100 text-amber-700",
        high: "bg-red-100 text-red-700",
    };
    return (
        <span
            className={`px-1.5 py-0.5 rounded text-xs font-semibold ${map[priority] || "bg-slate-100 text-slate-700"}`}
        >
            {priority}
        </span>
    );
};

const QuadrantBadge = ({ q }) => {
    const label = q ? `Q${q}` : "—";
    const map = {
        1: "bg-red-100 text-red-700",
        2: "bg-green-100 text-green-700",
        3: "bg-yellow-100 text-yellow-700",
        4: "bg-slate-100 text-slate-700",
    };
    return (
        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${map[q] || "bg-slate-100 text-slate-700"}`}>
            {label}
        </span>
    );
};

const EmptyState = ({ title = "Nothing here", hint = "" }) => (
    <div className="text-sm text-slate-600 py-8 text-center">
        <div className="font-semibold text-slate-800">{title}</div>
        {hint ? <div className="text-slate-500 mt-1">{hint}</div> : null}
    </div>
);

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

// Minimal localStorage-backed API for this page
const api = {
    async listKeyAreas() {
        try {
            const raw = localStorage.getItem("pm:keyareas");
            const cached = raw ? JSON.parse(raw) : [];
            if (Array.isArray(cached) && cached.length) return cached;
            const seed = [
                { id: 1, title: "Marketing", description: "Grow brand and leads", position: 1 },
                { id: 2, title: "Sales", description: "Close deals", position: 2 },
                { id: 3, title: "Product", description: "Build and ship", position: 3 },
                { id: 10, title: "Ideas", description: "Locked ideas slot", position: 10, is_default: true },
            ];
            try {
                localStorage.setItem("pm:keyareas", JSON.stringify(seed));
            } catch (e) {}
            return seed;
        } catch {
            return [];
        }
    },
    async listGoals() {
        return [];
    },
    async updateKeyArea(id, data) {
        const raw = (await this.listKeyAreas()) || [];
        const next = raw.map((k) => (String(k.id) === String(id) ? { ...k, ...data } : k));
        localStorage.setItem("pm:keyareas", JSON.stringify(next));
        return next.find((k) => String(k.id) === String(id)) || data;
    },
    async createKeyArea(data) {
        const raw = (await this.listKeyAreas()) || [];
        const item = { id: data.id || Date.now(), ...data };
        const next = [...raw, item];
        localStorage.setItem("pm:keyareas", JSON.stringify(next));
        return item;
    },
    async deleteKeyArea(id) {
        const raw = (await this.listKeyAreas()) || [];
        const next = raw.filter((k) => String(k.id) !== String(id));
        localStorage.setItem("pm:keyareas", JSON.stringify(next));
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
const KanbanView = ({ tasks = [], onSelect }) => (
    <div className="p-4 border border-dashed rounded-lg text-sm text-slate-600">
        Kanban view (placeholder). {tasks.length} tasks. Clicks will open details.
        <div className="mt-2 flex flex-wrap gap-2">
            {tasks.map((t) => (
                <button
                    key={t.id}
                    onClick={() => onSelect && onSelect(t)}
                    className="px-2 py-1 bg-white border rounded shadow-sm"
                >
                    {t.title}
                </button>
            ))}
        </div>
    </div>
);

const CalendarView = ({ tasks = [], onSelect }) => (
    <div className="p-4 border border-dashed rounded-lg text-sm text-slate-600">
        Calendar view (placeholder). {tasks.length} tasks.
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {tasks.map((t) => (
                <button
                    key={t.id}
                    onClick={() => onSelect && onSelect(t)}
                    className="px-2 py-1 bg-white border rounded shadow-sm text-left"
                >
                    <div className="font-semibold truncate">{t.title}</div>
                    <div className="text-xs text-slate-500">{toDateOnly(t.deadline) || "—"}</div>
                </button>
            ))}
        </div>
    </div>
);

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

        setActiveTab(initialTab || "details");
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
    }, [task, initialTab]);

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
        const item = { id: Date.now(), text, createdAt: new Date().toISOString() };
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

                    {/* Tabs: Details (default) and Activities */}
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

                    {activeTab === "details" ? (
                        <form onSubmit={submit} className="p-4 max-h-[80vh] overflow-auto">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                        <label className="text-sm font-semibold text-slate-900">Title</label>
                                        <input
                                            required
                                            value={form.title || ""}
                                            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                                            className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                        <label className="text-sm font-semibold text-slate-900">Tags</label>
                                        <input
                                            value={form.tags || ""}
                                            onChange={(e) => setForm((s) => ({ ...s, tags: e.target.value }))}
                                            className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                            placeholder="e.g., q3,campaign"
                                            disabled={readOnly}
                                        />
                                    </div>

                                    <div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                            <label className="text-sm font-semibold text-slate-900">Start Date</label>
                                            <input
                                                type="date"
                                                value={toDateOnly(form.start_date)}
                                                onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))}
                                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                disabled={readOnly}
                                            />
                                        </div>

                                        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                            <label className="text-sm font-semibold text-slate-900">Deadline</label>
                                            <input
                                                type="date"
                                                value={toDateOnly(form.deadline)}
                                                onChange={(e) => setForm((s) => ({ ...s, deadline: e.target.value }))}
                                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                disabled={readOnly}
                                            />
                                        </div>

                                        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                            <label className="text-sm font-semibold text-slate-900">Planned End</label>
                                            <input
                                                type="date"
                                                value={toDateOnly(form.end_date)}
                                                onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))}
                                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                disabled={readOnly}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                        <label className="text-sm font-semibold text-slate-900">Recurrence</label>
                                        <input
                                            value={form.recurrence || ""}
                                            onChange={(e) => setForm((s) => ({ ...s, recurrence: e.target.value }))}
                                            className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                            placeholder='e.g., {"freq":"weekly","interval":1}'
                                        />
                                    </div>

                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                        <label className="text-sm font-semibold text-slate-900">Attachments</label>
                                        <div className="mt-1">
                                            <input
                                                ref={(el) => (window.__composerFileInput = el)}
                                                type="file"
                                                multiple
                                                name="attachments_files"
                                                onChange={(e) => {
                                                    const incoming = Array.from(e.target.files || []);
                                                    setForm((s) => {
                                                        const existing = s.attachmentsFiles || [];
                                                        const combined = [...existing, ...incoming];
                                                        const uniq = Array.from(
                                                            new Map(combined.map((f) => [f.name, f])).values(),
                                                        );
                                                        return { ...s, attachmentsFiles: uniq };
                                                    });
                                                }}
                                                className="hidden"
                                            />
                                            {!readOnly && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        window.__composerFileInput && window.__composerFileInput.click()
                                                    }
                                                    className="px-3 py-2 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                                >
                                                    Choose files
                                                </button>
                                            )}
                                        </div>
                                        {/* show selected files */}
                                        {form.attachmentsFiles && form.attachmentsFiles.length > 0 ? (
                                            <ul className="mt-2 space-y-1 text-sm">
                                                {form.attachmentsFiles.map((f, i) => (
                                                    <li
                                                        key={i}
                                                        className="flex items-center justify-between bg-white p-2 rounded border border-slate-100"
                                                    >
                                                        <span className="truncate">{f.name}</span>
                                                        {!readOnly && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setForm((s) => ({
                                                                        ...s,
                                                                        attachmentsFiles: s.attachmentsFiles.filter(
                                                                            (_, idx) => idx !== i,
                                                                        ),
                                                                    }))
                                                                }
                                                                className="text-xs rounded-lg text-slate-500 ml-2"
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : null}
                                        {/* storage picker removed */}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="grid md:grid-cols-2 gap-2">
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                            <label className="text-sm font-semibold text-slate-900">Status</label>
                                            <select
                                                value={form.status || "open"}
                                                onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                            >
                                                <option value="open">Open</option>
                                                <option value="in_progress">In Progress</option>
                                                <option value="done">Done</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>

                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                            <label className="text-sm font-semibold text-slate-900">Priority</label>
                                            <select
                                                value={form.priority || "med"}
                                                onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))}
                                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                            >
                                                <option value="low">Low</option>
                                                <option value="med">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-2">
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                            <label className="text-sm font-semibold text-slate-900">List (Tab)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={form.list_index || 1}
                                                onChange={(e) =>
                                                    setForm((s) => ({ ...s, list_index: Number(e.target.value) }))
                                                }
                                                className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                        <label className="text-sm font-semibold text-slate-900">Linked Goal</label>
                                        <select
                                            value={form.goal_id || ""}
                                            onChange={(e) =>
                                                setForm((s) => ({ ...s, goal_id: e.target.value || null }))
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
                                        <label className="text-sm font-semibold text-slate-900">Assignee</label>
                                        <input
                                            value={form.assignee || ""}
                                            onChange={(e) => setForm((s) => ({ ...s, assignee: e.target.value }))}
                                            className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                            placeholder="Name or ID"
                                        />
                                    </div>

                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                        <label className="text-sm font-semibold text-slate-900">Description</label>
                                        <textarea
                                            rows={3}
                                            value={form.description || ""}
                                            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                                            className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2">
                                {!readOnly && (
                                    <>
                                        <button className="rounded-lg bg-blue-600 text-white flex items-center gap-2 px-2 py-1 text-sm border border-slate-200">
                                            <FaSave /> Save
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (confirm("Delete this task?")) onDelete(task);
                                            }}
                                            className="rounded-lg bg-white border border-slate-200 text-red-600 hover:bg-red-50 px-2 py-1 text-sm"
                                        >
                                            <FaTrash /> Delete
                                        </button>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="ml-auto rounded-lg text-sm text-slate-700 hover:underline"
                                >
                                    Close
                                </button>
                            </div>
                        </form>
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

                                    <input
                                        value={newActivity}
                                        onChange={(e) => setNewActivity(e.target.value)}
                                        placeholder="Activity name..."
                                        className="flex-1 p-2 border rounded text-sm"
                                    />
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
                                                            {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
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

    const addActivity = (text) => {
        const t = (text || "").trim();
        if (!t) return;
        const item = { id: Date.now(), text: t, createdAt: new Date().toISOString() };
        const next = [...list, item];
        onUpdateActivities && onUpdateActivities(String(task.id), next);
    };
    const removeActivity = (id) => {
        const next = list.filter((a) => a.id !== id);
        onUpdateActivities && onUpdateActivities(String(task.id), next);
    };
    const clearActivities = () => {
        if (!confirm("Clear all activities for this task?")) return;
        onUpdateActivities && onUpdateActivities(String(task.id), []);
    };

    const save = async () => {
        if (readOnly) return;
        const payload = {
            ...form,
            start_date: form.start_date ? toDateOnly(form.start_date) : null,
            deadline: form.deadline ? toDateOnly(form.deadline) : null,
            end_date: form.end_date ? toDateOnly(form.end_date) : null,
        };
        onSave && (await onSave(payload));
        setIsEditing(false);
    };

    const markDone = async () => {
        if (!task) return;
        const upd = { ...task, status: "done" };
        onSave && (await onSave(upd));
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 p-4 border-b border-slate-200">
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                        aria-label="Back to list"
                        style={{ minWidth: 36, minHeight: 36 }}
                        onClick={onBack}
                    >
                        <FaChevronLeft />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate" title={task.title}>
                            {task.title}
                        </h1>
                        {kaTitle ? <div className="text-xs text-slate-500 truncate">in {kaTitle}</div> : null}
                    </div>
                </div>
                <div className="relative" ref={menuRef}>
                    <button
                        className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50"
                        aria-haspopup="menu"
                        aria-expanded={menuOpen ? "true" : "false"}
                        onClick={() => setMenuOpen((s) => !s)}
                        title="Task menu"
                    >
                        <FaEllipsisV />
                    </button>
                    {menuOpen && (
                        <div
                            role="menu"
                            className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-10"
                        >
                            <div className="py-1">
                                <button
                                    role="menuitem"
                                    className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setTab("details");
                                        setMenuOpen(false);
                                    }}
                                >
                                    View details
                                </button>
                                <button
                                    role="menuitem"
                                    className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setTab("activities");
                                        setMenuOpen(false);
                                    }}
                                >
                                    Show activities
                                </button>
                                {/* Mark as done removed per request */}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Label row: show current tab label outside the menu */}
            <div className="px-4 pt-3 border-b border-slate-200 bg-white">
                <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg px-3 py-1">
                    <span className="text-sm font-semibold text-slate-800 select-none">
                        {tab === "details" ? "Details" : "Activities"}
                    </span>
                </div>
            </div>

            {/* Body */}
            {tab === "activities" ? (
                <div className="p-4">
                    {list.length === 0 ? (
                        <div className="text-sm text-slate-500">No activities yet.</div>
                    ) : (
                        <ul className="space-y-2">
                            {list.map((a) => (
                                <li
                                    key={a.id}
                                    className="text-sm text-slate-800 flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2"
                                >
                                    <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    <div className="flex-1">
                                        <div className="leading-5">{a.text}</div>
                                        {a.createdAt ? (
                                            <div className="text-[11px] text-slate-500">
                                                {new Date(a.createdAt).toLocaleString()}
                                            </div>
                                        ) : null}
                                    </div>
                                    <button
                                        className="text-xs text-slate-600 hover:underline"
                                        onClick={() => removeActivity(a.id)}
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                        <input
                            className="flex-1 px-3 py-2 border rounded-lg bg-white"
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
                                <input
                                    className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-700"
                                    value={isEditing && !readOnly ? (form.title ?? "") : (task.title ?? "")}
                                    onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
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
    const toggleActivitiesRow = (id) => {
        setExpandedActivityRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Activities associated to tasks: { [taskIdOrNew]: [{ id, text, createdAt }] }
    const [activitiesByTask, setActivitiesByTask] = useState({});
    const [activityTaskId, setActivityTaskId] = useState("new");
    const [activityName, setActivityName] = useState("");

    // load persisted activities
    useEffect(() => {
        try {
            const raw = localStorage.getItem("pm:kaActivities");
            if (raw) setActivitiesByTask(JSON.parse(raw));
        } catch (e) {}
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem("pm:kaActivities", JSON.stringify(activitiesByTask));
        } catch (e) {}
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
        const firstNonIdeas = sorted.find(
            (k) => !((k.title || "").toLowerCase() === "ideas" || k.is_default || k.position === 10),
        );
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
            const found = keyAreas.find((k) => k.title?.toLowerCase() === "ideas" || k.position === 10);
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
                    position: 10,
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
            return keyAreas.filter((k) => (k.title || "").toLowerCase() === "ideas" || k.position === 10);
        }

        // Default Key Areas listing: exclude Ideas slot (position 10 or title 'Ideas') unless user filtered for it
        const base = keyAreas.filter((k) => (k.title || "").toLowerCase() !== "ideas" && k.position !== 10);
        if (!q) return base;
        return base.filter((k) => k.title.toLowerCase().includes(q) || (k.description || "").toLowerCase().includes(q));
    }, [keyAreas, filter]);

    const paramsForRender = new URLSearchParams(location.search);
    const showOnlyIdeas = paramsForRender.get("select") === "ideas";
    const ideaForShow = keyAreas.find((k) => (k.title || "").toLowerCase() === "ideas") ||
        keyAreas.find((k) => k.position === 10) || {
            id: "ideas-synth",
            title: "Ideas",
            description: "Locked ideas slot",
            position: 10,
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
        setSelectedKA(ka);
        const t = await api.listTasks(ka.id);
        setAllTasks(t);
        setTaskTab(1);
        setSearchTerm("");
        setQuadrant("all");
        setView("list");
        setShowTaskComposer(false);
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
        // Reset bulk form and selection
        setBulkForm({ assignee: "", status: "", priority: "", start_date: "", deadline: "", end_date: "" });
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
            <div className="flex w-full overflow-hidden">
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

                                    {/* Show selected KA title inline next to Back */}
                                    {selectedKA && (
                                        <span className="text-base md:text-lg font-bold text-slate-900 truncate">
                                            {selectedKA.title}
                                        </span>
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4 md:col-span-2">
                                        {/* Task Lists card with list buttons + Add Task inside */}
                                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                                            <div className="flex items-center justify-between gap-2 mb-3">
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
                                                                            {/* Backdrop to behave like popup */}
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

                                                {/* Add Task moved into the three-dots menu per list */}
                                            </div>

                                            {/* Render the tasks list directly below the tabs row when in List view */}
                                            {view === "list" && (
                                                <div className="pt-2 border-t border-slate-100">
                                                    {selectedIds.size > 0 && (
                                                        <form
                                                            onSubmit={applyBulkEdit}
                                                            className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                                                            aria-label="Mass edit selected tasks"
                                                        >
                                                            <div className="flex items-center flex-wrap gap-2">
                                                                <div className="text-sm font-semibold text-amber-900 mr-2">
                                                                    Mass edit ({selectedIds.size} selected):
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <label
                                                                        htmlFor="bulk-assignee"
                                                                        className="text-[11px] leading-3 text-slate-600 font-medium"
                                                                    >
                                                                        Assignee
                                                                    </label>
                                                                    <input
                                                                        id="bulk-assignee"
                                                                        value={bulkForm.assignee}
                                                                        onChange={(e) =>
                                                                            setBulkForm((s) => ({
                                                                                ...s,
                                                                                assignee: e.target.value,
                                                                            }))
                                                                        }
                                                                        className="px-2 py-1 border rounded text-sm bg-white"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <label
                                                                        htmlFor="bulk-status"
                                                                        className="text-[11px] leading-3 text-slate-600 font-medium"
                                                                    >
                                                                        Status
                                                                    </label>
                                                                    <select
                                                                        id="bulk-status"
                                                                        value={bulkForm.status}
                                                                        onChange={(e) =>
                                                                            setBulkForm((s) => ({
                                                                                ...s,
                                                                                status: e.target.value,
                                                                            }))
                                                                        }
                                                                        className="px-2 py-1 border rounded text-sm bg-white"
                                                                    >
                                                                        <option value="">Status…</option>
                                                                        <option value="open">Open</option>
                                                                        <option value="in_progress">In Progress</option>
                                                                        <option value="done">Done</option>
                                                                        <option value="cancelled">Cancelled</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <label
                                                                        htmlFor="bulk-priority"
                                                                        className="text-[11px] leading-3 text-slate-600 font-medium"
                                                                    >
                                                                        Priority
                                                                    </label>
                                                                    <select
                                                                        id="bulk-priority"
                                                                        value={bulkForm.priority}
                                                                        onChange={(e) =>
                                                                            setBulkForm((s) => ({
                                                                                ...s,
                                                                                priority: e.target.value,
                                                                            }))
                                                                        }
                                                                        className="px-2 py-1 border rounded text-sm bg-white"
                                                                    >
                                                                        <option value="">Priority…</option>
                                                                        <option value="low">Low</option>
                                                                        <option value="med">Medium</option>
                                                                        <option value="high">High</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <label
                                                                        htmlFor="bulk-start"
                                                                        className="text-[11px] leading-3 text-slate-600 font-medium"
                                                                    >
                                                                        Start Date
                                                                    </label>
                                                                    <input
                                                                        id="bulk-start"
                                                                        type="date"
                                                                        value={bulkForm.start_date}
                                                                        onChange={(e) =>
                                                                            setBulkForm((s) => ({
                                                                                ...s,
                                                                                start_date: e.target.value,
                                                                            }))
                                                                        }
                                                                        className="px-2 py-1 border rounded text-sm bg-white"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <label
                                                                        htmlFor="bulk-deadline"
                                                                        className="text-[11px] leading-3 text-slate-600 font-medium"
                                                                    >
                                                                        Deadline
                                                                    </label>
                                                                    <input
                                                                        id="bulk-deadline"
                                                                        type="date"
                                                                        value={bulkForm.deadline}
                                                                        onChange={(e) =>
                                                                            setBulkForm((s) => ({
                                                                                ...s,
                                                                                deadline: e.target.value,
                                                                            }))
                                                                        }
                                                                        className="px-2 py-1 border rounded text-sm bg-white"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <label
                                                                        htmlFor="bulk-end"
                                                                        className="text-[11px] leading-3 text-slate-600 font-medium"
                                                                    >
                                                                        Planned End
                                                                    </label>
                                                                    <input
                                                                        id="bulk-end"
                                                                        type="date"
                                                                        value={bulkForm.end_date}
                                                                        onChange={(e) =>
                                                                            setBulkForm((s) => ({
                                                                                ...s,
                                                                                end_date: e.target.value,
                                                                            }))
                                                                        }
                                                                        className="px-2 py-1 border rounded text-sm bg-white"
                                                                    />
                                                                </div>
                                                                <button className="ml-2 px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm">
                                                                    Apply
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={clearSelection}
                                                                    className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 text-sm hover:bg-slate-50"
                                                                >
                                                                    Clear
                                                                </button>
                                                            </div>
                                                        </form>
                                                    )}
                                                    {visibleTasks.length === 0 ? (
                                                        <EmptyState
                                                            title={`No tasks in List ${taskTab}`}
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
                                                                            Planned End
                                                                        </th>
                                                                        <th className="px-3 py-2 text-left font-semibold">
                                                                            Duration
                                                                        </th>
                                                                        <th
                                                                            className="px-3 py-2 text-center font-semibold w-16"
                                                                            title="Activities"
                                                                        >
                                                                            {/* Hamburger as column name */}
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
                                                                                    <line
                                                                                        x1="3"
                                                                                        y1="6"
                                                                                        x2="21"
                                                                                        y2="6"
                                                                                    />
                                                                                    <line
                                                                                        x1="3"
                                                                                        y1="12"
                                                                                        x2="21"
                                                                                        y2="12"
                                                                                    />
                                                                                    <line
                                                                                        x1="3"
                                                                                        y1="18"
                                                                                        x2="21"
                                                                                        y2="18"
                                                                                    />
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
                                                                                <tr className="border-t border-slate-200 hover:bg-slate-50">
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
                                                                                            <span
                                                                                                className={`mt-0.5 inline-block text-sm font-bold ${
                                                                                                    (t.priority ||
                                                                                                        "med") ===
                                                                                                    "high"
                                                                                                        ? "text-red-600"
                                                                                                        : (t.priority ||
                                                                                                                "med") ===
                                                                                                            "low"
                                                                                                          ? "text-emerald-600"
                                                                                                          : "text-amber-600"
                                                                                                }`}
                                                                                                title={`Priority: ${t.priority || "med"}`}
                                                                                            >
                                                                                                !
                                                                                            </span>
                                                                                            <button
                                                                                                className="text-blue-700 hover:underline font-semibold"
                                                                                                title="Click to open task"
                                                                                                onClick={() => {
                                                                                                    // Open full-page detail view instead of popup
                                                                                                    setSelectedTaskFull(
                                                                                                        t,
                                                                                                    );
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
                                                                                                status={
                                                                                                    t.status || "open"
                                                                                                }
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
                                                                                            priority={
                                                                                                t.priority || "med"
                                                                                            }
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
                                                                                        {toDateOnly(t.start_date) ||
                                                                                            "—"}
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
                                                                                                toggleActivitiesRow(
                                                                                                    t.id,
                                                                                                )
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
                                                                                        <td
                                                                                            colSpan={13}
                                                                                            className="px-3 py-2"
                                                                                        >
                                                                                            <div className="pl-8">
                                                                                                <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                                                                                                    Activities
                                                                                                </div>
                                                                                                {(() => {
                                                                                                    const list =
                                                                                                        activitiesByTask[
                                                                                                            String(t.id)
                                                                                                        ] || [];
                                                                                                    if (!list.length)
                                                                                                        return (
                                                                                                            <div className="text-sm text-slate-500">
                                                                                                                No
                                                                                                                activities
                                                                                                                yet.
                                                                                                            </div>
                                                                                                        );
                                                                                                    return (
                                                                                                        <ul className="space-y-1">
                                                                                                            {list.map(
                                                                                                                (a) => (
                                                                                                                    <li
                                                                                                                        key={
                                                                                                                            a.id
                                                                                                                        }
                                                                                                                        className="text-sm text-slate-800 flex items-start gap-2"
                                                                                                                    >
                                                                                                                        <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                                                                                        <div>
                                                                                                                            <div className="leading-5">
                                                                                                                                {
                                                                                                                                    a.text
                                                                                                                                }
                                                                                                                            </div>
                                                                                                                            {a.createdAt ? (
                                                                                                                                <div className="text-[11px] text-slate-500">
                                                                                                                                    {new Date(
                                                                                                                                        a.createdAt,
                                                                                                                                    ).toLocaleString()}
                                                                                                                                </div>
                                                                                                                            ) : null}
                                                                                                                        </div>
                                                                                                                    </li>
                                                                                                                ),
                                                                                                            )}
                                                                                                        </ul>
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
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Your activities card removed per request (now only inside the task slide-over > Activities tab) */}
                                    </div>

                                    {/* Summary card removed per request */}
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
                                                    <div className="px-3 py-3 text-sm text-slate-500">
                                                        No activities yet.
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
                                                            {a.createdAt ? (
                                                                <div className="text-xs text-slate-500 mt-0.5">
                                                                    {new Date(a.createdAt).toLocaleString()}
                                                                </div>
                                                            ) : null}
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

                                {view === "kanban" && (
                                    <KanbanView
                                        tasks={visibleTasks}
                                        onSelect={(t) => {
                                            setSelectedTaskFull(t);
                                            setTaskFullInitialTab("activities");
                                        }}
                                    />
                                )}
                                {view === "calendar" && (
                                    <CalendarView
                                        tasks={visibleTasks}
                                        onSelect={(t) => {
                                            setSelectedTaskFull(t);
                                            setTaskFullInitialTab("activities");
                                        }}
                                    />
                                )}
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
