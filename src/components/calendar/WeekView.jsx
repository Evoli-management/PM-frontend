import React, { useState } from "react";
import { FixedSizeList } from "react-window";
import AvailabilityBlock from "./AvailabilityBlock";

function getWeekNumber(date) {
    const firstJan = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - firstJan) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + firstJan.getDay() + 1) / 7);
}

const defaultSlotSize = 30;
const timeSlots = (slotSize) => {
    const slots = [];
    for (let h = 8; h <= 23; h++) {
        for (let m = 0; m < 60; m += slotSize) {
            slots.push(`${h}:${m.toString().padStart(2, "0")}`);
        }
    }
    return slots;
};

import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const WeekView = ({ currentDate, onShiftDate, events = [], todos = [], categories = {}, onTaskDrop, onEventClick }) => {
    const [slotSize, setSlotSize] = useState(defaultSlotSize);
    const [elephantTask, setElephantTask] = useState("");
    // Fixed column widths to keep header and grid aligned
    const TIME_COL_PX = 80; // matches w-20
    const DAY_COL_PX = 140;

    // Calculate week start (Monday)
    const weekStart = new Date(currentDate || new Date());
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const days = Array.from(
        { length: 7 },
        (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i),
    );
    const slots = timeSlots(slotSize);
    const weekNum = getWeekNumber(weekStart);
    const totalWidth = TIME_COL_PX + days.length * DAY_COL_PX;

    // Navigation handlers
    // Navigation is handled by container; keep internal handlers unused or remove if not needed
    // Drag-and-drop handler
    const handleDrop = (e, day, slot) => {
        const taskId = e.dataTransfer.getData("taskId");
        // ...handle drop logic...
    };
    // Range label for the week
    const endOfWeek = new Date(weekStart);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${endOfWeek.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

    return (
        <div className="p-0" style={{ overflow: "hidden" }}>
            {/* Header with navigation inside the view */}
            <div className="flex items-center justify-between mb-2">
                <button
                    className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                    style={{ minWidth: 36, minHeight: 36 }}
                    aria-label="Previous week"
                    onClick={() => onShiftDate && onShiftDate(-1)}
                >
                    <FaChevronLeft />
                </button>
                <h2 className="text-xl font-bold">{weekLabel}</h2>
                <button
                    className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                    style={{ minWidth: 36, minHeight: 36 }}
                    aria-label="Next week"
                    onClick={() => onShiftDate && onShiftDate(1)}
                >
                    <FaChevronRight />
                </button>
            </div>
            {/* Calendar grid */}
            <div
                className="overflow-x-auto px-2 pb-6"
                style={{ maxWidth: "100vw", maxHeight: "60vh", overflowY: "auto" }}
            >
                {/* Table for header and all-day row only */}
                <table
                    className="min-w-full border border-blue-100 rounded-lg"
                    style={{ minWidth: totalWidth + "px", borderCollapse: "separate", borderSpacing: 0 }}
                >
                    <thead>
                        <tr className="bg-blue-50">
                            <th
                                className="text-left px-2 py-2 text-blue-500 text-base font-semibold rounded-tl-lg"
                                style={{ width: TIME_COL_PX + "px" }}
                            >
                                all day
                            </th>
                            {days.map((date, dIdx) => (
                                <th
                                    key={dIdx}
                                    className={`text-center px-2 py-2 text-blue-500 text-base font-semibold ${dIdx === days.length - 1 ? "rounded-tr-lg" : ""}`}
                                    style={{ width: DAY_COL_PX + "px" }}
                                >
                                    {date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="bg-gray-50">
                            <td
                                className="border-r border-blue-100 px-2 py-2 text-xs text-gray-500"
                                style={{ width: TIME_COL_PX + "px" }}
                            >
                                all day
                            </td>
                            {days.map((date, dIdx) => (
                                <td
                                    key={dIdx}
                                    className="border-r border-blue-100 px-2 py-2 text-center align-top"
                                    style={{ width: DAY_COL_PX + "px" }}
                                >
                                    <span className="text-gray-300">—</span>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
                {/* Time slots - virtualized as flexbox grid below the table */}
                <div className="w-full" style={{ minWidth: totalWidth + "px" }}>
                    <FixedSizeList height={400} itemCount={slots.length} itemSize={38} width={undefined}>
                        {({ index, style }) => {
                            const slot = slots[index];
                            return (
                                <div
                                    key={index}
                                    style={style}
                                    className={`flex w-full ${index % 2 === 0 ? "bg-white" : "bg-blue-50/40"}`}
                                >
                                    <div
                                        className="border-r border-blue-100 px-2 py-1 text-xs text-gray-500 flex-shrink-0 flex items-center justify-center"
                                        style={{ width: TIME_COL_PX + "px" }}
                                    >
                                        {slot}
                                    </div>
                                    {days.map((date, dIdx) => {
                                        const slotEvents = events.filter((ev) => {
                                            const evDate = new Date(ev.start);
                                            return (
                                                evDate.getDate() === date.getDate() &&
                                                evDate.getHours() === Number(slot.split(":")[0]) &&
                                                evDate.getMinutes() === Number(slot.split(":")[1])
                                            );
                                        });
                                        return (
                                            <div
                                                key={dIdx}
                                                className="border-r border-blue-100 px-2 py-1 h-8 align-top group flex items-center"
                                                style={{ flex: "0 0 " + DAY_COL_PX + "px", width: DAY_COL_PX + "px" }}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => handleDrop(e, date, slot)}
                                            >
                                                {slotEvents.length === 0 ? (
                                                    <span className="text-gray-300 group-hover:text-blue-300">—</span>
                                                ) : (
                                                    slotEvents.map((ev, i) => (
                                                        <div
                                                            key={i}
                                                            className={`px-2 py-1 mb-1 rounded cursor-pointer flex items-center gap-1 ${categories[ev.kind]?.color || "bg-gray-200"}`}
                                                            onClick={() => onEventClick(ev)}
                                                        >
                                                            <span>{categories[ev.kind]?.icon || ""}</span>
                                                            <span className="truncate text-xs">{ev.title}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        }}
                    </FixedSizeList>
                </div>
                {/* Add task/activity button at the bottom of each day column */}
                <div className="flex w-full bg-blue-50 rounded-b-lg" style={{ minWidth: totalWidth + "px" }}>
                    <div style={{ width: TIME_COL_PX + "px" }}></div>
                    {days.map((date, dIdx) => (
                        <div
                            key={dIdx}
                            className={`px-2 py-2 text-center align-top ${dIdx === days.length - 1 ? "rounded-br-lg" : ""}`}
                            style={{ width: DAY_COL_PX + "px", flex: "0 0 " + DAY_COL_PX + "px" }}
                        >
                            <button
                                className="bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm w-full"
                                onClick={() => onEventClick({ day: date, slot: "bottom" })}
                            >
                                Add task/activity
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            {/* Removed To-Do List Panel per request */}
        </div>
    );
};

export default WeekView;
