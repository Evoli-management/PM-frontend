// src/components/goals/EmptyState.jsx
import React from 'react';
import { FaBullseye, FaPlus } from 'react-icons/fa';

const EmptyState = ({ searchTerm, statusFilter, onCreateClick }) => {
  const hasFilters = searchTerm || statusFilter !== 'all';
  
  return (
    <div className="text-center py-16">
      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <FaBullseye className="w-12 h-12 text-slate-400" />
      </div>
      
      <h3 className="text-xl font-bold text-slate-900 mb-2">
        {hasFilters ? 'No goals found' : 'No goals yet'}
      </h3>
      
      <p className="text-slate-600 mb-8">
        {hasFilters 
          ? 'Try adjusting your search or filter criteria.'
          : 'Create your first goal to get started with tracking your objectives.'
        }
      </p>
      
      {!hasFilters && (
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
        >
          <FaPlus className="w-4 h-4" />
          Create Your First Goal
        </button>
      )}
    </div>
  );
};

export default EmptyState;