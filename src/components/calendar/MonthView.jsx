import React, { useEffect, useRef, useState } from "react";
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
    categories,
    onEventClick,
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

    // Map events to day/hour
    const eventsBySlot = {};
    events.forEach((ev) => {
        const evDate = new Date(ev.start);
        const key = `${evDate.getDate()}-${evDate.getHours()}:${evDate.getMinutes()}`;
        if (!eventsBySlot[key]) eventsBySlot[key] = [];
        eventsBySlot[key].push(ev);
    });

    // Red line for current time
    const gridRef = useRef(null);
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
                                <th className="sticky left-24 bg-sky-50 text-center px-2 py-2 text-xs font-semibold text-gray-400 w-24 z-10">
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
                                return (
                                    <tr key={idx} className={idx % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                                        <td
                                            className={`sticky left-0 bg-white px-2 py-2 text-sm font-semibold w-24 z-10 ${isWeekend ? "text-red-500" : "text-gray-700"} ${isToday ? "text-blue-600" : ""}`}
                                        >
                                            {date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                                        </td>
                                        <td className="sticky left-24 bg-white px-2 py-2 text-center align-top w-24 z-10 cursor-pointer border border-sky-100 hover:bg-blue-100">
                                            {/* all day slot */}
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
                                                    {slotEvents.length === 0 ? (
                                                        <span className="block text-xs text-gray-400">No events</span>
                                                    ) : (
                                                        slotEvents.map((ev, i) => (
                                                            <span
                                                                key={i}
                                                                className={`block px-2 py-1 rounded text-xs mb-1 ${categories[ev.kind]?.color || "bg-gray-200"}`}
                                                            >
                                                                {ev.title}
                                                            </span>
                                                        ))
                                                    )}
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
                </div>
            </div>
        </>
    );
}
