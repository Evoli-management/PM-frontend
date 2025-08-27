import React from "react";

const Chip = ({ label, toneClass = "", className = "", ...rest }) => (
    <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
            toneClass || "border-blue-200 bg-blue-50 text-blue-700"
        } ${className}`}
        {...rest}
    >
        {label}
    </span>
);

export default Chip;
