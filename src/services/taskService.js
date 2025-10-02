import apiClient from "./apiClient";

// Map FE legacy statuses to BE enums if needed
const mapStatusToApi = (s) => {
    const v = String(s || "todo").toLowerCase();
    if (v === "open") return "todo";
    if (v === "blocked") return "todo";
    if (v === "in progress") return "in_progress";
    return v; // todo|in_progress|completed|cancelled
};

const mapStatusFromApi = (s) => s; // already in canonical form

const base = "/tasks";

const taskService = {
    async list({ keyAreaId } = {}) {
        const res = await apiClient.get(base, { params: { keyAreaId } });
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
