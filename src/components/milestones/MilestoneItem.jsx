// src/components/milestones/MilestoneItem.jsx
import React, { useState } from "react";
import {
    FaCheck,
    FaEdit,
    FaTrash,
    FaCalendarAlt,
    FaWeight,
    FaClock,
    FaExclamationCircle,
    FaCheckCircle,
    FaTimes,
} from "react-icons/fa";
import MilestoneForm from "./MilestoneForm";

const MilestoneItem = ({ milestone, onUpdate, onDelete, onToggleComplete, isEditing, onStartEdit, onCancelEdit }) => {
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (updateData) => {
        try {
            setLoading(true);
            await onUpdate(milestone.id, updateData);
            onCancelEdit();
        } catch (err) {
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const handleToggleComplete = async () => {
        try {
            setLoading(true);
            await onToggleComplete(milestone);
        } catch (err) {
            console.error("Error toggling completion:", err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const isOverdue = () => {
        if (!milestone.dueDate || milestone.done) return false;
        return new Date(milestone.dueDate) < new Date();
    };

    const getDueDateColor = () => {
        if (!milestone.dueDate) return "text-gray-500";
        if (milestone.done) return "text-green-600";
        if (isOverdue()) return "text-red-600";

        const dueDate = new Date(milestone.dueDate);
        const now = new Date();
        const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);

        if (daysUntilDue <= 1) return "text-red-600";
        if (daysUntilDue <= 3) return "text-yellow-600";
        return "text-blue-600";
    };

    const getProgressColor = (score) => {
        if (score >= 0.8) return "text-green-600";
        if (score >= 0.6) return "text-blue-600";
        if (score >= 0.4) return "text-yellow-600";
        return "text-red-600";
    };

    if (isEditing) {
        return (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <MilestoneForm milestone={milestone} onSubmit={handleUpdate} onCancel={onCancelEdit} />
            </div>
        );
    }

    return (
        <div
            className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                milestone.done ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
            }`}
        >
            <div className="flex items-start justify-between">
                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    {/* Title and Status */}
                    <div className="flex items-center space-x-3 mb-2">
                        <button
                            onClick={handleToggleComplete}
                            disabled={loading}
                            className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                milestone.done
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "border-gray-300 hover:border-green-500"
                            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {milestone.done && <FaCheck className="text-xs" />}
                        </button>

                        <h4
                            className={`font-medium truncate ${
                                milestone.done ? "line-through text-gray-600" : "text-gray-900"
                            }`}
                        >
                            {milestone.title}
                        </h4>

                        {milestone.done && <FaCheckCircle className="text-green-500 flex-shrink-0" />}

                        {isOverdue() && <FaExclamationCircle className="text-red-500 flex-shrink-0" />}
                    </div>

                    {/* Description */}
                    {milestone.description && (
                        <p className={`text-sm mb-3 ${milestone.done ? "text-gray-500" : "text-gray-600"}`}>
                            {milestone.description}
                        </p>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                        {/* Due Date */}
                        {milestone.dueDate && (
                            <div className={`flex items-center space-x-1 ${getDueDateColor()}`}>
                                <FaCalendarAlt />
                                <span>{formatDate(milestone.dueDate)}</span>
                                {isOverdue() && <span className="font-medium">(Overdue)</span>}
                            </div>
                        )}

                        {/* Weight */}
                        <div className="flex items-center space-x-1 text-gray-600">
                            <FaWeight />
                            <span>Weight: {milestone.weight}</span>
                        </div>

                        {/* Progress Score */}
                        <div className={`flex items-center space-x-1 ${getProgressColor(milestone.score)}`}>
                            <span>Progress: {Math.round((milestone.score || 0) * 100)}%</span>
                        </div>

                        {/* Completion Date */}
                        {milestone.completedAt && (
                            <div className="flex items-center space-x-1 text-green-600">
                                <FaClock />
                                <span>Completed: {formatDate(milestone.completedAt)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                    <button
                        onClick={onStartEdit}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit milestone"
                    >
                        <FaEdit />
                    </button>

                    <button
                        onClick={() => onDelete(milestone.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete milestone"
                    >
                        <FaTrash />
                    </button>
                </div>
            </div>

            {/* Progress Bar for partial completion */}
            {!milestone.done && milestone.score > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{Math.round((milestone.score || 0) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${(milestone.score || 0) * 100}%` }}
                        ></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MilestoneItem;
