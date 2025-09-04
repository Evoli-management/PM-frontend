// components/goals/GoalCard.jsx
import React from "react";
import {
    FaBullseye,
    FaEdit,
    FaCheck,
    FaClock,
    FaFlag,
    FaExclamationTriangle,
} from "react-icons/fa";

const GoalCard = ({ goal, onOpen, onEdit, onComplete }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'active': return 'bg-blue-100 text-blue-800';
            case 'archived': return 'bg-gray-100 text-gray-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const isOverdue = goal.dueDate && new Date(goal.dueDate) < new Date() && goal.status === 'active';
    const daysUntilDue = goal.dueDate
        ? Math.ceil((new Date(goal.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div className={`bg-white rounded-2xl shadow-sm border hover:shadow-md transition-shadow p-4 ${
            isOverdue ? "border-red-200 bg-red-50/30" : ""
        }`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-xl ${
                        goal.status === "completed"
                            ? "bg-green-50 text-green-700"
                            : "bg-blue-50 text-blue-700"
                    }`}>
                        <FaBullseye />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                            <h3 className="font-bold text-slate-900 truncate" title={goal.title}>
                                {goal.title}
                            </h3>
                            {isOverdue && <FaExclamationTriangle className="text-red-600 mt-1 flex-shrink-0" />}
                        </div>
                        {goal.description && (
                            <p className="text-sm text-slate-700 mb-3 line-clamp-2">{goal.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        onClick={() => onEdit(goal)}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        title="Edit goal"
                    >
                        <FaEdit className="text-xs" />
                    </button>
                    {goal.status === 'active' && (
                        <button
                            onClick={() => onComplete(goal.id)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-green-50 hover:text-green-600"
                            title="Mark as completed"
                        >
                            <FaCheck className="text-xs" />
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700">Progress</span>
                    <span className="text-xs font-semibold text-slate-900">{goal.progressPercent || 0}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                            goal.progressPercent >= 100
                                ? 'bg-green-500'
                                : goal.progressPercent >= 70
                                ? 'bg-blue-500'
                                : goal.progressPercent >= 40
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                        }`}
                        style={{ width: `${goal.progressPercent || 0}%` }}
                    />
                </div>
            </div>

            {/* Milestones indicator if available */}
            {goal.milestones && goal.milestones.length > 0 && (
                <div className="mb-3 p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <FaFlag className="text-xs text-slate-600" />
                            <span className="text-xs font-semibold text-slate-700">Milestones</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-900">
                            {goal.milestones.filter(m => m.done).length}/{goal.milestones.length}
                        </span>
                    </div>
                </div>
            )}

            {/* Meta info */}
            <div className="text-xs text-slate-600 flex items-center gap-4 flex-wrap mb-3">
                {goal.dueDate && (
                    <span className={`inline-flex items-center gap-1 ${isOverdue ? "text-red-600 font-semibold" : ""}`}>
                        <FaClock />
                        {isOverdue ? "Overdue" : daysUntilDue > 0 ? `${daysUntilDue}d left` : "Due today"}
                    </span>
                )}
            </div>

            {/* Status and Actions */}
            <div className="flex items-center justify-between">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(goal.status)}`}>
                    {goal.status}
                </span>
                <button
                    className="text-sm font-bold text-blue-700 hover:underline"
                    onClick={() => onOpen(goal)}
                >
                    View Details
                </button>
            </div>
        </div>
    );
};

export default GoalCard;