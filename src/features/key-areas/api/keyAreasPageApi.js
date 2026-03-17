import { nullableString, computeEisenhowerQuadrant, toDateOnly } from '../../../utils/keyareasHelpers';
import { normalizeTaskForUi } from '../adapters/taskActivityAdapters.js';

let _taskService = null;
const getTaskService = async () => {
    if (_taskService) return _taskService;
    const mod = await import('../../../services/taskService');
    _taskService = mod.default || mod;
    return _taskService;
};

let _keyAreaService = null;
const getKeyAreaService = async () => {
    if (_keyAreaService) return _keyAreaService;
    const mod = await import('../../../services/keyAreaService');
    _keyAreaService = mod.default || mod;
    return _keyAreaService;
};

const keyAreasPageApi = {
    async listKeyAreas() {
        try {
            return await (await getKeyAreaService()).list({ includeTaskCount: true });
        } catch (e) {
            if (e?.response?.status === 401) throw e;
            throw e;
        }
    },

    async listGoals() {
        try {
            const mod = await import('../../../services/goalService');
            const fn = mod?.getGoals || mod?.default?.getGoals || mod?.default;
            if (typeof fn === 'function') {
                return await fn({ status: 'active' });
            }
            return [];
        } catch (e) {
            console.error('Failed to load goals', e);
            return [];
        }
    },

    async updateKeyArea(id, data) {
        return await (await getKeyAreaService()).update(id, data);
    },

    async createKeyArea(data) {
        return await (await getKeyAreaService()).create(data);
    },

    async deleteKeyArea(id) {
        await (await getKeyAreaService()).remove(id);
        return true;
    },

    async listTasks(keyAreaId, opts = {}) {
        try {
            const rows = await (await getTaskService()).list({ keyAreaId, withoutGoal: opts.withoutGoal });
            return (Array.isArray(rows) ? rows : []).map((task) => normalizeTaskForUi(task, keyAreaId));
        } catch (e) {
            if (e?.response?.status === 401) throw e;
            console.error('Failed to list tasks', e);
            return [];
        }
    },

    async createTask(task) {
        const durationRaw = task.duration ?? task.duration_minutes;
        const payload = {
            keyAreaId: task.key_area_id || task.keyAreaId || task.key_area || task.keyArea,
            goalId: task.goal_id || task.goalId || task.goal || null,
            title: task.title,
            description: nullableString(task.description),
            assignee: nullableString(task.assignee),
            startDate: toDateOnly(task.start_date ?? task.startDate),
            dueDate: toDateOnly(task.deadline ?? task.due_date ?? task.dueDate),
            endDate: toDateOnly(task.end_date ?? task.endDate),
            status: (() => {
                const s = String(task.status || 'todo').toLowerCase();
                if (s === 'open') return 'todo';
                if (s === 'blocked') return 'cancelled';
                if (s === 'done' || s === 'closed' || s === 'completed') return 'completed';
                if (s === 'cancelled' || s === 'canceled') return 'cancelled';
                if (s === 'in_progress') return 'in_progress';
                return 'todo';
            })(),
            priority: (() => {
                const p = String(task.priority || 'medium').toLowerCase();
                if (p === 'low' || p === 'medium' || p === 'high') return p;
                return 'medium';
            })(),
            delegatedToUserId: task.delegatedToUserId ?? null,
            consulted: Array.isArray(task.consulted) ? task.consulted : [],
            informed: Array.isArray(task.informed) ? task.informed : [],
            duration:
                durationRaw === undefined
                    ? undefined
                    : durationRaw === null
                        ? null
                        : String(durationRaw).trim() || null,
            listIndex:
                typeof task.list_index !== 'undefined'
                    ? task.list_index
                    : (typeof task.listIndex !== 'undefined' ? task.listIndex : undefined),
        };

        const created = await (await getTaskService()).create(payload);
        return {
            ...normalizeTaskForUi(created, payload.keyAreaId),
            assignee: created.assignee ?? payload.assignee ?? null,
            consulted: Array.isArray(created.consulted) ? created.consulted : payload.consulted,
            informed: Array.isArray(created.informed) ? created.informed : payload.informed,
        };
    },

    async updateTask(id, task) {
        const durationRaw = task.duration ?? task.duration_minutes;
        const payload = {
            keyAreaId: task.key_area_id || task.keyAreaId || task.key_area || task.keyArea,
            goalId: task.goal_id || task.goalId || task.goal || null,
            title: task.title,
            description: nullableString(task.description, true),
            assignee: nullableString(task.assignee, true),
            startDate:
                task.start_date !== undefined || task.startDate !== undefined
                    ? (toDateOnly(task.start_date ?? task.startDate) || null)
                    : undefined,
            dueDate:
                task.deadline !== undefined || task.due_date !== undefined || task.dueDate !== undefined
                    ? (toDateOnly(task.deadline ?? task.due_date ?? task.dueDate) || null)
                    : undefined,
            endDate:
                task.end_date !== undefined || task.endDate !== undefined
                    ? (toDateOnly(task.end_date ?? task.endDate) || null)
                    : undefined,
            duration:
                durationRaw === undefined
                    ? undefined
                    : durationRaw === null
                        ? null
                        : String(durationRaw).trim() || null,
            listIndex:
                typeof task.list_index !== 'undefined'
                    ? task.list_index
                    : (typeof task.listIndex !== 'undefined' ? task.listIndex : undefined),
            status: (() => {
                const s = String(task.status || '').toLowerCase();
                if (!s) return undefined;
                if (s === 'open') return 'todo';
                if (s === 'blocked') return 'cancelled';
                if (s === 'done' || s === 'closed' || s === 'completed') return 'completed';
                if (s === 'cancelled' || s === 'canceled') return 'cancelled';
                if (s === 'in_progress') return 'in_progress';
                return undefined;
            })(),
            priority: (() => {
                const raw = task.priority;
                if (raw === undefined || raw === null || raw === '') return undefined;
                const n = Number(raw);
                if (!Number.isNaN(n)) {
                    if (n === 1) return 'low';
                    if (n === 3) return 'high';
                    return 'medium';
                }
                const p = String(raw).toLowerCase();
                if (p === 'med' || p === 'medium' || p === 'normal') return 'medium';
                if (p === 'low') return 'low';
                if (p === 'high') return 'high';
                return undefined;
            })(),
        };

        if (
            Object.prototype.hasOwnProperty.call(task, 'delegatedToUserId') ||
            Object.prototype.hasOwnProperty.call(task, 'delegated_to_user_id')
        ) {
            payload.delegatedToUserId = task.delegatedToUserId ?? task.delegated_to_user_id ?? null;
        }

        const updated = await (await getTaskService()).update(id, payload);
        const normalized = {
            ...normalizeTaskForUi(updated, payload.keyAreaId),
            assignee: updated.assignee ?? payload.assignee ?? null,
            delegatedToUserId:
                updated.delegatedToUserId ??
                updated.delegated_to_user_id ??
                payload.delegatedToUserId ??
                null,
            list_index: updated.listIndex ?? updated.list_index ?? payload.listIndex ?? payload.list_index ?? 1,
            listIndex: updated.listIndex ?? updated.list_index ?? payload.listIndex ?? payload.list_index ?? 1,
            goal_id: updated.goalId ?? updated.goal_id ?? payload.goalId ?? payload.goal_id ?? null,
        };

        const uiOnly = ((sourceTask) => ({
            tags: sourceTask.tags ?? '',
            recurrence: sourceTask.recurrence ?? '',
            attachments: sourceTask.attachments ?? '',
            attachmentsFiles: sourceTask.attachmentsFiles ?? [],
            eisenhower_quadrant:
                sourceTask.eisenhower_quadrant ??
                computeEisenhowerQuadrant({
                    deadline: normalized.due_date || normalized.deadline,
                    end_date: normalized.end_date,
                    start_date: normalized.start_date,
                    priority: normalized.priority,
                    status: normalized.status,
                    key_area_id: normalized.key_area_id,
                }),
            category: sourceTask.category ?? 'Key Areas',
        }))(task || {});

        return { ...normalized, ...uiOnly };
    },

    async deleteTask(id) {
        const svc = await getTaskService();
        await svc.remove(id);
        return true;
    },
};

export default keyAreasPageApi;
