// src/components/goals/GoalCard.jsx
import React, { useState, useEffect, useRef } from "react";
import { calculateGoalProgress } from "../../utils/goalUtils";
import {
    Eye,
    CheckCircle,
    Trash2,
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
                    prefetchGoal(goal.id).catch(() => { });
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
                                if (typeof onEdit === "function") {
                                    onEdit(goal, "edit");
                                } else if (typeof onOpen === "function") {
                                    onOpen(goal);
                                }
                            }}
                            disabled={isLoading}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                            title="Edit goal"
                        >
                            <svg
                                stroke="currentColor"
                                fill="currentColor"
                                strokeWidth="0"
                                viewBox="0 0 576 512"
                                className="w-4 h-4 text-slate-600"
                                height="1em"
                                width="1em"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                            >
                                <path d="M402.6 83.2l90.2 90.2c3.8 3.8 3.8 10 0 13.8L274.4 405.6l-92.8 10.3c-12.4 1.4-22.9-9.1-21.5-21.5l10.3-92.8L388.8 83.2c3.8-3.8 10-3.8 13.8 0zm162-22.9l-48.8-48.8c-15.2-15.2-39.9-15.2-55.2 0l-35.4 35.4c-3.8 3.8-3.8 10 0 13.8l90.2 90.2c3.8 3.8 10 3.8 13.8 0l35.4-35.4c15.2-15.3 15.2-40 0-55.2zM384 346.2V448H64V128h229.8c3.2 0 6.2-1.3 8.5-3.5l40-40c7.6-7.6 2.2-20.5-8.5-20.5H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V306.2c0-10.7-12.9-16-20.5-8.5l-40 40c-2.2 2.3-3.5 5.3-3.5 8.5z" />
                            </svg>
                        </button>

                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowActions(!showActions);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
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
                                            {goal.visibility === "private" ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                            {goal.visibility === "private" ? "Make Public" : "Make Private"}
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
                    <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed mb-2">
                        {goal.description}
                    </p>
                )}

                {/* Sub-goal badge: shown when this goal is linked to a parent */}
                {goal.parentGoalId && (
                    <div className="inline-flex items-center gap-1 mb-3 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-xs text-purple-700 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.293 3.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 9H7a3 3 0 000 6h1a1 1 0 110 2H7A5 5 0 017 7h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Sub-goal{goal.parentGoalTitle ? `: ${goal.parentGoalTitle}` : ''}
                    </div>
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
