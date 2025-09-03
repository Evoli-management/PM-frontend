import React, { useState, useEffect } from "react";
import { FaBullseye, FaTimes, FaSave, FaSpinner, FaPlus, FaTrash, FaFlag } from "react-icons/fa";
import goalService from "../../services/goalService";
import milestoneService from "../../services/milestoneService";
import ProgressBar from "./ProgressBar.jsx";

const GoalForm = ({ initial = {}, onCancel, onSave }) => {
    const [title, setTitle] = useState(initial.title || "");
    const [description, setDescription] = useState(initial.description || "");
    const [keyAreaId, setKeyAreaId] = useState(initial.keyAreaId || "");
    const [status, setStatus] = useState(initial.status || "active");
    const [visibility, setVisibility] = useState(initial.visibility || "private");
    const [startDate, setStartDate] = useState(
        initial.startDate ? new Date(initial.startDate).toISOString().split("T")[0] : "",
    );
    const [targetDate, setTargetDate] = useState(
        initial.targetDate || initial.dueDate
            ? new Date(initial.targetDate || initial.dueDate).toISOString().split("T")[0]
            : "",
    );
    const [progressPercentage, setProgressPercentage] = useState(initial.progressPercentage || 0);
    const [keyAreas, setKeyAreas] = useState([]);
    const [loading, setLoading] = useState(false);

    // Milestone state
    const [milestones, setMilestones] = useState([
        {
            id: Date.now(), // temporary ID for new milestones
            title: "",
            description: "",
            targetDate: "",
            weight: 1,
            isNew: true,
        },
    ]);
    const [loadingMilestones, setLoadingMilestones] = useState(false);

    useEffect(() => {
        const fetchKeyAreas = async () => {
            try {
                const areas = await goalService.getKeyAreas();
                setKeyAreas(areas);
            } catch (error) {
                console.error("Error fetching key areas:", error);
            }
        };
        fetchKeyAreas();
    }, []);

    // Load existing milestones when editing
    useEffect(() => {
        const loadMilestones = async () => {
            if (initial.id) {
                try {
                    setLoadingMilestones(true);
                    const existingMilestones = await milestoneService.getMilestonesByGoal(initial.id);

                    const formattedMilestones = existingMilestones.map((milestone) => ({
                        ...milestone,
                        targetDate: milestone.dueDate ? new Date(milestone.dueDate).toISOString().split("T")[0] : "",
                        status: milestone.done ? "completed" : "active", // Map done to status
                        isNew: false,
                    }));

                    // Ensure at least one milestone
                    if (formattedMilestones.length === 0) {
                        setMilestones([
                            {
                                id: Date.now(),
                                title: "",
                                description: "",
                                targetDate: "",
                                weight: 1,
                                status: "active",
                                isNew: true,
                            },
                        ]);
                    } else {
                        setMilestones(formattedMilestones);
                    }
                } catch (error) {
                    console.error("Error loading milestones:", error);
                } finally {
                    setLoadingMilestones(false);
                }
            }
        };

        loadMilestones();
    }, [initial.id]);

    const addMilestone = () => {
        setMilestones((prev) => [
            ...prev,
            {
                id: Date.now(),
                title: "",
                description: "",
                targetDate: "",
                weight: 1,
                status: "active",
                isNew: true,
            },
        ]);
    };

    const removeMilestone = (index) => {
        if (milestones.length <= 1) {
            alert("At least one milestone is required for each goal.");
            return;
        }
        setMilestones((prev) => prev.filter((_, i) => i !== index));
    };

    const updateMilestone = (index, field, value) => {
        setMilestones((prev) =>
            prev.map((milestone, i) => (i === index ? { ...milestone, [field]: value } : milestone)),
        );
    };

    const validateMilestones = () => {
        // Check if at least one milestone exists and has a title
        const validMilestones = milestones.filter((m) => m.title.trim());
        if (validMilestones.length === 0) {
            alert("At least one milestone with a title is required.");
            return false;
        }

        // Check for milestone dates that are after goal target date
        const goalTargetDate = new Date(targetDate);
        const invalidDates = milestones.filter(
            (m) => m.title.trim() && m.targetDate && new Date(m.targetDate) > goalTargetDate,
        );

        if (targetDate && invalidDates.length > 0) {
            alert("Milestone due dates cannot be after the goal target date.");
            return false;
        }

        return true;
    };

    const handleSave = async () => {
        if (!title.trim()) {
            alert("Title is required");
            return;
        }

        // Backend requires dueDate; enforce it in the UI
        if (!targetDate) {
            alert("Target date is required");
            return;
        }

        // Compare ISO date strings directly (YYYY-MM-DD) to avoid timezone issues.
        // Allow same-day start/target; only block when start is after target.
        if (startDate && targetDate && startDate > targetDate) {
            alert("Start date cannot be after target date");
            return;
        }

        if (!validateMilestones()) {
            return;
        }

        setLoading(true);

        try {
            // Prepare milestones mapped to backend fields
            const validMilestones = milestones.filter((m) => m.title.trim());

            const goalData = {
                title: title.trim(),
                description: description.trim() || undefined,
                keyAreaId: keyAreaId || undefined,
                startDate: startDate || undefined,
                // Backend expects `dueDate`; map UI `targetDate` to it
                dueDate: targetDate || undefined,
                visibility,
                progressPercentage,
            };

            if (initial.id) {
                goalData.status = status;
            }

            // For new goals, include milestones in the create payload so they're created transactionally
            if (!initial.id && validMilestones.length > 0) {
                goalData.milestones = validMilestones.map((m) => ({
                    title: m.title.trim(),
                    dueDate: m.targetDate || undefined,
                    weight: m.weight || 1,
                }));
            }

            // Save the goal first
            const savedGoal = await onSave(goalData);
            const goalId = savedGoal?.id || initial.id;

            // Handle milestones for EXISTING goals (when editing)
            if (goalId && initial.id) {
                console.log("Processing milestones for existing goal:", goalId);

                const milestoneErrors = [];

                // Create new milestones
                console.log("Goal created, now creating milestones...");
                console.log(
                    "Milestones to create:",
                    validMilestones.filter((m) => m.isNew),
                );
                for (const milestone of validMilestones.filter((m) => m.isNew)) {
                    try {
                        const milestoneToCreate = {
                            title: milestone.title.trim(),
                            description: milestone.description?.trim() || "",
                            dueDate: milestone.targetDate || null,
                            weight: milestone.weight || 1,
                        };

                        console.log("Creating milestone:", milestoneToCreate);
                        const createdMilestone = await milestoneService.createMilestone(goalId, milestoneToCreate);
                        console.log("Milestone created:", createdMilestone);
                    } catch (error) {
                        console.error("Error creating milestone:", milestone.title, error);
                        const errorMsg = error.response?.data?.message || error.message || "Unknown error";
                        milestoneErrors.push(`Failed to create milestone "${milestone.title}": ${errorMsg}`);
                    }
                }

                // Update existing milestones
                console.log("Updating existing milestones if needed...");
                console.log(
                    "Milestones to update:",
                    validMilestones.filter((m) => !m.isNew),
                );
                for (const milestone of validMilestones.filter((m) => !m.isNew)) {
                    if (milestone.id) {
                        try {
                            const milestoneToUpdate = {
                                title: milestone.title.trim(),
                                description: milestone.description?.trim() || "",
                                dueDate: milestone.targetDate || null,
                                weight: milestone.weight || 1,
                            };

                            console.log("Updating milestone:", milestone.id, milestoneToUpdate);
                            await milestoneService.updateMilestone(milestone.id, milestoneToUpdate);
                        } catch (error) {
                            console.error("Error updating milestone:", milestone.id, error);
                            const errorMsg = error.response?.data?.message || error.message || "Unknown error";
                            milestoneErrors.push(`Failed to update milestone "${milestone.title}": ${errorMsg}`);
                        }
                    }
                }

                // Show any milestone errors
                if (milestoneErrors.length > 0) {
                    alert(
                        `Goal updated successfully, but there were issues with milestones:\n\n${milestoneErrors.join("\n")}`,
                    );
                }
            }

            // Close the form after successful save
            onCancel();
        } catch (error) {
            console.error("Error saving goal:", error);
            const errorMessage = error.response?.data?.message || error.message || "Failed to save goal";
            alert(`Failed to save goal: ${errorMessage}. Please try again.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 border shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <FaBullseye className="text-blue-700 text-xl" />
                    <h3 className="text-xl font-bold text-slate-900">{initial.id ? "Edit Goal" : "Create New Goal"}</h3>
                </div>
                <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-100" disabled={loading}>
                    <FaTimes />
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column - Goal Details */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">Title *</label>
                        <input
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Launch new product line"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">Description</label>
                        <textarea
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
                            placeholder="Describe your goal in detail..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">Key Area</label>
                        <select
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={keyAreaId}
                            onChange={(e) => setKeyAreaId(e.target.value)}
                            disabled={loading}
                        >
                            <option value="">Select a key area (optional)</option>
                            {keyAreas.map((area) => (
                                <option key={area.id} value={area.id}>
                                    {area.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">Start Date</label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">Target Date</label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {initial.id && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">Status</label>
                            <select
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                disabled={loading}
                            >
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">Visibility</label>
                        <select
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value)}
                            disabled={loading}
                        >
                            <option value="private">Private</option>
                            <option value="public">Public</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">
                            Progress ({progressPercentage}%)
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={progressPercentage}
                            onChange={(e) => setProgressPercentage(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            disabled={loading}
                        />
                        <div className="mt-2">
                            <ProgressBar value={progressPercentage} />
                        </div>
                    </div>
                </div>

                {/* Right Column - Milestones */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <FaFlag className="text-blue-700" />
                            Milestones *
                        </h4>
                        <button
                            type="button"
                            onClick={addMilestone}
                            className="inline-flex items-center gap-1 text-sm text-blue-700 font-semibold hover:text-blue-800"
                            disabled={loading}
                        >
                            <FaPlus className="text-xs" />
                            Add Milestone
                        </button>
                    </div>

                    {loadingMilestones ? (
                        <div className="flex items-center justify-center py-4">
                            <FaSpinner className="animate-spin text-blue-600 mr-2" />
                            <span className="text-sm text-slate-600">Loading milestones...</span>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {milestones.map((milestone, index) => (
                                <div key={milestone.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-sm font-semibold text-slate-700">
                                            Milestone {index + 1}
                                        </span>
                                        {milestones.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeMilestone(index)}
                                                className="p-1 text-red-600 hover:text-red-700"
                                                disabled={loading}
                                                title="Remove milestone"
                                            >
                                                <FaTrash className="text-xs" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Title *
                                            </label>
                                            <input
                                                className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Milestone title"
                                                value={milestone.title}
                                                onChange={(e) => updateMilestone(index, "title", e.target.value)}
                                                disabled={loading}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Description
                                            </label>
                                            <textarea
                                                className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                rows="2"
                                                placeholder="Milestone description (optional)"
                                                value={milestone.description}
                                                onChange={(e) => updateMilestone(index, "description", e.target.value)}
                                                disabled={loading}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                    Target Date
                                                </label>
                                                <input
                                                    type="date"
                                                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    value={milestone.targetDate}
                                                    onChange={(e) =>
                                                        updateMilestone(index, "targetDate", e.target.value)
                                                    }
                                                    disabled={loading}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                    Weight
                                                </label>
                                                <select
                                                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    value={milestone.weight}
                                                    onChange={(e) =>
                                                        updateMilestone(index, "weight", Number(e.target.value))
                                                    }
                                                    disabled={loading}
                                                >
                                                    <option value={1}>1 (Low)</option>
                                                    <option value={2}>2</option>
                                                    <option value={3}>3</option>
                                                    <option value={4}>4</option>
                                                    <option value={5}>5 (High)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="text-xs text-slate-600 bg-blue-50 p-3 rounded-lg">
                        <strong>Note:</strong> At least one milestone is required for each goal. Milestones help break
                        down your goal into manageable steps and track progress more effectively.
                    </div>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                    disabled={loading}
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                    disabled={loading}
                >
                    {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                    {loading ? "Saving..." : initial.id ? "Update Goal" : "Create Goal"}
                </button>
            </div>
        </div>
    );
};

export default GoalForm;
