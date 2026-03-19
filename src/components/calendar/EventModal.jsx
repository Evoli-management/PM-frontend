import React, { useEffect, useMemo, useState } from "react";
import calendarService from "../../services/calendarService";
import { useToast } from "../shared/ToastProvider.jsx";
import { useCalendarPreferences } from "../../hooks/useCalendarPreferences";
import TimePicker from "../ui/TimePicker.jsx";
import { formatKeyAreaLabel } from "../../utils/keyAreaDisplay";
import { useTranslation } from "react-i18next";
// Load keyAreaService on demand so it can be code-split
let _keyAreaService = null;
const getKeyAreaService = async () => {
    if (_keyAreaService) return _keyAreaService;
    const mod = await import("../../services/keyAreaService");
    _keyAreaService = mod?.default || mod;
    return _keyAreaService;
};
// Business hours checks removed — full-day calendar now supported

const EventModal = ({ event, onClose, categories, timezone, onEventUpdated, onEventDeleted }) => {
    const { t } = useTranslation();
    if (!event) return null;
    const { addToast } = useToast();
    const { formatTime, formatDate, use24Hour } = useCalendarPreferences();
    const startStr = event.start ? `${formatDate(new Date(event.start))} ${formatTime(`${String(new Date(event.start).getHours()).padStart(2,'0')}:${String(new Date(event.start).getMinutes()).padStart(2,'0')}`)}` : "";
    const endStr = event.end ? `${formatDate(new Date(event.end))} ${formatTime(`${String(new Date(event.end).getHours()).padStart(2,'0')}:${String(new Date(event.end).getMinutes()).padStart(2,'0')}`)}` : "";

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
    const [saving, setSaving] = useState(false);

    // ── Recurrence helpers ────────────────────────────────────────────────────
    const parseRecurringPattern = (pattern) => {
        const startDt = startDT || new Date();
        const out = { type: "none", days: [], day: startDt.getDate(), month: startDt.getMonth() + 1, endType: "none", until: null, count: 1 };
        if (!pattern || typeof pattern !== "string") return out;
        try {
            const parts = pattern.split("|").map(p => p.trim()).filter(Boolean);
            const main = parts[0] || "";
            if (main.startsWith("daily")) { out.type = "daily"; }
            else if (main.startsWith("weekly")) { out.type = "weekly"; const m = main.split(":"); if (m[1]) out.days = m[1].split(",").map(d => d.trim()).filter(Boolean); }
            else if (main.startsWith("monthly")) { out.type = "monthly"; const m = main.split(":"); if (m[1]) out.day = Number(m[1]) || out.day; }
            else if (main.startsWith("yearly")) { out.type = "yearly"; const m = main.split(":"); if (m[1]) out.month = Number(m[1]) || out.month; if (m[2]) out.day = Number(m[2]) || out.day; }
            for (let i = 1; i < parts.length; i++) {
                const p = parts[i];
                if (p.startsWith("until:")) { out.endType = "until"; out.until = p.slice(6); }
                else if (p.startsWith("count:")) { out.endType = "count"; out.count = Number(p.slice(6)) || out.count; }
            }
        } catch (_) {}
        return out;
    };
    const buildRecurringPattern = ({ type, weeklyDays, monthlyDay, yearlyMonth, yearlyDay, endType, untilDate, count }) => {
        if (!type || type === "none") return null;
        const parts = [];
        if (type === "daily") parts.push("daily");
        else if (type === "weekly") parts.push(`weekly:${(Array.isArray(weeklyDays) ? weeklyDays.join(",") : "").trim()}`);
        else if (type === "monthly") parts.push(`monthly:${monthlyDay || 1}`);
        else if (type === "yearly") parts.push(`yearly:${yearlyMonth || 1}:${yearlyDay || 1}`);
        if (endType === "until" && untilDate) parts.push(`until:${untilDate}`);
        else if (endType === "count" && Number(count) > 0) parts.push(`count:${Number(count)}`);
        return parts.join("|");
    };

    const existingPattern = event?.recurrence || event?.recurringPattern || "";
    const parsedPattern = useMemo(() => parseRecurringPattern(existingPattern), [existingPattern]);
    const [recurrenceType, setRecurrenceType] = useState(parsedPattern.type);
    const [recurrenceWeeklyDays, setRecurrenceWeeklyDays] = useState(parsedPattern.days);
    const [recurrenceMonthlyDay, setRecurrenceMonthlyDay] = useState(parsedPattern.day);
    const [recurrenceYearlyMonth, setRecurrenceYearlyMonth] = useState(parsedPattern.month);
    const [recurrenceYearlyDay, setRecurrenceYearlyDay] = useState(parsedPattern.day);
    const [recurrenceEndType, setRecurrenceEndType] = useState(parsedPattern.endType);
    const [recurrenceEndDate, setRecurrenceEndDate] = useState(parsedPattern.until || "");
    const [recurrenceCount, setRecurrenceCount] = useState(parsedPattern.count || 1);
    const [recurrenceTouched, setRecurrenceTouched] = useState(false);

    const markRecurrenceTouched = (fn) => (...args) => { setRecurrenceTouched(true); fn(...args); };
    const toggleWeeklyDay = (day) => {
        setRecurrenceTouched(true);
        setRecurrenceWeeklyDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    };
    const weekDays = ["mon","tue","wed","thu","fri","sat","sun"];

    // Load options
    const [keyAreas, setKeyAreas] = useState([]);
    const [goals, setGoals] = useState([]);
    useEffect(() => {
        (async () => {
            try {
                const kaSvc = await getKeyAreaService();
                const [kas, gs] = await Promise.all([
                    kaSvc.list({ includeTaskCount: false }).catch(() => []),
                    // Dynamically import goalService so it can be code-split away
                    // from the initial bundle. Some consumers already use
                    // dynamic import; doing it here avoids keeping goals in main.
                    import("../../services/goalService").then((m) => m.getGoals({ status: 'active' })).catch(() => []),
                ]);
                setKeyAreas(Array.isArray(kas) ? kas : []);
                setGoals(Array.isArray(gs) ? gs : []);
            } catch {}
        })();
    }, []);

    const kinds = useMemo(
        () => [
            { value: "meeting", label: t("eventModal.meeting") },
            { value: "focus", label: t("eventModal.focus") },
            { value: "custom", label: t("eventModal.custom") },
            { value: "green", label: t("eventModal.green") },
            { value: "red", label: t("eventModal.red") },
        ],
        [t],
    );

    const combineLocal = (ymd, hm) => {
        if (!ymd || !hm) return null;
        const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
        const [hh, mm] = hm.split(":").map((n) => parseInt(n, 10));
        const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
        return dt;
    };

    const handleStartDateChange = (nextStartDate) => {
        setStartDate(nextStartDate);
        setEndDate((prevEndDate) => {
            if (!nextStartDate || !prevEndDate) return prevEndDate;
            return nextStartDate > prevEndDate ? nextStartDate : prevEndDate;
        });
    };

    const handleEndDateChange = (nextEndDate) => {
        setEndDate(nextEndDate);
        setStartDate((prevStartDate) => {
            if (!nextEndDate || !prevStartDate) return prevStartDate;
            return nextEndDate < prevStartDate ? nextEndDate : prevStartDate;
        });
    };

    const onConfirm = async () => {
        try {
            if (!title.trim()) {
                addToast({ title: t("eventModal.titleRequired"), variant: "error" });
                return;
            }
            const s = combineLocal(startDate, startTime);
            const e = combineLocal(endDate, endTime);
            if (!s || !e) {
                addToast({ title: t("eventModal.startEndRequired"), variant: "error" });
                return;
            }
            if (s > e) {
                addToast({ title: t("eventModal.startBeforeEnd"), variant: "error" });
                return;
            }
            setSaving(true);
            // No business-hours restriction: allow events at any time
            const payload = {
                title: title.trim(),
                description: notes || null,
                start: s.toISOString(),
                end: e.toISOString(),
                kind,
            };
            if (keyAreaId) payload.keyAreaId = keyAreaId;
            if (recurrenceTouched) {
                payload.recurringPattern = buildRecurringPattern({
                    type: recurrenceType,
                    weeklyDays: recurrenceWeeklyDays,
                    monthlyDay: recurrenceMonthlyDay,
                    yearlyMonth: recurrenceYearlyMonth,
                    yearlyDay: recurrenceYearlyDay,
                    endType: recurrenceEndType,
                    untilDate: recurrenceEndDate,
                    count: recurrenceCount,
                });
            }
            const updated = await calendarService.updateEvent(event.id, payload);
            onEventUpdated && onEventUpdated(updated);
            setIsEditing(false);
            addToast({ title: t("eventModal.eventUpdated"), variant: "success" });
        } catch (e) {
            console.warn("Failed to save event", e);
            addToast({ title: t("eventModal.failedSave"), description: String(e?.message || e), variant: "error" });
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
            // No business-hours restriction when shifting events
            const updated = await calendarService.updateEvent(event.id, {
                start: newStart.toISOString(),
                end: newEnd ? newEnd.toISOString() : null,
            });
            onEventUpdated && onEventUpdated(updated);
            addToast({ title: t("eventModal.eventMoved"), variant: "success" });
        } catch (e) {
            console.warn("Failed to update event", e);
            addToast({ title: t("eventModal.failedMoveEvent"), description: String(e?.message || e), variant: "error" });
        }
    };

    const resize = async (deltaMinutes) => {
        try {
            const end = event.end ? new Date(event.end) : null;
            if (!end) return;
            // Snap to 30-minute increments
            const snappedDelta = Math.round(deltaMinutes / 30) * 30;
            const newEnd = new Date(end.getTime() + snappedDelta * 60 * 1000);
            // No business-hours restriction when resizing events
            const updated = await calendarService.updateEvent(event.id, {
                end: newEnd.toISOString(),
            });
            onEventUpdated && onEventUpdated(updated);
            addToast({ title: t("eventModal.eventResized"), variant: "success" });
        } catch (e) {
            console.warn("Failed to resize event", e);
            addToast({ title: t("eventModal.failedResize"), description: String(e?.message || e), variant: "error" });
        }
    };
    const remove = async () => {
        try {
            if (!window.confirm(t("eventModal.confirmDelete"))) return;
            await calendarService.deleteEvent(event.id);
            onEventDeleted && onEventDeleted(event.id);
            onClose && onClose();
            addToast({ title: t("eventModal.eventDeleted"), variant: "success" });
        } catch (e) {
            console.warn("Failed to delete event", e);
            addToast({ title: t("eventModal.failedDelete"), description: String(e?.message || e), variant: "error" });
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
                        <div className="mb-2 text-xs text-gray-400">{t("eventModal.timezone")} {timezone}</div>
                        <div className="mb-4 text-gray-600">{event.description || ""}</div>
                        <div className="flex flex-wrap gap-2">
                            {event.taskId && (
                                <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs">{t("eventModal.viewTask")}</button>
                            )}
                            <button
                                className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs"
                                onClick={() => setIsEditing(true)}
                            >
                                {t("eventModal.edit")}
                            </button>
                            <button className="bg-red-500 text-white px-3 py-1 rounded text-xs" onClick={remove}>
                                {t("eventModal.delete")}
                            </button>
                            <div className="w-full h-px bg-gray-100 my-1"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-gray-500">{t("eventModal.moveLabel")}</span>
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
                                    <span className="text-[11px] text-gray-500">{t("eventModal.resizeLabel")}</span>
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
                        <h2 className="text-xl font-bold mb-3">{t("eventModal.editHeading")}</h2>
                        {/* Title */}
                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t("eventModal.titleField")}</label>
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
                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("eventModal.startDateField")}</label>
                                <input
                                    type="date"
                                    className="w-full border rounded px-2 py-1"
                                    value={startDate}
                                    onChange={(e) => handleStartDateChange(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("eventModal.startTimeField")}</label>
                                <TimePicker value={startTime} onChange={(v)=>setStartTime(v)} use24Hour={use24Hour} className="w-full" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("eventModal.keyAreaField")}</label>
                                <select
                                    className="w-full border rounded px-2 py-1"
                                    value={keyAreaId}
                                    onChange={(e) => setKeyAreaId(e.target.value)}
                                >
                                    <option value="">{t("eventModal.noneOption")}</option>
                                    {keyAreas.map((ka, idx) => (
                                        <option key={ka.id} value={ka.id}>
                                            {formatKeyAreaLabel(ka, idx)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* End/Goal Row */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("eventModal.endDateField")}</label>
                                <input
                                    type="date"
                                    className="w-full border rounded px-2 py-1"
                                    value={endDate}
                                    onChange={(e) => handleEndDateChange(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("eventModal.endTimeField")}</label>
                                <TimePicker value={endTime} onChange={(v)=>setEndTime(v)} use24Hour={use24Hour} className="w-full" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">{t("eventModal.goalField")}</label>
                                <select
                                    className="w-full border rounded px-2 py-1"
                                    value={goalId}
                                    onChange={(e) => setGoalId(e.target.value)}
                                >
                                    <option value="">{t("eventModal.noneOption")}</option>
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
                            <label className="block text-xs font-semibold text-slate-600 mb-1">{t("eventModal.priorityField")}</label>
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
                            <label className="block text-xs font-semibold text-slate-600 mb-1">{t("eventModal.notesField")}</label>
                            <textarea
                                className="w-full border rounded px-2 py-1"
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notes"
                            />
                        </div>

                        {/* Recurrence */}
                        <div className="mb-3">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">{t("eventModal.makeRecurring")}</label>
                            <select
                                className="w-full border rounded px-2 py-1 mb-2"
                                value={recurrenceType}
                                onChange={(e) => { setRecurrenceTouched(true); setRecurrenceType(e.target.value); }}
                            >
                                <option value="none">{t("appointmentModal.recurrenceNone", "Does not repeat")}</option>
                                <option value="daily">{t("appointmentModal.recurrenceDaily", "Daily")}</option>
                                <option value="weekly">{t("appointmentModal.recurrenceWeekly", "Weekly")}</option>
                                <option value="monthly">{t("appointmentModal.recurrenceMonthly", "Monthly")}</option>
                                <option value="yearly">{t("appointmentModal.recurrenceYearly", "Yearly")}</option>
                            </select>
                            {recurrenceType === "weekly" && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {weekDays.map(d => (
                                        <button key={d} type="button"
                                            className={`px-2 py-0.5 rounded text-xs border ${recurrenceWeeklyDays.includes(d) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-300"}`}
                                            onClick={() => toggleWeeklyDay(d)}
                                        >{d.charAt(0).toUpperCase() + d.slice(1)}</button>
                                    ))}
                                </div>
                            )}
                            {recurrenceType === "monthly" && (
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs text-slate-600">{t("appointmentModal.recurrenceDayLabel", "Day")}</span>
                                    <input type="number" min={1} max={31} className="border rounded px-2 py-0.5 w-16 text-xs"
                                        value={recurrenceMonthlyDay}
                                        onChange={markRecurrenceTouched(e => setRecurrenceMonthlyDay(Number(e.target.value)))} />
                                </div>
                            )}
                            {recurrenceType === "yearly" && (
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs text-slate-600">{t("appointmentModal.recurrenceMonthLabel", "Month")}</span>
                                    <select className="border rounded px-2 py-0.5 text-xs"
                                        value={recurrenceYearlyMonth}
                                        onChange={markRecurrenceTouched(e => setRecurrenceYearlyMonth(Number(e.target.value)))}>
                                        {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                    </select>
                                    <span className="text-xs text-slate-600">{t("appointmentModal.recurrenceDayLabel", "Day")}</span>
                                    <input type="number" min={1} max={31} className="border rounded px-2 py-0.5 w-16 text-xs"
                                        value={recurrenceYearlyDay}
                                        onChange={markRecurrenceTouched(e => setRecurrenceYearlyDay(Number(e.target.value)))} />
                                </div>
                            )}
                            {recurrenceType !== "none" && (
                                <div className="mt-1">
                                    <div className="flex gap-3 mb-1">
                                        {["none","until","count"].map(opt => (
                                            <label key={opt} className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                                                <input type="radio" name="recEndType" value={opt}
                                                    checked={recurrenceEndType === opt}
                                                    onChange={() => { setRecurrenceTouched(true); setRecurrenceEndType(opt); }} />
                                                {opt === "none" ? t("appointmentModal.recurrenceEndNone","No end") : opt === "until" ? t("appointmentModal.recurrenceEndBy","End by") : t("appointmentModal.recurrenceEndAfter","End after")}
                                            </label>
                                        ))}
                                    </div>
                                    {recurrenceEndType === "until" && (
                                        <input type="date" className="border rounded px-2 py-0.5 text-xs"
                                            value={recurrenceEndDate}
                                            onChange={markRecurrenceTouched(e => setRecurrenceEndDate(e.target.value))} />
                                    )}
                                    {recurrenceEndType === "count" && (
                                        <div className="flex items-center gap-1">
                                            <input type="number" min={1} className="border rounded px-2 py-0.5 w-16 text-xs"
                                                value={recurrenceCount}
                                                onChange={markRecurrenceTouched(e => setRecurrenceCount(Number(e.target.value)))} />
                                            <span className="text-xs text-slate-500">{t("appointmentModal.recurrenceOccurrences","occurrences")}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-800"
                                onClick={() => setIsEditing(false)}
                                disabled={saving}
                            >
                                {t("eventModal.cancel")}
                            </button>
                            <button
                                className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50"
                                onClick={onConfirm}
                                disabled={saving}
                            >
                                {saving ? t("eventModal.saving") : t("eventModal.confirm")}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default EventModal;
