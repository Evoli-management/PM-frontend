import { useState } from 'react';
import api from '../api/keyAreasPageApi.js';
import { buildInlineTaskFieldUpdate } from '../../../components/key-areas/taskFormLogic.js';
import {
    applyStartEndDateRule,
    computeEisenhowerQuadrant,
    getPriorityLevel,
    mapUiStatusToServer,
    normalizeActivity,
    toDateOnly,
} from '../../../utils/keyareasHelpers';
import { normalizeActivityWithTask } from '../adapters/taskActivityAdapters.js';

let _activityService = null;
const getActivityService = async () => {
    if (_activityService) return _activityService;
    const mod = await import('../../../services/activityService');
    _activityService = mod.default || mod;
    return _activityService;
};

export default function useKeyAreasMutations({
    t,
    addToast,
    users,
    currentUserId,
    selectedKA,
    allTasks,
    setAllTasks,
    activitiesByTask,
    setActivitiesByTask,
    setSelectedTask,
    setSelectedTaskFull,
    refreshActivitiesForTask,
    activityAttachTaskId,
    setActivityAttachTaskId,
    editingActivityViaTaskModal,
    setEditingActivityId,
    setShowActivityComposer,
}) {
    const [savingIds, setSavingIds] = useState(new Set());
    const [savingActivityIds, setSavingActivityIds] = useState(new Set());
    const [isSavingActivity, setIsSavingActivity] = useState(false);

    const markSaving = (id, timeout = 1200) => {
        try {
            setSavingIds((state) => new Set([...state, id]));
            if (timeout) {
                setTimeout(() => {
                    setSavingIds((state) => {
                        const next = new Set(state);
                        next.delete(id);
                        return next;
                    });
                }, timeout);
            }
        } catch {}
    };

    const saveActivityName = async (activity, taskId, value) => {
        const trimmed = String(value || '').trim();
        if (!trimmed) return;

        const current = (activity?.text || activity?.activity_name || '').trim();
        if (trimmed === current) return;

        try {
            const svc = await getActivityService();
            const result = await svc.update(activity.id, { text: trimmed });
            setActivitiesByTask((prev) => {
                const key = String(taskId || activity.taskId || activity.task_id || '');
                if (!key) return prev;
                const updated = { ...prev };
                updated[key] = (updated[key] || []).map((item) => (
                    item.id === activity.id ? { ...item, ...result } : item
                ));
                return updated;
            });
        } catch (error) {
            console.error('Failed to update activity name:', error);
        }
    };

    const updateActivityField = async (activity, taskId, key, value) => {
        const tid = String(taskId || activity?.taskId || activity?.task_id || '');
        if (!tid) return;

        const prevList = Array.isArray(activitiesByTask[tid]) ? activitiesByTask[tid].slice() : [];
        const resolvedDates =
            key === 'start_date' || key === 'end_date' || key === 'deadline'
                ? applyStartEndDateRule({
                    startDate: activity?.start_date ?? activity?.startDate,
                    endDate: activity?.end_date ?? activity?.endDate,
                    deadline: activity?.deadline,
                    changedKey: key,
                    changedValue: value,
                })
                : null;

        const apiDateKeyMap = {
            start_date: 'startDate',
            end_date: 'endDate',
            startDate: 'startDate',
            endDate: 'endDate',
            deadline: 'deadline',
        };

        const optimistic = (item) => {
            if (item.id !== activity.id) return item;
            if (resolvedDates) {
                return {
                    ...item,
                    start_date: resolvedDates.startDate || null,
                    startDate: resolvedDates.startDate || null,
                    end_date: resolvedDates.endDate || null,
                    endDate: resolvedDates.endDate || null,
                    deadline: resolvedDates.deadline || null,
                };
            }
            if (key === 'status') return { ...item, status: value };
            if (key === 'priority') return { ...item, priority: value };
            if (key === 'start_date' || key === 'end_date' || key === 'deadline') return { ...item, [key]: value };
            if (key === 'assignee') {
                const selectedUser = (users || []).find((u) => String(u.id || u.member_id) === String(value));
                if (selectedUser) {
                    const selectedUserId = selectedUser.id || selectedUser.member_id;
                    const displayName =
                        currentUserId && String(selectedUserId) === String(currentUserId)
                            ? 'Me'
                            : (selectedUser.name || `${selectedUser.firstname || ''} ${selectedUser.lastname || ''}`.trim() || item.assignee || '');
                    return { ...item, assignee: displayName };
                }
                return { ...item, assignee: value || '' };
            }
            return { ...item, [key]: value };
        };

        setActivitiesByTask((prev) => ({ ...prev, [tid]: (prev[tid] || []).map(optimistic) }));
        setSavingActivityIds((state) => new Set([...state, activity.id]));

        try {
            const svc = await getActivityService();

            if (key === 'assignee') {
                const updated = await svc.update(activity.id, {
                    delegatedToUserId: value || null,
                });
                const norm = normalizeActivity(updated || {});
                setActivitiesByTask((prev) => ({
                    ...prev,
                    [tid]: (prev[tid] || []).map((item) => (item.id === activity.id ? { ...item, ...norm } : item)),
                }));
                addToast && addToast({ title: t('keyAreas.toastSaved'), variant: 'success' });
            } else {
                const body = {};

                if (key === 'status') body.status = mapUiStatusToServer(value);
                else if (key === 'priority') body.priority = value;
                else if (resolvedDates) {
                    const toIsoOrNull = (dateValue) => {
                        if (!dateValue) return null;
                        if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue))) {
                            try {
                                const [y, m, d] = String(dateValue).split('-').map((s) => parseInt(s, 10));
                                return new Date(Date.UTC(y, m - 1, d)).toISOString();
                            } catch {
                                return String(dateValue);
                            }
                        }
                        return String(dateValue);
                    };
                    body.startDate = toIsoOrNull(resolvedDates.startDate);
                    body.endDate = toIsoOrNull(resolvedDates.endDate);
                    body.deadline = toIsoOrNull(resolvedDates.deadline);
                } else if (apiDateKeyMap[key]) {
                    const apiKey = apiDateKeyMap[key];
                    if (!value) body[apiKey] = null;
                    else if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
                        try {
                            const [y, m, d] = String(value).split('-').map((s) => parseInt(s, 10));
                            body[apiKey] = new Date(Date.UTC(y, m - 1, d)).toISOString();
                        } catch {
                            body[apiKey] = String(value);
                        }
                    } else {
                        body[apiKey] = String(value);
                    }
                } else {
                    body[key] = value;
                }

                const updated = await svc.update(activity.id, body);
                const norm = normalizeActivity(updated || {});
                setActivitiesByTask((prev) => ({
                    ...prev,
                    [tid]: (prev[tid] || []).map((item) => (item.id === activity.id ? { ...item, ...norm } : item)),
                }));
                addToast && addToast({ title: t('keyAreas.toastSaved'), variant: 'success' });
            }
        } catch (error) {
            console.error('Failed to update activity', error);
            setActivitiesByTask((prev) => ({ ...prev, [tid]: prevList }));
            addToast && addToast({ title: t('keyAreas.toastUpdateActivityFailed'), variant: 'error' });
        } finally {
            setSavingActivityIds((state) => {
                const next = new Set(state);
                next.delete(activity.id);
                return next;
            });
        }
    };

    const updateField = async (id, key, value) => {
        const prev = Array.isArray(allTasks) ? allTasks.slice() : [];
        const prevTask = prev.find((task) => task.id === id);
        if (!prevTask) return;

        const inlineUpdate = buildInlineTaskFieldUpdate({
            task: prevTask,
            key,
            value,
            usersList: users || [],
            currentUserId,
            getPriorityLevel,
        });

        const optimistic = (task) => {
            if (task.id !== id) return task;
            return { ...task, ...inlineUpdate.optimistic };
        };

        setAllTasks((prevState) => prevState.map(optimistic));
        markSaving(id, 2000);

        if (!inlineUpdate.persist || !inlineUpdate.patch) return;

        const patch = {
            list_index: prevTask.list_index || prevTask.list || 1,
            key_area_id: prevTask.key_area_id || prevTask.keyAreaId || null,
            ...inlineUpdate.patch,
        };

        try {
            const updated = await api.updateTask(id, patch);
            setAllTasks((prevState) => prevState.map((task) => (task.id === id ? { ...task, ...updated } : task)));
            setSelectedTaskFull((prevFull) =>
                prevFull && String(prevFull.id) === String(id) ? { ...prevFull, ...updated } : prevFull,
            );
            markSaving(id);
        } catch (err) {
            console.error('[KeyAreas] Failed to update task field', err);
            setAllTasks(prev);
            try {
                addToast && addToast({ type: 'error', message: err?.message || t('keyAreas.toastSaveFailed') });
            } catch {}
        }
    };

    const handleSaveTask = async (updated) => {
        const q = computeEisenhowerQuadrant({
            deadline: updated.deadline,
            end_date: updated.end_date,
            start_date: updated.start_date || updated.startDate,
            priority: updated.priority,
            status: updated.status,
            key_area_id: updated.key_area_id || updated.keyAreaId || updated.key_area || updated.keyArea,
        });

        const payload = {
            ...updated,
            priority: (() => {
                const raw = updated.priority;
                if (raw === undefined || raw === null || raw === '') return undefined;
                const n = Number(raw);
                if (!Number.isNaN(n)) return n === 1 ? 'low' : n === 3 ? 'high' : 'medium';
                const p = String(raw).toLowerCase();
                if (p === 'med' || p === 'normal') return 'medium';
                if (p === 'low' || p === 'medium' || p === 'high') return p;
                return undefined;
            })(),
            eisenhower_quadrant: q,
        };

        const saved = await api.updateTask(payload.id, payload);
        setAllTasks((prev) => prev.map((task) => (task.id === saved.id ? { ...task, ...saved } : task)));

        const originalTask = allTasks.find((task) => task.id === saved.id);
        const keyAreaChanged = originalTask &&
            String(originalTask.key_area_id || originalTask.keyAreaId) !== String(saved.key_area_id || saved.keyAreaId);
        const listChanged = originalTask &&
            String(originalTask.list_index || originalTask.list || originalTask.listIndex || '') !==
            String(saved.list_index || saved.list || saved.listIndex || '');

        if (keyAreaChanged || listChanged) {
            const nextKeyAreaId = saved.key_area_id || saved.keyAreaId || null;
            const nextListIndex = saved.list_index || saved.list || saved.listIndex || null;
            setActivitiesByTask((prev) => {
                const taskKey = String(saved.id);
                if (!Array.isArray(prev[taskKey]) || prev[taskKey].length === 0) return prev;
                return {
                    ...prev,
                    [taskKey]: prev[taskKey].map((activity) => ({
                        ...activity,
                        keyAreaId: nextKeyAreaId,
                        key_area_id: nextKeyAreaId,
                        ...(nextListIndex !== null
                            ? { list: nextListIndex, list_index: nextListIndex, listIndex: nextListIndex }
                            : {}),
                    })),
                };
            });
        }

        if (keyAreaChanged) {
            setSelectedTaskFull(null);
            try {
                addToast && addToast({ type: 'success', message: t('keyAreas.toastMovedKeyArea') });
            } catch {}
        }

        await refreshActivitiesForTask(saved.id);
        setSelectedTask(null);
    };

    const handleActivityModalSave = async (payload) => {
        setIsSavingActivity(true);

        try {
            const svc = await getActivityService();
            const mapPriorityToApi = (priority) => {
                if (priority === undefined || priority === null || priority === '') return undefined;
                const num = Number(priority);
                if (!Number.isNaN(num)) {
                    if (num <= 1) return 'low';
                    if (num >= 3) return 'high';
                    return 'normal';
                }
                const value = String(priority).toLowerCase();
                if (value === 'low' || value === 'normal' || value === 'high') return value;
                if (value === 'medium' || value === 'med') return 'normal';
                return undefined;
            };

            const body = {
                text: (payload.text || payload.activity_name || payload.title || '').trim(),
                completed: !!payload.completed,
            };

            if (payload.startDate !== undefined || payload.start_date !== undefined || payload.date_start !== undefined) {
                body.startDate = toDateOnly(payload.startDate ?? payload.start_date ?? payload.date_start) || null;
            }
            if (payload.endDate !== undefined || payload.end_date !== undefined || payload.date_end !== undefined) {
                body.endDate = toDateOnly(payload.endDate ?? payload.end_date ?? payload.date_end) || null;
            }
            if (payload.deadline !== undefined || payload.dueDate !== undefined || payload.due_date !== undefined) {
                body.deadline = toDateOnly(payload.deadline ?? payload.dueDate ?? payload.due_date) || null;
            }
            if (typeof payload.duration !== 'undefined') {
                const durationRaw = payload.duration;
                body.duration = durationRaw === null ? null : String(durationRaw).trim() || null;
            }
            if (typeof payload.priority !== 'undefined') body.priority = mapPriorityToApi(payload.priority);
            if (payload.goalId || payload.goal || payload.goal_id) body.goalId = payload.goalId || payload.goal || payload.goal_id;
            if (payload.completionDate) body.completionDate = payload.completionDate;
            if (payload.taskId || payload.task_id) body.taskId = payload.taskId || payload.task_id;
            if (payload.delegatedToUserId) body.delegatedToUserId = payload.delegatedToUserId;

            if (payload.id) {
                const updated = await svc.update(payload.id, body);
                const sourceTaskId =
                    editingActivityViaTaskModal?.taskId ||
                    payload.originalTaskId ||
                    payload.original_task_id ||
                    activityAttachTaskId ||
                    null;
                const targetTaskId =
                    updated?.taskId ||
                    updated?.task_id ||
                    body.taskId ||
                    payload.taskId ||
                    payload.task_id ||
                    sourceTaskId ||
                    null;
                const normalizedUpdated = normalizeActivity(updated || {});

                setActivitiesByTask((prev) => {
                    const next = { ...prev };
                    const sourceKey = sourceTaskId ? String(sourceTaskId) : null;
                    const targetKey = targetTaskId ? String(targetTaskId) : null;

                    if (sourceKey) {
                        const sourceList = Array.isArray(next[sourceKey]) ? next[sourceKey] : [];
                        next[sourceKey] = sourceList.filter((activity) => String(activity.id) !== String(payload.id));
                    }

                    if (targetKey) {
                        const parentTask = (allTasks || []).find((task) => String(task.id) === String(targetKey)) || null;
                        const targetList = Array.isArray(next[targetKey]) ? next[targetKey] : [];
                        const targetActivity = normalizeActivityWithTask(normalizedUpdated, parentTask);
                        const existingIndex = targetList.findIndex((activity) => String(activity.id) === String(payload.id));
                        if (existingIndex >= 0) {
                            const copy = targetList.slice();
                            copy[existingIndex] = targetActivity;
                            next[targetKey] = copy;
                        } else {
                            next[targetKey] = [...targetList, targetActivity];
                        }
                    }

                    return next;
                });

                const refreshTaskIds = [...new Set(
                    [sourceTaskId, targetTaskId]
                        .filter((id) => id !== null && id !== undefined && `${id}`.trim() !== '')
                        .map((id) => String(id)),
                )];
                refreshTaskIds.forEach((taskId) => {
                    (async () => {
                        try {
                            const list = await svc.list({ taskId });
                            setActivitiesByTask((prev) => ({
                                ...prev,
                                [String(taskId)]: Array.isArray(list) ? list.map(normalizeActivity) : [],
                            }));
                        } catch {}
                    })();
                });
            } else {
                if (payload.taskId) body.taskId = payload.taskId;
                const created = await svc.create(body);
                const tid = body.taskId || activityAttachTaskId || null;

                try {
                    if (tid) {
                        const taskKey = String(tid);
                        const norm = normalizeActivity({ ...(created || {}), ...(body || {}) });
                        setActivitiesByTask((prev) => {
                            const copy = Array.isArray(prev[taskKey]) ? prev[taskKey].slice() : [];
                            copy.push(norm);
                            return { ...prev, [taskKey]: copy };
                        });
                        (async () => {
                            try {
                                const list = await svc.list({ taskId: tid });
                                setActivitiesByTask((prev) => ({
                                    ...prev,
                                    [String(tid)]: Array.isArray(list) ? list.map(normalizeActivity) : [],
                                }));
                            } catch {}
                        })();
                    }
                } catch {
                    try {
                        if (tid) {
                            const list = await svc.list({ taskId: tid });
                            setActivitiesByTask((prev) => ({
                                ...prev,
                                [String(tid)]: Array.isArray(list) ? list.map(normalizeActivity) : [],
                            }));
                        }
                    } catch {}
                }
            }

            window.dispatchEvent(new CustomEvent('ka-activities-updated', { detail: { refresh: true } }));
            setShowActivityComposer(false);
            setEditingActivityId(null);
            setActivityAttachTaskId(null);
        } catch (err) {
            console.error('Failed to save activity from modal', err);
            console.error('Save activity error response data:', err?.response?.data);
            alert(t('keyAreas.alertSaveActivityFailed'));
        } finally {
            setIsSavingActivity(false);
        }
    };

    const handleDeleteTask = async (task) => {
        try {
            let list = activitiesByTask[String(task.id)];
            if (!Array.isArray(list)) {
                const svc = await getActivityService();
                list = await svc.list({ taskId: task.id });
            }
            const count = Array.isArray(list) ? list.length : 0;
            if (count > 0) {
                alert(
                    `Cannot delete this task because it has ${count} activit${count === 1 ? 'y' : 'ies'}. Remove those activities first.`,
                );
                return;
            }
        } catch (e) {
            console.error('Failed to verify activities before delete', e);
            alert(t('keyAreas.alertVerifyActivitiesFailed'));
            return;
        }

        await api.deleteTask(task.id);
        setAllTasks((prev) => prev.filter((item) => item.id !== task.id));
        setActivitiesByTask((prev) => {
            const copy = { ...(prev || {}) };
            delete copy[String(task.id)];
            return copy;
        });
        setSelectedTask(null);
    };

    return {
        handleActivityModalSave,
        handleDeleteTask,
        handleSaveTask,
        isSavingActivity,
        saveActivityName,
        savingActivityIds,
        savingIds,
        setSavingActivityIds,
        updateActivityField,
        updateField,
    };
}
