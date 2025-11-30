// src/pages/Goals.jsx
import React, { useState, useEffect, useCallback, Suspense } from "react";
import Sidebar from "../components/shared/Sidebar";
import Toast from "../components/shared/Toast";
// goalService is dynamically imported where needed to allow code-splitting
import GoalsHeader from "../components/goals/GoalsHeader";
import GoalList from "../components/goals/GoalList";
const GoalForm = React.lazy(() => import("../components/goals/GoalForm"));
import KanbanView from "../components/goals/views/KanbanView";
import ListView from "../components/goals/views/ListView";
import TimelineView from "../components/goals/views/TimelineView";
import {
    FaExclamationCircle,
    FaSearch,
    FaFilter,
    FaSortAmountDown,
    FaRocket,
    FaBullseye,
    FaCheckCircle,
    FaClock,
    FaBars,
} from "react-icons/fa";
// keyAreaService helpers are imported on-demand to allow code-splitting

const Goals = () => {
    const [goals, setGoals] = useState([]);
    const [filteredGoals, setFilteredGoals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("dueDate");
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [keyAreas, setKeyAreas] = useState([]);
    const [toast, setToast] = useState(null);
    const [currentView, setCurrentView] = useState("grid");
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const showToast = (type, message) => {
        setToast({ type, message });
    };

    const fetchGoals = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const mod = await import("../services/goalService");
            const data = await mod.getGoals();
            setGoals(data);
            setFilteredGoals(data);
        } catch (err) {
            setError("Could not fetch goals. Please ensure the backend server is running.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGoals();
        (async () => {
            try {
                const mod = await import("../services/keyAreaService");
                const fn = mod.getKeyAreas || (mod.default && mod.default.getKeyAreas);
                if (fn) {
                    const list = await fn();
                    setKeyAreas(list);
                }
            } catch (e) {
                console.error(e);
            }
        })();
    }, [fetchGoals]);

    useEffect(() => {
        let filtered = [...goals];

        if (searchTerm) {
            filtered = filtered.filter(
                (goal) =>
                    goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (goal.description && goal.description.toLowerCase().includes(searchTerm.toLowerCase())),
            );
        }

        if (statusFilter !== "all") {
            filtered = filtered.filter((goal) => goal.status === statusFilter);
        }

        filtered.sort((a, b) => {
            switch (sortBy) {
                case "dueDate":
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case "progress":
                    return (b.progressPercent || 0) - (a.progressPercent || 0);
                case "title":
                    return a.title.localeCompare(b.title);
                case "created":
                    return new Date(b.createdAt) - new Date(a.createdAt);
                default:
                    return 0;
            }
        });

        setFilteredGoals(filtered);
    }, [goals, searchTerm, statusFilter, sortBy]);

    const handleCreateGoal = async (goalData) => {
        try {
            const mod = await import("../services/goalService");
            await mod.createGoal(goalData);
            await fetchGoals();
            showToast("success", "Goal created successfully!");
        } catch (error) {
            console.error("Failed to create goal from page:", error);
            showToast("error", "Failed to create goal. Please try again.");
            throw error;
        }
    };

    const handleUpdateGoal = async (goalId, updateData) => {
        try {
            console.log("Goals.jsx - Updating goal:", goalId, "with:", updateData);
            const mod = await import("../services/goalService");
            const updatedGoal = await mod.updateGoal(goalId, updateData);

            setGoals((prevGoals) => prevGoals.map((goal) => (goal.id === goalId ? { ...goal, ...updatedGoal } : goal)));

            setFilteredGoals((prevGoals) =>
                prevGoals.map((goal) => (goal.id === goalId ? { ...goal, ...updatedGoal } : goal)),
            );

            if (selectedGoal && selectedGoal.id === goalId) {
                setSelectedGoal({ ...selectedGoal, ...updatedGoal });
            }

            await fetchGoals();

            showToast("success", "Goal updated successfully!");
        } catch (error) {
            console.error("Failed to update goal:", error);
            showToast("error", `Failed to update goal: ${error.message}`);
            throw error;
        }
    };

    const handleDeleteGoal = async (goalId) => {
        if (window.confirm("Are you sure you want to delete this goal? This action cannot be undone.")) {
            try {
                console.log("Goals.jsx - Attempting to delete goal:", goalId);
                const mod = await import("../services/goalService");
                try {
                    console.log("Trying to archive goal first");
                    await mod.archiveGoal(goalId);
                    setGoals(goals.filter((g) => g.id !== goalId));
                    setFilteredGoals(filteredGoals.filter((g) => g.id !== goalId));
                    showToast("success", "Goal has been archived.");
                } catch (archiveError) {
                    console.log("Archive failed, trying hard delete");
                    await mod.deleteGoal(goalId);
                    setGoals(goals.filter((g) => g.id !== goalId));
                    setFilteredGoals(filteredGoals.filter((g) => g.id !== goalId));
                    showToast("success", "Goal has been permanently deleted.");
                }
            } catch (error) {
                console.error("Failed to delete goal:", error);
                showToast("error", `Failed to delete goal: ${error.message}`);
            }
        }
    };

    const getGoalStats = () => {
        const total = goals.length;
        const active = goals.filter((g) => g.status === "active").length;
        const completed = goals.filter((g) => g.status === "completed").length;
        const overdue = goals.filter((g) => {
            return g.status === "active" && new Date(g.dueDate) < new Date();
        }).length;

        return { total, active, completed, overdue };
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-3 text-slate-600 text-sm">Loading your goals...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl max-w-md">
                        <FaExclamationCircle className="w-10 h-10 mx-auto mb-3 text-red-500" />
                        <h3 className="text-base font-semibold text-red-900">Unable to Load Goals</h3>
                        <p className="mt-1 text-sm text-red-700">{error}</p>
                        <button
                            onClick={fetchGoals}
                            className="px-4 py-2 mt-3 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        switch (currentView) {
            case "list":
                return (
                    <ListView
                        goals={filteredGoals}
                        onGoalClick={handleGoalClick}
                        onUpdate={handleUpdateGoal}
                        onDelete={handleDeleteGoal}
                    />
                );
            case "kanban":
                return (
                    <KanbanView
                        goals={filteredGoals}
                        onGoalClick={handleGoalClick}
                        onUpdate={handleUpdateGoal}
                        onDelete={handleDeleteGoal}
                    />
                );
            case "timeline":
                return (
                    <TimelineView
                        goals={filteredGoals}
                        onGoalClick={handleGoalClick}
                        onUpdate={handleUpdateGoal}
                        onDelete={handleDeleteGoal}
                    />
                );
            default:
                return (
                    <GoalList
                        goals={filteredGoals}
                        onGoalClick={handleGoalClick}
                        onUpdate={handleUpdateGoal}
                        onDelete={handleDeleteGoal}
                    />
                );
        }
    };

    const handleGoalClick = (goal) => {
        // Always open in edit mode
        setSelectedGoal(goal);
    };

    const stats = getGoalStats();

    return (
        <div className="min-h-screen bg-[#EDEDED]">
            <div className="flex w-full min-h-screen">
                <Sidebar
                    mobileOpen={mobileSidebarOpen}
                    onMobileClose={() => setMobileSidebarOpen(false)}
                />

                {mobileSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-30 md:hidden"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                )}

                <main className="flex-1 min-w-0 w-full min-h-screen transition-all overflow-y-auto">
                    <div className="max-w-full overflow-x-hidden pb-1 min-h-full">
                        <div className="flex items-center justify-between gap-4 mb-0 p-0 pb-0">
                            <div className="flex items-center gap-4">
                                <button
                                    className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                                    onClick={() => setMobileSidebarOpen(true)}
                                    aria-label="Open sidebar"
                                >
                                    <FaBars />
                                </button>
                            </div>
                        </div>
                        <div className="px-1 md:px-2">
                            {/* Compact Header with Stats and Filters */}
                            <div className="mb-4">
                                <GoalsHeader
                                    onAddGoal={() => setIsModalOpen(true)}
                                    currentView={currentView}
                                    onViewChange={setCurrentView}
                                />

                                {/* Combined Stats and Filters in Single Row */}
                                {!isLoading && goals.length > 0 && (
                                    <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm p-3">
                                        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                                            {/* Compact Stats */}
                                            <div className="flex gap-3">
                                                <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                                    <FaBullseye className="w-3.5 h-3.5 text-gray-600" />
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-sm font-bold text-gray-900">{stats.total}</span>
                                                        <span className="text-xs text-gray-500">Total</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                                                    <FaRocket className="w-3.5 h-3.5 text-blue-600" />
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-sm font-bold text-blue-600">{stats.active}</span>
                                                        <span className="text-xs text-gray-500">Active</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                                                    <FaCheckCircle className="w-3.5 h-3.5 text-green-600" />
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-sm font-bold text-green-600">{stats.completed}</span>
                                                        <span className="text-xs text-gray-500">Done</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-3 py-2 bg-red-50 rounded-lg border border-red-200">
                                                    <FaClock className="w-3.5 h-3.5 text-red-600" />
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-sm font-bold text-red-600">{stats.overdue}</span>
                                                        <span className="text-xs text-gray-500">Overdue</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Filters */}
                                            <div className="flex flex-1 gap-2">
                                                <div className="flex-1 relative">
                                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search goals..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
                                                    />
                                                </div>

                                                <div className="relative">
                                                    <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                                                    <select
                                                        value={statusFilter}
                                                        onChange={(e) => setStatusFilter(e.target.value)}
                                                        className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-slate-50 focus:bg-white transition-colors min-w-[120px]"
                                                    >
                                                        <option value="all">All Status</option>
                                                        <option value="active">Active</option>
                                                        <option value="completed">Completed</option>
                                                        <option value="archived">Archived</option>
                                                    </select>
                                                </div>

                                                <div className="relative">
                                                    <FaSortAmountDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                                                    <select
                                                        value={sortBy}
                                                        onChange={(e) => setSortBy(e.target.value)}
                                                        className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-slate-50 focus:bg-white transition-colors min-w-[140px]"
                                                    >
                                                        <option value="dueDate">Due Date</option>
                                                        <option value="progress">Progress</option>
                                                        <option value="title">Title</option>
                                                        <option value="created">Recently Created</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Main Content */}
                            <div className="goals-content">{renderContent()}</div>

                            {/* Modal */}
                            {isModalOpen && (
                                <Suspense fallback={<div role="status" aria-live="polite" className="p-4">Loading…</div>}>
                                    <GoalForm
                                        onClose={() => setIsModalOpen(false)}
                                        onGoalCreated={handleCreateGoal}
                                        keyAreas={keyAreas}
                                    />
                                </Suspense>
                            )}
                            {selectedGoal && (
                                <Suspense fallback={<div role="status" aria-live="polite" className="p-4">Loading…</div>}>
                                    <GoalForm
                                        goal={selectedGoal}
                                        onClose={() => setSelectedGoal(null)}
                                        onGoalCreated={handleUpdateGoal.bind(null, selectedGoal.id)}
                                        keyAreas={keyAreas}
                                        isEditing={true}
                                    />
                                </Suspense>
                            )}

                            {/* Toast Notifications */}
                            {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Goals;