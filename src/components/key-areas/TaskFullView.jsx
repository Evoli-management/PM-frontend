import React, { useEffect, useState, useRef, Suspense } from 'react';
import { FaChevronLeft, FaStop, FaEllipsisV, FaSave, FaTag, FaTrash, FaEdit, FaAngleDoubleLeft, FaUserPlus } from 'react-icons/fa';
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
    resolveAssignee,
    getStatusColorClass,
    getPriorityColorClass,
    getQuadrantColorClass,
    getPriorityLabel,
    getInProgressLabel,
} from '../../utils/keyareasHelpers';

const CreateActivityModal = React.lazy(() => import('../../components/modals/CreateActivityFormModal.jsx'));
const EditActivityModal = React.lazy(() => import('./EditActivityModal.jsx'));
const TaskDelegationModal = React.lazy(() => import('../modals/TaskDelegationModal.jsx'));

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

let _taskService = null;
const getTaskService = async () => {
    if (_taskService) return _taskService;
    const mod = await import('../../services/taskService');
    _taskService = mod.default || mod;
    return _taskService;
};

// helpers imported from utils/keyareasHelpers

export default function TaskFullView({
    task,
    goals,
    kaTitle,
    isDontForget = false,
    readOnly = false,
    onBack,
    onSave,
    onDelete,
    onRequestEdit,
    activitiesByTask = {},
    onUpdateActivities,
    initialTab = "activities",
    listNames = {},
    kaId = null,
    listNumbers = [],
    selectedKA = null,
    users = [],
    currentUserId = null,
    allTasks = [],
    savingActivityIds: savingActivityIdsProp = undefined,
    setSavingActivityIds: setSavingActivityIdsProp = undefined,
}) {
    // derive a key-area color to use for inline icons (fallback matches previous hardcoded color)
    const kaColor = (selectedKA && selectedKA.color) || (task && (task.key_area_color || task.keyAreaColor)) || '#4DC3D8';
    // Small per-activity menu component placed near the activity icon so it's
    // visible and not clipped by table layout. Uses local state and a ref to
    // close on outside click / Escape.
    const ActivityMenu = ({ item }) => {
        const [open, setOpen] = useState(false);
        const [anchor, setAnchor] = useState(null);
        const btnRef = useRef(null);

        useEffect(() => {
            if (!open) return;
            const onDown = (e) => {
                // close when clicking outside the menu/button
                const menuEl = document.getElementById(`activity-menu-${item.id}`);
                if (!menuEl) return;
                if (menuEl.contains(e.target)) return;
                if (btnRef.current && btnRef.current.contains(e.target)) return;
                setOpen(false);
            };
            const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
            document.addEventListener('mousedown', onDown);
            document.addEventListener('keydown', onKey);
            return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
        }, [open, item.id]);

        const toggle = (e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setAnchor({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX });
            setOpen((s) => !s);
        };

        return (
            <div className="inline-block mr-1">
                <button ref={btnRef} type="button" aria-haspopup="menu" aria-expanded={open} onClick={toggle} className="p-1 rounded hover:bg-slate-100 text-slate-600" title="More actions">
                    <FaEllipsisV />
                </button>
                {open && anchor && (
                    <div id={`activity-menu-${item.id}`} style={{ position: 'fixed', top: anchor.top, left: anchor.left, zIndex: 9999, minWidth: 176 }} className="bg-white border border-slate-200 rounded shadow">
                        <button type="button" className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={(e) => { e.stopPropagation(); setOpen(false); toggleRow(item.id); }}>
                            <FaEdit className="text-slate-600" />
                            <span>Edit</span>
                        </button>
                        <button type="button" className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setOpen(false); if (confirm(`Delete activity "${(item.text||item.activity_name||'Untitled activity')}"?`)) removeActivity(item.id); }}>
                            <FaTrash />
                            <span>Delete</span>
                        </button>
                        <button type="button" className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm ${item.created_task_id ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`} onClick={(e) => { e.stopPropagation(); setOpen(false); if (!item.created_task_id) createTaskFromActivity(item); }} disabled={!!item.created_task_id}>
                            <FaAngleDoubleLeft />
                            <span>{item.created_task_id ? 'Task created' : 'Convert to task'}</span>
                        </button>
                    </div>
                )}
            </div>
        );
    };
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
    const [localUsers, setLocalUsers] = useState(users || []);
    const [editingDate, setEditingDate] = useState({ id: null, field: null });
    const lastNotifiedRef = useRef(null);
    const [delegateModalOpen, setDelegateModalOpen] = useState(false);

    useEffect(() => {
        setTab(initialTab || "activities");
    }, [initialTab]);

    // If this is a "Don't forget" task, ensure we don't try to show Activities tab
    useEffect(() => {
        if (isDontForget && tab === 'activities') setTab('details');
    }, [isDontForget, tab]);

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

    // Keep a local copy of users so we can fetch on-demand when opening the
    // EditActivityModal (mirrors CalendarContainer behavior which preloads users)
    useEffect(() => {
        try {
            if (Array.isArray(users) && users.length) setLocalUsers(users);
        } catch (e) {}
    }, [users]);

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
        let mounted = true;
        let timer = null;
        try {
            const parentList = (activitiesByTask && activitiesByTask[String(task.id)]) || [];
            const lhsIds = Array.isArray(parentList) ? parentList.map((a) => String(a.id)) : [];
            const rhsIds = Array.isArray(list) ? list.map((a) => String(a.id)) : [];
            const lhsSorted = Array.from(new Set(lhsIds)).sort();
            const rhsSorted = Array.from(new Set(rhsIds)).sort();
            const same = lhsSorted.length === rhsSorted.length && lhsSorted.every((id, i) => id === rhsSorted[i]);
            const signature = rhsSorted.join(',');
            if (same) {
                // nothing to do
                return () => {};
            }
            // If we've already notified for this ID-set recently, skip immediately.
            if (lastNotifiedRef.current === signature) return () => {};

            // Debounce notifications briefly to allow any parent-side batching/refetch
            // to settle and avoid an immediate notify -> parent set -> notify cycle.
            timer = setTimeout(() => {
                if (!mounted) return;
                try {
                    lastNotifiedRef.current = signature;
                    // eslint-disable-next-line no-console
                    console.log('[TaskFullView] notifying parent for task', String(task.id), 'list:', list);
                    onUpdateActivities && onUpdateActivities(String(task.id), list || []);
                } catch (e) {
                    console.error('Failed to notify parent of activities change', e);
                }
            }, 150);
        } catch (e) {
            console.error('Failed to schedule parent notification for activities change', e);
        }
        return () => {
            mounted = false;
            if (timer) clearTimeout(timer);
        };
    }, [list, task && task.id, activitiesByTask]);

    const buildApiPayload = (values) => {
        // build minimal payload matching backend expectations
        const normalizeDate = (v) => {
            if (!v && v !== 0) return undefined;
            if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
            try {
                const d = new Date(v);
                if (isNaN(d.getTime())) return undefined;
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            } catch {
                return undefined;
            }
        };

        const payload = {};
        if (values.text) payload.text = values.text;
        if (values.note) payload.note = values.note;
        const sd = normalizeDate(values.startDate || values.start_date);
        if (sd) payload.startDate = sd;
        const ed = normalizeDate(values.endDate || values.end_date);
        if (ed) payload.endDate = ed;
        const dl = normalizeDate(values.deadline || values.dueDate || values.due_date);
        if (dl) payload.deadline = dl;
        if (typeof values.completed === 'boolean') payload.completed = values.completed;
        if (values.status) payload.status = values.status;
        if (values.priority !== undefined && values.priority !== null) payload.priority = typeof values.priority === 'number' ? mapPriority(values.priority) : values.priority;
        if (values.taskId || values.task_id) payload.taskId = values.taskId || values.task_id;
        if (values.duration) payload.duration = values.duration;

        return payload;
    };
    const addActivity = async (text) => {
        const t = (text || "").trim();
        if (!t) return;
        try {
            const svc = await getActivityService();
            const created = await svc.create({ text: t, taskId: task.id });
            const next = ([...(list || []), created]);
            setList(next);
            // include taskId and the new list in the event so parents can update without refetching
            window.dispatchEvent(new CustomEvent("ka-activities-updated", { detail: { refresh: true, taskId: String(task.id), list: next } }));
        } catch (e) {
            console.error("Failed to add activity", e);
        }
    };
    const removeActivity = async (id) => {
        try {
            const svc = await getActivityService();
            await svc.remove(id);
            const next = list.filter((a) => a.id !== id);
            setList(next);
            window.dispatchEvent(new CustomEvent("ka-activities-updated", { detail: { refresh: true, taskId: String(task.id), list: next } }));
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
            // notify parent with the latest list after successful update
            try {
                window.dispatchEvent(new CustomEvent('ka-activities-updated', { detail: { refresh: true, taskId: String(task.id), list: (Array.isArray(prev) ? prev.map(a => a.id === id ? norm : a) : []) } }));
            } catch (e) {}
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
    const setActivityAssignee = async (id, sel) => {
        if (savingActivityIds.has(id)) return;
        const prev = Array.isArray(list) ? [...list] : [];
        const next = prev.map((a) => (a.id === id ? { ...a, assignee: sel } : a));
        setList(next);
        setSavingActivityIds((s) => new Set([...s, id]));
        try {
            // Backend does not accept an `assignee` field on activities (update DTO),
            // so when changing responsible from the full-task view we update the
            // parent task's assignee instead. This avoids a 400 Bad Request.
            const ts = await getTaskService();
            // sel may be user id; map to name or 'Me' when possible
            let valueToSend = sel;
            try {
                const { selectedUserIdToPersistValue } = await import('../../utils/keyareasHelpers');
                valueToSend = selectedUserIdToPersistValue(sel, localUsers.length ? localUsers : users, currentUserId);
            } catch (e) {}
            // Update the task's assignee (task API accepts `assignee`)
            // eslint-disable-next-line no-console
            console.debug('[TaskFullView] updating task assignee', task.id, { assignee: valueToSend });
            const updatedTask = await ts.update(task.id, { assignee: valueToSend });
            // eslint-disable-next-line no-console
            console.debug('[TaskFullView] task update response', updatedTask);
            // Also apply the normalized assignee value into the local activity list
            setList((prevList) => prevList.map((a) => (a.id === id ? { ...a, assignee: valueToSend } : a)));
            try { window.dispatchEvent(new CustomEvent('ka-activities-updated', { detail: { refresh: true, taskId: String(task.id), list } })); } catch (e) {}
            // Notify other parts of the app that the task was updated so they can refresh local cache
            try { window.dispatchEvent(new CustomEvent('ka-task-updated', { detail: { task: updatedTask } })); } catch (e) {}
        } catch (e) {
            console.error('Failed to update activity assignee', e);
            setList(prev);
        } finally {
            setSavingActivityIds((s) => {
                const copy = new Set(s);
                copy.delete(id);
                return copy;
            });
        }
    };

    const setActivityPriority = async (id, value) => {
        if (savingActivityIds.has(id)) return;
        const prev = Array.isArray(list) ? [...list] : [];
        const next = prev.map((a) => (a.id === id ? { ...a, priority: value } : a));
        setList(next);
        setSavingActivityIds((s) => new Set([...s, id]));
        try {
            const svc = await getActivityService();
            const updated = await svc.update(id, { priority: value });
            const norm = normalizeActivity(updated || {});
            setList((prevList) => prevList.map((a) => (a.id === id ? norm : a)));
            try { window.dispatchEvent(new CustomEvent('ka-activities-updated', { detail: { refresh: true, taskId: String(task.id), list } })); } catch (e) {}
        } catch (e) {
            console.error('Failed to update activity priority', e);
            setList(prev);
        } finally {
            setSavingActivityIds((s) => {
                const copy = new Set(s);
                copy.delete(id);
                return copy;
            });
        }
    };

    const setActivityDate = async (id, field, value) => {
        if (savingActivityIds.has(id)) return;
        const prev = Array.isArray(list) ? [...list] : [];
        const next = prev.map((a) => (a.id === id ? { ...a, [field]: value } : a));
        setList(next);
        setSavingActivityIds((s) => new Set([...s, id]));
        try {
            const svc = await getActivityService();
            const payload = {};
            // map incoming field names (may be snake_case from templates) to
            // backend DTO camelCase names expected by UpdateActivityDto
            const mapFieldName = (f) => {
                if (!f) return f;
                const map = {
                    start_date: 'startDate',
                    end_date: 'endDate',
                    due_date: 'deadline',
                    dueDate: 'deadline',
                    deadline: 'deadline',
                    startDate: 'startDate',
                    endDate: 'endDate',
                };
                return map[f] || f;
            };
            const payloadKey = mapFieldName(field);
            // Convert simple YYYY-MM-DD date picked by the user into an ISO
            // datetime string (UTC midnight) because backend UpdateActivityDto
            // expects an ISO date string. If value is falsy, send null to clear.
            if (!value) {
                payload[payloadKey] = null;
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
                try {
                    const [y, m, d] = String(value).split('-').map((s) => parseInt(s, 10));
                    const iso = new Date(Date.UTC(y, m - 1, d)).toISOString();
                    payload[payloadKey] = iso;
                } catch (err) {
                    payload[payloadKey] = String(value);
                }
            } else {
                payload[payloadKey] = String(value);
            }
            // debug: log payload being sent and id
            // eslint-disable-next-line no-console
            console.debug('[TaskFullView] updating activity', id, payload);
            const updated = await svc.update(id, payload);
            const norm = normalizeActivity(updated || {});
            setList((prevList) => prevList.map((a) => (a.id === id ? norm : a)));
            try { window.dispatchEvent(new CustomEvent('ka-activities-updated', { detail: { refresh: true, taskId: String(task.id), list } })); } catch (e) {}
        } catch (e) {
            // log server response body if available to help identify validation errors
            // eslint-disable-next-line no-console
            console.error('Failed to update activity date', e?.response?.data || e?.message || e);
            setList(prev);
        } finally {
            setSavingActivityIds((s) => {
                const copy = new Set(s);
                copy.delete(id);
                return copy;
            });
            setEditingDate({ id: null, field: null });
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
    const toggleRow = async (id) => {
        const activity = list.find(a => a.id === id);
        if (!activity) return;
        try {
            // If we don't have users yet, fetch them so the modal's Assignee select
            // can be populated and the initial value will match an option.
            if (!localUsers || localUsers.length === 0) {
                try {
                    const mod = await import('../../services/usersService');
                    const svc = mod?.default || mod;
                    const fetched = await svc.list().catch(() => []);
                    setLocalUsers(Array.isArray(fetched) ? fetched : []);
                } catch (e) {
                    // ignore fetch failure; modal will still open but assignee options may be empty
                }
            }
        } catch (e) {}
        // open activity modal in editable mode when toggled from the edit action
        setActivityModal({ open: true, item: activity, readOnly: false });
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
                <div className="pt-2 pl-0">
                    <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 rounded-md px-2 py-0.5 text-xs">
                        <img
                            alt={isDontForget ? "Don't forget" : "Key Areas"}
                            className="w-4 h-4 object-contain opacity-70"
                            src={isDontForget ? '/PM-frontend/dont-forget.png' : '/PM-frontend/key-area.png'}
                            onError={(e) => {
                                if (!e?.currentTarget) return;
                                e.currentTarget.src = isDontForget ? '/dont-forget.png' : '/key-area.png';
                            }}
                        />
                        <span className="font-medium truncate max-w-full" title={selectedKA?.title || kaTitle || ''}>{selectedKA?.title || kaTitle || (isDontForget ? "Don't Forget" : '—')}</span>
                    </div>
                </div>
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
                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none text-[20px]" aria-hidden="true" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" style={{ color: kaColor }}><path d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z"></path></svg>
                                <span className="relative z-10">{task.title || task.name || 'Task'}</span>
                            </div>
                            <div className="relative shrink-0 z-50">
                                <button
                                    type="button"
                                    aria-haspopup="menu"
                                    aria-expanded={menuOpen}
                                    onClick={(e) => {
                                        setMenuOpen((s) => !s);
                                    }}
                                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
                                    title="More actions"
                                >
                                    {/* Icon intentionally removed per UX: keep button for accessibility and interaction */}
                                    <span className="sr-only">More actions</span>
                                </button>
                                {menuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                                        <div
                                            role="menu"
                                            ref={menuRef}
                                            className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-lg shadow z-50 translate-x-2"
                                        >
                                            <button
                                                role="menuitem"
                                                className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    // Prefer delegating edit handling to parent (e.g. DontForget)
                                                    // which will open the shared EditTaskModal. Fall back to
                                                    // the component's internal edit mode only when the parent
                                                    // handler isn't provided.
                                                    // Debug: log edit request and dispatch a global fallback event
                                                    // so pages that don't pass `onRequestEdit` can still handle it.
                                                    try {
                                                        // eslint-disable-next-line no-console
                                                        console.log('[TaskFullView] Edit requested for task', task && task.id);
                                                    } catch (e) {}
                                                    if (typeof onRequestEdit === 'function') {
                                                        onRequestEdit(task);
                                                    } else {
                                                        // Dispatch a global event as a fallback so parent pages
                                                        // (like DontForget) can listen and open the shared modal.
                                                        try {
                                                            window.dispatchEvent(new CustomEvent('ka-request-edit-task', { detail: task }));
                                                        } catch (e) {}
                                                        setIsEditing(true);
                                                    }
                                                }}
                                            >
                                                Edit details
                                            </button>
                                            {!readOnly && (
                                                <button
                                                    role="menuitem"
                                                    className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                                    onClick={() => {
                                                        setMenuOpen(false);
                                                        setDelegateModalOpen(true);
                                                    }}
                                                >
                                                    Delegate task
                                                </button>
                                            )}
                                            <button
                                                role="menuitem"
                                                className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                                onClick={async () => {
                                                    setMenuOpen(false);
                                                    try {
                                                        if (typeof onDelete === 'function') await onDelete(task);
                                                    } catch (e) {
                                                        console.error('Failed to delete task from full view', e);
                                                    }
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            

            <div className="px-3 pt-3 pb-2 bg-white">
                <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <div className="text-sm">
                        <div className="grid grid-cols-9 gap-x-1">
                                <div className="text-[11px] uppercase tracking-wide text-slate-500">Responsible</div>
                                <div className="text-[11px] uppercase tracking-wide text-slate-500">Status</div>
                                <div className="text-[11px] uppercase tracking-wide text-slate-500">Priority</div>
                                <div className="text-[11px] uppercase tracking-wide text-slate-500">Quadrant</div>
                                <div className="text-[11px] uppercase tracking-wide text-slate-500">Start Date</div>
                                <div className="text-[11px] uppercase tracking-wide text-slate-500">End date</div>
                                <div className="text-[11px] uppercase tracking-wide text-slate-500">Deadline</div>
                                <div className="text-[11px] uppercase tracking-wide text-slate-500">Duration</div>
                                <div className="text-[11px] uppercase tracking-wide text-slate-500">Completed</div>
                            </div>
                            <div className="grid grid-cols-9 gap-x-1 mt-0.5">
                                <div className="text-slate-900 truncate min-w-0">{task.assignee || '—'}</div>
                                {(() => {
                                    const statusUi = mapServerStatusToUi(task.status || '');
                                    const statusColors = getStatusColorClass(statusUi);
                                    // Map UI status to a human-friendly label
                                    const statusLabel = statusUi === 'open' ? 'Open' : statusUi === 'in_progress' ? 'In Progress' : statusUi === 'done' ? 'Done' : String(statusUi).replace(/_/g, ' ');
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
                                <div className="min-w-0">{
                                    (() => {
                                            // Compute quadrant using current rules for display; fall back to server value only on error
                                            let raw = null;
                                            try {
                                                raw = computeEisenhowerQuadrant({
                                                    deadline: task.deadline || task.dueDate || task.due_date,
                                                    end_date: task.end_date || task.endDate || task.end_date,
                                                    start_date: task.start_date || task.startDate || null,
                                                    priority: task.priority,
                                                    status: task.status,
                                                    key_area_id: task.keyAreaId ?? task.key_area_id ?? null,
                                                });
                                            } catch (e) {
                                                raw = task.eisenhowerQuadrant ?? task.eisenhower_quadrant ?? null;
                                            }
                                        let qn = 4;
                                        if (typeof raw === 'number') qn = Number(raw) || 4;
                                        else if (typeof raw === 'string') {
                                            const m = raw.match(/^Q([1-4])$/i);
                                            if (m) qn = Number(m[1]);
                                            else if (/^[1-4]$/.test(raw)) qn = Number(raw);
                                        }
                                        const qc = getQuadrantColorClass ? getQuadrantColorClass(qn) : { badge: 'bg-slate-100 text-slate-700' };
                                        return (<span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${qc.badge}`}>{`Q${qn}`}</span>);
                                    })()
                                }</div>
                                <div className="text-slate-900 truncate min-w-0 whitespace-nowrap">{toDateOnly(task.start_date || task.startDate) || '—'}</div>
                                <div className="text-slate-900 truncate min-w-0 whitespace-nowrap">{toDateOnly(task.end_date || task.endDate) || '—'}</div>
                                <div className="text-slate-900 truncate min-w-0 whitespace-nowrap">{toDateOnly(task.deadline || task.dueDate || task.due_date) || '—'}</div>
                                <div className="text-slate-900 truncate min-w-0 whitespace-nowrap">{(() => {
                                    const td = (formatDuration && (formatDuration(task.start_date || task.startDate, task.end_date || task.endDate))) || '';
                                    return td || (task.duration || '—');
                                })()}</div>
                                <div className="text-slate-900 truncate min-w-0 whitespace-nowrap">{(toDateOnly(task.completionDate || task.completion_date) || '—')}</div>
                            </div>
                    </div>
                </div>
            </div>

            <div className="px-2 pt-2 bg-white">
                        <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    {!isDontForget && (
                        <div className={`px-3 py-1 rounded-md text-sm font-semibold ${tab === 'activities' ? 'bg-white text-slate-900 shadow' : ''}`} aria-label="Activities"> <span className="inline-flex items-center gap-1"><svg className="w-4 h-4" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" fill="currentColor" style={{ color: kaColor }}><path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"></path></svg>Activities</span></div>
                    )}
                </div>
            </div>

            {tab === "activities" && !isDontForget ? (
                <div className="p-4">
                    {/* Render activities for this task */}
                    <div className="mb-3">
                        {/* Full view displays activities in a table (same layout as SlideOver) */}
                        {Array.isArray(list) && list.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50 border border-slate-200 text-slate-700">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-semibold w-[160px] sm:w-[220px]">Activity</th>
                                            <th className="px-3 py-2 text-left font-semibold">Responsible</th>
                                            <th className="px-3 py-2 text-left font-semibold">Status</th>
                                            <th className="px-3 py-2 text-left font-semibold">Priority</th>
                                            <th className="px-3 py-2 text-left font-semibold">Start date</th>
                                            <th className="px-3 py-2 text-left font-semibold">End date</th>
                                            <th className="px-3 py-2 text-left font-semibold">Deadline</th>
                                            <th className="px-3 py-2 text-left font-semibold">Duration</th>
                                            <th className="px-3 py-2 text-left font-semibold">Completed</th>
                                            {/* Actions column removed — actions are available via the row menu */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {list.map((a) => (
                                            <tr key={a.id} className="bg-white border-b border-slate-100">
                                                <td className="px-3 py-2 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <ActivityMenu item={a} />
                                                        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="w-4 h-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" style={{ color: kaColor }}><path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"></path></svg>
                                                        <div className="flex flex-col">
                                                            <div className="text-sm text-slate-800 truncate max-w-[540px]">{a.text || a.activity_name || 'Untitled activity'}</div>
                                                            <div className="text-xs text-slate-500">{a.note || ''}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 align-top text-slate-700">
                                                    {Array.isArray(localUsers) && localUsers.length ? (
                                                            <select
                                                                className="text-sm rounded-md border bg-white px-2 py-1"
                                                                value={resolveAssignee({ activity: a, taskAssignee: task.assignee, users: localUsers, currentUserId }).selectValue || ''}
                                                                onChange={async (e) => {
                                                                    const sel = e.target.value;
                                                                    try { await setActivityAssignee(a.id, sel); } catch (err) { console.error(err); }
                                                                }}
                                                            >
                                                                <option value="">—</option>
                                                                {localUsers.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                                                            </select>
                                                        ) : (
                                                            resolveAssignee({ activity: a, taskAssignee: task.assignee, users: localUsers, currentUserId }).display
                                                        )}
                                                </td>
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
                                                <td className="px-3 py-2 align-top">
                                                    <select className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm" value={(function(){ const raw = a.priority ?? task.priority; if (raw === 1 || String(raw) === '1' || String(raw).toLowerCase() === 'low') return 'low'; if (raw === 3 || String(raw) === '3' || String(raw).toLowerCase() === 'high') return 'high'; return 'normal'; })()} onChange={async (e) => { try { await setActivityPriority(a.id, e.target.value); } catch (err) { console.error(err); } }}>
                                                        <option value="low">Low</option>
                                                        <option value="normal">Normal</option>
                                                        <option value="high">High</option>
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    {editingDate.id === a.id && editingDate.field === 'start_date' ? (
                                                        <input autoFocus type="date" className="border rounded px-1 py-0.5 text-sm" value={toDateOnly(a.start_date) || ''} onChange={async (e) => { try { await setActivityDate(a.id, 'start_date', e.target.value); } catch (err) { console.error(err); } }} onBlur={() => setEditingDate({ id: null, field: null })} />
                                                    ) : (
                                                        <button className="hover:bg-slate-50 rounded px-1" onClick={(e) => { e.stopPropagation(); setEditingDate({ id: a.id, field: 'start_date' }); }} title="Edit start date">{toDateOnly(a.start_date) || '—'}</button>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    {editingDate.id === a.id && editingDate.field === 'end_date' ? (
                                                        <input autoFocus type="date" className="border rounded px-1 py-0.5 text-sm" value={toDateOnly(a.end_date) || ''} onChange={async (e) => { try { await setActivityDate(a.id, 'end_date', e.target.value); } catch (err) { console.error(err); } }} onBlur={() => setEditingDate({ id: null, field: null })} />
                                                    ) : (
                                                        <button className="hover:bg-slate-50 rounded px-1" onClick={(e) => { e.stopPropagation(); setEditingDate({ id: a.id, field: 'end_date' }); }} title="Edit end date">{toDateOnly(a.end_date) || '—'}</button>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 align-top">
                                                    {editingDate.id === a.id && editingDate.field === 'deadline' ? (
                                                        <input autoFocus type="date" className="border rounded px-1 py-0.5 text-sm" value={toDateOnly(a.deadline) || ''} onChange={async (e) => { try { await setActivityDate(a.id, 'deadline', e.target.value); } catch (err) { console.error(err); } }} onBlur={() => setEditingDate({ id: null, field: null })} />
                                                    ) : (
                                                        <button className="hover:bg-slate-50 rounded px-1" onClick={(e) => { e.stopPropagation(); setEditingDate({ id: a.id, field: 'deadline' }); }} title="Edit deadline">{toDateOnly(a.deadline) || '—'}</button>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 align-top">{(formatDuration ? formatDuration(a.start_date || a.startDate, a.end_date || a.endDate) : '') || (a.duration || '')}</td>
                                                <td className="px-3 py-2 align-top text-slate-800">{toDateOnly(a.completionDate || a.completion_date) || ''}</td>
                                                {/* Actions column removed — use ActivityMenu in the first column */}
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

            {delegateModalOpen && (
                <Suspense fallback={<div role="status" aria-live="polite" className="p-4">Loading…</div>}>
                    <TaskDelegationModal
                        isOpen={delegateModalOpen}
                        task={task}
                        onClose={() => setDelegateModalOpen(false)}
                        onDelegated={(result) => {
                            try {
                                addToast({ title: 'Task delegated', variant: 'success' });
                            } catch (e) {}
                            setDelegateModalOpen(false);
                            if (result?.task && typeof onSave === 'function') onSave(result.task);
                        }}
                    />
                </Suspense>
            )}

            {activityModal.open && activityModal.item && (
                <Suspense fallback={<div role="status" aria-live="polite" className="p-4">Loading…</div>}>
                    <EditActivityModal
                        isOpen={true}
                        initialData={(() => {
                            try {
                                const act = activityModal.item || {};
                                const parentTask = task || {};
                                return {
                                    taskId: act.task_id || act.taskId || "",
                                    text: act.text || act.activity_name || "",
                                    title: act.text || act.activity_name || "",
                                    description: act.description || act.note || '',
                                    start_date: act.start_date || act.date_start || '',
                                    end_date: act.end_date || act.date_end || '',
                                    deadline: act.deadline || '',
                                    duration: act.duration || '',
                                    list: act.list_index || act.listIndex || parentTask.list || parentTask.list_index || 1,
                                    key_area_id: act.key_area_id || act.keyAreaId || parentTask.key_area_id || parentTask.keyAreaId || '',
                                    assignee: (() => {
                                        try {
                                            const raw = act.assignee || parentTask.assignee || '';
                                            if (!raw) return '';
                                            // If `raw` is a user id, map to the user's name so the select (which uses names)
                                            // matches an option. Otherwise, keep the raw value (it may already be a name).
                                            const found = (users || []).find((u) => String(u.id) === String(raw) || String(u.name) === String(raw));
                                            return found ? (found.name || '') : raw;
                                        } catch (e) { return act.assignee || parentTask.assignee || ''; }
                                    })(),
                                    priority: act.priority || act.priority_level || 'normal',
                                    goal: act.goal || act.goalId || '',
                                    completed: act.completed || false,
                                };
                            } catch (e) {
                                return {};
                            }
                        })()}
                        keyAreas={[]}
                        users={localUsers}
                        goals={goals}
                        tasks={allTasks}
                        availableLists={listNumbers}
                        onSave={async (saved) => {
                            // reuse same save logic as before for the Create modal
                            // eslint-disable-next-line no-console
                            console.log('[TaskFullView] EditActivityModal onSave saved:', saved);
                            const activityId = (saved && saved.id) ? saved.id : activityModal.item.id;
                            const prev = Array.isArray(list) ? [...list] : [];
                            const optimistic = prev.map((a) => (a.id === activityId ? { ...a, ...(saved || {}) } : a));
                            setList(optimistic);
                            setSavingActivityIds((s) => new Set([...s, activityId]));
                            try {
                                const svc = await getActivityService();
                                // Normalize date/field aliases to the API shape before sending update.
                                // Build a minimal, backend-friendly payload to avoid validation errors.
                                // The backend rejects many aliases; only include allowed fields and
                                // ensure priority is the expected string enum.
                                const apiPayload = {};
                                try {
                                    const { toDateOnly } = await import('../../utils/keyareasHelpers');
                                    if (saved) {
                                        // text
                                        if (typeof saved.text !== 'undefined' && saved.text !== null) apiPayload.text = (saved.text || '').trim();
                                        // note/notes -> normalize to `note` (backend-friendly)
                                        const noteVal = saved.notes ?? saved.note ?? saved.description ?? null;
                                        if (noteVal !== null && typeof noteVal !== 'undefined') apiPayload.note = (noteVal || '').trim();

                                        // dates: only send camelCase ISO fields (no snake_case aliases)
                                        const rawStart = saved.startDate ?? saved.start_date ?? saved.date_start ?? saved.date ?? null;
                                        const rawEnd = saved.endDate ?? saved.end_date ?? saved.date_end ?? null;
                                        const rawDeadline = saved.deadline ?? saved.dueDate ?? saved.due_date ?? null;
                                        const nStart = toDateOnly(rawStart) || null;
                                        const nEnd = toDateOnly(rawEnd) || null;
                                        const nDeadline = toDateOnly(rawDeadline) || null;
                                        if (nStart) apiPayload.startDate = nStart;
                                        if (nEnd) apiPayload.endDate = nEnd;
                                        if (nDeadline) apiPayload.deadline = nDeadline;

                                        // status/completed
                                        if (typeof saved.status !== 'undefined') apiPayload.status = saved.status;
                                        if (typeof saved.completed !== 'undefined') apiPayload.completed = !!saved.completed;

                                        // priority: backend expects string 'high'|'normal'|'low'
                                        if (typeof saved.priority !== 'undefined' && saved.priority !== null) {
                                            const p = saved.priority;
                                            let pStr = null;
                                            if (typeof p === 'number') {
                                                pStr = p === 3 ? 'high' : p === 2 ? 'normal' : 'low';
                                            } else if (typeof p === 'string') {
                                                const low = p.toLowerCase();
                                                if (['high', 'normal', 'low'].includes(low)) pStr = low;
                                            }
                                            if (pStr) apiPayload.priority = pStr;
                                        }

                                        // taskId may be useful to include when updating but is optional
                                        if (saved.taskId) apiPayload.taskId = saved.taskId;

                                        // duration: if provided and non-empty, send as-is (but avoid null/empty strings)
                                        if (typeof saved.duration !== 'undefined' && saved.duration !== null && saved.duration !== '') apiPayload.duration = saved.duration;

                                        // final safety: remove any empty string values
                                        Object.keys(apiPayload).forEach((k) => { try { if (apiPayload[k] === '') delete apiPayload[k]; } catch (__) {} });
                                    }
                                } catch (e) {
                                    // Fallback: if helper import failed, still send a minimal payload with text only
                                    if (saved && typeof saved.text !== 'undefined') apiPayload.text = (saved.text || '').trim();
                                }

                                // Debug: log final payload sent to API to help diagnose 400 errors
                                try { console.debug('[TaskFullView] activity.update payload', { activityId, apiPayload }); } catch (__) {}
                                // Also log a JSON string so nested objects/arrays are captured verbatim in console copy
                                try { console.debug('[TaskFullView] activity.update payload JSON', JSON.stringify({ activityId, apiPayload })); } catch (__) {}
                                const updated = saved && saved.id ? saved : await svc.update(activityId, apiPayload || {});
                                const norm = normalizeActivity(updated || {});
                                setList((prevList) => prevList.map((a) => (a.id === activityId ? norm : a)));
                                addToast && addToast({ title: 'Activity saved', variant: 'success' });
                                try {
                                    const nextList = (Array.isArray(list) ? list : []).map((a) => (a.id === activityId ? normalizeActivity((updated || saved) || {}) : a));
                                    window.dispatchEvent(new CustomEvent('ka-activities-updated', { detail: { refresh: true, taskId: String(task.id), list: nextList } }));
                                } catch (e) {
                                    window.dispatchEvent(new CustomEvent('ka-activities-updated', { detail: { refresh: true, taskId: String(task.id) } }));
                                }
                                setActivityModal({ open: false, item: null });
                            } catch (e) {
                                try { console.error('Failed to save activity', e); } catch (__) {}
                                // If server returned validation details, log them for debugging (stringified so they can be copied)
                                try { console.error('[TaskFullView] activity.update error response data:', e?.response?.data); } catch (__) {}
                                try { console.error('[TaskFullView] activity.update error response JSON:', JSON.stringify(e?.response?.data)); } catch (__) {}
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
                        onCancel={() => setActivityModal({ open: false, item: null })}
                        isSaving={false}
                    />
                </Suspense>
            )}
        </div>
    );
}
