// src/components/goals/GoalList.jsx
import React from "react";
import GoalCard from "./GoalCard";
import EmptyState from "./EmptyState";

const GoalList = ({ goals, onGoalOpen, onGoalEdit, onUpdate, onDelete, selectedGoals = new Set(), onToggleSelection }) => {
    if (!goals || goals.length === 0) {
        return <EmptyState onCreateClick={() => { }} />;
    }

    const handleComplete = async (goalId) => {
        try {
            // Prefer updating via parent handler so UI updates in-place
            if (onUpdate) {
                await onUpdate(goalId, { status: "completed" });
            } else {
                // Fallback to service call if parent handler not provided
                const { completeGoal } = await import("../../services/goalService");
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

    return (
        <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {goals.map((goal) => (
                <GoalCard
                    key={goal.id}
                    goal={goal}
                    onOpen={onGoalOpen}
                    onEdit={onGoalEdit}
                    onComplete={handleComplete}
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                    onToggleVisibility={handleToggleVisibility}
                    onDelete={handleDelete}
                    isSelected={selectedGoals.has(goal.id)}
                    onToggleSelection={onToggleSelection}
                />
            ))}
        </div>
    );
};

export default GoalList;
