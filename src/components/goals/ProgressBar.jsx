// src/components/goals/ProgressBar.jsx
import React from "react";

const ProgressBar = ({ value, className = "" }) => (
    <div className={`w-full h-2 bg-slate-200 rounded-full overflow-hidden ${className}`}>
        <div
            className={`h-full transition-all duration-300 ${
                value >= 80
                    ? "bg-green-500"
                    : value >= 60
                      ? "bg-blue-500"
                      : value >= 40
                        ? "bg-yellow-500"
                        : "bg-red-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
    </div>
);

export default ProgressBar;
