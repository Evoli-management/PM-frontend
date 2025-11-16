import React from 'react';
import EmptyState from '../../components/goals/EmptyState.jsx';
import ActivityRow from './ActivityRow';
import { normalizeActivity, mapUiStatusToServer } from '../../utils/keyareasHelpers';

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
}) {
    if (!task || !task.id) return null;
    const taskKey = String(task.id);
    const list = (activitiesByTask[taskKey] || []).slice();

    const setList = (updater) => {
        const nextList = typeof updater === 'function' ? updater(list) : updater;
        setActivitiesByTask((prev) => ({ ...prev, [taskKey]: nextList }));
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
            addToast && addToast({ title: item.completed ? 'Marked completed' : 'Marked incomplete', variant: 'success' });
        } catch (e) {
            console.error('Failed to update activity completion', e);
            setList(prev);
            addToast && addToast({ title: 'Failed to update activity', variant: 'error' });
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

    return (
        <div className="space-y-2">
            {list.length === 0 ? (
                <EmptyState title="No activities for this task yet." hint="Add a new activity below." />
            ) : (
                <div>
                    {list.map((a, index) => (
                        <ActivityRow
                            key={a.id}
                            a={a}
                            index={index}
                            listLength={list.length}
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
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
