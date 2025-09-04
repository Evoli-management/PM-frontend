import React from "react";

const STATUS_ICONS = {
    pending: "⏳",
    completed: "✅",
    missed: "❌",
};

export default function DayPopup({ date, items, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg p-4 w-80 relative">
                <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>
                    ✖
                </button>
                <h3 className="text-lg font-bold mb-2">{date}</h3>
                <ul>
                    {items.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 mb-2">
                            <span>{STATUS_ICONS[item.status]}</span>
                            <span className="font-semibold">{item.title}</span>
                            <span className="text-xs text-gray-400">{item.type}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
