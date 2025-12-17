// src/components/goals/views/ListView.jsx - Modern list view for goals
import React, { useState, useEffect } from "react";
import { calculateGoalProgress } from "../../../utils/goalUtils";
import {
    Pencil,
    CheckCircle,
    Trash2,
    MoreHorizontal,
    Calendar,
    Flag,
    EyeOff,
    Archive,
    Clock,
} from "lucide-react";

const ListView = ({ goals, onGoalClick, onUpdate, onDelete }) => {
    const [actionGoal, setActionGoal] = useState(null);
    const [localGoals, setLocalGoals] = useState(goals || []);

    useEffect(() => {
        let mounted = true;
        // If incoming goals already include milestones, use them directly.
        // Otherwise batch-fetch missing goal details to enrich with milestones.
        (async () => {
            try {
                setLocalGoals(goals || []);
                const missing = (goals || []).filter((g) => !g || !Array.isArray(g.milestones) || g.milestones.length === 0).map((g) => g && g.id).filter(Boolean);
                if (missing.length === 0) return;
                const { getGoalsByIds } = await import("../../../services/goalService");
                const detailed = await getGoalsByIds(missing);
                if (!mounted) return;
                // Merge detailed goals into localGoals by id
                const byId = new Map((detailed || []).filter(Boolean).map((d) => [String(d.id), d]));
                setLocalGoals((prev) => (prev || []).map((g) => (g && byId.has(String(g.id)) ? { ...g, ...(byId.get(String(g.id)) || {}) } : g)));
            } catch (e) {
                // non-fatal
                console.warn("Failed to bulk-enrich goals with milestones:", e);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [goals]);

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

    const handleUnarchive = async (goalId) => {
        if (onUpdate) {
            try {
                await onUpdate(goalId, { status: "active" });
            } catch (error) {
                console.error("Failed to unarchive goal:", error);
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
                return "text-emerald-600 bg-emerald-50";
            case "active":
                return "text-blue-600 bg-blue-50";
            case "archived":
                return "text-slate-600 bg-slate-50";
            default:
                return "text-slate-600 bg-slate-50";
        }
    };

    if (!goals || goals.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">No goals found</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-slate-600">
                    <div className="col-span-4">Goal</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Progress</div>
                    <div className="col-span-2">Due Date</div>
                    <div className="col-span-2">Actions</div>
                </div>
            </div>

            {/* Goals List */}
            <div className="divide-y divide-slate-200">
                {(localGoals || goals).map((goal) => {
                    const completedMilestones =
                        (goal.milestones || []).filter((m) => {
                            if (m && m.done) return true;
                            if (m && m.score !== undefined && m.score !== null) return parseFloat(m.score) >= 1;
                            return false;
                        }).length || 0;
                    const totalMilestones = goal.milestones?.length || 0;

                    const displayTotalMilestones = totalMilestones;
                    const displayCompletedMilestones =
                        goal.status === "completed" && displayTotalMilestones > 0
                            ? displayTotalMilestones
                            : completedMilestones;
                    const progressPercent = calculateGoalProgress(goal);

                    const now = new Date();
                    const dueDate = new Date(goal.dueDate);
                    const isOverdue = dueDate < now && goal.status === "active";
                    const dueInDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

                    const getDateDisplay = () => {
                        if (goal.status === "completed") {
                            const completedDate = goal.completedAt ? new Date(goal.completedAt) : dueDate;
                            return completedDate < dueDate
                                ? "Completed early"
                                : completedDate > dueDate
                                    ? "Completed late"
                                    : "Completed on time";
                        }
                        if (goal.status === "archived") return "Archived";
                        if (isOverdue) return `${Math.abs(dueInDays)} days overdue`;
                        if (dueInDays === 0) return "Due today";
                        if (dueInDays === 1) return "Due tomorrow";
                        return `${dueInDays} days left`;
                    };

                    return (
                        <div
                            key={goal.id}
                            className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => onGoalClick(goal)}
                        >
                            <div className="grid grid-cols-12 gap-4 items-center">
                                {/* Goal Info */}
                                <div className="col-span-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-slate-900 truncate">{goal.title}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {goal.visibility === "private" && (
                                                    <EyeOff className="w-3 h-3 text-amber-500" />
                                                )}
                                                <span className="text-sm text-slate-500">
                                                    {displayCompletedMilestones}/{displayTotalMilestones} milestones
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="col-span-2">
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(goal.status)}`}
                                    >
                                        {goal.status}
                                    </span>
                                </div>

                                {/* Progress */}
                                <div className="col-span-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-300 ${progressPercent >= 80
                                                        ? "bg-emerald-500"
                                                        : progressPercent >= 60
                                                            ? "bg-blue-500"
                                                            : progressPercent >= 40
                                                                ? "bg-amber-500"
                                                                : "bg-slate-400"
                                                    }`}
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700 min-w-[3rem]">
                                            {progressPercent}%
                                        </span>
                                    </div>
                                </div>

                                {/* Due Date */}
                                <div className="col-span-2">
                                    <div
                                        className={`flex items-center gap-2 text-sm ${isOverdue ? "text-red-600 font-semibold" : "text-slate-600"
                                            }`}
                                    >
                                        <Calendar className="w-3 h-3" />
                                        <span>{new Date(goal.dueDate).toLocaleDateString()}</span>
                                        {isOverdue && <Clock className="w-3 h-3" />}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="col-span-2">
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onGoalClick(goal);
                                            }}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit Goal"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>

                                        {goal.status === "active" && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleComplete(goal.id);
                                                }}
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                title="Mark Complete"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}

                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActionGoal(actionGoal === goal.id ? null : goal.id);
                                                }}
                                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>

                                            {actionGoal === goal.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActionGoal(null);
                                                        }}
                                                    />
                                                    <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-20">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleVisibility(goal.id);
                                                                setActionGoal(null);
                                                            }}
                                                            className="w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 text-sm"
                                                        >
                                                            Make {goal.visibility === "public" ? "Private" : "Public"}
                                                        </button>

                                                        {goal.status !== "archived" ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleArchive(goal.id);
                                                                    setActionGoal(null);
                                                                }}
                                                                className="w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 text-sm"
                                                            >
                                                                Archive
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUnarchive(goal.id);
                                                                    setActionGoal(null);
                                                                }}
                                                                className="w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 text-sm"
                                                            >
                                                                Unarchive
                                                            </button>
                                                        )}

                                                        <hr className="my-2 border-slate-100" />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(goal.id);
                                                                setActionGoal(null);
                                                            }}
                                                            className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 text-sm"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ListView;
