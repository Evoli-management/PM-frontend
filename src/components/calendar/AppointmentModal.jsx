import React, { useMemo, useState, useEffect, useRef } from "react";
import calendarService from "../../services/calendarService";
import { useToast } from "../shared/ToastProvider.jsx";
import TimePicker from "../ui/TimePicker.jsx";
// TimePicker used with scoped inner classes so styles don't override external fields
import useCalendarPreferences from "../../hooks/useCalendarPreferences";

// Unified Appointment form for create and edit
// Props:
// - startDate: Date (create mode)
// - event: existing event object (edit mode)
// - defaultDurationMinutes: number
// - onClose: () => void
// - onCreated: (createdEvent) => void (create mode)
// - onUpdated: (updatedEvent) => void (edit mode)
const AppointmentModal = ({ startDate, event = null, defaultDurationMinutes = 60, onClose, onCreated, onUpdated, users = [] }) => {
    const { addToast } = useToast();
    const { use24Hour } = useCalendarPreferences();
    const isEdit = Boolean(event && event.id);
    const initial = useMemo(() => {
        if (isEdit && event.start) return new Date(event.start);
        return new Date(startDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, event?.start, startDate]);
    const initialEndCalc = useMemo(() => {
        if (isEdit && event.end) return new Date(event.end);
        // No longer clamp to business hours; treat default duration as simple offset
        return new Date(initial.getTime() + defaultDurationMinutes * 60000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, event?.end, initial, defaultDurationMinutes]);

    const toYMD = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const toHM = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    const [title, setTitle] = useState(isEdit ? event.title || "" : "");
    const [description, setDescription] = useState(isEdit ? event.description || "" : "");
    const getOptionValueFromUser = (u) => String(u?.id ?? u?.userId ?? u?.email ?? "");

    const resolveAssignee = (ev) => {
        if (!ev) return "";
        // Direct string value
        if (typeof ev.assignee === "string" && ev.assignee.trim() !== "") return ev.assignee;
        if (typeof ev.responsible === "string" && ev.responsible.trim() !== "") return ev.responsible;
        if (typeof ev.owner === "string" && ev.owner.trim() !== "") return ev.owner;
        if (typeof ev.assigned_to === "string" && ev.assigned_to.trim() !== "") return ev.assigned_to;
        if (typeof ev.assignee_name === "string" && ev.assignee_name.trim() !== "") return ev.assignee_name;
        // Numeric ids
        if (typeof ev.assignee === "number") return String(ev.assignee);
        if (typeof ev.responsible === "number") return String(ev.responsible);
        // Nested user object
        const maybe = ev.assignee || ev.responsible || ev.owner || ev.assigned_to || null;
        if (maybe && typeof maybe === "object") {
            return String(maybe.id || maybe.userId || maybe.email || maybe.uuid || maybe.uid || "") || "";
        }
        // Fallback to explicit id fields
        if (ev.assigneeId) return String(ev.assigneeId);
        if (ev.assignee_id) return String(ev.assignee_id);
        if (ev.assignedTo) return String(ev.assignedTo);
        return "";
    };

    const matchAssigneeAgainstUsers = (ev) => {
        try {
            if (!Array.isArray(users) || users.length === 0 || !ev) return null;
            const raw = ev.assignee ?? ev.responsible ?? ev.owner ?? ev.assigned_to ?? ev.assignee_name ?? ev.assigneeId ?? ev.assignee_id ?? ev.assignedTo ?? null;
            // If raw is object, try extract id/email
            if (raw && typeof raw === 'object') {
                const id = raw.id ?? raw.userId ?? raw.email ?? raw.uuid ?? raw.uid ?? null;
                if (id) {
                    const found = users.find(u => String(u.id) === String(id) || String(u.userId) === String(id) || String(u.email) === String(id));
                    if (found) return getOptionValueFromUser(found);
                }
            }
            if (raw) {
                const s = String(raw).trim();
                const found = users.find(u => String(u.id) === s || String(u.userId) === s || String(u.email) === s || (u.email && String(u.email).toLowerCase() === s.toLowerCase()));
                if (found) return getOptionValueFromUser(found);
            }
            // try matching by name aliases on event against users' name fields
            const name = ev.assignee_name || ev.assigneeName || ev.responsibleName || ev.responsible_name || ev.name || ev.ownerName || null;
            if (name) {
                const found = users.find(u => ((u.name || u.fullName || u.full_name || '') + '').toLowerCase() === String(name).toLowerCase());
                if (found) return getOptionValueFromUser(found);
            }
            return null;
        } catch (e) { return null; }
    };

    const initialAssignee = isEdit ? (matchAssigneeAgainstUsers(event) || resolveAssignee(event)) : "";
    const [assignee, setAssignee] = useState(initialAssignee);
    const [startDateStr, setStartDateStr] = useState(toYMD(initial));
    const [startTimeStr, setStartTimeStr] = useState(toHM(initial));
    const [endDateStr, setEndDateStr] = useState(toYMD(initialEndCalc));
    const [endTimeStr, setEndTimeStr] = useState(toHM(initialEndCalc));
    const [saving, setSaving] = useState(false);

    const startRef = useRef(null);
    const endRef = useRef(null);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [onClose]);

    useEffect(() => {
        // reset fields on event change / open
        setTitle(isEdit ? event.title || "" : "");
        setDescription(isEdit ? event.description || "" : "");
        setAssignee(isEdit ? (matchAssigneeAgainstUsers(event) || resolveAssignee(event)) : "");
        try {
            setStartDateStr(toYMD(isEdit && event.start ? new Date(event.start) : initial));
            setStartTimeStr(toHM(isEdit && event.start ? new Date(event.start) : initial));
            setEndDateStr(toYMD(isEdit && event.end ? new Date(event.end) : initialEndCalc));
            setEndTimeStr(toHM(isEdit && event.end ? new Date(event.end) : initialEndCalc));
        } catch (e) {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, event, initial, initialEndCalc]);

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
            // No business-hours restriction: allow creating appointments at any time of day
            setSaving(true);
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
            if (isEdit) {
                const updater = event?.kind === "appointment" ? calendarService.updateAppointment : calendarService.updateEvent;
                // Backend UpdateAppointmentDto does not accept `assignee` currently; omit it to avoid ValidationPipe errors
                const updated = await updater(event.id, {
                    title: title.trim(),
                    description: description.trim() || null,
                    start: toOffsetISO(s),
                    end: toOffsetISO(e),
                    timezone: tz,
                });
                onUpdated && onUpdated(updated);
            } else {
                // Backend CreateAppointmentDto does not accept `assignee`; omit it to satisfy validation
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
            // More explicit error reporting for debugging server 4xx/5xx responses
            console.warn(isEdit ? "Failed to update appointment" : "Failed to create appointment", err);
            const serverData = err?.response?.data;
            if (serverData) {
                console.error("Server response data:", serverData);
                const message = serverData.message || serverData.error || serverData.detail || JSON.stringify(serverData);
                addToast({
                    title: isEdit ? "Update failed" : "Create failed",
                    description: String(message),
                    variant: "error",
                });
            } else {
                addToast({
                    title: isEdit ? "Update failed" : "Create failed",
                    description: String(err?.message || err),
                    variant: "error",
                });
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/40 z-50 grid place-items-center"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="relative z-10 w-[640px] max-w-[95vw] rounded-2xl bg-white ring-1 ring-black/5 appointment-modal" style={{ ['--assignee-accent']: '#7c3aed' }}>
                <style>{`.no-calendar::-webkit-calendar-picker-indicator { display: none; -webkit-appearance: none; }
                .no-calendar::-webkit-clear-button, .no-calendar::-webkit-inner-spin-button { display: none; -webkit-appearance: none; }
                .no-calendar::-ms-clear { display: none; }
                /* Scoped accent/focus: assignee color is the source (--assignee-accent). Other inputs adopt it. */
                .appointment-modal select[name=assignee] { accent-color: var(--assignee-accent); }
                .appointment-modal input[type=time], .appointment-modal input[type=date], .appointment-modal input[type=text], .appointment-modal input, .appointment-modal select { accent-color: var(--assignee-accent); }
                .appointment-modal input:focus:not(.left-focus), .appointment-modal select:focus:not(.left-focus), .appointment-modal textarea:focus:not(.left-focus) {
                    box-shadow: none !important;
                    outline: none !important;
                }
                /* left-focus keeps a subtle green ring for left-column inputs */
                .appointment-modal .left-focus:focus, .appointment-modal .left-focus:focus-visible {
                    box-shadow: 0 0 0 4px rgba(16,185,129,0.12) !important;
                    outline: 2px solid rgba(16,185,129,0.08) !important;
                }

                /* Right-column appointment controls: visible grey border and purple outline on focus with no shadow */
                .appointment-modal .appointment-time-control,
                .appointment-modal select[name=assignee],
                .appointment-modal input[name=start_date],
                .appointment-modal input[name=end_date] {
                    border-color: #cbd5e1 !important; /* slate-300 */
                    background-color: #ffffff !important;
                }

                .appointment-modal .appointment-time-control:focus,
                .appointment-modal select[name=assignee]:focus,
                .appointment-modal input[name=start_date]:focus,
                .appointment-modal input[name=end_date]:focus,
                .appointment-modal .appointment-time-control:focus-visible,
                .appointment-modal select[name=assignee]:focus-visible,
                .appointment-modal input[name=start_date]:focus-visible,
                .appointment-modal input[name=end_date]:focus-visible {
                    box-shadow: none !important;
                    outline: 2px solid var(--assignee-accent) !important;
                    outline-offset: 0px !important;
                    border-color: var(--assignee-accent) !important;
                }

                .appointment-modal .appointment-time-control { cursor: pointer; }
                `}</style>
                <div className="relative px-5 py-2 border-b border-slate-200">
                    <h3 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-semibold text-slate-900">
                        {isEdit ? "Edit Appointment" : "Create Appointment"}
                    </h3>
                    <div className="flex items-center justify-end">
                        <button
                            type="button"
                            className="p-2 rounded-full text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                            aria-label="Close"
                            onClick={onClose}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <form className="px-4 pb-4 pt-2 space-y-2" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <div>
                        <label className="text-sm font-medium text-slate-700" htmlFor="appointment-title">Title</label>
                        <input
                            id="appointment-title"
                            required
                            className="left-focus w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 mt-0.5"
                            placeholder="Appointment title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Order elements left-right to align rows: left1, right1, left2, right2, ... */}

                        {/* Row 1 */}
                        <div>
                            <label className="text-sm font-medium text-slate-700">Description</label>
                            <input
                                name="description"
                                className="left-focus w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 mt-0"
                                placeholder="Brief description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700">Start time</label>
                            <TimePicker
                                value={startTimeStr}
                                onChange={(v) => setStartTimeStr(v)}
                                use24Hour={use24Hour}
                                outerClassName="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none mt-0.5"
                                innerClassName="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                label="Start time"
                            />
                        </div>

                        {/* Row 2 */}
                        <div>
                            <label className="text-sm font-medium text-slate-700">Start date</label>
                            <div className="relative mt-0">
                                <input
                                    ref={startRef}
                                    name="start_date"
                                    type="date"
                                    className="left-focus w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar"
                                    value={startDateStr}
                                    onChange={(e) => setStartDateStr(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                                    aria-label="Open date picker"
                                    onClick={() => { try { startRef.current?.showPicker?.(); startRef.current?.focus?.(); } catch {} }}
                                >
                                    📅
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700">End time</label>
                            <TimePicker
                                value={endTimeStr}
                                onChange={(v) => setEndTimeStr(v)}
                                use24Hour={use24Hour}
                                outerClassName="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none mt-0.5"
                                innerClassName="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                label="End time"
                            />
                        </div>

                        {/* Row 3 */}
                        <div>
                            <label className="text-sm font-medium text-slate-700">End date</label>
                            <div className="relative mt-0">
                                <input
                                    ref={endRef}
                                    name="end_date"
                                    type="date"
                                    className="left-focus w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar"
                                    value={endDateStr}
                                    onChange={(e) => setEndDateStr(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                                    aria-label="Open date picker"
                                    onClick={() => { try { endRef.current?.showPicker?.(); endRef.current?.focus?.(); } catch {} }}
                                >
                                    📅
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700">Assignee</label>
                            <div className="relative mt-0">
                                <select
                                    name="assignee"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10"
                                    value={assignee}
                                    onChange={(e) => setAssignee(e.target.value)}
                                >
                                    <option value="">— Unassigned —</option>
                                    {Array.isArray(users) && users.map((u) => (
                                        <option key={u.id || u.userId || u.email} value={u.id || u.userId || u.email}>
                                            {u.name || u.fullName || u.email || String(u.id || u.userId)}
                                        </option>
                                    ))}
                                </select>
                                <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"><path fill="currentColor" d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"></path></svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 w-full">
                        <button
                            type="submit"
                            className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-4 py-2 text-sm"
                        >
                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                <path d="M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM224 416c-35.346 0-64-28.654-64-64 0-35.346 28.654-64 64-64s64 28.654 64 64c0 35.346-28.654 64-64 64zm96-304.52V212c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h228.52c3.183 0 6.235 1.264 8.485 3.515l3.48 3.48A11.996 11.996 0 0 1 320 111.48z"></path>
                            </svg>
                            Save
                        </button>
                        <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={onClose}>Cancel</button>
                        <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" disabled>Help</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AppointmentModal;
