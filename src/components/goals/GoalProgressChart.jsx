// src/components/goals/GoalProgressChart.jsx
import React from "react";

const GoalProgressChart = ({ progressPercent, size = 60, strokeWidth = 6 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

    // Color based on progress
    const getColor = () => {
        if (progressPercent >= 80) return "#10b981"; // green-500
        if (progressPercent >= 60) return "#3b82f6"; // blue-500
        if (progressPercent >= 40) return "#f59e0b"; // yellow-500
        return "#ef4444"; // red-500
    };

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* Background circle */}
            <svg className="transform -rotate-90" width={size} height={size}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#e2e8f0"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={getColor()}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-300 ease-in-out"
                />
            </svg>

            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-bold text-slate-900" style={{ fontSize: size * 0.2 }}>
                    {progressPercent}%
                </span>
            </div>
        </div>
    );
};

export default GoalProgressChart;
