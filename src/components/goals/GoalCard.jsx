// src/components/goals/GoalCard.jsx
import React, { useState, useEffect, useRef } from "react";
import { calculateGoalProgress } from "../../utils/goalUtils";
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
import { FaCheckCircle, FaClock, FaFlag } from "react-icons/fa";
import { useFormattedDate } from "../../hooks/useFormattedDate";
import { getStatusStyle, getProgressColorCard } from "../../utils/goalCardStyles";
import { getGoalById, prefetchGoal } from "../../services/goalService";

const GoalCard = ({ goal, onOpen, onEdit, onComplete, onDelete, onArchive, onUnarchive, onToggleVisibility, isSelected, onToggleSelection }) => {
    const [showActions, setShowActions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [localMilestones, setLocalMilestones] = useState(null);
    const hoverTimer = useRef(null);

    // Date formatting helpers from hook
    const { formatDate } = useFormattedDate();

    const milestones = localMilestones ?? goal.milestones ?? [];

    const completedMilestones =
        (milestones || []).filter((m) => {
            if (m && m.done) return true;
            if (m && m.score !== undefined && m.score !== null) {
                return parseFloat(m.score) >= 1;
            }
            return false;
        }).length || 0;
    const totalMilestones = milestones?.length || 0;
    const progressPercent = calculateGoalProgress(goal);

    // For display purposes: if a goal is marked completed but milestones aren't
    // individually marked, assume all milestones are completed so the UI shows
    // "N/N milestones completed" for completed goals.
    const displayTotalMilestones = totalMilestones;
    const displayCompletedMilestones =
        goal.status === "completed" && displayTotalMilestones > 0
            ? displayTotalMilestones
            : completedMilestones;

    // Lazy-load milestones if the list endpoint didn't include them
    useEffect(() => {
        let mounted = true;
        if ((goal.milestones === undefined || goal.milestones.length === 0) && !localMilestones) {
            // fetch details for this goal (includes milestones)
            (async () => {
                try {
                    const detailed = await getGoalById(goal.id);
                    if (mounted) setLocalMilestones(detailed.milestones || []);
                } catch (err) {
                    // ignore - keep localMilestones null so we don't retry aggressively
                    console.warn(`Failed to lazy-load milestones for goal ${goal.id}:`, err);
                }
            })();
        }
        return () => {
            mounted = false;
        };
    }, [goal, localMilestones]);

    // Prefetch goal details on hover to reduce perceived delay when opening
    const handlePointerEnter = () => {
        // only prefetch if we don't already have milestones
        if ((goal.milestones === undefined || goal.milestones.length === 0) && !localMilestones) {
            // small debounce so quick mouse passes don't trigger many requests
            hoverTimer.current = setTimeout(() => {
                try {
                    prefetchGoal(goal.id).catch(() => {});
                } catch (e) {
                    // swallow
                }
            }, 200);
        }
    };

    const handlePointerLeave = () => {
        if (hoverTimer.current) {
            clearTimeout(hoverTimer.current);
            hoverTimer.current = null;
        }
    };

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
            return { text: `Archived (was due ${formatDate(dueDate)})`, color: "text-gray-600" };
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


    const getProgressColor = () => {
        return getProgressColorCard(progressPercent);
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
        // Prefer opening/viewing the goal if an 'onOpen' handler is provided.
        // Fall back to edit if only onEdit is supplied (preserves previous behavior).
        if (typeof onOpen === "function") {
            try {
                onOpen(goal);
                return;
            } catch (e) {
                // ignore and fallback
            }
        }
        if (typeof onEdit === "function") {
            onEdit(goal, "edit");
        }
    };

    return (
        <div
            className="group relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden cursor-pointer"
            onClick={handleCardClick}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
        >
            {/* Header Section */}
            <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                    {/* Left side: Checkbox */}
                    <div className="flex items-center gap-2">
                        {onToggleSelection && (
                            <input
                                type="checkbox"
                                checked={isSelected || false}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onToggleSelection(goal.id);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-5 h-5 text-blue-600 bg-white border-slate-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
                            />
                        )}
                        {goal.visibility === "private" && (
                            <div className="p-1 bg-gray-100 rounded-md">
                                <EyeOff className="w-3 h-3 text-gray-500" />
                            </div>
                        )}
                    </div>

                    {/* Center: Status Icon + Badge */}
                    <div className="flex items-center gap-2">
                        {goal.status === "completed" && (
                            <FaCheckCircle className="w-3.5 h-3.5 text-green-600" />
                        )}
                        {goal.status === "active" && (
                            <FaClock className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        {goal.status === "archived" && (
                            <FaFlag className="w-3.5 h-3.5 text-gray-600" />
                        )}
                        <span
                            className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${getStatusStyle(goal.status)}`}
                        >
                            {goal.status}
                        </span>
                    </div>

                    {/* Right side: Edit + Menu Actions */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // Explicitly call the edit handler so the edit modal opens in grid view
                                if (typeof onEdit === "function") {
                                    onEdit(goal, "edit");
                                } else if (typeof onOpen === "function") {
                                    // fallback
                                    onOpen(goal);
                                }
                            }}
                            disabled={isLoading}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                            title="Edit Goal"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>

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
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={(e) => {
                                            // Prevent the click from bubbling to the card which would open the goal
                                            e.stopPropagation();
                                            setShowActions(false);
                                        }}
                                    />
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

                                        {goal.status !== "archived" ? (
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
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAction(onUnarchive, goal.id);
                                                }}
                                                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 text-sm"
                                            >
                                                <Archive className="w-4 h-4" />
                                                Unarchive
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

                {/* Title and Description */}
                <h3
                    title={goal.title.length > 60 ? goal.title : ""}
                    className="font-semibold text-gray-900 text-base mb-2 leading-tight hover:text-blue-600 transition-colors line-clamp-2 break-words"
                >
                    {goal.title}
                </h3>

                {goal.description && (
                    <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed mb-4">
                        {goal.description}
                    </p>
                )}

                {/* Progress Section */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">
                                    {displayCompletedMilestones}/{displayTotalMilestones} milestones completed
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
