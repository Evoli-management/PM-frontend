// src/components/goals/GoalsControlBar.jsx
import React from "react";
import { FaSearch, FaPlus, FaThLarge, FaListUl } from "react-icons/fa";

const GoalsControlBar = ({
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    onCreateClick,
}) => {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Left side - Search and Filters */}
                <div className="flex-1 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search goals..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="dueDate">Sort by Due Date</option>
                        <option value="title">Sort by Title</option>
                        <option value="priority">Sort by Priority</option>
                        <option value="progress">Sort by Progress</option>
                    </select>
                </div>

                {/* Right side - View Mode and Create Button */}
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded-md transition-colors ${
                                viewMode === "grid"
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                            title="Grid view"
                        >
                            <FaThLarge className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-md transition-colors ${
                                viewMode === "list"
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                            title="List view"
                        >
                            <FaListUl className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={onCreateClick}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                    >
                        <FaPlus className="w-4 h-4" />
                        New Goal
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GoalsControlBar;
