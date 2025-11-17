// src/components/shared/primitives/Input.jsx
import React from "react";

const Input = ({ 
    type = "text", 
    value, 
    onChange, 
    placeholder, 
    disabled = false,
    error = false,
    className = "",
    ...props 
}) => {
    const baseClasses = "w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2";
    const errorClasses = error 
        ? "border-red-300 focus:ring-red-500 focus:border-red-500" 
        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500";
    const disabledClasses = disabled ? "bg-gray-100 cursor-not-allowed opacity-60" : "bg-white";

    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`${baseClasses} ${errorClasses} ${disabledClasses} ${className}`}
            {...props}
        />
    );
};

export default Input;
