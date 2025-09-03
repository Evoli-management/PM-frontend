import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
    FaBullseye,
    FaPlus,
    FaSearch,
    FaFilter,
    FaListUl,
    FaThLarge,
    FaStream,
    FaSpinner,
    FaCheck,
    FaArrowUp,
    FaExclamationTriangle,
} from "react-icons/fa";

import Sidebar from "../shared/Sidebar";
import goalService from "../../services/goalService";
import milestoneService from "../../services/milestoneService";
import { getGoalStatistics, filterGoals, sortGoals } from "../../utils/goalUtils";

import GoalCard from "./GoalCard.jsx";
import GoalForm from "./GoalForm.jsx";
import GoalDetailsModal from "./GoalDetailsModal.jsx";
import StatCard from "./StatCard.jsx";
import ListView from "./views/ListView.jsx";
import KanbanView from "./views/KanbanView.jsx";
import TimelineView from "./views/TimelineView.jsx";

const GoalsTrackingPage = () => {
    const [goals, setGoals] = useState([]);
    const [view, setView] = useState("list");
    const [query, setQuery] = useState("");
    const [keyAreaFilter, setKeyAreaFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showForm, setShowForm] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [activeGoal, setActiveGoal] = useState(null);
    const [keyAreas, setKeyAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch goals from the API
    useEffect(() => {
        const fetchGoals = async () => {
            try {
                setLoading(true);
                const data = await goalService.getGoals({
                    includeKeyAreaName: true,
                    includeSubGoalCount: true,
                    includeMilestoneCount: true, // Add this new parameter
                });
                setGoals(data);
                setError(null);
            } catch (err) {
                console.error("Error fetching goals:", err);
                setError("Failed to load goals. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        const fetchKeyAreas = async () => {
            try {
                const data = await goalService.getKeyAreas();
                setKeyAreas(data);
            } catch (err) {
                console.error("Error fetching key areas:", err);
            }
        };

        fetchGoals();
        fetchKeyAreas();
    }, []);

    const allKeyAreas = useMemo(() => {
        const uniqueAreas = new Set();
        goals.forEach((goal) => {
            if (goal.keyAreaName) {
                uniqueAreas.add(goal.keyAreaName);
            }
        });
        return Array.from(uniqueAreas);
    }, [goals]);

    const filtered = useMemo(() => {
        return goals.filter((g) => {
            const matchesQuery = [g.title, g.description, g.keyAreaName]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query.toLowerCase());

            const matchesKeyArea = keyAreaFilter === "all" ? true : g.keyAreaName === keyAreaFilter;
            const matchesStatus = statusFilter === "all" ? true : g.status === statusFilter;

            return matchesQuery && matchesKeyArea && matchesStatus;
        });
    }, [goals, query, keyAreaFilter, statusFilter]);

    const stats = useMemo(() => getGoalStatistics(goals), [goals]);

    // Function to refresh goals data (useful for milestone updates)
    const refreshGoals = async () => {
        try {
            const data = await goalService.getGoals({
                includeKeyAreaName: true,
                includeSubGoalCount: true,
                includeMilestoneCount: true,
            });
            setGoals(data);
        } catch (err) {
            console.error("Error refreshing goals:", err);
        }
    };

    const upsertGoal = async (goalData) => {
        try {
            let savedGoal;

            if (editingGoal?.id) {
                savedGoal = await goalService.updateGoal(editingGoal.id, goalData);
            } else {
                // Create the goal (milestones are included in the create payload)
                savedGoal = await goalService.createGoal(goalData);
            }

            setGoals((prev) => {
                const exists = prev.some((g) => g.id === savedGoal.id);
                if (exists) {
                    return prev.map((g) =>
                        g.id === savedGoal.id
                            ? {
                                  ...savedGoal,
                                  milestoneCount: savedGoal.milestoneCount || 0,
                                  completedMilestoneCount: savedGoal.completedMilestoneCount || 0,
                              }
                            : g,
                    );
                }
                return [
                    {
                        ...savedGoal,
                        milestoneCount: savedGoal.milestoneCount || 0,
                        completedMilestoneCount: savedGoal.completedMilestoneCount || 0,
                    },
                    ...prev,
                ];
            });

            setShowForm(false);
            setEditingGoal(null);
        } catch (err) {
            console.error("Error saving goal:", err);
            throw err;
        }
    };

    const deleteGoal = async (goalToDelete) => {
        if (confirm(`Are you sure you want to delete "${goalToDelete.title}"?`)) {
            try {
                await goalService.deleteGoal(goalToDelete.id);
                setGoals((prev) => prev.filter((g) => g.id !== goalToDelete.id));
            } catch (err) {
                console.error("Error deleting goal:", err);
                alert(`Error deleting goal: ${err.response?.data?.message || err.message}`);
            }
        }
    };

    const openDetails = (g) => setActiveGoal(g);
    const closeDetails = () => setActiveGoal(null);

    const viewProps = {
        filtered,
        onOpen: openDetails,
        onEdit: (goal) => {
            setEditingGoal(goal);
            setShowForm(true);
        },
        onDelete: deleteGoal,
    };

    return (
        <div className="flex">
            <Sidebar />
            <main className="flex-1 p-4 lg:p-6 space-y-6">
                {/* Status messages for loading and errors */}
                {loading && (
                    <div className="flex justify-center items-center p-8">
                        <FaSpinner className="text-blue-600 animate-spin mr-2" />
                        <span>Loading goals...</span>
                    </div>
                )}

                {!loading && error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4">{error}</div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-blue-50 text-blue-700">
                            <FaBullseye className="text-xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900">Goals & Tracking</h1>
                            <p className="text-sm text-slate-700 mt-1">
                                Create and manage your goals, track progress, and achieve your objectives.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setEditingGoal(null);
                            setShowForm(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-3 font-bold shadow-lg hover:bg-blue-700 transition-colors"
                        disabled={loading}
                    >
                        <FaPlus /> New Goal
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard label="Total Goals" value={stats.totalGoals} icon={<FaBullseye />} />
                    <StatCard label="Active" value={stats.activeGoals} icon={<FaArrowUp />} />
                    <StatCard label="Completed" value={stats.completedGoals} tone="success" icon={<FaCheck />} />
                    <StatCard label="On Track (≥70%)" value={stats.onTrackGoals} tone="success" icon={<FaArrowUp />} />
                    <StatCard
                        label="At Risk (<50%)"
                        value={stats.atRiskGoals}
                        tone="danger"
                        icon={<FaExclamationTriangle />}
                    />
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl border shadow-sm p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center bg-slate-50 rounded-xl px-3 py-2 border">
                            <FaSearch className="text-slate-600 mr-2" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search goals..."
                                className="bg-transparent outline-none text-sm w-64"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <FaFilter className="text-slate-600" />
                            <select
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={keyAreaFilter}
                                onChange={(e) => setKeyAreaFilter(e.target.value)}
                            >
                                <option value="all">All Key Areas</option>
                                {allKeyAreas.map((area) => (
                                    <option key={area} value={area}>
                                        {area}
                                    </option>
                                ))}
                            </select>

                            <select
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="paused">Paused</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={() => setView("list")}
                                className={`rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                                    view === "list"
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "text-slate-700 border-slate-300 hover:bg-slate-50"
                                }`}
                                title="List view"
                            >
                                <FaListUl />
                            </button>
                            <button
                                onClick={() => setView("kanban")}
                                className={`rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                                    view === "kanban"
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "text-slate-700 border-slate-300 hover:bg-slate-50"
                                }`}
                                title="Kanban view"
                            >
                                <FaThLarge />
                            </button>
                            <button
                                onClick={() => setView("timeline")}
                                className={`rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                                    view === "timeline"
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "text-slate-700 border-slate-300 hover:bg-slate-50"
                                }`}
                                title="Timeline view"
                            >
                                <FaStream />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Views */}
                {!loading && (
                    <>
                        {view === "list" && <ListView {...viewProps} />}
                        {view === "kanban" && <KanbanView {...viewProps} />}
                        {view === "timeline" && <TimelineView {...viewProps} />}
                    </>
                )}

                {/* Goal Form Modal */}
                {showForm && (
                    <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowForm(false);
                                setEditingGoal(null);
                            }
                        }}
                    >
                        <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
                            <GoalForm
                                initial={editingGoal || {}}
                                onCancel={() => {
                                    setShowForm(false);
                                    setEditingGoal(null);
                                }}
                                onSave={upsertGoal}
                            />
                        </div>
                    </div>
                )}

                {/* Goal Details Modal */}
                {activeGoal && (
                    <GoalDetailsModal
                        goal={activeGoal}
                        onClose={closeDetails}
                        onEdit={(goal) => {
                            setEditingGoal(goal);
                            setShowForm(true);
                            closeDetails();
                        }}
                        onMilestoneUpdate={refreshGoals}
                    />
                )}
            </main>
        </div>
    );
};

export default GoalsTrackingPage;
