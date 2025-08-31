import React from "react";

export default function ActivityFeed({ items = [] }) {
    return (
        <ul className="space-y-3">
            {items.map((it, idx) => (
                <li key={idx} className="flex justify-between items-start">
                    <div>
                        <div className="font-medium text-gray-700 dark:text-slate-200">{it.desc}</div>
                        <div className="text-xs text-gray-400">by system</div>
                    </div>
                    <div className="text-xs text-gray-400">{it.time}</div>
                </li>
            ))}
        </ul>
    );
}
