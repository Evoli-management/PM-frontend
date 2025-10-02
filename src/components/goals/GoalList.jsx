// src/components/goals/GoalList.jsx
import React from "react";
import GoalCard from "./GoalCard";
import EmptyState from "./EmptyState";

const GoalList = ({ goals, onGoalClick, onUpdate, onDelete }) => {
    if (!goals || goals.length === 0) {
        return <EmptyState onCreateClick={() => {}} />;
    }

    const handleComplete = async (goalId) => {
        try {
            // Use the dedicated complete endpoint instead of update
            console.log("GoalList - Attempting to complete goal:", goalId);
            const { completeGoal } = await import("../../services/goalService");
            await completeGoal(goalId);

            // Force a page refresh to get updated data
            window.location.reload();
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

    return (
        <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {goals.map((goal) => (
                <GoalCard
                    key={goal.id}
                    goal={goal}
                    onOpen={onGoalClick}
                    onEdit={onGoalClick} // This will pass the edit mode
                    onComplete={handleComplete}
                    onArchive={handleArchive}
                    onToggleVisibility={handleToggleVisibility}
                    onDelete={handleDelete}
                />
            ))}
        </div>
    );
};

export default GoalList;
