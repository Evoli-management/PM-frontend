// src/components/goals/views/KanbanView.jsx - Professional Kanban Board with Drag & Drop
import React, { useState, useEffect } from "react";
import GoalCard from "../GoalCard";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const KanbanView = ({ goals = [], onGoalClick, onUpdate, onDelete }) => {
    const [localGoals, setLocalGoals] = useState(goals || []);

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
                <GoalCard
                    goal={goal}
                    onOpen={onGoalClick}
                    onEdit={onGoalClick}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                    onToggleVisibility={handleToggleVisibility}
                    cardClassName="h-[320px] flex flex-col"
                    contentClassName="flex-1 min-h-0 overflow-y-auto hover-scrollbar-y"
                />
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
            <div className="h-full min-h-0 overflow-hidden pb-1">
                <div className="grid h-full min-h-0 auto-rows-fr grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {columns.map((column) => (
                        <div key={column.id} className="min-w-0 h-full min-h-0">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full min-h-0 flex flex-col">
                                {/* Column Header */}
                                <div className="p-4 border-b border-gray-200 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900">{column.title}</h3>
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                                            {column.goals.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Column Content - Fixed height with scrolling */}
                                <div className="flex-1 min-h-0 overflow-y-auto hover-scrollbar-y">
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
            </div>
        </DndContext>
    );
};

export default KanbanView;
