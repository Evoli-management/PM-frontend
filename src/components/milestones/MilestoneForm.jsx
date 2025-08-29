// src/components/milestones/MilestoneForm.jsx
import React, { useState } from "react";
import { FaSave, FaTimes, FaCalendarAlt, FaWeight, FaAlignLeft } from "react-icons/fa";

const MilestoneForm = ({ milestone, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        title: milestone?.title || "",
        description: milestone?.description || "",
        dueDate: milestone?.dueDate ? new Date(milestone.dueDate).toISOString().slice(0, 16) : "",
        weight: milestone?.weight || 1.0,
        sortOrder: milestone?.sortOrder || 0,
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = "Title is required";
        } else if (formData.title.length > 255) {
            newErrors.title = "Title cannot exceed 255 characters";
        }

        if (formData.description && formData.description.length > 2000) {
            newErrors.description = "Description cannot exceed 2000 characters";
        }

        if (formData.weight < 0.01 || formData.weight > 10) {
            newErrors.weight = "Weight must be between 0.01 and 10.0";
        }

        if (formData.sortOrder < 0) {
            newErrors.sortOrder = "Sort order cannot be negative";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setLoading(true);

            const submitData = {
                ...formData,
                weight: parseFloat(formData.weight),
                sortOrder: parseInt(formData.sortOrder),
                dueDate: formData.dueDate || undefined,
                description: formData.description.trim() || undefined,
            };

            await onSubmit(submitData);
        } catch (err) {
            console.error("Error submitting milestone:", err);
            const errorMessage = err.response?.data?.message || err.message || "Failed to save milestone";
            setErrors({ submit: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="Enter milestone title"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.title ? "border-red-300" : "border-gray-300"
                    }`}
                    maxLength={255}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    <FaAlignLeft className="inline mr-1" />
                    Description
                </label>
                <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="Optional description"
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.description ? "border-red-300" : "border-gray-300"
                    }`}
                    maxLength={2000}
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                <p className="text-xs text-gray-500 mt-1">{formData.description.length}/2000 characters</p>
            </div>

            {/* Due Date and Weight Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Due Date */}
                <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                        <FaCalendarAlt className="inline mr-1" />
                        Due Date
                    </label>
                    <input
                        type="datetime-local"
                        id="dueDate"
                        value={formData.dueDate}
                        onChange={(e) => handleChange("dueDate", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Weight */}
                <div>
                    <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                        <FaWeight className="inline mr-1" />
                        Weight
                    </label>
                    <input
                        type="number"
                        id="weight"
                        value={formData.weight}
                        onChange={(e) => handleChange("weight", e.target.value)}
                        min="0.01"
                        max="10.0"
                        step="0.01"
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.weight ? "border-red-300" : "border-gray-300"
                        }`}
                    />
                    {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight}</p>}
                    <p className="text-xs text-gray-500 mt-1">Higher weight = more impact on goal progress</p>
                </div>
            </div>

            {/* Sort Order */}
            <div>
                <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                </label>
                <input
                    type="number"
                    id="sortOrder"
                    value={formData.sortOrder}
                    onChange={(e) => handleChange("sortOrder", e.target.value)}
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.sortOrder ? "border-red-300" : "border-gray-300"
                    }`}
                />
                {errors.sortOrder && <p className="text-red-500 text-xs mt-1">{errors.sortOrder}</p>}
                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
            </div>

            {/* Submit Error */}
            {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-700 text-sm">{errors.submit}</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <FaSave />
                    <span>{loading ? "Saving..." : milestone ? "Update" : "Create"}</span>
                </button>

                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <FaTimes />
                    <span>Cancel</span>
                </button>
            </div>
        </form>
    );
};

export default MilestoneForm;
