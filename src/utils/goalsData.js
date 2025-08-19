// Shared goals data and utilities
export const mockGoals = [
    {
        id: 1,
        title: "Increase Revenue by 25%",
        description:
            "Specific: Increase company revenue. Measurable: 25% increase. Achievable: Based on market analysis. Relevant: Supports business growth. Time-bound: Complete by end of year.",
        type: "SMART Goal",
        priority: "high",
        status: "active",
        progress: 65,
        owner: "Sarah Johnson",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        milestones: [
            {
                id: 101,
                title: "Acquire 50 new enterprise clients",
                target: 50,
                current: 32,
                unit: "clients",
                progress: 64,
                type: "milestone",
            },
            {
                id: 102,
                title: "Increase average deal size to $15K",
                target: 15000,
                current: 12500,
                unit: "USD",
                progress: 83,
                type: "milestone",
            },
            {
                id: 103,
                title: "Achieve 95% customer retention rate",
                target: 95,
                current: 88,
                unit: "%",
                progress: 93,
                type: "milestone",
            },
        ],
        linkedTasks: 8,
        category: "Business Growth",
        tags: ["revenue", "sales", "growth"],
    },
    {
        id: 2,
        title: "Improve Product Quality",
        description:
            "Specific: Enhance product quality metrics. Measurable: Reduce bugs by 40%, achieve 4.5+ rating. Achievable: With current resources. Relevant: Improves customer satisfaction. Time-bound: 6 months.",
        type: "SMART Goal",
        priority: "medium",
        status: "active",
        progress: 42,
        owner: "Mike Chen",
        startDate: "2025-02-01",
        endDate: "2025-08-31",
        milestones: [
            {
                id: 201,
                title: "Reduce bug reports by 40%",
                target: 40,
                current: 25,
                unit: "%",
                progress: 63,
                type: "milestone",
            },
            {
                id: 202,
                title: "Achieve 4.5+ app store rating",
                target: 4.5,
                current: 4.2,
                unit: "stars",
                progress: 93,
                type: "milestone",
            },
        ],
        linkedTasks: 5,
        category: "Product Development",
        tags: ["quality", "bugs", "rating"],
    },
    {
        id: 3,
        title: "Team Development Initiative",
        description:
            "Specific: Build stronger development team. Measurable: Complete training, hire 3 developers. Achievable: Budget approved. Relevant: Supports company growth. Time-bound: 6 months.",
        type: "SMART Goal",
        priority: "medium",
        status: "completed",
        progress: 100,
        owner: "Lisa Wang",
        startDate: "2025-01-15",
        endDate: "2025-06-30",
        milestones: [
            {
                id: 301,
                title: "Complete team training program",
                target: 100,
                current: 100,
                unit: "%",
                progress: 100,
                type: "milestone",
            },
            {
                id: 302,
                title: "Hire 3 senior developers",
                target: 3,
                current: 3,
                unit: "hires",
                progress: 100,
                type: "milestone",
            },
        ],
        linkedTasks: 12,
        category: "Human Resources",
        tags: ["training", "hiring", "team"],
    },
    {
        id: 4,
        title: "Improve Team Communication",
        description:
            "Specific: Enhance internal communication. Measurable: Weekly meetings, deploy platform. Achievable: Resources available. Relevant: Improves team efficiency. Time-bound: 6 months.",
        type: "SMART Goal",
        priority: "medium",
        status: "active",
        progress: 75,
        owner: "Alex Rivera",
        startDate: "2025-03-01",
        endDate: "2025-09-30",
        milestones: [
            {
                id: 401,
                title: "Implement weekly team sync meetings",
                target: 100,
                current: 80,
                unit: "%",
                progress: 80,
                type: "milestone",
            },
            {
                id: 402,
                title: "Deploy team collaboration platform",
                target: 1,
                current: 1,
                unit: "platform",
                progress: 100,
                type: "milestone",
            },
        ],
        linkedTasks: 6,
        category: "Team Management",
        tags: ["communication", "collaboration", "meetings"],
    },
    {
        id: 5,
        title: "Enhance User Experience",
        description:
            "Specific: Improve user interface and performance. Measurable: Redesign UI, improve speed by 40%. Achievable: Design team ready. Relevant: Better user satisfaction. Time-bound: 8 months.",
        type: "SMART Goal",
        priority: "high",
        status: "active",
        progress: 58,
        owner: "Jordan Kim",
        startDate: "2025-02-15",
        endDate: "2025-10-31",
        milestones: [
            {
                id: 501,
                title: "Redesign main user interface",
                target: 100,
                current: 60,
                unit: "%",
                progress: 60,
                type: "milestone",
            },
            {
                id: 502,
                title: "Improve page load speeds by 40%",
                target: 40,
                current: 25,
                unit: "%",
                progress: 63,
                type: "milestone",
            },
        ],
        linkedTasks: 9,
        category: "User Experience",
        tags: ["ux", "design", "performance"],
    },
    {
        id: 6,
        title: "Complete Q4 Targets",
        description:
            "Specific: Achieve Q4 business targets. Measurable: $500K revenue, 95% features complete. Achievable: On track with current progress. Relevant: Critical for annual goals. Time-bound: Q4 2025.",
        type: "SMART Goal",
        priority: "high",
        status: "active",
        progress: 85,
        owner: "Taylor Brown",
        startDate: "2025-10-01",
        endDate: "2025-12-31",
        milestones: [
            {
                id: 601,
                title: "Meet revenue target of $500K",
                target: 500000,
                current: 425000,
                unit: "USD",
                progress: 85,
                type: "milestone",
            },
            {
                id: 602,
                title: "Complete 95% of planned features",
                target: 95,
                current: 85,
                unit: "%",
                progress: 89,
                type: "milestone",
            },
        ],
        linkedTasks: 15,
        category: "Business Goals",
        tags: ["quarterly", "targets", "revenue"],
    },
    {
        id: 7,
        title: "Reduce Technical Debt",
        description:
            "Specific: Improve codebase quality. Measurable: Refactor legacy code, increase test coverage to 85%. Achievable: Development team capacity available. Relevant: Better maintainability. Time-bound: 12 months.",
        type: "SMART Goal",
        priority: "medium",
        status: "active",
        progress: 45,
        owner: "Morgan Davis",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        milestones: [
            {
                id: 701,
                title: "Refactor legacy components",
                target: 100,
                current: 40,
                unit: "%",
                progress: 40,
                type: "milestone",
            },
            {
                id: 702,
                title: "Increase test coverage to 85%",
                target: 85,
                current: 65,
                unit: "%",
                progress: 76,
                type: "milestone",
            },
        ],
        linkedTasks: 8,
        category: "Technical Excellence",
        tags: ["technical-debt", "refactoring", "testing"],
    },
];

