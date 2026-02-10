// Shared helper utilities extracted from KeyAreas and related components
// Keep these utilities small and dependency-free so they can be reused across components.

export const safeParseDate = (val) => {
    if (!val) return null;
    try {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    } catch {
        return null;
    }
};

export const toIsoMidnightOrNull = (val, allowUndefinedForEmpty = false) => {
    if (val === undefined) return allowUndefinedForEmpty ? undefined : null;
    if (val === null || val === '') return allowUndefinedForEmpty ? undefined : null;
    try {
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(val))) {
            const [y, m, d] = String(val).split('-').map(Number);
            const dt = new Date(y, m - 1, d);
            return dt.toISOString();
        }
        const d = new Date(val);
        if (isNaN(d.getTime())) return allowUndefinedForEmpty ? undefined : null;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    } catch {
        return allowUndefinedForEmpty ? undefined : null;
    }
};

export const nullableString = (v, allowUndefinedForEmpty = false) => {
    if (v === undefined) return allowUndefinedForEmpty ? undefined : null;
    if (v === null) return null;
    const s = String(v).trim();
    if (s === '') return allowUndefinedForEmpty ? undefined : null;
    return s;
};

export const computeEisenhowerQuadrant = ({ deadline, end_date, priority, key_area_id = null, start_date = null, status = null } = {}) => {
    // Practical Manager rules implemented:
    // Important = record is in a Key Area (key_area_id truthy)
    // Urgent if (A) start_date or end_date <= today OR (B) status not completed && deadline <= today
    // Box 1: Important & Urgent OR Don't Forget & Urgent
    // Box 2: Important & Not urgent (including missing start/end)
    // Box 3: Don't Forget & Not urgent
    // Box 4: Not Important & Not urgent & Priority LOW

    const toStartOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = toStartOfDay(new Date());
    const due = safeParseDate(deadline) ? toStartOfDay(safeParseDate(deadline)) : null;
    const start = safeParseDate(start_date) ? toStartOfDay(safeParseDate(start_date)) : null;
    const end = safeParseDate(end_date) ? toStartOfDay(safeParseDate(end_date)) : null;

    const lvl = getPriorityLevel(priority);
    const isLowPriority = lvl === 1;
    const isImportant = !!key_area_id;
    const isDontForget = !isImportant;

    // determine completed status (treat unknown as not completed)
    const s = String(status || '')?.toLowerCase();
    const isCompleted = s === 'done' || s === 'completed' || s === 'closed' || s === 'archived';

    // Urgent criteria
    let urgent = false;
    // A) start_date or end_date is <= today (overdue). Only consider if not completed.
    if (!isCompleted && ((start && start.getTime() <= today.getTime()) || (end && end.getTime() <= today.getTime()))) {
        urgent = true;
    }
    // B) status not completed && deadline <= today
    if (!urgent && !isCompleted && due && due.getTime() <= today.getTime()) {
        urgent = true;
    }

    // Apply quadrant rules
    // If urgent -> Box 1 (Q1) for both Key Areas and Don't Forget per rules
    if (urgent) return 1;

    // Not urgent from here on
    if (isImportant) {
        // Important and not urgent => Q2
        return 2;
    }

    // Not important (i.e., Don't Forget) and not urgent
    if (isDontForget) {
        // Q4 only when low priority
        if (isLowPriority) return 4;
        return 3;
    }

    // Fallback
    return 4;
};

export const getQuadrantColorClass = (q) => {
    const n = Number(q) || 4;
    // Quadrant color mapping per design:
    // 1 -> Red (Urgent & Important)
    // 2 -> Green (Important, Not Urgent)
    // 3 -> Orange (Not Important, Urgent)
    // 4 -> Grey (Neither urgent nor important)
    switch (n) {
        case 1:
            return { badge: 'bg-red-100 text-red-800' };
        case 2:
            return { badge: 'bg-emerald-100 text-emerald-800' };
        case 3:
            return { badge: 'bg-amber-100 text-amber-800' };
        case 4:
        default:
            return { badge: 'bg-slate-100 text-slate-700' };
    }
};

export const getPriorityLevel = (val) => {
    if (val === undefined || val === null || val === "") return 2;
    if (typeof val === 'number') return [1, 2, 3].includes(val) ? val : 2;
    const s = String(val).toLowerCase();
    if (s === '1' || s === 'low') return 1;
    if (s === '3' || s === 'high') return 3;
    return 2;
};

