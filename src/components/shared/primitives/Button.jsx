// src/components/shared/primitives/Button.jsx
import React from "react";
import { Loader2 } from "lucide-react";

const Button = ({ 
    children,
    onClick,
    type = "button",
    variant = "primary", // primary, secondary, danger, ghost
    size = "md", // sm, md, lg
    disabled = false,
    loading = false,
    icon,
    className = "",
    ...props 
}) => {
    const baseClasses = "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variantClasses = {
        primary: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 shadow-sm hover:shadow-md",
        secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md",
        ghost: "text-gray-700 hover:bg-gray-100 focus:ring-gray-500"
    };

    const sizeClasses = {
        sm: "px-3 py-2 text-sm",
        md: "px-6 py-3 text-base",
        lg: "px-8 py-4 text-lg"
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            {...props}
        >
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : icon && (
                icon
            )}
            {children}
        </button>
    );
};

export default Button;
