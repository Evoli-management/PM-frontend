// src/services/keyAreaService.js
import apiClient from "./apiClient";

// FE<->BE mapping helpers
const toFE = (area) => ({
    id: area.id,
    title: area.name,
    description: area.description || "",
    position: area.sortOrder ?? 0,
    is_default: !!area.isSystem,
    color: area.color || "",
    createdAt: area.createdAt,
    updatedAt: area.updatedAt,
    taskCount: area.taskCount ?? 0,
});

const toBECreate = (data) => ({
    name: data.title?.trim() || "",
    description: data.description ?? undefined,
    color: data.color ?? undefined,
    sortOrder: data.position ?? undefined,
});

const toBEUpdate = (data) => ({
    name: data.title,
    description: data.description,
    color: data.color,
    sortOrder: data.position,
});

const keyAreaService = {
    async list({ includeTaskCount = true } = {}) {
        const res = await apiClient.get("/key-areas", {
            params: { includeTaskCount },
        });
        return Array.isArray(res.data) ? res.data.map(toFE) : [];
    },

    async get(id, { includeTaskCount = false } = {}) {
        const res = await apiClient.get(`/key-areas/${id}`, {
            params: { includeTaskCount },
        });
        return toFE(res.data);
    },

    async create(payload) {
        const res = await apiClient.post("/key-areas", toBECreate(payload));
        return toFE(res.data);
    },

    async update(id, payload) {
        const res = await apiClient.put(`/key-areas/${id}`, toBEUpdate(payload));
        return toFE(res.data);
    },

    async remove(id) {
        await apiClient.delete(`/key-areas/${id}`);
        return true;
    },
};

export default keyAreaService;
