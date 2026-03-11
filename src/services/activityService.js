import apiClient from "./apiClient";
import { parseDurationToMinutes } from "../utils/duration";

const base = "/activities";

const minutesToMeridiem = (minutes) => {
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > (23 * 60 + 59)) return null;
    const hour24 = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const meridiem = hour24 >= 12 ? "pm" : "am";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return `${hour12}:${String(mins).padStart(2, "0")}${meridiem}`;
};

const normalizeDurationToMeridiem = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const raw = String(value).trim();
    if (!raw) return null;

    const meridiemMatch = raw.match(/^([1-9]|1[0-2]):([0-5]\d)\s*(am|pm)$/i);
    if (meridiemMatch) {
        return `${Number(meridiemMatch[1])}:${meridiemMatch[2]}${meridiemMatch[3].toLowerCase()}`;
    }

    const minutes = parseDurationToMinutes(raw);
    if (minutes === null) return raw;

    return minutesToMeridiem(minutes) || raw;
};

const activityService = {
    async list(params = {}) {
        // params: { taskId?: string }
        const res = await apiClient.get(base, { params });
        return res.data;
    },
    async create(payload) {
        // payload: { text: string, taskId?: string|null }
        const body = { ...payload };
        if (Object.prototype.hasOwnProperty.call(body, 'duration')) {
            body.duration = normalizeDurationToMeridiem(body.duration);
        }
        const res = await apiClient.post(base, body);
        return res.data;
    },
    async get(id) {
        const res = await apiClient.get(`${base}/${id}`);
        return res.data;
    },
    async update(id, payload) {
        const body = { ...payload };
        if (Object.prototype.hasOwnProperty.call(body, 'duration')) {
            body.duration = normalizeDurationToMeridiem(body.duration);
        }
        const res = await apiClient.put(`${base}/${id}`, body);
        return res.data;
    },
    async remove(id) {
        const res = await apiClient.delete(`${base}/${id}`);
        return res.data;
    },
};

export default activityService;
