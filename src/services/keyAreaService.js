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
        const items = Array.isArray(res.data) ? res.data.map(toFE) : [];
        // Sort: non-Ideas first (by position, then title), Ideas always last
        return items.sort((a, b) => {
            const aIsIdeas = String(a.title || "").trim().toLowerCase() === "ideas";
            const bIsIdeas = String(b.title || "").trim().toLowerCase() === "ideas";
            if (aIsIdeas && !bIsIdeas) return 1;
            if (!aIsIdeas && bIsIdeas) return -1;
            const ap = Number.isFinite(a.position) ? a.position : 0;
            const bp = Number.isFinite(b.position) ? b.position : 0;
            if (ap !== bp) return ap - bp;
            return String(a.title || "").localeCompare(String(b.title || ""));
        });
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

// Temporary compatibility export for callers expecting this helper
export async function getKeyAreas() {
    const response = await apiClient.get("/key-areas");
    return response.data;
}
