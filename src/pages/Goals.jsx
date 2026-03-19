// src/pages/Goals.jsx
import React, { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as goalService from "../services/goalService";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import Toast from "../components/shared/Toast";
// goalService is dynamically imported where needed to allow code-splitting
import GoalList from "../components/goals/GoalList";
import QuickGoalsPanel from "../components/goals/QuickGoalsPanel";
import GoalReport from "../components/goals/GoalReport";
const GoalForm = React.lazy(() => import("../components/goals/GoalForm"));
import KanbanView from "../components/goals/views/KanbanView";
import ListView from "../components/goals/views/ListView";
import TimelineView from "../components/goals/views/TimelineView";
import {
    FaExclamationCircle,
    FaFilter,
    FaSortAmountDown,
    FaRocket,
    FaBullseye,
    FaCheckCircle,
    FaClock,
    FaBars,
    FaChevronDown,
} from "react-icons/fa";
// keyAreaService helpers are imported on-demand to allow code-splitting

const Goals = () => {
    const { t } = useTranslation();
    const [goals, setGoals] = useState([]);
    const [filteredGoals, setFilteredGoals] = useState([]);
    // Start false so the page opens silently; we still set it while fetching
    // but we won't show the loading spinner UI.
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState(() => {
        return localStorage.getItem("goals-status-filter") || "all";
    });
    const [sortBy, setSortBy] = useState(() => {
        return localStorage.getItem("goals-sort-by") || "dueDate";
    });
    const [tagFilter, setTagFilter] = useState(() => {
        return localStorage.getItem("goals-tag-filter") || "";
    });
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [keyAreas, setKeyAreas] = useState([]);
    const [toast, setToast] = useState(null);
    const [currentView, setCurrentView] = useState("grid");
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [selectedGoals, setSelectedGoals] = useState(new Set());
    const [quickPanelOpen, setQuickPanelOpen] = useState(false);
    const [showViewMenu, setShowViewMenu] = useState(false);
    const viewMenuRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    // Detect active goals tab from URL
    const goalsTab = new URLSearchParams(location.search || '').get('tab') || 'goals';

    // Persist filter settings to localStorage
    useEffect(() => {
        localStorage.setItem("goals-status-filter", statusFilter);
    }, [statusFilter]);

    useEffect(() => {
        localStorage.setItem("goals-sort-by", sortBy);
    }, [sortBy]);

    useEffect(() => {
        localStorage.setItem("goals-tag-filter", tagFilter);
    }, [tagFilter]);

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
            setError(t('goals.fetchError'));
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

    // Listen for Quick Goals event from Navbar
    useEffect(() => {
        const handler = (e) => {
            if (e?.detail?.open) setQuickPanelOpen(true);
        };
        window.addEventListener('pm-goals-quick-panel', handler);
        return () => window.removeEventListener('pm-goals-quick-panel', handler);
    }, []);

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

        if (tagFilter) {
            filtered = filtered.filter((goal) =>
                Array.isArray(goal.tags) && goal.tags.some((tag) =>
                    tag.toLowerCase().includes(tagFilter.toLowerCase())
                )
            );
        }

        filtered.sort((a, b) => {
            switch (sortBy) {
                case "dueDate":
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case "progress":
                    return (b.progressPercent || 0) - (a.progressPercent || 0);
                case "title":
                    return a.title.localeCompare(b.title);
                case "priority":
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
                case "created":
                    return new Date(b.createdAt) - new Date(a.createdAt);
                default:
                    return 0;
            }
        });

        setFilteredGoals(filtered);
    }, [goals, searchTerm, statusFilter, sortBy, tagFilter]);

    useEffect(() => {
        if (!showViewMenu) return undefined;

        const handleMouseDown = (event) => {
            if (viewMenuRef.current && !viewMenuRef.current.contains(event.target)) {
                setShowViewMenu(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setShowViewMenu(false);
            }
        };

        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [showViewMenu]);

    const handleCreateGoal = async (goalData) => {
        try {
            await goalService.createGoal(goalData);
            await fetchGoals();
            showToast("success", t('goals.toast.created'));
        } catch (error) {
            console.error("Failed to create goal from page:", error);
            showToast("error", t('goals.toast.createFailed'));
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

            showToast("success", t('goals.toast.updated'));
        } catch (error) {
            console.error("Failed to update goal:", error);
            showToast("error", `${t('goals.toast.updateFailed')}: ${error.message}`);
            throw error;
        }
    };

    const handleDeleteGoal = async (goalId) => {
        if (window.confirm(t('goals.confirm.deleteGoal'))) {
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
                    showToast("success", t('goals.toast.deleted'));
                } catch (err) {
                    console.error("Failed to permanently delete goal, attempting archive fallback:", err);
                    try {
                        await goalService.archiveGoal(goalId);
                        setGoals((prev) => prev.filter((g) => g.id !== goalId));
                        setFilteredGoals((prev) => prev.filter((g) => g.id !== goalId));
                        showToast("success", t('goals.toast.archived'));
                    } catch (archiveError) {
                        console.error("Archive fallback also failed:", archiveError);
                        showToast("error", `${t('goals.toast.deleteFailed')}: ${archiveError?.message || err?.message || 'Unknown error'}`);
                    }
                }
            } catch (error) {
                console.error("Failed to delete goal:", error);
                showToast("error", `${t('goals.toast.deleteFailed')}: ${error.message}`);
            }
        }
    };

    const handleBulkAction = async (action) => {
        const selectedIds = Array.from(selectedGoals);
        if (selectedIds.length === 0) {
            showToast("error", t('goals.toast.noneSelected'));
            return;
        }

        try {
            let updates = {};
            let confirmMessage = "";

            switch (action) {
                case "complete":
                    updates = { status: "completed" };
                    confirmMessage = t('goals.confirm.markComplete', { count: selectedIds.length });
                    break;
                case "archive":
                    updates = { status: "archived" };
                    confirmMessage = t('goals.confirm.archive', { count: selectedIds.length });
                    break;
                case "activate":
                    updates = { status: "active" };
                    confirmMessage = t('goals.confirm.activate', { count: selectedIds.length });
                    break;
                case "delete":
                    confirmMessage = t('goals.confirm.delete', { count: selectedIds.length });
                    if (window.confirm(confirmMessage)) {
                        await Promise.all(selectedIds.map((id) => goalService.deleteGoal(id)));
                        setGoals((prev) => prev.filter((g) => !selectedIds.includes(g.id)));
                        setFilteredGoals((prev) => prev.filter((g) => !selectedIds.includes(g.id)));
                        setSelectedGoals(new Set());
                        showToast("success", t('goals.toast.bulkDeleted', { count: selectedIds.length }));
                    }
                    return;
                default:
                    return;
            }

            if (confirmMessage && !window.confirm(confirmMessage)) {
                return;
            }

            await goalService.bulkUpdateGoals(selectedIds, updates);
            await fetchGoals(statusFilter);
            setSelectedGoals(new Set());
            showToast("success", t('goals.toast.bulkUpdated', { count: selectedIds.length }));
        } catch (error) {
            console.error("Bulk action failed:", error);
            showToast("error", `${t('goals.toast.bulkFailed')}: ${error.message}`);
        }
    };

    const handleToggleSelection = (goalId) => {
        setSelectedGoals((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(goalId)) {
                newSet.delete(goalId);
            } else {
                newSet.add(goalId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedGoals.size === filteredGoals.length) {
            setSelectedGoals(new Set());
        } else {
            setSelectedGoals(new Set(filteredGoals.map((g) => g.id)));
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
                        <h3 className="text-base font-semibold text-red-900">{t('goals.unableToLoad')}</h3>
                        <p className="mt-1 text-sm text-red-700">{error}</p>
                        <button
                            onClick={fetchGoals}
                            className="px-4 py-2 mt-3 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            {t('goals.tryAgain')}
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
                        selectedGoals={selectedGoals}
                        onToggleSelection={handleToggleSelection}
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
                        selectedGoals={selectedGoals}
                        onToggleSelection={handleToggleSelection}
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
                    goalService.prefetchGoal(goal.id).catch(() => { });
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
    const goalViewOptions = [
        { id: "grid", label: t("goals.grid") },
        { id: "list", label: t("goals.list") },
        { id: "kanban", label: t("goals.kanban") },
    ];
    const activeGoalViewLabel =
        goalViewOptions.find((view) => view.id === currentView)?.label || t("goals.grid");

    return (
        <div className="h-[calc(100vh-72px)] bg-[#EDEDED] overflow-hidden">
            <div className="flex w-full h-full min-h-0">
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

                <main className="flex-1 min-w-0 w-full h-full min-h-0 transition-all overflow-hidden">
                    <div className="max-w-full overflow-x-hidden pb-1 h-full min-h-0 flex flex-col">
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

                        <div className="px-1 md:px-2 flex-1 min-h-0 flex flex-col">
                            <div className="mb-4 shrink-0">
                                <div className="flex flex-wrap items-center gap-2 w-full">
                                    <div>
                                        <h1 className="text-2xl font-bold text-slate-900">{t('goals.title')}</h1>
                                    </div>

                                    <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                                        {!isLoading && (
                                            <>
                                                <div className="flex flex-wrap gap-3">
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-200">
                                                        <img
                                                            alt="Goals"
                                                            src={`${import.meta.env.BASE_URL}goals.png`}
                                                            className="w-6 h-6 object-contain block w-6 h-6 min-w-[24px] min-h-[24px]"
                                                        />
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-sm font-bold text-gray-900">{stats.total}</span>
                                                            <span className="text-xs text-gray-500">{t('goals.total')}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg border border-blue-200">
                                                        <FaClock className="w-3.5 h-3.5 text-blue-600" />
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-sm font-bold text-blue-600">{stats.active}</span>
                                                            <span className="text-xs text-gray-500">{t('goals.active')}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 rounded-lg border border-green-200">
                                                        <FaCheckCircle className="w-3.5 h-3.5 text-green-600" />
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-sm font-bold text-green-600">{stats.completed}</span>
                                                            <span className="text-xs text-gray-500">{t('goals.done')}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 rounded-lg border border-red-200">
                                                        <FaClock className="w-3.5 h-3.5 text-red-600" />
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-sm font-bold text-red-600">{stats.overdue}</span>
                                                            <span className="text-xs text-gray-500">{t('goals.overdue')}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="relative">
                                                        <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                                                        <select
                                                            value={statusFilter}
                                                            onChange={(e) => setStatusFilter(e.target.value)}
                                                            className="pl-9 pr-8 py-1 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white transition-colors min-w-[120px]"
                                                        >
                                                            <option value="all">{t('goals.allStatus')}</option>
                                                            <option value="active">{t('goals.active')}</option>
                                                            <option value="completed">{t('goals.completed')}</option>
                                                            <option value="archived">{t('goals.archived')}</option>
                                                        </select>
                                                    </div>

                                                    <input
                                                        type="text"
                                                        placeholder={t('goals.filterByTag')}
                                                        value={tagFilter}
                                                        onChange={(e) => setTagFilter(e.target.value)}
                                                        className="px-3 py-1 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors min-w-[120px]"
                                                    />

                                                    <div className="relative">
                                                        <FaSortAmountDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                                                        <select
                                                            value={sortBy}
                                                            onChange={(e) => setSortBy(e.target.value)}
                                                            className="pl-9 pr-8 py-1 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white transition-colors min-w-[140px]"
                                                        >
                                                            <option value="dueDate">{t('goals.dueDate')}</option>
                                                            <option value="priority">{t('goals.priority')}</option>
                                                            <option value="progress">{t('goals.progress')}</option>
                                                            <option value="title">{t('goals.titleSort')}</option>
                                                            <option value="created">{t('goals.recentlyCreated')}</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <div className="relative" ref={viewMenuRef}>
                                            <button
                                                type="button"
                                                className="day-header-btn px-2 py-0 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center gap-2 focus:outline-none focus:ring-0 focus:border-slate-300"
                                                style={{ minWidth: 32, minHeight: 30, outline: "none", boxShadow: "none" }}
                                                onClick={() => setShowViewMenu((open) => !open)}
                                                aria-haspopup="menu"
                                                aria-expanded={showViewMenu ? "true" : "false"}
                                            >
                                                <span>{t("goals.view")}</span>
                                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                                    {activeGoalViewLabel}
                                                </span>
                                                <FaChevronDown className={`${showViewMenu ? "rotate-180" : "rotate-0"} transition-transform`} />
                                            </button>
                                            {showViewMenu && (
                                                <div
                                                    role="menu"
                                                    className="absolute right-0 z-50 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
                                                >
                                                    {goalViewOptions.map((view) => (
                                                        <button
                                                            key={view.id}
                                                            type="button"
                                                            role="menuitemradio"
                                                            aria-checked={currentView === view.id}
                                                            className={`w-full text-left px-3 py-2 text-sm ${
                                                                currentView === view.id
                                                                    ? "bg-blue-50 text-blue-700 font-semibold"
                                                                    : "text-slate-700 hover:bg-slate-50"
                                                            }`}
                                                            onClick={() => {
                                                                setCurrentView(view.id);
                                                                setShowViewMenu(false);
                                                            }}
                                                        >
                                                            {view.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => setIsModalOpen(true)}
                                            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md min-h-[30px]"
                                        >
                                            <span className="text-sm font-semibold">{t('goals.newGoal')}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content */}
                            {/* Bulk Action Bar */}
                            {selectedGoals.size > 0 && (
                                <div className="mb-4 shrink-0 bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                                                <span className="text-sm font-bold text-blue-600">{selectedGoals.size}</span>
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">
                                                {t('goals.goalsSelected', { count: selectedGoals.size })}
                                            </span>
                                            <button
                                                onClick={handleSelectAll}
                                                className="ml-2 text-sm text-blue-600 hover:text-blue-700 font-medium underline"
                                            >
                                                {selectedGoals.size === filteredGoals.length ? t('goals.deselectAll') : t('goals.selectAll')}
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => handleBulkAction("complete")}
                                                className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                                            >
                                                {t('goals.markComplete')}
                                            </button>
                                            <button
                                                onClick={() => handleBulkAction("activate")}
                                                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                            >
                                                {t('goals.activate')}
                                            </button>
                                            <button
                                                onClick={() => handleBulkAction("archive")}
                                                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                                            >
                                                {t('goals.archive')}
                                            </button>
                                            <button
                                                onClick={() => handleBulkAction("delete")}
                                                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                                            >
                                                {t('goals.delete')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Main content area: switch between Goals list and Report tab */}
                            <div className="flex-1 min-h-0 overflow-hidden">
                                {goalsTab === 'report' ? (
                                    <div className="h-full overflow-y-auto hover-scrollbar-y pr-1">
                                        <GoalReport />
                                    </div>
                                ) : (
                                    <div className="goals-content h-full overflow-y-auto hover-scrollbar-y pr-1">
                                        {renderContent()}
                                    </div>
                                )}
                            </div>

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

                            {/* Quick Goals hierarchy panel — opened by Navbar QUICK GOALS tab */}
                            {quickPanelOpen && (
                                <QuickGoalsPanel
                                    goals={goals}
                                    onClose={() => setQuickPanelOpen(false)}
                                />
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
