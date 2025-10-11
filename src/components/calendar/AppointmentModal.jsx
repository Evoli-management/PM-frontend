import React, { useState } from "react";
import { withinBusinessHours, clampToBusinessHours } from "../../utils/businessHours";
import calendarService from "../../services/calendarService";
import { useToast } from "../shared/ToastProvider.jsx";

const AppointmentModal = ({ startDate, defaultDurationMinutes = 60, onClose, onCreated }) => {
    const { addToast } = useToast();
    const initial = new Date(startDate);
    const { end: initialEnd } = clampToBusinessHours(initial, defaultDurationMinutes);
    const toYMD = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const toHM = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [startDateStr, setStartDateStr] = useState(toYMD(initial));
    const [startTimeStr, setStartTimeStr] = useState(toHM(initial));
    const [endDateStr, setEndDateStr] = useState(toYMD(initialEnd));
    const [endTimeStr, setEndTimeStr] = useState(toHM(initialEnd));
    const [saving, setSaving] = useState(false);

    const combine = (ymd, hm) => {
        if (!ymd || !hm) return null;
        const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
        const [hh, mm] = hm.split(":").map((v) => parseInt(v, 10));
        return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
    };

    const toOffsetISO = (d) => {
        const pad = (n) => String(n).padStart(2, "0");
        const y = d.getFullYear();
        const m = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hh = pad(d.getHours());
        const mm = pad(d.getMinutes());
        const ss = "00";
        const off = -d.getTimezoneOffset(); // minutes east of UTC
        const sign = off >= 0 ? "+" : "-";
        const oh = pad(Math.floor(Math.abs(off) / 60));
        const om = pad(Math.abs(off) % 60);
        return `${y}-${m}-${day}T${hh}:${mm}:${ss}${sign}${oh}:${om}`;
    };

    const handleSave = async () => {
        try {
            if (!title.trim()) {
                addToast({ title: "Title required", variant: "error" });
                return;
            }
            const s = combine(startDateStr, startTimeStr);
            const e = combine(endDateStr, endTimeStr);
            if (!s || !e) {
                addToast({ title: "Start & End required", variant: "error" });
                return;
            }
            if (s >= e) {
                addToast({ title: "End must be after start", variant: "error" });
                return;
            }
            if (!withinBusinessHours(s) || !withinBusinessHours(e)) {
                addToast({ title: "Outside business hours", description: "Use between 08:00–17:00", variant: "error" });
                return;
            }
            setSaving(true);
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
            const created = await calendarService.createAppointment({
                title: title.trim(),
                description: description.trim() || null,
                start: toOffsetISO(s),
                end: toOffsetISO(e),
                // server enforces appointment rules
                timezone: tz,
            });
            onCreated && onCreated(created);
        } catch (err) {
            console.warn("Failed to create appointment", err);
            addToast({ title: "Create failed", description: String(err?.message || err), variant: "error" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 w-96 relative">
                <button className="absolute top-2 right-2 text-gray-500" onClick={onClose} aria-label="Close">
                    ✖
                </button>
                <h2 className="text-lg font-semibold mb-4">New Appointment</h2>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Title*</label>
                <input
                    className="w-full border rounded px-2 py-1 mb-3"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                />
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date*</label>
                        <input
                            type="date"
                            className="w-full border rounded px-2 py-1"
                            value={startDateStr}
                            onChange={(e) => setStartDateStr(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Start Time*</label>
                        <input
                            type="time"
                            className="w-full border rounded px-2 py-1"
                            value={startTimeStr}
                            onChange={(e) => setStartTimeStr(e.target.value)}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">End Date*</label>
                        <input
                            type="date"
                            className="w-full border rounded px-2 py-1"
                            value={endDateStr}
                            onChange={(e) => setEndDateStr(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">End Time*</label>
                        <input
                            type="time"
                            className="w-full border rounded px-2 py-1"
                            value={endTimeStr}
                            onChange={(e) => setEndTimeStr(e.target.value)}
                        />
                    </div>
                </div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                    className="w-full border rounded px-2 py-1 mb-4"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                />
                <div className="flex justify-end gap-2">
                    <button
                        className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-800"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-3 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppointmentModal;
