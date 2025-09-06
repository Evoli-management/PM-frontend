import React, { useState } from "react";
import { FaChevronLeft, FaChevronRight, FaChevronDown } from "react-icons/fa";

function getWeekNumber(date) {
    const firstJan = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - firstJan) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + firstJan.getDay() + 1) / 7);
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
    const monthNames = months.map((m) => m.toLocaleString("default", { month: "long", year: "numeric" }));
    const weeks = getWeeksInQuarter(months);

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
        const firstJan = new Date(date.getFullYear(), 0, 1);
        const days = Math.floor((date - firstJan) / (24 * 60 * 60 * 1000));
        return Math.ceil((days + firstJan.getDay() + 1) / 7);
    }

    const rows = getWeeksInQuarter(months);
    let weekNums = [];
    for (let i = 0; i < rows.length; i++) {
        const weekDate = rows[i][0];
        let weekNum = "";
        if (weekDate) {
            weekNum = getWeekNumberLocal(weekDate);
        } else {
            for (let m = 1; m < rows[i].length; m++) {
                if (rows[i][m]) {
                    weekNum = getWeekNumberLocal(rows[i][m]);
                    break;
                }
            }
        }
        weekNums.push(weekNum);
    }

    const [showViewMenu, setShowViewMenu] = useState(false);
    return (
        <div className="p-0" style={{ boxShadow: "none" }}>
            {/* Quarter navigation inside view */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-blue-100">
                <div className="flex items-center gap-2">
                    {/* Back first, then View dropdown */}
                    <button
                        className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                        style={{ minWidth: 36, minHeight: 36 }}
                        aria-label="Previous quarter"
                        onClick={() => onShiftDate && onShiftDate(-1)}
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
                <span className="text-lg font-semibold text-blue-700">{monthNames.join(" / ")}</span>
                <div className="flex items-center gap-2">
                    <select
                        className="px-2 py-1 rounded border text-sm font-semibold text-blue-900 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-700"
                        style={{ minHeight: 28 }}
                        value={filterType}
                        onChange={(e) => onChangeFilter && onChangeFilter(e.target.value)}
                        aria-label="Filter event types"
                    >
                        <option value="all">All Types</option>
                        <option value="task">Tasks</option>
                        <option value="reminder">Reminders</option>
                        <option value="meeting">Meetings</option>
                        <option value="custom">Custom</option>
                    </select>
                    <button
                        className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                        style={{ minWidth: 36, minHeight: 36 }}
                        aria-label="Next quarter"
                        onClick={() => onShiftDate && onShiftDate(1)}
                    >
                        <FaChevronRight />
                    </button>
                </div>
            </div>
            {/* Calendar grid */}
            <div
                className="overflow-x-auto px-6 pb-6"
                style={{ maxWidth: "100vw", maxHeight: "60vh", overflowY: "auto" }}
            >
                <table className="w-full border border-blue-100 rounded" style={{ tableLayout: "auto", width: "100%" }}>
                    <thead>
                        <tr className="bg-blue-50">
                            {months.map((m, mIdx) => (
                                <th key={mIdx} className="text-center px-2 py-2 text-blue-500 text-base font-semibold">
                                    {m.toLocaleString("default", { month: "long", year: "numeric" })}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rIdx) => (
                            <React.Fragment key={rIdx}>
                                <tr className={rIdx % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                                    {row.map((date, mIdx) => {
                                        if (!date)
                                            return (
                                                <td
                                                    key={mIdx}
                                                    className="px-2 py-2 text-center align-top text-gray-300"
                                                >
                                                    —
                                                </td>
                                            );
                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                        let weekNumSpan = null;
                                        if (date.getDay() === 1) {
                                            const weekNum = getWeekNumber(date);
                                            weekNumSpan = (
                                                <span
                                                    className="text-xs text-gray-400 align-top mr-1"
                                                    style={{ position: "relative", top: "-2px" }}
                                                >
                                                    {weekNum}
                                                </span>
                                            );
                                        }
                                        return (
                                            <td
                                                key={mIdx}
                                                className={`px-3 py-3 text-center align-top cursor-pointer border border-blue-100 hover:bg-blue-100`}
                                                style={{ minWidth: 80 }}
                                                onClick={() => onDayClick && onDayClick(date)}
                                            >
                                                <span
                                                    className={`text-sm font-semibold flex items-center justify-center gap-1 ${isWeekend ? "text-red-500" : "text-gray-700"}`}
                                                >
                                                    {weekNumSpan}
                                                    {date.toLocaleDateString(undefined, {
                                                        weekday: "short",
                                                        day: "numeric",
                                                    })}
                                                </span>
                                                {/* Daily items: up to 3 chips from events/todos */}
                                                {(() => {
                                                    const { start: dStart, end: dEnd } = getDayBounds(date);
                                                    const dayEvents = (events || []).filter((ev) =>
                                                        overlapsDay(ev.start, ev.end, dStart, dEnd),
                                                    );
                                                    const dayTodos = (todos || []).filter((t) => {
                                                        const { s, e } = taskSpan(t);
                                                        return overlapsDay(s, e, dStart, dEnd);
                                                    });
                                                    const chips = [];
                                                    // Events first
                                                    for (const ev of dayEvents) {
                                                        const color = categories?.[ev.kind]?.color || "bg-slate-300";
                                                        chips.push({
                                                            type: "event",
                                                            id: ev.id,
                                                            title: ev.title || "(event)",
                                                            color,
                                                            taskId: ev.taskId,
                                                            data: ev,
                                                        });
                                                    }
                                                    // Then todos (tasks) that don't already have an event this day
                                                    const eventTaskIds = new Set(
                                                        dayEvents.map((e) => String(e.taskId || "")),
                                                    );
                                                    for (const t of dayTodos) {
                                                        if (eventTaskIds.has(String(t.id))) continue;
                                                        chips.push({
                                                            type: "task",
                                                            id: t.id,
                                                            title: t.title || "(task)",
                                                            color: "#7ED4E3",
                                                            data: t,
                                                        });
                                                    }
                                                    const maxShow = 3;
                                                    const show = chips.slice(0, maxShow);
                                                    const extra = chips.length - show.length;
                                                    if (chips.length === 0) return null;
                                                    return (
                                                        <div className="mt-2 flex flex-col gap-1 items-center">
                                                            {show.map((c) => (
                                                                <button
                                                                    key={`${c.type}-${c.id}`}
                                                                    title={c.title}
                                                                    className={`text-[11px] px-2 py-[2px] rounded hover:opacity-90 truncate w-full`}
                                                                    style={
                                                                        c.type === "task"
                                                                            ? {
                                                                                  backgroundColor: "#7ED4E3",
                                                                                  color: "#0B4A53",
                                                                              }
                                                                            : undefined
                                                                    }
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (c.type === "event") {
                                                                            if (c.taskId && onTaskClick)
                                                                                return onTaskClick(String(c.taskId));
                                                                            return onEventClick && onEventClick(c.data);
                                                                        }
                                                                        if (c.type === "task")
                                                                            return (
                                                                                onTaskClick && onTaskClick(String(c.id))
                                                                            );
                                                                    }}
                                                                >
                                                                    <span className="truncate">{c.title}</span>
                                                                </button>
                                                            ))}
                                                            {extra > 0 && (
                                                                <div className="text-[11px] text-blue-700">
                                                                    +{extra} more
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                        );
                                    })}
                                </tr>
                                {(rIdx + 1) % 7 === 0 && (
                                    <tr>
                                        <td colSpan={months.length}>
                                            <hr className="border-t border-blue-200 my-0" />
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
