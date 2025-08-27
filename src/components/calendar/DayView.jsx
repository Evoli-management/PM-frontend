import React from "react";
import { FixedSizeList } from "react-window";
import AvailabilityBlock from "./AvailabilityBlock";

// 00:00–23:30, half-hour increments
const hours = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    return `${h.toString().padStart(2, "0")}:${m}`;
});

export default function DayView({ events, todos, categories, onTaskDrop, onEventClick, onPlanTomorrow }) {
    const today = new Date();
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
        <div className="p-4 bg-white rounded shadow flex gap-4">
            {/* Left: Calendar day view */}
            <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold mb-2">Day View</h2>
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
                                    const evDate = ev.start;
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
                <button className="mt-4 px-3 py-2 bg-blue-100 rounded text-sm">Plan tomorrow</button>
            </div>

            {/* Right: Actions column */}
            <div className="w-64 md:w-72 shrink-0">
                <div className="sticky top-2">
                    <div className="flex flex-col gap-2">
                        <button className="w-full px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-blue-900 font-semibold">
                            Tasks
                        </button>
                        <button className="w-full px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-semibold">
                            Add task
                        </button>
                        <button className="w-full px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-blue-900 font-semibold mt-4">
                            Activities
                        </button>
                        <button className="w-full px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                            Add activity
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
