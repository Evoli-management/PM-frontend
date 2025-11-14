import React, { useEffect, useState, useRef, Suspense } from 'react';
import { FaChevronLeft, FaStop, FaEllipsisV, FaSave, FaTag, FaTrash, FaEdit, FaAngleDoubleLeft } from 'react-icons/fa';
import EmptyState from '../../components/goals/EmptyState.jsx';
import TaskSlideOver from './TaskSlideOver';
import { useToast } from '../../components/shared/ToastProvider.jsx';
import {
    toDateOnly,
    formatDuration,
    getPriorityLevel,
    computeEisenhowerQuadrant,
    mapServerStatusToUi,
    mapUiStatusToServer,
    normalizeActivity,
    getStatusColorClass,
    getPriorityColorClass,
    getPriorityLabel,
    getInProgressLabel,
} from '../../utils/keyareasHelpers';

const CreateActivityModal = React.lazy(() => import('../../components/modals/CreateActivityFormModal.jsx'));

// dev helper: HMR verification
if (import.meta && import.meta.hot) {
    // will show in browser console when module loads via HMR
    // eslint-disable-next-line no-console
    console.log('[HMR] TaskFullView module loaded');
}

let _activityService = null;
const getActivityService = async () => {
    if (_activityService) return _activityService;
    const mod = await import('../../services/activityService');
    _activityService = mod.default || mod;
    return _activityService;
};

// helpers imported from utils/keyareasHelpers

