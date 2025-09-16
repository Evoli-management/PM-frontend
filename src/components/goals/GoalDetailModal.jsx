import React, { useState } from "react";
import {
    FaTimes,
    FaEdit,
    FaCheckCircle,
    FaArchive,
    FaTrash,
    FaEye,
    FaEyeSlash,
    FaCalendarAlt,
    FaFlag,
    FaClock,
    FaSave,
    FaBuilding,
    FaPlus,
} from "react-icons/fa";
import GoalForm from "./GoalForm";

const GoalDetailModal = ({ goal, onClose, keyAreas, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [editingKeyArea, setEditingKeyArea] = useState(false);
    const [tempKeyAreaId, setTempKeyAreaId] = useState(goal?.keyAreaId || '');
    const [editingMilestone, setEditingMilestone] = useState(null);
    const [tempMilestoneTitle, setTempMilestoneTitle] = useState('');

    if (!goal) return null;

    const keyAreaName = keyAreas?.find((k) => k.id === goal.keyAreaId)?.name || "Not assigned";
    const completedMilestones = goal.milestones?.filter((m) => m.done).length || 0;
    const totalMilestones = goal.milestones?.length || 0;
    const progressPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
    const isOverdue = goal.status === "active" && new Date(goal.dueDate) < new Date();

    const handleEdit = () => setIsEditing(true);
    const handleCancelEdit = () => setIsEditing(false);

    const handleSave = async (goalData) => {
        await onUpdate(goal.id, goalData);
        setIsEditing(false);
    };

    const handleKeyAreaSave = async () => {
        await onUpdate(goal.id, { keyAreaId: tempKeyAreaId || null });
        setEditingKeyArea(false);
    };

    const handleKeyAreaCancel = () => {
        setTempKeyAreaId(goal?.keyAreaId || '');
        setEditingKeyArea(false);
    };

    const handleMilestoneEdit = (index) => {
        setEditingMilestone(index);
        setTempMilestoneTitle(goal.milestones[index].title);
    };

    const handleMilestoneSave = async (index) => {
        const updatedMilestones = [...goal.milestones];
        updatedMilestones[index].title = tempMilestoneTitle;
        
        await onUpdate(goal.id, { milestones: updatedMilestones });
        setEditingMilestone(null);
        setTempMilestoneTitle('');
    };

    const handleMilestoneCancel = () => {
        setEditingMilestone(null);
        setTempMilestoneTitle('');
    };

    const handleDateUpdate = async (field, value) => {
        try {
            const updateData = {};
            // Convert date input to ISO string for backend
            updateData[field] = value ? new Date(value).toISOString() : null;
            console.log(`Updating ${field} to:`, updateData[field]);
            await onUpdate(goal.id, updateData);
        } catch (error) {
            console.error(`Failed to update ${field}:`, error);
            alert(`Failed to update ${field}: ${error.message}`);
        }
    };

    const handleKeyAreaUpdate = async () => {
        try {
            await onUpdate(goal.id, { keyAreaId: tempKeyAreaId });
            setEditingKeyArea(false);
        } catch (error) {
            console.error('Failed to update key area:', error);
            alert(`Failed to update key area: ${error.message}`);
        }
    };

    const handleMilestoneToggle = async (milestoneIndex) => {
        if (!goal.milestones || !goal.milestones[milestoneIndex]) {
            console.error('Milestone not found at index:', milestoneIndex);
            return;
        }
        
        const updatedMilestones = [...goal.milestones];
        updatedMilestones[milestoneIndex].done = !updatedMilestones[milestoneIndex].done;
        
        await onUpdate(goal.id, { milestones: updatedMilestones });
    };

    const handleQuickAction = async (action) => {
        switch (action) {
            case "complete":
                await onUpdate(goal.id, { status: "completed" });
                break;
            case "archive":
                await onUpdate(goal.id, { status: "archived" });
                break;
            case "toggle-visibility":
                await onUpdate(goal.id, { visibility: goal.visibility === "public" ? "private" : "public" });
                break;
            case "delete":
                if (window.confirm("Are you sure you want to delete this goal?")) {
                    await onDelete(goal.id);
                    onClose();
                }
                break;
        }
    };

    if (isEditing) {
        return (
            <GoalForm
                goal={goal}
                onClose={handleCancelEdit}
                onGoalCreated={handleSave}
                keyAreas={keyAreas}
                isEditing={true}
            />
        );
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{goal.title}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                                        goal.status === "completed"
                                            ? "bg-green-100 text-green-800"
                                            : goal.status === "active"
                                              ? "bg-blue-100 text-blue-800"
                                              : "bg-slate-100 text-slate-800"
                                    }`}
                                >
                                    {goal.status}
                                </span>
                                {goal.visibility === "private" && <FaEyeSlash className="w-3 h-3 text-slate-400" />}
                                {isOverdue && <span className="text-xs text-red-600 font-medium">Overdue</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Quick Actions */}
                        <button
                            onClick={handleEdit}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Goal"
                        >
                            <FaEdit className="w-4 h-4" />
                        </button>

                        {goal.status === "active" && (
                            <button
                                onClick={() => handleQuickAction("complete")}
                                className="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Mark Complete"
                            >
                                <FaCheckCircle className="w-4 h-4" />
                            </button>
                        )}

                        <button
                            onClick={() => handleQuickAction("toggle-visibility")}
                            className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
                            title={goal.visibility === "public" ? "Make Private" : "Make Public"}
                        >
                            {goal.visibility === "public" ? (
                                <FaEyeSlash className="w-4 h-4" />
                            ) : (
                                <FaEye className="w-4 h-4" />
                            )}
                        </button>

                        {goal.status !== "archived" && (
                            <button
                                onClick={() => handleQuickAction("archive")}
                                className="p-2 text-slate-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                title="Archive Goal"
                            >
                                <FaArchive className="w-4 h-4" />
                            </button>
                        )}

                        <button
                            onClick={() => handleQuickAction("delete")}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Goal"
                        >
                            <FaTrash className="w-4 h-4" />
                        </button>

                        <div className="w-px h-6 bg-slate-200 mx-2" />

                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                            <FaTimes className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200">
                    <nav className="flex px-6">
                        {["overview", "milestones", "activity"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                                    activeTab === tab
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            {/* Progress Section */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-slate-700">Progress</span>
                                    <span className="text-sm font-bold text-blue-600">{progressPercent}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            progressPercent >= 90
                                                ? "bg-green-500"
                                                : progressPercent >= 70
                                                  ? "bg-blue-500"
                                                  : progressPercent >= 40
                                                    ? "bg-yellow-500"
                                                    : "bg-red-500"
                                        }`}
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-sm text-slate-600">
                                    <div className="flex items-center gap-1">
                                        <FaFlag className="w-3 h-3" />
                                        {completedMilestones}/{totalMilestones} milestones
                                    </div>
                                    <div className={`flex items-center gap-1 ${isOverdue ? "text-red-600" : ""}`}>
                                        <FaCalendarAlt className="w-3 h-3" />
                                        {new Date(goal.dueDate).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            {/* Goal Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Goal Information</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-sm font-medium text-slate-500">Description</label>
                                            <p className="text-slate-900">
                                                {goal.description || "No description provided"}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-500">Key Area</label>
                                            {editingKeyArea ? (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <select
                                                        value={tempKeyAreaId}
                                                        onChange={(e) => setTempKeyAreaId(e.target.value)}
                                                        className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="">No key area</option>
                                                        {keyAreas && keyAreas.map(area => (
                                                            <option key={area.id} value={area.id}>{area.name}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={handleKeyAreaSave}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                                    >
                                                        <FaSave className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={handleKeyAreaCancel}
                                                        className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                                                    >
                                                        <FaTimes className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between mt-1">
                                                    <p className="text-slate-900">{keyAreaName}</p>
                                                    <button
                                                        onClick={() => setEditingKeyArea(true)}
                                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    >
                                                        <FaEdit className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-500">Due Date</label>
                                            <p
                                                className={`text-slate-900 ${isOverdue ? "text-red-600 font-medium" : ""}`}
                                            >
                                                {new Date(goal.dueDate).toLocaleDateString()}
                                                {isOverdue && " (Overdue)"}
                                            </p>
                                        </div>
                                        {goal.startDate && (
                                            <div>
                                                <label className="text-sm font-medium text-slate-500">Start Date</label>
                                                <p className="text-slate-900">
                                                    {new Date(goal.startDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Status & Settings</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-sm font-medium text-slate-500">Status</label>
                                            <p className="text-slate-900 capitalize">{goal.status}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-500">Visibility</label>
                                            <p className="text-slate-900 capitalize">{goal.visibility}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-500">Created</label>
                                            <p className="text-slate-900">
                                                {goal.createdAt
                                                    ? new Date(goal.createdAt).toLocaleDateString()
                                                    : "Unknown"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "milestones" && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-900">Milestones</h3>
                                <span className="text-sm text-slate-500">
                                    {completedMilestones} of {totalMilestones} completed
                                </span>
                            </div>
                            
                            {goal.milestones && Array.isArray(goal.milestones) && goal.milestones.length > 0 ? (
                                <div className="space-y-4">
                                    {goal.milestones.map((milestone, idx) => (
                                        <div 
                                            key={milestone.id || idx} 
                                            className="group flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all"
                                        >
                                            <button
                                                onClick={() => handleMilestoneToggle(idx)}
                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    milestone.done
                                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                                        : "border-slate-300 hover:border-emerald-400 hover:bg-emerald-50"
                                                }`}
                                            >
                                                {milestone.done && <FaCheckCircle className="w-4 h-4" />}
                                            </button>
                                            
                                            <div className="flex-1">
                                                {editingMilestone === idx ? (
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="text"
                                                            value={tempMilestoneTitle}
                                                            onChange={(e) => setTempMilestoneTitle(e.target.value)}
                                                            className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleMilestoneSave(idx)}
                                                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                                        >
                                                            <FaSave className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={handleMilestoneCancel}
                                                            className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                                                        >
                                                            <FaTimes className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <p
                                                                className={`font-medium ${
                                                                    milestone.done
                                                                        ? "line-through text-slate-500"
                                                                        : "text-slate-900"
                                                                }`}
                                                            >
                                                                {milestone.title || 'Untitled milestone'}
                                                            </p>
                                                            {milestone.dueDate && (
                                                                <p className="text-sm text-slate-500 mt-1">
                                                                    Due: {new Date(milestone.dueDate).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                                                {milestone.weight || 1}x weight
                                                            </span>
                                                            <button
                                                                onClick={() => handleMilestoneEdit(idx)}
                                                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                            >
                                                                <FaEdit className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FaFlag className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <p className="text-slate-600 font-medium mb-2">No milestones defined</p>
                                    <p className="text-sm text-slate-500">
                                        Milestones help break down your goal into smaller, manageable tasks.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "activity" && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h3>
                            <p className="text-slate-500 text-center py-8">Activity tracking coming soon</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GoalDetailModal;
