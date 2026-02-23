import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from "react";
import { FaChevronLeft, FaChevronRight, FaChevronDown, FaPlus } from "react-icons/fa";
import { useCalendarPreferences } from "../../hooks/useCalendarPreferences";

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

// ...existing code...
export default function QuarterView({
    currentDate,
    onShiftDate,
    onSetDate,
    events,
    categories,
    onDayClick,
    onEventClick,
    view,
    onChangeView,
    filterType,
    onChangeFilter,
}) {
    const { formatDate } = useCalendarPreferences();
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

    const getEventKey = (ev, idx = 0) => {
        try {
            if (ev?.id) return String(ev.id);
            const s = ev?.start || ev?.startDate || ev?.start_at || '';
            const e = ev?.end || ev?.endDate || ev?.end_at || '';
            const t = ev?.title || '';
            return `${s}|${e}|${t}|${idx}`;
        } catch (_) {
            return `ev-${idx}`;
        }
    };

    const quarterEventLanes = useMemo(() => {
        const source = (Array.isArray(events) ? events : [])
            .filter((ev) => String(ev?.kind || '').toLowerCase() !== 'appointment' && !ev?.taskId && !ev?.task_id)
            .map((ev, idx) => {
                const span = eventSpanByDate(ev);
                if (!span) return null;
                return {
                    ev,
                    key: getEventKey(ev, idx),
                    span,
                    createdAt: new Date(ev?.createdAt || ev?.created_at || 0).getTime(),
                    startTs: new Date(ev?.start || ev?.startDate || ev?.start_at || 0).getTime(),
                    title: String(ev?.title || ''),
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                if (a.startTs !== b.startTs) return a.startTs - b.startTs;
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

        return { laneByKey };
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
    const [popup, setPopup] = useState(null);
    // popup: { iso: 'YYYY-MM-DD', events: [], rect: DOMRect }
    // refs to allow equalizing row heights across the three month columns
    const rowRefs = useRef([]); // rowRefs.current[mIdx][wIdx][dayIdx] = tr element
    const weekBlockRefs = useRef([]); // weekBlockRefs.current[mIdx][wIdx] = tbody element
    const monthColRefs = useRef([]); // monthColRefs.current[mIdx] = month column div
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

    const scrollToDate = (date) => {
        try {
            if (!gridRef.current) return;
            const iso = date.toISOString().slice(0, 10);
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
                            const colRect = colRects[mIdx];
                            if (!el || !colRect) continue;

                            const r = el.getBoundingClientRect();
                            const top = r.bottom - rect.top + container.scrollTop;
                            const left = colRect.left - rect.left + container.scrollLeft;
                            const right = colRect.right - rect.left + container.scrollLeft;

                            lines.push({ top, left, right });
                        }
                    }

                    setWeekSeparators(lines);
                    setWeekVerticalDividers(verticalDividers);
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
            `}</style>
            <div className="h-full min-h-0 flex flex-col">
                {/* Quarter navigation inside view */}
                <div className="flex items-center justify-between py-3 bg-white border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        {/* Back first, then View dropdown */}
                        <button
                            className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                            style={{ minWidth: 36, minHeight: 36 }}
                            aria-label="Previous month"
                            onClick={() => onShiftDate && onShiftDate({ months: -1 })}
                        >
                            <FaChevronLeft />
                        </button>
                        <div className="relative">
                            <button
                                className="px-2 py-1 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center gap-2"
                                style={{ minWidth: 36, minHeight: 28 }}
                                onClick={() => setShowViewMenu((s) => !s)}
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
                                    className="absolute z-50 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
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
                    <span className="text-lg font-semibold text-blue-700">{quarterLabel}</span>
                    <div className="flex items-center gap-2">
                        <button
                            className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                            style={{ minWidth: 36, minHeight: 36 }}
                            aria-label="Today"
                            onClick={() => {
                                try {
                                    if (typeof onSetDate === 'function') onSetDate(new Date());
                                } catch (_) {}
                                // scroll to and highlight today's cell after render
                                setTimeout(() => scrollToDate(new Date()), 80);
                            }}
                        >
                            Today
                        </button>
                        <button
                            className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                            style={{ minWidth: 36, minHeight: 36 }}
                            aria-label="Next month"
                            onClick={() => onShiftDate && onShiftDate({ months: 1 })}
                        >
                            <FaChevronRight />
                        </button>
                    </div>
                </div>
                <div className="relative grid grid-cols-3 gap-6 flex-shrink-0 bg-white border-b border-blue-100">
                    {monthLongNames.map((monthName, idx) => (
                        <div key={`month-header-${idx}`} className="text-left px-2 py-2 text-blue-500 text-base font-semibold bg-white min-w-0">
                            {monthName}
                        </div>
                    ))}
                </div>
                {/* Calendar grid: three independent month columns */}
                <div
                    ref={gridRef}
                    className="relative flex-1 min-h-0 overflow-auto"
                    style={{ maxWidth: "100%", maxHeight: "100%" }}
                >
                <div className="relative grid grid-cols-3 gap-6 min-w-full pb-6">
                    {weekSeparators.length > 0 && (
                        <div className="pointer-events-none absolute left-0 right-0 top-0">
                            {weekSeparators.map((line, idx) => (
                                <div
                                    key={`wk-line-${idx}`}
                                    style={{ top: line.top, left: line.left, width: Math.max(0, line.right - line.left) }}
                                    className="absolute h-[2px] bg-blue-300"
                                />
                            ))}
                        </div>
                    )}
                    {weekVerticalDividers.length > 0 && (
                        <div className="pointer-events-none absolute left-0 right-0 top-0">
                            {weekVerticalDividers.map((line, idx) => (
                                <div
                                    key={`wk-vline-${idx}`}
                                    style={{ left: line.left, top: line.top, height: line.height }}
                                    className="absolute w-px bg-slate-200/60"
                                />
                            ))}
                        </div>
                    )}
                    {months.map((monthDate, mIdx) => {
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
                                <table className="w-full" style={{ tableLayout: 'fixed' }}>
                                    {monthWeeks.map((week, wIdx) => {
                                    const weekTbody = (
                                        <tbody
                                            key={`week-${wIdx}`}
                                            ref={(el) => setWeekBlockRef(mIdx, wIdx, el)}
                                            className="bg-white border border-blue-200 my-1"
                                        >
                                            {week.days.map((date, dayIdx) => {
                                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                                const showWeekNum = dayIndexMonday(date) === 0; // show only on Monday
                                                const rowBorderClass = dayIdx < week.days.length - 1 ? "border-b border-blue-100" : "";
                                                return (
                                                    <tr ref={(el) => setRowRef(mIdx, wIdx, dayIdx, el)} key={dayIdx} className="bg-white">
                                                        <td
                                                            className={`px-3 py-3 text-left align-top ${rowBorderClass}`}
                                                            data-date={date.toISOString().slice(0,10)}
                                                            style={{ minWidth: 80, position: 'relative' }}
                                                        >
                                                            <div className={`text-sm font-semibold flex items-center justify-between ${isWeekend ? 'text-red-500' : 'text-gray-700'}`}>
                                                                <div className="flex flex-col w-20 pr-2">
                                                                    {showWeekNum && week.weekNum && (
                                                                        <span className="text-[10px] text-gray-500 leading-none self-end mr-2 mb-0.5 px-1 rounded bg-white">
                                                                            {week.weekNum}
                                                                        </span>
                                                                    )}
                                                                    <div className="flex items-center gap-0.5">
                                                                        <span className="w-8 inline-block">{formatDate(date, { includeWeekday: true }).split(',')[0]}</span>
                                                                        <span className="">{date.getDate()}</span>
                                                                    </div>
                                                                </div>
                                                                {(() => {
                                                                    const dayEvents = (events || []).filter((ev) =>
                                                                        overlapsDayByCalendarDate(ev.start, ev.end, date) &&
                                                                        String(ev?.kind || '').toLowerCase() !== 'appointment' &&
                                                                        !ev?.taskId &&
                                                                        !ev?.task_id
                                                                    );
                                                                    const dayAppointments = (events || []).filter((ev) =>
                                                                        overlapsDayByCalendarDate(ev.start, ev.end, date) &&
                                                                        String(ev?.kind || '').toLowerCase() === 'appointment'
                                                                    );
                                                                    // For quarter view we don't render chips inline. Instead show a '+' icon
                                                                    // to the right which opens a popup listing appointments for the date.
                                                                    if (dayEvents.length === 0 && dayAppointments.length === 0) return null;
                                                                    const iso = date.toISOString().slice(0,10);
                                                                    const dayEventsSorted = [...dayEvents].sort((a, b) => {
                                                                        try {
                                                                            const as = new Date(a.start || a.startDate || a.start_at || 0).getTime();
                                                                            const bs = new Date(b.start || b.startDate || b.start_at || 0).getTime();
                                                                            if (as !== bs) return as - bs;
                                                                            const ac = new Date(a.createdAt || a.created_at || 0).getTime();
                                                                            const bc = new Date(b.createdAt || b.created_at || 0).getTime();
                                                                            if (!Number.isNaN(ac) && !Number.isNaN(bc) && ac !== bc) return ac - bc;
                                                                        } catch (_) {}
                                                                        return String(a?.title || '').localeCompare(String(b?.title || ''));
                                                                    });
                                                                    const dayOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
                                                                    const isPopupOpen = popup && popup.iso === iso;
                                                                    const dayEventsWithLane = dayEventsSorted.map((ev, idx) => ({
                                                                        ev,
                                                                        lane: quarterEventLanes.laneByKey.get(getEventKey(ev, idx)) ?? 0,
                                                                    }));
                                                                    const maxLane = dayEventsWithLane.reduce((m, x) => Math.max(m, x.lane), 0);
                                                                    const totalColumns = Math.min(3, Math.max(1, maxLane + 1));
                                                                    const visibleEvents = dayEventsWithLane
                                                                        .filter((x) => x.lane < 3)
                                                                        .sort((a, b) => a.lane - b.lane);
                                                                    const moreCount = Math.max(0, dayEventsWithLane.length - visibleEvents.length);
                                                                    return (
                                                                        <div
                                                                            className="ml-2 flex items-center"
                                                                            style={{ position: 'absolute', left: 76, right: 8, top: -1, bottom: -1, zIndex: isPopupOpen ? 2000 : 20 }}
                                                                        >
                                                                            <div style={{ position: 'relative', flex: 1, height: '100%', marginRight: 24 }}>
                                                                                {visibleEvents.map(({ ev, lane }, idx) => {
                                                                                    const span = eventSpanByDate(ev);
                                                                                    const startsHere = span ? sameDateOnly(span.start, dayOnly) : false;
                                                                                    const endsHere = span ? sameDateOnly(span.end, dayOnly) : false;
                                                                                    const leftPct = (lane / totalColumns) * 100;
                                                                                    const widthPct = 100 / totalColumns;
                                                                                    return (
                                                                                        <button
                                                                                            key={`qv-ev-${iso}-${ev.id || idx}`}
                                                                                            type="button"
                                                                                            className="group text-left px-2 text-[12px] font-medium text-white"
                                                                                            style={{
                                                                                                position: 'absolute',
                                                                                                top: 0,
                                                                                                bottom: 0,
                                                                                                left: `calc(${leftPct}% + ${totalColumns > 1 ? 1 : 0}px)`,
                                                                                                width: `calc(${widthPct}% - ${totalColumns > 1 ? 2 : 0}px)`,
                                                                                                backgroundColor: '#6BC3D0',
                                                                                                borderRadius: startsHere && endsHere ? 6 : startsHere ? '6px 6px 0 0' : endsHere ? '0 0 6px 6px' : 0,
                                                                                                boxShadow: '0 0 0 1px rgba(0,0,0,0.03)',
                                                                                                overflow: 'hidden',
                                                                                            }}
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                if (onEventClick) onEventClick(ev);
                                                                                            }}
                                                                                            title={ev.title || '(event)'}
                                                                                        >
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
                                                                                                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" className="w-3 h-3" xmlns="http://www.w3.org/2000/svg"><path d="M402.3 344.9l32-32c5-5 13.7-1.5 13.7 5.7V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128c0-35.3 28.7-64 64-64h229.5c7.2 0 10.7 8.7 5.7 13.7l-32 32c-1.5 1.5-3.5 2.3-5.7 2.3H64v336h320V350.5c0-2.1.8-4.1 2.3-5.6zM566.6 54.6l-45.3-45.3c-12.5-12.5-32.8-12.5-45.2 0L184 301.4l-21.2 92.6c-2.3 10.1 6.8 19.2 16.9 16.9l92.6-21.2 292.2-292.2c12.5-12.5 12.5-32.8.1-45.2z"></path></svg>
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
                                                                                                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="w-3 h-3" xmlns="http://www.w3.org/2000/svg"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64s14.3 32 32 32h384c17.7 0 32-14.3 32-32s-14.3-32-32-32h-96l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32l21.2 339.4c1.7 26.6 23.8 44.6 50.4 44.6h240.8c26.6 0 48.7-18 50.4-44.6L416 128z"></path></svg>
                                                                                                        </button>
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>

                                                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                                                {moreCount > 0 && (
                                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                                                                                        +{moreCount}
                                                                                    </span>
                                                                                )}
                                                                                {dayAppointments.length > 0 && (
                                                                                    <button
                                                                                        aria-label={`Show appointments for ${iso}`}
                                                                                        className="text-sm text-blue-700 hover:bg-slate-50 p-0.5 rounded inline-flex items-center"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setPopup({ iso, appointments: dayAppointments });
                                                                                        }}
                                                                                    >
                                                                                        <FaPlus size={12} />
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
                                                                                                <div className="text-xs text-gray-500 mb-1">Appointments</div>
                                                                                                {popup.appointments.map((ev) => (
                                                                                                    <button
                                                                                                        key={`ev-${ev.id}`}
                                                                                                        className="w-full text-left px-2 py-1 rounded hover:bg-slate-50"
                                                                                                        onClick={() => {
                                                                                                            setPopup(null);
                                                                                                            return onEventClick && onEventClick(ev);
                                                                                                        }}
                                                                                                    >
                                                                                                        <div className="truncate">{ev.title || '(event)'}</div>
                                                                                                    </button>
                                                                                                ))}
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
                                                            </div>
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

            
        </>
    );
}
