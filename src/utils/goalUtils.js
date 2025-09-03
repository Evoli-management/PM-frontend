// src/utils/goalUtils.js

export const getGoalStatistics = (goals) => {
    const totalGoals = goals.length;
    const activeGoals = goals.filter((g) => g.status === "active").length;
    const completedGoals = goals.filter((g) => g.status === "completed").length;
    const onTrackGoals = goals.filter((g) => g.progressPercentage >= 70).length;
    const atRiskGoals = goals.filter((g) => g.progressPercentage < 50 && g.status === "active").length;

    return { totalGoals, activeGoals, completedGoals, onTrackGoals, atRiskGoals };
};

export const getProgressColor = (progress) => {
    if (progress >= 80) return "bg-green-50 text-green-700 border-green-200";
    if (progress >= 60) return "bg-blue-50 text-blue-700 border-blue-200";
    if (progress >= 40) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-red-50 text-red-700 border-red-200";
};

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

export const getStatusColor = (status) => {
    switch (status) {
        case "active":
            return "bg-blue-50 text-blue-700 border-blue-200";
        case "completed":
            return "bg-green-50 text-green-700 border-green-200";
        case "paused":
            return "bg-yellow-50 text-yellow-700 border-yellow-200";
        case "cancelled":
            return "bg-red-50 text-red-700 border-red-200";
        default:
            return "bg-gray-50 text-gray-700 border-gray-200";
    }
};

export const isGoalOverdue = (goal) => {
    const date = goal.dueDate || goal.targetDate;
    return date && new Date(date) < new Date() && goal.status === "active";
};

export const getDaysUntilDue = (date) => {
    const d = date;
    if (!d) return null;
    return Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
};

export const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
};

export const getProgressBarColor = (value) => {
    if (value >= 80) return "bg-green-600";
    if (value >= 60) return "bg-blue-600";
    if (value >= 40) return "bg-yellow-600";
    return "bg-red-600";
};

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

export const sortGoals = (goals, sortBy = "created") => {
    switch (sortBy) {
        case "title":
            return [...goals].sort((a, b) => a.title.localeCompare(b.title));
        case "progress":
            return [...goals].sort((a, b) => (b.progressPercentage || 0) - (a.progressPercentage || 0));
        case "dueDate":
            // Note: backend uses `dueDate`; some components still use `targetDate` field name.
            return [...goals].sort((a, b) => {
                const aDate = a.dueDate || a.targetDate;
                const bDate = b.dueDate || b.targetDate;
                if (!aDate && !bDate) return 0;
                if (!aDate) return 1;
                if (!bDate) return -1;
                return new Date(aDate) - new Date(bDate);
            });
        case "created":
        default:
            return [...goals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
};
