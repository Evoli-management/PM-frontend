// src/components/goals/utils.js

/**
 * Calculate goal statistics from goals array
 */
export const getGoalStatistics = (goals) => {
    const totalGoals = goals.length;
    const activeGoals = goals.filter((g) => g.status === "active").length;
    const completedGoals = goals.filter((g) => g.status === "completed").length;
    const onTrackGoals = goals.filter((g) => g.progressPercentage >= 70).length;
    const atRiskGoals = goals.filter((g) => g.progressPercentage < 50 && g.status === "active").length;

    return { totalGoals, activeGoals, completedGoals, onTrackGoals, atRiskGoals };
};

/**
 * Get progress color based on progress percentage
 */
export const getProgressColor = (progress) => {
    if (progress >= 80) return "bg-green-50 text-green-700 border-green-200";
    if (progress >= 60) return "bg-blue-50 text-blue-700 border-blue-200";
    if (progress >= 40) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-red-50 text-red-700 border-red-200";
};

/**
 * Get priority color based on priority level
 */
export const getPriorityColor = (priority) => {
    switch (priority) {
        case "high":
            return "bg-red-50 text-red-700 border-red-200";
        case "medium":
            return "bg-yellow-50 text-yellow-700 border-yellow-200";
        case "low":
            return "bg-green-50 text-green-700 border-green-200";
        default:
            return "bg-gray-50 text-gray-700 border-gray-200";
    }
};

/**
 * Get status color based on status
 */
export const getStatusColor = (status) => {
    switch (status) {
        case "active":
            return "bg-blue-50 text-blue-700 border-blue-200";
        case "completed":
            return "bg-green-50 text-green-700 border-green-200";
        case "paused":
            return "bg-yellow-50 text-yellow-700 border-yellow-200";
        case "cancelled":
            return "bg-gray-50 text-gray-700 border-gray-200";
        default:
            return "bg-gray-50 text-gray-700 border-gray-200";
    }
};

/**
 * Check if a goal is overdue
 */
export const isGoalOverdue = (goal) => {
    const date = goal.dueDate || goal.targetDate;
    return date && new Date(date) < new Date() && goal.status === "active";
};

/**
 * Calculate days until due date
 */
export const getDaysUntilDue = (date) => {
    if (!date) return null;
    return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
};

/**
 * Format date for display
 */
export const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
};

/**
 * Validate goal form data
 */
export const validateGoalData = (goalData) => {
    const errors = [];

    if (!goalData.title?.trim()) {
        errors.push("Title is required");
    }

    if (goalData.startDate && goalData.targetDate && new Date(goalData.startDate) >= new Date(goalData.targetDate)) {
        errors.push("Start date must be before target date");
    }

    return errors;
};

/**
 * Filter goals based on search criteria
 */
export const filterGoals = (goals, { query = "", keyAreaFilter = "all", statusFilter = "all" }) => {
    return goals.filter((goal) => {
        const matchesQuery = [goal.title, goal.description, goal.keyAreaName]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase());

        const matchesKeyArea = keyAreaFilter === "all" ? true : goal.keyAreaName === keyAreaFilter;
        const matchesStatus = statusFilter === "all" ? true : goal.status === statusFilter;

        return matchesQuery && matchesKeyArea && matchesStatus;
    });
};

/**
 * Sort goals by different criteria
 */
export const sortGoals = (goals, sortBy = "created") => {
    switch (sortBy) {
        case "title":
            return [...goals].sort((a, b) => a.title.localeCompare(b.title));
        case "progress":
            return [...goals].sort((a, b) => (b.progressPercentage || 0) - (a.progressPercentage || 0));
        case "dueDate":
            return [...goals].sort((a, b) => {
                const ad = a.dueDate || a.targetDate;
                const bd = b.dueDate || b.targetDate;
                if (!ad && !bd) return 0;
                if (!ad) return 1;
                if (!bd) return -1;
                return new Date(ad) - new Date(bd);
            });
        case "created":
        default:
            return [...goals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
};
