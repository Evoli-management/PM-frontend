// src/components/goals/GoalsHeader.jsx
import React from "react";
import { FaPlus, FaRocket, FaTh, FaList, FaColumns, FaChartLine } from "react-icons/fa";

const GoalsHeader = ({ onAddGoal, currentView = "grid", onViewChange }) => {
    const views = [
        { id: "grid", icon: FaTh, label: "Grid" },
        { id: "list", icon: FaList, label: "List" },
        { id: "kanban", icon: FaColumns, label: "Kanban" },
        { id: "timeline", icon: FaChartLine, label: "Timeline" },
    ];

    return (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Title Section */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-md">
                    <FaRocket className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Goals</h1>
                    <p className="text-sm text-slate-600">Track and achieve your objectives</p>
                </div>
            </div>

            {/* Actions Section */}
            <div className="flex items-center gap-2">
                {/* View Switcher */}
                {onViewChange && (
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                        {views.map((view) => {
                            const Icon = view.icon;
                            return (
                                <button
                                    key={view.id}
                                    onClick={() => onViewChange(view.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                                        currentView === view.id
                                            ? "bg-blue-500 text-white shadow-sm"
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                    }`}
                                    title={view.label}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline text-xs font-medium">{view.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Add Goal Button */}
                <button
                    onClick={onAddGoal}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                >
                    <FaPlus className="w-3.5 h-3.5" />
                    <span className="text-sm font-semibold">New Goal</span>
                </button>
            </div>
        </div>
    );
};

export default GoalsHeader;