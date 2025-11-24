// src/components/goals/EmptyState.jsx
import React from "react";
import { FaPlus } from "react-icons/fa";

const EmptyState = ({ searchTerm, statusFilter, onCreateClick, title, hint }) => {
    // If a caller provides a `title` or `hint`, prefer those values so this
    // component can be reused outside of the "goals" context (e.g. tasks).
    const hasFilters = searchTerm || statusFilter !== "all";
    const header = typeof title !== 'undefined' && title !== null ? title : (hasFilters ? "No goals found" : "No goals yet");
    const paragraph = typeof hint !== 'undefined' && hint !== null ? hint : (hasFilters ? "Try adjusting your search or filter criteria." : "Create your first goal to get started with tracking your objectives.");

    return (
        <div className="text-center py-16">
            <h3 className="text-xl font-bold text-slate-900 mb-2">{header}</h3>

            <p className="text-slate-600 mb-8">{paragraph}</p>

            {/* Only show the default create button when there are no filters and a create handler is provided */}
            {!hasFilters && onCreateClick && (
                <button
                    onClick={onCreateClick}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                >
                    <FaPlus className="w-4 h-4" />
                    Create Your First Goal
                </button>
            )}
        </div>
    );
};

export default EmptyState;