// Utility functions for goals
export const getActiveGoals = () => mockGoals.filter((goal) => goal.status === "active");
export const getGoalById = (id) => mockGoals.find((goal) => goal.id === id);
export const getGoalTitles = () => mockGoals.map((goal) => goal.title);
export const getGoalsByCategory = (category) => mockGoals.filter((goal) => goal.category === category);

// Goal progress calculation utilities
export const calculateOverallProgress = (goals) => {
    if (goals.length === 0) return 0;
    return Math.round(goals.reduce((acc, goal) => acc + goal.progress, 0) / goals.length);
};

export const getGoalStatistics = (goals) => {
    return {
        totalGoals: goals.length,
        activeGoals: goals.filter((g) => g.status === "active").length,
        completedGoals: goals.filter((g) => g.status === "completed").length,
        overallProgress: calculateOverallProgress(goals),
        onTrackGoals: goals.filter((g) => g.progress >= 70 && g.status === "active").length,
        atRiskGoals: goals.filter((g) => g.progress < 50 && g.status === "active").length,
    };
};

// Progress color helpers
export const getProgressColor = (progress) => {
    if (progress >= 80) return "text-green-600 bg-green-100";
    if (progress >= 60) return "text-blue-600 bg-blue-100";
    if (progress >= 40) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
};

export const getPriorityColor = (priority) => {
    switch (priority) {
        case "high":
            return "text-red-600 bg-red-100";
        case "medium":
            return "text-yellow-600 bg-yellow-100";
        case "low":
            return "text-green-600 bg-green-100";
        default:
            return "text-gray-600 bg-gray-100";
    }
};

export const getStatusColor = (status) => {
    switch (status) {
        case "active":
            return "text-blue-600 bg-blue-100";
        case "completed":
            return "text-green-600 bg-green-100";
        case "paused":
            return "text-yellow-600 bg-yellow-100";
        case "cancelled":
            return "text-red-600 bg-red-100";
        default:
            return "text-gray-600 bg-gray-100";
    }
};
