import React from "react";

export default function ActivityFeed({ items = [], onItemClick }) {
    return (
        <ul className="space-y-3 text-[CanvasText]">
            {items.map((it, idx) => (
                <li
                    key={idx}
                    className={`flex justify-between items-start ${onItemClick ? "cursor-pointer hover:bg-[Canvas]/40 rounded px-2 -mx-2" : ""}`}
                    onClick={onItemClick ? () => onItemClick(it) : undefined}
                >
                    <div>
                        <div className="font-medium">{it.desc}</div>
                        <div className="text-xs opacity-60">by system</div>
                    </div>
                    <div className="text-xs opacity-60">{it.time}</div>
                </li>
            ))}
        </ul>
    );
}
