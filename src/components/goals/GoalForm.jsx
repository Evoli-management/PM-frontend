import React, { useState } from "react";
import { FaTimes, FaPlus, FaTrash, FaSave, FaRocket } from "react-icons/fa";

const GoalForm = ({ onClose, onGoalCreated, keyAreas = [], goal, isEditing = false }) => {
    const [formData, setFormData] = useState({
        title: goal?.title || "",
        description: goal?.description || "",
        startDate: goal?.startDate ? new Date(goal.startDate).toISOString().split("T")[0] : "",
        dueDate: goal?.dueDate ? new Date(goal.dueDate).toISOString().split("T")[0] : "",
        keyAreaId: goal?.keyAreaId || "",
        status: goal?.status || "active",
        visibility: goal?.visibility || "public",
    });

    const [milestones, setMilestones] = useState(
        goal?.milestones?.length > 0
            ? goal.milestones.map((m) => ({
                  id: m.id,
                  title: m.title,
                  weight: m.weight || 1.0,
                  dueDate: m.dueDate || "",
              }))
            : [{ title: "", weight: 1.0, dueDate: "" }],
    );

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    const addMilestone = () => {
        if (milestones.length < 10) {
            setMilestones([...milestones, { title: "", weight: 1.0, dueDate: "" }]);
        }
    };

    const removeMilestone = (index) => {
        if (milestones.length > 1) {
            setMilestones(milestones.filter((_, i) => i !== index));
        }
    };

    const updateMilestone = (index, field, value) => {
        const updated = [...milestones];
        updated[index][field] = value;
        setMilestones(updated);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = "Title is required";
        } else if (formData.title.length < 3) {
            newErrors.title = "Title must be at least 3 characters";
        }

        if (!formData.dueDate) {
            newErrors.dueDate = "Due date is required";
        } else {
            const dueDate = new Date(formData.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (dueDate <= today && !isEditing) {
                newErrors.dueDate = "Due date must be in the future";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);

        const goalData = {
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            startDate: formData.startDate || null,
            dueDate: formData.dueDate,
            keyAreaId: formData.keyAreaId || null,
            visibility: formData.visibility,
            milestones: milestones
                .filter((m) => m.title.trim())
                .map((m) => ({
                    ...(m.id && { id: m.id }),
                    title: m.title.trim(),
                    weight: parseFloat(m.weight) || 1.0,
                    dueDate: m.dueDate || null,
                })),
        };

        try {
            await onGoalCreated(goalData);
            onClose();
        } catch (err) {
            setErrors({ general: err.message || "Failed to save goal. Please try again." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
                .animate-slideUp {
                    animation: slideUp 0.3s ease-out;
                }
            `}</style>
            
            <div className="bg-white rounded-xl w-full max-w-5xl shadow-2xl flex flex-col animate-slideUp" style={{ height: '85vh', border: '1px solid #e5e7eb' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-blue-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FaRocket className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {isEditing ? "Edit Goal" : "Create Goal"}
                        </h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                    >
                        <FaTimes className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="h-full">
                        {errors.general && (
                            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 rounded-r text-red-700 text-sm animate-slideUp">
                                {errors.general}
                            </div>
                        )}

                        <div className="grid grid-cols-12 gap-6 h-full">
                            {/* Left Column - Main Info */}
                            <div className="col-span-7 space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        Goal Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => handleInputChange("title", e.target.value)}
                                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                                            errors.title ? "border-red-300 bg-red-50" : "border-gray-300 hover:border-gray-400"
                                        }`}
                                        placeholder="Enter goal title"
                                    />
                                    {errors.title && <p className="text-red-600 text-xs mt-1 animate-slideUp">{errors.title}</p>}
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => handleInputChange("description", e.target.value)}
                                        rows="3"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none hover:border-gray-400 transition-all duration-200"
                                        placeholder="Describe your goal..."
                                    />
                                </div>

                                {/* Date Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => handleInputChange("startDate", e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all duration-200"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            Due Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.dueDate}
                                            onChange={(e) => handleInputChange("dueDate", e.target.value)}
                                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                                                errors.dueDate ? "border-red-300 bg-red-50" : "border-gray-300 hover:border-gray-400"
                                            }`}
                                            min={new Date().toISOString().split("T")[0]}
                                        />
                                        {errors.dueDate && <p className="text-red-600 text-xs mt-1 animate-slideUp">{errors.dueDate}</p>}
                                    </div>
                                </div>

                                {/* Select Fields */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            Key Area
                                        </label>
                                        <select
                                            value={formData.keyAreaId}
                                            onChange={(e) => handleInputChange("keyAreaId", e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all duration-200"
                                        >
                                            <option value="">None</option>
                                            {keyAreas.map((area) => (
                                                <option key={area.id} value={area.id}>
                                                    {area.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            Status
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => handleInputChange("status", e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all duration-200"
                                            disabled={!isEditing}
                                        >
                                            <option value="active">Active</option>
                                            <option value="completed">Completed</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            Visibility
                                        </label>
                                        <select
                                            value={formData.visibility}
                                            onChange={(e) => handleInputChange("visibility", e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all duration-200"
                                        >
                                            <option value="public">Public</option>
                                            <option value="private">Private</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Milestones */}
                            <div className="col-span-5 border-l border-gray-200 pl-6 flex flex-col h-full">
                                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                                    <h3 className="text-sm font-semibold text-gray-900">Milestones {milestones.length}/10</h3>
                                    <button
                                        type="button"
                                        onClick={addMilestone}
                                        disabled={milestones.length >= 10}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FaPlus className="w-3 h-3" />
                                        Add
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0">
                                    {milestones.map((milestone, index) => (
                                        <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-sm">
                                            <div className="flex items-start gap-2 mb-2">
                                                <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5 shadow-sm">
                                                    {index + 1}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={milestone.title}
                                                    onChange={(e) => updateMilestone(index, "title", e.target.value)}
                                                    placeholder="Milestone title"
                                                    className="flex-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white hover:border-gray-400 transition-all duration-200"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeMilestone(index)}
                                                    disabled={milestones.length === 1}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-sm"
                                                >
                                                    <FaTrash className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 pl-7">
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">Weight</label>
                                                    <input
                                                        type="number"
                                                        value={milestone.weight}
                                                        onChange={(e) =>
                                                            updateMilestone(index, "weight", parseFloat(e.target.value))
                                                        }
                                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white hover:border-gray-400 transition-all duration-200"
                                                        min="0.1"
                                                        step="0.1"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">Due Date</label>
                                                    <input
                                                        type="date"
                                                        value={milestone.dueDate}
                                                        onChange={(e) => updateMilestone(index, "dueDate", e.target.value)}
                                                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white hover:border-gray-400 transition-all duration-200"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                        <FaSave className="w-3.5 h-3.5" />
                        {isSubmitting ? "Saving..." : isEditing ? "Update Goal" : "Save Goal"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GoalForm;