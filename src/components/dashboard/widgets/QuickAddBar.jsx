import React from "react";

export default function QuickAddBar({ onOpen, message }) {
    const items = ["task", "goal", "stroke", "note", "appointment"];
    return (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-3 mb-6 flex items-center gap-3 border">
            <div className="flex gap-2">
                {items.map((t) => (
                    <button
                        key={t}
                        onClick={() => onOpen?.(t)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm"
                    >
                        + {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>
            <div className="flex-1 text-sm text-gray-500 dark:text-gray-300">
                Quick Add: tasks, goals, strokes, notes, and appointments.
            </div>
            {message && <div className="text-sm text-green-600 font-medium">{message}</div>}
        </div>
    );
}
