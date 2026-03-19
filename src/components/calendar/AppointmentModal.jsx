import React, { useMemo, useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { useDraggable } from "../../hooks/useDraggable";
import { useResizable } from "../../hooks/useResizable";
import calendarService from "../../services/calendarService";
import { useToast } from "../shared/ToastProvider.jsx";
import { FaSave, FaTrash } from "react-icons/fa";
import TimePicker from "../ui/TimePicker.jsx";
import useCalendarPreferences from "../../hooks/useCalendarPreferences";
import { formatKeyAreaLabel } from "../../utils/keyAreaDisplay";

/* ----------------------------- Helper functions ---------------------------- */

const toYMD = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;

// UTC-based YMD — used for all-day events whose timestamps are stored as
// UTC midnight to avoid timezone shift showing the wrong calendar day.
const toUTCYMD = (d) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
        d.getUTCDate()
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

const toDateOnlyLocal = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

const getCalendarDayDiff = (start, end) => {
    try {
        if (!start || !end) return 0;
        const dayMs = 24 * 60 * 60 * 1000;
        const s = toDateOnlyLocal(start);
        const e = toDateOnlyLocal(end);
        return Math.floor((e.getTime() - s.getTime()) / dayMs);
    } catch (_) {
        return 0;
    }
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
        defaultDurationMinutes = 30,
        allDayDefault = false,
        forceCreateAsEvent = false,
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

    const { t } = useTranslation();

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

    const [isAllDay, setIsAllDay] = useState(() => {
        if (isEdit && event) return !!(event.allDay || event.all_day);
        return allDayDefault;
    });
    const [startDateStr, setStartDateStr] = useState(toYMD(initialStart));
    const [startTimeStr, setStartTimeStr] = useState(() => toHM(initialStart));
    const [endDateStr, setEndDateStr] = useState(toYMD(initialEnd));
    const [endTimeStr, setEndTimeStr] = useState(() => toHM(initialEnd));
    const [saving, setSaving] = useState(false);
    const [clientConflict, setClientConflict] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteScopeChoice, setDeleteScopeChoice] = useState('occurrence');
    const [deleting, setDeleting] = useState(false);
    const isAppointmentLikeEvent = useMemo(() => {
        if (!isEdit || !event) return false;
        // Reliable: any event that came from an external calendar has outlookId or googleId
        if (event?.outlookId || event?.outlook_id || event?.googleId || event?.google_id) return true;
        const kind = String(event?.kind || "").toLowerCase();
        if (kind === "appointment" || kind === "appointment_exception") return true;
        if (kind.includes("appointment")) return true;
        if (kind === "task.activity" || kind === "task_activity" || kind === "task-activity") return true;

        const sourceType = String(event?.sourceType || event?.source_type || "").toLowerCase();
        if (sourceType === "manual" || sourceType === "task" || sourceType === "activity") return true;

        if (event?.appointmentId || event?.appointment_id) return true;
        return false;
    }, [isEdit, event]);

    const syncBadge = useMemo(() => {
        if (!isEdit || !event) return null;
        if (event?.outlookId || event?.outlook_id) return "Synced from Outlook";
        if (event?.googleId || event?.google_id) return "Synced from Google";
        return null;
    }, [isEdit, event]);
    const modalEntityLabel = useMemo(() => {
        if (isEdit) {
            return isAppointmentLikeEvent ? "Appointment" : "Event";
        }
        const s = combineDateTime(startDateStr, startTimeStr);
        const e = combineDateTime(endDateStr, endTimeStr);
        const createAsEvent =
            forceCreateAsEvent || allDayDefault || (s && e ? getCalendarDayDiff(s, e) >= 1 : false);
        return createAsEvent ? "Event" : "Appointment";
    }, [
        isEdit,
        isAppointmentLikeEvent,
        forceCreateAsEvent,
        allDayDefault,
        startDateStr,
        startTimeStr,
        endDateStr,
        endTimeStr,
    ]);

    const handleStartDateChange = (nextStartDate) => {
        setStartDateStr(nextStartDate);
        setEndDateStr((prevEndDate) => {
            if (!nextStartDate || !prevEndDate) return prevEndDate;
            return nextStartDate > prevEndDate ? nextStartDate : prevEndDate;
        });
    };

    const handleEndDateChange = (nextEndDate) => {
        setEndDateStr(nextEndDate);
        setStartDateStr((prevStartDate) => {
            if (!nextEndDate || !prevStartDate) return prevStartDate;
            return nextEndDate < prevStartDate ? nextEndDate : prevStartDate;
        });
    };

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
    const recurrenceUntilRef = useRef(null);

    const { position, isDragging, handleMouseDown, handleMouseMove, handleMouseUp, resetPosition } = useDraggable();
    const { size, isDraggingResize, handleResizeMouseDown } = useResizable(600, 520);
    
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

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

        const isEventAllDay = !!(event?.allDay || event?.all_day);
        if (isEventAllDay) {
            // All-day events are stored as UTC midnight. Use UTC dates to avoid
            // timezone shifts showing the wrong calendar day.
            // The backend stores end as exclusive next-day UTC midnight, so subtract
            // 1 day to get the inclusive last day shown to the user.
            const endIsUTCMidnight =
                end.getUTCHours() === 0 && end.getUTCMinutes() === 0 && end.getUTCSeconds() === 0;
            const inclusiveEnd = endIsUTCMidnight
                ? new Date(end.getTime() - 24 * 60 * 60 * 1000)
                : end;
            setStartDateStr(toUTCYMD(start));
            setStartTimeStr("00:00");
            setEndDateStr(toUTCYMD(inclusiveEnd));
            setEndTimeStr("00:00");
        } else {
            setStartDateStr(toYMD(start));
            setStartTimeStr(toHM(start));
            setEndDateStr(toYMD(end));
            setEndTimeStr(toHM(end));
        }

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
        let submitKindLabel = "appointment";
        try {
            if (!title.trim()) {
                addToast({ title: t("appointmentModal.titleRequired"), variant: "error" });
                return;
            }

            const sRaw = combineDateTime(startDateStr, startTimeStr);
            const eRaw = combineDateTime(endDateStr, endTimeStr);

            if (!sRaw || !eRaw) {
                addToast({ title: t("appointmentModal.startEndRequired"), variant: "error" });
                return;
            }

            // For all-day events, use start-of-day and end-of-day boundaries.
            const s = isAllDay
                ? new Date(sRaw.getFullYear(), sRaw.getMonth(), sRaw.getDate(), 0, 0, 0, 0)
                : sRaw;
            const e = isAllDay
                ? new Date(eRaw.getFullYear(), eRaw.getMonth(), eRaw.getDate(), 23, 59, 0, 0)
                : eRaw;

            if (s >= e) {
                addToast({ title: t("appointmentModal.endAfterStart"), variant: "error" });
                return;
            }

            const calendarDayDiff = getCalendarDayDiff(s, e);
            const submitAsEvent = forceCreateAsEvent || isAllDay || calendarDayDiff >= 1;
            submitKindLabel = submitAsEvent ? "event" : "appointment";

            if (recurrenceType && recurrenceType !== "none") {
                if (recurrenceEndType === "until") {
                    if (!recurrenceUntilDate) {
                        addToast({
                            title: t("appointmentModal.recurrenceEndRequired"),
                            variant: "error",
                        });
                        return;
                    }
                    const untilDt = new Date(`${recurrenceUntilDate}T00:00:00`);
                    if (isNaN(untilDt.getTime()) || untilDt <= s) {
                        addToast({
                            title: t("appointmentModal.recurrenceEndAfterStart"),
                            variant: "error",
                        });
                        return;
                    }
                }

                if (recurrenceEndType === "count") {
                    if (!recurrenceCount || Number(recurrenceCount) <= 0) {
                        addToast({
                            title: t("appointmentModal.occurrencesMustBePositive"),
                            variant: "error",
                        });
                        return;
                    }
                }
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
                    const isAppointmentUpdate =
                        isAppointmentLikeEvent || looksLikeGeneratedOccurrence;

                    // Build endpoint-specific payloads (DTO whitelist is strict)
                    const payload = isAppointmentUpdate
                        ? {
                              title: title.trim(),
                              description: description.trim() || null,
                              start: toOffsetISO(s),
                              end: toOffsetISO(e),
                              timezone,
                              allDay: isAllDay,
                              goalId: goalId || null,
                              keyAreaId: keyAreaId || null,
                          }
                        : {
                              title: title.trim(),
                              description: description.trim() || null,
                              start: toOffsetISO(s),
                              end: toOffsetISO(e),
                              allDay: isAllDay || submitAsEvent,
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

                        payload.occurrenceStart = (event?.start ? new Date(event.start).toISOString() : occStartFromId) || null;

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
                        updated = isAppointmentUpdate
                            ? await calendarService.updateAppointment(appointmentIdToUse, payload)
                            : await calendarService.updateEvent(appointmentIdToUse, payload);
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
                        kind: updated?.kind || event?.kind || (submitAsEvent ? "event" : "appointment"),
                        recurringPattern: updated.recurringPattern ?? recurringPattern,
                        // Pass the edit scope so CalendarContainer can decide whether a
                        // full refresh is needed (series/future change affect multiple bars).
                        _editScope: isRecurringInstance ? editScope : undefined,
                    });
            } else {
                const created = submitAsEvent
                    ? await calendarService.createEvent({
                        title: title.trim(),
                        description: description.trim() || null,
                        start: toOffsetISO(s),
                        end: toOffsetISO(e),
                        timezone,
                        allDay: true,
                        recurringPattern: recurringPattern || null,
                        keyAreaId: keyAreaId || null,
                    })
                    : await calendarService.createAppointment({
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
                        kind: created?.kind || (submitAsEvent ? "event" : "appointment"),
                        recurringPattern: created.recurringPattern ?? recurringPattern,
                    });
                // Clear any prior client-side conflict after successful create
                setClientConflict(null);
            }
        } catch (err) {
            console.warn(
                isEdit
                    ? `Failed to update ${submitKindLabel}`
                    : `Failed to create ${submitKindLabel}`,
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
                    title: isEdit
                        ? `Update ${submitKindLabel} failed`
                        : `Create ${submitKindLabel} failed`,
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
                    title: isEdit
                        ? `Update ${submitKindLabel} failed`
                        : `Create ${submitKindLabel} failed`,
                    description: String(err?.message || err),
                    variant: "error",
                });
            }
        } finally {
            setSaving(false);
        }
    };

    const handleHeaderDelete = async () => {
        if (!isEdit) return;
        try {
            const recurring = Boolean(event?.recurringPattern || event?.recurrence || event?.seriesId);
            if (recurring) {
                setShowDeleteConfirm(true);
                setDeleteScopeChoice('occurrence');
                return;
            }

            if (!window.confirm(`Delete this ${modalEntityLabel.toLowerCase()}?`)) return;

            if (typeof onDelete === "function") {
                await onDelete();
                return;
            }

            if (isAppointmentLikeEvent) {
                await calendarService.deleteAppointment(event.id);
            } else {
                await calendarService.deleteEvent(event.id);
            }

            if (typeof onDeleted === "function") {
                onDeleted({ id: event?.id, scope: "occurrence", seriesId: event?.seriesId || null, occurrenceStart: event?.start || null });
            }
            onClose && onClose();
        } catch (err) {
            try { console.error('Delete failed', err); } catch (_) {}
        }
    };

    

    /* --------------------------------- JSX ---------------------------------- */

    return (
        <div
            className="fixed inset-0 z-[9999] grid place-items-center bg-black/40"
        >
            <div
                className="appointment-modal relative z-[10000] rounded-2xl bg-white ring-1 ring-black/5 flex flex-col overflow-hidden"
                style={{ 
                    ["--assignee-accent"]: "#7c3aed",
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    cursor: isDragging ? 'grabbing' : isDraggingResize ? 'se-resize' : 'default',
                    width: `${size.width}px`,
                    height: `${size.height}px`,
                    minWidth: '300px',
                    minHeight: '200px'
                }}
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
                    .appointment-modal select[name=assignee]:focus,
                    .appointment-modal select[name=assignee]:focus-visible {
                        border-color: #a855f7 !important;
                    }
                    .appointment-modal .appointment-time-control:focus,
                    .appointment-modal input[name=start_date]:focus,
                    .appointment-modal input[name=end_date]:focus,
                    .appointment-modal .appointment-time-control:focus-visible,
                    .appointment-modal input[name=start_date]:focus-visible,
                    .appointment-modal input[name=end_date]:focus-visible {
                        box-shadow: none !important;
                        outline: 2px solid rgba(34, 197, 94, 0.35) !important;
                        outline-offset: 0px !important;
                        border-color: #22c55e !important;
                    }
                    .appointment-modal .appointment-time-control {
                        cursor: pointer;
                    }
                `}</style>

                {/* Header */}
                <div
                    className="relative border-b border-slate-200 px-5 py-2 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
                    style={{ minHeight: syncBadge ? '56px' : undefined }}
                    onMouseDown={handleMouseDown}
                >
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
                        <h3 className="text-xl font-semibold text-slate-900">
                            {isEdit
                                ? t("appointmentModal.editTitle")
                                : t("appointmentModal.createTitle")}
                        </h3>
                        {syncBadge && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 3.5a.75.75 0 0 1 1.5 0v3.25l2 1.15a.75.75 0 1 1-.75 1.3l-2.25-1.3A.75.75 0 0 1 7.25 8V4.5Z"/></svg>
                                {syncBadge}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="submit"
                            form="appointment-modal-form"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <FaSave className="text-xs" />
                            {saving ? t("appointmentModal.saving") : t("appointmentModal.save")}
                        </button>
                        {isEdit ? (
                            <button
                                type="button"
                                className="p-2 rounded-md text-red-600 hover:bg-red-50"
                                aria-label="Delete"
                                onClick={handleHeaderDelete}
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                <FaTrash className="text-sm" />
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className="rounded-full p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                            aria-label="Close"
                            onClick={onClose}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Body */}
                <form
                    id="appointment-modal-form"
                    className="pm-notched-form space-y-2 px-4 pb-2 pt-2 overflow-y-auto flex-1"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!saving) handleSave();
                    }}
                >
                    {/* Title */}
                    <div className="mb-4">
                        <label
                            className="text-sm font-medium text-slate-700"
                            htmlFor="appointment-title"
                        >
                            {t("appointmentModal.titleField")}
                        </label>
                        <input
                            id="appointment-title"
                            required
                            className="left-focus mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50"
                            placeholder={`${modalEntityLabel} title`}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* All Day toggle */}
                    <div className="flex items-center gap-3 mb-2">
                        <label className="text-sm font-medium text-slate-700 select-none cursor-pointer" htmlFor="all-day-toggle">
                            All Day
                        </label>
                        <button
                            id="all-day-toggle"
                            type="button"
                            role="switch"
                            aria-checked={isAllDay}
                            onClick={() => setIsAllDay(v => !v)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${isAllDay ? 'bg-green-500' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isAllDay ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* 2-column layout turned into 3-column with centered separator */}
                    <div className="grid grid-cols-1 gap-y-4 md:grid-cols-[1fr_auto_1fr] md:gap-x-6">
                        {/* Left column: start date, end date, start time, end time */}
                        <div className="grid gap-0 md:col-span-1" style={{ gridTemplateRows: isAllDay ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))' }}>
                            <div className="min-h-16">
                                <label className="text-sm font-medium text-slate-700">
                                    {t("appointmentModal.startDateField")}
                                </label>
                                <div className="relative mt-0">
                                    <input
                                        ref={startRef}
                                        name="start_date"
                                        type="date"
                                        className="left-focus no-calendar w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-11 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50"
                                        value={startDateStr}
                                        onChange={(e) => handleStartDateChange(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600"
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

                            <div className="min-h-16">
                                <label className="text-sm font-medium text-slate-700">
                                    {t("appointmentModal.endDateField")}
                                </label>
                                <div className="relative mt-0">
                                    <input
                                        ref={endRef}
                                        name="end_date"
                                        type="date"
                                        className="left-focus no-calendar w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-11 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50"
                                        value={endDateStr}
                                        onChange={(e) => handleEndDateChange(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600"
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

                            {!isAllDay && (
                                <>
                                    <div className="min-h-16">
                                        <label className="text-sm font-medium text-slate-700">{t("appointmentModal.startTimeField")}</label>
                                        <TimePicker
                                            value={startTimeStr}
                                            onChange={(v) => setStartTimeStr(v)}
                                            use24Hour={use24Hour}
                                            outerClassName="appointment-time-control mt-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50"
                                            innerClassName="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                                            label={t("appointmentModal.startTimeField")}
                                        />
                                    </div>

                                    <div className="min-h-16">
                                        <label className="text-sm font-medium text-slate-700">{t("appointmentModal.endTimeField")}</label>
                                        <TimePicker
                                            value={endTimeStr}
                                            onChange={(v) => setEndTimeStr(v)}
                                            use24Hour={use24Hour}
                                            outerClassName="appointment-time-control mt-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50"
                                            innerClassName="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                                            label={t("appointmentModal.endTimeField")}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* separator column centered between left and right on md+ */}
                        <div className="hidden md:flex md:items-stretch md:justify-center md:col-span-1">
                            <div className="w-px bg-slate-200 my-2" />
                        </div>

                        {/* Right column: description, key area, assignee, goal */}
                        <div className="grid grid-rows-4 gap-0 md:col-span-1">
                            <div className="min-h-16">
                                <label className="text-sm font-medium text-slate-700">
                                    {t("appointmentModal.descriptionField")}
                                </label>
                                <input
                                    name="description"
                                    className="mt-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500"
                                    placeholder={t("appointmentModal.briefDescription")}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="min-h-16">
                                <label className="text-sm font-medium text-slate-700">
                                    {t("appointmentModal.keyAreaField")}
                                </label>
                                <div className="relative mt-0">
                                    <select
                                        name="keyArea"
                                        className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50"
                                        value={keyAreaId}
                                        onChange={(e) => setKeyAreaId(e.target.value)}
                                    >
                                        <option value="">{t("appointmentModal.noKeyArea")}</option>
                                        {Array.isArray(keyAreas) && keyAreas.map((k, idx) => (
                                            <option key={k.id || k.keyAreaId || k._id} value={k.id || k.keyAreaId || k._id}>
                                                {formatKeyAreaLabel(k, idx)}
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

                            <div className="min-h-16">
                                <label className="text-sm font-medium text-slate-700">
                                    {t("appointmentModal.assigneeField")}
                                </label>
                                <div className="relative mt-0">
                                    <select
                                        name="assignee"
                                        className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500"
                                        value={assignee}
                                        onChange={(e) => setAssignee(e.target.value)}
                                    >
                                        <option value="">{t("appointmentModal.unassigned")}</option>
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

                            <div className="min-h-16">
                                <label className="text-sm font-medium text-slate-700">
                                    {t("appointmentModal.linkGoalField")}
                                </label>
                                <div className="relative mt-0">
                                    <select
                                        name="goal"
                                        className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50"
                                        value={goalId}
                                        onChange={(e) => setGoalId(e.target.value)}
                                    >
                                        <option value="">{t("appointmentModal.noGoal")}</option>
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
                    <div className="mt-2 rounded-lg border border-slate-200 p-3">
                        <button
                            type="button"
                            className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            onClick={() => setShowRecurrence((s) => !s)}
                            aria-expanded={showRecurrence}
                        >
                            <span aria-hidden className="text-sm">🔁</span>
                            <span>{t("appointmentModal.recurrenceField")}</span>
                        </button>
                        {showRecurrence && (
                            <div className="mt-3 border-t border-slate-200 pt-3">
                                <div className="flex items-start gap-3">
                                    <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium text-slate-700">
                                            {t("appointmentModal.repeatField")}
                                        </label>

                                        <select
                                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                            value={recurrenceType}
                                            onChange={(e) => {
                                                setRecurrenceType(e.target.value);
                                                setRecurrenceTouched(true);
                                            }}
                                        >
                                            <option value="none">{t("appointmentModal.doesNotRepeat")}</option>
                                            <option value="daily">{t("appointmentModal.daily")}</option>
                                            <option value="weekly">{t("appointmentModal.weekly")}</option>
                                            <option value="monthly">{t("appointmentModal.monthly")}</option>
                                            <option value="yearly">{t("appointmentModal.yearly")}</option>
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
                                                        {t("appointmentModal.repeatDayOfMonth")}
                                                    </label>

                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="31"
                                                        aria-label={t("appointmentModal.repeatDayOfMonth")}
                                                        title={t("appointmentModal.repeatDayOfMonthHint")}
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
                                                    {t("appointmentModal.repeatDayOfMonthHint")}
                                                </p>
                                            </div>
                                        )}

                                        {recurrenceType === "yearly" && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <label className="text-sm text-slate-700">
                                                    {t("appointmentModal.month")}
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
                                                    {t("appointmentModal.day")}
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
                                                    {t("appointmentModal.ends")}
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
                                                        <span>{t("appointmentModal.noEndDate")}</span>
                                                    </label>

                                                    <label className="inline-flex items-center gap-2 text-sm flex-wrap">
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
                                                        <span>{t("appointmentModal.endBy")}</span>
                                                        <div className="relative ml-2">
                                                            <input
                                                                ref={recurrenceUntilRef}
                                                                type="date"
                                                                className="no-calendar w-full appearance-none rounded-md border border-slate-300 bg-white px-2 py-1 pr-9"
                                                                value={recurrenceUntilDate || ""}
                                                                onFocus={() => {
                                                                    setRecurrenceEndType("until");
                                                                }}
                                                                onChange={(e) => {
                                                                    setRecurrenceEndType("until");
                                                                    setRecurrenceUntilDate(
                                                                        e.target.value
                                                                    );
                                                                    setRecurrenceTouched(true);
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600"
                                                                aria-label="Open recurrence end date picker"
                                                                onClick={() => {
                                                                    try {
                                                                        setRecurrenceEndType("until");
                                                                        recurrenceUntilRef.current?.showPicker?.();
                                                                        recurrenceUntilRef.current?.focus?.();
                                                                    } catch {
                                                                        /* ignore */
                                                                    }
                                                                }}
                                                            >
                                                                📅
                                                            </button>
                                                        </div>
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
                                                        <span>{t("appointmentModal.endAfter")}</span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            className="ml-2 w-20 rounded-md border border-slate-300 px-2 py-1"
                                                            value={recurrenceCount}
                                                            onFocus={() => {
                                                                setRecurrenceEndType("count");
                                                            }}
                                                            onChange={(e) => {
                                                                setRecurrenceEndType("count");
                                                                setRecurrenceCount(
                                                                    Number(e.target.value || 1)
                                                                );
                                                                setRecurrenceTouched(true);
                                                            }}
                                                        />
                                                        <span>{t("appointmentModal.occurrences")}</span>
                                                    </label>
                                                </div>
                                            </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Apply to: occurrence / future / whole series (edit mode, recurring) */}
                    {isRecurringInstance && !showDeleteConfirm && (
                        <fieldset className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {t("appointmentModal.applyChangesTo")}
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
                                    <span>{t("appointmentModal.editThisOnly")}</span>
                                </label>

                                <label className="inline-flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="edit-scope"
                                        value="future"
                                        checked={editScope === "future"}
                                        onChange={(e) => setEditScope(e.target.value)}
                                    />
                                    <span>{t("appointmentModal.editThisAndFuture")}</span>
                                </label>

                                <label className="inline-flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="edit-scope"
                                        value="series"
                                        checked={editScope === "series"}
                                        onChange={(e) => setEditScope(e.target.value)}
                                    />
                                    <span>{t("appointmentModal.editEntireSeries")}</span>
                                </label>
                            </div>
                        </fieldset>
                    )}
                    {clientConflict ? (
                        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
                            <div className="font-semibold text-sm text-red-800">{t("appointmentModal.conflictingAppointment")}</div>
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
                                    {t("appointmentModal.dismiss")}
                                </button>
                            </div>
                        </div>
                    ) : null}

                    

                    {/* Footer */}
                    {showDeleteConfirm ? (
                        <div className="flex w-full items-center justify-end gap-2">
                            <div className="flex items-center gap-2">
                                        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                            <div className="font-semibold text-sm mb-2">{t("appointmentModal.deleteRecurring")}</div>
                                            <div className="flex flex-col gap-2 text-sm">
                                                <label className="inline-flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="delete-scope-modal"
                                                        value="occurrence"
                                                        checked={deleteScopeChoice === 'occurrence'}
                                                        onChange={() => setDeleteScopeChoice('occurrence')}
                                                    />
                                                    <span>{t("appointmentModal.deleteThisOnly")}</span>
                                                </label>

                                                <label className="inline-flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="delete-scope-modal"
                                                        value="future"
                                                        checked={deleteScopeChoice === 'future'}
                                                        onChange={() => setDeleteScopeChoice('future')}
                                                    />
                                                    <span>{t("appointmentModal.deleteThisAndFuture")}</span>
                                                </label>

                                                <label className="inline-flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="delete-scope-modal"
                                                        value="series"
                                                        checked={deleteScopeChoice === 'series'}
                                                        onChange={() => setDeleteScopeChoice('series')}
                                                    />
                                                    <span>{t("appointmentModal.deleteEntireSeries")}</span>
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
                                                                    opts.occurrenceStart = event?.start ? new Date(event.start).toISOString() : null;
                                                                } else if (deleteScopeChoice === 'future') {
                                                                    opts.editScope = 'future';
                                                                    opts.occurrenceStart = event?.start ? new Date(event.start).toISOString() : null;
                                                                } else if (deleteScopeChoice === 'series') {
                                                                    opts.editScope = 'series';
                                                                }

                                                                if (isAppointmentLikeEvent) {
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
                                                        {deleting ? t("appointmentModal.deleting") : t("appointmentModal.confirmDelete")}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="rounded-md border border-slate-300 px-3 py-1 text-sm"
                                                        onClick={() => setShowDeleteConfirm(false)}
                                                        disabled={deleting}
                                                    >
                                                        {t("appointmentModal.cancel")}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                            </div>
                        </div>
                    ) : null}
                </form>
                {/* Right resize handle */}
                <div
                  onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
                  className="absolute top-0 right-0 w-1 h-full cursor-e-resize hover:bg-blue-500/20 transition-colors"
                  style={{ zIndex: 40 }}
                />
                {/* Bottom resize handle */}
                <div
                  onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
                  className="absolute bottom-0 left-0 w-full h-1 cursor-s-resize hover:bg-blue-500/20 transition-colors"
                  style={{ zIndex: 40 }}
                />
                {/* Corner resize handle (southeast) */}
                <div
                  onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-blue-500/30 transition-colors rounded-tl"
                  style={{ zIndex: 41 }}
                  title="Drag to resize"
                />
            </div>
        </div>
    );
};

export default AppointmentModal;
