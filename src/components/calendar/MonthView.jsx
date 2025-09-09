import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FixedSizeList } from "react-window";

const HOURS = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    return `${h}:${m}`;
});
const WEEKDAYS = ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"];

import { FaChevronLeft, FaChevronRight, FaChevronDown } from "react-icons/fa";

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
}) {
    // Working hours: 8:00 to 18:00
    const ALL_HOURS = Array.from({ length: 48 }, (_, i) => {
        const h = Math.floor(i / 2);
        const m = i % 2 === 0 ? "00" : "30";
        return `${h}:${m}`;
    });
    const WORKING_HOURS = ALL_HOURS.filter((h) => {
        const hour = Number(h.split(":")[0]);
        return hour >= 8 && hour <= 18;
    });
    const [showAllHours, setShowAllHours] = useState(false);
    const HOURS = showAllHours ? ALL_HOURS : WORKING_HOURS;
    const WEEKDAYS = ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"];

    const today = new Date();
    const baseDate = new Date((currentDate || today).getFullYear(), (currentDate || today).getMonth(), 1);
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

    // Helper to round minutes to nearest 30 for slotting
    const toSlotKey = (d) => {
        const date = new Date(d);
        const mins = date.getMinutes();
        const half = Math.round(mins / 30) * 30;
        if (half === 60) {
            date.setHours(date.getHours() + 1, 0, 0, 0);
        } else {
            date.setMinutes(half, 0, 0);
        }
        const hr = String(date.getHours()).padStart(2, "0");
        const mn = String(date.getMinutes()).padStart(2, "0");
        return `${date.getDate()}-${hr}:${mn}`;
    };

    // Merge events and tasks (todos) into the same slots for rendering
    const eventsBySlot = {};
    const eventTaskIdsBySlot = {};
    const pushSlot = (key, item) => {
        if (!eventsBySlot[key]) eventsBySlot[key] = [];
        eventsBySlot[key].push(item);
    };
    (Array.isArray(events) ? events : []).forEach((ev) => {
        const key = toSlotKey(ev.start);
        pushSlot(key, ev);
        const tid = ev.taskId;
        if (tid) {
            if (!eventTaskIdsBySlot[key]) eventTaskIdsBySlot[key] = new Set();
            eventTaskIdsBySlot[key].add(String(tid));
        }
    });
    (Array.isArray(todos) ? todos : []).forEach((t) => {
        const when = t.startDate || t.dueDate || t.endDate;
        if (!when) return;
        const key = toSlotKey(when);
        const hasEventForThisTask = eventTaskIdsBySlot[key]?.has(String(t.id));
        if (hasEventForThisTask) return; // avoid duplicates when a task already has a calendar event at this time
        pushSlot(key, { id: `todo-${t.id}`, title: t.title, kind: "custom" });
    });

    // Helpers for date-only comparisons
    const parseDateOnly = (iso) => {
        if (!iso) return null;
        const d = new Date(iso);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    const clampToMonth = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    // Build range tasks (multi-day or all-day single-day) and assign lanes with grouping:
    // 1) Start with max range to min range overall (by group max span)
    // 2) Tasks with the same start date must be consecutive regardless of their span
    const buildRangeTasks = () => {
        const ranges = [];
        (Array.isArray(todos) ? todos : []).forEach((t) => {
            let s = parseDateOnly(t.startDate) || parseDateOnly(t.dueDate) || parseDateOnly(t.endDate);
            let e = parseDateOnly(t.endDate) || parseDateOnly(t.dueDate) || parseDateOnly(t.startDate);
            if (!s && !e) return;
            if (s && e && s > e) {
                const tmp = s;
                s = e;
                e = tmp;
            }
            if (!s) s = e;
            if (!e) e = s;
            const isSingleDay = s.getTime() === e.getTime();
            const hasStartTime = !!t.startDate; // treat as timed
            if (isSingleDay && hasStartTime) return; // exclude timed single-day from all-day histogram
            const spanDays = Math.max(1, Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1);
            const startKey = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;
            ranges.push({ task: t, start: s, end: e, spanDays, startKey });
        });
        // Group by start date to keep tasks with the same start date consecutive
        const groupsMap = new Map();
        for (const r of ranges) {
            if (!groupsMap.has(r.startKey)) groupsMap.set(r.startKey, []);
            groupsMap.get(r.startKey).push(r);
        }
        const groups = Array.from(groupsMap.values()).map((items) => {
            const maxSpan = items.reduce((m, it) => Math.max(m, it.spanDays), 1);
            // items share the same date-only start; use first's start for tie-breaking
            const startDate = items[0].start;
            // Sort within group by span desc, then title for deterministic order
            items.sort((a, b) => {
                if (b.spanDays !== a.spanDays) return b.spanDays - a.spanDays;
                return String(a.task.title || "").localeCompare(String(b.task.title || ""));
            });
            return { items, maxSpan, startDate };
        });
        // Sort groups by their max span descending; tie-break by earlier start date
        groups.sort((ga, gb) => {
            if (gb.maxSpan !== ga.maxSpan) return gb.maxSpan - ga.maxSpan;
            return ga.startDate - gb.startDate;
        });
        // Flatten groups assigning lanes consecutively per group
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
    const lanesCount = Math.min(rangeTasks.length, 20); // cap lanes for readability
    // Scroll container ref (used by overlay/red-line measurements)
    const gridRef = useRef(null);

    // Measure all-day column positions to draw continuous overlay bars
    const allDayRefs = useRef([]);
    const [overlayMetrics, setOverlayMetrics] = useState({ colLeft: 0, colWidth: 0, rows: [] });
    useLayoutEffect(() => {
        const container = gridRef.current;
        if (!container) return;
        const crect = container.getBoundingClientRect();
        const rows = allDayRefs.current.filter(Boolean).map((el) => {
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
    }, [year, month, daysInMonth, todos, showAllHours]);
    useEffect(() => {
        const measure = () => {
            const container = gridRef.current;
            if (!container) return;
            const crect = container.getBoundingClientRect();
            const rows = allDayRefs.current.filter(Boolean).map((el) => {
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

    // Red line for current time
    useEffect(() => {
        const interval = setInterval(() => {
            if (!gridRef.current) return;
            const now = new Date();
            if (now.getMonth() !== month) {
                gridRef.current.style.setProperty("--red-line-top", "-9999px");
                return;
            }
            const hourIdx = HOURS.findIndex((h) => {
                const [hr, min] = h.split(":");
                return now.getHours() === Number(hr) && now.getMinutes() >= Number(min);
            });
            if (hourIdx === -1) {
                gridRef.current.style.setProperty("--red-line-top", "-9999px");
                return;
            }
            const slotHeight = 40; // px
            const top = slotHeight + hourIdx * slotHeight + ((now.getMinutes() % 30) / 30) * slotHeight;
            gridRef.current.style.setProperty("--red-line-top", `${top}px`);
        }, 60000);
        return () => clearInterval(interval);
    }, [month]);

    // Build grid rows: one per day
    const [showViewMenu, setShowViewMenu] = useState(false);
    return (
        <>
            <div className="p-0" style={{ overflowX: "hidden", maxWidth: "100vw" }}>
                {/* Header with navigation inside the view */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {/* Back first, then View dropdown */}
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
                    <h2 className="text-xl font-bold">
                        {baseDate.toLocaleString("default", { month: "long", year: "numeric" })}
                    </h2>
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
                            aria-label="Next month"
                            onClick={() => onShiftDate && onShiftDate(1)}
                        >
                            <FaChevronRight />
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-end mb-2">
                    <label className="mr-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            checked={showAllHours}
                            onChange={(e) => setShowAllHours(e.target.checked)}
                            className="mr-1"
                        />
                        Show all hours
                    </label>
                </div>
                <div
                    ref={gridRef}
                    className="relative overflow-x-auto px-2 pb-6"
                    style={{ maxWidth: "100vw", maxHeight: "60vh", overflowY: "auto" }}
                >
                    <table
                        className="min-w-full border border-sky-100 rounded-lg"
                        style={{
                            minWidth: `${(HOURS.length + 2) * 110}px`,
                            borderCollapse: "separate",
                            borderSpacing: 0,
                        }}
                    >
                        <thead>
                            <tr className="bg-sky-50">
                                <th className="sticky left-0 bg-sky-50 text-left px-2 py-2 text-xs font-semibold text-gray-400 w-24 z-10">
                                    &nbsp;
                                </th>
                                <th className="sticky left-24 bg-sky-50 text-center px-2 py-2 text-xs font-semibold text-gray-400 w-40 z-10">
                                    all day
                                </th>
                                {HOURS.map((h, idx) => (
                                    <th
                                        key={idx}
                                        className="text-center px-1 py-2 text-xs font-semibold text-gray-400 w-16"
                                        style={{ minWidth: 40 }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {monthDays.map((date, idx) => {
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                const isToday =
                                    date.getDate() === (currentDate || today).getDate() &&
                                    date.getMonth() === (currentDate || today).getMonth() &&
                                    date.getFullYear() === (currentDate || today).getFullYear();
                                // Active segments for histogram lanes on this date
                                const dayOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                                const segments = rangeTasks
                                    .filter((r) => r.start <= dayOnly && dayOnly <= r.end)
                                    .map((r) => {
                                        const isSingle = r.start.getTime() === r.end.getTime();
                                        const isStart = dayOnly.getTime() === r.start.getTime();
                                        const isEnd = dayOnly.getTime() === r.end.getTime();
                                        const segType = isSingle
                                            ? "single"
                                            : isStart
                                              ? "start"
                                              : isEnd
                                                ? "end"
                                                : "middle";
                                        return { lane: r.lane, task: r.task, segType };
                                    });
                                return (
                                    <tr key={idx} className={idx % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                                        <td
                                            className={`sticky left-0 bg-white px-2 py-2 text-sm font-semibold w-24 z-10 ${isWeekend ? "text-red-500" : "text-gray-700"} ${isToday ? "text-blue-600" : ""}`}
                                        >
                                            {date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                                        </td>
                                        <td
                                            ref={(el) => (allDayRefs.current[idx] = el)}
                                            className="sticky left-24 bg-white px-1 py-0 text-left align-top w-40 z-10 border-x border-sky-100"
                                        >
                                            {/* overlay draws continuous poles; cell content intentionally minimal */}
                                            <span className="sr-only">all day</span>
                                        </td>
                                        {HOURS.map((h, hIdx) => {
                                            const [hr, min] = h.split(":");
                                            const key = `${date.getDate()}-${hr}:${min}`;
                                            const slotEvents = eventsBySlot[key] || [];
                                            return (
                                                <td
                                                    key={hIdx}
                                                    className="px-1 py-2 text-center align-top w-16 cursor-pointer border border-sky-100 hover:bg-blue-100"
                                                    style={{ minWidth: 40 }}
                                                    onClick={() => onEventClick({ day: date, hour: h })}
                                                >
                                                    {slotEvents.length > 0 &&
                                                        slotEvents.map((ev, i) => {
                                                            const color = categories[ev.kind]?.color || "bg-gray-200";
                                                            const isTaskBox =
                                                                Boolean(ev.taskId) ||
                                                                (typeof ev.id === "string" &&
                                                                    ev.id.startsWith("todo-"));
                                                            const handleClick = (e) => {
                                                                e.stopPropagation();
                                                                if (typeof onTaskClick !== "function") return;
                                                                if (ev.taskId) return onTaskClick(ev.taskId);
                                                                if (
                                                                    typeof ev.id === "string" &&
                                                                    ev.id.startsWith("todo-")
                                                                ) {
                                                                    const tid = ev.id.slice(5);
                                                                    if (tid) return onTaskClick(tid);
                                                                }
                                                            };
                                                            return (
                                                                <span
                                                                    key={i}
                                                                    className={`block px-2 py-1 rounded text-xs mb-1 ${isTaskBox ? "" : color} cursor-pointer w-full max-w-full overflow-hidden`}
                                                                    onClick={handleClick}
                                                                    title={ev.title}
                                                                    style={
                                                                        isTaskBox
                                                                            ? { backgroundColor: "#7ED4E3" }
                                                                            : undefined
                                                                    }
                                                                >
                                                                    <span className="truncate whitespace-nowrap min-w-0 block">
                                                                        {ev.title}
                                                                    </span>
                                                                </span>
                                                            );
                                                        })}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {/* Red line for current time */}
                    <div
                        style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: "var(--red-line-top)",
                            height: "2px",
                            background: "red",
                            zIndex: 10,
                        }}
                    ></div>
                    {/* Continuous all-day poles overlay (inside scroll container) */}
                    {overlayMetrics.rows.length > 0 && lanesCount > 0 && (
                        <div
                            className="absolute"
                            style={{
                                left: overlayMetrics.colLeft,
                                width: overlayMetrics.colWidth,
                                top: 0,
                                bottom: 0,
                                zIndex: 20,
                            }}
                        >
                            {(() => {
                                const laneWidth = 28; // wider bars for horizontal labels
                                const gap = 6; // small gap between bars
                                const maxLanes = Math.max(
                                    1,
                                    Math.floor((overlayMetrics.colWidth + gap) / (laneWidth + gap)),
                                );
                                return rangeTasks.map((r) => {
                                    if (r.lane >= lanesCount) return null;
                                    if (r.lane >= maxLanes) return null;
                                    // Clamp to visible month rows
                                    const startIdx = Math.max(
                                        0,
                                        r.start.getMonth() === month ? r.start.getDate() - 1 : 0,
                                    );
                                    const endIdx = Math.min(
                                        overlayMetrics.rows.length - 1,
                                        r.end.getMonth() === month
                                            ? r.end.getDate() - 1
                                            : overlayMetrics.rows.length - 1,
                                    );
                                    if (startIdx > endIdx) return null;
                                    const top = overlayMetrics.rows[startIdx]?.top ?? 0;
                                    const bottom = overlayMetrics.rows[endIdx]?.bottom ?? top;
                                    const height = Math.max(0, bottom - top);
                                    const left = r.lane * (laneWidth + gap);
                                    return (
                                        <div
                                            key={`ov-${r.task.id}`}
                                            className="rounded text-[10px] font-medium text-blue-900 flex items-start pointer-events-auto cursor-default"
                                            style={{
                                                position: "absolute",
                                                top,
                                                left,
                                                width: laneWidth,
                                                height,
                                                overflow: "hidden",
                                                backgroundColor: "#7ED4E3",
                                                border: "1px solid #7ED4E3",
                                            }}
                                            title={r.task.title}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (typeof onTaskClick === "function") onTaskClick(r.task);
                                            }}
                                        >
                                            <span className="px-1 pt-1 truncate">{r.task.title}</span>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
