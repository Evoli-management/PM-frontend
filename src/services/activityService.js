import apiClient from "./apiClient";
import { normalizeDurationForApi, durationToTimeInputValue, isDurationInputValid } from "../utils/duration";

const base = "/activities";

const normalizeActivityDuration = (record) => {
    if (!record || !Object.prototype.hasOwnProperty.call(record, 'duration')) return record;
    return {
        ...record,
        duration: durationToTimeInputValue(record.duration),
    };
};

const activityService = {
    async list(params = {}) {
        // params: { taskId?: string }
        const res = await apiClient.get(base, { params });
        return Array.isArray(res.data) ? res.data.map((item) => normalizeActivityDuration(item)) : res.data;
    },
    async create(payload) {
        // payload: { text: string, taskId?: string|null }
        const body = { ...payload };
        if (Object.prototype.hasOwnProperty.call(body, 'duration')) {
            if (body.duration !== null && body.duration !== undefined && String(body.duration).trim() && !isDurationInputValid(body.duration)) {
                throw new Error("Duration must use HH:MM format, for example 01:00 or 01:30.");
            }
            body.duration = normalizeDurationForApi(body.duration);
        }
        const res = await apiClient.post(base, body);
        return normalizeActivityDuration(res.data);
    },
    async get(id) {
        const res = await apiClient.get(`${base}/${id}`);
        return normalizeActivityDuration(res.data);
    },
    async update(id, payload) {
        const body = { ...payload };
        if (Object.prototype.hasOwnProperty.call(body, 'duration')) {
            if (body.duration !== null && body.duration !== undefined && String(body.duration).trim() && !isDurationInputValid(body.duration)) {
                throw new Error("Duration must use HH:MM format, for example 01:00 or 01:30.");
            }
            body.duration = normalizeDurationForApi(body.duration);
        }
        const res = await apiClient.put(`${base}/${id}`, body);
        return normalizeActivityDuration(res.data);
    },
    async remove(id) {
        const res = await apiClient.delete(`${base}/${id}`);
        return res.data;
    },
};

export default activityService;
