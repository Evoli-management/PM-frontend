import React from "react";
import { FaChevronLeft, FaChevronRight, FaTasks, FaPlus, FaRegCalendarAlt } from "react-icons/fa";
import { FixedSizeList } from "react-window";
import AvailabilityBlock from "./AvailabilityBlock";

// 00:00–23:30, half-hour increments
const hours = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    return `${h.toString().padStart(2, "0")}:${m}`;
});

export default function DayView({
    currentDate,
    events,
    todos,
    categories,
    onTaskDrop,
    onEventClick,
    onPlanTomorrow,
    onShiftDate,
}) {
    const today = currentDate || new Date();
    // Drag-and-drop handler
    const handleDrop = (e, hour) => {
        const taskId = e.dataTransfer.getData("taskId");
        const task = todos.find((t) => t.id === taskId);
        if (task) {
            const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), ...hour.split(":"));
            onTaskDrop(task, date);
        }
    };
    return (
        <div className="p-0 flex gap-4">
            {/* Left: Calendar day view */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                    <button
                        className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                        style={{ minWidth: 36, minHeight: 36 }}
                        aria-label="Previous day"
                        onClick={() => onShiftDate && onShiftDate(-1)}
                    >
                        <FaChevronLeft />
                    </button>
                    <h2 className="text-xl font-bold">
                        {today.toLocaleDateString(undefined, {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                        })}
                    </h2>
                    <button
                        className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                        style={{ minWidth: 36, minHeight: 36 }}
                        aria-label="Next day"
                        onClick={() => onShiftDate && onShiftDate(1)}
                    >
                        <FaChevronRight />
                    </button>
                </div>
                <div
                    className="flex flex-col gap-1"
                    style={{ maxWidth: "100%", maxHeight: "60vh", overflowX: "auto", overflowY: "auto" }}
                >
                    <table
                        className="min-w-full border border-sky-100 rounded-lg"
                        style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}
                    >
                        <thead>
                            <tr className="bg-sky-50">
                                <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400 w-24">Time</th>
                                <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400">Events</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hours.map((h, idx) => {
                                const slotEvents = events.filter((ev) => {
                                    const evDate = new Date(ev.start);
                                    return (
                                        evDate.getDate() === today.getDate() &&
                                        evDate.getHours() === Number(h.split(":")[0]) &&
                                        evDate.getMinutes() === Number(h.split(":")[1])
                                    );
                                });
                                return (
                                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-blue-50/40"}>
                                        <td className="border px-2 py-1 text-xs w-24 align-top">
                                            <span>{h}</span>
                                        </td>
                                        <td className="border px-2 py-1 align-top" style={{ width: "100%" }}>
                                            {slotEvents.length === 0 ? (
                                                <span className="text-gray-400 text-xs">No events</span>
                                            ) : (
                                                slotEvents.map((ev, i) => (
                                                    <div
                                                        key={i}
                                                        className={`px-2 py-1 rounded cursor-pointer flex items-center gap-1 ${
                                                            categories[ev.kind]?.color || "bg-gray-200"
                                                        }`}
                                                        onClick={() => onEventClick(ev)}
                                                    >
                                                        <span>{categories[ev.kind]?.icon || ""}</span>
                                                        <span className="truncate text-xs">{ev.title}</span>
                                                    </div>
                                                ))
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {/* Removed 'Plan tomorrow' button as requested */}
            </div>

            {/* Right: Actions column */}
            <div className="w-64 md:w-72 shrink-0">
                <div className="sticky top-2">
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick actions</h3>
                        <div className="grid grid-cols-1 gap-2">
                            <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-medium">
                                <FaTasks className="text-blue-600" />
                                <span>Tasks</span>
                            </button>
                            <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm">
                                <FaPlus />
                                <span>Add task</span>
                            </button>
                            <div className="h-px bg-slate-200 my-2" />
                            <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-medium">
                                <FaRegCalendarAlt className="text-blue-600" />
                                <span>Activities</span>
                            </button>
                            <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm">
                                <FaPlus />
                                <span>Add activity</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
