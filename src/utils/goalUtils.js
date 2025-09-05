// src/utils/goalUtils.js

/**
 * Calculate goal statistics from an array of goals
 */
export const getGoalStatistics = (goals) => {
    const totalGoals = goals.length;
    const activeGoals = goals.filter((g) => g.status === "active").length;
    const completedGoals = goals.filter((g) => g.status === "completed").length;
    const pausedGoals = goals.filter((g) => g.status === "paused").length;
    const cancelledGoals = goals.filter((g) => g.status === "cancelled").length;

    // On track = active goals with progress >= 70%
    const onTrackGoals = goals.filter((g) => g.status === "active" && (g.progressPercent || 0) >= 70).length;

    // At risk = active goals with progress < 50%
    const atRiskGoals = goals.filter((g) => g.status === "active" && (g.progressPercent || 0) < 50).length;

    return {
        totalGoals,
        activeGoals,
        completedGoals,
        pausedGoals,
        cancelledGoals,
        onTrackGoals,
        atRiskGoals,
    };
};

/**
 * Filter goals based on provided criteria
 */
export const filterGoals = (goals, filters = {}) => {
    return goals.filter((goal) => {
        // Search query filter
        if (filters.query) {
            const searchText = [goal.title, goal.description, goal.keyAreaName].filter(Boolean).join(" ").toLowerCase();
            if (!searchText.includes(filters.query.toLowerCase())) {
                return false;
            }
        }

        // Status filter
        if (filters.status && filters.status !== "all") {
            if (goal.status !== filters.status) {
                return false;
            }
        }

        // Key area filter
        if (filters.keyAreaId && filters.keyAreaId !== "all") {
            if (goal.keyAreaId !== filters.keyAreaId) {
                return false;
            }
        }

        // Key area name filter (for display purposes)
        if (filters.keyAreaName && filters.keyAreaName !== "all") {
            if (goal.keyAreaName !== filters.keyAreaName) {
                return false;
            }
        }

        // Parent goal filter
        if (filters.parentId !== undefined) {
            if (filters.parentId === "none" || filters.parentId === "0" || filters.parentId === "") {
                if (goal.parentGoalId !== null) {
                    return false;
                }
            } else if (goal.parentGoalId !== filters.parentId) {
                return false;
            }
        }

        return true;
    });
};

/**
 * Sort goals based on provided criteria
 */
export const sortGoals = (goals, sortBy = "createdAt", sortOrder = "desc") => {
    const sorted = [...goals].sort((a, b) => {
        let valueA, valueB;

        switch (sortBy) {
            case "title":
                valueA = a.title?.toLowerCase() || "";
                valueB = b.title?.toLowerCase() || "";
                break;
            case "dueDate":
                valueA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                valueB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                break;
            case "startDate":
                valueA = a.startDate ? new Date(a.startDate).getTime() : 0;
                valueB = b.startDate ? new Date(b.startDate).getTime() : 0;
                break;
            case "progressPercent":
                valueA = a.progressPercent || 0;
                valueB = b.progressPercent || 0;
                break;
            case "status":
                valueA = a.status || "";
                valueB = b.status || "";
                break;
            case "createdAt":
            default:
                valueA = new Date(a.createdAt).getTime();
                valueB = new Date(b.createdAt).getTime();
                break;
        }

        if (sortOrder === "asc") {
            return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        } else {
            return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        }
    });

    return sorted;
};

/**
 * Get CSS classes for goal status
 */
export const getStatusColor = (status) => {
    switch (status) {
        case "completed":
            return "bg-green-100 text-green-800 border-green-200";
        case "active":
            return "bg-blue-100 text-blue-800 border-blue-200";
        case "paused":
            return "bg-yellow-100 text-yellow-800 border-yellow-200";
        case "cancelled":
            return "bg-red-100 text-red-800 border-red-200";
        case "archived":
            return "bg-gray-100 text-gray-800 border-gray-200";
        default:
            return "bg-slate-100 text-slate-800 border-slate-200";
    }
};

/**
 * Get progress color based on percentage
 */
export const getProgressColor = (percent) => {
    if (percent >= 70) return "bg-green-500";
    if (percent >= 40) return "bg-yellow-500";
    return "bg-red-500";
};

/**
 * Calculate days until due date
 */
export const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

/**
 * Get due date status with styling
 */
export const getDueDateStatus = (dueDate) => {
    if (!dueDate) return null;

    const daysLeft = getDaysUntilDue(dueDate);

    if (daysLeft < 0) {
        return {
            text: `${Math.abs(daysLeft)} days overdue`,
            class: "text-red-600 bg-red-50 border-red-200",
        };
    }
    if (daysLeft === 0) {
        return {
            text: "Due today",
            class: "text-orange-600 bg-orange-50 border-orange-200",
        };
    }
    if (daysLeft <= 7) {
        return {
            text: `${daysLeft} days left`,
            class: "text-yellow-600 bg-yellow-50 border-yellow-200",
        };
    }

    return {
        text: `${daysLeft} days left`,
        class: "text-slate-600 bg-slate-50 border-slate-200",
    };
};

/**
 * Format goal for display
 */
export const formatGoalForDisplay = (goal) => {
    if (!goal) return null;

    // Ensure we have a goal object with standardized field names
    const standardizedGoal = {
        ...goal,
        // Standardize on progressPercent (the database field name)
        progressPercent: goal.progressPercent ?? goal.progressPercentage ?? 0,
        // Standardize on dueDate (the database field name)
        dueDate: goal.dueDate ?? goal.targetDate ?? null,
    };

    return {
        ...standardizedGoal,
        // Add computed properties
        dueDateStatus: getDueDateStatus(standardizedGoal.dueDate),
        statusColor: getStatusColor(standardizedGoal.status),
        progressColor: getProgressColor(standardizedGoal.progressPercent),
    };
};
