import React from "react";

export default function QuickAddBar({ onOpen, message }) {
    const items = ["task", "goal", "stroke", "note", "appointment"];
    return (
        <div className="flex items-center gap-2 w-full">
            <div className="flex gap-2">
                {items.map((t) => (
                    <button
                        key={t}
                        onClick={() => onOpen?.(t)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                    >
                        + {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>
            <div className="flex-1 text-xs opacity-70">Quick Add: tasks, goals, strokes, notes, and appointments.</div>
            {message && (
                <div className="text-sm font-medium" style={{ color: "CanvasText" }}>
                    {message}
                </div>
            )}
        </div>
    );
}
