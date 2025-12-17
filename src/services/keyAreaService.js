// src/services/keyAreaService.js
import apiClient from "./apiClient";

// FE<->BE mapping helpers
const toFE = (area) => ({
    id: area.id,
    title: area.name,
    color: area.color || '#3B82F6',
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
    if (data.color !== undefined) out.color = data.color;
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

    // Bulk reorder; server should accept an array of { id, sortOrder }
    // Falls back to individual updates if endpoint is unavailable
    async reorder(items) {
        try {
            const payload = Array.isArray(items)
                ? items.map((x) => ({ id: x.id, sortOrder: x.position }))
                : [];
            await apiClient.patch(
                "/key-areas/reorder",
                { items: payload },
                { headers: { "Content-Type": "application/json" } },
            );
            return true;
        } catch (e) {
            // If server doesn't support bulk endpoint, fallback to per-item update
            if (Array.isArray(items)) {
                await Promise.all(
                    items.map((x) =>
                        apiClient.put(
                            `/key-areas/${x.id}`,
                            { sortOrder: x.position },
                            { headers: { "Content-Type": "application/json" } },
                        ),
                    ),
                );
                return true;
            }
            throw e;
        }
    },

    async remove(id) {
        await apiClient.delete(`/key-areas/${id}`);
        return true;
    },

    /**
     * Get another user's key areas (within same organization)
     * @param {string} userId - The ID of the user whose key areas to fetch
     * @returns {Promise<Array>} A promise that resolves to an array of key areas
     */
    async getMemberKeyAreas(userId) {
        const res = await apiClient.get(`/key-areas/user/${userId}`);
        const items = Array.isArray(res.data) ? res.data.map(toFE) : [];
        return items.sort((a, b) => {
            const ap = Number.isFinite(a.position) ? a.position : 0;
            const bp = Number.isFinite(b.position) ? b.position : 0;
            if (ap !== bp) return ap - bp;
            return String(a.title || "").localeCompare(String(b.title || ""));
        });
    },
};

export default keyAreaService;

// Temporary compatibility export for callers expecting this helper
export async function getKeyAreas() {
    const response = await apiClient.get("/key-areas");
    return response.data;
}
