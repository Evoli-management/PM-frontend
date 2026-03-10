import React from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from '../../components/goals/EmptyState.jsx';
import ActivityRow from './ActivityRow';
import { normalizeActivity, mapUiStatusToServer } from '../../utils/keyareasHelpers';
import BulkFieldPickerModal from '../shared/BulkFieldPickerModal';

// Lazy service getter to avoid circular imports
let _activityService = null;
const getActivityService = async () => {
    if (_activityService) return _activityService;
    const mod = await import('../../services/activityService');
    _activityService = mod.default || mod;
    return _activityService;
};

export default function ActivityList({
    task,
    activitiesByTask = {},
    setActivitiesByTask,
    savingActivityIds = new Set(),
    setSavingActivityIds = () => {},
    getPriorityLevel,
    addToast,
    // when true, allow inline editing (used by KeyAreas inline-edit mode)
    enableInlineEditing = false,
    // optional users for responsible dropdown
    users = [],
    currentUserId = null,
    goals = [],
}) {
    const { t } = useTranslation();
    if (!task || !task.id) return null;
    const taskKey = String(task.id);
    const list = (activitiesByTask[taskKey] || []).slice();
    const [selectedActivityIds, setSelectedActivityIds] = React.useState(new Set());
    const [showMassFieldPicker, setShowMassFieldPicker] = React.useState(false);

    const setList = (updater) => {
        const nextList = typeof updater === 'function' ? updater(list) : updater;
        setActivitiesByTask((prev) => ({ ...prev, [taskKey]: nextList }));
    };

    React.useEffect(() => {
        setSelectedActivityIds((prev) => {
            const next = new Set(
                Array.from(prev).filter((id) => list.some((a) => String(a.id) === String(id))),
            );
            return next.size === prev.size ? prev : next;
        });
    }, [list]);

    const toggleSelectActivity = (id) => {
        setSelectedActivityIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    React.useEffect(() => {
        window.dispatchEvent(
            new CustomEvent('ka-activity-selection-change', {
                detail: { taskId: taskKey, count: selectedActivityIds.size },
            }),
        );
    }, [selectedActivityIds.size, taskKey]);

    React.useEffect(() => {
        const onMassAction = async (event) => {
            const requestedTaskId = String(event?.detail?.taskId || '');
            if (requestedTaskId !== taskKey) return;
            if (selectedActivityIds.size === 0) return;
            const action = event?.detail?.action;
            if (action === 'edit') {
                setShowMassFieldPicker(true);
                return;
            }
            if (action === 'delete') {
                const selected = list.filter((a) => selectedActivityIds.has(a.id));
                const confirmed = window.confirm(t('unifiedTable.confirmDeleteSelected') || 'Delete selected items?');
                if (!confirmed) return;
                for (const activity of selected) {
                    // eslint-disable-next-line no-await-in-loop
                    await remove(activity.id);
                }
                setSelectedActivityIds(new Set());
            }
        };

        window.addEventListener('ka-activity-mass-action', onMassAction);
        return () => window.removeEventListener('ka-activity-mass-action', onMassAction);
    }, [list, remove, selectedActivityIds, taskKey, t]);

    // Generic single-field update for activities with optimistic UI
    const updateActivityField = async (id, key, value) => {
        const prevList = Array.isArray(list) ? list.slice() : [];
        const prevItem = prevList.find((a) => a.id === id);
        if (!prevItem) return;

        const optimistic = (a) => (a.id === id ? { ...a, [key]: value } : a);
        setList((prev) => prev.map(optimistic));
        setSavingActivityIds((s) => new Set([...s, id]));

        try {
            if (key === 'assignee') {
                try {
                    const svc = await getActivityService();
                    const updated = await svc.update(id, {
                        delegatedToUserId: value || null,
                    });
                    const norm = normalizeActivity(updated || {});
                    setList((prev) => prev.map((a) => (a.id === id ? { ...a, ...norm } : a)));
                    addToast && addToast({ title: t('activityList.saved'), variant: 'success' });
                } catch (err) {
                    console.error('Failed to update activity assignee', err);
                    setList(prevList);
                    addToast && addToast({ title: t('activityList.failedUpdateAssignee'), variant: 'error' });
                }
                return;
            }
            const svc = await getActivityService();
            const body = {};
            if (key === 'text' || key === 'title') body.text = value;
            else if (key === 'completed') body.completed = !!value;
            else if (key === 'priority') body.priority = value;
            else if (key === 'startDate' || key === 'endDate' || key === 'deadline') {
                // convert YYYY-MM-DD to ISO datetime at UTC midnight to satisfy server
                if (!value) body[key] = null;
                else if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
                    try {
                        const [y, m, d] = String(value).split('-').map((s) => parseInt(s, 10));
                        body[key] = new Date(Date.UTC(y, m - 1, d)).toISOString();
                    } catch (err) {
                        body[key] = String(value);
                    }
                } else {
                    body[key] = String(value);
                }
            } else body[key] = value;

            // debug: log payload before sending
            // eslint-disable-next-line no-console
            console.debug('[ActivityList] update activity payload', id, body);
            const updated = await svc.update(id, body);
            // normalize & replace
            const norm = normalizeActivity(updated || {});
            setList((prev) => prev.map((a) => (a.id === id ? { ...a, ...norm } : a)));
            addToast && addToast({ title: t('activityList.saved'), variant: 'success' });
        } catch (e) {
            // print server validation response when available
            // eslint-disable-next-line no-console
            console.error('Failed to update activity', e?.response?.data || e?.message || e);
            setList(prevList);
            addToast && addToast({ title: t('activityList.failedUpdateActivity'), variant: 'error' });
        } finally {
            setSavingActivityIds((s) => {
                const copy = new Set(s);
                copy.delete(id);
                return copy;
            });
        }
    };

    const toggleComplete = async (id) => {
        if (savingActivityIds.has(id)) return;
        const prev = Array.isArray(list) ? [...list] : [];
        const next = prev.map((a) =>
            a.id === id ? { ...a, completed: !a.completed, completionDate: !a.completed ? new Date().toISOString() : null } : a,
        );
        setList(next);
        setSavingActivityIds((s) => new Set([...s, id]));
        try {
            const svc = await getActivityService();
            const item = next.find((a) => a.id === id);
            await svc.update(id, { completed: !!item.completed, completionDate: item.completed ? new Date().toISOString() : null });
            addToast && addToast({ title: item.completed ? t('activityList.markedCompleted') : t('activityList.markedIncomplete'), variant: 'success' });
        } catch (e) {
            console.error('Failed to update activity completion', e);
            setList(prev);
            addToast && addToast({ title: t('activityList.failedUpdateActivity'), variant: 'error' });
        } finally {
            setSavingActivityIds((s) => {
                const copy = new Set(s);
                copy.delete(id);
                return copy;
            });
        }
    };

    const remove = async (id) => {
        try {
            const svc = await getActivityService();
            await svc.remove(id);
            setList(list.filter((a) => a.id !== id));
            window.dispatchEvent(new CustomEvent('ka-activities-updated', { detail: { refresh: true } }));
        } catch (e) {
            console.error('Failed to delete activity', e);
        }
    };

    const move = (id, dir) => {
        const idx = list.findIndex((a) => a.id === id);
        if (idx < 0) return;
        const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= list.length) return;
        const copy = list.slice();
        const tmp = copy[idx];
        copy[idx] = copy[swapIdx];
        copy[swapIdx] = tmp;
        setList(copy);
    };

    const addNew = async (name) => {
        const text = (name || '').trim();
        if (!text) return;
        try {
            const svc = await getActivityService();
            const created = await svc.create({ text, taskId: task.id });
            setList([...(list || []), normalizeActivity(created || {})]);
            window.dispatchEvent(new CustomEvent('ka-activities-updated', { detail: { refresh: true } }));
        } catch (e) {
            console.error('Failed to add activity', e);
        }
    };

    const handleMassEdit = async (field, value) => {
        const selected = list.filter((a) => selectedActivityIds.has(a.id));
        if (selected.length === 0) return;

        for (const activity of selected) {
            if (field === 'date') {
                // eslint-disable-next-line no-await-in-loop
                await updateActivityField(activity.id, 'startDate', value?.start_date || null);
                // eslint-disable-next-line no-await-in-loop
                await updateActivityField(activity.id, 'endDate', value?.end_date || null);
                // eslint-disable-next-line no-await-in-loop
                await updateActivityField(activity.id, 'deadline', value?.deadline || null);
            } else if (field === 'assignee') {
                // eslint-disable-next-line no-await-in-loop
                await updateActivityField(activity.id, 'assignee', value || null);
            } else if (field === 'goalId') {
                // eslint-disable-next-line no-await-in-loop
                await updateActivityField(activity.id, 'goalId', value || null);
            } else if (field === 'duration') {
                // eslint-disable-next-line no-await-in-loop
                await updateActivityField(activity.id, 'duration', value || null);
            } else {
                // eslint-disable-next-line no-await-in-loop
                await updateActivityField(activity.id, field, value);
            }
        }

        setSelectedActivityIds(new Set());
        setShowMassFieldPicker(false);
    };

    return (
        <div className="space-y-2">
            <BulkFieldPickerModal
                isOpen={showMassFieldPicker}
                title="Select field"
                fields={[
                    { value: 'assignee', label: 'Responsible' },
                    { value: 'status', label: 'Status' },
                    { value: 'priority', label: 'Priority' },
                    { value: 'goalId', label: 'Goal' },
                    { value: 'duration', label: 'Duration' },
                    { value: 'date', label: 'Date' },
                ]}
                users={users}
                goals={goals}
                onCancel={() => setShowMassFieldPicker(false)}
                onSave={handleMassEdit}
            />

            {list.length === 0 ? (
                <EmptyState title={t('activityList.emptyTitle')} hint={t('activityList.emptyHint')} />
            ) : (
                <div>
                    {list.map((a, index) => (
                        <ActivityRow
                            key={a.id}
                            a={a}
                            index={index}
                            listLength={list.length}
                            selected={selectedActivityIds.has(a.id)}
                            onToggleSelect={toggleSelectActivity}
                            toggleComplete={toggleComplete}
                            savingActivityIds={savingActivityIds}
                            remove={remove}
                            onEdit={() => {
                                try {
                                    // Debug: log before dispatching the global edit event
                                    // so we can trace whether the editor or composer flow runs.
                                    // eslint-disable-next-line no-console
                                    console.log('ActivityList: dispatching ka-open-activity-editor', { activity: a, taskId: task.id });
                                    window.dispatchEvent(new CustomEvent('ka-open-activity-editor', { detail: { activity: a, taskId: task.id } }));
                                } catch (err) {
                                    // eslint-disable-next-line no-console
                                    console.error('ActivityList: failed to dispatch ka-open-activity-editor', err);
                                }
                            }}
                            onCreateAsTask={() => {
                                if (a.created_task_id) return;
                                try {
                                    window.dispatchEvent(new CustomEvent('ka-create-task-from-activity', { detail: { taskId: task.id, activity: a } }));
                                } catch {}
                            }}
                            move={move}
                            getPriorityLevel={getPriorityLevel}
                            taskPriority={task.priority}
                            taskAssignee={task.assignee}
                            // inline-edit props
                            enableInlineEditing={enableInlineEditing}
                            updateField={updateActivityField}
                            users={users}
                            currentUserId={currentUserId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
