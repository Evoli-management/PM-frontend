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
    const v = String(p || "medium").toLowerCase();
    if (v === "normal") return "medium";
    if (v === "med") return "medium";
    if (v === "high" || v === "low" || v === "medium") return v;
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
    async list({ keyAreaId, unassigned } = {}) {
        // In dev, bypass browser cache to avoid 304/Not Modified confusion after updates
        const params = {};
        if (keyAreaId) params.keyAreaId = keyAreaId;
        if (unassigned) params.unassigned = true;
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
        return { ...t, status: mapStatusFromApi(t.status), priority: mapPriorityFromApi(t.priority), goal_id: gid || null };
    },
    async create(payload) {
        const res = await apiClient.post(base, {
            ...payload,
            status: mapStatusToApi(payload.status),
            priority: mapPriorityToApi(payload.priority),
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
        return { ...t, status: mapStatusFromApi(t.status), priority: mapPriorityFromApi(t.priority), goal_id: gid || null };
    },
    async update(id, payload) {
        const data = { ...payload };
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
        return { ...t, status: mapStatusFromApi(t.status), priority: mapPriorityFromApi(t.priority), goal_id: gid || null };
    },
    async remove(id) {
        const res = await apiClient.delete(`${base}/${id}`);
        return res.data;
    },
};

export default taskService;
