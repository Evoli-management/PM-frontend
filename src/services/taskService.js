import apiClient from "./apiClient";
import { parseDurationToMinutes } from "../utils/duration";

// Map FE status → BE enum
// FE uses: open | in_progress | done | cancelled (shown as "blocked")
// BE expects: todo | in_progress | completed | cancelled
const mapStatusToApi = (s) => {
    const v = String(s || "todo").toLowerCase();
    if (v === "open") return "todo";
    if (v === "in progress" || v === "in_progress") return "in_progress";
    if (v === "done" || v === "completed" || v === "closed") return "completed";
    if (v === "blocked") return "cancelled";
    if (v === "canceled") return "cancelled";
    return v; // already one of: todo | in_progress | completed | cancelled
};

// Map BE enum → FE status
const mapStatusFromApi = (s) => {
    const v = String(s || "todo").toLowerCase();
    if (v === "todo") return "open";
    if (v === "in_progress") return "in_progress";
    if (v === "completed") return "done";
    if (v === "cancelled" || v === "canceled") return "blocked";
    return v;
};

// Map FE priority → BE enum
// FE uses: high | normal | low
// BE expects: high | medium | low
const mapPriorityToApi = (p) => {
    // Accept both numeric (1/2/3) and string priorities from the UI
    const raw = p;
    const v = String(p || "medium").toLowerCase();
    if (v === "1" || v === "low") return "low";
    if (v === "2" || v === "normal" || v === "med" || v === "medium") return "medium";
    if (v === "3" || v === "high") return "high";
    // Fallback: return original string (may be already valid)
    return v;
};

// Map BE enum → FE priority
const mapPriorityFromApi = (p) => {
    const v = String(p || "medium").toLowerCase();
    if (v === "medium") return "normal";
    return v; // high|low remain as-is
};

const minutesToMeridiem = (minutes) => {
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > (23 * 60 + 59)) return null;
    const hour24 = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const meridiem = hour24 >= 12 ? "pm" : "am";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return `${hour12}:${String(mins).padStart(2, "0")}${meridiem}`;
};

const normalizeDurationToMeridiem = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const raw = String(value).trim();
    if (!raw) return null;

    const meridiemMatch = raw.match(/^([1-9]|1[0-2]):([0-5]\d)\s*(am|pm)$/i);
    if (meridiemMatch) {
        return `${Number(meridiemMatch[1])}:${meridiemMatch[2]}${meridiemMatch[3].toLowerCase()}`;
    }

    const minutes = parseDurationToMinutes(raw);
    if (minutes === null) return raw;

    return minutesToMeridiem(minutes) || raw;
};

const normalizeDurationToCompact = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const raw = String(value).trim();
    if (!raw) return null;

    if (/^(\d+[hm])+$/i.test(raw)) return raw.toLowerCase();

    const minutes = parseDurationToMinutes(raw);
    if (minutes === null) return raw;

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
};

const normalizeDurationFromApi = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    return normalizeDurationToMeridiem(raw) || raw;
};

const retryWithLegacyDurationIfNeeded = async (requestFactory, legacyFactory) => {
    try {
        return await requestFactory();
    } catch (e) {
        if (e?.response?.status !== 400 || typeof legacyFactory !== "function") throw e;
        return await legacyFactory();
    }
};

const base = "/tasks";

const normalizeTaskRaci = (task) => {
    const raci = Array.isArray(task?.raci) ? task.raci : [];
    return {
        raci,
        consulted: raci.filter((entry) => entry?.role === "consulted").map((entry) => entry.userId),
        informed: raci.filter((entry) => entry?.role === "informed").map((entry) => entry.userId),
    };
};

const normalizeTaskFromApi = (task) => {
    const t = task || {};
    const rawGoal = t.goal_id ?? t.goalId ?? t.goal ?? null;
    let gid = null;
    if (rawGoal) {
        if (typeof rawGoal === 'object' && rawGoal !== null) {
            gid = rawGoal.id || rawGoal.goal_id || null;
        } else {
            gid = rawGoal;
        }
    }
    const raciFields = normalizeTaskRaci(t);
    return {
        ...t,
        ...raciFields,
        status: mapStatusFromApi(t.status),
        priority: mapPriorityFromApi(t.priority),
        duration: normalizeDurationFromApi(t.duration),
        goal_id: gid || null,
        list_index: typeof t.listIndex !== 'undefined' ? t.listIndex : (typeof t.list_index !== 'undefined' ? t.list_index : null),
        listIndex: typeof t.listIndex !== 'undefined' ? t.listIndex : (typeof t.list_index !== 'undefined' ? t.list_index : null),
        imported: typeof t.imported === 'boolean' ? t.imported : !!t.imported,
    };
};

