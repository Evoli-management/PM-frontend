// src/components/goals/MilestoneForm.jsx
import React, { useState, useEffect } from "react";
import { FaPlus, FaTrash, FaSave, FaTimes } from "react-icons/fa";
import milestoneService from "../../services/milestoneService";

const MilestoneForm = ({ goalId, milestones, onMilestonesChange, onClose }) => {
    const [localMilestones, setLocalMilestones] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (milestones && milestones.length > 0) {
            setLocalMilestones(milestones.map((milestone) => ({ ...milestone })));
        } else {
            // Add one empty milestone to start
            setLocalMilestones([createEmptyMilestone()]);
        }
    }, [milestones]);

    const createEmptyMilestone = () => ({
        id: null,
        title: "",
        description: "",
        targetDate: "",
        weight: 1,
        isNew: true,
        done: false,
    });

    const addMilestone = () => {
        setLocalMilestones([...localMilestones, createEmptyMilestone()]);
    };

    const removeMilestone = async (index) => {
        const milestone = localMilestones[index];

        if (milestone.id && !milestone.isNew) {
            // If it's an existing milestone, delete from backend
            try {
                await milestoneService.deleteMilestone(milestone.id);
            } catch (error) {
                console.error("Error deleting milestone:", error);
                alert("Failed to delete milestone");
                return;
            }
        }

        // Remove from local state
        const updated = localMilestones.filter((_, i) => i !== index);
        setLocalMilestones(updated);
    };

    const updateMilestone = (index, field, value) => {
        const updated = [...localMilestones];
        updated[index] = { ...updated[index], [field]: value };
        setLocalMilestones(updated);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const validMilestones = localMilestones.filter((m) => m.title.trim());
            const milestoneErrors = [];

            // Create new milestones
            for (const milestone of validMilestones.filter((m) => m.isNew)) {
                try {
                    const milestoneToCreate = {
                        title: milestone.title.trim(),
                        description: milestone.description?.trim() || "",
                        targetDate: milestone.targetDate || null,
                        weight: milestone.weight || 1,
                    };

                    console.log("Creating milestone:", milestoneToCreate);
                    await milestoneService.createMilestone(goalId, milestoneToCreate);
                } catch (error) {
                    console.error("Error creating milestone:", milestone.title, error);
                    milestoneErrors.push(
                        `Failed to create milestone "${milestone.title}": ${error.response?.data?.message || error.message}`,
                    );
                }
            }

            // Update existing milestones
            for (const milestone of validMilestones.filter((m) => !m.isNew && m.id)) {
                try {
                    const milestoneToUpdate = {
                        title: milestone.title.trim(),
                        description: milestone.description?.trim() || "",
                        targetDate: milestone.targetDate || null,
                        weight: milestone.weight || 1,
                        status: milestone.status || "active",
                        done: milestone.done || false,
                    };

                    console.log("Updating milestone:", milestone.id, milestoneToUpdate);
                    await milestoneService.updateMilestone(milestone.id, milestoneToUpdate);
                } catch (error) {
                    console.error("Error updating milestone:", milestone.title, error);
                    milestoneErrors.push(
                        `Failed to update milestone "${milestone.title}": ${error.response?.data?.message || error.message}`,
                    );
                }
            }

            // Show milestone errors if any
            if (milestoneErrors.length > 0) {
                alert(`Some milestone issues occurred:\n\n${milestoneErrors.join("\n")}`);
            } else {
                // Refresh milestones and notify parent
                const updatedMilestones = await milestoneService.getMilestonesByGoal(goalId);
                onMilestonesChange(updatedMilestones);
                onClose();
            }
        } catch (error) {
            console.error("Error saving milestones:", error);
            alert("Failed to save milestones");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 border shadow-lg">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">Manage Milestones</h3>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
                    <FaTimes />
                </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
                {localMilestones.map((milestone, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <input
                                type="text"
                                placeholder="Milestone title"
                                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={milestone.title}
                                onChange={(e) => updateMilestone(index, "title", e.target.value)}
                            />
                            <button
                                onClick={() => removeMilestone(index)}
                                className="ml-2 p-2 rounded-lg text-red-600 hover:bg-red-50"
                            >
                                <FaTrash />
                            </button>
                        </div>

                        <textarea
                            placeholder="Description (optional)"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows="2"
                            value={milestone.description}
                            onChange={(e) => updateMilestone(index, "description", e.target.value)}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={milestone.targetDate}
                                    onChange={(e) => updateMilestone(index, "targetDate", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Weight</label>
                                <input
                                    type="number"
                                    min="0.1"
                                    max="10"
                                    step="0.1"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={milestone.weight}
                                    onChange={(e) => updateMilestone(index, "weight", parseFloat(e.target.value) || 1)}
                                />
                            </div>
                        </div>

                        {!milestone.isNew && (
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={milestone.done}
                                    onChange={(e) => updateMilestone(index, "done", e.target.checked)}
                                    className="mr-2"
                                />
                                <span className="text-sm text-slate-700">Completed</span>
                            </label>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between mt-6">
                <button
                    onClick={addMilestone}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                >
                    <FaPlus /> Add Milestone
                </button>

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                        Save Milestones
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MilestoneForm;
