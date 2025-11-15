// src/components/goals/Chip.jsx
import React from "react";

const Chip = ({ label, className = "", children }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${className}`}>
        {children}
        {label}
    </span>
);

export default Chip;
