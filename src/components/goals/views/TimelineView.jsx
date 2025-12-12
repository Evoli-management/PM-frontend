import React, { useState } from "react";
import { calculateGoalProgress } from "../../../utils/goalUtils";
import {
    FaEdit,
    FaCheckCircle,
    FaTrash,
    FaEllipsisH,
    FaCalendarAlt,
    FaFlag,
    FaEyeSlash,
    FaArchive,
    FaClock,
} from "react-icons/fa";

const TimelineView = ({ goals = [], onGoalClick, onUpdate, onDelete }) => {
    const [actionGoal, setActionGoal] = useState(null);

    // Sort goals by due date
    const sortedGoals = [...goals].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const handleComplete = async (goalId) => {
        try {
            if (onUpdate) {
                await onUpdate(goalId, { status: "completed" });
            } else {
                const { completeGoal } = await import("../../../services/goalService");
                await completeGoal(goalId);
            }
        } catch (error) {
            console.error("Failed to complete goal:", error);
            alert(`Failed to complete goal: ${error.message}`);
        }
    };

    const handleArchive = async (goalId) => {
        if (onUpdate) {
            try {
                await onUpdate(goalId, { status: "archived" });
            } catch (error) {
                console.error("Failed to archive goal:", error);
            }
        }
    };

    const handleToggleVisibility = async (goalId) => {
        const goal = goals.find((g) => g.id === goalId);
        if (goal && onUpdate) {
            try {
                await onUpdate(goalId, { visibility: goal.visibility === "public" ? "private" : "public" });
            } catch (error) {
                console.error("Failed to toggle visibility:", error);
            }
        }
    };

    const handleDelete = async (goalId) => {
        if (window.confirm("Are you sure you want to delete this goal?")) {
            if (onDelete) {
                try {
                    await onDelete(goalId);
                } catch (error) {
                    console.error("Failed to delete goal:", error);
                }
            }
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "completed":
                return "bg-emerald-500";
            case "active":
                return "bg-blue-500";
            case "archived":
                return "bg-gray-500";
            default:
                return "bg-gray-500";
        }
    };

    if (!goals || goals.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">No goals found</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="space-y-6">
                {sortedGoals.map((goal, index) => {
                    const completedMilestones =
                        (goal.milestones || []).filter((m) => {
                            if (m && m.done) return true;
                            if (m && m.score !== undefined && m.score !== null) return parseFloat(m.score) >= 1;
                            return false;
                        }).length || 0;
                    const totalMilestones = goal.milestones?.length || 0;
                    const progressPercent = calculateGoalProgress(goal);

                    const displayTotalMilestones = totalMilestones;
                    const displayCompletedMilestones =
                        goal.status === "completed" && displayTotalMilestones > 0
                            ? displayTotalMilestones
                            : completedMilestones;

                    const now = new Date();
                    const dueDate = new Date(goal.dueDate);
                    const startDate = goal.startDate ? new Date(goal.startDate) : null;

                    const isOverdue = dueDate < now && goal.status === "active";
                    const dueInDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

                    // Calculate timeline position and progress insights
                    const totalDuration = startDate ? Math.ceil((dueDate - startDate) / (1000 * 60 * 60 * 24)) : null;
                    const daysPassed = startDate
                        ? Math.max(0, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)))
                        : null;
                    const timeProgressPercent =
                        totalDuration && daysPassed !== null
                            ? Math.min(100, Math.round((daysPassed / totalDuration) * 100))
                            : null;

                    const getTimelineStatus = () => {
                        if (goal.status === "completed") {
                            const completedDate = goal.completedAt ? new Date(goal.completedAt) : dueDate;
                            if (completedDate < dueDate) {
                                const daysEarly = Math.ceil((dueDate - completedDate) / (1000 * 60 * 60 * 24));
                                return `Completed ${daysEarly} days early`;
                            } else if (completedDate > dueDate) {
                                const daysLate = Math.ceil((completedDate - dueDate) / (1000 * 60 * 60 * 24));
                                return `Completed ${daysLate} days late`;
                            }
                            return "Completed on time";
                        }

                        if (goal.status === "archived") return `Archived (was due ${dueDate.toLocaleDateString()})`;
                        if (isOverdue) return `${Math.abs(dueInDays)} days overdue`;
                        if (dueInDays === 0) return "Due today";
                        if (dueInDays === 1) return "Due tomorrow";
                        return `${dueInDays} days left`;
                    };

                    return (
                        <div key={goal.id} className="relative flex items-start gap-4">
                            {/* Timeline indicator */}
                            <div className="flex flex-col items-center">
                                <div className={`w-4 h-4 rounded-full ${getStatusColor(goal.status)} shadow-lg`}></div>
                                {index < sortedGoals.length - 1 && <div className="w-0.5 h-16 bg-gray-200 mt-2"></div>}
                            </div>

                            {/* Goal content */}
                            <div
                                className="flex-1 bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => onGoalClick(goal)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-2">{goal.title}</h3>
                                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                            <span>{dueDate.toLocaleDateString()}</span>
                                            <span>
                                                {displayCompletedMilestones}/{displayTotalMilestones} milestones
                                            </span>
                                            <span>{progressPercent}% complete</span>
                                            {timeProgressPercent !== null && (
                                                <span>• {timeProgressPercent}% time elapsed</span>
                                            )}
                                        </div>

                                        {/* Timeline status */}
                                        <div
                                            className={`text-sm font-medium mb-3 ${
                                                goal.status === "completed"
                                                    ? "text-green-600"
                                                    : goal.status === "archived"
                                                      ? "text-gray-600"
                                                      : isOverdue
                                                        ? "text-red-600"
                                                        : dueInDays <= 3
                                                          ? "text-amber-600"
                                                          : "text-blue-600"
                                            }`}
                                        >
                                            {getTimelineStatus()}
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full bg-blue-500 transition-all"
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onGoalClick(goal, "edit");
                                        }}
                                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                                    >
                                        <FaEdit className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TimelineView;
