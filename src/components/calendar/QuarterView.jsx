import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import { FaChevronLeft, FaChevronRight, FaChevronDown } from "react-icons/fa";

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

function getQuarterMonths(date, quarterOffset = 0) {
    const month = date.getMonth();
    const year = date.getFullYear();
    const currentQuarter = Math.floor(month / 3);
    const targetQuarter = currentQuarter + quarterOffset;
    const targetYear = year + Math.floor(targetQuarter / 4);
    const startMonth = (targetQuarter % 4) * 3;
    return [0, 1, 2].map((i) => new Date(targetYear, startMonth + i, 1));
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
    todos = [],
    categories,
    onDayClick,
    onEventClick,
    onTaskClick,
    view,
    onChangeView,
    filterType,
    onChangeFilter,
}) {
    const today = new Date();
    const months = getQuarterMonths(currentDate || today, 0);
    // month display values
    const monthLongNames = months.map((m) => m.toLocaleString("default", { month: "long" }));
    const monthShortNames = months.map((m) => m.toLocaleString("default", { month: "short" }));
    // Simplified quarter range like "Jan-Mar 26". If months span years, show both years (e.g. "Dec 26 - Feb 27").
    const years = months.map((m) => m.getFullYear());
    let quarterLabel = "";
    if (years.every((y) => y === years[0])) {
        const yy = String(years[0]).slice(-2);
        quarterLabel = `${monthShortNames[0]}-${monthShortNames[2]} ${yy}`;
    } else {
        const y0 = String(years[0]).slice(-2);
        const y2 = String(years[2]).slice(-2);
        quarterLabel = `${monthShortNames[0]} ${y0} - ${monthShortNames[2]} ${y2}`;
    }
    // (replaced below with calendar-aligned weeks)

    // Helpers for day span checks
    const getDayBounds = (date) => {
        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        return { start, end };
    };
    const overlapsDay = (rangeStart, rangeEnd, dayStart, dayEnd) => {
        const s = rangeStart ? new Date(rangeStart) : null;
        const e = rangeEnd ? new Date(rangeEnd) : null;
        if (!s && !e) return false;
        const rs = s || e;
        const re = e || s;
        return rs <= dayEnd && re >= dayStart;
    };
    const taskSpan = (t) => {
        // Prefer explicit start/end, otherwise use dueDate as both
        const s = t.startDate || t.dueDate || t.endDate || null;
        const e = t.endDate || t.dueDate || t.startDate || s || null;
        return { s, e };
    };

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
    // refs to allow equalizing row heights across the three month columns
    const rowRefs = useRef([]); // rowRefs.current[mIdx][wIdx][dayIdx] = tr element
    const setRowRef = (mIdx, wIdx, dayIdx, el) => {
        if (!rowRefs.current[mIdx]) rowRefs.current[mIdx] = [];
        if (!rowRefs.current[mIdx][wIdx]) rowRefs.current[mIdx][wIdx] = [];
        rowRefs.current[mIdx][wIdx][dayIdx] = el;
    };
    const gridRef = useRef(null);

    const scrollToDate = (date) => {
        try {
            if (!gridRef.current) return;
            const iso = date.toISOString().slice(0, 10);
            const el = gridRef.current.querySelector(`[data-date="${iso}"]`);
            if (!el) return;
            el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
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

    // Equalize heights after layout. Runs on content change and window resize.
    useLayoutEffect(() => {
        if (!rowRefs.current || rowRefs.current.length === 0) return;
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
    }, [events, todos]);

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
    return (
        <div className="p-0" style={{ boxShadow: "none" }}>
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
            {/* Quarter navigation inside view */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
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
                                {["day", "week", "month", "quarter", "list"].map((v) => (
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
            {/* Calendar grid: three independent month columns */}
            <div ref={gridRef} className="flex gap-6 px-6 pb-6 overflow-auto" style={{ maxWidth: "100vw", maxHeight: "60vh" }}>
                {months.map((monthDate, mIdx) => {
                    // Build weeks for this month (Mon..Sun) starting with week that contains the 1st
                    const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
                    const lastOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
                    const dayIndexMonday = (d) => (d.getDay() + 6) % 7; // 0 = Monday
                    const monthFirstWeekStart = new Date(firstOfMonth);
                    monthFirstWeekStart.setDate(firstOfMonth.getDate() - dayIndexMonday(firstOfMonth));
                    const monthLastWeekEnd = new Date(lastOfMonth);
                    monthLastWeekEnd.setDate(lastOfMonth.getDate() + (6 - dayIndexMonday(lastOfMonth)));
                    // Assign weeks to this month only up to (but not including) the week that contains the next month's 1st.
                    const nextMonthFirst = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
                    const nextMonthFirstWeekStart = new Date(nextMonthFirst);
                    nextMonthFirstWeekStart.setDate(nextMonthFirst.getDate() - dayIndexMonday(nextMonthFirst));

                    const monthWeeks = [];
                    for (let ws = new Date(monthFirstWeekStart); ws < nextMonthFirstWeekStart; ws.setDate(ws.getDate() + 7)) {
                        const weekStart = new Date(ws);
                        const days = Array.from({ length: 7 }, (_, i) => {
                            const d = new Date(weekStart);
                            d.setDate(weekStart.getDate() + i);
                            return d;
                        });
                        monthWeeks.push({ weekStart: new Date(weekStart), weekNum: getWeekNumberLocal(weekStart), days });
                    }

                    return (
                        <div key={mIdx} className={`w-1/3 ${mIdx > 0 ? 'border-l border-blue-200 pl-4' : ''}`}>
                            <div className="text-left px-2 py-2 text-blue-500 text-base font-semibold">{monthLongNames[mIdx]}</div>
                            <table className="w-full" style={{ tableLayout: 'fixed' }}>
                                {monthWeeks.map((week, wIdx) => {
                                    const weekTbody = (
                                        <tbody key={`week-${wIdx}`} className="bg-white border border-blue-200 my-1">
                                            {week.days.map((date, dayIdx) => {
                                                const isCurrentMonth = date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear();
                                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                                const showWeekNum = dayIdx === 0; // Monday row
                                                return (
                                                    <tr ref={(el) => setRowRef(mIdx, wIdx, dayIdx, el)} key={dayIdx} className="bg-white">
                                                        <td
                                                            className={`px-3 py-3 text-left align-top cursor-pointer ${!isCurrentMonth ? 'text-gray-300' : ''}`}
                                                            data-date={date.toISOString().slice(0,10)}
                                                            style={{ minWidth: 80 }}
                                                            onClick={() => onDayClick && onDayClick(date)}
                                                        >
                                                            {showWeekNum && week.weekNum && (
                                                                <span className="text-[11px] text-gray-500 bg-white px-1 rounded">
                                                                    {week.weekNum}
                                                                </span>
                                                            )}
                                                            <div className={`text-sm font-semibold flex items-center gap-1 ${isWeekend ? 'text-red-500' : 'text-gray-700'}`}>
                                                                <span className="w-12 inline-block">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                                                                <span className="">{date.getDate()}</span>
                                                            </div>
                                                            {/* daily chips */}
                                                            {(() => {
                                                                const { start: dStart, end: dEnd } = getDayBounds(date);
                                                                const dayEvents = (events || []).filter((ev) => overlapsDay(ev.start, ev.end, dStart, dEnd));
                                                                const dayTodos = (todos || []).filter((t) => {
                                                                    const { s, e } = taskSpan(t);
                                                                    return overlapsDay(s, e, dStart, dEnd);
                                                                });
                                                                const chips = [];
                                                                for (const ev of dayEvents) {
                                                                    const color = categories?.[ev.kind]?.color || 'bg-slate-300';
                                                                    chips.push({ type: 'event', id: ev.id, title: ev.title || '(event)', color, taskId: ev.taskId, data: ev });
                                                                }
                                                                const eventTaskIds = new Set(dayEvents.map((e) => String(e.taskId || '')));
                                                                for (const t of dayTodos) {
                                                                    if (eventTaskIds.has(String(t.id))) continue;
                                                                    chips.push({ type: 'task', id: t.id, title: t.title || '(task)', color: '#7ED4E3', data: t });
                                                                }
                                                                const maxShow = 3;
                                                                const show = chips.slice(0, maxShow);
                                                                const extra = chips.length - show.length;
                                                                if (chips.length === 0) return null;
                                                                return (
                                                                    <div className="mt-2 flex flex-col gap-1 items-start">
                                                                        {show.map((c) => (
                                                                            <button
                                                                                key={`${c.type}-${c.id}`}
                                                                                title={c.title}
                                                                                className={`text-[11px] px-2 py-[2px] rounded hover:opacity-90 truncate w-full`}
                                                                                style={c.type === 'task' ? { backgroundColor: '#7ED4E3', color: '#0B4A53' } : undefined}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (c.type === 'event') {
                                                                                        if (c.taskId && onTaskClick) return onTaskClick(String(c.taskId));
                                                                                        return onEventClick && onEventClick(c.data);
                                                                                    }
                                                                                    if (c.type === 'task') return onTaskClick && onTaskClick(String(c.id));
                                                                                }}
                                                                            >
                                                                                <span className="truncate">{c.title}</span>
                                                                            </button>
                                                                        ))}
                                                                        {extra > 0 && <div className="text-[11px] text-blue-700">+{extra} more</div>}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    );
                                    // Render separator after every week except the last one so rows are visually separated
                                    if (wIdx < monthWeeks.length - 1) {
                                        return (
                                            <React.Fragment key={`frag-${wIdx}`}>
                                                {weekTbody}
                                                <tbody key={`sep-${wIdx}`}>
                                                    <tr>
                                                        <td>
                                                            <hr className="border-t border-blue-200 my-0" />
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </React.Fragment>
                                        );
                                    }
                                    return weekTbody;
                                })}
                            </table>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
