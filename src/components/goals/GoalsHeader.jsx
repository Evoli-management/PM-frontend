// src/components/goals/GoalsHeader.jsx
import React from 'react';
import { FaPlus, FaBullseye, FaChartBar, FaDownload } from 'react-icons/fa';

const GoalsHeader = ({ onAddGoal, totalGoals }) => {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <FaBullseye className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Goals</h1>
                        <p className="text-slate-600">
                            Manage and track your {totalGoals} goal{totalGoals !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    <FaChartBar className="w-4 h-4" />
                    Analytics
                </button>
                
                <button
                    className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    <FaDownload className="w-4 h-4" />
                    Export
                </button>

                <button
                    onClick={onAddGoal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                    <FaPlus className="w-4 h-4" />
                    New Goal
                </button>
            </div>
        </div>
    );
};

export default GoalsHeader;