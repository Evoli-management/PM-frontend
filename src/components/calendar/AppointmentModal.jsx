import React, { useMemo, useState, useEffect } from "react";
import { withinBusinessHours, clampToBusinessHours } from "../../utils/businessHours";
import calendarService from "../../services/calendarService";
import { useToast } from "../shared/ToastProvider.jsx";

// Unified Appointment form for create and edit
// Props:
// - startDate: Date (create mode)
// - event: existing event object (edit mode)
// - defaultDurationMinutes: number
// - onClose: () => void
// - onCreated: (createdEvent) => void (create mode)
// - onUpdated: (updatedEvent) => void (edit mode)
const AppointmentModal = ({ startDate, event = null, defaultDurationMinutes = 60, onClose, onCreated, onUpdated }) => {
    const { addToast } = useToast();
    const isEdit = Boolean(event && event.id);
    const initial = useMemo(() => {
        if (isEdit && event.start) return new Date(event.start);
        return new Date(startDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, event?.start, startDate]);
    const initialEndCalc = useMemo(() => {
        if (isEdit && event.end) return new Date(event.end);
        const { end } = clampToBusinessHours(initial, defaultDurationMinutes);
        return end;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, event?.end, initial, defaultDurationMinutes]);
    const toYMD = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const toHM = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    const [title, setTitle] = useState(isEdit ? event.title || "" : "");
    const [description, setDescription] = useState(isEdit ? event.description || "" : "");
    const [startDateStr, setStartDateStr] = useState(toYMD(initial));
    const [startTimeStr, setStartTimeStr] = useState(toHM(initial));
    const [endDateStr, setEndDateStr] = useState(toYMD(initialEndCalc));
    const [endTimeStr, setEndTimeStr] = useState(toHM(initialEndCalc));
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

    // Add keyboard support for closing modal
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

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
            if (isEdit) {
                const updater = event?.kind === "appointment" ? calendarService.updateAppointment : calendarService.updateEvent;
                const updated = await updater(event.id, {
                    title: title.trim(),
                    description: description.trim() || null,
                    start: toOffsetISO(s),
                    end: toOffsetISO(e),
                    timezone: tz,
                });
                onUpdated && onUpdated(updated);
            } else {
                const created = await calendarService.createAppointment({
                    title: title.trim(),
                    description: description.trim() || null,
                    start: toOffsetISO(s),
                    end: toOffsetISO(e),
                    // server enforces appointment rules
                    timezone: tz,
                });
                onCreated && onCreated(created);
            }
        } catch (err) {
            console.warn(isEdit ? "Failed to update appointment" : "Failed to create appointment", err);
            addToast({
                title: isEdit ? "Update failed" : "Create failed",
                description: String(err?.message || err),
                variant: "error",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/40 z-50 grid place-items-center"
            onClick={(e) => {
                // Close modal when clicking on backdrop
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="relative bg-white border border-slate-300 rounded-xl shadow-2xl w-[95vw] max-w-md overflow-hidden">
                <div className="bg-white text-slate-900 border-b border-slate-200 py-3 px-4 text-center font-semibold relative">
                    {isEdit ? "Edit Appointment" : "New Appointment"}
                    <button 
                        type="button"
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold leading-none" 
                        onClick={onClose} 
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                <form className="p-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <div className="mb-4">
                        <label className="sr-only" htmlFor="appointment-title">Title</label>
                        <input 
                            id="appointment-title"
                            required 
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            placeholder="Appointment title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date*</label>
                            <input
                                type="date"
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={startDateStr}
                                onChange={(e) => setStartDateStr(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time*</label>
                            <input
                                type="time"
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={startTimeStr}
                                onChange={(e) => setStartTimeStr(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">End Date*</label>
                            <input
                                type="date"
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={endDateStr}
                                onChange={(e) => setEndDateStr(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">End Time*</label>
                            <input
                                type="time"
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={endTimeStr}
                                onChange={(e) => setEndTimeStr(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                        <textarea
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add a description (optional)"
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            className="px-4 py-2 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                            disabled={saving}
                        >
                            {saving ? "Saving..." : isEdit ? "Save changes" : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AppointmentModal;
