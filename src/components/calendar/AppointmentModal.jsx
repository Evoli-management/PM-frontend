import React, { useMemo, useState, useEffect, useRef } from "react";
import calendarService from "../../services/calendarService";
import { useToast } from "../shared/ToastProvider.jsx";
import { FaTrash } from "react-icons/fa";
import TimePicker from "../ui/TimePicker.jsx";
import useCalendarPreferences from "../../hooks/useCalendarPreferences";

/* ----------------------------- Helper functions ---------------------------- */

const toYMD = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;

const toHM = (d) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes()
    ).padStart(2, "0")}`;

const combineDateTime = (ymd, hm) => {
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

const weekdayOptions = [
    { key: "mon", label: "Mon" },
    { key: "tue", label: "Tue" },
    { key: "wed", label: "Wed" },
    { key: "thu", label: "Thu" },
    { key: "fri", label: "Fri" },
    { key: "sat", label: "Sat" },
    { key: "sun", label: "Sun" },
];

const getOptionValueFromUser = (u) =>
    String(u?.id ?? u?.userId ?? u?.email ?? "");

/**
 * Resolve an assignee string from different possible event shapes.
 */
const resolveAssignee = (ev) => {
    if (!ev) return "";

    const stringFields = [
        "assignee",
        "responsible",
        "owner",
        "assigned_to",
        "assignee_name",
    ];
    for (const f of stringFields) {
        if (typeof ev[f] === "string" && ev[f].trim() !== "") {
            return ev[f];
        }
    }

    const numericFields = ["assignee", "responsible"];
    for (const f of numericFields) {
        if (typeof ev[f] === "number") return String(ev[f]);
    }

    const nested = ev.assignee || ev.responsible || ev.owner || ev.assigned_to;
    if (nested && typeof nested === "object") {
        return (
            String(
                nested.id ||
                    nested.userId ||
                    nested.email ||
                    nested.uuid ||
                    nested.uid ||
                    ""
            ) || ""
        );
    }

    const idFields = ["assigneeId", "assignee_id", "assignedTo"];
    for (const f of idFields) {
        if (ev[f]) return String(ev[f]);
    }

    return "";
};

/**
 * Match event assignee against a users list to get a select value.
 */
const matchAssigneeAgainstUsers = (ev, users) => {
    try {
        if (!Array.isArray(users) || users.length === 0 || !ev) return null;

        const raw =
            ev.assignee ??
            ev.responsible ??
            ev.owner ??
            ev.assigned_to ??
            ev.assignee_name ??
            ev.assigneeId ??
            ev.assignee_id ??
            ev.assignedTo ??
            null;

        if (raw && typeof raw === "object") {
            const id = raw.id ?? raw.userId ?? raw.email ?? raw.uuid ?? raw.uid;
            if (id) {
                const found = users.find(
                    (u) =>
                        String(u.id) === String(id) ||
                        String(u.userId) === String(id) ||
                        String(u.email) === String(id)
                );
                if (found) return getOptionValueFromUser(found);
            }
        }

        if (raw) {
            const s = String(raw).trim();
            const found = users.find(
                (u) =>
                    String(u.id) === s ||
                    String(u.userId) === s ||
                    String(u.email) === s ||
                    (u.email &&
                        String(u.email).toLowerCase() === s.toLowerCase())
            );
            if (found) return getOptionValueFromUser(found);
        }

        const name =
            ev.assignee_name ||
            ev.assigneeName ||
            ev.responsibleName ||
            ev.responsible_name ||
            ev.name ||
            ev.ownerName ||
            null;

        if (name) {
            const found = users.find(
                (u) =>
                    ((u.name || u.fullName || u.full_name || "") + "").toLowerCase() ===
                    String(name).toLowerCase()
            );
            if (found) return getOptionValueFromUser(found);
        }

        return null;
    } catch {
        return null;
    }
};

/**
 * Parse a recurring pattern string into a structured object.
 * Expected simple formats handled here (backwards-compatible):
 * - "daily" | "weekly:mon,tue" | "monthly:day:15" | "yearly:month:12:day:25"
 * Additional suffixes: "|until:YYYY-MM-DD" or "|count:N"
 */
const parseRecurringPattern = (pattern, startDate = new Date(), endDateStr = null) => {
    const out = {
        type: "none",
        days: [],
        day: startDate.getDate(),
        month: startDate.getMonth() + 1,
        endType: "none",
        until: endDateStr || null,
        count: 1,
    };

    if (!pattern || typeof pattern !== "string") return out;

    try {
        const parts = pattern.split("|").map((p) => p.trim()).filter(Boolean);
        // first part contains the main type and possibly parameters
        const main = parts[0] || "";
        if (main.startsWith("daily")) {
            out.type = "daily";
        } else if (main.startsWith("weekly")) {
            out.type = "weekly";
            const m = main.split(":");
            if (m[1]) {
                out.days = m[1].split(",").map((d) => d.trim()).filter(Boolean);
            }
        } else if (main.startsWith("monthly")) {
            out.type = "monthly";
            const m = main.split(":");
            if (m[1]) out.day = Number(m[1]) || out.day;
        } else if (main.startsWith("yearly")) {
            out.type = "yearly";
            const m = main.split(":");
            if (m[1]) out.month = Number(m[1]) || out.month;
            if (m[2]) out.day = Number(m[2]) || out.day;
        }

        // parse suffixes like until or count
        for (let i = 1; i < parts.length; i++) {
            const p = parts[i];
            if (p.startsWith("until:")) {
                out.endType = "until";
                out.until = p.slice("until:".length);
            } else if (p.startsWith("count:")) {
                out.endType = "count";
                out.count = Number(p.slice("count:".length)) || out.count;
            }
        }
    } catch (__) {
        // ignore and return defaults
    }

    return out;
};

/**
 * Build a recurring pattern string from UI state.
 */
const buildRecurringPattern = ({
    type,
    weeklyDays,
    monthlyDay,
    yearlyMonth,
    yearlyDay,
    endType,
    untilDate,
    count,
}) => {
    if (!type || type === "none") return null;

    let parts = [];
    if (type === "daily") parts.push("daily");
    else if (type === "weekly") parts.push(`weekly:${(Array.isArray(weeklyDays) ? weeklyDays.join(",") : "").trim()}`);
    else if (type === "monthly") parts.push(`monthly:${monthlyDay || 1}`);
    else if (type === "yearly") parts.push(`yearly:${yearlyMonth || 1}:${yearlyDay || 1}`);

    if (endType === "until" && untilDate) {
        parts.push(`until:${untilDate}`);
    } else if (endType === "count" && Number(count) > 0) {
        parts.push(`count:${Number(count)}`);
    }

    return parts.join("|");
};

    const AppointmentModal = ({
        startDate,
        event = null,
        defaultDurationMinutes = 60,
        allDayDefault = false,
        onClose,
        onCreated,
    onUpdated,
        users = [],
        goals = [],
        keyAreas = [],
        // when true, render a Delete button (used by MonthView to surface delete)
        showDelete = false,
        // callback to invoke when Delete is clicked
        onDelete = null,
        // callback invoked after modal performs a delete (deleted id)
        onDeleted = null,
    }) => {

    // Derived flags and initial date values
    const isEdit = Boolean(event && (event.id || event.start || event.startAt || event.start_at));

    // Determine if this event is part of a recurring series. We check several
    // shapes because different API responses may include recurrence info under
    // different keys (recurringPattern, recurrence, seriesId) or the UI may
    // represent generated occurrences as "<base>_<iso>" or exception ids
    // prefixed with "ex_". Treat any of these as recurring.
    const isRecurring = Boolean(
        event && (
            event.recurringPattern ||
            event.recurrence ||
            event.seriesId ||
            event.occurrenceStart ||
            (typeof event.id === 'string' && (event.id.includes('_') || event.id.startsWith('ex_')))
        )
    );

    // If a startDate prop is provided (e.g. when creating from a calendar slot), prefer it.
    // Otherwise, when editing prefer the event's start fields. Fall back to `now`.
    const initialStart = (() => {
        try {
            if (isEdit && (event?.start || event?.startAt || event?.start_at)) {
                return new Date(event.start || event.startAt || event.start_at);
            }
            if (startDate) return new Date(startDate);
            return new Date();
        } catch (__) {
            return new Date();
        }
    })();

    const initialEnd = (() => {
        try {
            if (isEdit && (event?.end || event?.endAt || event?.end_at)) {
                return new Date(event.end || event.endAt || event.end_at);
            }
            // default duration (minutes) after start
            const dur = Number(defaultDurationMinutes) || 60;
            return new Date(initialStart.getTime() + dur * 60 * 1000);
        } catch (__) {
            return new Date(initialStart.getTime() + (Number(defaultDurationMinutes) || 60) * 60 * 1000);
        }
    })();

    // Hooks used inside the component
    const { addToast } = useToast() || { addToast: () => {} };
    const { use24Hour } = useCalendarPreferences() || { use24Hour: false };

    /* ------------------------------ Base fields ------------------------------ */

    const [title, setTitle] = useState(isEdit ? event.title || "" : "");
    const [description, setDescription] = useState(
        isEdit ? event.description || "" : ""
    );

    const initialAssignee = isEdit
        ? matchAssigneeAgainstUsers(event, users) || resolveAssignee(event)
        : "";

    const [assignee, setAssignee] = useState(initialAssignee);
    const initialGoal = isEdit
        ? (event?.goal || event?.goalId || event?.goal_id || "")
        : "";
    const [goalId, setGoalId] = useState(initialGoal);
    const initialKeyArea = isEdit
        ? (event?.keyArea || event?.keyAreaId || event?.key_area_id || "")
        : "";
    const [keyAreaId, setKeyAreaId] = useState(initialKeyArea);

    const [startDateStr, setStartDateStr] = useState(toYMD(initialStart));
    const [startTimeStr, setStartTimeStr] = useState(() => (!isEdit && allDayDefault) ? "00:00" : toHM(initialStart));
    const [endDateStr, setEndDateStr] = useState(toYMD(initialEnd));
    const [endTimeStr, setEndTimeStr] = useState(() => (!isEdit && allDayDefault) ? "23:59" : toHM(initialEnd));
    const [saving, setSaving] = useState(false);
    const [clientConflict, setClientConflict] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteScopeChoice, setDeleteScopeChoice] = useState('occurrence');
    const [deleting, setDeleting] = useState(false);

    /* ------------------------- Recurrence state/UI -------------------------- */

    const [showRecurrence, setShowRecurrence] = useState(false);

    const existingPattern =
        event?.recurringPattern || event?.recurrence || "";
    // Consider this a recurring instance if we're editing and either the
    // appointment row has a recurringPattern OR the event has a seriesId OR
    // the generated occurrence id format (baseId_iso) is used by the UI.
    const generatedOccurrenceId = isEdit && typeof event?.id === 'string' && event.id.includes('_');
    const isRecurringInstance = Boolean(
        isEdit && (existingPattern || event?.seriesId || generatedOccurrenceId)
    );

    const parsed = parseRecurringPattern(
        existingPattern,
        initialStart,
        endDateStr
    );

    const [recurrenceType, setRecurrenceType] = useState(parsed.type || "none");
    const [recurrenceWeeklyDays, setRecurrenceWeeklyDays] = useState(
        parsed.days || []
    );
    const [recurrenceMonthlyDay, setRecurrenceMonthlyDay] = useState(
        parsed.day || initialStart.getDate()
    );
    const [recurrenceYearlyMonth, setRecurrenceYearlyMonth] = useState(
        parsed.month || initialStart.getMonth() + 1
    );
    const [recurrenceYearlyDay, setRecurrenceYearlyDay] = useState(
        parsed.day || initialStart.getDate()
    );
    const [recurrenceEndType, setRecurrenceEndType] = useState(
        parsed.endType || "none"
    );
    const [recurrenceUntilDate, setRecurrenceUntilDate] = useState(
        parsed.until || endDateStr
    );
    const [recurrenceCount, setRecurrenceCount] = useState(parsed.count || 1);
    // Track whether the user interacted with recurrence controls. If false when
    // saving an edit of an existing recurring event, we won't send the
    // recurringPattern field which prevents accidentally clearing recurrence
    // when the user only edits time/title/etc.
    const [recurrenceTouched, setRecurrenceTouched] = useState(false);

    /**
     * Edit scope for recurring series:
     *  - "occurrence": this occurrence only
     *  - "future":     this and all future occurrences
     *  - "series":     entire series
     */
    const [editScope, setEditScope] = useState("occurrence");

    /* ------------------------------ Refs & FX ------------------------------- */

    const startRef = useRef(null);
    const endRef = useRef(null);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [onClose]);

    useEffect(() => {
        setTitle(isEdit ? event?.title || "" : "");
        setDescription(isEdit ? event?.description || "" : "");
        // Resolve assignee from multiple possible event shapes. We prefer a
        // matched user from the provided `users` list, then fall back to a
        // plain string or object id present on the event (common API shapes
        // include `assignee`, `assignee_id`, `assigneeId`, `responsible`,
        // `owner`, or nested objects).
        const resolvedAssignee = (function () {
            if (!isEdit || !event) return "";
            // Prefer a matched user from the provided users list
            const found = matchAssigneeAgainstUsers(event, users);
            if (found) return found;

            // Next, try the generic resolver which covers nested objects and common fields
            const raw = resolveAssignee(event);
            if (raw) return raw;

            // Try common property names directly and normalize to string
            const direct = event?.assignee ?? event?.assignee_id ?? event?.assigneeId ?? event?.responsible ?? event?.owner ?? event?.assigned_to ?? null;
            if (direct) {
                    if (typeof direct === "object") {
                    const idVal = String(direct.id ?? direct.userId ?? direct.email ?? direct.uuid ?? direct.uid ?? "");
                    if (idVal) return idVal;
                } else {
                    return String(direct);
                }
            }

            // Finally: if the event appears assigned to the current authenticated user
            // who is present in the `users` list (usersService currently returns /users/me),
            // detect that and prefill the assignee with that user's option value.
            try {
                if (Array.isArray(users) && users.length > 0) {
                    const candidateProps = [
                        event?.assignee,
                        event?.assignee_id,
                        event?.assigneeId,
                        event?.responsible,
                        event?.owner,
                        event?.assigned_to,
                        event?.assignee_name,
                        event?.assignedTo,
                    ].filter((v) => v !== undefined && v !== null).map(String);

                    for (const u of users) {
                        const uid = String(u.id ?? u.userId ?? u.email ?? u.uuid ?? u.sub ?? "");
                        const uemail = String((u.email || "")).toLowerCase();
                        if (candidateProps.includes(uid) || candidateProps.map(String).includes(uemail) || candidateProps.includes(String(u.email))) {
                            return getOptionValueFromUser(u);
                        }
                    }
                }
            } catch (__) {}

            return "";
        })();

        setAssignee(resolvedAssignee);

    const start = isEdit && (event?.start || event?.startAt || event?.start_at) ? new Date(event.start || event.startAt || event.start_at) : initialStart;
    const end = isEdit && (event?.end || event?.endAt || event?.end_at) ? new Date(event.end || event.endAt || event.end_at) : initialEnd;

        setStartDateStr(toYMD(start));
        setStartTimeStr(toHM(start));
        setEndDateStr(toYMD(end));
        setEndTimeStr(toHM(end));

        const p = parseRecurringPattern(
            event?.recurringPattern || event?.recurrence || "",
            start,
            toYMD(end)
        );

        setRecurrenceType(p.type || "none");
        setRecurrenceWeeklyDays(p.days || []);
        setRecurrenceMonthlyDay(p.day || start.getDate());
        setRecurrenceYearlyMonth(p.month || start.getMonth() + 1);
        setRecurrenceYearlyDay(p.day || start.getDate());
        setRecurrenceEndType(p.endType || "none");
        setRecurrenceUntilDate(p.until || toYMD(end));
        setRecurrenceCount(p.count || 1);
        // Default edit scope for recurring items:
        // - If this appears to be a generated occurrence (id contains an underscore)
        //   or the event explicitly looks like an occurrence, default to "occurrence".
        // - If the event is the series master (has a seriesId and is not a generated
        //   occurrence), default to "series" so edits apply to the whole series by default.
        try {
            let defaultScope = "occurrence";
            if (isRecurringInstance) {
                const appearsToBeOccurrence = Boolean(generatedOccurrenceId || event?.occurrenceStart || event?.isOccurrence);
                if (appearsToBeOccurrence) defaultScope = "occurrence";
                else if (event?.seriesId) defaultScope = "series";
            }
            setEditScope(defaultScope);
        } catch (__) {
            setEditScope("occurrence");
        }
        // Prefill goal select using multiple possible shapes
        try {
            const g = event?.goal || event?.goalId || event?.goal_id || null;
            if (g) {
                // if goal is object, prefer its id
                setGoalId(typeof g === 'object' ? String(g.id || g.goalId || g._id || '') : String(g));
            } else {
                setGoalId("");
            }
        } catch (__) { setGoalId(""); }
        // Prefill key area select
        try {
            const ka = event?.keyArea || event?.keyAreaId || event?.key_area_id || null;
            if (ka) {
                setKeyAreaId(typeof ka === 'object' ? String(ka.id || ka.keyAreaId || ka._id || '') : String(ka));
            } else {
                setKeyAreaId("");
            }
        } catch (__) { setKeyAreaId(""); }
    // Note: avoid putting `initialStart`/`initialEnd` here because they are
    // re-created on every render (new Date instances) which would cause this
    // effect to run infinitely. Depend on the minimal stable inputs instead.
    }, [isEdit, event, users, startDate]);

    /* ---------------------------- Recurrence util --------------------------- */

    const toggleWeekday = (k) => {
        setRecurrenceWeeklyDays((prev) =>
            prev.includes(k) ? prev.filter((p) => p !== k) : [...prev, k]
        );
        setRecurrenceTouched(true);
    };

    /* ------------------------------ Save handler ---------------------------- */

    const handleSave = async () => {
        try {
            if (!title.trim()) {
                addToast({ title: "Title required", variant: "error" });
                return;
            }

            const s = combineDateTime(startDateStr, startTimeStr);
            const e = combineDateTime(endDateStr, endTimeStr);

            if (!s || !e) {
                addToast({ title: "Start & End required", variant: "error" });
                return;
            }

            if (s >= e) {
                addToast({ title: "End must be after start", variant: "error" });
                return;
            }

            if (recurrenceType && recurrenceType !== "none") {
                if (recurrenceEndType === "until") {
                    if (!recurrenceUntilDate) {
                        addToast({
                            title: "Recurrence end date required",
                            variant: "error",
                        });
                        return;
                    }
                    const untilDt = new Date(`${recurrenceUntilDate}T00:00:00`);
                    if (isNaN(untilDt.getTime()) || untilDt <= s) {
                        addToast({
                            title:
                                "Recurrence end must be after the appointment start date",
                            variant: "error",
                        });
                        return;
                    }
                }

                if (recurrenceEndType === "count") {
                    if (!recurrenceCount || Number(recurrenceCount) <= 0) {
                        addToast({
                            title: "Number of occurrences must be greater than 0",
                            variant: "error",
                        });
                        return;
                    }
                }
            }

            // Client-side pre-check for overlapping appointments to avoid
            // an immediate 400 and provide a friendlier inline message.
            try {
                const fromISO = new Date(s.getTime() - 1 * 60 * 1000).toISOString();
                const toISO = new Date(e.getTime() + 1 * 60 * 1000).toISOString();
                const existing = await calendarService.listAppointments({ from: fromISO, to: toISO });
                const conflict = (Array.isArray(existing) ? existing : []).find((row) => {
                    try {
                        const rs = new Date(row.start).getTime();
                        const re = new Date(row.end).getTime();
                        return rs < e.getTime() && re > s.getTime();
                    } catch { return false; }
                });
                if (conflict) {
                    setClientConflict(conflict);
                    addToast({ title: 'Time conflict', description: `Conflicts with "${conflict.title || 'appointment'}" ${conflict.start ? 'at ' + new Date(conflict.start).toLocaleString() : ''}`, variant: 'error' });
                    return;
                }
            } catch (__) {
                // If pre-check fails for any reason, proceed to attempt save and let server validate.
            }

            setSaving(true);

            const timezone =
                Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

            // Build recurringPattern only when creating, or when the user has
            // interacted with recurrence controls while editing. This avoids
            // clearing an existing recurrence when the user only changed time
            // or other unrelated fields.
            let recurringPattern = null;
            if (!isEdit) {
                recurringPattern = buildRecurringPattern({
                    type: recurrenceType,
                    weeklyDays: recurrenceWeeklyDays,
                    monthlyDay: recurrenceMonthlyDay,
                    yearlyMonth: recurrenceYearlyMonth,
                    yearlyDay: recurrenceYearlyDay,
                    endType: recurrenceEndType,
                    untilDate: recurrenceUntilDate,
                    count: recurrenceCount,
                });
            } else {
                // Editing an existing event: only compute/send recurringPattern if
                // the user actually touched recurrence controls. If they did not,
                // leave it undefined so the API does not modify recurrence.
                if (recurrenceTouched) {
                    recurringPattern = buildRecurringPattern({
                        type: recurrenceType,
                        weeklyDays: recurrenceWeeklyDays,
                        monthlyDay: recurrenceMonthlyDay,
                        yearlyMonth: recurrenceYearlyMonth,
                        yearlyDay: recurrenceYearlyDay,
                        endType: recurrenceEndType,
                        untilDate: recurrenceUntilDate,
                        count: recurrenceCount,
                    });
                } else {
                    recurringPattern = undefined; // signal to omit from payload
                }
            }

            if (isEdit) {
                    // Prefer the appointment update path when the event explicitly
                    // identifies as an appointment or when the id appears to be a
                    // generated occurrence id ("<base>_<ISO>"). The appointment
                    // updater knows how to split generated ids and add occurrence
                    // context (editScope/occurrenceStart) for the backend. Using
                    // the wrong updater can produce a 400 from the API.
                    const looksLikeGeneratedOccurrence = typeof event?.id === 'string' && event.id.includes('_');
                    const updater =
                        event?.kind === "appointment" || looksLikeGeneratedOccurrence
                            ? calendarService.updateAppointment
                            : calendarService.updateEvent;

                    // Build payload
                    const payload = {
                        title: title.trim(),
                        description: description.trim() || null,
                        start: toOffsetISO(s),
                        end: toOffsetISO(e),
                        timezone,
                        goalId: goalId || null,
                        keyAreaId: keyAreaId || null,
                    };

                    // Only include recurringPattern when we have an explicit value
                    // (string or null) — undefined means "don't change".
                    if (recurringPattern !== undefined) {
                        payload.recurringPattern = recurringPattern;
                    }

                    if (isRecurringInstance) {
                        // Provide the chosen edit scope and context for the server
                        payload.editScope = editScope; // "occurrence" | "future" | "series"

                        // occurrenceStart: prefer the original start provided on event;
                        // if the UI passed a generated occurrence id like "<base>_<ISO>",
                        // extract the ISO portion as the occurrenceStart.
                        const occStartFromId = generatedOccurrenceId
                            ? (() => {
                                  try {
                                      const parts = event.id.split("_");
                                      return parts.slice(1).join("_");
                                  } catch {
                                      return null;
                                  }
                              })()
                            : null;

                        payload.occurrenceStart = event?.start || occStartFromId || null;

                        // Ensure seriesId is forwarded (either from event or base id from generated id)
                        if (event?.seriesId) payload.seriesId = event.seriesId;
                        else if (generatedOccurrenceId) payload.seriesId = event.id.split("_")[0];
                    }

                    // Use base appointment id for updates: when the UI sends a generated
                    // occurrence id ("baseId_iso"), call the API with the baseId so the
                    // backend (which stores UUID ids) doesn't receive an invalid UUID.
                    let appointmentIdToUse;
                    if (isEdit && typeof event?.id === 'string' && event.id.includes('_')) {
                        // Two different underscore id formats exist:
                        // - generated occurrence: "<baseId>_<ISO>" (baseId is a UUID)
                        // - exception id returned by backend: "ex_<exceptionUuid>"
                        // For exception ids we must use the series/base appointment id
                        // (available on event.seriesId) when calling the appointments
                        // update endpoint. For generated occurrences use the prefix.
                        if (event.id.startsWith('ex_')) {
                            appointmentIdToUse = event?.seriesId || event.id.split('_')[1] || event.id;
                        } else {
                            appointmentIdToUse = event.id.split('_')[0];
                        }
                    } else {
                        appointmentIdToUse = event?.id;
                    }

                    // In development you can enable detailed logging above the network call
                    // but avoid logging large objects on the main thread in production.

                    let updated;
                    try {
                        updated = await updater(appointmentIdToUse, payload);
                    } catch (err) {
                        // Print server response body (if present) to help debugging
                        try {
                            console.error('Appointment update failed:', {
                                appointmentId: appointmentIdToUse,
                                payload,
                                serverResponse: err?.response?.data,
                                status: err?.response?.status,
                                message: err?.message,
                                stack: err?.stack,
                            });
                        } catch (__) {}
                        throw err;
                    }

                onUpdated &&
                    onUpdated({
                        ...updated,
                        recurringPattern: updated.recurringPattern ?? recurringPattern,
                    });
            } else {
                const created = await calendarService.createAppointment({
                    title: title.trim(),
                    description: description.trim() || null,
                    start: toOffsetISO(s),
                    end: toOffsetISO(e),
                    timezone,
                    recurringPattern: recurringPattern || null,
                    goalId: goalId || null,
                    keyAreaId: keyAreaId || null,
                });

                onCreated &&
                    onCreated({
                        ...created,
                        recurringPattern: created.recurringPattern ?? recurringPattern,
                    });
                // Clear any prior client-side conflict after successful create
                setClientConflict(null);
            }
        } catch (err) {
            console.warn(
                isEdit ? "Failed to update appointment" : "Failed to create appointment",
                err
            );

            const serverData = err?.response?.data;
            if (serverData) {
                // Prefer human-friendly message but include structured detail
                // (e.g. conflicting appointment) when available.
                const primary = serverData.message || serverData.error || null;
                let extra = null;
                if (serverData.detail) {
                    try {
                        extra = typeof serverData.detail === 'string' ? serverData.detail : JSON.stringify(serverData.detail);
                    } catch (__) {
                        extra = String(serverData.detail);
                    }
                }
                const composed = primary ? (extra ? `${primary} — ${extra}` : primary) : (extra || JSON.stringify(serverData));
                addToast({
                    title: isEdit ? "Update failed" : "Create failed",
                    description: String(composed),
                    variant: "error",
                });
                // If server returned a conflict payload, mirror it into the modal so user can act
                try {
                    if (serverData.detail && serverData.detail.conflict) {
                        setClientConflict(serverData.detail.conflict);
                    }
                } catch (__) {}
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

    

    /* --------------------------------- JSX ---------------------------------- */

    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/40"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="appointment-modal relative z-10 max-h-[85vh] w-[640px] max-w-[95vw] overflow-auto rounded-2xl bg-white ring-1 ring-black/5"
                style={{ ["--assignee-accent"]: "#7c3aed" }}
            >
                <style>{`
                    .no-calendar::-webkit-calendar-picker-indicator {
                        display: none;
                        -webkit-appearance: none;
                    }
                    .no-calendar::-webkit-clear-button,
                    .no-calendar::-webkit-inner-spin-button {
                        display: none;
                        -webkit-appearance: none;
                    }
                    .no-calendar::-ms-clear {
                        display: none;
                    }
                    .appointment-modal select[name=assignee],
                    .appointment-modal input[type=time],
                    .appointment-modal input[type=date],
                    .appointment-modal input[type=text],
                    .appointment-modal input,
                    .appointment-modal select {
                        accent-color: var(--assignee-accent);
                    }
                    .appointment-modal input:focus:not(.left-focus),
                    .appointment-modal select:focus:not(.left-focus),
                    .appointment-modal textarea:focus:not(.left-focus) {
                        box-shadow: none !important;
                        outline: none !important;
                    }
                    .appointment-modal .left-focus:focus,
                    .appointment-modal .left-focus:focus-visible {
                        box-shadow: 0 0 0 4px rgba(16,185,129,0.12) !important;
                        outline: 2px solid rgba(16,185,129,0.08) !important;
                    }
                    .appointment-modal .appointment-time-control,
                    .appointment-modal select[name=assignee],
                    .appointment-modal input[name=start_date],
                    .appointment-modal input[name=end_date] {
                        border-color: #cbd5e1 !important;
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
                    .appointment-modal .appointment-time-control {
                        cursor: pointer;
                    }
                `}</style>

                {/* Header */}
                <div className="relative border-b border-slate-200 px-5 py-2">
                    <h3 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-semibold text-slate-900">
                        {isEdit ? "Edit Appointment" : "Create Appointment"}
                    </h3>
                    <div className="flex items-center justify-end">
                        <button
                            type="button"
                            className="rounded-full p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                            aria-label="Close"
                            onClick={onClose}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Body */}
                <form
                    className="space-y-2 px-4 pb-4 pt-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!saving) handleSave();
                    }}
                >
                    {/* Title */}
                    <div>
                        <label
                            className="text-sm font-medium text-slate-700"
                            htmlFor="appointment-title"
                        >
                            Title
                        </label>
                        <input
                            id="appointment-title"
                            required
                            className="left-focus mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50"
                            placeholder="Appointment title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* 2-column layout turned into 3-column with centered separator */}
                    <div className="grid grid-cols-1 gap-y-4 md:grid-cols-[1fr_auto_1fr] md:gap-x-0.5">
                        {/* Left column: start date, end date, start time, end time */}
                        <div className="space-y-3 md:col-span-1">
                            <div>
                                <label className="text-sm font-medium text-slate-700">
                                    Start date
                                </label>
                                <div className="relative mt-0">
                                    <input
                                        ref={startRef}
                                        name="start_date"
                                        type="date"
                                        className="left-focus no-calendar w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-11 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50"
                                        value={startDateStr}
                                        onChange={(e) => setStartDateStr(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                                        aria-label="Open date picker"
                                        onClick={() => {
                                            try {
                                                startRef.current?.showPicker?.();
                                                startRef.current?.focus?.();
                                            } catch {
                                                /* ignore */
                                            }
                                        }}
                                    >
                                        📅
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700">
                                    End date
                                </label>
                                <div className="relative mt-0">
                                    <input
                                        ref={endRef}
                                        name="end_date"
                                        type="date"
                                        className="left-focus no-calendar w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-11 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50"
                                        value={endDateStr}
                                        onChange={(e) => setEndDateStr(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                                        aria-label="Open date picker"
                                        onClick={() => {
                                            try {
                                                endRef.current?.showPicker?.();
                                                endRef.current?.focus?.();
                                            } catch {
                                                /* ignore */
                                            }
                                        }}
                                    >
                                        📅
                                    </button>
                                </div>
                            </div>

                            {allDayDefault ? (
                                <div className="mt-2 text-xs text-slate-600">
                                    This will be created as an all-day event.
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-sm font-medium text-slate-700">Start time</label>
                                        <TimePicker
                                            value={startTimeStr}
                                            onChange={(v) => setStartTimeStr(v)}
                                            use24Hour={use24Hour}
                                            outerClassName="appointment-time-control mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                            innerClassName="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                            label="Start time"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-slate-700">End time</label>
                                        <TimePicker
                                            value={endTimeStr}
                                            onChange={(v) => setEndTimeStr(v)}
                                            use24Hour={use24Hour}
                                            outerClassName="appointment-time-control mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                            innerClassName="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                            label="End time"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* separator column centered between left and right on md+ */}
                        <div className="hidden md:flex md:items-stretch md:justify-center md:col-span-1">
                            <div className="w-px bg-slate-400 my-2" />
                        </div>

                        {/* Right column: description, key area, assignee, goal */}
                        <div className="space-y-3 md:col-span-1">
                            <div>
                                <label className="text-sm font-medium text-slate-700">
                                    Description
                                </label>
                                <input
                                    name="description"
                                    className="left-focus mt-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50"
                                    placeholder="Brief description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700">
                                    Key area
                                </label>
                                <div className="relative mt-0">
                                    <select
                                        name="keyArea"
                                        className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50"
                                        value={keyAreaId}
                                        onChange={(e) => setKeyAreaId(e.target.value)}
                                    >
                                        <option value="">— No key area —</option>
                                        {Array.isArray(keyAreas) && keyAreas.map((k) => (
                                            <option key={k.id || k.keyAreaId || k._id} value={k.id || k.keyAreaId || k._id}>
                                                {k.title || k.name || String(k.id)}
                                            </option>
                                        ))}
                                    </select>
                                    <svg
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                                    >
                                        <path
                                            fill="currentColor"
                                            d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"
                                        />
                                    </svg>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700">
                                    Assignee
                                </label>
                                <div className="relative mt-0">
                                    <select
                                        name="assignee"
                                        className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50"
                                        value={assignee}
                                        onChange={(e) => setAssignee(e.target.value)}
                                    >
                                        <option value="">— Unassigned —</option>
                                        {Array.isArray(users) &&
                                            users.map((u) => (
                                                <option
                                                    key={u.id || u.userId || u.email}
                                                    value={u.id || u.userId || u.email}
                                                >
                                                    {u.name || u.fullName || u.email || String(u.id || u.userId)}
                                                </option>
                                            ))}
                                    </select>
                                    <svg
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                                    >
                                        <path
                                            fill="currentColor"
                                            d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"
                                        />
                                    </svg>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700">
                                    Link goal
                                </label>
                                <div className="relative mt-0">
                                    <select
                                        name="goal"
                                        className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50"
                                        value={goalId}
                                        onChange={(e) => setGoalId(e.target.value)}
                                    >
                                        <option value="">— No goal —</option>
                                        {Array.isArray(goals) && goals.map((g) => (
                                            <option key={g.id || g.goalId || g._id} value={g.id || g.goalId || g._id}>
                                                {g.title || g.name || g.goalTitle || String(g.id)}
                                            </option>
                                        ))}
                                    </select>
                                    <svg
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                                    >
                                        <path
                                            fill="currentColor"
                                            d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recurrence */}
                    {showRecurrence && (
                        <div className="mt-2 rounded-lg border border-slate-200 p-3">
                            <div className="mt-2 flex items-start gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium text-slate-700">
                                            Repeat
                                        </label>

                                        <select
                                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                            value={recurrenceType}
                                            onChange={(e) => {
                                                setRecurrenceType(e.target.value);
                                                setRecurrenceTouched(true);
                                            }}
                                        >
                                            <option value="none">Does not repeat</option>
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="yearly">Yearly</option>
                                        </select>
                                    </div>

                                    <div className="mt-2">
                                        {recurrenceType === "weekly" && (
                                            <div className="flex flex-wrap gap-2">
                                                {weekdayOptions.map((d) => (
                                                    <label
                                                        key={d.key}
                                                        className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 ${
                                                            recurrenceWeeklyDays.includes(
                                                                d.key
                                                            )
                                                                ? "border-purple-500 bg-purple-50 text-purple-700"
                                                                : "border-slate-200 bg-white text-slate-700"
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={recurrenceWeeklyDays.includes(
                                                                d.key
                                                            )}
                                                            onChange={() => toggleWeekday(d.key)}
                                                        />
                                                        <span className="text-sm">{d.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {recurrenceType === "monthly" && (
                                            <div className="mt-2 flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-sm text-slate-700">
                                                        Repeat appointment on day of month
                                                    </label>

                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="31"
                                                        aria-label="Repeat appointment on day of month (1-31)"
                                                        title="Enter a day number between 1 and 31. Use 31 to indicate the last day in some months if supported by backend."
                                                        className="w-20 rounded-md border border-slate-300 px-2 py-1"
                                                            value={recurrenceMonthlyDay}
                                                            onChange={(e) => {
                                                                setRecurrenceMonthlyDay(
                                                                    Number(e.target.value || 1)
                                                                );
                                                                setRecurrenceTouched(true);
                                                            }}
                                                    />
                                                </div>

                                                <p className="text-xs text-slate-500">
                                                    Enter which day of the month this appointment should repeat on (1–31).
                                                </p>
                                            </div>
                                        )}

                                        {recurrenceType === "yearly" && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <label className="text-sm text-slate-700">
                                                    Month
                                                </label>
                                                <select
                                                    className="rounded-md border border-slate-300 px-2 py-1"
                                                    value={recurrenceYearlyMonth}
                                                    onChange={(e) => {
                                                        setRecurrenceYearlyMonth(
                                                            Number(e.target.value)
                                                        );
                                                        setRecurrenceTouched(true);
                                                    }}
                                                >
                                                    {Array.from({ length: 12 }).map((_, i) => (
                                                        <option key={i} value={i + 1}>
                                                            {i + 1}
                                                        </option>
                                                    ))}
                                                </select>
                                                <label className="text-sm text-slate-700">
                                                    Day
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="31"
                                                    className="w-20 rounded-md border border-slate-300 px-2 py-1"
                                                        value={recurrenceYearlyDay}
                                                        onChange={(e) => {
                                                            setRecurrenceYearlyDay(
                                                                Number(e.target.value || 1)
                                                            );
                                                            setRecurrenceTouched(true);
                                                        }}
                                                />
                                            </div>
                                        )}

                                        {recurrenceType !== "none" && (
                                            <div className="mt-3 border-t border-slate-200 pt-3">
                                                <label className="text-sm font-medium text-slate-700">
                                                    Ends
                                                </label>
                                                <div className="mt-2 flex flex-wrap items-center gap-4">
                                                    <label className="inline-flex items-center gap-2 text-sm">
                                                        <input
                                                            type="radio"
                                                            name="rec-end"
                                                            value="none"
                                                            checked={recurrenceEndType === "none"}
                                                            onChange={() => {
                                                                setRecurrenceEndType("none");
                                                                // Clear any previously set 'until' date when not using 'until'
                                                                setRecurrenceUntilDate("");
                                                                setRecurrenceTouched(true);
                                                            }}
                                                        />
                                                        <span>No end date</span>
                                                    </label>

                                                    <label className="inline-flex items-center gap-2 text-sm">
                                                        <input
                                                            type="radio"
                                                            name="rec-end"
                                                            value="until"
                                                            checked={recurrenceEndType === "until"}
                                                            onChange={() => {
                                                                setRecurrenceEndType("until");
                                                                // If there's no until date yet, default it to the current end date
                                                                if (!recurrenceUntilDate) {
                                                                    setRecurrenceUntilDate(endDateStr || "");
                                                                }
                                                                setRecurrenceTouched(true);
                                                            }}
                                                        />
                                                        <span>End by</span>
                                                        <input
                                                            type="date"
                                                            className="ml-2 rounded-md border border-slate-300 px-2 py-1"
                                                            value={recurrenceEndType === "until" ? (recurrenceUntilDate || "") : ""}
                                                            onChange={(e) => {
                                                                setRecurrenceUntilDate(
                                                                    e.target.value
                                                                );
                                                                setRecurrenceTouched(true);
                                                            }}
                                                        />
                                                    </label>

                                                    <label className="inline-flex items-center gap-2 text-sm">
                                                        <input
                                                            type="radio"
                                                            name="rec-end"
                                                            value="count"
                                                            checked={recurrenceEndType === "count"}
                                                            onChange={() => {
                                                                setRecurrenceEndType("count");
                                                                // Clear until date when switching to count
                                                                setRecurrenceUntilDate("");
                                                                setRecurrenceTouched(true);
                                                            }}
                                                        />
                                                        <span>End after</span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            className="ml-2 w-20 rounded-md border border-slate-300 px-2 py-1"
                                                            value={recurrenceCount}
                                                            onChange={(e) => {
                                                                setRecurrenceCount(
                                                                    Number(e.target.value || 1)
                                                                );
                                                                setRecurrenceTouched(true);
                                                            }}
                                                        />
                                                        <span>occurrences</span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Apply to: occurrence / future / whole series (edit mode, recurring) */}
                    {isRecurringInstance && (
                        <fieldset className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Apply changes to
                            </legend>
                            <div className="mt-1 flex flex-col gap-1 text-sm text-slate-700">
                                <label className="inline-flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="edit-scope"
                                        value="occurrence"
                                        checked={editScope === "occurrence"}
                                        onChange={(e) => setEditScope(e.target.value)}
                                    />
                                    <span>Edit this occurrence only</span>
                                </label>

                                <label className="inline-flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="edit-scope"
                                        value="future"
                                        checked={editScope === "future"}
                                        onChange={(e) => setEditScope(e.target.value)}
                                    />
                                    <span>Edit this and all future occurrences</span>
                                </label>

                                <label className="inline-flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="edit-scope"
                                        value="series"
                                        checked={editScope === "series"}
                                        onChange={(e) => setEditScope(e.target.value)}
                                    />
                                    <span>Edit the entire series</span>
                                </label>
                            </div>
                        </fieldset>
                    )}
                    {clientConflict ? (
                        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
                            <div className="font-semibold text-sm text-red-800">Conflicting appointment</div>
                            <div className="text-sm text-red-700 mt-1">
                                <div><strong>{clientConflict.title || 'Untitled'}</strong></div>
                                <div>{clientConflict.start ? new Date(clientConflict.start).toLocaleString() : ''} — {clientConflict.end ? new Date(clientConflict.end).toLocaleString() : ''}</div>
                                <div className="text-xs text-red-600 mt-1">This time conflicts with an existing appointment. Please change the time or remove the conflicting appointment before saving.</div>
                            </div>
                            <div className="mt-2 flex gap-2">
                                <button
                                    type="button"
                                    className="rounded-md border border-slate-300 px-3 py-1 text-sm"
                                    onClick={() => setClientConflict(null)}
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ) : null}

                    

                    {/* Footer */}
                    <div className="flex w-full items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                onClick={() => setShowRecurrence((s) => !s)}
                                aria-expanded={showRecurrence}
                            >
                                <span aria-hidden className="text-sm">
                                    🔁
                                </span>
                                <span>Recurrence</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                                <svg
                                    stroke="currentColor"
                                    fill="currentColor"
                                    strokeWidth="0"
                                    viewBox="0 0 448 512"
                                    height="1em"
                                    width="1em"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path d="M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM224 416c-35.346 0-64-28.654-64-64 0-35.346 28.654-64 64-64s64 28.654 64 64c0 35.346-28.654 64-64 64zm96-304.52V212c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h228.52c3.183 0 6.235 1.264 8.485 3.515l3.48 3.48A11.996 11.996 0 0 1 320 111.48z" />
                                </svg>
                                {saving ? "Saving..." : "Save"}
                            </button>
                            {/* Delete is handled from the appointment bar delete icon; show modal Delete button only when opened from Month view */}
                            {isEdit && showDelete ? (
                                <div className="flex items-center gap-2">
                                    {!showDeleteConfirm ? (
                                        <button
                                            type="button"
                                            aria-label="Delete appointment"
                                            title="Delete"
                                            className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center justify-center"
                                            onClick={() => {
                                                try {
                                                    // If this appears to be a recurring appointment,
                                                    // show inline scoped delete options. Otherwise
                                                    // delegate to parent handler (which may show
                                                    // a global popover).
                                                    const isRecurring = Boolean(event?.recurringPattern || event?.recurrence || event?.seriesId);
                                                    if (isRecurring) {
                                                        setShowDeleteConfirm(true);
                                                        setDeleteScopeChoice('occurrence');
                                                    } else {
                                                        if (typeof onDelete === 'function') onDelete();
                                                    }
                                                } catch (e) {}
                                            }}
                                        >
                                            <FaTrash aria-hidden />
                                        </button>
                                    ) : null}

                                    {showDeleteConfirm ? (
                                        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                            <div className="font-semibold text-sm mb-2">Delete recurring appointment</div>
                                            <div className="flex flex-col gap-2 text-sm">
                                                <label className="inline-flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="delete-scope-modal"
                                                        value="occurrence"
                                                        checked={deleteScopeChoice === 'occurrence'}
                                                        onChange={() => setDeleteScopeChoice('occurrence')}
                                                    />
                                                    <span>Delete this occurrence only</span>
                                                </label>

                                                <label className="inline-flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="delete-scope-modal"
                                                        value="future"
                                                        checked={deleteScopeChoice === 'future'}
                                                        onChange={() => setDeleteScopeChoice('future')}
                                                    />
                                                    <span>Delete this and all future occurrences</span>
                                                </label>

                                                <label className="inline-flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="delete-scope-modal"
                                                        value="series"
                                                        checked={deleteScopeChoice === 'series'}
                                                        onChange={() => setDeleteScopeChoice('series')}
                                                    />
                                                    <span>Delete the entire series</span>
                                                </label>

                                                <div className="mt-2 flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
                                                        onClick={async () => {
                                                            try {
                                                                setDeleting(true);
                                                                const opts = {};
                                                                if (deleteScopeChoice === 'occurrence') {
                                                                    opts.editScope = 'occurrence';
                                                                    opts.occurrenceStart = event?.start || null;
                                                                } else if (deleteScopeChoice === 'future') {
                                                                    opts.editScope = 'future';
                                                                    opts.occurrenceStart = event?.start || null;
                                                                } else if (deleteScopeChoice === 'series') {
                                                                    opts.editScope = 'series';
                                                                }

                                                                if (event?.kind === 'appointment') {
                                                                    await calendarService.deleteAppointment(event.id, opts);
                                                                } else {
                                                                    await calendarService.deleteEvent(event.id);
                                                                }

                                                                // Notify parent that deletion completed. Pass an object
                                                                // with details so the parent can remove any matching
                                                                // representations (generated id, exception id, series rows).
                                                                if (typeof onDeleted === 'function') onDeleted({
                                                                    id: event.id,
                                                                    scope: deleteScopeChoice,
                                                                    seriesId: event?.seriesId || null,
                                                                    occurrenceStart: opts.occurrenceStart || null,
                                                                });
                                                                setShowDeleteConfirm(false);
                                                            } catch (err) {
                                                                try { console.error('Delete failed', err); } catch (_) {}
                                                            } finally {
                                                                setDeleting(false);
                                                            }
                                                        }}
                                                        disabled={deleting}
                                                    >
                                                        {deleting ? 'Deleting...' : 'Confirm delete'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="rounded-md border border-slate-300 px-3 py-1 text-sm"
                                                        onClick={() => setShowDeleteConfirm(false)}
                                                        disabled={deleting}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            <button
                                type="button"
                                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                disabled
                            >
                                Help
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AppointmentModal;
