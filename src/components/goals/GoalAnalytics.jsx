// src/components/goals/GoalsAnalytics.jsx
import React from "react";
import { FaTimes, FaChartBar, FaCalendar, FaTrophy, FaClock, FaCheckCircle } from "react-icons/fa";

const GoalsAnalytics = ({ goals, onClose }) => {
    // Calculate analytics data
    const completedGoals = goals.filter((g) => g.status === "completed").length;
    const activeGoals = goals.filter((g) => g.status === "active").length;
    const overdueGoals = goals.filter((g) => g.status === "active" && new Date(g.dueDate) < new Date()).length;

    const totalProgress = goals.reduce((sum, goal) => sum + (goal.progressPercent || 0), 0) / goals.length || 0;

    const priorityDistribution = {
        high: goals.filter((g) => g.priority === "high").length,
        medium: goals.filter((g) => g.priority === "medium").length,
        low: goals.filter((g) => g.priority === "low").length,
    };

    const upcomingDeadlines = goals
        .filter((g) => g.status === "active" && new Date(g.dueDate) > new Date())
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-3xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <FaChartBar className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Goals Analytics</h2>
                            <p className="text-blue-100">Insights and statistics about your goals</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/80 hover:text-white rounded-lg transition-colors"
                    >
                        <FaTimes className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {/* Summary Cards */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-slate-900">Goals Summary</h3>
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <FaTrophy className="w-4 h-4 text-blue-600" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Total Goals</span>
                                    <span className="font-semibold text-slate-900">{goals.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Completed</span>
                                    <span className="font-semibold text-green-600">{completedGoals}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Active</span>
                                    <span className="font-semibold text-blue-600">{activeGoals}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Overdue</span>
                                    <span className="font-semibold text-red-600">{overdueGoals}</span>
                                </div>
                            </div>
                        </div>

                        {/* Progress Overview */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-slate-900">Average Progress</h3>
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <FaCheckCircle className="w-4 h-4 text-green-600" />
                                </div>
                            </div>
                            <div className="flex items-center justify-center my-4">
                                <div className="relative w-32 h-32">
                                    <svg className="w-full h-full" viewBox="0 0 36 36">
                                        <path
                                            d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="#eee"
                                            strokeWidth="3"
                                        />
                                        <path
                                            d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="#3B82F6"
                                            strokeWidth="3"
                                            strokeDasharray={`${totalProgress}, 100`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-2xl font-bold text-slate-900">
                                            {Math.round(totalProgress)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-center text-slate-600 text-sm">Average completion across all goals</p>
                        </div>

                        {/* Priority Distribution */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-slate-900">Priority Distribution</h3>
                                <div className="p-2 bg-amber-100 rounded-lg">
                                    <FaClock className="w-4 h-4 text-amber-600" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                {Object.entries(priorityDistribution).map(([priority, count]) => (
                                    <div key={priority}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-slate-600 capitalize">{priority}</span>
                                            <span className="font-semibold text-slate-900">{count}</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${
                                                    priority === "high"
                                                        ? "bg-red-500"
                                                        : priority === "medium"
                                                          ? "bg-yellow-500"
                                                          : "bg-blue-500"
                                                }`}
                                                style={{ width: `${(count / goals.length) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Deadlines */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-slate-900">Upcoming Deadlines</h3>
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <FaCalendar className="w-4 h-4 text-purple-600" />
                            </div>
                        </div>
                        {upcomingDeadlines.length > 0 ? (
                            <div className="space-y-4">
                                {upcomingDeadlines.map((goal) => (
                                    <div
                                        key={goal.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <h4 className="font-medium text-slate-900">{goal.title}</h4>
                                            <p className="text-sm text-slate-600">
                                                Due {new Date(goal.dueDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="w-16 bg-slate-200 rounded-full h-2">
                                            <div
                                                className="h-2 bg-blue-500 rounded-full"
                                                style={{ width: `${goal.progressPercent || 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">No upcoming deadlines</div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end p-6 bg-slate-50 border-t border-slate-200">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GoalsAnalytics;
