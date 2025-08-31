import React, { useRef } from "react";

export default function CalendarPreview({ events = [], onReorder, getCountdownBadge }) {
    const dragIdxRef = useRef(null);
    function onDragStart(i) {
        dragIdxRef.current = i;
    }
    function onDragOver(e) {
        e.preventDefault();
    }
    function onDrop(i) {
        const from = dragIdxRef.current;
        if (from == null || from === i) return;
        const next = [...events];
        const [moved] = next.splice(from, 1);
        next.splice(i, 0, moved);
        onReorder?.(next);
        dragIdxRef.current = null;
    }
    if (!events.length) {
        return <div className="text-gray-400">No appointments today.</div>;
    }
    return (
        <ul className="divide-y">
            {events.map((ev, i) => (
                <li
                    key={ev.id}
                    className="py-3 flex items-center gap-3"
                    draggable
                    onDragStart={() => onDragStart(i)}
                    onDragOver={onDragOver}
                    onDrop={() => onDrop(i)}
                    title={`${ev.title} • ${ev.start}–${ev.end}`}
                >
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {ev.start}
                    </span>
                    <div className="flex-1">
                        <div className="font-medium text-gray-800 dark:text-slate-200">{ev.title}</div>
                        <div className="text-xs text-gray-400">ends {ev.end}</div>
                    </div>
                    {getCountdownBadge &&
                        (() => {
                            const b = getCountdownBadge(ev);
                            return (
                                <span
                                    className={`text-xs px-2 py-1 rounded ${b.className}`}
                                    title="Time until start/end"
                                >
                                    {b.text}
                                </span>
                            );
                        })()}
                    <span className="cursor-grab text-gray-400" title="Drag to reprioritize">
                        ⋮⋮
                    </span>
                </li>
            ))}
        </ul>
    );
}