const taskService = {
    async list({ keyAreaId, unassigned, delegatedTo, withoutGoal, includeImported } = {}) {
        // In dev, bypass browser cache to avoid 304/Not Modified confusion after updates
        const params = {};
        if (keyAreaId) params.keyAreaId = keyAreaId;
        if (unassigned) params.unassigned = true;
        if (delegatedTo) params.delegatedTo = true;
        if (withoutGoal) params.withoutGoal = true;
        if (includeImported) params.includeImported = true;
        if (import.meta.env?.DEV) params._ts = Date.now();
        // Note: Do NOT send custom Cache-Control request header; it triggers CORS preflight and may be disallowed by server.
        // We use a cache-busting query param instead.
        try {
            const res = await apiClient.get(base, { params });
            return res.data.map((t) => normalizeTaskFromApi(t));
        } catch (e) {
            const status = e?.response?.status;
            const data = e?.response?.data;
            console.warn("Tasks list failed", { status, data });
            if (status === 500) {
                // Fallback: don’t break UI if server errors; show no tasks
                return [];
            }
            throw e;
        }
    },
    async get(id) {
        const res = await apiClient.get(`${base}/${id}`);
        return normalizeTaskFromApi(res.data);
    },
    async create(payload) {
        // Normalize list index key so backend DTO (which expects camelCase)
        // receives `listIndex` when callers pass `list_index` from UI components.
        const body = { ...payload };
        if (typeof body.listIndex === 'undefined' && typeof body.list_index !== 'undefined') {
            body.listIndex = body.list_index;
        }
        const durationProvided = Object.prototype.hasOwnProperty.call(body, 'duration');
        const primaryBody = {
            ...body,
            ...(durationProvided ? { duration: normalizeDurationToMeridiem(body.duration) } : {}),
            status: mapStatusToApi(body.status),
            priority: mapPriorityToApi(body.priority),
        };
        const legacyBody = {
            ...primaryBody,
            ...(durationProvided ? { duration: normalizeDurationToCompact(body.duration) } : {}),
        };
        const res = await retryWithLegacyDurationIfNeeded(
            () => apiClient.post(base, primaryBody),
            durationProvided ? () => apiClient.post(base, legacyBody) : null,
        );
        return normalizeTaskFromApi(res.data);
    },
    async update(id, payload) {
        const data = { ...payload };
        // Accept both snake_case and camelCase for list index coming from UI
        if (typeof data.listIndex === 'undefined' && typeof data.list_index !== 'undefined') {
            data.listIndex = data.list_index;
        }
        const durationProvided = Object.prototype.hasOwnProperty.call(data, 'duration');
        const primaryData = { ...data };
        if (durationProvided) primaryData.duration = normalizeDurationToMeridiem(data.duration);
        if (primaryData.status) primaryData.status = mapStatusToApi(primaryData.status);
        if (primaryData.priority) primaryData.priority = mapPriorityToApi(primaryData.priority);
        const legacyData = { ...primaryData };
        if (durationProvided) legacyData.duration = normalizeDurationToCompact(data.duration);
        const res = await retryWithLegacyDurationIfNeeded(
            () => apiClient.put(`${base}/${id}`, primaryData),
            durationProvided ? () => apiClient.put(`${base}/${id}`, legacyData) : null,
        );
        return normalizeTaskFromApi(res.data);
    },
    async remove(id) {
        const res = await apiClient.delete(`${base}/${id}`);
        return res.data;
    },
    async getRaci(id) {
        const res = await apiClient.get(`${base}/${id}/raci`);
        return Array.isArray(res.data) ? res.data : [];
    },
    async setRaciRole(id, role, memberIds) {
        const res = await apiClient.put(`${base}/${id}/raci/${role}`, {
            members: Array.isArray(memberIds) ? memberIds : [],
        });
        return Array.isArray(res.data) ? res.data : [];
    },
};

export default taskService;
