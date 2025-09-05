// src/pages/Goals.jsx
import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/shared/Sidebar";
import { getGoals, createGoal } from "../services/goalService";
import GoalsHeader from "../components/goals/GoalsHeader";
import GoalList from "../components/goals/GoalList";
import GoalForm from "../components/goals/GoalForm";
import { FaExclamationCircle, FaSearch, FaFilter, FaSortAmountDown } from "react-icons/fa";

const Goals = () => {
    const [goals, setGoals] = useState([]);
    const [filteredGoals, setFilteredGoals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("dueDate");

    const fetchGoals = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getGoals();
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
    }, [fetchGoals]);

    // Filter and sort goals based on current filters
    useEffect(() => {
        let filtered = [...goals];

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(
                (goal) =>
                    goal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (goal.description && goal.description.toLowerCase().includes(searchTerm.toLowerCase())),
            );
        }

        // Apply status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter((goal) => goal.status === statusFilter);
        }

        // Apply sorting
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
            await createGoal(goalData);
            await fetchGoals();
        } catch (error) {
            console.error("Failed to create goal from page:", error);
            throw error;
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
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-slate-600">Loading your goals...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-6 bg-red-50 border border-red-200 rounded-2xl">
                        <FaExclamationCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                        <h3 className="text-lg font-semibold text-red-900">Unable to Load Goals</h3>
                        <p className="mt-2 text-red-700">{error}</p>
                        <button
                            onClick={fetchGoals}
                            className="px-4 py-2 mt-4 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return <GoalList goals={filteredGoals} />;
    };

    const stats = getGoalStats();

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar />
            <div className="flex-1 p-4 md:p-8">
                {/* Header with Stats */}
                <div className="mb-8">
                    <GoalsHeader onAddGoal={() => setIsModalOpen(true)} />

                    {/* Stats Cards */}
                    {!isLoading && goals.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                                <div className="text-sm text-slate-600">Total Goals</div>
                            </div>
                            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
                                <div className="text-sm text-slate-600">Active</div>
                            </div>
                            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                                <div className="text-sm text-slate-600">Completed</div>
                            </div>
                            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                                <div className="text-sm text-slate-600">Overdue</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Filters and Search */}
                {!isLoading && goals.length > 0 && (
                    <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1 relative">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search goals by title or description..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="relative">
                                <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                            {/* Sort */}
                            <div className="relative">
                                <FaSortAmountDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                                >
                                    <option value="dueDate">Due Date</option>
                                    <option value="progress">Progress</option>
                                    <option value="title">Title</option>
                                    <option value="created">Recently Created</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <main>{renderContent()}</main>

                {/* Modal */}
                {isModalOpen && <GoalForm onClose={() => setIsModalOpen(false)} onGoalCreated={handleCreateGoal} />}
            </div>
        </div>
    );
};

export default Goals;
