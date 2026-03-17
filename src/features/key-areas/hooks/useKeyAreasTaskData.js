import { useCallback, useEffect, useState } from 'react';
import taskDelegationService from '../../../services/taskDelegationService';
import activityDelegationService from '../../../services/activityDelegationService';
import api from '../api/keyAreasPageApi.js';
import {
    normalizeActivityWithTask,
    normalizeTaskForUi,
} from '../adapters/taskActivityAdapters.js';
import { normalizeActivity } from '../../../utils/keyareasHelpers';

let _taskService = null;
const getTaskService = async () => {
    if (_taskService) return _taskService;
    const mod = await import('../../../services/taskService');
    _taskService = mod.default || mod;
    return _taskService;
};

let _activityService = null;
const getActivityService = async () => {
    if (_activityService) return _activityService;
    const mod = await import('../../../services/activityService');
    _activityService = mod.default || mod;
    return _activityService;
};

export default function useKeyAreasTaskData({
    viewTab,
    selectedKA,
    selectedTaskFullId,
    refreshTick,
}) {
    const [allTasks, setAllTasks] = useState([]);
    const [delegatedTasks, setDelegatedTasks] = useState([]);
    const [delegatedActivities, setDelegatedActivities] = useState([]);
    const [pendingDelegationsLoading, setPendingDelegationsLoading] = useState(false);
    const [activitiesByTask, setActivitiesByTask] = useState({});

    const refreshDelegatedData = useCallback(async ({ showLoading = false } = {}) => {
        if (showLoading) setPendingDelegationsLoading(true);
        try {
            const [delegatedToMe, delegatedToMeActivities] = await Promise.all([
                taskDelegationService.getDelegatedToMe(),
                activityDelegationService.getDelegatedToMe(),
            ]);

            const nextTasks = Array.isArray(delegatedToMe) ? delegatedToMe : [];
            const nextActivities = Array.isArray(delegatedToMeActivities) ? delegatedToMeActivities : [];

            setDelegatedTasks(nextTasks);
            setDelegatedActivities(nextActivities);
            setAllTasks(nextTasks);
            setActivitiesByTask({});
        } catch (e) {
            console.error('Failed to load delegated tasks', e);
            setDelegatedTasks([]);
            setDelegatedActivities([]);
            setAllTasks([]);
            setActivitiesByTask({});
        } finally {
            if (showLoading) setPendingDelegationsLoading(false);
        }
    }, []);

    const refreshActivitiesForTask = useCallback(async (taskId) => {
        try {
            const svc = await getActivityService();
            const list = await svc.list({ taskId });
            try {
                console.info('KeyAreas.refreshActivitiesForTask', {
                    taskId: String(taskId),
                    returned: Array.isArray(list) ? list.length : 0,
                });
            } catch (_) {}
            setActivitiesByTask((prev) => ({
                ...prev,
                [String(taskId)]: Array.isArray(list) ? list.map(normalizeActivity) : [],
            }));
        } catch (e) {
            console.error('Failed to refresh activities', e);
            setActivitiesByTask((prev) => ({ ...prev, [String(taskId)]: [] }));
        }
    }, []);

    const refreshAllActivities = useCallback(async () => {
        if (!Array.isArray(allTasks) || allTasks.length === 0) return;
        try {
            try { console.info('KeyAreas.refreshAllActivities starting', { taskCount: allTasks.length }); } catch (_) {}
            const svc = await getActivityService();
            const entries = await Promise.all(
                allTasks.map(async (task) => {
                    try {
                        const list = await svc.list({ taskId: task.id });
                        try {
                            console.info('KeyAreas.refreshAllActivities.item', {
                                taskId: String(task.id),
                                returned: Array.isArray(list) ? list.length : 0,
                            });
                        } catch (_) {}
                        return [String(task.id), Array.isArray(list) ? list.map(normalizeActivity) : []];
                    } catch {
                        return [String(task.id), []];
                    }
                }),
            );
            const grouped = Object.fromEntries(entries);
            try {
                console.info('KeyAreas.refreshAllActivities completed', {
                    loadedTaskKeys: Object.keys(grouped).length,
                });
            } catch (_) {}
            setActivitiesByTask(grouped);
        } catch (e) {
            console.error('Failed to load activities for tasks', e);
        }
    }, [allTasks]);

    useEffect(() => {
        refreshAllActivities();
    }, [allTasks.length, refreshAllActivities]);

    useEffect(() => {
        const handler = (e) => {
            const detail = e?.detail || {};
            if (detail.sourceTaskId || detail.targetTaskId) {
                setActivitiesByTask((prev) => {
                    const next = { ...prev };
                    const sourceKey = detail.sourceTaskId ? String(detail.sourceTaskId) : null;
                    const targetKey = detail.targetTaskId ? String(detail.targetTaskId) : null;

                    if (sourceKey) {
                        if (Array.isArray(detail.sourceList)) {
                            next[sourceKey] = detail.sourceList.map(normalizeActivity);
                        } else {
                            const sourceList = Array.isArray(next[sourceKey]) ? next[sourceKey] : [];
                            next[sourceKey] = sourceList.filter(
                                (activity) => String(activity.id) !== String(detail.movedActivity?.id),
                            );
                        }
                    }

                    if (targetKey && detail.movedActivity) {
                        const parentTask = (allTasks || []).find((task) => String(task.id) === String(targetKey)) || null;
                        const targetList = Array.isArray(next[targetKey]) ? next[targetKey] : [];
                        const moved = normalizeActivityWithTask(detail.movedActivity, parentTask);
                        const existingIndex = targetList.findIndex((activity) => String(activity.id) === String(moved.id));
                        if (existingIndex >= 0) {
                            const copy = targetList.slice();
                            copy[existingIndex] = moved;
                            next[targetKey] = copy;
                        } else {
                            next[targetKey] = [...targetList, moved];
                        }
                    }

                    return next;
                });
                return;
            }

            if (detail.taskId && Array.isArray(detail.list)) {
                setActivitiesByTask((prev) => ({
                    ...prev,
                    [String(detail.taskId)]: detail.list.map(normalizeActivity),
                }));
                return;
            }

            if (detail?.refresh) refreshAllActivities();
        };

        window.addEventListener('ka-activities-updated', handler);
        return () => window.removeEventListener('ka-activities-updated', handler);
    }, [allTasks, refreshAllActivities]);

    useEffect(() => {
        if (!selectedTaskFullId) return;
        const key = String(selectedTaskFullId);
        try {
            const existing = activitiesByTask[key];
            if (!Array.isArray(existing) || existing.length === 0) {
                refreshActivitiesForTask(selectedTaskFullId).catch((err) => {
                    console.error('Failed to load activities for selectedTaskFull', err);
                });
            }
        } catch {
            refreshActivitiesForTask(selectedTaskFullId).catch((err) => console.error(err));
        }
    }, [activitiesByTask, refreshActivitiesForTask, selectedTaskFullId]);

    useEffect(() => {
        if (viewTab === 'delegated') {
            refreshDelegatedData({ showLoading: true });
            return;
        }

        if (viewTab === 'todo') {
            (async () => {
                try {
                    const svc = await getTaskService();
                    const allUserTasks = await svc.list({});
                    const normalizedTasks = Array.isArray(allUserTasks)
                        ? allUserTasks.map((task) => normalizeTaskForUi(task))
                        : [];
                    setAllTasks(normalizedTasks);

                    const actSvc = await getActivityService();
                    const entries = await Promise.all(
                        normalizedTasks.map(async (row) => {
                            try {
                                const list = await actSvc.list({ taskId: row.id });
                                return [
                                    String(row.id),
                                    Array.isArray(list)
                                        ? list.map((activity) => normalizeActivityWithTask(activity, row))
                                        : [],
                                ];
                            } catch {
                                return [String(row.id), []];
                            }
                        }),
                    );
                    setActivitiesByTask(Object.fromEntries(entries));
                } catch (e) {
                    console.error('Failed to load all tasks', e);
                }
            })();
            return;
        }

        if (viewTab === 'activity-trap') {
            (async () => {
                try {
                    const svc = await getTaskService();
                    const trapTasks = await svc.list({ withoutGoal: true });
                    const normalizedTrapTasks = Array.isArray(trapTasks)
                        ? trapTasks.map((task) => normalizeTaskForUi(task))
                        : [];
                    setAllTasks(normalizedTrapTasks);

                    const actSvc = await getActivityService();
                    const entries = await Promise.all(
                        normalizedTrapTasks.map(async (row) => {
                            try {
                                const list = await actSvc.list({ taskId: row.id });
                                return [
                                    String(row.id),
                                    Array.isArray(list)
                                        ? list.map((activity) => normalizeActivityWithTask(activity, row))
                                        : [],
                                ];
                            } catch {
                                return [String(row.id), []];
                            }
                        }),
                    );
                    setActivitiesByTask(Object.fromEntries(entries));
                } catch (e) {
                    console.error('Failed to load activity trap tasks', e);
                }
            })();
            return;
        }

        if (viewTab !== 'active-tasks' || !selectedKA) return;

        (async () => {
            const tasks = await api.listTasks(selectedKA.id, { keyAreaId: selectedKA.id });
            setAllTasks(tasks);
            try {
                const svc = await getActivityService();
                const entries = await Promise.all(
                    (tasks || []).map(async (row) => {
                        try {
                            const list = await svc.list({ taskId: row.id });
                            return [String(row.id), Array.isArray(list) ? list.map(normalizeActivity) : []];
                        } catch {
                            return [String(row.id), []];
                        }
                    }),
                );
                setActivitiesByTask(Object.fromEntries(entries));
            } catch {
                // Ignore activity load failures in active tasks view.
            }
        })();
    }, [viewTab, selectedKA?.id, refreshTick, refreshDelegatedData]);

    return {
        allTasks,
        setAllTasks,
        delegatedTasks,
        setDelegatedTasks,
        delegatedActivities,
        setDelegatedActivities,
        pendingDelegationsLoading,
        activitiesByTask,
        setActivitiesByTask,
        refreshDelegatedData,
        refreshActivitiesForTask,
        refreshAllActivities,
    };
}
