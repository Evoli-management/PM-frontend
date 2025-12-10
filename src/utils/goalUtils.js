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

/**
 * Calculate goal progress based on milestones
 */
export const calculateGoalProgress = (goal) => {
    if (!goal) return 0;

    const list = goal.milestones || [];
    if (!list || list.length === 0) return goal.progressPercent || 0;

    // Weighted calculation: use milestone.weight and milestone.score/done
    const totalWeight = list.reduce((s, m) => s + (parseFloat(m.weight) || 1), 0);
    if (totalWeight <= 0) return goal.progressPercent || 0;

    const weightedScoreSum = list.reduce((s, m) => {
        const weight = parseFloat(m.weight) || 1;
        let score = 0;
        if (m.done) score = 1;
        else if (m.score !== undefined && m.score !== null) {
            score = parseFloat(m.score) || 0;
        }
        return s + score * weight;
    }, 0);

    return Math.round((weightedScoreSum / totalWeight) * 100);
};

/**
 * Calculate time-based information for a goal
 */
export const calculateTimeInfo = (goal) => {
    const now = new Date();
    const dueDate = new Date(goal.dueDate);
    const startDate = goal.startDate ? new Date(goal.startDate) : null;

    const dueInDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    const isOverdue = dueDate < now;
    const totalDuration = startDate ? Math.ceil((dueDate - startDate) / (1000 * 60 * 60 * 24)) : null;
    const daysPassed = startDate ? Math.max(0, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24))) : null;
    const timeProgressPercent =
        totalDuration && daysPassed !== null ? Math.min(100, Math.round((daysPassed / totalDuration) * 100)) : null;

    return {
        dueInDays,
        isOverdue,
        totalDuration,
        daysPassed,
        timeProgressPercent,
        daysOverdue: isOverdue ? Math.abs(dueInDays) : 0,
    };
};

/**
 * Get status display information for a goal
 */
export const getGoalStatusDisplay = (goal) => {
    const timeInfo = calculateTimeInfo(goal);

    if (goal.status === "completed") {
        const completedDate = goal.completedAt ? new Date(goal.completedAt) : new Date(goal.dueDate);
        const dueDate = new Date(goal.dueDate);

        if (completedDate < dueDate) {
            const daysEarly = Math.ceil((dueDate - completedDate) / (1000 * 60 * 60 * 24));
            return {
                text: `Completed ${daysEarly} day${daysEarly === 1 ? "" : "s"} early`,
                color: "text-green-600",
                status: "early",
            };
        } else if (completedDate > dueDate) {
            const daysLate = Math.ceil((completedDate - dueDate) / (1000 * 60 * 60 * 24));
            return {
                text: `Completed ${daysLate} day${daysLate === 1 ? "" : "s"} late`,
                color: "text-orange-600",
                status: "late",
            };
        }
        return {
            text: "Completed on time",
            color: "text-green-600",
            status: "ontime",
        };
    }

    if (goal.status === "archived") {
        return {
            text: "Archived",
            color: "text-gray-600",
            status: "archived",
        };
    }

    // Active goals
    if (timeInfo.isOverdue) {
        return {
            text: `${timeInfo.daysOverdue} day${timeInfo.daysOverdue === 1 ? "" : "s"} overdue`,
            color: "text-red-600",
            status: "overdue",
        };
    } else if (timeInfo.dueInDays === 0) {
        return {
            text: "Due today",
            color: "text-red-600",
            status: "today",
        };
    } else if (timeInfo.dueInDays === 1) {
        return {
            text: "Due tomorrow",
            color: "text-amber-600",
            status: "tomorrow",
        };
    } else if (timeInfo.dueInDays <= 7) {
        return {
            text: `${timeInfo.dueInDays} days left`,
            color: "text-amber-600",
            status: "urgent",
        };
    } else {
        return {
            text: `${timeInfo.dueInDays} days left`,
            color: "text-gray-600",
            status: "normal",
        };
    }
};

/**
 * Calculate comprehensive goal statistics
 */
export const calculateGoalStats = (goals) => {
    if (!goals || goals.length === 0) {
        return {
            total: 0,
            active: 0,
            completed: 0,
            archived: 0,
            overdue: 0,
            completedOnTime: 0,
            completedLate: 0,
            completedEarly: 0,
            avgProgress: 0,
            avgTimeProgress: 0,
        };
    }

    const stats = {
        total: goals.length,
        active: 0,
        completed: 0,
        archived: 0,
        overdue: 0,
        completedOnTime: 0,
        completedLate: 0,
        completedEarly: 0,
        totalProgress: 0,
        totalTimeProgress: 0,
        timeProgressCount: 0,
    };

    goals.forEach((goal) => {
        // Status counts
        if (goal.status === "active") stats.active++;
        else if (goal.status === "completed") stats.completed++;
        else if (goal.status === "archived") stats.archived++;

        // Progress calculation
        const progress = calculateGoalProgress(goal);
        stats.totalProgress += progress;

        // Time progress calculation
        const timeInfo = calculateTimeInfo(goal);
        if (timeInfo.timeProgressPercent !== null) {
            stats.totalTimeProgress += timeInfo.timeProgressPercent;
            stats.timeProgressCount++;
        }

        // Overdue check for active goals
        if (goal.status === "active" && timeInfo.isOverdue) {
            stats.overdue++;
        }

        // Completion timing for completed goals
        if (goal.status === "completed") {
            const statusDisplay = getGoalStatusDisplay(goal);
            if (statusDisplay.status === "early") stats.completedEarly++;
            else if (statusDisplay.status === "late") stats.completedLate++;
            else if (statusDisplay.status === "ontime") stats.completedOnTime++;
        }
    });

    // Calculate averages
    stats.avgProgress = Math.round(stats.totalProgress / goals.length);
    stats.avgTimeProgress =
        stats.timeProgressCount > 0 ? Math.round(stats.totalTimeProgress / stats.timeProgressCount) : 0;

    // Clean up intermediate values
    delete stats.totalProgress;
    delete stats.totalTimeProgress;
    delete stats.timeProgressCount;

    return stats;
};

/**
 * Get progress bar color based on progress and status
 */
export const getProgressBarColor = (goal, progressPercent) => {
    if (goal.status === "completed") return "bg-green-500";
    if (goal.status === "archived") return "bg-gray-400";

    if (progressPercent >= 80) return "bg-emerald-500";
    if (progressPercent >= 60) return "bg-blue-500";
    if (progressPercent >= 40) return "bg-amber-500";
    return "bg-gray-400";
};

/**
 * Format date for display
 */
export const formatGoalDate = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

    return date.toLocaleDateString();
};
