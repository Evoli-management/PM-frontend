// src/pages/KeyAreas.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import Sidebar from "../components/shared/Sidebar";
import {
    FaPlus,
    FaLock,
    FaEdit,
    FaTrash,
    FaListUl,
    FaTags,
    FaExclamationCircle,
    FaArrowLeft,
    FaSearch,
    FaSave,
    FaTimes,
    FaChevronRight,
} from "react-icons/fa";

/* ------------------------------ Helpers/UI ------------------------------ */
const Chip = ({ children }) => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
        {children}
    </span>
);

// StoragePicker removed per user request

function RecurrenceInput({ value, onChange }) {
    const parsed = value ? JSON.parse(value) : { freq: "", interval: 1, byweekday: null };
    return (
        <div className="grid grid-cols-3 gap-2">
            <select
                value={parsed.freq || ""}
                onChange={(e) => onChange(JSON.stringify({ ...parsed, freq: e.target.value }))}
                className="rounded-md p-2 bg-slate-50 border border-slate-200"
            >
                <option value="">No repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
            </select>
            <input
                type="number"
                min={1}
                value={parsed.interval || 1}
                onChange={(e) => onChange(JSON.stringify({ ...parsed, interval: Number(e.target.value) }))}
                className="rounded-md p-2 bg-slate-50 border border-slate-200"
            />
            {parsed.freq === "weekly" ? (
                <select
                    value={parsed.byweekday || ""}
                    onChange={(e) => onChange(JSON.stringify({ ...parsed, byweekday: e.target.value || null }))}
                    className="rounded-md p-2 bg-slate-50 border border-slate-200"
                >
                    <option value="">Any day</option>
                    <option value="mon">Mon</option>
                    <option value="tue">Tue</option>
                    <option value="wed">Wed</option>
                    <option value="thu">Thu</option>
                    <option value="fri">Fri</option>
                    <option value="sat">Sat</option>
                    <option value="sun">Sun</option>
                </select>
            ) : (
                <div />
            )}
        </div>
    );
}

const EmptyState = ({ title = "No items yet", hint }) => (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
        <div className="text-slate-900 font-semibold">{title}</div>
        {hint && <div className="text-sm text-slate-600 mt-1">{hint}</div>}
    </div>
);

/* ------------------------------- Mocked API ------------------------------ */
const api = {
    listKeyAreas: async () => [
        { id: 1, title: "Marketing", description: "Campaigns & content", position: 1, is_default: false },
        { id: 2, title: "Support", description: "Tickets & FAQs", position: 2, is_default: false },
        { id: 10, title: "Ideas", description: "Scratchpad for thoughts", position: 10, is_default: true },
    ],
    createKeyArea: async (payload) => ({ ...payload, id: Math.random() }),
    updateKeyArea: async (id, payload) => ({ id, ...payload }),
    deleteKeyArea: async (id) => id,

    listGoals: async () => [
        { id: "g1", title: "Grow Sales Q1", parent_goal_id: null },
        { id: "g2", title: "Improve Customer Support", parent_goal_id: null },
        { id: "g3", title: "Revamp Website", parent_goal_id: "g1" },
    ],

    listTasks: async (keyAreaId) => [
        {
            id: 101,
            key_area_id: keyAreaId,
            title: "Welcome task",
            description: "Kickoff activity",
            status: "open",
            priority: "med",
            importance: "med",
            category: "Key Areas",
            list_index: 1,
            goal_id: null,
            deadline: null,
            end_date: null,
            eisenhower_quadrant: 2,
            tags: "onboarding,setup",
            recurrence: "",
            attachments: "",
            assignee: "user1",
        },
        {
            id: 102,
            key_area_id: keyAreaId,
            title: "Plan Q3 campaign",
            description: "Draft brief & assets",
            status: "in_progress",
            priority: "high",
            importance: "high",
            category: "Key Areas",
            list_index: 1,
            goal_id: "g1",
            deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
            end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString(),
            eisenhower_quadrant: 2,
            tags: "q3,campaign",
            recurrence: "",
            attachments: "https://example.com/brief.pdf",
            assignee: "maria",
        },
        {
            id: 103,
            key_area_id: keyAreaId,
            title: "Close June tickets",
            description: "Backlog triage",
            status: "done",
            priority: "low",
            importance: "low",
            category: "Don’t Forget",
            list_index: 2,
            goal_id: "g2",
            deadline: null,
            end_date: null,
            eisenhower_quadrant: 4,
            tags: "support,cleanup",
            recurrence: '{"freq":"weekly","interval":1}',
            attachments: "",
            assignee: "",
        },
    ],
    createTask: async (payload) => ({ ...payload, id: Math.floor(Math.random() * 100000) }),
    updateTask: async (id, payload) => ({ id, ...payload }),
    deleteTask: async (id) => id,
    // storage picker removed
};

