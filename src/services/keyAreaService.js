// src/services/keyAreaService.js
import apiClient from "./apiClient";

// FE<->BE mapping helpers
const toFE = (area) => ({
    id: area.id,
    title: area.name,
    description: area.description || "",
    position: area.sortOrder ?? 0,
    is_default: !!area.isSystem,
    listNames: area.listNames || {},
    createdAt: area.createdAt,
    updatedAt: area.updatedAt,
    taskCount: area.taskCount ?? 0,
});

const toBECreate = (data) => ({
    name: data.title?.trim() || "",
    description: data.description ?? undefined,
    sortOrder: data.position ?? undefined,
});

const toBEUpdate = (data) => {
    const out = {};
    if (data.title !== undefined) out.name = data.title;
    if (data.description !== undefined) out.description = data.description;
    if (data.position !== undefined) out.sortOrder = data.position;
    if (data.listNames !== undefined) out.listNames = data.listNames;
    return out;
};

const keyAreaService = {
    async list({ includeTaskCount = true } = {}) {
        const res = await apiClient.get("/key-areas", {
            params: { includeTaskCount },
        });
        let items = Array.isArray(res.data) ? res.data.map(toFE) : [];
        // Trust backend order; only ensure single Ideas entry client-side as a guard
        const ideas = items.filter(
            (i) =>
                String(i.title || "")
                    .trim()
                    .toLowerCase() === "ideas" || i.is_default,
        );
        if (ideas.length > 1) {
            const keep = ideas.find((i) => i.is_default) || ideas[0];
            const keepId = keep.id;
            items = items.filter((i) => {
                const isIdeas =
                    String(i.title || "")
                        .trim()
                        .toLowerCase() === "ideas" || i.is_default;
                return !isIdeas || i.id === keepId;
            });
        }
        return items;
    },

    async get(id, { includeTaskCount = false } = {}) {
        const res = await apiClient.get(`/key-areas/${id}`, {
            params: { includeTaskCount },
        });
        return toFE(res.data);
    },

    async create(payload) {
        const res = await apiClient.post("/key-areas", toBECreate(payload), {
            headers: { "Content-Type": "application/json" },
        });
        return toFE(res.data);
    },

    async update(id, payload) {
        const body = toBEUpdate(payload);
        // Remove undefined fields to avoid validation noise
        Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
        const res = await apiClient.put(`/key-areas/${id}`, body, {
            headers: { "Content-Type": "application/json" },
        });
        return toFE(res.data);
    },

    async remove(id) {
        await apiClient.delete(`/key-areas/${id}`);
        return true;
    },
};

export default keyAreaService;

export async function getKeyAreas() {
    // Use shared apiClient so cookies and base URL are correct in dev/prod
    const response = await apiClient.get("/key-areas");
    return response.data;
}
