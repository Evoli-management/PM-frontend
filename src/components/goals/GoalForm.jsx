// src/components/goals/GoalForm.jsx
import React, { useState } from "react";
import { FaTimes, FaPlus, FaTrash, FaSave, FaRocket } from "react-icons/fa";

const GoalForm = ({ onClose, onGoalCreated, keyAreas, goal, isEditing = false }) => {
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
                  // NOTE: 'done' not included since it's not allowed in create DTO
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
        setMilestones([...milestones, { title: "", weight: 1.0, dueDate: "" }]);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);

        const goalData = {
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            startDate: formData.startDate || null,
            dueDate: formData.dueDate,
            keyAreaId: formData.keyAreaId || null,
            // NOTE: Remove status field - not allowed in create/update DTOs
            visibility: formData.visibility,
            milestones: milestones
                .filter((m) => m.title.trim())
                .map((m) => ({
                    ...(m.id && { id: m.id }),
                    title: m.title.trim(),
                    weight: parseFloat(m.weight) || 1.0,
                    dueDate: m.dueDate || null,
                    // NOTE: 'done' property not allowed in create milestone DTO
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FaRocket className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">
                            {isEditing ? "Edit Goal" : "Create New Goal"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                        <FaTimes className="w-4 h-4" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                    <form onSubmit={handleSubmit} className="p-6">
                        {errors.general && (
                            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                                {errors.general}
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                                        Goal Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => handleInputChange("title", e.target.value)}
                                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                            errors.title ? "border-red-300 bg-red-50" : "border-slate-300"
                                        }`}
                                        placeholder="e.g., Launch new product, Complete certification..."
                                    />
                                    {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => handleInputChange("description", e.target.value)}
                                        rows="3"
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Describe your goal in detail..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => handleInputChange("startDate", e.target.value)}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                                        Due Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => handleInputChange("dueDate", e.target.value)}
                                        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                            errors.dueDate ? "border-red-300 bg-red-50" : "border-slate-300"
                                        }`}
                                        min={new Date().toISOString().split("T")[0]}
                                    />
                                    {errors.dueDate && <p className="text-red-600 text-sm mt-1">{errors.dueDate}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 mb-2">Key Area</label>
                                    <select
                                        value={formData.keyAreaId}
                                        onChange={(e) => handleInputChange("keyAreaId", e.target.value)}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select a key area (Optional)</option>
                                        {keyAreas &&
                                            keyAreas.map((area) => (
                                                <option key={area.id} value={area.id}>
                                                    {area.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 mb-2">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => handleInputChange("status", e.target.value)}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        disabled={!isEditing}
                                    >
                                        <option value="active">Active</option>
                                        <option value="completed">Completed</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                    {!isEditing && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Status is set automatically when creating goals
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                                        Visibility
                                    </label>
                                    <select
                                        value={formData.visibility}
                                        onChange={(e) => handleInputChange("visibility", e.target.value)}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="public">Public</option>
                                        <option value="private">Private</option>
                                    </select>
                                </div>
                            </div>

                            {/* Milestones Section */}
                            <div className="border-t border-slate-200 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-900">Milestones</h3>
                                    <button
                                        type="button"
                                        onClick={addMilestone}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                                    >
                                        <FaPlus className="w-3 h-3" />
                                        Add Milestone
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {milestones.map((milestone, index) => (
                                        <div key={index} className="flex gap-3 items-start p-4 bg-slate-50 rounded-lg">
                                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 mt-2">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <input
                                                    type="text"
                                                    value={milestone.title}
                                                    onChange={(e) => updateMilestone(index, "title", e.target.value)}
                                                    placeholder="Milestone title"
                                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                                            Weight
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={milestone.weight}
                                                            onChange={(e) =>
                                                                updateMilestone(
                                                                    index,
                                                                    "weight",
                                                                    parseFloat(e.target.value),
                                                                )
                                                            }
                                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            min="0.1"
                                                            step="0.1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                                            Due Date
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={milestone.dueDate}
                                                            onChange={(e) =>
                                                                updateMilestone(index, "dueDate", e.target.value)
                                                            }
                                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeMilestone(index)}
                                                disabled={milestones.length === 1}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                                            >
                                                <FaTrash className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                <FaSave className="w-4 h-4" />
                                {isSubmitting ? "Saving..." : isEditing ? "Update Goal" : "Create Goal"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default GoalForm;
