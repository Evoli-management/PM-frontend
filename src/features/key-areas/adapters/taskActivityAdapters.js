import { normalizeActivity, toDateOnly } from '../../../utils/keyareasHelpers';

export const normalizeActivityWithTask = (activity, task) => {
    const norm = normalizeActivity(activity || {});
    if (!norm) return norm;

    const taskId = task?.id ?? task?.task_id ?? task?.taskId ?? null;
    const keyAreaId =
        norm.key_area_id ??
        task?.key_area_id ??
        task?.keyAreaId ??
        task?.keyArea ??
        null;
    const listIndex =
        norm.list ??
        task?.list_index ??
        task?.listIndex ??
        task?.list ??
        null;
    const goalId =
        norm.goal_id ??
        norm.goalId ??
        task?.goal_id ??
        task?.goalId ??
        task?.goal ??
        null;
    const assignee = norm.assignee ?? task?.assignee ?? null;

    return {
        ...norm,
        title: norm.title || norm.text || norm.activity_name || norm.name || '',
        name: norm.name || norm.title || norm.text || norm.activity_name || '',
        taskId: norm.taskId || taskId || null,
        key_area_id: keyAreaId,
        keyAreaId,
        list: listIndex,
        list_index: listIndex,
        listIndex,
        goal_id: goalId,
        goalId,
        assignee,
        responsible: norm.responsible ?? assignee ?? null,
    };
};

export const normalizeTaskForUi = (task, fallbackKeyAreaId = null) => {
    if (!task) return task;
    return {
        ...task,
        status: task.status || 'open',
        due_date: task.dueDate || task.due_date || null,
        deadline: task.dueDate || task.due_date || null,
        start_date: task.startDate || task.start_date || null,
        end_date: task.endDate || task.end_date || null,
        completionDate: task.completionDate || task.completion_date || null,
        assignee: task.assignee ?? null,
        duration: task.duration ?? null,
        key_area_id: task.keyAreaId || task.key_area_id || fallbackKeyAreaId,
        list_index: task.listIndex ?? task.list_index ?? 1,
        listIndex: task.listIndex ?? task.list_index ?? 1,
        goal_id: task.goalId ?? task.goal_id ?? null,
    };
};

export const mergeTaskUpdateForUi = (task, updates = {}) => {
    if (!task) return task;
    const next = { ...task, ...updates };

    if (
        Object.prototype.hasOwnProperty.call(updates, 'startDate') ||
        Object.prototype.hasOwnProperty.call(updates, 'start_date') ||
        Object.prototype.hasOwnProperty.call(updates, 'date_start')
    ) {
        const startValue = toDateOnly(updates.startDate ?? updates.start_date ?? updates.date_start) || null;
        next.startDate = startValue;
        next.start_date = startValue;
    }

    if (
        Object.prototype.hasOwnProperty.call(updates, 'endDate') ||
        Object.prototype.hasOwnProperty.call(updates, 'end_date') ||
        Object.prototype.hasOwnProperty.call(updates, 'date_end')
    ) {
        const endValue = toDateOnly(updates.endDate ?? updates.end_date ?? updates.date_end) || null;
        next.endDate = endValue;
        next.end_date = endValue;
    }

    if (
        Object.prototype.hasOwnProperty.call(updates, 'deadline') ||
        Object.prototype.hasOwnProperty.call(updates, 'dueDate') ||
        Object.prototype.hasOwnProperty.call(updates, 'due_date')
    ) {
        const deadlineValue = toDateOnly(updates.deadline ?? updates.dueDate ?? updates.due_date) || null;
        next.deadline = deadlineValue;
        next.dueDate = deadlineValue;
        next.due_date = deadlineValue;
    }

    if (
        Object.prototype.hasOwnProperty.call(updates, 'listIndex') ||
        Object.prototype.hasOwnProperty.call(updates, 'list_index')
    ) {
        const listIndexValue = updates.listIndex ?? updates.list_index ?? 1;
        next.listIndex = listIndexValue;
        next.list_index = listIndexValue;
    }

    if (
        Object.prototype.hasOwnProperty.call(updates, 'keyAreaId') ||
        Object.prototype.hasOwnProperty.call(updates, 'key_area_id')
    ) {
        const keyAreaValue = updates.keyAreaId ?? updates.key_area_id ?? null;
        next.keyAreaId = keyAreaValue;
        next.key_area_id = keyAreaValue;
    }

    if (
        Object.prototype.hasOwnProperty.call(updates, 'goalId') ||
        Object.prototype.hasOwnProperty.call(updates, 'goal_id')
    ) {
        const goalValue = updates.goalId ?? updates.goal_id ?? null;
        next.goalId = goalValue;
        next.goal_id = goalValue;
    }

    return normalizeTaskForUi(next, task.key_area_id || task.keyAreaId || null);
};

export const isTaskCompleted = (task) => {
    const status = String(task?.status || '').toLowerCase();
    if (status === 'done' || status === 'completed') return true;
    return !status && Boolean(task?.completionDate || task?.completion_date);
};

export const hasScheduledTaskDates = (task) =>
    Boolean(toDateOnly(task?.start_date || task?.startDate) || toDateOnly(task?.end_date || task?.endDate));

export const TASK_STATUS_FILTER_VALUES = ['open', 'in_progress', 'completed'];
export const DEFAULT_TASK_STATUS_FILTER_VALUES = ['open', 'in_progress'];

export const getInitialTaskStatusFilterValues = (activeFilter) => {
    if (activeFilter === 'all') return TASK_STATUS_FILTER_VALUES;
    if (activeFilter === 'completed') return ['completed'];
    return DEFAULT_TASK_STATUS_FILTER_VALUES;
};
