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

const base = "/tasks";

const taskService = {
    async list({ keyAreaId } = {}) {
        // In dev, bypass browser cache to avoid 304/Not Modified confusion after updates
        const params = { keyAreaId };
        if (import.meta.env?.DEV) params._ts = Date.now();
        const res = await apiClient.get(base, {
            params,
            headers: import.meta.env?.DEV ? { "Cache-Control": "no-cache" } : undefined,
        });
        return res.data.map((t) => ({ ...t, status: mapStatusFromApi(t.status) }));
    },
    async get(id) {
        const res = await apiClient.get(`${base}/${id}`);
        const t = res.data;
        return { ...t, status: mapStatusFromApi(t.status) };
    },
    async create(payload) {
        const res = await apiClient.post(base, {
            ...payload,
            status: mapStatusToApi(payload.status),
        });
        const t = res.data;
        return { ...t, status: mapStatusFromApi(t.status) };
    },
    async update(id, payload) {
        const data = { ...payload };
        if (data.status) data.status = mapStatusToApi(data.status);
        const res = await apiClient.put(`${base}/${id}`, data);
        const t = res.data;
        return { ...t, status: mapStatusFromApi(t.status) };
    },
    async remove(id) {
        const res = await apiClient.delete(`${base}/${id}`);
        return res.data;
    },
};

export default taskService;