export const toDateOnly = (val) => {
    if (!val && val !== 0) return "";
    try {
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(val))) return String(val);
        const d = new Date(val);
        if (isNaN(d.getTime())) return "";
        // Use local date components to avoid timezone shifts when converting
        // a date-only value (e.g. selected via <input type="date">) to a
        // string. This prevents the common issue where local midnight is
        // converted to a previous/next day in UTC when using toISOString().
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    } catch {
        return "";
    }
};

export const formatDuration = (start, end) => {
    const s = toDateOnly(start);
    const e = toDateOnly(end);
    if (!s || !e) return "";
    try {
        const ms = new Date(e + "T00:00:00Z").getTime() - new Date(s + "T00:00:00Z").getTime();
        if (!isFinite(ms)) return "";
        const days = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
        return `${days}d`;
    } catch {
        return "";
    }
};

export const mapUiStatusToServer = (ui) => {
    const s = String(ui || "").toLowerCase();
    if (s === "open") return "todo";
    if (s === "in_progress" || s === "in progress") return "in_progress";
    if (s === "done" || s === "completed") return "completed";
    return "todo";
};

export const mapServerStatusToUi = (sv) => {
    const s = String(sv || "").toLowerCase();
    if (s === "todo" || s === "open") return "open";
    if (s === "in_progress") return "in_progress";
    if (s === "completed" || s === "done") return "done";
    return "open";
};

