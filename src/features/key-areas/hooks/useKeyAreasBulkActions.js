import { useCallback, useEffect, useRef, useState } from 'react';

export default function useKeyAreasBulkActions({
    activitiesByTask,
    allTasks,
    api,
    computeEisenhowerQuadrant,
    currentUserId,
    getActivityService,
    handleDeleteTask,
    normalizeActivityWithTask,
    selectedActivityIdsInPanel,
    selectedTaskInPanel,
    setActivitiesByTask,
    setAllTasks,
    setSelectedActivityIdsInPanel,
    setShowActivityMassFieldPicker,
    sortedTasks,
    updateActivityField,
    users,
}) {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showMassEdit, setShowMassEdit] = useState(false);
    const [showMassFieldPicker, setShowMassFieldPicker] = useState(false);
    const [massEditField, setMassEditField] = useState(null);
    const tasksDisplayRef = useRef(null);

    useEffect(() => {
        if (selectedIds.size === 0) {
            if (showMassEdit) setShowMassEdit(false);
            if (showMassFieldPicker) setShowMassFieldPicker(false);
            if (massEditField) setMassEditField(null);
        }
    }, [massEditField, selectedIds, showMassEdit, showMassFieldPicker]);

    const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds]);

    const toggleSelect = useCallback((id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
        setShowMassFieldPicker(false);
        setMassEditField(null);
    }, []);

    const selectAllVisible = useCallback(() => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            const allVisibleSelected = sortedTasks.every((task) => next.has(task.id));

            if (allVisibleSelected) {
                sortedTasks.forEach((task) => next.delete(task.id));
            } else {
                sortedTasks.forEach((task) => next.add(task.id));
            }

            return next;
        });
    }, [sortedTasks]);

    const handleBulkDeleteSelected = useCallback(async () => {
        if (selectedIds.size === 0) return;

        const confirmed = window.confirm('Delete selected tasks?');
        if (!confirmed) return;

        for (const id of Array.from(selectedIds)) {
            const task = allTasks.find((item) => String(item.id) === String(id));
            if (!task) continue;

            try {
                // eslint-disable-next-line no-await-in-loop
                await handleDeleteTask(task);
            } catch (error) {
                console.error('Failed to delete selected task', task, error);
            }
        }

        setSelectedIds(new Set());
    }, [allTasks, handleDeleteTask, selectedIds]);

    const handleTaskMassActionChange = useCallback(async (action) => {
        if (!action || selectedIds.size === 0) return;
        if (action === 'edit') {
            setShowMassFieldPicker(true);
            return;
        }
        if (action === 'delete') {
            await handleBulkDeleteSelected();
        }
    }, [handleBulkDeleteSelected, selectedIds]);

    const handleBulkFieldSave = useCallback(async (
        field,
        value,
        targetIds = Array.from(selectedIds),
        activityTargetIds = [],
    ) => {
        const taskIds = Array.isArray(targetIds) ? targetIds.map((id) => String(id)) : [];
        const activityIds = Array.isArray(activityTargetIds)
            ? activityTargetIds.map((id) => String(id))
            : [];

        const updates = [];
        for (const id of taskIds) {
            const original = allTasks.find((task) => String(task.id) === String(id));
            if (!original) continue;
            const next = { ...original };

            if (field === 'assignee') {
                const selectedUser = users.find((user) => String(user.id || user.member_id) === String(value));
                if (selectedUser) {
                    const userId = selectedUser.id || selectedUser.member_id;
                    next.assignee = String(userId) === String(currentUserId)
                        ? 'Me'
                        : `${selectedUser.name || selectedUser.firstname || ''} ${selectedUser.lastname || ''}`.trim();
                    next.delegatedToUserId = String(userId) === String(currentUserId) ? null : userId;
                } else {
                    next.assignee = '';
                    next.delegatedToUserId = null;
                }
            } else if (field === 'status') {
                next.status = value || next.status;
            } else if (field === 'priority') {
                next.priority = value || next.priority;
            } else if (field === 'duration') {
                next.duration = value || null;
            } else if (field === 'goalId') {
                next.goal_id = value || null;
                next.goalId = value || null;
            } else if (field === 'key_area_bundle') {
                next.key_area_id = value?.key_area_id || null;
                if (value?.list_index) next.list_index = value.list_index;
            } else if (field === 'date') {
                next.start_date = value?.start_date || null;
                next.end_date = value?.end_date || null;
                next.deadline = value?.deadline || null;
            }

            next.eisenhower_quadrant = computeEisenhowerQuadrant({
                deadline: next.deadline,
                end_date: next.end_date,
                start_date: next.start_date,
                priority: next.priority,
                status: next.status,
                key_area_id: next.key_area_id,
            });

            // eslint-disable-next-line no-await-in-loop
            const saved = await api.updateTask(next.id, next);
            updates.push(saved);
        }

        setAllTasks((prev) => {
            const map = new Map(prev.map((task) => [String(task.id), task]));
            updates.forEach((task) => map.set(String(task.id), { ...map.get(String(task.id)), ...task }));
            return Array.from(map.values());
        });

        if (activityIds.length > 0) {
            const activityService = await getActivityService();
            const updatedActivities = [];

            for (const activityId of activityIds) {
                let originalActivity = null;
                let originalTask = null;

                for (const [taskId, list] of Object.entries(activitiesByTask || {})) {
                    const found = Array.isArray(list)
                        ? list.find((activity) => String(activity.id) === String(activityId))
                        : null;
                    if (found) {
                        originalActivity = found;
                        originalTask = allTasks.find((task) => String(task.id) === String(taskId)) || null;
                        break;
                    }
                }

                if (!originalActivity) continue;

                const body = {};

                if (field === 'assignee') {
                    body.delegatedToUserId =
                        value && String(value) !== String(currentUserId) ? value : null;
                } else if (field === 'status') {
                    body.status = value || originalActivity.status;
                    body.completed = String(value || '').toLowerCase() === 'done';
                } else if (field === 'priority') {
                    body.priority = value || originalActivity.priority || null;
                } else if (field === 'duration') {
                    body.duration = value || null;
                } else if (field === 'goalId') {
                    body.goalId = value || null;
                } else if (field === 'date') {
                    body.startDate = value?.start_date || null;
                    body.endDate = value?.end_date || null;
                    body.deadline = value?.deadline || null;
                } else {
                    body[field] = value;
                }

                // eslint-disable-next-line no-await-in-loop
                const savedActivity = await activityService.update(activityId, body);
                updatedActivities.push({
                    activityId: String(activityId),
                    normalized: normalizeActivityWithTask(savedActivity || {}, originalTask || originalActivity),
                });
            }

            if (updatedActivities.length > 0) {
                setActivitiesByTask((prev) => {
                    const updated = { ...prev };
                    for (const key of Object.keys(updated)) {
                        updated[key] = (updated[key] || []).map((activity) => {
                            const match = updatedActivities.find(
                                (entry) => String(entry.activityId) === String(activity.id),
                            );
                            return match ? { ...activity, ...match.normalized } : activity;
                        });
                    }
                    return updated;
                });
            }
        }

        setShowMassFieldPicker(false);
        setMassEditField(null);
        clearSelection();
    }, [
        activitiesByTask,
        allTasks,
        api,
        clearSelection,
        computeEisenhowerQuadrant,
        currentUserId,
        getActivityService,
        normalizeActivityWithTask,
        selectedIds,
        setActivitiesByTask,
        setAllTasks,
        users,
    ]);

    const handleActivityPanelMassFieldSave = useCallback(async (field, value) => {
        if (!selectedTaskInPanel?.id || selectedActivityIdsInPanel.size === 0) return;

        const taskId = selectedTaskInPanel.id;
        const taskKey = String(taskId);
        const list = Array.isArray(activitiesByTask[taskKey]) ? activitiesByTask[taskKey] : [];
        const selectedActivities = list.filter((activity) => selectedActivityIdsInPanel.has(activity.id));

        for (const activity of selectedActivities) {
            if (field === 'date') {
                // eslint-disable-next-line no-await-in-loop
                await updateActivityField(activity, taskId, 'start_date', value?.start_date || '');
                // eslint-disable-next-line no-await-in-loop
                await updateActivityField(activity, taskId, 'end_date', value?.end_date || '');
                // eslint-disable-next-line no-await-in-loop
                await updateActivityField(activity, taskId, 'deadline', value?.deadline || '');
            } else if (field === 'goalId') {
                // eslint-disable-next-line no-await-in-loop
                await updateActivityField(activity, taskId, 'goalId', value || null);
            } else if (field === 'duration') {
                // eslint-disable-next-line no-await-in-loop
                await updateActivityField(activity, taskId, 'duration', value || null);
            } else {
                // eslint-disable-next-line no-await-in-loop
                await updateActivityField(activity, taskId, field, value);
            }
        }

        setShowActivityMassFieldPicker(false);
        setSelectedActivityIdsInPanel(new Set());
    }, [
        activitiesByTask,
        selectedActivityIdsInPanel,
        selectedTaskInPanel,
        setSelectedActivityIdsInPanel,
        setShowActivityMassFieldPicker,
        updateActivityField,
    ]);

    return {
        handleActivityPanelMassFieldSave,
        handleBulkFieldSave,
        handleTaskMassActionChange,
        isSelected,
        massEditField,
        selectedIds,
        selectAllVisible,
        setMassEditField,
        setShowMassFieldPicker,
        showMassEdit,
        showMassFieldPicker,
        tasksDisplayRef,
        toggleSelect,
    };
}
