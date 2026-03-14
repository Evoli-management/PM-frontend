import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FaChevronLeft, FaChevronRight, FaChevronDown, FaEdit, FaTrash } from "react-icons/fa";
import { useCalendarPreferences } from "../../hooks/useCalendarPreferences";
import CalendarViewTopSection from "./CalendarViewTopSection";

function getWeekNumber(date) {
    // ISO week number (weeks start on Monday)
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number (with Sunday=7)
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return weekNo;
}

// Return three consecutive months starting from the given date's month
// and optionally shifted by `monthOffset` months. This enables sliding
// quarter windows like Jan–Mar -> Feb–Apr -> Mar–May when the container
// changes the currentDate by single-month steps.
function getQuarterMonths(date, monthOffset = 0) {
    const month = date.getMonth();
    const year = date.getFullYear();
    return [0, 1, 2].map((i) => new Date(year, month + monthOffset + i, 1));
}

function getWeeksInQuarter(months) {
    // Build a matrix: each row is a day (by day number), columns are months
    const monthDays = months.map((monthDate) => {
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        return Array.from(
            { length: daysInMonth },
            (_, i) => new Date(monthDate.getFullYear(), monthDate.getMonth(), i + 1),
        );
    });
    // Find the max number of days in the quarter
    const maxDays = Math.max(...monthDays.map((arr) => arr.length));
    // Build rows: each row is a day index (0-based), columns are months
    const rows = Array.from({ length: maxDays }, (_, dayIdx) => monthDays.map((monthArr) => monthArr[dayIdx]));
    return rows;
}

function hexToRgb(hex) {
    if (!hex) return null;
    const h = String(hex).replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    if (Number.isNaN(bigint)) return null;
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
}

function getContrastTextColor(hex) {
    try {
        const c = hexToRgb(hex);
        if (!c) return '#ffffff';
        const srgb = [c.r, c.g, c.b]
            .map((v) => v / 255)
            .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
        const lum = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
        return lum > 0.6 ? '#0B4A53' : '#ffffff';
    } catch (_) {
        return '#ffffff';
    }
}

const OUTER_CARD_LINE = "rgba(100, 116, 139, 0.65)";
const toLocalIsoDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

