// src/components/milestones/MilestoneList.jsx
import React, { useState, useEffect } from "react";
import {
    FaPlus,
    FaEdit,
    FaTrash,
    FaCheck,
    FaClock,
    FaCalendarAlt,
    FaWeight,
    FaSpinner,
    FaTasks,
    FaExclamationTriangle,
} from "react-icons/fa";
import milestoneService from "../../services/milestoneService";
import MilestoneForm from "./MilestoneForm";
import MilestoneItem from "./MilestoneItem";

const MilestoneList = ({ goalId, onProgressUpdate }) => {
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState(null);

    useEffect(() => {
        loadMilestones();
    }, [goalId]);

    const loadMilestones = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await milestoneService.getMilestonesByGoal(goalId);
            setMilestones(data);
        } catch (err) {
            console.error("Error loading milestones:", err);
            setError("Failed to load milestones");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMilestone = async (milestoneData) => {
        try {
            const newMilestone = await milestoneService.createMilestone(goalId, milestoneData);
            setMilestones((prev) => [...prev, newMilestone].sort((a, b) => a.sortOrder - b.sortOrder));
            setShowForm(false);
            if (onProgressUpdate) onProgressUpdate();
        } catch (err) {
            console.error("Error creating milestone:", err);
            throw err;
        }
    };

    const handleUpdateMilestone = async (milestoneId, milestoneData) => {
        try {
            const updatedMilestone = await milestoneService.updateMilestone(milestoneId, milestoneData);
            setMilestones((prev) =>
                prev
                    .map((m) => (m.id === milestoneId ? updatedMilestone : m))
                    .sort((a, b) => a.sortOrder - b.sortOrder),
            );
            setEditingMilestone(null);
            if (onProgressUpdate) onProgressUpdate();
        } catch (err) {
            console.error("Error updating milestone:", err);
            throw err;
        }
    };

    const handleDeleteMilestone = async (milestoneId) => {
        if (!window.confirm("Are you sure you want to delete this milestone?")) return;

        try {
            await milestoneService.deleteMilestone(milestoneId);
            setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
            if (onProgressUpdate) onProgressUpdate();
        } catch (err) {
            console.error("Error deleting milestone:", err);
            alert("Failed to delete milestone: " + (err.response?.data?.message || err.message));
        }
    };

    const handleToggleComplete = async (milestone) => {
        const updatedData = {
            done: !milestone.done,
            score: !milestone.done ? 1.0 : 0.0,
        };

        try {
            await handleUpdateMilestone(milestone.id, updatedData);
        } catch (err) {
            console.error("Error toggling milestone completion:", err);
        }
    };

    const calculateProgress = () => {
        if (milestones.length === 0) return 0;

        const totalWeight = milestones.reduce((sum, m) => sum + (m.weight || 1), 0);
        const completedWeight = milestones.reduce((sum, m) => sum + (m.weight || 1) * (m.score || 0), 0);

        return Math.round((completedWeight / totalWeight) * 100);
    };

    const getProgressColor = (progress) => {
        if (progress >= 80) return "text-green-600";
        if (progress >= 60) return "text-blue-600";
        if (progress >= 40) return "text-yellow-600";
        return "text-red-600";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <FaSpinner className="animate-spin text-2xl text-blue-500 mr-2" />
                <span className="text-gray-600">Loading milestones...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                    <FaExclamationTriangle className="text-red-500 mr-2" />
                    <span className="text-red-700">{error}</span>
                </div>
            </div>
        );
    }

    const progress = calculateProgress();

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <FaTasks className="text-lg text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Milestones ({milestones.length})</h3>
                    <div className={`text-sm font-medium ${getProgressColor(progress)}`}>{progress}% Complete</div>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                    <FaPlus />
                    <span>Add Milestone</span>
                </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            {/* Milestone Form */}
            {showForm && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <MilestoneForm onSubmit={handleCreateMilestone} onCancel={() => setShowForm(false)} />
                </div>
            )}

            {/* Milestones List */}
            {milestones.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <FaTasks className="text-4xl mb-2 mx-auto opacity-50" />
                    <p>No milestones yet. Add your first milestone to get started!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {milestones.map((milestone) => (
                        <MilestoneItem
                            key={milestone.id}
                            milestone={milestone}
                            onUpdate={handleUpdateMilestone}
                            onDelete={handleDeleteMilestone}
                            onToggleComplete={handleToggleComplete}
                            isEditing={editingMilestone === milestone.id}
                            onStartEdit={() => setEditingMilestone(milestone.id)}
                            onCancelEdit={() => setEditingMilestone(null)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MilestoneList;
