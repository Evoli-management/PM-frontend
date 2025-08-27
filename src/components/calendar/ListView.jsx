import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const ListView = ({ currentDate, onShiftDate, events = [], onEventClick }) => {
    const label = new Date(currentDate || Date.now()).toLocaleDateString(undefined, { month: "long", year: "numeric" });

    if (!events.length) {
        return (
            <>
                <div className="flex items-center justify-between mb-2">
                    <button
                        className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                        style={{ minWidth: 36, minHeight: 36 }}
                        aria-label="Previous period"
                        onClick={() => onShiftDate && onShiftDate(-1)}
                    >
                        <FaChevronLeft />
                    </button>
                    <h2 className="text-xl font-bold">{label}</h2>
                    <button
                        className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                        style={{ minWidth: 36, minHeight: 36 }}
                        aria-label="Next period"
                        onClick={() => onShiftDate && onShiftDate(1)}
                    >
                        <FaChevronRight />
                    </button>
                </div>
                <div className="text-center text-gray-400 py-8">
                    No events scheduled. Add tasks or activities to see them here.
                </div>
            </>
        );
    }
    return (
        <>
            <div className="flex items-center justify-between mb-2">
                <button
                    className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                    style={{ minWidth: 36, minHeight: 36 }}
                    aria-label="Previous period"
                    onClick={() => onShiftDate && onShiftDate(-1)}
                >
                    <FaChevronLeft />
                </button>
                <h2 className="text-xl font-bold">{label}</h2>
                <button
                    className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                    style={{ minWidth: 36, minHeight: 36 }}
                    aria-label="Next period"
                    onClick={() => onShiftDate && onShiftDate(1)}
                >
                    <FaChevronRight />
                </button>
            </div>
            <div className="space-y-4">
                {events
                    .sort((a, b) => new Date(a.start) - new Date(b.start))
                    .map((event, idx) => (
                        <div
                            key={idx}
                            className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center gap-2 cursor-pointer hover:bg-blue-50"
                            onClick={() => onEventClick(event)}
                        >
                            <div className="flex-1">
                                <div className="font-bold text-blue-700 text-lg">{event.title}</div>
                                <div className="text-sm text-gray-500">
                                    {event.type} • {event.source ? `from ${event.source}` : "Custom"}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}
                                </div>
                            </div>
                            <div className="flex gap-2 mt-2 md:mt-0">
                                <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs">View</button>
                                <button className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs">Edit</button>
                                <button className="bg-red-500 text-white px-3 py-1 rounded text-xs">Delete</button>
                            </div>
                        </div>
                    ))}
            </div>
        </>
    );
};

export default ListView;
