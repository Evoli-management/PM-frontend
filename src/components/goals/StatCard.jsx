// components/goals/StatCard.jsx
import React from "react";

const StatCard = ({ label, value, icon, tone = "default" }) => {
    const getToneClasses = (tone) => {
        switch (tone) {
            case "success":
                return "bg-green-50 text-green-700 border-green-200";
            case "danger":
                return "bg-red-50 text-red-700 border-red-200";
            case "warning":
                return "bg-yellow-50 text-yellow-700 border-yellow-200";
            default:
                return "bg-blue-50 text-blue-700 border-blue-200";
        }
    };

    return (
        <div className={`rounded-xl border p-4 ${getToneClasses(tone)}`}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                </div>
                <div className="text-2xl opacity-75">{icon}</div>
            </div>
        </div>
    );
};

export default StatCard;
