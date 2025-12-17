// src/pages/Goals.jsx
import React, { useState, useEffect, useCallback, Suspense } from "react";
import * as goalService from "../services/goalService";
import { useNavigate } from "react-router-dom";
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
    // Start false so the page opens silently; we still set it while fetching
    // but we won't show the loading spinner UI.
    const [isLoading, setIsLoading] = useState(false);
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
    const navigate = useNavigate();
    // route params handled by dedicated GoalDetail page; this list page only navigates to it

    const showToast = (type, message) => {
        setToast({ type, message });
    };

    const fetchGoals = useCallback(async (status = "all") => {
        try {
            setIsLoading(true);
            setError(null);
            let data;
            // Use the statically imported service to avoid dynamic import overhead on page load
            // Request milestones inline in the list so the page can render with
            // complete goal data in a single network round-trip. This avoids the
            // N+1 requests pattern and speeds up the full page load.
            data = await goalService.getFilteredGoals({ status, includeMilestones: true });
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
        // Fetch initial goals, and refetch when user changes the status filter so
        // archived (or other status-specific) views request the appropriate data from the backend.
        fetchGoals(statusFilter);

        // Listen for global milestone updates so the list can refresh automatically
        const onMilestoneUpdated = (e) => {
            try {
                // We could use e.detail.goalId to optimize, but reloading the list
                // is simpler and keeps local aggregates correct.
                fetchGoals(statusFilter);
            } catch (err) {
                console.error("Failed to refresh goals after milestone event:", err);
            }
        };
        window.addEventListener("milestone:updated", onMilestoneUpdated);

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

        return () => {
            window.removeEventListener("milestone:updated", onMilestoneUpdated);
        };
    }, [fetchGoals, statusFilter]);

    // Note: when user navigates to /goals/:goalId we rely on the dedicated GoalDetail page

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
            await goalService.createGoal(goalData);
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
            const updatedGoal = await goalService.updateGoal(goalId, updateData);

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
                            console.log("Attempting permanent delete for goal:", goalId);
                            // Prefer explicit hard delete when user requested permanent deletion
                            if (typeof goalService.deleteGoalHard === "function") {
                                await goalService.deleteGoalHard(goalId);
                            } else {
                                // Fallback to existing deleteGoal which may try archive first
                                await goalService.deleteGoal(goalId);
                            }

                            // Use functional updates to avoid stale-closure issues
                            setGoals((prev) => prev.filter((g) => g.id !== goalId));
                            setFilteredGoals((prev) => prev.filter((g) => g.id !== goalId));
                            showToast("success", "Goal has been permanently deleted.");
                        } catch (err) {
                            console.error("Failed to permanently delete goal, attempting archive fallback:", err);
                            try {
                                await goalService.archiveGoal(goalId);
                                setGoals((prev) => prev.filter((g) => g.id !== goalId));
                                setFilteredGoals((prev) => prev.filter((g) => g.id !== goalId));
                                showToast("success", "Goal has been archived.");
                            } catch (archiveError) {
                                console.error("Archive fallback also failed:", archiveError);
                                showToast("error", `Failed to delete goal: ${archiveError?.message || err?.message || 'Unknown error'}`);
                            }
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
        // Silent loading: do not render a blocking spinner. Return empty while
        // loading so the page doesn't flash a loader on open.
        if (isLoading) return null;

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
                        onGoalClick={handleOpenGoal}
                        onUpdate={handleUpdateGoal}
                        onDelete={handleDeleteGoal}
                    />
                );
            case "kanban":
                return (
                    <KanbanView
                        goals={filteredGoals}
                        onGoalClick={handleOpenGoal}
                        onUpdate={handleUpdateGoal}
                        onDelete={handleDeleteGoal}
                    />
                );
            case "timeline":
                return (
                    <TimelineView
                        goals={filteredGoals}
                        onGoalClick={handleOpenGoal}
                        onUpdate={handleUpdateGoal}
                        onDelete={handleDeleteGoal}
                    />
                );
            default:
                return (
                    <GoalList
                        goals={filteredGoals}
                        onGoalOpen={handleOpenGoal}
                        onGoalEdit={handleEditGoal}
                        onUpdate={handleUpdateGoal}
                        onDelete={handleDeleteGoal}
                    />
                );
        }
    };

    const handleEditGoal = (goal) => {
        // Open the modal in edit mode for the selected goal.
        // If the passed goal doesn't include milestones (list may be lightweight),
        // fetch the full goal before opening so the edit form has current milestone data.
        (async () => {
            try {
                if (!goal) return;
                if (!goal.milestones || goal.milestones.length === 0) {
                    const detailed = await goalService.getGoalById(goal.id);
                    // Merge shallow fields from the original goal with detailed milestone list
                    setSelectedGoal({ ...goal, ...detailed });
                } else {
                    setSelectedGoal(goal);
                }
            } catch (err) {
                console.warn('Failed to fetch full goal for edit modal, opening with provided data', err);
                setSelectedGoal(goal);
            }
        })();
    };

    const handleOpenGoal = (goal, mode) => {
        // If edit requested, open edit modal
        if (mode === "edit") {
            handleEditGoal(goal);
            return;
        }
        // Navigate to the goal detail route so it opens as a full page
        if (goal && goal.id) {
            // Prefetch and pass current goal in navigation state so detail page
            // can render instantly and avoid an extra network round-trip.
            try {
                if (typeof goalService.prefetchGoal === "function") {
                    goalService.prefetchGoal(goal.id).catch(() => {});
                }
            } catch (e) {
                // ignore
            }
            navigate(`/goals/${goal.id}`, { state: { goal } });
        } else {
            // nothing else to do - detail page will handle fetching
        }
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
                                    onClick={() => setMobileSidebarOpen(true)}
                                    className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                                    aria-label="Open sidebar"
                                >
                                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="px-1 md:px-2">
                            <div className="mb-4">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                        <div>
                                            <h1 className="text-2xl font-bold text-slate-900">Goals</h1>
                                            <p className="text-sm text-slate-600">Track and achieve your objectives</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                                                <button
                                                    onClick={() => setCurrentView("grid")}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${currentView === "grid" ? "bg-blue-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}
                                                    title="Grid"
                                                >
                                                    <span className="hidden sm:inline text-xs font-medium">Grid</span>
                                                </button>
                                                <button
                                                    onClick={() => setCurrentView("list")}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${currentView === "list" ? "bg-blue-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}
                                                    title="List"
                                                >
                                                    <span className="hidden sm:inline text-xs font-medium">List</span>
                                                </button>
                                                <button
                                                    onClick={() => setCurrentView("kanban")}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${currentView === "kanban" ? "bg-blue-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}
                                                    title="Kanban"
                                                >
                                                    <span className="hidden sm:inline text-xs font-medium">Kanban</span>
                                                </button>
                                                <button
                                                    onClick={() => setCurrentView("timeline")}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${currentView === "timeline" ? "bg-blue-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}
                                                    title="Timeline"
                                                >
                                                    <span className="hidden sm:inline text-xs font-medium">Timeline</span>
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => setIsModalOpen(true)}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                                            >
                                                <span className="text-sm font-semibold">New Goal</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Combined Stats and Filters in Single Row */}
                                    {/* Show stats & filters even when there are no goals for the selected filter
                                        so the user can change filters or create a new goal. */}
                                    {!isLoading && (
                                        <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm p-3">
                                            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                                                {/* Compact Stats */}
                                                <div className="flex gap-3">
                                                    <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                                        {/* Use provided goals image for Total stat */}
                                                        <img
                                                            alt="Goals"
                                                            src={`${import.meta.env.BASE_URL}goals.png`}
                                                            className="w-6 h-6 object-contain block w-6 h-6 min-w-[24px] min-h-[24px]"
                                                        />
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-sm font-bold text-gray-900">{stats.total}</span>
                                                            <span className="text-xs text-gray-500">Total</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                                                        {/* Small blue dot for Active */}
                                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
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

                            {/* Goal detail is a separate page at /goals/:goalId; it is not rendered inline in this list view. */}

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