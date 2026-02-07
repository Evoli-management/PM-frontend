import React from "react";

// Enhanced Toggle Component
export const Toggle = ({ checked, onChange, disabled = false }) => (
    <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        aria-pressed={checked}
        disabled={disabled}
        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
            disabled 
                ? "bg-gray-200 cursor-not-allowed" 
                : checked 
                    ? "bg-green-600" 
                    : "bg-gray-300"
        }`}
    >
        <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                checked ? "translate-x-5" : "translate-x-1"
            }`}
        />
    </button>
);

// Enhanced Eye Icon Component
export const Eye = ({ open }) => (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor">
        {open ? (
            <path
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.1 12S5.5 5 12 5s9.9 7 9.9 7-3.4 7-9.9 7S2.1 12 2.1 12Zm9.9 3.25A3.25 3.25 0 1 1 15.25 12 3.25 3.25 0 0 1 12 15.25Z"
            />
        ) : (
            <>
                <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                <path
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.9 12S17.5 5 11 5a10 10 0 0 0-4.6 1.1M3.1 12S6.5 19 13 19a10 10 0 0 0 4.6-1.1"
                />
            </>
        )}
    </svg>
);

// Enhanced Password Field Component
export const PasswordField = ({ value, onChange, placeholder, open, toggle, error }) => (
    <div className="relative">
        <input
            type={open ? "text" : "password"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoComplete="off"
            className={`h-10 w-full rounded border px-3 pr-10 text-sm outline-none focus:border-blue-500 transition-colors ${
                error
                    ? "border-red-500 bg-red-50 text-red-900 dark:border-red-400 dark:bg-red-900/40 dark:text-red-100"
                    : "border-gray-300 bg-gray-50 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            }`}
        />
        <button
            type="button"
            onClick={toggle}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
            aria-label="Toggle password"
        >
            <Eye open={open} />
        </button>
    </div>
);

// Enhanced Field Component
export const Field = ({ 
    label, 
    children, 
    value,
    isEditing,
    onChange,
    type = "text",
    placeholder,
    error, 
    required = false,
    inline = false
}) => {
    // If value, isEditing, onChange are provided, render input directly
    if (value !== undefined && isEditing !== undefined && onChange) {
        return (
            <div className="space-y-1">
                {inline ? (
                    // Inline layout - label and value/input on same line
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-slate-200 flex-shrink-0">
                            {label}
                            {required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {isEditing ? (
                            <input
                                type={type}
                                value={value}
                                onChange={onChange}
                                placeholder={placeholder}
                                className={`flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                    error
                                        ? "border-red-500 bg-red-50 text-red-900"
                                        : "border-gray-300 bg-white text-gray-900"
                                }`}
                            />
                        ) : (
                            <p className="text-sm text-gray-900 font-medium">
                                {value || "Not provided"}
                            </p>
                        )}
                    </div>
                ) : (
                    // Vertical layout - label above value/input
                    <>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
                            {label}
                            {required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {isEditing ? (
                            <input
                                type={type}
                                value={value}
                                onChange={onChange}
                                placeholder={placeholder}
                                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                                    error
                                        ? "border-red-500 bg-red-50 text-red-900"
                                        : "border-gray-300 bg-white text-gray-900"
                                }`}
                            />
                        ) : (
                            <p className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900 min-h-[48px] flex items-center">
                                {value || "Not provided"}
                            </p>
                        )}
                    </>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
        );
    }

    // Otherwise, render as wrapper for children (backward compatibility)
    return (
        <label className="block text-sm text-slate-700 dark:text-slate-200">
            <span className="mb-1 block font-medium text-gray-700 dark:text-slate-200">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </span>
            {children}
            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-300">{error}</p>}
        </label>
    );
};

// Enhanced Section Component
export const Section = ({ title, children, description = "" }) => (
    <section className="mt-4 pt-3">
        <div className="mb-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
            {description && (
                <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">{description}</p>
            )}
        </div>
        {children}
    </section>
);

// Toast Component
export const Toast = ({ visible, message, type = 'success', onClose }) => {
    if (!visible) return null;

    const bgColor = type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
    const textColor = type === 'success' ? 'text-green-800' : 'text-red-800';
    const icon = type === 'success' ? '✓' : '✗';

    return (
        <div className={`fixed top-4 right-4 z-[9999] max-w-[90vw] sm:max-w-md rounded-lg border p-3 shadow-lg ${bgColor} ${textColor}`}>
            <div className="flex items-start gap-2">
                <span className="text-lg">{icon}</span>
                <span className="text-sm font-medium whitespace-normal break-words">{message}</span>
                <button
                    onClick={onClose}
                    className="ml-2 text-lg leading-none hover:opacity-70"
                >
                    ×
                </button>
            </div>
        </div>
    );
};

// Loading Button Component
export const LoadingButton = ({ 
    children, 
    loading = false, 
    onClick, 
    variant = 'primary',
    disabled = false,
    ...props 
}) => {
    const baseClasses = "px-4 py-2 text-sm font-medium rounded transition-colors";
    const variants = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white",
        secondary: "bg-gray-200 hover:bg-gray-300 text-gray-700",
        danger: "bg-red-600 hover:bg-red-700 text-white"
    };

    return (
        <button
            {...props}
            onClick={onClick}
            disabled={loading || disabled}
            className={`${baseClasses} ${variants[variant]} ${
                (loading || disabled) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
        >
            {loading ? (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                </div>
            ) : (
                children
            )}
        </button>
    );
};