// ...existing code...
export default function QuarterView({
    currentDate,
    onShiftDate,
    onSetDate,
    events,
    categories,
    onDayClick,
    onQuickCreate,
    onEventClick,
    onEventMove,
    view,
    onChangeView,
    filterType,
    onChangeFilter,
    slotSizeMinutes = 15,
    onToggleSlotSize,
    elephantTaskRow = null,
}) {
    const { t } = useTranslation();
    const { formatDate } = useCalendarPreferences();
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
            } catch (_) {
                if (!ignore) setKeyAreaMap({});
            }
        })();
        return () => {
            ignore = true;
        };
    }, []);
    const today = new Date();
    const months = getQuarterMonths(currentDate || today, 0);
    // month display values
    const monthLongNames = months.map((m) => m.toLocaleString("default", { month: "long" }));
    // Quarter range with full month names and full year.
    const years = months.map((m) => m.getFullYear());
    let quarterLabel = "";
    if (years.every((y) => y === years[0])) {
        quarterLabel = `${monthLongNames[0]}-${monthLongNames[2]} ${years[0]}`;
    } else {
        quarterLabel = `${monthLongNames[0]} ${years[0]} - ${monthLongNames[2]} ${years[2]}`;
    }
    // (replaced below with calendar-aligned weeks)

    // Helpers for day span checks
    const overlapsDayByCalendarDate = (rangeStart, rangeEnd, dayDate) => {
        try {
            const s = rangeStart ? new Date(rangeStart) : null;
            const e = rangeEnd ? new Date(rangeEnd) : null;
            if (!s && !e) return false;
            const rs = s || e;
            const re = e || s;
            const startDateOnly = new Date(rs.getFullYear(), rs.getMonth(), rs.getDate(), 0, 0, 0, 0);
            const endDateOnly = new Date(re.getFullYear(), re.getMonth(), re.getDate(), 0, 0, 0, 0);
            const dayDateOnly = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0);

            const from = startDateOnly <= endDateOnly ? startDateOnly : endDateOnly;
            const to = startDateOnly <= endDateOnly ? endDateOnly : startDateOnly;
            return dayDateOnly >= from && dayDateOnly <= to;
        } catch (_) {
            return false;
        }
    };
    const eventSpanByDate = (ev) => {
        try {
            const sRaw = ev?.start || ev?.startDate || ev?.start_at || null;
            const eRaw = ev?.end || ev?.endDate || ev?.end_at || sRaw || null;
            const s = sRaw ? new Date(sRaw) : null;
            const e = eRaw ? new Date(eRaw) : null;
            if (!s && !e) return null;
            const sd = new Date((s || e).getFullYear(), (s || e).getMonth(), (s || e).getDate(), 0, 0, 0, 0);
            const ed = new Date((e || s).getFullYear(), (e || s).getMonth(), (e || s).getDate(), 0, 0, 0, 0);
            return sd <= ed ? { start: sd, end: ed } : { start: ed, end: sd };
        } catch (_) {
            return null;
        }
    };
    const sameDateOnly = (a, b) =>
        a && b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
    const addDaysDateOnly = (d, days) => {
        const next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        next.setDate(next.getDate() + days);
        return next;
    };
    const clampDateOnly = (d, minD, maxD) => {
        const t = d.getTime();
        if (t < minD.getTime()) return new Date(minD);
        if (t > maxD.getTime()) return new Date(maxD);
        return d;
    };

    const getEventKey = (ev, idx = 0) => {
        try {
            if (ev?.id) return String(ev.id);
            const s = ev?.start || ev?.startDate || ev?.start_at || '';
            const e = ev?.end || ev?.endDate || ev?.end_at || '';
            const t = ev?.title || '';
            const kind = ev?.kind || ev?.type || '';
            const srcTask = ev?.taskId || ev?.task_id || '';
            const srcActivity = ev?.activityId || ev?.activity_id || '';
            return `${s}|${e}|${t}|${kind}|${srcTask}|${srcActivity}|${idx}`;
        } catch (_) {
            return `ev-${idx}`;
        }
    };

    const quarterEventLanes = useMemo(() => {
        const source = (Array.isArray(events) ? events : [])
            .map((ev, originalIdx) => ({ ev, originalIdx }))
            .filter(({ ev }) => String(ev?.kind || '').toLowerCase() !== 'appointment' && !ev?.taskId && !ev?.task_id)
            .map(({ ev, originalIdx }) => {
                const span = eventSpanByDate(ev);
                if (!span) return null;
                return {
                    ev,
                    key: getEventKey(ev, originalIdx),
                    span,
                    createdAt: new Date(ev?.createdAt || ev?.created_at || 0).getTime(),
                    startTs: new Date(ev?.start || ev?.startDate || ev?.start_at || 0).getTime(),
                    endTs: new Date(ev?.end || ev?.endDate || ev?.end_at || 0).getTime(),
                    title: String(ev?.title || ''),
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                if (a.startTs !== b.startTs) return a.startTs - b.startTs;
                // For events starting the same day, place shorter spans first so
                // nested bars occupy middle lanes in dense overlaps.
                const ae = Number.isNaN(a.endTs) ? Number.POSITIVE_INFINITY : a.endTs;
                const be = Number.isNaN(b.endTs) ? Number.POSITIVE_INFINITY : b.endTs;
                if (ae !== be) return ae - be;
                const ac = Number.isNaN(a.createdAt) ? Number.POSITIVE_INFINITY : a.createdAt;
                const bc = Number.isNaN(b.createdAt) ? Number.POSITIVE_INFINITY : b.createdAt;
                if (ac !== bc) return ac - bc;
                return a.title.localeCompare(b.title);
            });

        const laneEnds = [];
        const laneByKey = new Map();

        for (const item of source) {
            let lane = laneEnds.findIndex((endDate) => item.span.start > endDate);
            if (lane === -1) {
                lane = laneEnds.length;
                laneEnds.push(item.span.end);
            } else {
                laneEnds[lane] = item.span.end;
            }
            laneByKey.set(item.key, lane);
        }

        const maxLaneCount = Math.max(1, laneEnds.length);
        const items = source.map((item) => ({ key: item.key, lane: laneByKey.get(item.key) ?? 0, span: item.span }));
        return { laneByKey, maxLaneCount, items };
    }, [events]);

    // Helper to get week number for a given date
    function getWeekNumberLocal(date) {
        // Use same ISO week algorithm (Monday start) as getWeekNumber
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    }

    // Build calendar-aligned weeks for the quarter (Monday..Sunday).
    // For each week, create an object with weekNum and an array of 7 Date objects (one per weekday).
    const quarterStart = new Date(months[0].getFullYear(), months[0].getMonth(), 1);
    const quarterEnd = new Date(months[2].getFullYear(), months[2].getMonth() + 1, 0);

    const dayIndexMonday = (d) => (d.getDay() + 6) % 7; // 0 = Monday ... 6 = Sunday

    const firstWeekStart = new Date(quarterStart);
    firstWeekStart.setDate(quarterStart.getDate() - dayIndexMonday(quarterStart));

    const lastWeekEnd = new Date(quarterEnd);
    lastWeekEnd.setDate(quarterEnd.getDate() + (6 - dayIndexMonday(quarterEnd)));

    const weeks = [];
    for (let ws = new Date(firstWeekStart); ws <= lastWeekEnd; ws.setDate(ws.getDate() + 7)) {
        const weekStart = new Date(ws);
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            return d;
        });
        weeks.push({ weekStart: new Date(weekStart), weekNum: getWeekNumberLocal(weekStart), days });
    }

    const [showViewMenu, setShowViewMenu] = useState(false);
    const [showSlotMenu, setShowSlotMenu] = useState(false);
    const [popup, setPopup] = useState(null);
    const [allDaySpanPreview, setAllDaySpanPreview] = useState({});
    const allDaySpanPreviewRef = useRef({});
    const allDayEdgeDragRef = useRef(null);
    const lastAllDayResizeAtRef = useRef(0);
    const [selectedDateIso, setSelectedDateIso] = useState(null);
    const [hoveredRowIso, setHoveredRowIso] = useState(null);
    const viewMenuRef = useRef(null);
    const slotMenuRef = useRef(null);
    // popup: { iso: 'YYYY-MM-DD', events: [], rect: DOMRect }
    // refs to allow equalizing row heights across the three month columns
    const rowRefs = useRef([]); // rowRefs.current[mIdx][wIdx][dayIdx] = tr element
    const weekBlockRefs = useRef([]); // weekBlockRefs.current[mIdx][wIdx] = tbody element
    const monthColRefs = useRef([]); // monthColRefs.current[mIdx] = month column div
    const shellRef = useRef(null);
    const setRowRef = (mIdx, wIdx, dayIdx, el) => {
        if (!rowRefs.current[mIdx]) rowRefs.current[mIdx] = [];
        if (!rowRefs.current[mIdx][wIdx]) rowRefs.current[mIdx][wIdx] = [];
        rowRefs.current[mIdx][wIdx][dayIdx] = el;
    };
    const setWeekBlockRef = (mIdx, wIdx, el) => {
        if (!weekBlockRefs.current[mIdx]) weekBlockRefs.current[mIdx] = [];
        weekBlockRefs.current[mIdx][wIdx] = el;
    };
    const setMonthColRef = (mIdx, el) => {
        monthColRefs.current[mIdx] = el;
    };
    const gridRef = useRef(null);
    const [weekSeparators, setWeekSeparators] = useState([]);
    const [weekVerticalDividers, setWeekVerticalDividers] = useState([]);
    const { quarterStartDay, quarterEndDay } = useMemo(() => ({
        quarterStartDay: new Date(months[0].getFullYear(), months[0].getMonth(), 1, 0, 0, 0, 0),
        quarterEndDay: new Date(months[2].getFullYear(), months[2].getMonth() + 1, 0, 0, 0, 0, 0),
    }), [months]);

    const startAllDayEdgeDrag = (e, edge, meta) => {
        try {
            e.stopPropagation();
            e.preventDefault();
        } catch (_) {}
        allDayEdgeDragRef.current = {
            edge,
            startY: e.clientY || 0,
            rowHeight: Math.max(1, Number(meta?.rowHeight) || 1),
            meta,
        };
        try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (_) {}
    };

    useEffect(() => {
        allDaySpanPreviewRef.current = allDaySpanPreview || {};
    }, [allDaySpanPreview]);

    useEffect(() => {
        const onMove = (e) => {
            const drag = allDayEdgeDragRef.current;
            if (!drag?.meta?.eventKey) return;
            const dy = (e.clientY || 0) - drag.startY;
            const deltaDays = Math.round(dy / drag.rowHeight);
            const originalStart = drag.meta.originalStart;
            const originalEnd = drag.meta.originalEnd;
            if (!originalStart || !originalEnd) return;

            let nextStart = originalStart;
            let nextEnd = originalEnd;
            if (drag.edge === "top") {
                nextStart = clampDateOnly(addDaysDateOnly(originalStart, deltaDays), quarterStartDay, quarterEndDay);
                if (nextStart > nextEnd) nextStart = new Date(nextEnd);
            } else {
                nextEnd = clampDateOnly(addDaysDateOnly(originalEnd, deltaDays), quarterStartDay, quarterEndDay);
                if (nextEnd < nextStart) nextEnd = new Date(nextStart);
            }

            setAllDaySpanPreview((prev) => ({
                ...prev,
                [drag.meta.eventKey]: { start: nextStart, end: nextEnd },
            }));
        };

        const onUp = async () => {
            const drag = allDayEdgeDragRef.current;
            allDayEdgeDragRef.current = null;
            if (!drag?.meta?.eventKey) return;

            const preview = allDaySpanPreviewRef.current?.[drag.meta.eventKey];
            const nextStart = preview?.start || drag.meta.originalStart;
            const nextEnd = preview?.end || drag.meta.originalEnd;
            lastAllDayResizeAtRef.current = Date.now();

            try {
                const changed =
                    nextStart &&
                    nextEnd &&
                    (nextStart.getTime() !== drag.meta.originalStart.getTime() ||
                        nextEnd.getTime() !== drag.meta.originalEnd.getTime());
                if (changed && typeof onEventMove === "function" && drag.meta.eventId) {
                    const buildNextDate = (dateOnly, endOfDay = false, fallbackIso = null) => {
                        const out = new Date(
                            dateOnly.getFullYear(),
                            dateOnly.getMonth(),
                            dateOnly.getDate(),
                            endOfDay ? 23 : 0,
                            endOfDay ? 59 : 0,
                            endOfDay ? 59 : 0,
                            endOfDay ? 999 : 0
                        );
                        if (!fallbackIso || endOfDay) return out;
                        const f = new Date(fallbackIso);
                        if (Number.isNaN(f.getTime())) return out;
                        out.setHours(f.getHours(), f.getMinutes(), f.getSeconds(), f.getMilliseconds());
                        return out;
                    };
                    const nextStartAt = buildNextDate(nextStart, false, drag.meta.startRaw);
                    const nextEndAt = buildNextDate(nextEnd, true, drag.meta.endRaw || drag.meta.startRaw);
                    await onEventMove(drag.meta.eventId, nextStartAt, nextEndAt, { allDay: true, source: "quarter-all-day-stretch" });
                }
            } catch (_) {
                // keep UI responsive even if save fails
            } finally {
                setAllDaySpanPreview((prev) => {
                    if (!prev || !Object.prototype.hasOwnProperty.call(prev, drag.meta.eventKey)) return prev;
                    const next = { ...prev };
                    delete next[drag.meta.eventKey];
                    return next;
                });
            }
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
        };
    }, [onEventMove, quarterEndDay, quarterStartDay]);

    const scrollToDate = (date) => {
        try {
            if (!gridRef.current) return;
            const iso = toLocalIsoDate(date);
            const el = gridRef.current.querySelector(`[data-date="${iso}"]`);
            if (!el) return;
            const container = gridRef.current;
            const cRect = container.getBoundingClientRect();
            const eRect = el.getBoundingClientRect();

            const nextTop =
                eRect.top - cRect.top + container.scrollTop - Math.max(0, (container.clientHeight - eRect.height) / 2);
            const nextLeft =
                eRect.left - cRect.left + container.scrollLeft - Math.max(0, (container.clientWidth - eRect.width) / 2);

            container.scrollTo({
                top: Math.max(0, nextTop),
                left: Math.max(0, nextLeft),
                behavior: "smooth",
            });
            // brief highlight using the same animation/class as other views
            try {
                el.classList.add("today-row-overlay");
                setTimeout(() => {
                    try {
                        el.classList.remove("today-row-overlay");
                    } catch (_) {}
                }, 900);
            } catch (_) {}
        } catch (__) {}
    };

    // Equalize heights after paint to avoid blocking the main thread during
    // navigation. Previously this used useLayoutEffect which runs before
    // browser paint and can make clicks feel sluggish when many DOM
    // measurements happen. We now schedule measurements in requestAnimationFrame
    // inside a useEffect so the UI can update immediately and the measurements
    // occur right after paint.
    useEffect(() => {
        // For quarter view we prefer compact rows; skip forcing equal heights to avoid
        // leaving blank space under dates that don't need it. Other views still
        // benefit from equalized rows, so only run when not in quarter view.
        if (view === 'quarter') return;
        if (!rowRefs.current || rowRefs.current.length === 0) return;
        let raf = null;
        const run = () => {
            // find max number of weeks across months
            const maxWeeks = Math.max(...rowRefs.current.map((m) => (m ? m.length : 0)));
            for (let w = 0; w < maxWeeks; w++) {
                for (let day = 0; day < 7; day++) {
                    // reset heights first
                    for (let m = 0; m < rowRefs.current.length; m++) {
                        const el = rowRefs.current[m]?.[w]?.[day];
                        if (el) el.style.height = "";
                    }
                    // compute max
                    let maxH = 0;
                    for (let m = 0; m < rowRefs.current.length; m++) {
                        const el = rowRefs.current[m]?.[w]?.[day];
                        if (el) {
                            const h = el.getBoundingClientRect().height;
                            if (h > maxH) maxH = h;
                        }
                    }
                    if (maxH > 0) {
                        for (let m = 0; m < rowRefs.current.length; m++) {
                            const el = rowRefs.current[m]?.[w]?.[day];
                            if (el) el.style.height = `${maxH}px`;
                        }
                    }
                }
            }
        };
        raf = requestAnimationFrame(run);
        return () => {
            if (raf) cancelAnimationFrame(raf);
        };
    }, [events, view]);

    useEffect(() => {
        const onResize = () => {
            if (rowRefs.current) {
                for (let m = 0; m < rowRefs.current.length; m++) {
                    for (let w = 0; w < (rowRefs.current[m] || []).length; w++) {
                        for (let d = 0; d < 7; d++) {
                            const el = rowRefs.current[m]?.[w]?.[d];
                            if (el) el.style.height = "";
                        }
                    }
                }
            }
            requestAnimationFrame(() => {});
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        const container = gridRef.current;
        if (!container) return;

        let rafId = null;
        const computeLines = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                try {
                    const rect = container.getBoundingClientRect();
                    const maxWeeks = Math.max(0, ...weekBlockRefs.current.map((m) => (m ? m.length : 0)));
                    const colRects = monthColRefs.current.map((el) => (el ? el.getBoundingClientRect() : null));
                    const lines = [];
                    const verticalDividers = [];
                    const tolerance = 2; // px

                    // One full-height vertical divider per week block (Mon..Sun)
                    // positioned just after the weekday/date label region.
                    for (let mIdx = 0; mIdx < monthColRefs.current.length; mIdx++) {
                        const colRect = colRects[mIdx];
                        if (!colRect) continue;
                        const dividerLeft = colRect.left - rect.left + container.scrollLeft + 76;
                        const weekBlocks = weekBlockRefs.current[mIdx] || [];
                        for (let wIdx = 0; wIdx < weekBlocks.length; wIdx++) {
                            const weekEl = weekBlocks[wIdx];
                            if (!weekEl) continue;
                            const r = weekEl.getBoundingClientRect();
                            verticalDividers.push({
                                left: dividerLeft,
                                top: r.top - rect.top + container.scrollTop,
                                height: r.height,
                            });
                        }
                    }

                    // Create separate horizontal lines for each month (don't extend into gaps)
                    for (let wIdx = 0; wIdx < maxWeeks - 1; wIdx++) {
                        for (let mIdx = 0; mIdx < monthColRefs.current.length; mIdx++) {
                            const el = weekBlockRefs.current[mIdx]?.[wIdx];
                            if (!el) continue;

                            const r = el.getBoundingClientRect();
                            const top = r.bottom - rect.top + container.scrollTop;
                            const left = r.left - rect.left + container.scrollLeft;
                            const right = r.right - rect.left + container.scrollLeft;

                            lines.push({ top, left, right });
                        }
                    }

                    setWeekSeparators(lines);
                    setWeekVerticalDividers([]);
                } catch (_) {}
            });
        };

        computeLines();
        window.addEventListener("resize", computeLines);
        container.addEventListener("scroll", computeLines, { passive: true });
        return () => {
            window.removeEventListener("resize", computeLines);
            container.removeEventListener("scroll", computeLines);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [events, months]);

    // Close popup on outside click or Esc
    useEffect(() => {
        if (!popup) return;
        const onDocClick = (e) => {
            try {
                // If click inside popup element, keep open
                const el = document.getElementById(`quarter-popup-${popup.iso}`);
                if (el && el.contains(e.target)) return;
            } catch (_) {}
            setPopup(null);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setPopup(null);
        };
        document.addEventListener('click', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('click', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [popup]);

    useEffect(() => {
        const onDocClick = (e) => {
            if (viewMenuRef.current && !viewMenuRef.current.contains(e.target)) {
                setShowViewMenu(false);
            }
            if (slotMenuRef.current && !slotMenuRef.current.contains(e.target)) {
                setShowSlotMenu(false);
            }
        };
        const onKey = (e) => {
            if (e.key === "Escape") {
                setShowViewMenu(false);
                setShowSlotMenu(false);
            }
        };
        document.addEventListener("click", onDocClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("click", onDocClick);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    useEffect(() => {
        const onDocMouseDown = (e) => {
            try {
                const inDateSlot = e.target?.closest?.('[data-qv-date-slot="true"]');
                if (inDateSlot) return;
            } catch (_) {}
            setSelectedDateIso(null);
        };
        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, []);
    return (
        <>
            <style>{`
                @keyframes blinkRow {
                    0% { background-color: rgba(59,130,246,0.12) !important; box-shadow: none !important; }
                    25% { background-color: rgba(59,130,246,0.6) !important; box-shadow: 0 0 0 10px rgba(59,130,246,0.18) !important; }
                    50% { background-color: rgba(59,130,246,0.12) !important; box-shadow: none !important; }
                    75% { background-color: rgba(59,130,246,0.6) !important; box-shadow: 0 0 0 10px rgba(59,130,246,0.18) !important; }
                    100% { background-color: rgba(59,130,246,0.12) !important; box-shadow: none !important; }
                }
                .today-row-overlay { animation: blinkRow 0.45s linear 4; background-clip: padding-box; border-radius: 4px; }

                .day-header-controls .day-header-btn {
                    margin-inline: 2px;
                    transition: background-color 120ms ease, border-color 120ms ease;
                }
                .day-header-controls .day-header-btn:hover {
                    background-color: #e0f2fe !important;
                    border-color: #7dd3fc !important;
                }
                .day-header-controls button.day-header-btn:focus,
                .day-header-controls button.day-header-btn:focus-visible {
                    outline: none !important;
                    box-shadow: none !important;
                    ring: 0 !important;
                }

                .qv-vscroll {
                    scrollbar-width: none;
                    overflow-y: overlay;
                    overflow-x: hidden;
                    width: 100%;
                }
                .qv-vscroll::-webkit-scrollbar { width: 0; height: 0; }
                .qv-scroll-wrap:hover .qv-vscroll {
                    scrollbar-width: thin;
                    width: calc(100% + 8px);
                    margin-right: -8px;
                }
                .qv-scroll-wrap:hover .qv-vscroll::-webkit-scrollbar { width: 8px; }
                .qv-scroll-wrap:hover .qv-vscroll::-webkit-scrollbar-thumb {
                    background: rgba(100, 116, 139, 0.45);
                    border-radius: 8px;
                }
                .qv-scroll-wrap:hover .qv-vscroll::-webkit-scrollbar-track { background: transparent; }
            `}</style>
            <div className="h-full min-h-0 flex flex-col">
                {/* Quarter navigation inside view */}
                <CalendarViewTopSection elephantTaskRow={elephantTaskRow} elephantTopGapClass="mt-1" showElephantSeparator={false}>
                <div className="day-header-controls relative z-[400] flex items-center justify-between min-h-[34px]">
                    <div className="flex items-center gap-2">
                        {/* Back first, then View dropdown */}
                        <button
                            className="day-header-btn px-2 py-0.5 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                            style={{ minWidth: 34, minHeight: 34 }}
                            aria-label="Previous month"
                            onClick={() => onShiftDate && onShiftDate({ months: -1 })}
                        >
                            <FaChevronLeft />
                        </button>
                        <button
                            className="day-header-btn px-2 py-0.5 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                            style={{ minWidth: 34, minHeight: 34 }}
                            aria-label="Next month"
                            onClick={() => onShiftDate && onShiftDate({ months: 1 })}
                        >
                            <FaChevronRight />
                        </button>
                        <button
                            className="day-header-btn px-2 py-0.5 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                            style={{ minWidth: 34, minHeight: 34 }}
                            aria-label={t("quarterView.today")}
                            onClick={() => {
                                try {
                                    if (typeof onSetDate === 'function') onSetDate(new Date());
                                } catch (_) {}
                                setTimeout(() => scrollToDate(new Date()), 80);
                            }}
                        >
                            {t("quarterView.today")}
                        </button>
                    </div>
                    <span className="text-lg font-semibold">{quarterLabel}</span>
                    <div className="flex items-center gap-2">
                        <div className="relative" ref={slotMenuRef}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowSlotMenu((s) => !s);
                                    setShowViewMenu(false);
                                }}
                                className="day-header-btn px-2 py-0.5 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center gap-2"
                                style={{ minWidth: 48, minHeight: 34 }}
                                aria-haspopup="menu"
                                aria-expanded={showSlotMenu ? "true" : "false"}
                                aria-label="Time label interval"
                                title={`Time labels: ${slotSizeMinutes}m`}
                            >
                                <span>Time</span>
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                    {slotSizeMinutes}m
                                </span>
                                <FaChevronDown className={`${showSlotMenu ? "rotate-180" : "rotate-0"} transition-transform`} />
                            </button>
                            {showSlotMenu && (
                                <div
                                    role="menu"
                                    className="absolute left-0 z-[450] mt-2 w-28 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
                                >
                                    {[15, 30].map((size) => (
                                        <button
                                            key={size}
                                            role="menuitemradio"
                                            aria-checked={slotSizeMinutes === size}
                                            className={`w-full text-left px-3 py-2 text-sm ${slotSizeMinutes === size ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
                                            onClick={() => {
                                                if (slotSizeMinutes !== size && typeof onToggleSlotSize === "function") {
                                                    onToggleSlotSize();
                                                }
                                                setShowSlotMenu(false);
                                            }}
                                        >
                                            {size}m
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="relative" ref={viewMenuRef}>
                            <button
                                className="day-header-btn px-2 py-0.5 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center gap-2"
                                style={{ minWidth: 34, minHeight: 34 }}
                                onClick={() => {
                                    setShowViewMenu((s) => !s);
                                    setShowSlotMenu(false);
                                }}
                                aria-haspopup="menu"
                                aria-expanded={showViewMenu ? "true" : "false"}
                            >
                                <span>View</span>
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                    {view?.charAt(0).toUpperCase() + view?.slice(1)}
                                </span>
                                <FaChevronDown
                                    className={`${showViewMenu ? "rotate-180" : "rotate-0"} transition-transform`}
                                />
                            </button>
                            {showViewMenu && (
                                <div
                                    role="menu"
                                    className="absolute right-0 z-[450] mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
                                >
                                    {["day", "week", "month", "quarter"].map((v) => (
                                        <button
                                            key={v}
                                            role="menuitemradio"
                                            aria-checked={view === v}
                                            className={`w-full text-left px-3 py-2 text-sm ${view === v ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
                                            onClick={() => {
                                                onChangeView && onChangeView(v);
                                                setShowViewMenu(false);
                                            }}
                                        >
                                            {v.charAt(0).toUpperCase() + v.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                </CalendarViewTopSection>
                <div className="overflow-hidden bg-white flex-1 min-h-0 mt-1">
                <div ref={shellRef} className="relative mv-shell bg-white border border-transparent rounded-lg shadow-sm p-0 overflow-hidden h-full min-h-0 flex flex-col">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-lg z-[305]"
                        style={{ boxShadow: `inset 0 0 0 1px ${OUTER_CARD_LINE}` }}
                    />
                    <div className="relative grid grid-cols-3 gap-4 flex-shrink-0">
                        {monthLongNames.map((monthName, idx) => (
                            <div
                                key={`month-header-${idx}`}
                                className="text-center px-3 py-1 text-blue-500 text-xs font-semibold bg-slate-100/80 border-b border-slate-300 min-w-0"
                            >
                                {monthName}
                            </div>
                        ))}
                    </div>
                    {/* Calendar grid: three independent month columns */}
                    <div
                        className="qv-scroll-wrap relative flex-1 min-h-0"
                        style={{ maxWidth: "100%", maxHeight: "100%", overflow: "hidden" }}
                    >
                    <div
                        ref={gridRef}
                        className="qv-vscroll relative h-full min-h-0"
                        style={{ maxHeight: "100%" }}
                    >
                    <div className="relative grid grid-cols-3 gap-4 min-w-full pb-6">
                    {weekSeparators.length > 0 && null}
                    {weekVerticalDividers.length > 0 && null}
                    {months.map((monthDate, mIdx) => {
                        const monthLastDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
                        const monthWeeks = weeks
                            .map((w) => {
                                const days = w.days.filter(
                                    (d) =>
                                        d.getMonth() === monthDate.getMonth() &&
                                        d.getFullYear() === monthDate.getFullYear()
                                );
                                if (days.length === 0) return null;
                                return { weekStart: w.weekStart, weekNum: w.weekNum, days };
                            })
                            .filter(Boolean);

                        return (
                            <div key={mIdx} ref={(el) => setMonthColRef(mIdx, el)} className="min-w-0">
                                <table
                                    className="w-full border-x border-slate-300"
                                    style={{ tableLayout: 'fixed', borderCollapse: "separate", borderSpacing: 0 }}
                                >
                                    <colgroup>
                                        <col style={{ width: 76 }} />
                                        <col />
                                    </colgroup>
                                    {monthWeeks.map((week, wIdx) => {
                                    const weekTbody = (
                                        <tbody
                                            key={`week-${wIdx}`}
                                            ref={(el) => setWeekBlockRef(mIdx, wIdx, el)}
                                            className="bg-white border border-slate-300 my-1"
                                        >
                                            {week.days.map((date, dayIdx) => {
                                                const iso = toLocalIsoDate(date);
                                                const isSelectedDate = selectedDateIso === iso;
                                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                                const isToday =
                                                    date.getDate() === today.getDate() &&
                                                    date.getMonth() === today.getMonth() &&
                                                    date.getFullYear() === today.getFullYear();
                                                const weekdayLabel = new Intl.DateTimeFormat(undefined, {
                                                    weekday: "short",
                                                }).format(date);
                                                const showWeekNum = dayIndexMonday(date) === 0; // show only on Monday
                                                const rowBorderClass = dayIdx < week.days.length - 1 ? "border-b border-slate-300" : "";
                                                const isWeekStartRow = date.getDay() === 1; // Monday only
                                                const isMonthEnd = date.getDate() === monthLastDate;
                                                const isMonthEndSunday =
                                                    isMonthEnd && date.getDay() === 0;
                                                const isMonthEndMidWeek =
                                                    isMonthEnd && date.getDay() !== 0;
                                                return (
                                                    <tr
                                                        ref={(el) => setRowRef(mIdx, wIdx, dayIdx, el)}
                                                        key={dayIdx}
                                                        className="bg-white"
                                                    >
                                                        <td
                                                            className={`px-2 py-0 text-sm font-semibold text-left ${(isWeekend ? 'text-red-500' : 'text-gray-700')} ${isToday ? 'text-blue-600' : ''}`}
                                                            data-date={iso}
                                                            style={{
                                                                width: 76,
                                                                minWidth: 76,
                                                                maxWidth: 76,
                                                                position: 'relative',
                                                                borderTop: isWeekStartRow ? "2px solid rgb(100, 116, 139)" : "none",
                                                                borderBottom: isMonthEndSunday
                                                                    ? "2px solid rgb(100, 116, 139)"
                                                                    : "1px solid rgba(148, 163, 184, 0.3)",
                                                                borderRight: "1px solid rgb(148, 163, 184)",
                                                                backgroundColor: isSelectedDate
                                                                    ? "rgba(191, 219, 254, 0.65)"
                                                                    : (isToday ? "rgba(59, 130, 246, 0.1)" : (isWeekend ? "rgb(241, 245, 249)" : "white")),
                                                                display: "flex",
                                                                alignItems: "center",
                                                                boxSizing: "border-box",
                                                                height: 30,
                                                            }}
                                                        >
                                                            <div
                                                                data-qv-date-slot="true"
                                                                className="flex items-center gap-1 text-[12px] font-semibold w-full whitespace-nowrap pr-2 cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedDateIso(iso);
                                                                }}
                                                                onDoubleClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (typeof onChangeView === "function") {
                                                                        onChangeView("day", { date: new Date(date) });
                                                                    } else if (typeof onSetDate === "function") {
                                                                        onSetDate(new Date(date));
                                                                    }
                                                                }}
                                                            >
                                                                <span className="min-w-0">{`${weekdayLabel} ${date.getDate()}`}</span>
                                                                {showWeekNum && week.weekNum ? (
                                                                    <sup className="text-[9px] text-slate-500 shrink-0 align-super">
                                                                        {week.weekNum}
                                                                    </sup>
                                                                ) : null}
                                                            </div>
                                                        </td>
                                                        <td
                                                            className={`group px-0 py-0 align-top relative ${rowBorderClass}`}
                                                            style={{
                                                                position: "relative",
                                                                minWidth: 0,
                                                                borderTop: isWeekStartRow ? "2px solid rgb(100, 116, 139)" : undefined,
                                                                borderBottom: isMonthEndSunday
                                                                    ? "2px solid rgb(100, 116, 139)"
                                                                    : (isMonthEndMidWeek ? "1px solid rgba(148, 163, 184, 0.3)" : undefined),
                                                                backgroundColor: hoveredRowIso === iso ? "rgba(191, 219, 254, 0.65)" : undefined,
                                                            }}
                                                            onMouseMove={(e) => {
                                                                const overBlocked = Boolean(
                                                                    e.target?.closest?.('[data-qv-event-bar="true"], [data-qv-plus-trigger="true"]')
                                                                );
                                                                if (overBlocked) {
                                                                    setHoveredRowIso((curr) => (curr === iso ? null : curr));
                                                                    return;
                                                                }
                                                                setHoveredRowIso(iso);
                                                            }}
                                                            onMouseLeave={() => {
                                                                setHoveredRowIso((curr) => (curr === iso ? null : curr));
                                                            }}
                                                            onDoubleClick={(e) => {
                                                                e.stopPropagation();
                                                                if (e.target?.closest?.('[data-qv-event-bar="true"], [data-qv-plus-trigger="true"]')) return;
                                                                if (typeof onQuickCreate !== "function") return;
                                                                const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
                                                                onQuickCreate(dayStart, { allDay: true });
                                                            }}
                                                        >
                                                            {(() => {
                                                                    const dayEvents = (events || []).reduce((acc, ev, evIdx) => {
                                                                        if (String(ev?.kind || '').toLowerCase() === 'appointment') return acc;
                                                                        if (ev?.taskId || ev?.task_id) return acc;
                                                                        const eventKey = getEventKey(ev, evIdx);
                                                                        const previewSpan = allDaySpanPreview[eventKey];
                                                                        const inDay = previewSpan
                                                                            ? overlapsDayByCalendarDate(previewSpan.start, previewSpan.end, date)
                                                                            : overlapsDayByCalendarDate(ev.start, ev.end, date);
                                                                        if (!inDay) return acc;
                                                                        acc.push({ ev, eventKey });
                                                                        return acc;
                                                                    }, []);
                                                                    const dayAppointments = (events || []).filter((ev) =>
                                                                        overlapsDayByCalendarDate(ev.start, ev.end, date) &&
                                                                        String(ev?.kind || '').toLowerCase() === 'appointment'
                                                                    );
                                                                    // For quarter view we render all-day bars inline and keep a
                                                                    // dedicated right lane for the appointments '+' action.
                                                                    const dayEventsSorted = [...dayEvents].sort((a, b) => {
                                                                        try {
                                                                            const as = new Date(a.ev?.start || a.ev?.startDate || a.ev?.start_at || 0).getTime();
                                                                            const bs = new Date(b.ev?.start || b.ev?.startDate || b.ev?.start_at || 0).getTime();
                                                                            if (as !== bs) return as - bs;
                                                                            const ac = new Date(a.ev?.createdAt || a.ev?.created_at || 0).getTime();
                                                                            const bc = new Date(b.ev?.createdAt || b.ev?.created_at || 0).getTime();
                                                                            if (!Number.isNaN(ac) && !Number.isNaN(bc) && ac !== bc) return ac - bc;
                                                                        } catch (_) {}
                                                                        return String(a.ev?.title || '').localeCompare(String(b.ev?.title || ''));
                                                                    });
                                                                    const dayOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
                                                                    const isPopupOpen = popup && popup.iso === iso;
                                                                    const dayEventsWithLane = dayEventsSorted.map((item, idx) => ({
                                                                        ev: item.ev,
                                                                        eventKey: item.eventKey || getEventKey(item.ev, idx),
                                                                        lane: quarterEventLanes.laneByKey.get(item.eventKey || getEventKey(item.ev, idx)) ?? 0,
                                                                    }));
                                                                    const visibleEvents = dayEventsWithLane
                                                                        .sort((a, b) => a.lane - b.lane);
                                                                    // Keep lane slots persistent within the day using global
                                                                    // lane ids. This preserves consistent bar width/position
                                                                    // across a span even when some overlapping events end.
                                                                    const laneCountVisible = Math.max(
                                                                        1,
                                                                        visibleEvents.reduce(
                                                                            (m, entry) => Math.max(m, Number(entry?.lane) || 0),
                                                                            0
                                                                        ) + 1
                                                                    );
                                                                    const activeSpans = visibleEvents
                                                                        .map(({ ev, eventKey }, idx) => {
                                                                            const raw = eventSpanByDate(ev);
                                                                            const key = eventKey || getEventKey(ev, idx);
                                                                            const preview = allDaySpanPreview[key];
                                                                            if (preview?.start && preview?.end) return { start: preview.start, end: preview.end };
                                                                            return raw;
                                                                        })
                                                                        .filter((s) => s?.start && s?.end);
                                                                    const laneCountCluster = activeSpans.length
                                                                        ? Math.max(
                                                                            1,
                                                                            (Array.isArray(quarterEventLanes.items) ? quarterEventLanes.items : [])
                                                                                .filter((it) =>
                                                                                    activeSpans.some(
                                                                                        (s) => it?.span?.start <= s.end && it?.span?.end >= s.start
                                                                                    )
                                                                                )
                                                                                .reduce((m, it) => Math.max(m, Number(it?.lane) || 0), 0) + 1
                                                                        )
                                                                        : 1;
                                                                    const laneCount = Math.max(laneCountVisible, laneCountCluster);
                                                                    const ACTION_GUTTER_WIDTH = 8;
                                                                    return (
                                                                        <div
                                                                            className="flex items-center"
                                                                            style={{
                                                                                position: 'absolute',
                                                                                left: 2,
                                                                                right: 8,
                                                                                top: -1,
                                                                                bottom: -1,
                                                                                zIndex: isPopupOpen ? 2000 : 20,
                                                                                backgroundColor: "transparent",
                                                                                borderRadius: 4,
                                                                            }}
                                                                        >
                                                                            <div
                                                                                style={{
                                                                                    position: 'absolute',
                                                                                    left: 0,
                                                                                    right: ACTION_GUTTER_WIDTH > 0 ? `${ACTION_GUTTER_WIDTH}px` : 0,
                                                                                    top: 0,
                                                                                    bottom: 0,
                                                                                    overflow: 'hidden',
                                                                                }}
                                                                            >
                                                                                {visibleEvents.map(({ ev, lane, eventKey }, idx) => {
                                                                                    const rawSpan = eventSpanByDate(ev);
                                                                                    const previewSpan = allDaySpanPreview[eventKey];
                                                                                    const span = previewSpan
                                                                                        ? { start: previewSpan.start, end: previewSpan.end }
                                                                                        : rawSpan;
                                                                                    const startsHere = span ? sameDateOnly(span.start, dayOnly) : false;
                                                                                    const endsHere = span ? sameDateOnly(span.end, dayOnly) : false;
                                                                                    // Preserve row separator visibility at event
                                                                                    // boundaries while keeping multi-day bars
                                                                                    // visually continuous through middle days.
                                                                                    const topInsetPx = startsHere ? 1 : 0;
                                                                                    const bottomInsetPx = endsHere ? 1 : 0;
                                                                                    const colIndex = Math.max(0, Math.min(laneCount - 1, Number(lane) || 0));
                                                                                    const kindKey = ev.kind || ev.type || ev.kindName || null;
                                                                                    const cat =
                                                                                        kindKey && categories && categories[kindKey]
                                                                                            ? categories[kindKey]
                                                                                            : null;
                                                                                    const bgClass = cat?.color || null;
                                                                                    const ka = ev.keyAreaId || ev.key_area_id
                                                                                        ? keyAreaMap[String(ev.keyAreaId || ev.key_area_id)]
                                                                                        : null;
                                                                                    const DEFAULT_BAR_COLOR = '#4DC3D8';
                                                                                    const kaColor = ka?.color || null;
                                                                                    const finalBg = bgClass ? null : (kaColor || DEFAULT_BAR_COLOR);
                                                                                    const textColor = finalBg ? getContrastTextColor(finalBg) : '#ffffff';
                                                                                    const rowHeight = rowRefs.current?.[mIdx]?.[wIdx]?.[dayIdx]?.getBoundingClientRect?.().height || 32;
                                                                                    const hasOverlapInOwnSpan = (() => {
                                                                                        if (!span?.start || !span?.end) return false;
                                                                                        const thisStart = span.start.getTime();
                                                                                        const thisEnd = span.end.getTime();
                                                                                        const source = Array.isArray(events) ? events : [];
                                                                                        for (let i = 0; i < source.length; i += 1) {
                                                                                            const other = source[i];
                                                                                            if (String(other?.kind || '').toLowerCase() === 'appointment') continue;
                                                                                            if (other?.taskId || other?.task_id) continue;
                                                                                            const otherKey = getEventKey(other, i);
                                                                                            if (otherKey === eventKey) continue;
                                                                                            const otherPreview = allDaySpanPreview[otherKey];
                                                                                            const otherSpan = otherPreview
                                                                                                ? { start: otherPreview.start, end: otherPreview.end }
                                                                                                : eventSpanByDate(other);
                                                                                            if (!otherSpan?.start || !otherSpan?.end) continue;
                                                                                            const otherStart = otherSpan.start.getTime();
                                                                                            const otherEnd = otherSpan.end.getTime();
                                                                                            if (otherStart <= thisEnd && otherEnd >= thisStart) return true;
                                                                                        }
                                                                                        return false;
                                                                                    })();
                                                                                    const useFullWidthSingle =
                                                                                        visibleEvents.length === 1 &&
                                                                                        !hasOverlapInOwnSpan;
                                                                                    return (
                                                                                        <button
                                                                                            key={`qv-ev-${iso}-${ev.id || idx}`}
                                                                                            data-qv-event-bar="true"
                                                                                            type="button"
                                                                                            className={`group text-left px-2 text-[12px] font-medium text-white ${bgClass || ''}`}
                                                                                            style={{
                                                                                                position: 'absolute',
                                                                                                top: `${topInsetPx}px`,
                                                                                                bottom: `${bottomInsetPx}px`,
                                                                                                left: useFullWidthSingle ? 0 : `calc(${(colIndex * 100) / laneCount}% + 1px)`,
                                                                                                width: useFullWidthSingle ? '100%' : `calc(${100 / laneCount}% - 2px)`,
                                                                                                ...(finalBg ? { backgroundColor: finalBg, border: `1px solid ${finalBg}`, color: textColor } : {}),
                                                                                                borderRadius: startsHere && endsHere ? 6 : startsHere ? '6px 6px 0 0' : endsHere ? '0 0 6px 6px' : 0,
                                                                                                boxShadow: '0 0 0 1px rgba(0,0,0,0.03)',
                                                                                                overflow: 'hidden',
                                                                                            }}
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                if (Date.now() - (lastAllDayResizeAtRef.current || 0) < 350) return;
                                                                                                if (onEventClick) onEventClick(ev);
                                                                                            }}
                                                                                            title={ev.title || '(event)'}
                                                                                        >
                                                                                            {startsHere && (
                                                                                                <div
                                                                                                    role="separator"
                                                                                                    aria-orientation="horizontal"
                                                                                                    onPointerDown={(e) => startAllDayEdgeDrag(e, "top", {
                                                                                                        eventKey,
                                                                                                        eventId: ev?.id || null,
                                                                                                        originalStart: span?.start || rawSpan?.start || dayOnly,
                                                                                                        originalEnd: span?.end || rawSpan?.end || dayOnly,
                                                                                                        startRaw: ev?.start || ev?.startDate || ev?.start_at || null,
                                                                                                        endRaw: ev?.end || ev?.endDate || ev?.end_at || null,
                                                                                                        rowHeight,
                                                                                                    })}
                                                                                                    className="absolute left-0 right-0 h-2 -top-1 cursor-ns-resize"
                                                                                                    style={{ zIndex: 30 }}
                                                                                                />
                                                                                            )}
                                                                                            {endsHere && (
                                                                                                <div
                                                                                                    role="separator"
                                                                                                    aria-orientation="horizontal"
                                                                                                    onPointerDown={(e) => startAllDayEdgeDrag(e, "bottom", {
                                                                                                        eventKey,
                                                                                                        eventId: ev?.id || null,
                                                                                                        originalStart: span?.start || rawSpan?.start || dayOnly,
                                                                                                        originalEnd: span?.end || rawSpan?.end || dayOnly,
                                                                                                        startRaw: ev?.start || ev?.startDate || ev?.start_at || null,
                                                                                                        endRaw: ev?.end || ev?.endDate || ev?.end_at || null,
                                                                                                        rowHeight,
                                                                                                    })}
                                                                                                    className="absolute left-0 right-0 h-2 -bottom-1 cursor-ns-resize"
                                                                                                    style={{ zIndex: 30 }}
                                                                                                />
                                                                                            )}
                                                                                            <div className="w-full h-full flex items-center justify-between gap-2">
                                                                                                <span className="truncate">{startsHere ? (ev.title || '(event)') : ''}</span>
                                                                                                {startsHere && (
                                                                                                    <span className="hidden group-hover:inline-flex items-center gap-1 shrink-0">
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            className="p-0.5 rounded hover:bg-black/10"
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                onEventClick && onEventClick(ev, 'edit');
                                                                                                            }}
                                                                                                            aria-label="Edit event"
                                                                                                        >
                                                                                                            <FaEdit className="w-3 h-3 text-blue-600" />
                                                                                                        </button>
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            className="p-0.5 rounded hover:bg-black/10"
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                onEventClick && onEventClick(ev, 'delete');
                                                                                                            }}
                                                                                                            aria-label="Delete event"
                                                                                                        >
                                                                                                            <FaTrash className="w-3 h-3 text-red-600" />
                                                                                                        </button>
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>

                                                                            <div
                                                                                className="absolute right-0 top-0 bottom-0 flex flex-col items-center justify-center gap-1"
                                                                                style={{ width: `${ACTION_GUTTER_WIDTH}px` }}
                                                                            >
                                                                                {dayAppointments.length > 0 && (
                                                                                    <button
                                                                                        data-qv-plus-trigger="true"
                                                                                        aria-label={`Show appointments for ${iso}`}
                                                                                        title={`Show appointments for ${iso}`}
                                                                                        className="inline-flex items-center justify-center w-4 h-4 rounded text-base leading-none text-sky-600 hover:text-sky-700 hover:bg-sky-100 transition-colors focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                                                                                        onMouseDown={(e) => {
                                                                                            e.preventDefault();
                                                                                        }}
                                                                                        onFocus={(e) => {
                                                                                            e.currentTarget.blur();
                                                                                        }}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setPopup((curr) =>
                                                                                                curr && curr.iso === iso
                                                                                                    ? null
                                                                                                    : { iso, appointments: dayAppointments }
                                                                                            );
                                                                                        }}
                                                                                    >
                                                                                        +
                                                                                    </button>
                                                                                )}
                                                                            </div>

                                                                            {isPopupOpen && (
                                                                                <div
                                                                                    id={`quarter-popup-${popup.iso}`}
                                                                                    style={{ position: 'absolute', top: '100%', right: 0, width: 320, zIndex: 2100 }}
                                                                                    className="rounded-lg border bg-white shadow-lg p-3 text-sm mt-2"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                        <div className="font-semibold">Appointments on {popup.iso}</div>
                                                                                        <button className="text-gray-500 hover:text-gray-700" onClick={() => setPopup(null)} aria-label="Close">✕</button>
                                                                                    </div>
                                                                                    <div className="max-h-64 overflow-auto">
                                                                                        {popup.appointments && popup.appointments.length > 0 && (
                                                                                            <div className="mb-2">
                                                                                                {popup.appointments.map((ev) => {
                                                                                                    const title = ev.title || '(event)';
                                                                                                    return (
                                                                                                        <div
                                                                                                            key={`ev-${ev.id}`}
                                                                                                            className="group w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50"
                                                                                                        >
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                className="flex-1 text-left truncate"
                                                                                                                onClick={() => {
                                                                                                                    setPopup(null);
                                                                                                                    return onEventClick && onEventClick(ev);
                                                                                                                }}
                                                                                                                title={title}
                                                                                                            >
                                                                                                                <div className="truncate">{title}</div>
                                                                                                            </button>
                                                                                                            <span className="inline-flex items-center gap-1 shrink-0 overflow-hidden max-w-0 group-hover:max-w-12 transition-all duration-150">
                                                                                                                <button
                                                                                                                    type="button"
                                                                                                                    className="p-0.5 rounded hover:bg-black/10"
                                                                                                                    onClick={(e) => {
                                                                                                                        e.stopPropagation();
                                                                                                                        setPopup(null);
                                                                                                                        onEventClick && onEventClick(ev, 'edit');
                                                                                                                    }}
                                                                                                                    aria-label={`Edit ${title}`}
                                                                                                                    title="Edit event"
                                                                                                                >
                                                                                                                    <FaEdit className="w-3 h-3 text-blue-600" />
                                                                                                                </button>
                                                                                                                <button
                                                                                                                    type="button"
                                                                                                                    className="p-0.5 rounded hover:bg-black/10"
                                                                                                                    onClick={(e) => {
                                                                                                                        e.stopPropagation();
                                                                                                                        setPopup(null);
                                                                                                                        onEventClick && onEventClick(ev, 'delete');
                                                                                                                    }}
                                                                                                                    aria-label={`Delete ${title}`}
                                                                                                                    title="Delete event"
                                                                                                                >
                                                                                                                    <FaTrash className="w-3 h-3 text-red-600" />
                                                                                                                </button>
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    );
                                                                                                })}
                                                                                            </div>
                                                                                        )}
                                                                                        {(!popup.appointments || popup.appointments.length === 0) && (
                                                                                            <div className="text-gray-500">No items</div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    );
                                        return weekTbody;
                                    })}
                                </table>
                            </div>
                        );
                    })}
                    </div>
                    </div>
                    </div>
                </div>
                </div>
            </div>

            
        </>
    );
}
