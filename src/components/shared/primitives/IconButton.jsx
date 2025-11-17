// src/components/shared/primitives/IconButton.jsx
import React from "react";

const IconButton = ({ 
    icon: Icon,
    onClick,
    variant = "ghost", // ghost, primary, danger
    size = "md", // sm, md, lg
    disabled = false,
    className = "",
    title,
    ...props 
}) => {
    const baseClasses = "inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variantClasses = {
        ghost: "text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:ring-gray-500",
        primary: "text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus:ring-blue-500",
        danger: "text-red-600 hover:text-red-700 hover:bg-red-50 focus:ring-red-500"
    };

    const sizeClasses = {
        sm: "p-1.5",
        md: "p-2",
        lg: "p-3"
    };

    const iconSizes = {
        sm: "w-3.5 h-3.5",
        md: "w-4 h-4",
        lg: "w-5 h-5"
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            {...props}
        >
            <Icon className={iconSizes[size]} />
        </button>
    );
};

export default IconButton;
