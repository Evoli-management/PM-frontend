import apiClient from "./apiClient";

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

const base = "/tasks";

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
            return res.data.map((t) => {
                // normalize possible goal id shapes into `goal_id` so UI can reliably look up titles
                const rawGoal = t.goal_id ?? t.goalId ?? t.goal ?? null;
                let gid = null;
                if (rawGoal) {
                    if (typeof rawGoal === 'object' && rawGoal !== null) {
                        gid = rawGoal.id || rawGoal.goal_id || null;
                    } else {
                        gid = rawGoal;
                    }
                }
                return {
                    ...t,
                    status: mapStatusFromApi(t.status),
                    priority: mapPriorityFromApi(t.priority),
                    goal_id: gid || null,
                    // support both camelCase and snake_case from server
                    list_index: typeof t.listIndex !== 'undefined' ? t.listIndex : (typeof t.list_index !== 'undefined' ? t.list_index : null),
                    listIndex: typeof t.listIndex !== 'undefined' ? t.listIndex : (typeof t.list_index !== 'undefined' ? t.list_index : null),
                    imported: typeof t.imported === 'boolean' ? t.imported : !!t.imported,
                };
            });
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
        const t = res.data;
        const rawGoal = t.goal_id ?? t.goalId ?? t.goal ?? null;
        let gid = null;
        if (rawGoal) {
            if (typeof rawGoal === 'object' && rawGoal !== null) {
                gid = rawGoal.id || rawGoal.goal_id || null;
            } else {
                gid = rawGoal;
            }
        }
        return {
            ...t, status: mapStatusFromApi(t.status), priority: mapPriorityFromApi(t.priority), goal_id: gid || null,
            list_index: typeof t.listIndex !== 'undefined' ? t.listIndex : (typeof t.list_index !== 'undefined' ? t.list_index : null),
            listIndex: typeof t.listIndex !== 'undefined' ? t.listIndex : (typeof t.list_index !== 'undefined' ? t.list_index : null),
        };
    },
    async create(payload) {
        // Normalize list index key so backend DTO (which expects camelCase)
        // receives `listIndex` when callers pass `list_index` from UI components.
        const body = { ...payload };
        if (typeof body.listIndex === 'undefined' && typeof body.list_index !== 'undefined') {
            body.listIndex = body.list_index;
        }
        const res = await apiClient.post(base, {
            ...body,
            status: mapStatusToApi(body.status),
            priority: mapPriorityToApi(body.priority),
        });
        const t = res.data;
        const rawGoal = t.goal_id ?? t.goalId ?? t.goal ?? null;
        let gid = null;
        if (rawGoal) {
            if (typeof rawGoal === 'object' && rawGoal !== null) {
                gid = rawGoal.id || rawGoal.goal_id || null;
            } else {
                gid = rawGoal;
            }
        }
        return {
            ...t, status: mapStatusFromApi(t.status), priority: mapPriorityFromApi(t.priority), goal_id: gid || null,
            list_index: typeof t.listIndex !== 'undefined' ? t.listIndex : (typeof t.list_index !== 'undefined' ? t.list_index : null),
            listIndex: typeof t.listIndex !== 'undefined' ? t.listIndex : (typeof t.list_index !== 'undefined' ? t.list_index : null),
        };
    },
    async update(id, payload) {
        const data = { ...payload };
        // Accept both snake_case and camelCase for list index coming from UI
        if (typeof data.listIndex === 'undefined' && typeof data.list_index !== 'undefined') {
            data.listIndex = data.list_index;
        }
        if (data.status) data.status = mapStatusToApi(data.status);
        if (data.priority) data.priority = mapPriorityToApi(data.priority);
        const res = await apiClient.put(`${base}/${id}`, data);
        const t = res.data;
        const rawGoal = t.goal_id ?? t.goalId ?? t.goal ?? null;
        let gid = null;
        if (rawGoal) {
            if (typeof rawGoal === 'object' && rawGoal !== null) {
                gid = rawGoal.id || rawGoal.goal_id || null;
            } else {
                gid = rawGoal;
            }
        }
        return {
            ...t, status: mapStatusFromApi(t.status), priority: mapPriorityFromApi(t.priority), goal_id: gid || null,
            list_index: typeof t.listIndex !== 'undefined' ? t.listIndex : (typeof t.list_index !== 'undefined' ? t.list_index : null),
            listIndex: typeof t.listIndex !== 'undefined' ? t.listIndex : (typeof t.list_index !== 'undefined' ? t.list_index : null),
        };
    },
    async remove(id) {
        const res = await apiClient.delete(`${base}/${id}`);
        return res.data;
    },
};

export default taskService;
