import React from "react";
import calendarService from "../../services/calendarService";
import { useToast } from "../shared/ToastProvider.jsx";

const EventModal = ({ event, onClose, categories, timezone, onEventUpdated, onEventDeleted }) => {
    if (!event) return null;
    const { addToast } = useToast();
    const startStr = event.start ? new Date(event.start).toLocaleString() : "";
    const endStr = event.end ? new Date(event.end).toLocaleString() : "";

    const shift = async (minutes) => {
        try {
            const start = event.start ? new Date(event.start) : null;
            if (!start) return;
            const end = event.end ? new Date(event.end) : null;
            const newStart = new Date(start.getTime() + minutes * 60 * 1000);
            const newEnd = end ? new Date(end.getTime() + minutes * 60 * 1000) : null;
            const updated = await calendarService.updateEvent(event.id, {
                start: newStart.toISOString(),
                end: newEnd ? newEnd.toISOString() : null,
            });
            onEventUpdated && onEventUpdated(updated);
            addToast({ title: "Event moved", variant: "success" });
        } catch (e) {
            console.warn("Failed to update event", e);
            addToast({ title: "Failed to move event", description: String(e?.message || e), variant: "error" });
        }
    };

    const resize = async (deltaMinutes) => {
        try {
            const end = event.end ? new Date(event.end) : null;
            if (!end) return;
            const newEnd = new Date(end.getTime() + deltaMinutes * 60 * 1000);
            const updated = await calendarService.updateEvent(event.id, {
                end: newEnd.toISOString(),
            });
            onEventUpdated && onEventUpdated(updated);
            addToast({ title: "Event resized", variant: "success" });
        } catch (e) {
            console.warn("Failed to resize event", e);
            addToast({ title: "Failed to resize", description: String(e?.message || e), variant: "error" });
        }
    };
    const remove = async () => {
        try {
            await calendarService.deleteEvent(event.id);
            onEventDeleted && onEventDeleted(event.id);
            onClose && onClose();
            addToast({ title: "Event deleted", variant: "success" });
        } catch (e) {
            console.warn("Failed to delete event", e);
            addToast({ title: "Failed to delete", description: String(e?.message || e), variant: "error" });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-6 w-96 relative">
                <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>
                    ✖
                </button>
                <h2 className="text-xl font-bold mb-2">{event.title}</h2>
                <div className="mb-2 text-sm text-gray-500">
                    {event.kind && <span className="uppercase text-xs tracking-wide">{event.kind}</span>}
                </div>
                <div className="mb-2 text-xs text-gray-400">
                    {startStr}
                    {endStr ? ` - ${endStr}` : ""}
                </div>
                <div className="mb-2 text-xs text-gray-400">Timezone: {timezone}</div>
                <div className="mb-4 text-gray-600">{event.description || ""}</div>
                <div className="flex flex-wrap gap-2">
                    {event.taskId && (
                        <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs">View Task</button>
                    )}
                    <button className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs">Edit</button>
                    <button className="bg-red-500 text-white px-3 py-1 rounded text-xs" onClick={remove}>
                        Delete
                    </button>
                    <div className="w-full h-px bg-gray-100 my-1"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-500">Move:</span>
                        <button
                            className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs"
                            onClick={() => shift(-30)}
                        >
                            -30m
                        </button>
                        <button
                            className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs"
                            onClick={() => shift(30)}
                        >
                            +30m
                        </button>
                    </div>
                    {event.end && (
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-500">Resize:</span>
                            <button
                                className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs"
                                onClick={() => resize(-30)}
                            >
                                -30m
                            </button>
                            <button
                                className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs"
                                onClick={() => resize(30)}
                            >
                                +30m
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventModal;
