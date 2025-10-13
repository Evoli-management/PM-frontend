import apiClient from "./apiClient";

const base = "/calendar";

const calendarService = {
    async listEvents({ from, to, view } = {}) {
        const params = { from, to };
        if (view && (view === "day" || view === "week")) params.view = view;
        if (import.meta.env?.DEV) params._ts = Date.now();
        const res = await apiClient.get(`${base}/events`, {
            params,
            headers: import.meta.env?.DEV ? { "Cache-Control": "no-cache" } : undefined,
        });
        return res.data || [];
    },

    async listTodos({ from, to } = {}) {
        const params = { from, to };
        if (import.meta.env?.DEV) params._ts = Date.now();
        const res = await apiClient.get(`${base}/todos`, {
            params,
            headers: import.meta.env?.DEV ? { "Cache-Control": "no-cache" } : undefined,
        });
        return res.data || [];
    },

    async listAppointments({ from, to } = {}) {
        const params = { from, to };
        if (import.meta.env?.DEV) params._ts = Date.now();
        const res = await apiClient.get(`${base}/appointments`, {
            params,
            headers: import.meta.env?.DEV ? { "Cache-Control": "no-cache" } : undefined,
        });
        return res.data || [];
    },

    async createEvent(payload) {
        const res = await apiClient.post(`${base}/events`, payload);
        return res.data;
    },

    async createAppointment(payload) {
        const res = await apiClient.post(`${base}/appointments`, payload);
        return res.data;
    },

    async updateEvent(id, payload) {
        if (!id) throw new Error("Missing event id");
        const res = await apiClient.patch(`${base}/events/${id}`, payload);
        return res.data;
    },

    async updateAppointment(id, payload) {
        if (!id) throw new Error("Missing appointment id");
        const res = await apiClient.patch(`${base}/appointments/${id}`, payload);
        return res.data;
    },

    async deleteEvent(id) {
        if (!id) throw new Error("Missing event id");
        await apiClient.delete(`${base}/events/${id}`);
        return true;
    },

    async deleteAppointment(id) {
        if (!id) throw new Error("Missing appointment id");
        await apiClient.delete(`${base}/appointments/${id}`);
        return true;
    },

    // External Calendar Sync Methods
    async syncGoogleCalendar() {
        const res = await apiClient.post(`${base}/sync/google`);
        return res.data;
    },

    async syncMicrosoftCalendar() {
        const res = await apiClient.post(`${base}/sync/microsoft`);
        return res.data;
    },

    async getSyncStatus() {
        const res = await apiClient.get(`${base}/sync/status`);
        return res.data;
    },

    async disconnectCalendar(provider) {
        if (!provider) throw new Error("Missing provider");
        const res = await apiClient.post(`${base}/sync/disconnect`, { provider });
        return res.data;
    },
};

export default calendarService;
