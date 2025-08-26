import React from "react";

const StatCard = ({ label, value, tone = "default", icon }) => {
    const toneMap = {
        success: "bg-green-50 text-green-800 border-green-200",
        warn: "bg-amber-50 text-amber-800 border-amber-200",
        danger: "bg-red-50 text-red-800 border-red-200",
        default: "bg-blue-50 text-blue-800 border-blue-200",
    };

    return (
        <div className={`rounded-2xl border p-4 ${toneMap[tone] || toneMap.default}`}>
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <div className="text-sm font-semibold">{label}</div>
            </div>
            <div className="text-2xl font-extrabold">{value}</div>
        </div>
    );
};

export default StatCard;
