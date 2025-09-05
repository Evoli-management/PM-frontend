// src/components/goals/GoalList.jsx
import React from 'react';
import GoalItem from './GoalItem';
import { FaRocket, FaSearch } from 'react-icons/fa';

const GoalList = ({ goals }) => {
  if (!goals || goals.length === 0) {
    return (
      <div className="relative">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        <div className="relative bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
          <div className="max-w-md mx-auto">
            {/* Icon with animation */}
            <div className="mb-6 relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mx-auto flex items-center justify-center">
                <FaRocket className="w-8 h-8 text-blue-600 transform rotate-12" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-pulse"></div>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-3">Ready to Launch Your First Goal?</h3>
            <p className="text-slate-600 mb-6">
              Your goal dashboard is waiting! Create your first goal and start breaking it down into manageable milestones.
            </p>
            
            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">1</span>
                </div>
                <div className="font-semibold text-slate-900">Set Goals</div>
                <div className="text-slate-600">Define what you want to achieve</div>
              </div>
              
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <span className="text-green-600 font-semibold">2</span>
                </div>
                <div className="font-semibold text-slate-900">Add Milestones</div>
                <div className="text-slate-600">Break goals into smaller steps</div>
              </div>
              
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <span className="text-purple-600 font-semibold">3</span>
                </div>
                <div className="font-semibold text-slate-900">Track Progress</div>
                <div className="text-slate-600">Watch your success unfold</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FaSearch className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{goals.length}</span> goal{goals.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {goals.map((goal, index) => (
          <div
            key={goal.id}
            className="opacity-0 animate-[fadeInUp_0.5s_ease-out_forwards]"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <GoalItem goal={goal} />
          </div>
        ))}
      </div>

      {/* Custom animation styles */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default GoalList;