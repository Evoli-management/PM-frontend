import apiClient from "./apiClient";

const base = "/activities";

const activityService = {
    async list(params = {}) {
        // params: { taskId?: string }
        const res = await apiClient.get(base, { params });
        return res.data;
    },
    async create(payload) {
        // payload: { text: string, taskId?: string|null }
        const res = await apiClient.post(base, payload);
        return res.data;
    },
    async get(id) {
        const res = await apiClient.get(`${base}/${id}`);
        return res.data;
    },
    async update(id, payload) {
        const res = await apiClient.put(`${base}/${id}`, payload);
        return res.data;
    },
    async remove(id) {
        const res = await apiClient.delete(`${base}/${id}`);
        return res.data;
    },
};

export default activityService;
