// src/components/shared/primitives/Modal.jsx
import React from "react";
import { X } from "lucide-react";

const Modal = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    footer,
    size = "md", // sm, md, lg, xl, full
    isSaving = false 
}) => {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: "max-w-md",
        md: "max-w-2xl",
        lg: "max-w-4xl",
        xl: "max-w-6xl",
        full: "max-w-full mx-4"
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 transition-opacity pointer-events-auto"
                onClick={onClose}
                aria-hidden="true"
            />
            
            {/* Modal Container */}
            <div className="flex min-h-full items-center justify-center p-4 pointer-events-none">
                <div 
                    className={`relative bg-white rounded-xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col z-50 pointer-events-auto`}
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                >
                    {/* Header */}
                    {title && (
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSaving}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        {children}
                    </div>

                    {/* Footer */}
                    {footer && (
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Modal;
