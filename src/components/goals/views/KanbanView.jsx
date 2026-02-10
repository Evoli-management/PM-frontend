// src/components/goals/views/KanbanView.jsx - Professional Kanban Board with Drag & Drop
import React, { useState, useEffect } from "react";
import { calculateGoalProgress } from "../../../utils/goalUtils";
import { Archive, Trash2 } from "lucide-react";
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
    FaPlus,
} from "react-icons/fa";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    useDroppable,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const KanbanView = ({ goals = [], onGoalClick, onUpdate, onDelete }) => {
    const [actionGoal, setActionGoal] = useState(null);
    const [localGoals, setLocalGoals] = useState(goals || []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            // Only close if clicking outside the menu and not on an ellipsis button
            if (actionGoal !== null && !e.target.closest('[data-ellipsis-button]')) {
                setActionGoal(null);
            }
        };

        if (actionGoal !== null) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [actionGoal]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLocalGoals(goals || []);
                const missing = (goals || []).filter((g) => !g || !Array.isArray(g.milestones) || g.milestones.length === 0).map((g) => g && g.id).filter(Boolean);
                if (missing.length === 0) return;
                const { getGoalsByIds } = await import("../../../services/goalService");
                const detailed = await getGoalsByIds(missing);
                if (!mounted) return;
                const byId = new Map((detailed || []).filter(Boolean).map((d) => [String(d.id), d]));
                setLocalGoals((prev) => (prev || []).map((g) => (g && byId.has(String(g.id)) ? { ...g, ...(byId.get(String(g.id)) || {}) } : g)));
            } catch (e) {
                console.warn("Failed to bulk-enrich goals for Kanban:", e);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [goals]);

    // Group goals by status
    const source = localGoals || goals;
    const groupedGoals = {
        active: (source || []).filter((goal) => goal.status === "active") || [],
        completed: (source || []).filter((goal) => goal.status === "completed") || [],
        archived: (source || []).filter((goal) => goal.status === "archived") || [],
    };

    const columns = [
        { id: "active", title: "Active Goals", goals: groupedGoals.active, color: "blue" },
        { id: "completed", title: "Completed", goals: groupedGoals.completed, color: "emerald" },
        { id: "archived", title: "Archived", goals: groupedGoals.archived, color: "slate" },
    ];

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

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (!over) return;

        const activeGoal = localGoals.find((g) => g.id === active.id);
        if (!activeGoal) return;

        // Determine target status from over id
        let targetStatus = null;
        if (over.id === "droppable-active") targetStatus = "active";
        else if (over.id === "droppable-completed") targetStatus = "completed";
        else if (over.id === "droppable-archived") targetStatus = "archived";
        else {
            // Dropped on another goal - get its status
            const overGoal = localGoals.find((g) => g.id === over.id);
            if (overGoal) targetStatus = overGoal.status;
        }

        if (!targetStatus || activeGoal.status === targetStatus) return;

        try {
            // Optimistically update local state
            setLocalGoals((prev) =>
                prev.map((g) => (g.id === activeGoal.id ? { ...g, status: targetStatus } : g))
            );

            // Update on server
            await onUpdate(activeGoal.id, { status: targetStatus });
        } catch (error) {
            console.error("Failed to update goal status:", error);
            // Revert on error
            setLocalGoals(goals);
            alert(`Failed to move goal: ${error.message}`);
        }
    };

    const DroppableColumn = ({ id, children }) => {
        const { setNodeRef } = useDroppable({ id });
        return <div ref={setNodeRef}>{children}</div>;
    };

    const SortableGoalCard = ({ goal }) => {
        const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
            id: goal.id,
        });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        };

        return (
            <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
                <GoalCard goal={goal} />
            </div>
        );
    };

    const GoalCard = ({ goal }) => {
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
        const isOverdue = dueDate < now && goal.status === "active";
        const dueInDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        const getKanbanDateDisplay = () => {
            if (goal.status === "completed") {
                const completedDate = goal.completedAt ? new Date(goal.completedAt) : dueDate;
                if (completedDate < dueDate) return "Early";
                if (completedDate > dueDate) return "Late";
                return "On time";
            }
            if (goal.status === "archived") return "Archived";
            if (isOverdue) return `${Math.abs(dueInDays)}d overdue`;
            if (dueInDays === 0) return "Today";
            if (dueInDays === 1) return "Tomorrow";
            if (dueInDays <= 7) return `${dueInDays}d left`;
            return dueDate.toLocaleDateString();
        };

        return (
            <div
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                onClick={() => onGoalClick(goal)}
            >
                <div className="flex items-start justify-between mb-3">
                    <h4 title={goal.title.length > 50 ? goal.title : ""} className="font-semibold text-gray-900 text-sm line-clamp-2 break-words">{goal.title}</h4>
                    <div className="relative">
                        <button
                            data-ellipsis-button
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setActionGoal(actionGoal === goal.id ? null : goal.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 rounded transition-all"
                        >
                            <FaEllipsisH className="w-3 h-3" />
                        </button>

                        {actionGoal === goal.id && (
                            <div className="absolute right-0 top-6 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onGoalClick(goal, "edit");
                                        setActionGoal(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-2"
                                >
                                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" className="w-4 h-4 text-slate-600" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M402.6 83.2l90.2 90.2c3.8 3.8 3.8 10 0 13.8L274.4 405.6l-92.8 10.3c-12.4 1.4-22.9-9.1-21.5-21.5l10.3-92.8L388.8 83.2c3.8-3.8 10-3.8 13.8 0zm162-22.9l-48.8-48.8c-15.2-15.2-39.9-15.2-55.2 0l-35.4 35.4c-3.8 3.8-3.8 10 0 13.8l90.2 90.2c3.8 3.8 10 3.8 13.8 0l35.4-35.4c15.2-15.3 15.2-40 0-55.2zM384 346.2V448H64V128h229.8c3.2 0 6.2-1.3 8.5-3.5l40-40c7.6-7.6 2.2-20.5-8.5-20.5H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V306.2c0-10.7-12.9-16-20.5-8.5l-40 40c-2.2 2.3-3.5 5.3-3.5 8.5z"></path></svg>
                                    Edit
                                </button>

                                    {goal.status === "active" && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleComplete(goal.id);
                                                setActionGoal(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 text-sm"
                                        >
                                            Mark Complete
                                        </button>
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleVisibility(goal.id);
                                            setActionGoal(null);
                                        }}
                                        className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 text-sm"
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
                                            className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-2"
                                        >
                                            <Archive className="w-4 h-4 text-slate-600" />
                                            Archive
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleUnarchive(goal.id);
                                                setActionGoal(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 text-sm"
                                        >
                                            Unarchive
                                        </button>
                                    )}

                                    <hr className="my-1 border-gray-100" />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(goal.id);
                                            setActionGoal(null);
                                        }}
                                        className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 text-sm flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                </div>
                        )}
                    </div>
                </div>

                {goal.description && <p className="text-gray-600 text-xs line-clamp-2 mb-3">{goal.description}</p>}

                {/* Progress */}
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">
                            {displayCompletedMilestones}/{displayTotalMilestones} milestones
                        </span>
                        <span className="text-xs font-medium text-gray-700">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                            className={`h-1.5 rounded-full transition-all ${
                                progressPercent >= 80
                                    ? "bg-emerald-500"
                                    : progressPercent >= 60
                                      ? "bg-blue-500"
                                      : progressPercent >= 40
                                        ? "bg-amber-500"
                                        : "bg-gray-400"
                            }`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Meta info */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {goal.visibility === "private" && <FaEyeSlash className="w-3 h-3 text-amber-500" />}
                        {isOverdue && goal.status === "active" && <FaClock className="w-3 h-3 text-red-500" />}
                    </div>
                    <div
                        className={`text-xs font-medium ${
                            goal.status === "completed"
                                ? "text-green-600"
                                : goal.status === "archived"
                                  ? "text-gray-500"
                                  : isOverdue
                                    ? "text-red-600"
                                    : dueInDays <= 3
                                      ? "text-amber-600"
                                      : "text-gray-500"
                        }`}
                    >
                        {getKanbanDateDisplay()}
                    </div>
                </div>
            </div>
        );
    };

    if (!goals || goals.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">No goals found</p>
            </div>
        );
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="flex gap-6 overflow-x-auto pb-4">
                {columns.map((column) => (
                    <div key={column.id} className="flex-shrink-0 w-80">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                            {/* Column Header */}
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900">{column.title}</h3>
                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                                        {column.goals.length}
                                    </span>
                                </div>
                            </div>

                            {/* Column Content - Fixed height with scrolling */}
                            <div className="max-h-[600px] overflow-y-auto">
                                <DroppableColumn id={`droppable-${column.id}`}>
                                    <SortableContext
                                        items={column.goals.map((g) => g.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="p-4 space-y-3 overflow-visible">
                                            {column.goals.map((goal) => (
                                                <SortableGoalCard key={goal.id} goal={goal} />
                                            ))}

                                            {column.goals.length === 0 && (
                                                <div className="text-center py-8 text-gray-400">
                                                    <p className="text-sm">No {column.title.toLowerCase()}</p>
                                                    <p className="text-xs mt-2">Drag goals here</p>
                                                </div>
                                            )}
                                        </div>
                                    </SortableContext>
                                </DroppableColumn>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </DndContext>
    );
};

export default KanbanView;
