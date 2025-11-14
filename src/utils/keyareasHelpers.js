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

export const computeEisenhowerQuadrant = ({ deadline, end_date, priority, key_area_id = null }) => {
    const toStartOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = toStartOfDay(new Date());
    const due = safeParseDate(deadline) ? toStartOfDay(safeParseDate(deadline)) : null;
    const end = safeParseDate(end_date) ? toStartOfDay(safeParseDate(end_date)) : null;

    const notUrgentByOnTrack = !!(
        due &&
        end &&
        due.getTime() >= today.getTime() &&
        end.getTime() <= due.getTime()
    );
    const notUrgentByFinishedNoDeadline = !!(
        !due &&
        end &&
        end.getTime() <= today.getTime()
    );

    let urgent = false;
    if (notUrgentByOnTrack || notUrgentByFinishedNoDeadline) {
        urgent = false;
    } else {
        if (due && due.getTime() < today.getTime()) urgent = true;
        else if (end && end.getTime() < today.getTime()) urgent = true;
        else if (due && end && end.getTime() > due.getTime()) urgent = true;
        else urgent = false;
    }

    const isDontForget = !key_area_id;
    const notImportant = priority === 'low' || isDontForget;
    const important = priority === 'high' || (!isDontForget && priority !== 'low');
    const isImportant = notImportant ? false : important;

    if (isImportant && urgent) return 'Q1';
    if (isImportant && !urgent) return 'Q2';
    if (!isImportant && urgent) return 'Q3';
    return 'Q4';
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
        return d.toISOString().slice(0, 10);
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
    const date_end = a.endDate || a.date_end || null;
    const deadline = a.deadline || a.dueDate || a.due_date || null;
    const taskId = a.taskId || a.task_id || a.task || null;
    const priority = a.priority ?? a.priority_level ?? 2;
    const created_task_id = a.created_task_id ?? a.createdTaskId ?? null;
    return {
        ...a,
        id,
        text,
        status,
        completed: !!completed,
        completionDate: completionDate || null,
        date_start,
        date_end,
        deadline,
        taskId,
        priority,
        created_task_id,
    };
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
};
