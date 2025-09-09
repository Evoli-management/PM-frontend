import React, { useEffect, useMemo, useState } from "react";
import calendarService from "../../services/calendarService";
import { useToast } from "../shared/ToastProvider.jsx";
import keyAreaService from "../../services/keyAreaService";
import { getGoals } from "../../services/goalService";

const EventModal = ({ event, onClose, categories, timezone, onEventUpdated, onEventDeleted }) => {
    if (!event) return null;
    const { addToast } = useToast();
    const startStr = event.start ? new Date(event.start).toLocaleString() : "";
    const endStr = event.end ? new Date(event.end).toLocaleString() : "";

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);
    const toDateInput = (d) => (d ? new Date(d) : null);
    const toYMD = (dt) =>
        dt
            ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
            : "";
    const toHM = (dt) =>
        dt ? `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}` : "";

    const startDT = toDateInput(event.start);
    const endDT = event.end ? toDateInput(event.end) : null;

    const [title, setTitle] = useState(event.title || "");
    const [notes, setNotes] = useState(event.description || "");
    const [startDate, setStartDate] = useState(toYMD(startDT));
    const [startTime, setStartTime] = useState(toHM(startDT));
    const [endDate, setEndDate] = useState(toYMD(endDT));
    const [endTime, setEndTime] = useState(toHM(endDT));
    const [kind, setKind] = useState(event.kind || "custom");
    const [keyAreaId, setKeyAreaId] = useState(event.keyAreaId || "");
    const [goalId, setGoalId] = useState(""); // placeholder (not persisted yet)
    const [recurring, setRecurring] = useState(false); // placeholder
    const [saving, setSaving] = useState(false);

    // Load options
    const [keyAreas, setKeyAreas] = useState([]);
    const [goals, setGoals] = useState([]);
    useEffect(() => {
        (async () => {
            try {
                const [kas, gs] = await Promise.all([
                    keyAreaService.list({ includeTaskCount: false }).catch(() => []),
                    getGoals().catch(() => []),
                ]);
                setKeyAreas(Array.isArray(kas) ? kas : []);
                setGoals(Array.isArray(gs) ? gs : []);
            } catch {}
        })();
    }, []);

    const kinds = useMemo(
        () => [
            { value: "meeting", label: "Meeting" },
            { value: "focus", label: "Focus" },
            { value: "custom", label: "Custom" },
            { value: "green", label: "Green" },
            { value: "red", label: "Red" },
        ],
        [],
    );

    const combineLocal = (ymd, hm) => {
        if (!ymd || !hm) return null;
        const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
        const [hh, mm] = hm.split(":").map((n) => parseInt(n, 10));
        const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
        return dt;
    };

    const onConfirm = async () => {
        try {
            if (!title.trim()) {
                addToast({ title: "Title is required", variant: "error" });
                return;
            }
            const s = combineLocal(startDate, startTime);
            const e = combineLocal(endDate, endTime);
            if (!s || !e) {
                addToast({ title: "Start and End are required", variant: "error" });
                return;
            }
            if (s > e) {
                addToast({ title: "Start must be before End", variant: "error" });
                return;
            }
            setSaving(true);
            const payload = {
                title: title.trim(),
                description: notes || null,
                start: s.toISOString(),
                end: e.toISOString(),
                kind,
            };
            if (keyAreaId) payload.keyAreaId = keyAreaId;
            // goalId & recurring not yet supported on backend for events
            const updated = await calendarService.updateEvent(event.id, payload);
            onEventUpdated && onEventUpdated(updated);
            setIsEditing(false);
            addToast({ title: "Event updated", variant: "success" });
        } catch (e) {
            console.warn("Failed to save event", e);
            addToast({ title: "Failed to save", description: String(e?.message || e), variant: "error" });
        } finally {
            setSaving(false);
        }
    };

    const shift = async (minutes) => {
        try {
            const start = event.start ? new Date(event.start) : null;
            if (!start) return;
            const end = event.end ? new Date(event.end) : null;
            const newStart = new Date(start.getTime() + minutes * 60 * 1000);
            const newEnd = end ? new Date(end.getTime() + minutes * 60 * 1000) : null;
            const updated = await calendarService.updateEvent(event.id, {
                start: newStart.toISOString(),
                end: newEnd ? newEnd.toISOString() : null,
            });
            onEventUpdated && onEventUpdated(updated);
            addToast({ title: "Event moved", variant: "success" });
        } catch (e) {
            console.warn("Failed to update event", e);
            addToast({ title: "Failed to move event", description: String(e?.message || e), variant: "error" });
        }
    };

    const resize = async (deltaMinutes) => {
        try {
            const end = event.end ? new Date(event.end) : null;
            if (!end) return;
            const newEnd = new Date(end.getTime() + deltaMinutes * 60 * 1000);
            const updated = await calendarService.updateEvent(event.id, {
                end: newEnd.toISOString(),
            });
            onEventUpdated && onEventUpdated(updated);
            addToast({ title: "Event resized", variant: "success" });
        } catch (e) {
            console.warn("Failed to resize event", e);
            addToast({ title: "Failed to resize", description: String(e?.message || e), variant: "error" });
        }
    };
    const remove = async () => {
        try {
            await calendarService.deleteEvent(event.id);
            onEventDeleted && onEventDeleted(event.id);
            onClose && onClose();
            addToast({ title: "Event deleted", variant: "success" });
        } catch (e) {
            console.warn("Failed to delete event", e);
            addToast({ title: "Failed to delete", description: String(e?.message || e), variant: "error" });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 w-96 relative">
                <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>
                    ✖
                </button>
                {!isEditing ? (
                    <>
                        <h2 className="text-xl font-bold mb-2">{event.title}</h2>
                        <div className="mb-2 text-sm text-gray-500">
                            {event.kind && <span className="uppercase text-xs tracking-wide">{event.kind}</span>}
                        </div>
                        <div className="mb-2 text-xs text-gray-400">
                            {startStr}
                            {endStr ? ` - ${endStr}` : ""}
                        </div>
                        <div className="mb-2 text-xs text-gray-400">Timezone: {timezone}</div>
                        <div className="mb-4 text-gray-600">{event.description || ""}</div>
                        <div className="flex flex-wrap gap-2">
                            {event.taskId && (
                                <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs">View Task</button>
                            )}
                            <button
                                className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs"
                                onClick={() => setIsEditing(true)}
                            >
                                Edit
                            </button>
                            <button className="bg-red-500 text-white px-3 py-1 rounded text-xs" onClick={remove}>
                                Delete
                            </button>
                            <div className="w-full h-px bg-gray-100 my-1"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-gray-500">Move:</span>
                                <button
                                    className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs"
                                    onClick={() => shift(-30)}
                                >
                                    -30m
                                </button>
                                <button
                                    className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs"
                                    onClick={() => shift(30)}
                                >
                                    +30m
                                </button>
                            </div>
                            {event.end && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-gray-500">Resize:</span>
                                    <button
                                        className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs"
                                        onClick={() => resize(-30)}
                                    >
                                        -30m
                                    </button>
                                    <button
                                        className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs"
                                        onClick={() => resize(30)}
                                    >
                                        +30m
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className="text-xl font-bold mb-3">Edit</h2>
                        {/* Title */}
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Title*</label>
                        <input
                            type="text"
                            className="w-full border rounded px-2 py-1 mb-3"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Title"
                        />

                        {/* Start/Key area Row */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date*</label>
                                <input
                                    type="date"
                                    className="w-full border rounded px-2 py-1"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Start Time*</label>
                                <input
                                    type="time"
                                    className="w-full border rounded px-2 py-1"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Key area</label>
                                <select
                                    className="w-full border rounded px-2 py-1"
                                    value={keyAreaId}
                                    onChange={(e) => setKeyAreaId(e.target.value)}
                                >
                                    <option value="">None</option>
                                    {keyAreas.map((ka) => (
                                        <option key={ka.id} value={ka.id}>
                                            {ka.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* End/Goal Row */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">End Date*</label>
                                <input
                                    type="date"
                                    className="w-full border rounded px-2 py-1"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">End Time*</label>
                                <input
                                    type="time"
                                    className="w-full border rounded px-2 py-1"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Goal</label>
                                <select
                                    className="w-full border rounded px-2 py-1"
                                    value={goalId}
                                    onChange={(e) => setGoalId(e.target.value)}
                                >
                                    <option value="">None</option>
                                    {goals.map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {g.title || g.name || g.text || g.id}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Priority (mapped to kind) */}
                        <div className="mb-3">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
                            <select
                                className="w-full border rounded px-2 py-1"
                                value={kind}
                                onChange={(e) => setKind(e.target.value)}
                            >
                                {kinds.map((k) => (
                                    <option key={k.value} value={k.value}>
                                        {k.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Notes */}
                        <div className="mb-3">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                            <textarea
                                className="w-full border rounded px-2 py-1"
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notes"
                            />
                        </div>

                        {/* Recurring placeholder */}
                        <div className="mb-4">
                            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={recurring}
                                    onChange={(e) => setRecurring(e.target.checked)}
                                    disabled
                                />
                                ⟳ Make recurring (coming soon)
                            </label>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-800"
                                onClick={() => setIsEditing(false)}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50"
                                onClick={onConfirm}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Confirm"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default EventModal;