// UI color helpers return tailwind class strings for consistent badges/dots
export const getStatusColorClass = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'done' || s === 'completed') return { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800' };
    if (s === 'in_progress') return { dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800' };
    return { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700' };
};

// Returns a human-friendly indicator whether the status is 'in_progress'
export const getInProgressLabel = (status) => {
    const s = String(status || '').toLowerCase();
    return s === 'in_progress' ? 'In Progress' : 'Not In Progress';
};

export const getPriorityColorClass = (priority) => {
    const lvl = getPriorityLevel(priority);
    if (lvl === 1) return { badge: 'bg-emerald-100 text-emerald-800' };
    if (lvl === 3) return { badge: 'bg-red-100 text-red-800' };
    return { badge: 'bg-amber-100 text-amber-800' };
};

export const getPriorityLabel = (priority) => {
    const lvl = getPriorityLevel(priority);
    if (lvl === 1) return 'Low';
    if (lvl === 3) return 'High';
    return 'Normal';
};

export const normalizeActivity = (a = {}) => {
    if (!a) return null;
    const id = a.id ?? a.activityId ?? a.activity_id ?? null;
    const text = (a.text || a.activity_name || a.name || "").trim();
    const status = mapServerStatusToUi(a.status ?? a.state ?? a.activity_status ?? "");
    const completed = a.completed ?? (String(status).toLowerCase() === "done") ?? false;
    const completionDate = a.completionDate || a.completion_date || a.completed_at || null;
    const date_start = a.startDate || a.date_start || a.date || null;
    const date_end = a.endDate || a.date_end || a.end_date || null;
    const deadline = a.deadline || a.dueDate || a.due_date || null;
    const taskId = a.taskId || a.task_id || a.task || null;
    const priority = a.priority ?? a.priority_level ?? 2;
    const created_task_id = a.created_task_id ?? a.createdTaskId ?? null;
    // assignee normalization: servers/older APIs may use different field names
    // For activities, delegatedToUserId represents the assigned user (pending delegation)
    const assignee = a.assignee ?? a.responsible ?? a.owner ?? a.assigned_to ?? a.assignee_name ?? a.delegatedToUserId ?? a.delegated_to_user_id ?? null;
    // key area / list / goal / notes / duration aliases
    const key_area_id = a.key_area_id ?? a.keyAreaId ?? a.keyArea ?? a.ka_id ?? null;
    const list = a.list ?? a.list_index ?? a.listIndex ?? a.parent_list ?? a.list_number ?? null;
    const goal = a.goal ?? a.goalId ?? a.goal_id ?? a.goal_id ?? null;
    const notes = a.description ?? a.note ?? a.notes ?? a.activity_notes ?? null;
    const duration = a.duration ?? a.duration_minutes ?? null;
    return {
        ...a,
        id,
        text,
        title: a.title ?? a.name ?? text,
        name: a.name ?? a.title ?? text,
        status,
        completed: !!completed,
        completionDate: completionDate || null,
        // canonical fields
        date_start,
        date_end,
        deadline,
        taskId,
        priority,
        created_task_id,
        // key area / list / goal / notes / duration
        key_area_id: key_area_id || null,
        keyAreaId: key_area_id || null,
        list: list || null,
        list_index: list || null,
        listIndex: list || null,
        goal: goal || null,
        goal_id: goal || null,
        goalId: goal || null,
        notes: notes || null,
        duration: duration || null,
        // assignee aliases
        assignee: assignee || null,
        responsible: a.responsible ?? assignee ?? null,
        owner: a.owner ?? assignee ?? null,
        assigned_to: a.assigned_to ?? assignee ?? null,
        // compatibility aliases: some components expect snake_case (start_date/end_date)
        // while others expect camelCase (startDate/endDate). Provide both to avoid
        // UI showing empty values when the server/creator returns a different shape.
        start_date: a.start_date ?? a.startDate ?? date_start,
        end_date: a.end_date ?? a.endDate ?? date_end,
        startDate: a.startDate ?? a.start_date ?? date_start,
        endDate: a.endDate ?? a.end_date ?? date_end,
    };
};

/**
 * Resolve an assignee for display and select value.
 * - activity: activity object (may contain assignee/responsible as string/id/object)
 * - taskAssignee: fallback value from the parent task
 * - users: array of known users [{id,name}]
 * - currentUserId: id of the current user (used to resolve 'Me')
 *
 * Returns { display, selectValue } where selectValue is a user id string to
 * match against <select> options when users are provided, otherwise ''.
 */
export const resolveAssignee = ({ activity = {}, taskAssignee = null, users = [], currentUserId = null } = {}) => {
    const raw = activity?.assignee ?? activity?.responsible ?? taskAssignee ?? '';
    // display name resolution
    const display = (() => {
        if (!raw) return '—';
        if (typeof raw === 'object') return raw.name || raw.username || String(raw.id || '');
        if (raw === 'Me' && currentUserId && Array.isArray(users) && users.length) {
            const me = users.find((u) => String(u.id) === String(currentUserId));
            return me ? (me.name || me.username || 'Me') : 'Me';
        }
        if (Array.isArray(users) && users.length) {
            const byId = users.find((u) => String(u.id) === String(raw));
            if (byId) return byId.name || byId.username || String(byId.id);
            const byName = users.find((u) => (u.name || '') === String(raw));
            if (byName) return byName.name || byName.username || String(byName.id);
        }
        return String(raw);
    })();

    // selectValue: when users list is available, prefer returning an id that matches an option
    let selectValue = '';
    if (Array.isArray(users) && users.length) {
        if (raw === 'Me' && currentUserId) selectValue = String(currentUserId);
        else if (typeof raw === 'object' && raw.id) selectValue = String(raw.id);
        else {
            const byId = users.find((u) => String(u.id) === String(raw));
            if (byId) selectValue = String(byId.id);
            else {
                const byName = users.find((u) => (u.name || '') === String(raw));
                if (byName) selectValue = String(byName.id);
            }
        }
    }
    return { display, selectValue };
};

/**
 * Map a selected user id (from a <select>) back into a value suitable for
 * persisting to the API (e.g., 'Me' sentinel or user.name). Prefers 'Me'
 * when the selected id matches currentUserId.
 */
export const selectedUserIdToPersistValue = (selId, users = [], currentUserId = null) => {
    if (!selId && selId !== 0) return '';
    if (Array.isArray(users) && users.length) {
        const user = users.find((u) => String(u.id) === String(selId));
        if (user) return (currentUserId && String(user.id) === String(currentUserId)) ? 'Me' : (user.name || user.username || String(user.id));
    }
    return String(selId);
};

export default {
    safeParseDate,
    toIsoMidnightOrNull,
    nullableString,
    computeEisenhowerQuadrant,
    getPriorityLevel,
    toDateOnly,
    formatDuration,
    mapUiStatusToServer,
    mapServerStatusToUi,
    normalizeActivity,
    resolveAssignee,
    selectedUserIdToPersistValue,
};
