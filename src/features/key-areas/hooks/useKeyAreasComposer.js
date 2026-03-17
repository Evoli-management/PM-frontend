import { useEffect, useState } from 'react';
import {
    mapServerStatusToUi,
    normalizeActivity,
    toDateOnly,
} from '../../../utils/keyareasHelpers';

const createDefaultTaskForm = () => ({
    title: '',
    description: '',
    list_index: 1,
    goal_id: '',
    start_date: '',
    deadline: '',
    end_date: '',
    status: 'open',
    priority: 'normal',
    tags: '',
    assignee: '',
    _endAuto: true,
});

const createDefaultActivityForm = () => ({
    title: '',
    description: '',
    list: '',
    key_area_id: null,
    assignee: '',
    priority: 'normal',
    goal: '',
    start_date: '',
    end_date: '',
    deadline: '',
    finish_date: '',
    duration: '',
    _endAuto: true,
});

const normalizePriorityLevel = (priority) => {
    const value = String(priority || 'normal').toLowerCase();
    if (value === 'low' || value === '1') return 1;
    if (value === 'high' || value === '3') return 3;
    return 2;
};

export default function useKeyAreasComposer({
    selectedKA,
    allTasks,
    setAllTasks,
    setActivitiesByTask,
}) {
    const [showTaskComposer, setShowTaskComposer] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingActivityViaTaskModal, setEditingActivityViaTaskModal] = useState(null);
    const [showActivityComposer, setShowActivityComposer] = useState(false);
    const [editingActivityId, setEditingActivityId] = useState(null);
    const [showEditActivityModal, setShowEditActivityModal] = useState(false);
    const [activityAttachTaskId, setActivityAttachTaskId] = useState(null);
    const [taskForm, setTaskForm] = useState(createDefaultTaskForm);
    const [activityForm, setActivityForm] = useState(createDefaultActivityForm);

    useEffect(() => {
        const handler = (e) => {
            const created = e?.detail || null;
            if (!created) return;

            const createdKeyAreaId = created.keyAreaId || created.key_area_id || null;
            if (!selectedKA || String(createdKeyAreaId) !== String(selectedKA.id)) return;

            try {
                const normalized = {
                    ...created,
                    status: mapServerStatusToUi(created.status),
                    due_date: created.dueDate || created.due_date || null,
                    deadline: created.dueDate || created.due_date || null,
                    start_date: created.startDate || created.start_date || null,
                    end_date: created.endDate || created.end_date || null,
                    completionDate: created.completionDate || created.completion_date || null,
                    assignee: created.assignee ?? null,
                    duration: created.duration ?? null,
                    key_area_id: createdKeyAreaId,
                    list_index: created.listIndex ?? created.list_index ?? 1,
                    listIndex: created.listIndex ?? created.list_index ?? 1,
                    goal_id: created.goalId ?? created.goal_id ?? null,
                };

                setAllTasks((prev) => [...(prev || []), normalized]);
            } catch (err) {
                console.error('Failed to add task-created event to allTasks', err);
            }
        };

        window.addEventListener('task-created', handler);
        return () => window.removeEventListener('task-created', handler);
    }, [selectedKA, setAllTasks]);

    useEffect(() => {
        const handler = (e) => {
            const created = e?.detail || null;
            if (!created) return;

            const taskId = created.taskId || created.task_id;
            if (!taskId) return;

            try {
                const normalized = normalizeActivity(created);
                setActivitiesByTask((prev) => {
                    const taskKey = String(taskId);
                    const existingActivities = prev[taskKey] || [];
                    return {
                        ...prev,
                        [taskKey]: [...existingActivities, normalized],
                    };
                });
            } catch (err) {
                console.error('Failed to add activity-created event to activitiesByTask', err);
            }
        };

        window.addEventListener('activity-created', handler);
        return () => window.removeEventListener('activity-created', handler);
    }, [setActivitiesByTask]);

    useEffect(() => {
        const handler = (e) => {
            const tid = e?.detail?.taskId ?? null;
            console.log('ka-open-activity-composer received', { tid });

            setEditingActivityId(null);

            const parent = tid ? (allTasks || []).find((task) => String(task.id) === String(tid)) : null;

            setActivityForm({
                ...createDefaultActivityForm(),
                list: parent ? (parent.list || parent.list_index || parent.listIndex || '') : '',
                key_area_id: parent
                    ? (parent.key_area_id || parent.keyAreaId || parent.keyArea || selectedKA?.id || null)
                    : (selectedKA?.id || null),
                assignee: parent ? (parent.assignee || '') : '',
                taskId: parent
                    ? String(parent.id || parent.taskId || parent.task_id || '')
                    : (tid ? String(tid) : ''),
            });

            setActivityAttachTaskId(tid ? String(tid) : null);
            setShowActivityComposer(true);
        };

        window.addEventListener('ka-open-activity-composer', handler);
        return () => window.removeEventListener('ka-open-activity-composer', handler);
    }, [allTasks, selectedKA]);

    useEffect(() => {
        const handler = (e) => {
            const task = e?.detail?.task;
            if (!task) return;

            setTaskForm({
                ...createDefaultTaskForm(),
                id: task.id || task.taskId || task.task_id || task._id || null,
                title: task.title || '',
                description: task.description || '',
                list_index: task.list_index || 1,
                goal_id: task.goal_id || '',
                start_date: toDateOnly(task.start_date) || '',
                deadline: toDateOnly(task.deadline) || '',
                end_date: toDateOnly(task.end_date) || '',
                status: task.status || 'open',
                priority: normalizePriorityLevel(task.priority),
                tags: task.tags || '',
                assignee: task.assignee || '',
                key_area_id: task.key_area_id || selectedKA?.id || null,
                duration: task.duration || '',
                _endAuto: false,
            });
            setEditingTaskId(task.id);
            setShowTaskComposer(true);
        };

        window.addEventListener('ka-open-task-editor', handler);
        return () => window.removeEventListener('ka-open-task-editor', handler);
    }, [selectedKA]);

    useEffect(() => {
        console.log('showActivityComposer changed', { showActivityComposer });
    }, [showActivityComposer]);

    useEffect(() => {
        const handler = (e) => {
            console.log('KeyAreas: ka-open-activity-editor received', { detail: e?.detail });

            const activity = e?.detail?.activity;
            if (!activity) return;

            const tid = e?.detail?.taskId ?? null;
            setActivityAttachTaskId(tid ? String(tid) : null);

            const norm = normalizeActivity(activity || {});

            setTaskForm({
                ...createDefaultTaskForm(),
                id: norm.id || null,
                title: norm.text || '',
                description: norm.description || norm.notes || '',
                list_index: norm.list || norm.list_index || 1,
                goal_id: norm.goal || norm.goalId || norm.goal_id || '',
                start_date: toDateOnly(norm.start_date) || '',
                deadline: toDateOnly(norm.deadline) || '',
                end_date: toDateOnly(norm.end_date) || '',
                status: norm.completed ? 'done' : 'open',
                priority: normalizePriorityLevel(norm.priority),
                assignee: norm.assignee || norm.responsible || '',
                key_area_id: norm.key_area_id || selectedKA?.id || null,
                list: norm.list || '',
                finish_date: toDateOnly(norm.completionDate) || '',
                duration: norm.duration || '',
                _endAuto: false,
            });

            setActivityForm({
                ...createDefaultActivityForm(),
                title: norm.text || '',
                description: norm.description || norm.notes || '',
                list: norm.list || '',
                key_area_id: norm.key_area_id || selectedKA?.id || null,
                assignee: norm.assignee || norm.responsible || '',
                priority: normalizePriorityLevel(norm.priority),
                goal: norm.goal || '',
                start_date: toDateOnly(norm.start_date) || '',
                end_date: toDateOnly(norm.end_date) || '',
                deadline: toDateOnly(norm.deadline) || '',
                finish_date: toDateOnly(norm.completionDate) || '',
                duration: norm.duration || '',
                _endAuto: false,
            });

            setEditingActivityViaTaskModal({ id: activity.id, taskId: tid ? String(tid) : null });
            setEditingTaskId(null);
            setShowActivityComposer(false);
            setShowTaskComposer(false);

            console.log('KeyAreas: opening EditActivityModal', { activityId: activity.id, taskId: tid });
            setShowEditActivityModal(true);
        };

        window.addEventListener('ka-open-activity-editor', handler);
        return () => window.removeEventListener('ka-open-activity-editor', handler);
    }, [selectedKA]);

    return {
        activityAttachTaskId,
        setActivityAttachTaskId,
        activityForm,
        setActivityForm,
        editingActivityId,
        setEditingActivityId,
        editingActivityViaTaskModal,
        setEditingActivityViaTaskModal,
        editingTaskId,
        setEditingTaskId,
        showActivityComposer,
        setShowActivityComposer,
        showEditActivityModal,
        setShowEditActivityModal,
        showTaskComposer,
        setShowTaskComposer,
        taskForm,
        setTaskForm,
    };
}
