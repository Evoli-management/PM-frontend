// src/pages/Goals.jsx
import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/shared/Sidebar";
import Toast from "../components/shared/Toast";
import { getGoals, createGoal, updateGoal, deleteGoal, completeGoal, archiveGoal } from "../services/goalService";
import GoalsHeader from "../components/goals/GoalsHeader";
import GoalList from "../components/goals/GoalList";
import GoalForm from "../components/goals/GoalForm";
import GoalDetailModal from "../components/goals/GoalDetailModal";
import KanbanView from "../components/goals/views/KanbanView";
import ListView from "../components/goals/views/ListView";
import TimelineView from "../components/goals/views/TimelineView";
import { FaExclamationCircle, FaSearch, FaFilter, FaSortAmountDown, FaRocket, FaBullseye, FaCheckCircle, FaClock } from "react-icons/fa";
import { getKeyAreas } from "../services/keyAreaService";

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
    const [currentView, setCurrentView] = useState('grid');

    const showToast = (type, message) => {
        setToast({ type, message });
    };

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
        // Fetch key areas for the form
        getKeyAreas().then(setKeyAreas).catch(console.error);
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
            showToast('success', 'Goal created successfully!');
        } catch (error) {
            console.error("Failed to create goal from page:", error);
            showToast('error', 'Failed to create goal. Please try again.');
            throw error;
        }
    };

    const handleUpdateGoal = async (goalId, updateData) => {
        try {
            console.log('Goals.jsx - Updating goal:', goalId, 'with:', updateData);
            const updatedGoal = await updateGoal(goalId, updateData);
            
            // Immediately update the goals list with the returned data
            setGoals(prevGoals => 
                prevGoals.map(goal => 
                    goal.id === goalId ? { ...goal, ...updatedGoal } : goal
                )
            );
            
            // Update filtered goals as well
            setFilteredGoals(prevGoals => 
                prevGoals.map(goal => 
                    goal.id === goalId ? { ...goal, ...updatedGoal } : goal
                )
            );
            
            // If we're updating the currently selected goal, update it immediately
            if (selectedGoal && selectedGoal.id === goalId) {
                setSelectedGoal({ ...selectedGoal, ...updatedGoal });
            }
            
            // Also fetch fresh data to ensure consistency
            await fetchGoals();
            
            showToast('success', 'Goal updated successfully!');
        } catch (error) {
            console.error("Failed to update goal:", error);
            showToast('error', `Failed to update goal: ${error.message}`);
            throw error;
        }
    };

    // Delete goal
    const handleDeleteGoal = async (goalId) => {
        if (window.confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
            try {
                console.log('Goals.jsx - Attempting to delete goal:', goalId);
                
                // Try archiving first as a safer alternative
                try {
                    console.log('Trying to archive goal first');
                    await archiveGoal(goalId);
                    setGoals(goals.filter(g => g.id !== goalId));
                    setFilteredGoals(filteredGoals.filter(g => g.id !== goalId));
                    showToast('success', 'Goal has been archived.');
                } catch (archiveError) {
                    console.log('Archive failed, trying hard delete');
                    await deleteGoal(goalId);
                    setGoals(goals.filter(g => g.id !== goalId));
                    setFilteredGoals(filteredGoals.filter(g => g.id !== goalId));
                    showToast('success', 'Goal has been permanently deleted.');
                }
            } catch (error) {
                console.error('Failed to delete goal:', error);
                showToast('error', `Failed to delete goal: ${error.message}`);
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

        // Render different views based on currentView
        switch (currentView) {
            case 'list':
                return <ListView goals={filteredGoals} onGoalClick={handleGoalClick} onUpdate={handleUpdateGoal} onDelete={handleDeleteGoal} />;
            case 'kanban':
                return <KanbanView goals={filteredGoals} onGoalClick={handleGoalClick} onUpdate={handleUpdateGoal} onDelete={handleDeleteGoal} />;
            case 'timeline':
                return <TimelineView goals={filteredGoals} onGoalClick={handleGoalClick} onUpdate={handleUpdateGoal} onDelete={handleDeleteGoal} />;
            default:
                return <GoalList goals={filteredGoals} onGoalClick={handleGoalClick} onUpdate={handleUpdateGoal} onDelete={handleDeleteGoal} />;
        }
    };

    const handleGoalClick = (goal, mode = 'view') => {
        if (mode === 'edit') {
            setSelectedGoal(goal);
            // We'll handle edit mode in the modal
        } else {
            setSelectedGoal(goal);
        }
    };

    const stats = getGoalStats();

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <Sidebar />
            <div className="flex-1 p-4 md:p-8">
                {/* Header with Stats */}
                <div className="mb-8">
                    <GoalsHeader 
                        onAddGoal={() => setIsModalOpen(true)} 
                        currentView={currentView}
                        onViewChange={setCurrentView}
                    />

                    {/* Stats Cards */}
                    {!isLoading && goals.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                                        <div className="text-sm text-gray-600 mt-1">Total Goals</div>
                                    </div>
                                    <div className="p-3 bg-gray-100 rounded-lg">
                                        <FaBullseye className="w-6 h-6 text-gray-600" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-3xl font-bold text-blue-600">{stats.active}</div>
                                        <div className="text-sm text-gray-600 mt-1">Active</div>
                                    </div>
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                        <FaRocket className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
                                        <div className="text-sm text-gray-600 mt-1">Completed</div>
                                    </div>
                                    <div className="p-3 bg-green-100 rounded-lg">
                                        <FaCheckCircle className="w-6 h-6 text-green-600" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-3xl font-bold text-red-600">{stats.overdue}</div>
                                        <div className="text-sm text-gray-600 mt-1">Overdue</div>
                                    </div>
                                    <div className="p-3 bg-red-100 rounded-lg">
                                        <FaClock className="w-6 h-6 text-red-600" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Filters and Search */}
                {!isLoading && goals.length > 0 && (
                    <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1 relative">
                                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search goals by title or description..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="relative">
                                <FaFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="pl-12 pr-8 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-slate-50 focus:bg-white transition-colors min-w-[140px]"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                            {/* Sort */}
                            <div className="relative">
                                <FaSortAmountDown className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="pl-12 pr-8 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-slate-50 focus:bg-white transition-colors min-w-[160px]"
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
                {isModalOpen && (
                    <GoalForm onClose={() => setIsModalOpen(false)} onGoalCreated={handleCreateGoal} keyAreas={keyAreas} />
                )}
                {selectedGoal && (
                    <GoalDetailModal 
                        goal={selectedGoal} 
                        onClose={() => setSelectedGoal(null)} 
                        keyAreas={keyAreas}
                        onUpdate={handleUpdateGoal}
                        onDelete={handleDeleteGoal}
                    />
                )}

                {/* Toast Notifications */}
                {toast && (
                    <Toast
                        type={toast.type}
                        message={toast.message}
                        onClose={() => setToast(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default Goals;
