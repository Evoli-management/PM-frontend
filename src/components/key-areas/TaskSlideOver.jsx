import React, { useEffect, useState, useRef } from 'react';
import { FaTimes, FaSave, FaTag, FaTrash, FaAngleDoubleLeft } from 'react-icons/fa';
import EmptyState from '../../components/goals/EmptyState.jsx';

import {
    toDateOnly,
    mapUiStatusToServer,
    mapServerStatusToUi,
    normalizeActivity,
    getPriorityColorClass,
    getPriorityLabel,
} from '../../utils/keyareasHelpers';

// Lazy service getter to avoid circular imports and to match page behavior
let _activityService = null;
const getActivityService = async () => {
    if (_activityService) return _activityService;
    const mod = await import('../../services/activityService');
    _activityService = mod.default || mod;
    return _activityService;
};


export default function TaskSlideOver({
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
    // optional saving activity set passed from parent to coordinate saving indicators
    savingActivityIds: savingActivityIdsProp = undefined,
    setSavingActivityIds: setSavingActivityIdsProp = undefined,
}) {
    const [form, setForm] = useState(null);
    const [activeTab, setActiveTab] = useState("details"); // details | activities
    const [taskActivities, setTaskActivities] = useState([]);
    const [newActivity, setNewActivity] = useState("");
    const [activitiesTarget, setActivitiesTarget] = useState("new");

    const [savingActivityIdsLocal, setSavingActivityIdsLocal] = useState(new Set());
    const savingActivityIds = savingActivityIdsProp ?? savingActivityIdsLocal;
    const setSavingActivityIds = setSavingActivityIdsProp ?? setSavingActivityIdsLocal;

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
        setActivitiesTarget(String(task.id));
        (async () => {
            try {
                const list = await (await getActivityService()).list({ taskId: task.id });
                setTaskActivities(Array.isArray(list) ? list.map(normalizeActivity) : []);
            } catch (e) {
                console.error("Failed to load activities", e);
                setTaskActivities([]);
            }
        })();
    }, [task, initialTab, hideActivitiesTab]);

    useEffect(() => {
        if (hideActivitiesTab && activeTab !== "details") setActiveTab("details");
    }, [hideActivitiesTab, activeTab]);

    useEffect(() => {
        if (!task) return;
        (async () => {
            try {
                if (activitiesTarget === "new") {
                    const list = await (await getActivityService()).list();
                    setTaskActivities((Array.isArray(list) ? list.map(normalizeActivity) : []).filter((a) => !a.taskId));
                } else {
                    const list = await (await getActivityService()).list({ taskId: activitiesTarget });
                    setTaskActivities(Array.isArray(list) ? list.map(normalizeActivity) : []);
                }
            } catch (e) {
                console.error("Failed to load activities", e);
                setTaskActivities([]);
            }
        })();
    }, [activitiesTarget, task]);

    useEffect(() => {
        if (!task?.id) return;
        const handler = async (e) => {
            const tid = e?.detail?.taskId;
            if (tid && String(tid) !== String(task.id)) return;
            try {
                const list = await (await getActivityService()).list({ taskId: task.id });
                setTaskActivities(Array.isArray(list) ? list.map(normalizeActivity) : []);
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
            const created = await (await getActivityService()).create({
                text,
                taskId: activitiesTarget === "new" ? null : activitiesTarget,
            });
            setTaskActivities((prev) => [...prev, created]);
            window.dispatchEvent(new CustomEvent("ka-activities-updated", { detail: { refresh: true } }));
        } catch (e) {
            console.error("Failed to add activity", e);
        }
        setNewActivity("");
    };

    const removeActivity = async (id) => {
        try {
            await (await getActivityService()).remove(id);
            setTaskActivities((prev) => prev.filter((a) => a.id !== id));
            window.dispatchEvent(new CustomEvent("ka-activities-updated", { detail: { refresh: true } }));
        } catch (e) {
            console.error("Failed to delete activity", e);
        }
    };

    const setActivityStatus = async (id, status) => {
        if (savingActivityIds.has(id)) return;
        const prev = Array.isArray(taskActivities) ? [...taskActivities] : [];
        const next = prev.map((a) => (a.id === id ? { ...a, status, completed: status === 'done' ? true : a.completed } : a));
        setTaskActivities(next);
        setSavingActivityIds((s) => new Set([...s, id]));
        try {
            const svc = await getActivityService();
            const serverStatus = mapUiStatusToServer(status);
            const updated = await svc.update(id, {
                status: serverStatus,
                completed: status === 'done',
                completionDate: status === 'done' ? new Date().toISOString() : null,
            });
            const norm = normalizeActivity(updated || {});
            setTaskActivities((prev) => prev.map((a) => (a.id === id ? norm : a)));
        } catch (e) {
            console.error('Failed to update activity status', e);
            setTaskActivities(prev);
        } finally {
            setSavingActivityIds((s) => {
                const copy = new Set(s);
                copy.delete(id);
                return copy;
            });
        }
    };

    const clearActivities = async () => {
        if (!confirm("Clear all activities for this selection?")) return;
        try {
            const ids = (taskActivities || []).map((a) => a.id);
            const _svc = await getActivityService();
            await Promise.all(ids.map((id) => _svc.remove(id)));
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
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative w-full max-w-3xl">
                <div className="bg-slate-50 rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900">Task</h3>
                        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-700" onClick={onClose}>
                            <FaTimes />
                        </button>
                    </div>

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
                                {/* condensed details layout */}
                                <div className="grid md:grid-cols-3 gap-2 items-stretch text-sm">
                                    <div className="md:col-span-2 h-full flex flex-col">
                                        <div className="grid grid-rows-[auto_1fr] gap-1 flex-1">
                                            <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5 h-full flex flex-col">
                                                <div className="text-[10px] uppercase tracking-wide text-slate-500">Title</div>
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
                                                <div className="text-[10px] uppercase tracking-wide text-slate-500">Description</div>
                                                <textarea
                                                    rows={4}
                                                    className="mt-1.5 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm"
                                                    value={form.description || ""}
                                                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                                                    placeholder="Add more context…"
                                                    disabled={readOnly}
                                                />
                                                <div className="mt-2 border-t border-slate-200 pt-2">
                                                    <div className="grid md:grid-cols-3 gap-2">
                                                        <div>
                                                            <div className="text-[11px] text-slate-600">Linked Goal</div>
                                                            <select
                                                                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm"
                                                                value={form.goal_id || ""}
                                                                onChange={(e) => setForm((s) => ({ ...s, goal_id: e.target.value }))}
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
                                                                onChange={(e) => setForm((s) => ({ ...s, tags: e.target.value }))}
                                                                placeholder="comma,separated"
                                                                disabled={readOnly}
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="text-[11px] text-slate-600">{`List (Tab) — ${listNameFor(form.list_index || 1)}`}</div>
                                                            <select
                                                                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm"
                                                                value={String(form.list_index || 1)}
                                                                onChange={(e) => setForm((s) => ({ ...s, list_index: Number(e.target.value || 1) }))}
                                                                disabled={readOnly}
                                                            >
                                                                {(listNumbers && listNumbers.length ? listNumbers : Array.from({ length: 10 }, (_, i) => i + 1)).map((n) => (
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
                                                <button type="button" className="px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs" onClick={onClose}>
                                                    Close
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-rows-[1fr_1fr] gap-1.5 h-full">
                                        <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5 h-full flex flex-col">
                                            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">Summary</div>
                                            <div className="mb-1.5">
                                                <div className="text-[11px] text-slate-600">Assignee</div>
                                                <input className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm" value={form.assignee || ""} onChange={(e) => setForm((s) => ({ ...s, assignee: e.target.value }))} disabled={readOnly} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <div>
                                                    <div className="text-[11px] text-slate-600">Status</div>
                                                    <select className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm" value={form.status || "open"} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))} disabled={readOnly}>
                                                        <option value="open">Open</option>
                                                        <option value="in_progress">In Progress</option>
                                                        <option value="done">Done</option>
                                                        <option value="cancelled">Cancelled</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <div className="text-[11px] text-slate-600">Priority</div>
                                                    <select className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm" value={form.priority || "med"} onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))} disabled={readOnly}>
                                                        <option value="low">Low</option>
                                                        <option value="med">Medium</option>
                                                        <option value="high">High</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-md p-1.5 h-full flex flex-col">
                                            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">Schedule</div>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {[{ key: "start_date", label: "Start" }, { key: "end_date", label: "End date" }, { key: "deadline", label: "Deadline" }].map((f) => (
                                                    <div key={f.key}>
                                                        <div className="text-[11px] text-slate-600">{f.label}</div>
                                                        <input type="date" className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm" value={toDateOnly(form[f.key]) || ""} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} disabled={readOnly} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={submit} className="p-4 max-h-[80vh] overflow-auto">
                                {/* full detail layout intentionally omitted in extracted component for brevity */}
                            </form>
                        )
                    ) : (
                        <div className="p-4 max-h-[80vh] overflow-auto">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold">Your activities</div>
                                <div className="text-xs text-slate-500">Attach to a task or keep as new</div>
                            </div>

                            <div className="mt-3 flex items-center">
                                {savingActivityIds && savingActivityIds.size > 0 && (
                                    <div className="inline-block align-middle text-xs text-slate-500">Saving...</div>
                                )}
                                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("ka-open-activity-composer", { detail: { taskId: task?.id } }))} className="ml-auto px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">Add Activity</button>
                            </div>
                            <div className="mt-3 overflow-x-auto">
                                {taskActivities && taskActivities.length > 0 ? (
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-slate-50 border border-slate-200 text-slate-700">
                                            <tr>
                                                <th className="px-3 py-2 text-left w-[320px] font-semibold">Activity</th>
                                                <th className="px-3 py-2 text-left font-semibold">Assignee</th>
                                                <th className="px-3 py-2 text-left font-semibold">Status</th>
                                                <th className="px-3 py-2 text-left font-semibold">Priority</th>
                                                <th className="px-3 py-2 text-left font-semibold">Start date</th>
                                                <th className="px-3 py-2 text-left font-semibold">End date</th>
                                                <th className="px-3 py-2 text-left font-semibold">Deadline</th>
                                                <th className="px-3 py-2 text-left font-semibold">Duration</th>
                                                <th className="px-3 py-2 text-left font-semibold">Completed</th>
                                                <th className="px-3 py-2 text-left font-semibold">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {taskActivities.map((a) => (
                                                <tr key={a.id} className="bg-white border-b border-slate-100">
                                                    <td className="px-3 py-2 align-top">
                                                        <div className="flex items-center gap-3">
                                                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="w-4 h-4 text-[#4DC3D8]" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"></path></svg>
                                                            <div className="flex flex-col">
                                                                <div className="text-sm text-slate-800 truncate max-w-[540px]">{a.text}</div>
                                                                <div className="text-xs text-slate-500">{a.note || ""}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-slate-700">{a.assignee || "—"}</td>
                                                    <td className="px-3 py-2 align-top">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${String(a.status || '').toLowerCase() === 'done' ? 'bg-emerald-500' : String(a.status || '').toLowerCase() === 'in_progress' ? 'bg-blue-500' : 'bg-slate-400'}`} aria-hidden="true" />
                                                            <select value={a.status || 'open'} onChange={(e)=> setActivityStatus(a.id, e.target.value)} className="text-xs rounded-md border bg-white px-2 py-1" aria-label={`Change status for activity ${a.text}`}>
                                                                <option value="open">Open</option>
                                                                <option value="in_progress">In progress</option>
                                                                <option value="done">Done</option>
                                                            </select>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 align-top">{(() => { const pScope = a.priority ?? task.priority; const pLabel = getPriorityLabel(pScope); const pColors = getPriorityColorClass(pScope); return (<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${pColors.badge}`}>{pLabel}</span>); })()}</td>
                                                    <td className="px-3 py-2 align-top">{toDateOnly(a.start_date) || '—'}</td>
                                                    <td className="px-3 py-2 align-top">{toDateOnly(a.end_date) || '—'}</td>
                                                    <td className="px-3 py-2 align-top">{toDateOnly(a.deadline) || '—'}</td>
                                                    <td className="px-3 py-2 align-top">{/* duration placeholder */}</td>
                                                    <td className="px-3 py-2 align-top text-slate-800">{a.completionDate ? new Date(a.completionDate).toLocaleString() : '—'}</td>
                                                    <td className="px-3 py-2 align-top">
                                                        <div className="flex items-center gap-2">
                                                            {/* Tag icon: use a single consistent color regardless of activity status */}
                                                            <button type="button" onClick={() => {}} className="p-1 hover:bg-slate-50 rounded-md" title="Tags">
                                                                <FaTag className="w-4 h-4 text-[#4DC3D8]" />
                                                            </button>
                                                            <button type="button" onClick={() => removeActivity(a.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md" title="Delete"><FaTrash className="w-4 h-4" /></button>
                                                            <button type="button" onClick={() => {}} className="p-1 text-slate-600 hover:bg-slate-50 rounded-md" title="Convert to task"><FaAngleDoubleLeft className="w-4 h-4" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-sm text-slate-500 mt-2">No activities yet.</div>
                                )}
                            </div>

                            <div className="mt-4 flex items-center gap-2">
                                <button type="button" onClick={onClose} className="ml-auto rounded-lg text-sm text-slate-700 hover:underline">Close</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
