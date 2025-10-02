// src/components/goals/GoalsHeader.jsx
import React, { useState } from "react";
import { FaPlus, FaRocket, FaTh, FaList, FaColumns, FaChartLine } from "react-icons/fa";

const GoalsHeader = ({ onAddGoal, currentView = "grid", onViewChange }) => {
    const views = [
        { id: "grid", icon: FaTh, label: "Grid View" },
        { id: "list", icon: FaList, label: "List View" },
        { id: "kanban", icon: FaColumns, label: "Kanban Board" },
        { id: "timeline", icon: FaChartLine, label: "Timeline" },
    ];

    return (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title Section */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                    <FaRocket className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Goals</h1>
                    <p className="text-slate-600">Track and achieve your objectives</p>
                </div>
            </div>

            {/* Actions Section */}
            <div className="flex items-center gap-4">
                {/* View Switcher */}
                {onViewChange && (
                    <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                        {views.map((view) => {
                            const Icon = view.icon;
                            return (
                                <button
                                    key={view.id}
                                    onClick={() => onViewChange(view.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                                        currentView === view.id
                                            ? "bg-blue-500 text-white shadow-md"
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                    }`}
                                    title={view.label}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:inline text-sm font-medium">
                                        {view.label.split(" ")[0]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Add Goal Button */}
                <button
                    onClick={onAddGoal}
                    className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                    <FaPlus className="w-4 h-4" />
                    <span className="font-semibold">Create Goal</span>
                </button>
            </div>
        </div>
    );
};

export default GoalsHeader;
