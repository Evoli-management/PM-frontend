// src/components/shared/primitives/Select.jsx
import React from "react";
import { ChevronDown } from "lucide-react";

const Select = ({ 
    value, 
    onChange, 
    options = [], 
    placeholder = "Select...",
    disabled = false,
    error = false,
    className = "",
    ...props 
}) => {
    const baseClasses = "w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 appearance-none bg-white";
    const errorClasses = error 
        ? "border-red-300 focus:ring-red-500 focus:border-red-500" 
        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500";
    const disabledClasses = disabled ? "bg-gray-100 cursor-not-allowed opacity-60" : "";

    return (
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`${baseClasses} ${errorClasses} ${disabledClasses} ${className}`}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
    );
};

export default Select;
