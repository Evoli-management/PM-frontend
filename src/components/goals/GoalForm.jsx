// src/components/goals/GoalForm.jsx
import React, { useState } from 'react';
import { FaTrash, FaTimes, FaPlus, FaRocket, FaFlag, FaBullseye } from "react-icons/fa";

const GoalForm = ({ onClose, onGoalCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
  });
  const [milestones, setMilestones] = useState([{ title: '', weight: 1.0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleMilestoneChange = (index, field, value) => {
    const updatedMilestones = [...milestones];
    updatedMilestones[index][field] = value;
    setMilestones(updatedMilestones);
  };

  const addMilestone = () => {
    setMilestones([...milestones, { title: '', weight: 1.0 }]);
  };

  const removeMilestone = (index) => {
    if (milestones.length > 1) {
      const updatedMilestones = milestones.filter((_, i) => i !== index);
      setMilestones(updatedMilestones);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    
    milestones.forEach((milestone, index) => {
      if (!milestone.title.trim()) {
        newErrors[`milestone_${index}`] = 'Milestone title is required';
      }
      if (!milestone.weight || milestone.weight <= 0) {
        newErrors[`weight_${index}`] = 'Weight must be greater than 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const goalData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      dueDate: formData.dueDate,
      milestones: milestones.map(m => ({
        title: m.title.trim(),
        weight: parseFloat(m.weight) || 1.0,
      })),
    };

    try {
      await onGoalCreated(goalData);
      onClose();
    } catch (err) {
      setErrors({ general: err.message || 'Failed to create goal. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      const stepErrors = {};
      if (!formData.title.trim()) stepErrors.title = 'Title is required';
      if (!formData.dueDate) stepErrors.dueDate = 'Due date is required';
      
      setErrors(stepErrors);
      if (Object.keys(stepErrors).length === 0) {
        setCurrentStep(2);
      }
    }
  };

  const prevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden bg-white rounded-3xl shadow-2xl border border-slate-200 animate-[modalSlideIn_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FaRocket className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Create New Goal</h2>
                <p className="text-blue-100">Define your objective and break it into milestones</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                currentStep >= 1 ? 'bg-white text-blue-600' : 'bg-white/30 text-white'
              }`}>
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-white' : 'text-blue-200'}`}>
                Goal Details
              </span>
            </div>
            <div className={`flex-1 h-0.5 ${currentStep >= 2 ? 'bg-white' : 'bg-white/30'} transition-all`}></div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                currentStep >= 2 ? 'bg-white text-blue-600' : 'bg-white/30 text-white'
              }`}>
                2
              </div>
              <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-white' : 'text-blue-200'}`}>
                Milestones
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* General error */}
            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-800 font-medium">{errors.general}</p>
              </div>
            )}

            {/* Step 1: Goal Details */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-[slideIn_0.3s_ease-out]">
                <div className="flex items-center gap-3 mb-6">
                  <FaBullseye className="w-5 h-5 text-blue-600" />
                  <h3 className="text-xl font-bold text-slate-900">Goal Details</h3>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    Goal Title <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    id="title" 
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={`w-full p-4 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                      errors.title ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                    placeholder="e.g., Launch my online business, Learn Spanish, Get fit"
                  />
                  {errors.title && <p className="text-red-600 text-sm font-medium">{errors.title}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-semibold text-slate-900">
                    Description (Optional)
                  </label>
                  <textarea 
                    id="description" 
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows="4"
                    className="w-full p-4 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    placeholder="Provide context and details about what you want to achieve..."
                  />
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <label htmlFor="dueDate" className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    Target Completion Date <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date" 
                    id="dueDate" 
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full p-4 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                      errors.dueDate ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                  />
                  {errors.dueDate && <p className="text-red-600 text-sm font-medium">{errors.dueDate}</p>}
                </div>
              </div>
            )}

            {/* Step 2: Milestones */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-[slideIn_0.3s_ease-out]">
                <div className="flex items-center gap-3 mb-6">
                  <FaFlag className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Milestones</h3>
                    <p className="text-slate-600 text-sm">Break your goal into smaller, manageable steps</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="p-4 border-2 border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center font-bold text-blue-600 text-sm">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          <div>
                            <input 
                              type="text" 
                              placeholder="Milestone description"
                              value={milestone.title}
                              onChange={(e) => handleMilestoneChange(index, 'title', e.target.value)}
                              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                errors[`milestone_${index}`] ? 'border-red-300 bg-red-50' : 'border-slate-300'
                              }`}
                            />
                            {errors[`milestone_${index}`] && (
                              <p className="text-red-600 text-sm font-medium mt-1">{errors[`milestone_${index}`]}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                                Weight (importance)
                              </label>
                              <input 
                                type="number" 
                                placeholder="1.0"
                                value={milestone.weight}
                                onChange={(e) => handleMilestoneChange(index, 'weight', e.target.value)}
                                min="0.1"
                                step="0.1"
                                className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                  errors[`weight_${index}`] ? 'border-red-300 bg-red-50' : 'border-slate-300'
                                }`}
                              />
                              {errors[`weight_${index}`] && (
                                <p className="text-red-600 text-sm font-medium mt-1">{errors[`weight_${index}`]}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeMilestone(index)}
                          disabled={milestones.length === 1}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={addMilestone}
                    className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                  >
                    <FaPlus className="w-4 h-4" />
                    Add Another Milestone
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
            <div className="flex gap-3">
              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-6 py-3 font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>

            <div className="flex gap-3">
              {currentStep === 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-8 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Next: Add Milestones
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:from-blue-400 disabled:to-indigo-400 disabled:cursor-wait flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating Goal...
                    </>
                  ) : (
                    <>
                      <FaRocket className="w-4 h-4" />
                      Create Goal
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default GoalForm;