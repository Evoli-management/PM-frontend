// src/components/shared/primitives/DateInput.jsx
import React from "react";
import { Calendar } from "lucide-react";

const DateInput = ({ 
    value, 
    onChange, 
    disabled = false,
    error = false,
    min,
    max,
    className = "",
    ...props 
}) => {
    const baseClasses = "w-full px-4 py-3 pl-10 rounded-lg border transition-colors focus:outline-none focus:ring-2";
    const errorClasses = error 
        ? "border-red-300 focus:ring-red-500 focus:border-red-500" 
        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500";
    const disabledClasses = disabled ? "bg-gray-100 cursor-not-allowed opacity-60" : "bg-white";

    return (
        <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
                type="date"
                value={value}
                onChange={onChange}
                disabled={disabled}
                min={min}
                max={max}
                className={`${baseClasses} ${errorClasses} ${disabledClasses} ${className}`}
                {...props}
            />
        </div>
    );
};

export default DateInput;
