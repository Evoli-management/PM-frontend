// src/components/goals/GoalCard.jsx
import React, { useState } from "react";
import {
    Eye,
    Pencil,
    CheckCircle,
    Trash2,
    MoreHorizontal,
    Calendar,
    EyeOff,
    Archive,
    Clock,
    ChevronRight,
} from "lucide-react";

const GoalCard = ({ goal, onOpen, onEdit, onComplete, onDelete, onArchive, onToggleVisibility }) => {
    const [showActions, setShowActions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const completedMilestones = goal.milestones?.filter((m) => m.done).length || 0;
    const totalMilestones = goal.milestones?.length || 0;
    const progressPercent =
        totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : goal.progressPercent || 0;

    // Always calculate time-based information
    const now = new Date();
    const dueDate = new Date(goal.dueDate);
    const startDate = goal.startDate ? new Date(goal.startDate) : null;

    const dueInDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    const isOverdue = dueDate < now;
    const totalDuration = startDate ? Math.ceil((dueDate - startDate) / (1000 * 60 * 60 * 24)) : null;
    const daysPassed = startDate ? Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)) : null;

    // Calculate status-based display
    const getStatusDisplay = () => {
        if (goal.status === "completed") {
            const completedDate = goal.completedAt ? new Date(goal.completedAt) : null;
            if (completedDate && completedDate < dueDate) {
                const daysEarly = Math.ceil((dueDate - completedDate) / (1000 * 60 * 60 * 24));
                return { text: `Completed ${daysEarly} days early`, color: "text-green-600 font-medium" };
            } else if (completedDate && completedDate > dueDate) {
                const daysLate = Math.ceil((completedDate - dueDate) / (1000 * 60 * 60 * 24));
                return { text: `Completed ${daysLate} days late`, color: "text-orange-600 font-medium" };
            }
            return { text: "Completed on time", color: "text-green-600 font-medium" };
        }

        if (goal.status === "archived") {
            return { text: `Archived (was due ${dueDate.toLocaleDateString()})`, color: "text-gray-600" };
        }

        // Active goals
        if (isOverdue) {
            const daysOverdue = Math.abs(dueInDays);
            return { text: `${daysOverdue} days overdue`, color: "text-red-600 font-medium" };
        } else if (dueInDays === 0) {
            return { text: "Due today", color: "text-red-600 font-medium" };
        } else if (dueInDays === 1) {
            return { text: "Due tomorrow", color: "text-amber-600 font-medium" };
        } else if (dueInDays <= 7) {
            return { text: `${dueInDays} days left`, color: "text-amber-600 font-medium" };
        } else {
            return { text: `${dueInDays} days left`, color: "text-gray-600" };
        }
    };

    const statusDisplay = getStatusDisplay();

    const getStatusStyle = (status) => {
        switch (status) {
            case "completed":
                return "bg-green-100 text-green-700";
            case "active":
                return "bg-blue-100 text-blue-700";
            case "archived":
                return "bg-gray-100 text-gray-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    const getProgressColor = () => {
        if (progressPercent >= 80) return "bg-green-500";
        if (progressPercent >= 60) return "bg-blue-500";
        if (progressPercent >= 40) return "bg-yellow-500";
        return "bg-gray-400";
    };

    const handleAction = async (action, ...args) => {
        setIsLoading(true);
        try {
            await action(...args);
        } catch (error) {
            console.error("Action failed:", error);
        } finally {
            setIsLoading(false);
            setShowActions(false);
        }
    };

    const handleCardClick = () => {
        // Always open in edit mode when clicking the card
        onEdit(goal, "edit");
    };

    return (
        <div
            className="group relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden cursor-pointer"
            onClick={handleCardClick}
        >
            {/* Header Section */}
            <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span
                                className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${getStatusStyle(goal.status)}`}
                            >
                                {goal.status}
                            </span>
                            {goal.visibility === "private" && (
                                <div className="p-1 bg-gray-100 rounded-md">
                                    <EyeOff className="w-3 h-3 text-gray-500" />
                                </div>
                            )}
                        </div>

                        <h3
                            className="font-semibold text-gray-900 text-base mb-2 leading-tight hover:text-blue-600 transition-colors line-clamp-2"
                        >
                            {goal.title}
                        </h3>

                        {goal.description && (
                            <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed mb-4">
                                {goal.description}
                            </p>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1 ml-4">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick();
                            }}
                            disabled={isLoading}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                            title="Edit Goal"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>

                        {goal.status === "active" && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAction(onComplete, goal.id);
                                }}
                                disabled={isLoading}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                                title="Mark Complete"
                            >
                                <CheckCircle className="w-4 h-4" />
                            </button>
                        )}

                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowActions(!showActions);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {showActions && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                                    <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAction(onToggleVisibility, goal.id);
                                            }}
                                            className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 text-sm"
                                        >
                                            {goal.visibility === "public" ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                            Make {goal.visibility === "public" ? "Private" : "Public"}
                                        </button>

                                        {goal.status !== "archived" && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAction(onArchive, goal.id);
                                                }}
                                                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 text-sm"
                                            >
                                                <Archive className="w-4 h-4" />
                                                Archive
                                            </button>
                                        )}

                                        <hr className="my-1 border-gray-100" />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAction(onDelete, goal.id);
                                            }}
                                            className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-3 text-sm"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress Section */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                                {completedMilestones}/{totalMilestones} milestones completed
                            </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{progressPercent}%</span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor()}`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Due Date Section */}
                <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 text-sm ${statusDisplay.color}`}>
                        <Calendar className="w-4 h-4" />
                        <span>{statusDisplay.text}</span>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick();
                        }}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                    >
                        <ChevronRight className="w-3 h-3" />
                    </button>
                </div>

                {/* Progress insights */}
                {goal.status === "active" && totalDuration && daysPassed !== null && (
                    <div className="mt-3 text-xs text-gray-500">
                        Day {Math.max(1, daysPassed)} of {totalDuration} •{" "}
                        {Math.round((daysPassed / totalDuration) * 100)}% time elapsed
                    </div>
                )}

                {/* Overdue Warning - only for active overdue goals */}
                {isOverdue && goal.status === "active" && (
                    <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                        <Clock className="w-4 h-4 text-red-500" />
                        <span className="text-red-700 text-sm font-medium">Goal is overdue - needs attention</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoalCard;