/* -------------------------- Quadrant Calculation ------------------------- */
function computeEisenhowerQuadrant({ deadline, end_date, importance }) {
    const imp = (importance || "med").toLowerCase();
    const urgent = (() => {
        const ts = deadline || end_date;
        if (!ts) return false;
        const due = new Date(ts).getTime();
        const now = Date.now();
        const diffHours = (due - now) / (1000 * 60 * 60);
        return diffHours <= 48; // due within 48h → urgent
    })();
    if (imp === "high" && urgent) return 1;
    if (imp === "high" && !urgent) return 2;
    if (imp !== "high" && urgent) return 3;
    return 4;
}

/* ---------------------------- Inline Views ---------------------------- */
function KanbanView({ tasks, onSelect }) {
    const columns = [
        { key: "open", title: "To Do" },
        { key: "in_progress", title: "In Progress" },
        { key: "done", title: "Done" },
        { key: "cancelled", title: "Cancelled" },
    ];
    return (
        <div className="grid gap-4 md:grid-cols-4">
            {columns.map((col) => {
                const items = tasks.filter((t) => (t.status || "open") === col.key);
                return (
                    <div key={col.key} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                        <div className="font-semibold text-slate-900 mb-2">{col.title}</div>
                        {items.length === 0 ? (
                            <div className="text-sm text-slate-600">No cards</div>
                        ) : (
                            items.map((t) => (
                                <div
                                    key={t.id}
                                    className="bg-white border border-slate-200 rounded-lg p-2 mb-2 shadow-sm cursor-pointer hover:shadow"
                                    onClick={() => onSelect(t)}
                                >
                                    <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                                    <div className="text-xs text-slate-600">
                                        {(t.tags || "").split(",").filter(Boolean).slice(0, 3).join(", ")}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        <Chip>P:{t.priority}</Chip>
                                        {t.goal_id ? <Chip>Goal #{t.goal_id}</Chip> : <Chip>Trap</Chip>}
                                        {t.eisenhower_quadrant && <Chip>Q{t.eisenhower_quadrant}</Chip>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function CalendarView({ tasks, onSelect }) {
    const groups = tasks.reduce((acc, t) => {
        const d = t.deadline || t.end_date ? new Date(t.deadline || t.end_date).toISOString().slice(0, 10) : "No Date";
        acc[d] = acc[d] || [];
        acc[d].push(t);
        return acc;
    }, {});
    const keys = Object.keys(groups).sort();

    return (
        <div className="space-y-3">
            {keys.map((k) => (
                <div key={k} className="bg-white border border-slate-200 rounded-xl">
                    <div className="px-3 py-2 border-b bg-slate-50 text-slate-900 font-semibold">{k}</div>
                    <div className="p-3 space-y-2">
                        {groups[k].map((t) => (
                            <div
                                key={t.id}
                                className="flex items-start gap-2 cursor-pointer"
                                onClick={() => onSelect && onSelect(t)}
                            >
                                <FaTags className="mt-1 text-slate-700" />
                                <div>
                                    <div className="font-semibold text-slate-900">{t.title}</div>
                                    <div className="text-xs text-slate-600">
                                        {t.description || "—"} • {t.goal_id ? `Goal #${t.goal_id}` : "Activity Trap"}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {keys.length === 0 && (
                <EmptyState title="No scheduled items" hint="Add deadlines or planned ends to see them here." />
            )}
        </div>
    );
}

/* --------------------------- Slide Over (Edit) --------------------------- */
function TaskSlideOver({ task, goals, onClose, onSave, onDelete }) {
    const [form, setForm] = useState(null);

    useEffect(() => {
        if (!task) return setForm(null);
        setForm({
            ...task,
            attachmentsFiles: task.attachments
                ? task.attachments
                      .split(",")
                      .filter(Boolean)
                      .map((n) => ({ name: n }))
                : [],
        });
    }, [task]);

    if (!task || !form) return null;

    const submit = (e) => {
        e.preventDefault();
        const attachmentsNames = (form.attachmentsFiles || []).map((f) => f.name || f).filter(Boolean);
        const payload = {
            ...form,
            attachments: attachmentsNames.join(","),
            deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
            end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        };
        onSave(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            <div className="relative w-full max-w-3xl">
                <div className="bg-slate-50 rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900">Edit Task</h3>
                        <div className="flex items-center gap-2">
                            <button className="p-2 rounded hover:bg-slate-100 text-slate-700" onClick={onClose}>
                                <FaTimes />
                            </button>
                        </div>
                    </div>

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
                                    />
                                </div>

                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                    <label className="text-sm font-semibold text-slate-900">Tags</label>
                                    <input
                                        value={form.tags || ""}
                                        onChange={(e) => setForm((s) => ({ ...s, tags: e.target.value }))}
                                        className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                        placeholder="e.g., q3,campaign"
                                    />
                                </div>

                                <div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                        <label className="text-sm font-semibold text-slate-900">Deadline</label>
                                        <input
                                            type="datetime-local"
                                            value={
                                                form.deadline ? new Date(form.deadline).toISOString().slice(0, 16) : ""
                                            }
                                            onChange={(e) => setForm((s) => ({ ...s, deadline: e.target.value }))}
                                            className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                        />
                                        <div className="text-xs text-slate-500 mt-1">mm/dd/yyyy, --:--</div>
                                    </div>

                                    <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                        <label className="text-sm font-semibold text-slate-900">Planned End</label>
                                        <input
                                            type="datetime-local"
                                            value={
                                                form.end_date ? new Date(form.end_date).toISOString().slice(0, 16) : ""
                                            }
                                            onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))}
                                            className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                        />
                                        <div className="text-xs text-slate-500 mt-1">mm/dd/yyyy, --:--</div>
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
                                        <button
                                            type="button"
                                            onClick={() =>
                                                window.__composerFileInput && window.__composerFileInput.click()
                                            }
                                            className="px-3 py-2 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                        >
                                            Choose files
                                        </button>
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
                                                        className="text-xs text-slate-500 ml-2"
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
                                        <label className="text-sm font-semibold text-slate-900">Importance</label>
                                        <select
                                            value={form.importance || "med"}
                                            onChange={(e) => setForm((s) => ({ ...s, importance: e.target.value }))}
                                            className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                        >
                                            <option value="low">Low</option>
                                            <option value="med">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>

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
                                        onChange={(e) => setForm((s) => ({ ...s, goal_id: e.target.value || null }))}
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
                            <button className="px-3 py-2 rounded-lg bg-blue-600 text-white flex items-center gap-2">
                                <FaSave /> Save
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm("Delete this task?")) onDelete(task);
                                }}
                                className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-red-600 hover:bg-red-50"
                            >
                                <FaTrash /> Delete
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="ml-auto text-sm text-slate-700 hover:underline"
                            >
                                Close
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

/* --------------------------------- Screen -------------------------------- */
export default function KeyAreas() {
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
    const [view, setView] = useState("list");
    const [goals, setGoals] = useState([]);

    const [taskForm, setTaskForm] = useState({
        title: "",
        description: "",
        list_index: 1,
        importance: "med",
        category: "Key Areas",
        goal_id: "",
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

    useEffect(() => {
        (async () => {
            const [kas, gs] = await Promise.all([api.listKeyAreas(), api.listGoals()]);
            setKeyAreas(kas.sort((a, b) => a.position - b.position));
            setGoals(gs);
            setLoading(false);
        })();
    }, []);

    // storage picker removed

    const canAdd = useMemo(() => keyAreas.length < 10, [keyAreas.length]);

    const filteredKAs = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return keyAreas;
        return keyAreas.filter(
            (k) => k.title.toLowerCase().includes(q) || (k.description || "").toLowerCase().includes(q),
        );
    }, [keyAreas, filter]);

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
        }
        setShowForm(false);
        setEditing(null);
    };

    const onDeleteKA = async (ka) => {
        if (ka.is_default) return;
        if (!confirm(`Delete "${ka.title}"? Tasks will need reassignment.`)) return;
        await api.deleteKeyArea(ka.id);
        setKeyAreas((prev) => prev.filter((k) => k.id !== ka.id));
        if (selectedKA?.id === ka.id) {
            setSelectedKA(null);
            setAllTasks([]);
        }
    };

    const openKA = async (ka) => {
        setSelectedKA(ka);
        const t = await api.listTasks(ka.id);
        setAllTasks(t);
        setTaskTab(1);
        setSearchTerm("");
        setQuadrant("all");
        setView("list");
    };

    const tabNumbers = useMemo(() => {
        const s = new Set([1]);
        allTasks.forEach((t) => s.add(t.list_index || 1));
        return Array.from(s).sort((a, b) => a - b);
    }, [allTasks]);

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

    const onCreateTask = async (e) => {
        e.preventDefault();
        if (!selectedKA) return;
        const f = new FormData(e.currentTarget);
        const title = f.get("title").toString().trim();
        if (!title) return;

        const importance = f.get("importance").toString();
        const category = f.get("category").toString();
        const status = f.get("status").toString();
        const priority = f.get("priority").toString();
        const tags = f.get("tags").toString();
        const recurrence = f.get("recurrence").toString();
        // gather attachments from device uploads and composer state (including storage picks)
        const deviceFiles = f.getAll("attachments_files") || [];
        const deviceNames = deviceFiles.map((file) => file.name);
        const stateNames = form && form.attachmentsFiles ? form.attachmentsFiles.map((f) => f.name || f) : [];
        const allNames = Array.from(new Set([...(stateNames || []), ...deviceNames]));
        const attachments = allNames.join(",");
        const assignee = f.get("assignee").toString();
        const deadline = f.get("deadline") ? new Date(f.get("deadline")).toISOString() : null;
        const end_date = f.get("end_date") ? new Date(f.get("end_date")).toISOString() : null;

        const payload = {
            key_area_id: selectedKA.id,
            title,
            description: f.get("description").toString(),
            status,
            priority,
            importance,
            category,
            goal_id: f.get("goal_id").toString() || null,
            list_index: Number(f.get("list_index")) || 1,
            deadline,
            end_date,
            tags,
            recurrence,
            attachments,
            assignee,
        };

        payload.eisenhower_quadrant = computeEisenhowerQuadrant({ deadline, end_date, importance });

        const created = await api.createTask(payload);
        setAllTasks((prev) => [...prev, created]);

        setTaskForm((s) => ({
            ...s,
            title: "",
            description: "",
            goal_id: "",
            deadline: "",
            end_date: "",
            tags: "",
            recurrence: "",
            attachments: "",
            attachmentsFiles: [],
            assignee: "",
        }));
    };

    const handleSaveTask = async (updated) => {
        const q = computeEisenhowerQuadrant({
            deadline: updated.deadline,
            end_date: updated.end_date,
            importance: updated.importance,
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
        <div className="flex">
            {!selectedKA && <Sidebar />}
            <main className="flex-1 p-4 md:p-6">
                {/* Header / Search / New KA */}
                <div className="flex items-center justify-between gap-3 mb-4">
                    {!selectedKA ? (
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900">Key Areas</h1>
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
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold shadow ${
                                    canAdd
                                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                                        : "bg-gray-300 text-gray-600 cursor-not-allowed"
                                }`}
                                onClick={() => canAdd && (setShowForm(true), setEditing(null))}
                                disabled={!canAdd}
                            >
                                <FaPlus /> New Key Area
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 w-full">
                            <button
                                className="text-slate-700 hover:text-slate-900 flex items-center gap-2"
                                onClick={() => {
                                    setSelectedKA(null);
                                    setAllTasks([]);
                                }}
                            >
                                <FaArrowLeft /> Back
                            </button>

                            <div className="ml-2 flex items-center gap-2">
                                <div className="flex items-center bg-white rounded-lg px-2 py-1 shadow border border-slate-200">
                                    <FaSearch className="text-slate-700 mr-2" />
                                    <input
                                        placeholder={`Search tasks in "${selectedKA.title}"…`}
                                        className="bg-transparent outline-none text-sm w-56"
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

                                <div className="ml-2 flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                                    {["list", "kanban", "calendar"].map((v) => (
                                        <button
                                            key={v}
                                            onClick={() => setView(v)}
                                            className={`px-2 py-1 rounded-md text-sm font-semibold ${
                                                view === v
                                                    ? "bg-blue-600 text-white"
                                                    : "text-slate-800 hover:bg-slate-100"
                                            }`}
                                            title={`Switch to ${v} view`}
                                        >
                                            {v[0].toUpperCase() + v.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* LIST: Key Areas */}
                {!selectedKA && (
                    <div>
                        {loading ? (
                            <div className="text-slate-700">Loading…</div>
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
                                                    <h3 className="text-lg font-bold text-slate-900">{ka.title}</h3>
                                                    {ka.is_default && (
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                            <FaLock /> Locked
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                                    {ka.description || "—"}
                                                </p>
                                                <p className="text-xs text-slate-700 mt-2">Position: {ka.position}</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center gap-2">
                                            <button
                                                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
                                                onClick={() => openKA(ka)}
                                            >
                                                <FaListUl /> Open Lists
                                            </button>
                                            <button
                                                className="px-3 py-2 rounded-lg bg-white border font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                onClick={() => {
                                                    setEditing(ka);
                                                    setShowForm(true);
                                                }}
                                            >
                                                <FaEdit /> Edit
                                            </button>
                                            <button
                                                disabled={ka.is_default}
                                                className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-2 ${
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

                        <div className="mt-4 text-sm text-slate-600 flex items-start gap-2">
                            <FaExclamationCircle className="mt-0.5" />
                            <span>
                                Max 10 Key Areas per user. The last slot is <strong>Ideas</strong> and cannot be
                                deleted.
                            </span>
                        </div>
                    </div>
                )}

                {/* DETAIL: Tabs */}
                {selectedKA && (
                    <div className="mt-4 space-y-4">
                        {/* Tabs */}
                        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur rounded-xl border border-slate-200">
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3">
                                <div className="flex items-center gap-1 overflow-x-auto">
                                    {Array.from({ length: Math.max(4, Math.max(...tabNumbers, 4)) }).map((_, i) => {
                                        const n = i + 1;
                                        const active = taskTab === n;
                                        return (
                                            <button
                                                key={n}
                                                onClick={() => setTaskTab(n)}
                                                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
                                                    active
                                                        ? "bg-blue-600 text-white border-blue-600 shadow"
                                                        : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
                                                }`}
                                            >
                                                List {n}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Composer — parent card with opened-book two-column layout */}
                        <form onSubmit={onCreateTask}>
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
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
                                                onChange={(e) => setTaskForm((s) => ({ ...s, title: e.target.value }))}
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
                                                        setTaskForm((s) => ({ ...s, tags: e.target.value }))
                                                    }
                                                    className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                    placeholder="e.g., q3,campaign,urgent"
                                                />
                                            </div>

                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                <label className="text-sm font-semibold text-slate-900">Deadline</label>
                                                <input
                                                    name="deadline"
                                                    type="datetime-local"
                                                    value={taskForm.deadline}
                                                    onChange={(e) =>
                                                        setTaskForm((s) => ({ ...s, deadline: e.target.value }))
                                                    }
                                                    className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                />
                                                <div className="text-xs text-slate-500 mt-1">mm/dd/yyyy, --:--</div>
                                            </div>

                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                <label className="text-sm font-semibold text-slate-900">
                                                    Planned End
                                                </label>
                                                <input
                                                    name="end_date"
                                                    type="datetime-local"
                                                    value={taskForm.end_date}
                                                    onChange={(e) =>
                                                        setTaskForm((s) => ({ ...s, end_date: e.target.value }))
                                                    }
                                                    className="mt-1 w-full rounded-md border-0 bg-transparent p-2"
                                                />
                                                <div className="text-xs text-slate-500 mt-1">mm/dd/yyyy, --:--</div>
                                            </div>

                                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                <label className="text-sm font-semibold text-slate-900">
                                                    Recurrence
                                                </label>
                                                <input
                                                    name="recurrence"
                                                    value={taskForm.recurrence}
                                                    onChange={(e) =>
                                                        setTaskForm((s) => ({ ...s, recurrence: e.target.value }))
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
                                                        ref={(el) => (window.__slideFileInput = el)}
                                                        name="attachments_files"
                                                        type="file"
                                                        multiple
                                                        onChange={(e) => {
                                                            const incoming = Array.from(e.target.files || []);
                                                            setTaskForm((s) => {
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
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            window.__slideFileInput && window.__slideFileInput.click()
                                                        }
                                                        className="px-3 py-2 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Choose files
                                                    </button>
                                                </div>
                                                {taskForm.attachmentsFiles && taskForm.attachmentsFiles.length > 0 ? (
                                                    <ul className="mt-2 space-y-1 text-sm">
                                                        {taskForm.attachmentsFiles.map((f, i) => (
                                                            <li
                                                                key={i}
                                                                className="flex items-center justify-between bg-white p-2 rounded border border-slate-100"
                                                            >
                                                                <span className="truncate">{f.name}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setTaskForm((s) => ({
                                                                            ...s,
                                                                            attachmentsFiles: s.attachmentsFiles.filter(
                                                                                (_, idx) => idx !== i,
                                                                            ),
                                                                        }))
                                                                    }
                                                                    className="text-xs text-slate-500 ml-2"
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

                                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                    <label className="text-sm font-semibold text-slate-900">
                                                        Importance
                                                    </label>
                                                    <select
                                                        name="importance"
                                                        value={taskForm.importance}
                                                        onChange={(e) =>
                                                            setTaskForm((s) => ({ ...s, importance: e.target.value }))
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
                                            <label className="text-sm font-semibold text-slate-900">Category</label>
                                            <select
                                                name="category"
                                                value={taskForm.category}
                                                onChange={(e) =>
                                                    setTaskForm((s) => ({ ...s, category: e.target.value }))
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
                                                    setTaskForm((s) => ({ ...s, goal_id: e.target.value }))
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
                                                name="assignee"
                                                value={taskForm.assignee}
                                                onChange={(e) =>
                                                    setTaskForm((s) => ({ ...s, assignee: e.target.value }))
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
                                                            setTaskForm((s) => ({ ...s, status: e.target.value }))
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
                                                            setTaskForm((s) => ({ ...s, priority: e.target.value }))
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
                                                    setTaskForm((s) => ({ ...s, description: e.target.value }))
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
                                        <button className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2">
                                            <FaSave /> Add Task
                                        </button>
                                        <span className="text-xs text-slate-700 flex items-center gap-1">
                                            <FaExclamationCircle /> Tasks must belong to the current Key Area.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Tasks (List / Kanban / Calendar) */}
                        {view === "list" && (
                            <div className="space-y-3">
                                {visibleTasks.length === 0 ? (
                                    <EmptyState
                                        title={`No tasks in List ${taskTab}`}
                                        hint="Create your first task above."
                                    />
                                ) : (
                                    visibleTasks.map((t) => (
                                        <div
                                            key={t.id}
                                            className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm hover:shadow transition"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1">
                                                        <FaTags className="text-slate-700" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{t.title}</div>
                                                        {t.description && (
                                                            <div className="text-sm text-slate-600">
                                                                {t.description}
                                                            </div>
                                                        )}
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            <Chip>Tab {t.list_index || 1}</Chip>
                                                            <Chip>Status: {t.status}</Chip>
                                                            <Chip>Priority: {t.priority}</Chip>
                                                            <Chip>Importance: {t.importance}</Chip>
                                                            <Chip>Category: {t.category}</Chip>
                                                            <Chip>Assignee: {t.assignee || "—"}</Chip>
                                                            {t.goal_id ? (
                                                                <Chip>Goal #{t.goal_id}</Chip>
                                                            ) : (
                                                                <Chip>Activity Trap</Chip>
                                                            )}
                                                            {t.eisenhower_quadrant && (
                                                                <Chip>Q{t.eisenhower_quadrant}</Chip>
                                                            )}
                                                            {t.tags && <Chip>Tags: {t.tags}</Chip>}
                                                            {t.attachments && (
                                                                <Chip>
                                                                    Attachments:{" "}
                                                                    {t.attachments.split(",").filter(Boolean).length}
                                                                </Chip>
                                                            )}
                                                            {t.deadline && (
                                                                <Chip>
                                                                    Deadline: {new Date(t.deadline).toLocaleString()}
                                                                </Chip>
                                                            )}
                                                            {t.end_date && (
                                                                <Chip>
                                                                    Planned End: {new Date(t.end_date).toLocaleString()}
                                                                </Chip>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    className="text-slate-700 hover:text-slate-900 flex items-center gap-1 whitespace-nowrap"
                                                    onClick={() => setSelectedTask(t)}
                                                >
                                                    Open <FaChevronRight />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {view === "kanban" && <KanbanView tasks={visibleTasks} onSelect={setSelectedTask} />}
                        {view === "calendar" && <CalendarView tasks={visibleTasks} onSelect={setSelectedTask} />}
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
                                        “Ideas” is locked and always at position 10. Enforce max 10 on server too.
                                    </span>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* SlideOver */}
                <TaskSlideOver
                    task={selectedTask}
                    goals={goals}
                    onClose={() => setSelectedTask(null)}
                    onSave={handleSaveTask}
                    onDelete={handleDeleteTask}
                />
            </main>
        </div>
    );
}
