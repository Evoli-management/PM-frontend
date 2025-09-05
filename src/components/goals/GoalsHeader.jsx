// src/components/goals/GoalsHeader.jsx
import React from 'react';
import { FaPlus, FaBullseye, FaRocket } from 'react-icons/fa';

const GoalsHeader = ({ onAddGoal }) => {
  return (
    <div className="relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 rounded-2xl"></div>
      
      <div className="relative flex flex-col items-start justify-between gap-6 p-6 md:flex-row md:items-center">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <FaRocket className="w-6 h-6 text-white" />
          </div>
          
          {/* Title and Description */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Goals Dashboard
              </h1>
              <div className="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full">
                Beta
              </div>
            </div>
            <p className="text-lg text-slate-600 max-w-2xl">
              Transform your aspirations into achievable milestones. Track progress, celebrate wins, and stay focused on what matters most.
            </p>
            
            {/* Quick tips */}
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <FaBullseye className="w-3 h-3" />
                <span>Set clear objectives</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Break into milestones</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Track your progress</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col items-end gap-3">
          <button
            onClick={onAddGoal}
            className="group flex items-center justify-center gap-3 px-6 py-3 font-semibold text-white transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-50 transform hover:scale-105"
          >
            <FaPlus className="transition-transform group-hover:rotate-90" />
            <span>Create New Goal</span>
          </button>
          
          {/* Helper text */}
          <p className="text-xs text-slate-500 text-right max-w-xs">
            Start by defining what you want to achieve and break it down into actionable steps
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoalsHeader;