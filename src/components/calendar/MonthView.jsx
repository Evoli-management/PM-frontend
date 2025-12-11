import React, {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { useCalendarPreferences } from "../../hooks/useCalendarPreferences";
import { FaChevronLeft, FaChevronRight, FaChevronDown } from "react-icons/fa";
import { FaEdit, FaTrash } from "react-icons/fa";

export default function MonthView({
    currentDate,
    onShiftDate,
    events,
    todos = [],
    categories,
    onEventClick,
    onTaskClick,
    view,
    onChangeView,
    filterType,
    onChangeFilter,
    onQuickCreate, // open appointment creation modal
    onTaskDrop,
}) {
    // Get user's timezone
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const {
        timeSlots,
        workingHours,
        formatTime,
        loading: prefsLoading,
        isWorkingTime,
    } = useCalendarPreferences(30);

    const ALL_HOURS = Array.from({ length: 48 }, (_, i) => {
        const h = Math.floor(i / 2);
        const m = i % 2 === 0 ? "00" : "30";
        return `${h.toString().padStart(2, "0")}:${m}`;
    });

    // Use slots from preferences — fall back to ALL_HOURS.
    // Normalize slots to remove a trailing "24:00" boundary which can
    // duplicate midnight/noon labels when formatted (e.g. "24:00" -> "12:00 PM").
    const rawSlots = timeSlots.length > 0 ? timeSlots : ALL_HOURS;
    const SLOTS = rawSlots.filter((s) => String(s) !== "24:00");
    // For month view we only want one column per hour (no half-hour columns)
    const HOUR_SLOTS = SLOTS.filter((s) => String(s).endsWith(":00"));

    // Layout constants - adjust these to change column / lane sizing
    const ALL_DAY_COL_WIDTH = 120; // was 80px
    const HOUR_COL_WIDTH = 80; // per-hour column width fallback
    const LANE_WIDTH = 72; // was 36px for all-day range lanes
    const LANE_GAP = 6; // gap between lanes
    const LANE_HEIGHT = 18; // vertical stacking height for multi-day lanes
    const CENTERED_BAR_FRACTION = 0.5; // fraction of column width to use for centered bars
    const CENTERED_BAR_WIDTH = 60; // target centered bar width in px

    const MONTHS = [
        { short: "Jan", long: "January", index: 0 },
        { short: "Feb", long: "February", index: 1 },
        { short: "Mar", long: "March", index: 2 },
        { short: "Apr", long: "April", index: 3 },
        { short: "May", long: "May", index: 4 },
        { short: "Jun", long: "June", index: 5 },
        { short: "Jul", long: "July", index: 6 },
        { short: "Aug", long: "August", index: 7 },
        { short: "Sep", long: "September", index: 8 },
        { short: "Oct", long: "October", index: 9 },
        { short: "Nov", long: "November", index: 10 },
        { short: "Dec", long: "December", index: 11 },
    ];

    // Resolve public URL base in a way that works for CRA and Vite.
    // Use try/catch to avoid referencing `process` at parse time in environments
    // (like Vite) where `process` is not defined.
    let PUBLIC_URL = "";
    try {
        // Try CRA style first — may throw if `process` is undefined
        PUBLIC_URL = (process && process.env && process.env.PUBLIC_URL) || "";
    } catch (e) {
        // ignore
    }
    try {
        if (!PUBLIC_URL && import.meta && import.meta.env && import.meta.env.BASE_URL) {
            PUBLIC_URL = import.meta.env.BASE_URL || "";
        }
    } catch (e) {
        // ignore
    }

    // Determine working-hours numeric bounds (hours) from preferences, fallback to full day
    const WORK_START = workingHours?.startTime
        ? parseInt(String(workingHours.startTime).split(":")[0], 10)
        : 0;
    const WORK_END = workingHours?.endTime
        ? parseInt(String(workingHours.endTime).split(":")[0], 10)
        : 24;

    const today = new Date();
    const DEBUG_RANGES = true;
    const baseDate = new Date(
        (currentDate || today).getFullYear(),
        (currentDate || today).getMonth(),
        1,
    );
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthDays = Array.from(
        { length: daysInMonth },
        (_, i) => new Date(year, month, i + 1),
    );

// Helper: ISO week number (weeks start on Monday, week 1 = week with Jan 4th)
const isoWeekNumber = (date) => {
    // Work in UTC to avoid timezone issues
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

    // ISO: week starts on Monday, so we convert to a "Monday-based" index
    // 0 = Monday, 6 = Sunday
    const day = (d.getUTCDay() + 6) % 7;

    // Move to Thursday of this week, which is the ISO anchor
    d.setUTCDate(d.getUTCDate() - day + 3);

    // First Thursday of the ISO year (week 1 is the week with Jan 4)
    const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));

    // Calculate the ISO week number
    const diff = d - firstThursday; // ms difference
    const week = 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));

    return week;
};
    // Compute week-number cells (rowSpan + week number) so we can render
    // a single week number per ISO week and span it across that week's rows.
    //
    // ISO-8601 rules:
    // - Week starts on Monday.
    // - Week 1 is the week that contains Jan 4 (or first Thursday).
    // We use strict "label on Monday" logic: only rows where the date is
    // a Monday will receive a week label. This means leading partial weeks
    // whose Monday falls in the previous month will not be labeled here.
    const weekCells = {};
    for (let i = 0; i < monthDays.length; i++) {
        const d = monthDays[i];
        const isMonday = d.getDay() === 1; // 1 = Monday in local time

        // Only label rows that are Mondays (strict Monday labeling).
        if (!isMonday) continue;

        // Compute how many rows (days) this week spans in this month,
        // i.e., until the next Monday or end of the month.
        let span = 1;
        for (let j = i + 1; j < monthDays.length; j++) {
            if (monthDays[j].getDay() === 1) break; // next Monday
            span += 1;
        }

        weekCells[i] = {
            weekNumber: isoWeekNumber(d),
            rowSpan: span,
        };
    }


    // Helper: Parse date string to Date.
    const toLocal = (dateStr) => new Date(dateStr);

    // Month picker UI state (custom popover)
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [pickerYear, setPickerYear] = useState(baseDate.getFullYear());

    // Helper: parse a hex or rgb/rgba color string into {r,g,b}
    function parseColorToRgb(input) {
        if (!input || typeof input !== 'string') return null;
        try {
            const s = input.trim();
            if (s.startsWith('#')) {
                const h = s.replace('#', '');
                const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
                const bigint = parseInt(full, 16);
                return {
                    r: (bigint >> 16) & 255,
                    g: (bigint >> 8) & 255,
                    b: bigint & 255,
                };
            }
            if (s.startsWith('rgb')) {
                const m = s.match(/rgba?\(([^)]+)\)/);
                if (!m) return null;
                const parts = m[1].split(',').map(p => p.trim());
                const r = parseInt(parts[0], 10);
                const g = parseInt(parts[1], 10);
                const b = parseInt(parts[2], 10);
                if ([r, g, b].some(n => Number.isNaN(n))) return null;
                return { r, g, b };
            }
            return null;
        } catch (e) {
            return null;
        }
    }
    function getContrastTextColor(colorStr) {
        try {
            const c = parseColorToRgb(colorStr);
            if (!c) return '#0B4A53';
            const srgb = [c.r, c.g, c.b]
                .map((v) => v / 255)
                .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
            const lum = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
            return lum > 0.6 ? '#0B4A53' : '#ffffff';
        } catch (e) {
            return '#0B4A53';
        }
    }
    // Key area (aka "key areas") color map — used as a fallback when a todo/task
    // doesn't have a category color but does belong to a key area that has a color.
    const [keyAreaMap, setKeyAreaMap] = useState({});
    useEffect(() => {
        let ignore = false;
        (async () => {
            try {
                const mod = await import("../../services/keyAreaService");
                const svc = mod?.default || mod;
                const areas = await svc.list().catch(() => []);
                const map = {};
                (areas || []).forEach((a) => {
                    if (a && a.id) map[String(a.id)] = a;
                });
                if (!ignore) setKeyAreaMap(map);
            } catch (e) {
                if (!ignore) setKeyAreaMap({});
            }
        })();
        return () => {
            ignore = true;
        };
    }, []);

    // Cache for resolving Tailwind bg classes to real computed background colors
    const [tailwindColorCache, setTailwindColorCache] = useState({});
    useEffect(() => {
        // Build a set of tailwind classes we might need to resolve
        const classes = new Set();
        try {
            // categories values
            if (categories && typeof categories === 'object') {
                Object.values(categories).forEach((c) => {
                    if (c && typeof c.color === 'string' && c.color.startsWith('bg-')) classes.add(c.color);
                });
            }
            // key area colors
            if (keyAreaMap && typeof keyAreaMap === 'object') {
                Object.values(keyAreaMap).forEach((a) => {
                    if (a && typeof a.color === 'string' && a.color.startsWith('bg-')) classes.add(a.color);
                });
            }
        } catch (_) {}

        const missing = Array.from(classes).filter((cl) => !(cl in tailwindColorCache));
        if (missing.length === 0) return;
        const newMap = { ...tailwindColorCache };
        missing.forEach((cl) => {
            try {
                const el = document.createElement('div');
                el.style.position = 'absolute';
                el.style.left = '-9999px';
                el.className = cl;
                document.body.appendChild(el);
                const bg = window.getComputedStyle(el).backgroundColor;
                document.body.removeChild(el);
                if (bg) newMap[cl] = bg;
            } catch (e) {}
        });
        setTailwindColorCache(newMap);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories, keyAreaMap]);


    // Build a map of appointments for each day and slot
    const appointmentsByDaySlot = {};
    (Array.isArray(events) ? events : []).forEach((ev) => {
        if (ev.taskId || !ev.start) return;
        const startLocal = toLocal(ev.start);
        const endLocal = ev.end
            ? toLocal(ev.end)
            : new Date(startLocal.getTime() + 30 * 60000);

        const dayStart = new Date(
            startLocal.getFullYear(),
            startLocal.getMonth(),
            startLocal.getDate(),
            WORK_START,
            0,
            0,
            0,
        );
        const dayEnd = new Date(
            startLocal.getFullYear(),
            startLocal.getMonth(),
            startLocal.getDate(),
            WORK_END,
            0,
            0,
            0,
        );

        const clampedStart = new Date(
            Math.max(startLocal.getTime(), dayStart.getTime()),
        );
        const clampedEnd = new Date(
            Math.min(endLocal.getTime(), dayEnd.getTime()),
        );

        if (clampedEnd <= clampedStart) return;

        let cur = new Date(clampedStart);
        cur.setMinutes(Math.floor(cur.getMinutes() / 30) * 30, 0, 0);
        while (cur < clampedEnd) {
            const dayKey = `${cur.getFullYear()}-${String(
                cur.getMonth() + 1,
            ).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
            if (!appointmentsByDaySlot[dayKey])
                appointmentsByDaySlot[dayKey] = {};
            const slotKey = `${cur
                .getHours()
                .toString()
                .padStart(2, "0")}:${cur
                .getMinutes()
                .toString()
                .padStart(2, "0")}`;
            if (!appointmentsByDaySlot[dayKey][slotKey])
                appointmentsByDaySlot[dayKey][slotKey] = [];
            appointmentsByDaySlot[dayKey][slotKey].push(ev);
            cur = new Date(cur.getTime() + 30 * 60000);
        }
    });

    // Helpers for date-only comparisons
    const parseDateOnly = (iso) => {
        if (!iso) return null;
        const d = new Date(iso);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    const parseEndDateInclusive = (iso) => {
        if (!iso) return null;
        const d = new Date(iso);
        if (isNaN(d.getTime())) return null;
        const hasTimeComponent = String(iso).includes("T");
        const isMidnight =
            d.getHours() === 0 &&
            d.getMinutes() === 0 &&
            d.getSeconds() === 0;
        if (hasTimeComponent && isMidnight) {
            const prev = new Date(
                d.getFullYear(),
                d.getMonth(),
                d.getDate(),
            );
            prev.setDate(prev.getDate() - 1);
            return prev;
        }
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    // Build range tasks for all-day / multi-day
    const buildRangeTasks = () => {
        const ranges = [];
        (Array.isArray(todos) ? todos : []).forEach((t) => {
            const sIso = t.startDate || t.dueDate || t.endDate || null;
            const eIso = t.endDate || t.dueDate || t.startDate || null;
            let s = parseDateOnly(sIso);
            let e = parseEndDateInclusive(eIso);
            if (!s && !e) return;
            if (s && e && s > e) {
                const tmp = s;
                s = e;
                e = tmp;
            }
            if (!s) s = e;
            if (!e) e = s;
            const isSingleDay = s.getTime() === e.getTime();
            const hasStartTime = !!t.startDate;
            if (isSingleDay && hasStartTime) return;
            const spanDays = Math.max(
                1,
                Math.round(
                    (e - s) / (24 * 60 * 60 * 1000),
                ) + 1,
            );
            const startKey = `${s.getFullYear()}-${String(
                s.getMonth() + 1,
            ).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;
            ranges.push({ task: t, start: s, end: e, spanDays, startKey });
        });

        const groupsMap = new Map();
        for (const r of ranges) {
            if (!groupsMap.has(r.startKey)) groupsMap.set(r.startKey, []);
            groupsMap.get(r.startKey).push(r);
        }
        const groups = Array.from(groupsMap.values()).map((items) => {
            const maxSpan = items.reduce(
                (m, it) => Math.max(m, it.spanDays),
                1,
            );
            const startDate = items[0].start;
            items.sort((a, b) => {
                if (b.spanDays !== a.spanDays)
                    return b.spanDays - a.spanDays;
                return String(a.task.title || "").localeCompare(
                    String(b.task.title || ""),
                );
            });
            return { items, maxSpan, startDate };
        });
        groups.sort((ga, gb) => {
            if (gb.maxSpan !== ga.maxSpan) return gb.maxSpan - ga.maxSpan;
            return ga.startDate - gb.startDate;
        });
        const out = [];
        let lane = 0;
        for (const g of groups) {
            for (const it of g.items) {
                out.push({ ...it, lane });
                lane += 1;
            }
        }
        return out;
    };

    const rangeTasks = buildRangeTasks();
    const lanesCount = Math.min(rangeTasks.length, 20);

    useEffect(() => {
        try {
            console.debug("[MonthView] rangeTasks computed", { count: rangeTasks.length, rangeTasks: rangeTasks.slice(0, 50), todosCount: (todos || []).length });
        } catch (e) {}
    }, [rangeTasks, todos]);

    const gridRef = useRef(null);
    const redLineRef = useRef(null);
    const dayRowRefs = useRef([]);
    const [highlightToday, setHighlightToday] = useState(false);
    const tableRef = useRef(null);
    const rightScrollRef = useRef(null);
    const lastRightScrollLeft = useRef(0);
    const [rowOverlay, setRowOverlay] = useState(null);

    // All-day overlay metrics (still based on left all-day cells)
    const allDayRefs = useRef([]);
    const [overlayMetrics, setOverlayMetrics] = useState({
        colLeft: 0,
        colWidth: 0,
        rows: [],
    });

    useLayoutEffect(() => {
        const container = gridRef.current;
        if (!container) return;
        const crect = container.getBoundingClientRect();
        const rows = allDayRefs.current
            .filter(Boolean)
            .map((el) => {
                const r = el.getBoundingClientRect();
                return {
                    top: r.top - crect.top + container.scrollTop,
                    bottom: r.bottom - crect.top + container.scrollTop,
                    height: r.height,
                };
            });
        const first = allDayRefs.current.find(Boolean);
        if (!first) {
            setOverlayMetrics({ colLeft: 0, colWidth: 0, rows });
            return;
        }
        const fr = first.getBoundingClientRect();
        const colLeft = fr.left - crect.left + container.scrollLeft;
        const colWidth = fr.width;
        setOverlayMetrics({ colLeft, colWidth, rows });
    }, [year, month, daysInMonth, todos]);

    useEffect(() => {
        const measure = () => {
            const container = gridRef.current;
            if (!container) return;
            const crect = container.getBoundingClientRect();
            const rows = allDayRefs.current
                .filter(Boolean)
                .map((el) => {
                    const r = el.getBoundingClientRect();
                    return {
                        top: r.top - crect.top + container.scrollTop,
                        bottom: r.bottom - crect.top + container.scrollTop,
                        height: r.height,
                    };
                });
            const first = allDayRefs.current.find(Boolean);
            if (!first) return;
            const fr = first.getBoundingClientRect();
            const colLeft = fr.left - crect.left + container.scrollLeft;
            const colWidth = fr.width;
            setOverlayMetrics({ colLeft, colWidth, rows });
        };
        const onResize = () => measure();
        const el = gridRef.current;
        window.addEventListener("resize", onResize);
        el?.addEventListener("scroll", measure);
        return () => {
            window.removeEventListener("resize", onResize);
            el?.removeEventListener("scroll", measure);
        };
    }, []);

    useEffect(() => {
        try {
            console.debug("[MonthView debug]", {
                overlayMetrics,
                rangeCount: (rangeTasks || []).length,
            });
        } catch (e) {}
    }, [overlayMetrics, rangeTasks.length]);

    useEffect(() => {
        try {
            if (
                !overlayMetrics ||
                !overlayMetrics.rows ||
                overlayMetrics.rows.length === 0
            )
                return;
            if (!Array.isArray(rangeTasks) || rangeTasks.length === 0) return;
            const laneWidth = LANE_WIDTH;
            const gap = LANE_GAP;
            const maxLanes = Math.max(
                1,
                Math.floor(
                    (overlayMetrics.colWidth + gap) /
                        (laneWidth + gap),
                ),
            );
            const details = rangeTasks.map((r) => {
                const startIdx = Math.max(
                    0,
                    r.start.getMonth() === month
                        ? r.start.getDate() - 1
                        : 0,
                );
                const endIdx = Math.min(
                    overlayMetrics.rows.length - 1,
                    r.end.getMonth() === month
                        ? r.end.getDate() - 1
                        : overlayMetrics.rows.length - 1,
                );
                const top = overlayMetrics.rows[startIdx]?.top ?? 0;
                const bottom =
                    overlayMetrics.rows[endIdx]?.bottom ?? top;
                const height = Math.max(0, bottom - top);
                const barWidth = Math.max(
                    20,
                    Math.min(
                        CENTERED_BAR_WIDTH,
                        laneWidth,
                        (overlayMetrics.colWidth || ALL_DAY_COL_WIDTH) - 8,
                    ),
                );
                const left = Math.round(Math.max(0, ((overlayMetrics.colWidth || ALL_DAY_COL_WIDTH) - barWidth) / 2));
                return {
                    id: r.task?.id,
                    title: r.task?.title,
                    lane: r.lane,
                    startIdx,
                    endIdx,
                    top,
                    bottom,
                    height,
                    left,
                    visibleInMonth: !(startIdx > endIdx),
                };
            });
            console.debug("[MonthView ranges]", {
                overlayMetricsSummary: {
                    colLeft: overlayMetrics.colLeft,
                    colWidth: overlayMetrics.colWidth,
                    rows: overlayMetrics.rows.length,
                },
                ranges: details,
            });
        } catch (e) {
            try {
                console.debug("[MonthView ranges] error", e);
            } catch (_) {}
        }
    }, [overlayMetrics, rangeTasks]);

    // --- ENSURE LEFT + RIGHT ROW HEIGHTS MATCH ---
    const syncRowHeights = () => {
        const leftRows = document.querySelectorAll(".mv-left-row");
        const rightRows = document.querySelectorAll(".mv-right-row");
        if (!leftRows.length || !rightRows.length) return;

        leftRows.forEach((leftRow, idx) => {
            const rightRow = rightRows[idx];
            if (!rightRow) return;

            // Clear any previously set inline heights so measurement is accurate
            try {
                leftRow.style.height = "";
                rightRow.style.height = "";
                // also clear td/th heights
                leftRow.querySelectorAll("td,th").forEach((c) => (c.style.height = ""));
                rightRow.querySelectorAll("td,th").forEach((c) => (c.style.height = ""));
            } catch (e) {}

            const leftRect = leftRow.getBoundingClientRect();
            const rightRect = rightRow.getBoundingClientRect();
            const leftH = leftRect.height;
            const rightH = rightRect.height;
            const finalH = Math.max(leftH, rightH);

            try {
                // Apply the computed height to the row and its cells so table layout respects it.
                leftRow.style.height = finalH + "px";
                rightRow.style.height = finalH + "px";
                leftRow.querySelectorAll("td,th").forEach((c) => {
                    c.style.height = finalH + "px";
                    c.style.boxSizing = "border-box";
                });
                rightRow.querySelectorAll("td,th").forEach((c) => {
                    c.style.height = finalH + "px";
                    c.style.boxSizing = "border-box";
                });
            } catch (e) {}
        });
    };

    // Ensure the DOM has the same number of left and right rows. In some
    // situations (hydration timing / refs not yet attached) one side may be
    // missing rows; create lightweight, generated spacer rows in the shorter
    // table so height-sync logic can operate on a 1:1 basis.
    const ensureRowCountMatches = () => {
        try {
            // clean any previously generated placeholder rows first
            document.querySelectorAll('[data-generated="mv-placeholder"]').forEach((n) => n.remove());

            const leftRows = Array.from(document.querySelectorAll('.mv-left-row'));
            const rightRows = Array.from(document.querySelectorAll('.mv-right-row'));
            const leftCount = leftRows.length;
            const rightCount = rightRows.length;
            if (leftCount === 0 && rightCount === 0) return;

            // If counts already match, nothing to do.
            if (leftCount === rightCount) return;

            // Identify table bodies to append placeholder rows into.
            const rightTbody = tableRef.current?.querySelector('tbody');
            let leftTbody = null;
            if (leftRows[0]) {
                const leftTable = leftRows[0].closest('table');
                leftTbody = leftTable?.querySelector('tbody');
            }

            if (!rightTbody && !leftTbody) return;

            // Helper to create a right-side placeholder row matching the
            // right table's column count (hour slots). These rows are
            // visually hidden but present for measurement.
            const createRightPlaceholder = () => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-generated', 'mv-placeholder');
                tr.className = 'bg-white mv-right-row';
                tr.style.visibility = 'hidden';
                tr.style.pointerEvents = 'none';
                for (let i = 0; i < Math.max(1, HOUR_SLOTS.length); i++) {
                    const td = document.createElement('td');
                    td.className = 'relative px-1 py-2 text-center align-top w-16';
                    td.style.minWidth = '40px';
                    tr.appendChild(td);
                }
                return tr;
            };

            // Helper to create a left-side placeholder row matching the left
            // table structure (date cell + all-day cell)
            const createLeftPlaceholder = () => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-generated', 'mv-placeholder');
                tr.className = 'bg-white mv-left-row';
                tr.style.visibility = 'hidden';
                tr.style.pointerEvents = 'none';
                const tdDate = document.createElement('td');
                tdDate.className = 'px-2 py-2 text-sm font-semibold';
                tdDate.style.width = '96px';
                const tdAllDay = document.createElement('td');
                tdAllDay.className = 'px-1 py-0 text-left align-top';
                tdAllDay.style.width = `${ALL_DAY_COL_WIDTH}px`;
                tr.appendChild(tdDate);
                tr.appendChild(tdAllDay);
                return tr;
            };

            if (rightCount < leftCount && rightTbody) {
                const missing = leftCount - rightCount;
                for (let i = 0; i < missing; i++) rightTbody.appendChild(createRightPlaceholder());
            } else if (leftCount < rightCount && leftTbody) {
                const missing = rightCount - leftCount;
                for (let i = 0; i < missing; i++) leftTbody.appendChild(createLeftPlaceholder());
            }
        } catch (e) {
            try { console.debug('[MonthView] ensureRowCountMatches error', e); } catch (_) {}
        }
    };

    useEffect(() => {
        // initial sync - ensure both sides have matching row counts first
        ensureRowCountMatches();
        // then sync heights
        syncRowHeights();

        const container = gridRef.current;
        if (container && "ResizeObserver" in window) {
            const ro = new ResizeObserver(() => {
                ensureRowCountMatches();
                syncRowHeights();
            });
            ro.observe(container);

            const onWin = () => {
                ensureRowCountMatches();
                syncRowHeights();
            };
            window.addEventListener("resize", onWin);
            return () => {
                ro.disconnect();
                window.removeEventListener("resize", onWin);
            };
        } else {
            const onWin = () => {
                ensureRowCountMatches();
                syncRowHeights();
            };
            window.addEventListener("resize", onWin);
            return () => {
                window.removeEventListener("resize", onWin);
            };
        }
    }, [monthDays.length]);

    // Ensure row heights stay synced when the right-side (hours) wrapper mounts or resizes.
    useEffect(() => {
        // ensure consistent row count first, then sync heights
        ensureRowCountMatches();
        syncRowHeights();
        const el = rightScrollRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => {
            ensureRowCountMatches();
            syncRowHeights();
        });
        ro.observe(el);
        // Listen for horizontal scrolling so we can re-run the height sync
        // if the scrollLeft changes (this avoids layout jitter when the
        // horizontal scrollbar appears/disappears).
        const onRightScroll = (e) => {
            try {
                const sl = (e && e.target && typeof e.target.scrollLeft === 'number') ? e.target.scrollLeft : el.scrollLeft;
                if (lastRightScrollLeft.current !== sl) {
                    lastRightScrollLeft.current = sl;
                    ensureRowCountMatches();
                    syncRowHeights();
                }
            } catch (err) {
                try { console.debug('[MonthView] right scroll handler error', err); } catch (_) {}
            }
        };
        el.addEventListener('scroll', onRightScroll, { passive: true });
        return () => {
            try { ro.disconnect(); } catch (_) {}
            try { el.removeEventListener('scroll', onRightScroll); } catch (_) {}
        };
    }, [rightScrollRef.current, monthDays.length]);

    // Keep vertical scrolling synchronized between the left column (gridRef)
    // and the right hours wrapper so both columns scroll together vertically.
    useEffect(() => {
        // Only listen to the outer container's vertical scroll and mirror
        // that into the right hours wrapper. Do NOT listen to the right
        // wrapper's scroll events because it remains horizontally-scrollable
        // and its scroll events (horizontal) would otherwise incorrectly
        // reset vertical position.
        const left = gridRef.current;
        const right = rightScrollRef.current;
        if (!left || !right) return;

        let syncing = false;

        const onLeftScroll = () => {
            if (syncing) return;
            try {
                syncing = true;
                // mirror vertical scroll from outer container into right wrapper
                right.scrollTop = left.scrollTop;
            } finally {
                // small timeout to avoid re-entrancy
                setTimeout(() => (syncing = false), 0);
            }
        };

        left.addEventListener("scroll", onLeftScroll, { passive: true });

        return () => {
            try { left.removeEventListener("scroll", onLeftScroll); } catch (_) {}
        };
    }, [gridRef.current, rightScrollRef.current]);

    // Vertical red line for current time
    useEffect(() => {
        if (!gridRef.current || !tableRef.current) return undefined;

        let rafId = null;
        const wrapper = () => rightScrollRef.current;
        const containerEl = () => gridRef.current;

        // Compute and position the red-line inside the right-side wrapper.
        // The line is placed inside the wrapper so horizontal scrolling moves
        // it naturally (no JS updates required for horizontal scroll) — we
        // only update once per rAF / second for time progression and on
        // resize/layout changes.
        const computeAndSetLeft = (now = new Date()) => {
            try {
                const table = tableRef.current;
                const wrap = wrapper();
                const container = containerEl();
                if (!table || !wrap || !container) return;

                if (now.getMonth() !== month) {
                    try { if (redLineRef.current) {
                        redLineRef.current.style.left = '-9999px';
                        redLineRef.current.style.top = '0px';
                        redLineRef.current.style.height = '0px';
                    } } catch (_) {}
                    return;
                }

                const hourIdx = HOUR_SLOTS.findIndex((h) => {
                    const [hr] = h.split(":");
                    return now.getHours() === Number(hr);
                });
                if (hourIdx === -1) {
                    try { if (redLineRef.current) redLineRef.current.style.left = '-9999px'; } catch (_) {}
                    return;
                }

                const ths = table.querySelectorAll("thead th");
                const targetTh = ths[hourIdx];
                if (!targetTh) {
                    try { if (redLineRef.current) redLineRef.current.style.left = '-9999px'; } catch (_) {}
                    return;
                }

                const colWidth = targetTh.offsetWidth || HOUR_COL_WIDTH;

                // left within the table/wrapper content coordinates
                const minutes = now.getMinutes();
                const seconds = now.getSeconds();
                const fraction = (minutes + seconds / 60) / 60; // fraction inside the hour
                const leftWithinTable = (targetTh.offsetLeft || 0) + fraction * colWidth;

                // Compute vertical top/height using the first/last all-day row
                const rows = allDayRefs.current.filter(Boolean);
                if (!rows.length) {
                    try { if (redLineRef.current) redLineRef.current.style.left = '-9999px'; } catch (_) {}
                    return;
                }

                const firstRect = rows[0].getBoundingClientRect();
                const lastRect = rows[rows.length - 1].getBoundingClientRect();
                const wrapRect = wrap.getBoundingClientRect();

                // top relative to the wrapper's content coordinate space
                const topInWrapper = firstRect.top - wrapRect.top + (wrap.scrollTop || 0);
                const bottomInWrapper = lastRect.bottom - wrapRect.top + (wrap.scrollTop || 0);
                const height = Math.max(0, bottomInWrapper - topInWrapper);

                try {
                    const el = redLineRef.current;
                    if (!el) return;
                    el.style.left = `${leftWithinTable}px`;
                    el.style.top = `${Math.max(0, topInWrapper)}px`;
                    el.style.height = `${height}px`;
                    el.style.transform = 'translateX(-50%)';
                } catch (_) {}
            } catch (e) {
                try { if (redLineRef.current) redLineRef.current.style.left = '-9999px'; } catch (_) {}
            }
        };

        // Throttle updates via rAF during scroll
        const scheduleCompute = () => {
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                computeAndSetLeft();
                rafId = null;
            });
        };

        // Initial compute (defensive)
        try { computeAndSetLeft(); } catch (_) {}

        // Use a lightweight loop: schedule a rAF measurement then wait ~1s
        // before scheduling the next rAF. This reduces main-thread work
        // compared to a tight setInterval and avoids long setTimeout
        // handler overruns while keeping the indicator moving.
        let timeoutId = null;
        let running = true;
        const tick = () => {
            if (!running) return;
            requestAnimationFrame(() => {
                try { computeAndSetLeft(new Date()); } catch (_) {}
            });
            timeoutId = setTimeout(tick, 1000);
        };
        tick();

        const onResize = () => scheduleCompute();
        window.addEventListener("resize", onResize);

        // Listen to the outer container's vertical scroll to schedule recompute.
        const contEl = gridRef.current;
        contEl?.addEventListener("scroll", scheduleCompute, { passive: true });

        return () => {
            running = false;
            try { clearTimeout(timeoutId); } catch (_) {}
            window.removeEventListener("resize", onResize);
            try { contEl?.removeEventListener("scroll", scheduleCompute); } catch (_) {}
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [month, HOUR_SLOTS]);

    // Today highlight (kept from your original)
    useEffect(() => {
        if (!highlightToday) return;
        if (
            year !== today.getFullYear() ||
            month !== today.getMonth()
        )
            return;

        const idx = today.getDate() - 1;
        const el = dayRowRefs.current[idx];
        const container = gridRef.current;
        const table = tableRef.current;
        if (!el || !container || !table) {
            setHighlightToday(false);
            return;
        }

        try {
            try {
                el.scrollIntoView &&
                    el.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
            } catch (__) {}
            el.focus && el.focus({ preventScroll: true });
        } catch (e) {}

        const containerRect = container.getBoundingClientRect();
        const tableRect = table.getBoundingClientRect();
        const rowRect = el.getBoundingClientRect();

        const inset = 2;
        const left =
            tableRect.left - containerRect.left + container.scrollLeft;
        const width = Math.max(0, tableRect.width);
        const top =
            rowRect.top -
            containerRect.top +
            container.scrollTop +
            inset;
        const height = Math.max(0, rowRect.height - inset * 2);

        try {
            console.debug("[MonthView] today overlay coords", {
                left,
                top,
                width,
                height,
                containerRect,
                tableRect,
                rowRect,
            });
        } catch (_) {}
        setRowOverlay({ left, top, width, height, visible: true });

        const totalMs = 450 * 4 + 100;
        const t = setTimeout(() => setRowOverlay(null), totalMs);
        setHighlightToday(false);
        return () => {
            clearTimeout(t);
            setRowOverlay(null);
            setHighlightToday(false);
        };
    }, [highlightToday, year, month]);

    const [showViewMenu, setShowViewMenu] = useState(false);

    return (
        <>
            <style>{`
                @keyframes blinkRow {
                    0% {
                        background-color: rgba(59,130,246,0.12) !important;
                        box-shadow: none !important;
                    }
                    25% {
                        background-color: rgba(59,130,246,0.6) !important;
                        box-shadow: 0 0 0 10px rgba(59,130,246,0.18) !important;
                    }
                    50% {
                        background-color: rgba(59,130,246,0.12) !important;
                        box-shadow: none !important;
                    }
                    75% {
                        background-color: rgba(59,130,246,0.6) !important;
                        box-shadow: 0 0 0 10px rgba(59,130,246,0.18) !important;
                    }
                    100% {
                        background-color: rgba(59,130,246,0.12) !important;
                        box-shadow: none !important;
                    }
                }
                .today-row-overlay {
                    animation: blinkRow 0.45s linear 4;
                    background-clip: padding-box;
                    border-radius: 4px;
                }
                .today-blink:focus { outline: none !important; }
            `}</style>

            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <button
                        className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                        style={{ minWidth: 36, minHeight: 36 }}
                        aria-label="Previous month"
                        onClick={() => onShiftDate && onShiftDate(-1)}
                    >
                        <FaChevronLeft />
                    </button>
                    <div className="relative">
                        <button
                            className="px-2 py-1 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center gap-2"
                            style={{ minWidth: 36, minHeight: 28 }}
                            onClick={() =>
                                setShowViewMenu((s) => !s)
                            }
                            aria-haspopup="menu"
                            aria-expanded={
                                showViewMenu ? "true" : "false"
                            }
                        >
                            <span>View</span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                {view &&
                                    view.charAt(0).toUpperCase() +
                                        view.slice(1)}
                            </span>
                            <FaChevronDown
                                className={`${
                                    showViewMenu
                                        ? "rotate-180"
                                        : "rotate-0"
                                } transition-transform`}
                            />
                        </button>
                        {showViewMenu && (
                            <div
                                role="menu"
                                className="absolute z-50 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
                            >
                                {["day", "week", "month", "quarter", "list"].map(
                                    (v) => (
                                        <button
                                            key={v}
                                            role="menuitemradio"
                                            aria-checked={view === v}
                                            className={`w-full text-left px-3 py-2 text-sm ${
                                                view === v
                                                    ? "bg-blue-50 text-blue-700 font-semibold"
                                                    : "text-slate-700 hover:bg-slate-50"
                                            }`}
                                            onClick={() => {
                                                onChangeView &&
                                                    onChangeView(v);
                                                setShowViewMenu(false);
                                            }}
                                        >
                                            {v.charAt(0).toUpperCase() +
                                                v.slice(1)}
                                        </button>
                                    ),
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <div style={{ position: 'relative', display: 'inline-block', marginRight: 6 }}>
                        <button
                            type="button"
                            aria-label="Choose month"
                            className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-100"
                            onClick={() => {
                                setPickerYear(baseDate.getFullYear());
                                setShowMonthPicker((s) => !s);
                            }}
                        >
                            <img src={PUBLIC_URL + '/calendar.png'} alt="Calendar" style={{ width: 18, height: 18 }} />
                        </button>

                        {showMonthPicker && (
                            <div className="w-80 rounded-[26px] bg-white shadow-xl p-4 flex flex-col gap-4"
                                style={{ position: 'absolute', top: 36, left: 0, zIndex: 300 }}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setPickerYear((y) => y - 1)}
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    >
                                        <FaChevronLeft className="text-xs" />
                                    </button>

                                    <div className="px-6 py-1.5 rounded-full bg-slate-100 text-slate-900 text-sm font-semibold tracking-wide">
                                        {pickerYear}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setPickerYear((y) => y + 1)}
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    >
                                        <FaChevronRight className="text-xs" />
                                    </button>
                                </div>

                                {/* Months grid */}
                                <div className="grid grid-cols-3 gap-x-6 gap-y-4 text-center">
                                    {MONTHS.map((m) => {
                                        const isSelected = pickerYear === baseDate.getFullYear() && baseDate.getMonth() === m.index;

                                        const base =
                                            "flex flex-col items-center justify-center rounded-2xl px-2 py-1.5 cursor-pointer transition-colors";
                                        const state = isSelected
                                            ? "bg-blue-50 border border-blue-400 text-blue-700"
                                            : "border border-transparent text-slate-900 hover:bg-slate-50";

                                        return (
                                            <button
                                                key={m.index}
                                                type="button"
                                                onClick={() => {
                                                    try {
                                                        const src = currentDate || today;
                                                        const target = new Date(pickerYear, m.index, 1);
                                                        const monthsDiff = (target.getFullYear() - src.getFullYear()) * 12 + (target.getMonth() - src.getMonth());
                                                        if (typeof onShiftDate === 'function') onShiftDate(monthsDiff);
                                                    } catch (e) {}
                                                    setShowMonthPicker(false);
                                                }}
                                                className={`${base} ${state}`}
                                            >
                                                <span className="text-sm font-semibold leading-tight">
                                                    {m.short}
                                                </span>
                                                <span className="text-[11px] text-slate-500 leading-tight">
                                                    {m.long}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    {formatDate(baseDate, { longMonth: true })}
                    {prefsLoading && (
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                            Loading
                        </span>
                    )}
                </h2>
                {/* month picker is a custom popover (see calendar button) */}
                <div className="flex items-center gap-2">
                    <button
                        className="px-3 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50"
                        style={{ minHeight: 36 }}
                        aria-label="Today"
                        onClick={() => {
                            try {
                                setHighlightToday(true);
                                if (typeof onShiftDate === "function") {
                                    const src = currentDate || today;
                                    const target = new Date();
                                    const monthsDiff =
                                        (target.getFullYear() -
                                            src.getFullYear()) *
                                            12 +
                                        (target.getMonth() -
                                            src.getMonth());
                                    onShiftDate(monthsDiff);
                                }
                            } catch (e) {}
                        }}
                    >
                        Today
                    </button>
                    <button
                        className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                        style={{ minWidth: 36, minHeight: 36 }}
                        aria-label="Next month"
                        onClick={() => onShiftDate && onShiftDate(1)}
                    >
                        <FaChevronRight />
                    </button>
                </div>
            </div>

            {/* BODY */}
            <div
                className="p-0"
                style={{ overflowX: "hidden", maxWidth: "100vw" }}
            >
                <div
                    ref={gridRef}
                        className="relative pb-6"
                        style={{
                            height: 600,
                            overflowX: "hidden",
                            overflowY: "auto",
                            scrollBehavior: "smooth",
                            contain: "paint",
                            willChange: "scroll-position",
                        }}
                >
                    <div className="flex">
                            {/* Today row overlay */}
                            {rowOverlay && rowOverlay.visible && (
                                <div
                                    className="today-row-overlay"
                                    style={{
                                        position: "absolute",
                                        left: rowOverlay.left,
                                        top: rowOverlay.top,
                                        width: rowOverlay.width,
                                        height: rowOverlay.height,
                                        zIndex: 120,
                                        pointerEvents: "none",
                                        backgroundColor:
                                            "rgba(59,130,246,0.32)",
                                        borderRadius: 4,
                                        animation: "blinkRow 0.45s linear 4",
                                    }}
                                />
                            )}
                        {/* LEFT: date + all-day */}
                        <table
                            className="border border-gray-200 rounded-l-lg"
                            style={{
                                borderCollapse: "separate",
                                borderSpacing: 0,
                                width: 96 + ALL_DAY_COL_WIDTH,
                                minWidth: 96 + ALL_DAY_COL_WIDTH,
                                maxWidth: 96 + ALL_DAY_COL_WIDTH,
                                tableLayout: "fixed",
                            }}
                        >
                            <thead>
                                <tr className="bg-white">
                                    {/* Week column removed — week numbers will be shown inside the date cell on Mondays */}
                                    <th
                                        className="text-left px-2 py-2 text-xs font-semibold text-gray-400"
                                        style={{
                                            width: "96px",
                                            minWidth: "96px",
                                            maxWidth: "96px",
                                            borderRight: "2px solid rgba(226,232,240,1)",
                                            boxSizing: "border-box",
                                        }}
                                    >
                                        Date
                                    </th>
                                    <th
                                        className="text-center px-2 py-2 text-xs font-semibold text-gray-400"
                                        style={{
                                            width: `${ALL_DAY_COL_WIDTH}px`,
                                            minWidth: `${ALL_DAY_COL_WIDTH}px`,
                                            maxWidth: `${ALL_DAY_COL_WIDTH}px`,
                                            boxSizing: "border-box",
                                            borderLeft: "2px solid rgba(226,232,240,1)",
                                            borderRight: "2px solid rgba(226,232,240,1)",
                                        }}
                                    >
                                        <span className="ml-2 px-2 py-1 rounded bg-emerald-500 text-white text-[11px] font-semibold">
                                            All-Day
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthDays.map((date, idx) => {
                                    const isWeekend =
                                        date.getDay() === 0 ||
                                        date.getDay() === 6;
                                    const isToday =
                                        date.getDate() ===
                                            (currentDate || today).getDate() &&
                                        date.getMonth() ===
                                            (currentDate || today).getMonth() &&
                                        date.getFullYear() ===
                                            (currentDate || today).getFullYear();

                                    // Determine if this row is covered by a previous
                                    // week's rowspan. If so, we must NOT render any
                                    // cell for the Week column here — the earlier
                                    // rowspan occupies that column for this row.
                                    let coveredByPrevWeek = false;
                                    for (const k in weekCells) {
                                        const start = parseInt(k, 10);
                                        const span = weekCells[k].rowSpan;
                                        if (start < idx && start + span > idx) {
                                            coveredByPrevWeek = true;
                                            break;
                                        }
                                    }

                                    return (
                                        <tr
                                            key={idx}
                                            className="bg-white mv-left-row"
                                        >
                                            {/* Week column removed; week numbers are shown inside the date cell for Mondays */}
                                            <td
                                                className={`px-2 py-2 text-sm font-semibold ${
                                                    isWeekend
                                                        ? "text-red-500"
                                                        : "text-gray-700"
                                                } ${
                                                    isToday
                                                        ? "text-blue-600"
                                                        : ""
                                                }`}
                                                style={{
                                                    width: "96px",
                                                    minWidth: "96px",
                                                    maxWidth: "96px",
                                                    borderRight:
                                                        "2px solid rgba(226,232,240,1)",
                                                    boxSizing: "border-box",
                                                }}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        {new Intl.DateTimeFormat(
                                                            undefined,
                                                            {
                                                                weekday: "short",
                                                                day: "numeric",
                                                                timeZone: userTimeZone,
                                                            },
                                                        ).format(date)}
                                                    </div>
                                                    {weekCells[idx] && weekCells[idx].weekNumber ? (
                                                        <div className="text-[11px] text-slate-500">
                                                            {weekCells[idx].weekNumber}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td
                                                ref={(el) =>
                                                    (allDayRefs.current[idx] =
                                                        el)
                                                }
                                                className="px-1 py-0 text-left align-top"
                                                style={{
                                                    width: `${ALL_DAY_COL_WIDTH}px`,
                                                    minWidth: `${ALL_DAY_COL_WIDTH}px`,
                                                    maxWidth: `${ALL_DAY_COL_WIDTH}px`,
                                                    boxSizing: "border-box",
                                                    borderLeft:
                                                        "2px solid rgba(226,232,240,1)",
                                                    borderRight:
                                                        "2px solid rgba(226,232,240,1)",
                                                }}
                                            >
                                                <span className="sr-only">all day</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* RIGHT: time grid */}
                        <>
                            {/* Hide the native horizontal scrollbar visually while
                                keeping horizontal scrolling functional. We use
                                vendor properties for Firefox/IE and a WebKit
                                rule for Chromium/Safari. */}
                            <style>{`.no-scrollbar{ -ms-overflow-style: none; scrollbar-width: none; } .no-scrollbar::-webkit-scrollbar{ display: none; height: 0; }`}</style>
                            <div
                                ref={rightScrollRef}
                                className="overflow-x-auto no-scrollbar"
                                // Only allow horizontal scrolling on the right hours wrapper.
                                // Vertical scroll is handled by the outer container (gridRef).
                                // Use scrollbar-gutter: stable to reserve space for the
                                // horizontal scrollbar and avoid layout shifts that change
                                // row heights when the scrollbar appears/disappears.
                                style={{ maxWidth: `calc(100% - ${96 + ALL_DAY_COL_WIDTH}px)`, position: 'relative', overflowY: 'hidden', scrollbarGutter: 'stable', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
                            >
                            <div style={{ position: 'relative' }}>
                            <table
                                ref={tableRef}
                                className="min-w-full border border-gray-200 rounded-r-lg"
                                    style={{
                                    minWidth: Math.max(
                                        800,
                                        HOUR_SLOTS.length * HOUR_COL_WIDTH,
                                    ),
                                    borderCollapse: "separate",
                                    borderSpacing: 0,
                                }}
                            >
                                <thead>
                                    <tr className="bg-white">
                                        {HOUR_SLOTS.map((h, idx) => {
                                            let slotIsWorking = true;
                                            try {
                                                if (isWorkingTime)
                                                    slotIsWorking =
                                                        isWorkingTime(h);
                                            } catch {
                                                slotIsWorking = true;
                                            }
                                            const [hh, mm] = (h || "").split(
                                                ":",
                                            );
                                            const showLabel =
                                                String(mm || "00") === "00";
                                            return (
                                                <th
                                                    key={idx}
                                                    className="text-center px-1 py-2 text-xs font-semibold text-gray-400 w-16"
                                                    style={{
                                                        minWidth: 40,
                                                        backgroundColor:
                                                            slotIsWorking
                                                                ? undefined
                                                                : "#f8fafc",
                                                        opacity: slotIsWorking
                                                            ? 1
                                                            : 0.75,
                                                        borderLeft:
                                                            "1px solid rgba(226,232,240,0.4)",
                                                        borderRight:
                                                            "1px solid rgba(226,232,240,0.4)",
                                                    }}
                                                >
                                                    {showLabel
                                                        ? formatTime
                                                            ? formatTime(h)
                                                            : h
                                                        : ""}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthDays.map((date, idx) => {
                                        const dayKey = `${date.getFullYear()}-${String(
                                            date.getMonth() + 1,
                                        ).padStart(2, "0")}-${String(
                                            date.getDate(),
                                        ).padStart(2, "0")}`;

                                        return (
                                            <tr
                                                key={idx}
                                                ref={(el) =>
                                                    (dayRowRefs.current[idx] =
                                                        el)
                                                }
                                                className="bg-white mv-right-row"
                                                style={{ position: "relative" }}
                                                tabIndex={-1}
                                            >
                                                {HOUR_SLOTS.map((h, hIdx) => {
                                                    let isWorking = true;
                                                    try {
                                                        if (isWorkingTime)
                                                            isWorking =
                                                                isWorkingTime(
                                                                    h,
                                                                );
                                                    } catch {
                                                        isWorking = true;
                                                    }
                                                    const hh =
                                                        (h || "").split(
                                                            ":",
                                                        )[0];
                                                    const hourKey = `${hh.padStart(
                                                        2,
                                                        "0",
                                                    )}:00`;
                                                    const halfKey = `${hh.padStart(
                                                        2,
                                                        "0",
                                                    )}:30`;
                                                    const evs00 =
                                                        appointmentsByDaySlot[
                                                            dayKey
                                                        ]?.[hourKey] || [];
                                                    const evs30 =
                                                        appointmentsByDaySlot[
                                                            dayKey
                                                        ]?.[halfKey] || [];
                                                    const evs = [
                                                        ...evs00,
                                                        ...evs30,
                                                    ];

                                                    return (
                                                        <td
                                                            key={hIdx}
                                                            className="relative px-1 py-2 text-center align-top w-16 cursor-pointer"
                                                            style={{
                                                                minWidth: 40,
                                                                borderLeft:
                                                                    "1px solid rgba(226,232,240,0.4)",
                                                                borderRight:
                                                                    "1px solid rgba(226,232,240,0.4)",
                                                                borderTop:
                                                                    "1px solid rgba(226,232,240,0.35)",
                                                                borderBottom:
                                                                    "1px solid rgba(226,232,240,0.35)",
                                                                backgroundColor:
                                                                    isWorking
                                                                        ? undefined
                                                                        : "#f8fafc",
                                                                opacity: isWorking
                                                                    ? 1
                                                                    : 0.75,
                                                            }}
                                                            onClick={(e) => {
                                                                try {
                                                                    e.stopPropagation();
                                                                } catch {}
                                                                if (onEventClick)
                                                                    onEventClick(
                                                                        {
                                                                            day: date,
                                                                            hour: h,
                                                                        },
                                                                    );
                                                                if (
                                                                    typeof onQuickCreate ===
                                                                    "function"
                                                                ) {
                                                                    const [
                                                                        hr,
                                                                        min,
                                                                    ] = h.split(
                                                                        ":",
                                                                    );
                                                                    const dt =
                                                                        new Date(
                                                                            date.getFullYear(),
                                                                            date.getMonth(),
                                                                            date.getDate(),
                                                                            parseInt(
                                                                                hr,
                                                                                10,
                                                                            ) || 0,
                                                                            parseInt(
                                                                                min,
                                                                                10,
                                                                            ) || 0,
                                                                            0,
                                                                            0,
                                                                        );
                                                                    onQuickCreate(
                                                                        dt,
                                                                    );
                                                                }
                                                            }}
                                                            onDragOver={(e) => {
                                                                try {
                                                                    e.preventDefault();
                                                                    e.dataTransfer.dropEffect =
                                                                        "copy";
                                                                } catch {}
                                                            }}
                                                            onDrop={(e) => {
                                                                try {
                                                                    const taskId = e.dataTransfer.getData("taskId");
                                                                    if (!taskId || typeof onTaskDrop !== "function") return;
                                                                    const [hr, min] = h.split(":");
                                                                    const dt = new Date(
                                                                        date.getFullYear(),
                                                                        date.getMonth(),
                                                                        date.getDate(),
                                                                        parseInt(hr, 10) || 0,
                                                                        parseInt(min, 10) || 0,
                                                                        0,
                                                                        0,
                                                                    );
                                                                    const task = (todos || []).find((t) => String(t.id) === String(taskId));
                                                                    // Pass the dropEffect so parent can decide copy vs move
                                                                    const dropEffect = e.dataTransfer.dropEffect || e.dataTransfer.effectAllowed || "";
                                                                    if (task) onTaskDrop(task, dt, dropEffect);
                                                                } catch {}
                                                            }}
                                                            title="Click to add appointment"
                                                        >
                                                            {evs.map(
                                                                (ev, appIdx) => {
                                                                    const color =
                                                                        categories?.[
                                                                            ev.kind
                                                                        ]
                                                                            ?.color ||
                                                                        "bg-gray-200";
                                                                    const icon =
                                                                        categories?.[
                                                                            ev.kind
                                                                        ]
                                                                            ?.icon ||
                                                                        "";
                                                                    return (
                                                                        <div
                                                                            key={
                                                                                appIdx
                                                                            }
                                                                            className={`absolute inset-0 mx-1 my-1 px-2 py-1 rounded cursor-pointer flex items-center gap-1 overflow-hidden group ${color}`}
                                                                            style={{
                                                                                zIndex: 10,
                                                                            }}
                                                                            title={
                                                                                ev.title
                                                                            }
                                                                            onClick={(
                                                                                e,
                                                                            ) => {
                                                                                e.stopPropagation();
                                                                                onEventClick &&
                                                                                    onEventClick(
                                                                                        ev,
                                                                                        "edit",
                                                                                    );
                                                                            }}
                                                                        >
                                                                            <span className="shrink-0 text-xs">
                                                                                {
                                                                                    icon
                                                                                }
                                                                            </span>
                                                                            <span className="truncate whitespace-nowrap text-xs min-w-0 flex-1">
                                                                                {
                                                                                    ev.title
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                },
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                                {/* Red line (rendered inside the right hours wrapper so it scrolls horizontally with the table
                                    and avoids layout jitter while the left container handles vertical scrolling) */}
                                <div
                                    ref={redLineRef}
                                    aria-hidden="true"
                                    style={{
                                        position: 'absolute',
                                        left: '-9999px',
                                        top: 0,
                                        height: '0px',
                                        width: '1px',
                                        background: 'red',
                                        willChange: 'left, top, height, transform',
                                        transform: 'translateX(-50%)',
                                        zIndex: 20,
                                        pointerEvents: 'none',
                                    }}
                                />

                            </div>

                        </div>
                        </>
                    </div>

                    {/* Red line is rendered inside the right-side wrapper (see above) */}

                    {/* Today row overlay */}
                    {rowOverlay && rowOverlay.visible && (
                        <div
                            className="today-row-overlay"
                            style={{
                                position: "absolute",
                                left: rowOverlay.left,
                                top: rowOverlay.top,
                                width: rowOverlay.width,
                                height: rowOverlay.height,
                                zIndex: 120,
                                pointerEvents: "none",
                                backgroundColor:
                                    "rgba(59,130,246,0.32)",
                                borderRadius: 4,
                                animation: "blinkRow 0.45s linear 4",
                            }}
                        />
                    )}

                    

                    {/* All-day range overlay (render bars that span start -> end vertically in the left all-day column) */}
                    {overlayMetrics.rows.length > 0 && lanesCount > 0 && (
                        <div
                            className="absolute"
                            style={{
                                left: overlayMetrics.colLeft,
                                width: overlayMetrics.colWidth,
                                top: 0,
                                bottom: 0,
                                zIndex: 140,
                                pointerEvents: "none",
                            }}
                        >
                            {rangeTasks.map((r) => {
                                try {
                                    if (r.lane >= lanesCount) return null;
                                    const laneWidth = LANE_WIDTH;
                                    const gap = LANE_GAP;
                                    const startIdx = Math.max(
                                        0,
                                        r.start.getMonth() === month ? r.start.getDate() - 1 : 0,
                                    );
                                    const endIdx = Math.min(
                                        overlayMetrics.rows.length - 1,
                                        r.end.getMonth() === month ? r.end.getDate() - 1 : overlayMetrics.rows.length - 1,
                                    );
                                    if (startIdx > endIdx) return null;
                                    const top = overlayMetrics.rows[startIdx]?.top ?? 0;
                                    const bottom = overlayMetrics.rows[endIdx]?.bottom ?? top;
                                    // Base top/bottom for the range (span across days)
                                    const heightRaw = Math.max(2, bottom - top);
                                    // Use a fixed lane height for stacking and offset each lane vertically
                                    const laneHeight = LANE_HEIGHT;
                                    const laneOffset = r.lane * (laneHeight + LANE_GAP);
                                    const topShifted = top + laneOffset;
                                    const bottomShifted = bottom + laneOffset;
                                    const height = Math.max(2, bottomShifted - topShifted);
                                    // Bar width: use most of the all-day column with small padding
                                    const barWidth = Math.max(20, Math.min(overlayMetrics.colWidth - 12, CENTERED_BAR_WIDTH));
                                    const left = Math.round(Math.max(4, (overlayMetrics.colWidth - barWidth) / 2));

                                    // Determine color: prefer key-area color first, then category color.
                                    const ka = keyAreaMap?.[String(r.task?.keyAreaId || r.task?.key_area_id)];
                                    let categoryColor = ka?.color || categories?.[r.task?.kind]?.color;
                                    const isTailwind = typeof categoryColor === "string" && categoryColor.startsWith("bg-");
                                    const isColorStr = typeof categoryColor === "string" && !isTailwind;
                                    const classForBg = isTailwind ? categoryColor : "";
                                    const classForBgFinal = classForBg || "bg-gray-200";
                                    const resolvedTailwind = isTailwind ? tailwindColorCache[categoryColor] : null;
                                    const resolved = isColorStr ? categoryColor : resolvedTailwind;

                                    // Text color heuristic / computed contrast
                                    let textClass = "text-slate-800"; // default darker text for light fallback
                                    if (isTailwind && classForBg.match(/-(50|100|200|300)(\b|$)/)) textClass = "text-slate-800";
                                    else if (!isTailwind && resolved) {
                                        // resolved explicit color -> compute contrast
                                        // textClass will be applied only when no resolved color
                                        textClass = "text-white";
                                    }

                                    const styleBg = resolved
                                        ? {
                                              backgroundColor: resolved,
                                              border: `1px solid ${resolved}`,
                                              color: getContrastTextColor(resolved),
                                          }
                                        : {};

                                    return (
                                        <div
                                            key={`ov-${r.task?.id || String(Math.random())}`}
                                            className={`${classForBgFinal} ${!resolved ? textClass : ''}`}
                                            style={{
                                                position: "absolute",
                                                top,
                                                left,
                                                width: barWidth,
                                                height,
                                                overflow: "hidden",
                                                zIndex: 150,
                                                display: "flex",
                                                alignItems: "center",
                                                paddingLeft: 8,
                                                paddingRight: 8,
                                                borderRadius: 6,
                                                pointerEvents: "auto",
                                                boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                                                ...styleBg,
                                            }}
                                            title={r.task?.title}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (typeof onTaskClick === "function") onTaskClick(r.task);
                                            }}
                                        >
                                            <span className="shrink-0 text-xs" style={{ pointerEvents: "none" }}>
                                                {categories?.[r.task?.kind]?.icon || ""}
                                            </span>
                                            <span className="truncate whitespace-nowrap text-xs min-w-0 flex-1" style={{ pointerEvents: "none" }}>
                                                {r.task?.title}
                                            </span>
                                        </div>
                                    );
                                } catch (e) {
                                    return null;
                                }
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
