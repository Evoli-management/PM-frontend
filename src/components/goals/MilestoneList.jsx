// src/components/goals/MilestoneList.jsx
import React from "react";
import { FaCheck, FaClock, FaWeight, FaEdit } from "react-icons/fa";

const MilestoneList = ({ milestones = [], onToggle, onEdit, className = "" }) => {
    if (!milestones || milestones.length === 0) {
        return <div className={`text-sm text-slate-500 ${className}`}>No milestones added yet</div>;
    }

    const formatDate = (dateString) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString();
    };

    const isOverdue = (dueDate, milestone) => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date() && !milestone.done;
    };

    return (
        <div className={`space-y-2 ${className}`}>
            {milestones.map((milestone) => (
                <div
                    key={milestone.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                        milestone.done
                            ? "bg-green-50 border-green-200"
                            : isOverdue(milestone.dueDate, milestone)
                              ? "bg-red-50 border-red-200"
                              : "bg-slate-50 border-slate-200"
                    }`}
                >
                    {/* Checkbox */}
                    <button
                        onClick={() => onToggle && onToggle(milestone.id, !milestone.done)}
                        className={`mt-1 p-1 rounded ${
                            milestone.done
                                ? "bg-green-600 text-white"
                                : "border-2 border-slate-300 hover:border-blue-500"
                        }`}
                    >
                        {milestone.done && <FaCheck className="text-xs" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                            <h4
                                className={`font-medium ${
                                    milestone.done ? "line-through text-slate-500" : "text-slate-900"
                                }`}
                            >
                                {milestone.title}
                            </h4>

                            {onEdit && (
                                <button
                                    onClick={() => onEdit(milestone)}
                                    className="ml-2 p-1 text-slate-400 hover:text-slate-600"
                                >
                                    <FaEdit className="text-xs" />
                                </button>
                            )}
                        </div>

                        {milestone.description && (
                            <p className={`text-sm mt-1 ${milestone.done ? "text-slate-400" : "text-slate-600"}`}>
                                {milestone.description}
                            </p>
                        )}

                        {/* Meta information */}
                        <div className="flex items-center gap-4 mt-2 text-xs">
                            {milestone.dueDate && (
                                <span
                                    className={`flex items-center gap-1 ${
                                        isOverdue(milestone.dueDate, milestone) && !milestone.done
                                            ? "text-red-600 font-medium"
                                            : milestone.done
                                              ? "text-slate-400"
                                              : "text-slate-600"
                                    }`}
                                >
                                    <FaClock />
                                    {formatDate(milestone.dueDate)}
                                    {isOverdue(milestone.dueDate, milestone) && !milestone.done && " (Overdue)"}
                                </span>
                            )}

                            {milestone.weight && milestone.weight !== 1 && (
                                <span
                                    className={`flex items-center gap-1 ${
                                        milestone.done ? "text-slate-400" : "text-slate-600"
                                    }`}
                                >
                                    <FaWeight />
                                    Weight: {milestone.weight}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MilestoneList;
