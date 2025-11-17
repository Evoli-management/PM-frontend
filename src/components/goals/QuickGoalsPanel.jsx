// src/components/goals/QuickGoalsPanel.jsx
import React from "react";
import { FaTimes, FaLink, FaUnlink, FaArrowRight } from "react-icons/fa";

const QuickGoalsPanel = ({ goals, onClose }) => {
    // Build hierarchy from goals
    const buildHierarchy = (goals) => {
        const goalMap = {};
        const roots = [];

        // Create a map of all goals
        goals.forEach((goal) => {
            goalMap[goal.id] = { ...goal, children: [] };
        });

        // Build the hierarchy
        goals.forEach((goal) => {
            if (goal.parentGoalId && goalMap[goal.parentGoalId]) {
                goalMap[goal.parentGoalId].children.push(goalMap[goal.id]);
            } else {
                roots.push(goalMap[goal.id]);
            }
        });

        return roots;
    };

    const hierarchy = buildHierarchy(goals);

    const renderGoalNode = (goal, level = 0) => {
        const progressColor =
            goal.progressPercent >= 90
                ? "bg-green-500"
                : goal.progressPercent >= 70
                  ? "bg-blue-500"
                  : goal.progressPercent >= 40
                    ? "bg-yellow-500"
                    : "bg-red-500";

        return (
            <div key={goal.id} className="mb-3">
                <div
                    className={`flex items-center p-3 rounded-lg ${level > 0 ? "bg-slate-50" : "bg-white border border-slate-200"}`}
                >
                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xs font-bold mr-3">
                        {level === 0 ? "G" : "S"}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 truncate">{goal.title}</h4>
                        <div className="flex items-center mt-1">
                            <div className="w-20 bg-slate-200 rounded-full h-2 mr-2">
                                <div
                                    className={`h-2 rounded-full ${progressColor}`}
                                    style={{ width: `${goal.progressPercent}%` }}
                                ></div>
                            </div>
                            <span className="text-xs text-slate-600">{goal.progressPercent}%</span>
                        </div>
                    </div>

                    <div className="flex items-center ml-2">
                        <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                                goal.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : goal.status === "active"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-slate-100 text-slate-800"
                            }`}
                        >
                            {goal.status}
                        </span>
                    </div>
                </div>

                {goal.children.length > 0 && (
                    <div className="ml-6 pl-4 border-l-2 border-slate-200 mt-2">
                        {goal.children.map((child) => renderGoalNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div>
                        <h2 className="text-2xl font-bold">Goals Hierarchy</h2>
                        <p className="text-blue-100">Visualize how your goals are connected</p>
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
                    {hierarchy.length > 0 ? (
                        <div className="space-y-4">{hierarchy.map((goal) => renderGoalNode(goal))}</div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                                <FaUnlink className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-2">No goal hierarchy yet</h3>
                            <p className="text-slate-600">
                                Create parent-child relationships between goals to visualize them here.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center p-6 bg-slate-50 border-t border-slate-200">
                    <p className="text-sm text-slate-600">
                        {hierarchy.length} top-level goals with {goals.filter((g) => g.parentGoalId).length} sub-goals
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickGoalsPanel;
