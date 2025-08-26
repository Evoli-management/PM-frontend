import React from "react";

const ProgressBar = ({ value }) => (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden" aria-label="Progress">
        <div
            className={`h-full transition-all duration-300 ${
                value >= 80
                    ? "bg-green-600"
                    : value >= 60
                      ? "bg-blue-600"
                      : value >= 40
                        ? "bg-yellow-600"
                        : "bg-red-600"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
    </div>
);

export default ProgressBar;
