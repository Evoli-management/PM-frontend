// src/components/shared/primitives/FormField.jsx
import React from "react";
import { AlertCircle } from "lucide-react";

const FormField = ({ 
    label, 
    error, 
    hint, 
    required = false, 
    children,
    className = "" 
}) => {
    return (
        <div className={`mb-4 ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            {children}
            {hint && !error && (
                <p className="mt-1 text-sm text-gray-500">{hint}</p>
            )}
            {error && (
                <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};

export default FormField;
