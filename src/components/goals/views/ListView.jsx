// src/components/goals/views/ListView.jsx - Modern list view for goals with inline editing
import React, { useState, useEffect } from "react";
import { calculateGoalProgress } from "../../../utils/goalUtils";
import {
    Pencil,
    CheckCircle,
    Trash2,
    MoreHorizontal,
    Calendar,
    Flag,
    Eye,
    EyeOff,
    Archive,
    Clock,
    Check,
    X,
} from "lucide-react";

const ListView = ({ goals, onGoalClick, onUpdate, onDelete, selectedGoals = new Set(), onToggleSelection }) => {
    const [actionGoal, setActionGoal] = useState(null);
    const [localGoals, setLocalGoals] = useState(goals || []);
    const [editingGoal, setEditingGoal] = useState(null);
    const [editedTitle, setEditedTitle] = useState("");

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

    const handleStartEdit = (goal, e) => {
        e.stopPropagation();
        setEditingGoal(goal.id);
        setEditedTitle(goal.title);
    };

    const handleSaveEdit = async (goalId, e) => {
        e.stopPropagation();
        if (editedTitle.trim() && editedTitle !== goals.find(g => g.id === goalId)?.title) {
            try {
                await onUpdate(goalId, { title: editedTitle.trim() });
            } catch (error) {
                console.error("Failed to update goal title:", error);
                alert(`Failed to update goal: ${error.message}`);
            }
        }
        setEditingGoal(null);
        setEditedTitle("");
    };

    const handleCancelEdit = (e) => {
        e.stopPropagation();
        setEditingGoal(null);
        setEditedTitle("");
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
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-visible">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-slate-600">
                    {onToggleSelection && <div className="col-span-1">Select</div>}
                    <div className={onToggleSelection ? "col-span-3" : "col-span-4"}>Goal</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Progress</div>
                    <div className="col-span-2">Due Date</div>
                    <div className="col-span-2">Actions</div>
                </div>
            </div>

            {/* Goals List */}
            <div className="divide-y divide-slate-200">
                {(localGoals || goals).map((goal, index) => {
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
                                {/* Checkbox */}
                                {onToggleSelection && (
                                    <div className="col-span-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedGoals.has(goal.id)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                onToggleSelection(goal.id);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                    </div>
                                )}

                                {/* Goal Info */}
                                <div className={onToggleSelection ? "col-span-3" : "col-span-4"}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
                                        <div className="flex-1 min-w-0">
                                            {editingGoal === goal.id ? (
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        value={editedTitle}
                                                        onChange={(e) => setEditedTitle(e.target.value)}
                                                        className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") handleSaveEdit(goal.id, e);
                                                            if (e.key === "Escape") handleCancelEdit(e);
                                                        }}
                                                    />
                                                    <button
                                                        onClick={(e) => handleSaveEdit(goal.id, e)}
                                                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                        title="Save"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                        title="Cancel"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="group/title flex items-center gap-2">
                                                    <h3 
                                                        title={goal.title.length > 50 ? goal.title : ""} 
                                                        className="font-semibold text-slate-900 truncate flex-1"
                                                    >
                                                        {goal.title}
                                                    </h3>
                                                    <button
                                                        onClick={(e) => handleStartEdit(goal, e)}
                                                        className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-opacity"
                                                        title="Edit title"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
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
                                        {goal.status === "completed" ? (
                                            <>
                                                <button
                                                    onClick={(e) => handleStartEdit(goal, e)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit goal"
                                                >
                                                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" className="w-4 h-4 text-slate-600" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M402.6 83.2l90.2 90.2c3.8 3.8 3.8 10 0 13.8L274.4 405.6l-92.8 10.3c-12.4 1.4-22.9-9.1-21.5-21.5l10.3-92.8L388.8 83.2c3.8-3.8 10-3.8 13.8 0zm162-22.9l-48.8-48.8c-15.2-15.2-39.9-15.2-55.2 0l-35.4 35.4c-3.8 3.8-3.8 10 0 13.8l90.2 90.2c3.8 3.8 10 3.8 13.8 0l35.4-35.4c15.2-15.3 15.2-40 0-55.2zM384 346.2V448H64V128h229.8c3.2 0 6.2-1.3 8.5-3.5l40-40c7.6-7.6 2.2-20.5-8.5-20.5H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V306.2c0-10.7-12.9-16-20.5-8.5l-40 40c-2.2 2.3-3.5 5.3-3.5 8.5z"></path></svg>
                                                </button>
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActionGoal(actionGoal === goal.id ? null : goal.id);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                                        aria-label="More actions"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            width="24"
                                                            height="24"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="lucide lucide-ellipsis w-4 h-4"
                                                            aria-hidden="true"
                                                        >
                                                            <circle cx="12" cy="12" r="1"></circle>
                                                            <circle cx="19" cy="12" r="1"></circle>
                                                            <circle cx="5" cy="12" r="1"></circle>
                                                        </svg>
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
                                                                    className="w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 text-sm flex items-center gap-3"
                                                                >
                                                                    {goal.visibility === "private" ? (
                                                                        <EyeOff className="w-4 h-4 text-slate-600" />
                                                                    ) : (
                                                                        <Eye className="w-4 h-4 text-slate-600" />
                                                                    )}
                                                                    {goal.visibility === "private" ? "Make Public" : "Make Private"}
                                                                </button>

                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleArchive(goal.id);
                                                                        setActionGoal(null);
                                                                    }}
                                                                    className="w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 text-sm flex items-center gap-3"
                                                                >
                                                                    <Archive className="w-4 h-4 text-slate-600" />
                                                                    Archive
                                                                </button>

                                                                <hr className="my-2 border-slate-100" />
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(goal.id);
                                                                        setActionGoal(null);
                                                                    }}
                                                                    className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 text-sm flex items-center gap-3"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={(e) => handleStartEdit(goal, e)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit goal"
                                                >
                                                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" className="w-4 h-4 text-slate-600" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M402.6 83.2l90.2 90.2c3.8 3.8 3.8 10 0 13.8L274.4 405.6l-92.8 10.3c-12.4 1.4-22.9-9.1-21.5-21.5l10.3-92.8L388.8 83.2c3.8-3.8 10-3.8 13.8 0zm162-22.9l-48.8-48.8c-15.2-15.2-39.9-15.2-55.2 0l-35.4 35.4c-3.8 3.8-3.8 10 0 13.8l90.2 90.2c3.8 3.8 10 3.8 13.8 0l35.4-35.4c15.2-15.3 15.2-40 0-55.2zM384 346.2V448H64V128h229.8c3.2 0 6.2-1.3 8.5-3.5l40-40c7.6-7.6 2.2-20.5-8.5-20.5H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V306.2c0-10.7-12.9-16-20.5-8.5l-40 40c-2.2 2.3-3.5 5.3-3.5 8.5z"></path></svg>
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
                                                        aria-label="More actions"
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
                                                                    className="w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 text-sm flex items-center gap-3"
                                                                >
                                                                    {goal.visibility === "private" ? (
                                                                        <EyeOff className="w-4 h-4 text-slate-600" />
                                                                    ) : (
                                                                        <Eye className="w-4 h-4 text-slate-600" />
                                                                    )}
                                                                    {goal.visibility === "private" ? "Make Public" : "Make Private"}
                                                                </button>

                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleArchive(goal.id);
                                                                        setActionGoal(null);
                                                                    }}
                                                                    className="w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 text-sm flex items-center gap-3"
                                                                >
                                                                    <Archive className="w-4 h-4 text-slate-600" />
                                                                    Archive
                                                                </button>

                                                                <hr className="my-2 border-slate-100" />
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(goal.id);
                                                                        setActionGoal(null);
                                                                    }}
                                                                    className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 text-sm flex items-center gap-3"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        )}
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