export default function TaskFullView({
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
    selectedKA = null,
    users = [],
    allTasks = [],
    savingActivityIds: savingActivityIdsProp = undefined,
    setSavingActivityIds: setSavingActivityIdsProp = undefined,
}) {
    const [savingActivityIdsLocal, setSavingActivityIdsLocal] = useState(new Set());
    const savingActivityIds = savingActivityIdsProp ?? savingActivityIdsLocal;
    const setSavingActivityIds = setSavingActivityIdsProp ?? setSavingActivityIdsLocal;
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

    // Local copy of activities for this task so we can optimistically update UI
    const [list, setListState] = useState(activitiesByTask[String(task.id)] || []);
    useEffect(() => {
        setListState(activitiesByTask[String(task.id)] || []);
    }, [activitiesByTask, task && task.id]);

    // setList wrapper keeps local state and notifies parent via onUpdateActivities
    const setList = (updaterOrValue) => {
        if (typeof updaterOrValue === 'function') {
            setListState((prev) => {
                const next = updaterOrValue(prev);
                return next;
            });
        } else {
            setListState(updaterOrValue);
        }
    };

    // Adapter so ActivityList can call a `setActivitiesByTask`-style setter
    // while TaskFullView forwards single-task updates to the parent via
    // `onUpdateActivities(id, nextList)`.
    const setActivitiesForTask = (updaterOrValue) => {
        try {
            const newMap = typeof updaterOrValue === 'function' ? updaterOrValue(activitiesByTask) : updaterOrValue;
            const nextList = (newMap && newMap[String(task.id)]) || [];
            // Update local list for this task; parent will be notified via effect below.
            setList(nextList);
        } catch (e) {
            console.error('Failed to set activities for task', e);
        }
    };

    // Notify parent when local list changes — do this in an effect so we don't
    // trigger parent setState during render of this component (avoids React warning)
    useEffect(() => {
        try {
            // Debug: show list contents when notifying parent (helps diagnose missing fields)
            // eslint-disable-next-line no-console
            console.log('[TaskFullView] notifying parent for task', String(task.id), 'list:', list);
            onUpdateActivities && onUpdateActivities(String(task.id), list || []);
        } catch (e) {
            console.error('Failed to notify parent of activities change', e);
        }
    }, [list, task && task.id]);

    const addActivity = async (text) => {
        const t = (text || "").trim();
        if (!t) return;
        try {
            const svc = await getActivityService();
            const created = await svc.create({ text: t, taskId: task.id });
            setList([...(list || []), created]);
            window.dispatchEvent(new CustomEvent("ka-activities-updated", { detail: { refresh: true } }));
        } catch (e) {
            console.error("Failed to add activity", e);
        }
    };
    const removeActivity = async (id) => {
        try {
            const svc = await getActivityService();
            await svc.remove(id);
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
    const { addToast } = useToast ? useToast() : { addToast: () => {} };

    const toggleCompleted = async (id) => {
        if (savingActivityIds.has(id)) return;
        const prev = Array.isArray(list) ? [...list] : [];
        const next = prev.map((a) => (a.id === id ? { ...a, completed: !a.completed, completionDate: !a.completed ? new Date().toISOString() : null } : a));
        setList(next);
        setSavingActivityIds((s) => new Set([...s, id]));
        try {
            const svc = await getActivityService();
            const item = next.find((a) => a.id === id);
            await svc.update(id, { completed: !!item.completed, completionDate: item.completed ? new Date().toISOString() : null });
            addToast && addToast({ title: item.completed ? "Marked completed" : "Marked incomplete", variant: "success" });
        } catch (e) {
            console.error("Failed to update activity completion", e);
            setList(prev);
            addToast && addToast({ title: "Failed to update activity", variant: "error" });
        } finally {
            setSavingActivityIds((s) => {
                const copy = new Set(s);
                copy.delete(id);
                return copy;
            });
        }
    };
    const setActivityStatus = async (id, status) => {
        if (savingActivityIds.has(id)) return;
        const prev = Array.isArray(list) ? [...list] : [];
        const next = prev.map((a) => (a.id === id ? { ...a, status, completed: status === 'done' ? true : a.completed, completionDate: status === 'done' ? new Date().toISOString() : a.completionDate || null } : a));
        setList(next);
        setSavingActivityIds((s) => new Set([...s, id]));
        try {
            const svc = await getActivityService();
            const serverStatus = mapUiStatusToServer(status);
            const updated = await svc.update(id, { status: serverStatus, completed: status === 'done', completionDate: status === 'done' ? new Date().toISOString() : null });
            const norm = normalizeActivity(updated || {});
            setList((prevList) => prevList.map((a) => (a.id === id ? norm : a)));
        } catch (e) {
            console.error('Failed to update activity status', e);
            setList(prev);
        } finally {
            setSavingActivityIds((s) => {
                const copy = new Set(s);
                copy.delete(id);
                return copy;
            });
        }
    };
    const setPriorityValue = (id, value) => {
        setList(list.map((a) => (a.id === id ? { ...a, priority: value } : a)));
    };
    const createTaskFromActivity = (item) => {
        const confirmed = window.confirm("Convert this activity into a task? OK = convert, Cancel = abort");
        if (!confirmed) return;
        try {
            window.dispatchEvent(new CustomEvent("ka-create-task-from-activity", { detail: { taskId: task.id, activity: item, remove: true } }));
        } catch {}
    };
    const toggleRow = (id) => {
        const activity = list.find(a => a.id === id);
        if (activity) {
            // open activity modal in editable mode when toggled from the edit action
            setActivityModal({ open: true, item: activity, readOnly: false });
        }
    };

    const closeOnHoverDifferent = (id) => {};
    const updateField = (id, field, value) => { setList(list.map((a) => (a.id === id ? { ...a, [field]: value } : a))); };
    const clearActivities = () => { if (!confirm("Clear all activities for this task?")) return; onUpdateActivities && onUpdateActivities(String(task.id), []); };

    const listNameFor = (n) => {
        if (!kaId) return `List ${n}`;
        const names = listNames[String(kaId)] || {};
        return names[String(n)] || `List ${n}`;
    };

    const save = async () => {
        if (onSave) { await onSave(form); }
        setIsEditing(false);
        if (onBack) onBack();
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-2 border-b border-slate-200">
                <div className="flex items-start gap-2">
                    <button type="button" onClick={() => onBack && onBack()} className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center" aria-label="Back" style={{ minWidth: 36, minHeight: 36 }}>
                        <FaChevronLeft />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="relative truncate font-bold text-slate-900 text-base md:text-lg pl-6 z-10">
                                {/* show high-priority marker before the title when applicable */}
                                {(() => {
                                    const isHigh = getPriorityLevel(task.priority) === 3;
                                    if (isHigh) return (<span className="mt-0.5 inline-block text-sm font-bold text-red-600 mr-2" title={`Priority: High`}>!</span>);
                                    return null;
                                })()}
                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none text-[20px] text-[#4DC3D8]" aria-hidden="true" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z"></path></svg>
                                <span className="relative z-10">{task.title || task.name || 'Task'}</span>
                            </div>
                            <div className="relative shrink-0 z-50">
                                <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((s) => !s)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600" title="More actions"><FaEllipsisV /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-2 px-3">
                <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 rounded-md px-2 py-0.5 text-xs">
                    <img alt="Key Areas" className="w-4 h-4 object-contain opacity-70" src="/PM-frontend/key-area.png" />
                    <span className="font-medium truncate max-w-full" title={selectedKA?.title || kaTitle || ''}>{selectedKA?.title || kaTitle || '—'}</span>
                </div>
            </div>

            <div className="px-3 pt-3 pb-2 border-b border-slate-200 bg-white">
                <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <div className="text-sm">
                        <div className="grid grid-cols-11 gap-x-1">
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
                            <div className="text-[11px] uppercase tracking-wide text-slate-500">Completed</div>
                        </div>
                        <div className="grid grid-cols-11 gap-x-1 mt-0.5">
                            <div className="text-slate-900 truncate min-w-0">{task.assignee || '—'}</div>
                            {(() => {
                                const statusUi = mapServerStatusToUi(task.status || '');
                                const statusColors = getStatusColorClass(statusUi);
                                const statusLabel = getInProgressLabel(statusUi);
                                return (<div className="text-slate-900 capitalize truncate min-w-0 inline-flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`} aria-hidden="true"></span>{statusLabel}</div>);
                            })()}
                            {(() => {
                                const pLabel = getPriorityLabel(task.priority);
                                const pColors = getPriorityColorClass(task.priority);
                                const isHigh = getPriorityLevel(task.priority) === 3;
                                return (<div className="text-slate-900 truncate min-w-0 inline-flex items-center gap-1 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium ${pColors.badge}`}>{pLabel}</span>
                                    {isHigh ? <span className="inline-block text-sm font-bold text-red-600" title="Priority: High">!</span> : null}
                                </div>);
                            })()}
                            <div className="min-w-0"><span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-medium">{computeEisenhowerQuadrant ? computeEisenhowerQuadrant(task.priority || null) : 'Q?'}</span></div>
                            <div className="text-slate-900 truncate min-w-0" title={task.goal || '—'}>{task.goal || '—'}</div>
                            <div className="text-slate-900 truncate min-w-0">{(task.tags && task.tags.length) ? (
                                <div className="flex flex-wrap gap-1">
                                    {task.tags.map((t, i) => {
                                        const tt = String(t || '').trim();
                                        if (!tt) return null;
                                        const lowered = tt.toLowerCase();
                                        // If tag matches status or priority terms, reuse color helpers
                                        let cls = 'bg-slate-100 text-slate-700';
                                        if (['open', 'in_progress', 'done', 'completed', 'todo'].includes(lowered)) {
                                            cls = getStatusColorClass(lowered).badge;
                                        } else if (['low','normal','high','1','2','3'].includes(lowered)) {
                                            cls = getPriorityColorClass(lowered).badge;
                                        }
                                        return (<span key={`${tt}-${i}`} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{tt}</span>);
                                    })}
                                </div>
                            ) : '—'}</div>
                            <div className="text-slate-900 truncate min-w-0 whitespace-nowrap">{toDateOnly(task.start_date) || '—'}</div>
                            <div className="text-slate-900 truncate min-w-0 whitespace-nowrap">{toDateOnly(task.end_date) || '—'}</div>
                            <div className="text-slate-900 truncate min-w-0 whitespace-nowrap">{toDateOnly(task.deadline) || '—'}</div>
                            <div className="text-slate-900 truncate min-w-0 whitespace-nowrap">{formatDuration ? formatDuration(task.duration) : (task.duration || '—')}</div>
                            <div className="text-slate-900 truncate min-w-0 whitespace-nowrap">{task.completed ? String(task.completed) : '—'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-2 pt-2 border-b border-slate-200 bg-white">
                <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    <button type="button" onClick={() => setTab('activities')} className={`px-3 py-1 rounded-md text-sm font-semibold ${tab === 'activities' ? 'bg-white text-slate-900 shadow' : ''}`}><span className="inline-flex items-center gap-1"><svg className="w-4 h-4 text-[#4DC3D8]" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" fill="currentColor"><path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"></path></svg>Activities</span></button>
                </div>
            </div>

            {tab === "activities" ? (
                <div className="p-4">
                    {/* Render activities for this task */}
                    <div className="mb-3">
                        {/* Full view displays activities in a table (same layout as SlideOver) */}
                        {Array.isArray(list) && list.length > 0 ? (
                            <div className="overflow-x-auto">
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
                                        {list.map((a) => (
                                            <tr key={a.id} className="bg-white border-b border-slate-100">
                                                <td className="px-3 py-2 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="w-4 h-4 text-[#4DC3D8]" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"></path></svg>
                                                        <div className="flex flex-col">
                                                            <div className="text-sm text-slate-800 truncate max-w-[540px]">{a.text || a.activity_name || 'Untitled activity'}</div>
                                                            <div className="text-xs text-slate-500">{a.note || ''}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 align-top text-slate-700">{a.assignee || '—'}</td>
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
                                                            {/* Edit action */}
                                                            <button type="button" onClick={() => toggleRow(a.id)} className="p-1 text-slate-600 hover:bg-slate-50 rounded-md" title="Edit"><FaEdit className="w-4 h-4" /></button>
                                                            {/* Tag icon: use a single consistent color regardless of activity status */}
                                                            <button type="button" onClick={() => {}} className="p-1 hover:bg-slate-50 rounded-md" title="Tags">
                                                                <FaTag className="w-4 h-4 text-[#4DC3D8]" />
                                                            </button>
                                                            <button type="button" onClick={() => removeActivity(a.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md" title="Delete"><FaTrash className="w-4 h-4" /></button>
                                                            <button type="button" onClick={() => createTaskFromActivity(a)} className="p-1 text-slate-600 hover:bg-slate-50 rounded-md" title="Convert to task"><FaAngleDoubleLeft className="w-4 h-4" /></button>
                                                        </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500 mt-2">No activities yet.</div>
                        )}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <button type="button" className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 ml-auto" onClick={() => window.dispatchEvent(new CustomEvent("ka-open-activity-composer", { detail: { taskId: task?.id } }))}>Add Activity</button>
                    </div>
                </div>
            ) : (
                <div className="p-2 grid md:grid-cols-3 gap-2 items-stretch">{/* details layout omitted */}</div>
            )}

            {showDetailsPopup && (
                <TaskSlideOver
                    task={task}
                    goals={goals}
                    listNames={listNames}
                    kaId={selectedKA?.id}
                    listNumbers={listNumbers}
                    readOnly={readOnly}
                    initialTab="details"
                    hideActivitiesTab
                    onClose={() => setShowDetailsPopup(false)}
                    onSave={async (payload) => { if (onSave) await onSave(payload); setShowDetailsPopup(false); }}
                    onDelete={async (tsk) => { if (onDelete) await onDelete(tsk); setShowDetailsPopup(false); }}
                    savingActivityIds={savingActivityIds}
                    setSavingActivityIds={setSavingActivityIds}
                />
            )}

            {activityModal.open && activityModal.item && (
                <Suspense fallback={<div role="status" aria-live="polite" className="p-4">Loading…</div>}>
                    <CreateActivityModal
                        isOpen={activityModal.open}
                        onClose={() => setActivityModal({ open: false, item: null })}
                        onSave={async (saved) => {
                            // saved may be the full activity returned from the modal or a partial payload
                            // Debug: log the raw saved payload returned from the modal (or nil if modal returned nothing)
                            // eslint-disable-next-line no-console
                            console.log('[TaskFullView] modal onSave saved:', saved);
                            const activityId = (saved && saved.id) ? saved.id : activityModal.item.id;
                            const prev = Array.isArray(list) ? [...list] : [];
                            // optimistic update: merge saved fields into local item
                            const optimistic = prev.map((a) => (a.id === activityId ? { ...a, ...(saved || {}) } : a));
                            setList(optimistic);
                            setSavingActivityIds((s) => new Set([...s, activityId]));
                            try {
                                const svc = await getActivityService();
                                // If the modal already returned a fully persisted activity (with id), use it.
                                // Otherwise call update to persist changes.
                                const updated = saved && saved.id ? saved : await svc.update(activityId, saved || {});
                                const norm = normalizeActivity(updated || {});
                                setList((prevList) => prevList.map((a) => (a.id === activityId ? norm : a)));
                                addToast && addToast({ title: 'Activity saved', variant: 'success' });
                                window.dispatchEvent(new CustomEvent('ka-activities-updated', { detail: { refresh: true } }));
                                setActivityModal({ open: false, item: null });
                            } catch (e) {
                                console.error('Failed to save activity', e);
                                // revert
                                setList(prev);
                                addToast && addToast({ title: 'Failed to save activity', variant: 'error' });
                            } finally {
                                setSavingActivityIds((s) => {
                                    const copy = new Set(s);
                                    copy.delete(activityId);
                                    return copy;
                                });
                            }
                        }}
                        activityId={activityModal.item.id}
                        // Provide a rich initialData object so the edit modal can pre-fill all fields
                        initialData={{
                            taskId: activityModal.item.task_id || activityModal.item.taskId || "",
                            text: activityModal.item.text || activityModal.item.activity_name || "",
                            title: activityModal.item.text || activityModal.item.activity_name || "",
                            description: activityModal.item.description || activityModal.item.note || '',
                            start_date: activityModal.item.start_date || activityModal.item.date_start || '',
                            end_date: activityModal.item.end_date || activityModal.item.date_end || '',
                            deadline: activityModal.item.deadline || '',
                            duration: activityModal.item.duration || '',
                            list_index: activityModal.item.list_index || activityModal.item.listIndex || 1,
                            key_area_id: activityModal.item.key_area_id || activityModal.item.keyAreaId || '',
                            assignee: activityModal.item.assignee || '',
                            priority: activityModal.item.priority || activityModal.item.priority_level || 'normal',
                            goal: activityModal.item.goal || activityModal.item.goalId || '',
                            completed: activityModal.item.completed || false,
                        }}
                        attachedTaskId={activityModal.item.task_id || activityModal.item.taskId || null}
                        readOnly={activityModal.readOnly ?? false}
                    />
                </Suspense>
            )}
        </div>
    );
}
