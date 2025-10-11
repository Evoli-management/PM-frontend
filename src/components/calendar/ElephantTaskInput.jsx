import React, { useState, useEffect } from "react";
import elephantTaskService from "../../services/elephantTaskService";
import { useToast } from "../shared/ToastProvider";

const ElephantTaskInput = ({ viewType, dateStart, dateEnd, onTaskChange }) => {
    const [elephantTask, setElephantTask] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setSaving] = useState(false);
    const { addToast } = useToast();

    // Load elephant task for the current period
    useEffect(() => {
        const loadTask = async () => {
            setIsLoading(true);
            try {
                const task = await elephantTaskService.getCalendarElephantTask(
                    viewType,
                    dateStart,
                    dateEnd
                );
                setElephantTask(task?.elephantTask || "");
            } catch (error) {
                console.error("Error loading elephant task:", error);
            } finally {
                setIsLoading(false);
            }
        };
        
        if (dateStart && dateEnd && viewType) {
            loadTask();
        }
    }, [viewType, dateStart, dateEnd]);

    const handleSave = async () => {
        if (!elephantTask.trim()) {
            // Delete the task if empty
            try {
                setSaving(true);
                await elephantTaskService.deleteCalendarElephantTask(viewType, dateStart, dateEnd);
                setIsEditing(false);
                onTaskChange?.();
                addToast({
                    title: "Elephant task cleared",
                    variant: "success"
                });
            } catch (error) {
                console.error("Error deleting elephant task:", error);
                addToast({
                    title: "Failed to clear elephant task",
                    description: error.message,
                    variant: "error"
                });
            } finally {
                setSaving(false);
            }
            return;
        }

        try {
            setSaving(true);
            await elephantTaskService.upsertCalendarElephantTask(
                elephantTask.trim(),
                viewType,
                dateStart,
                dateEnd
            );
            setIsEditing(false);
            onTaskChange?.();
            addToast({
                title: "Elephant task saved",
                variant: "success"
            });
        } catch (error) {
            console.error("Error saving elephant task:", error);
            addToast({
                title: "Failed to save elephant task",
                description: error.message,
                variant: "error"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset to original value
        setIsEditing(false);
        // Reload the original task
        elephantTaskService.getCalendarElephantTask(viewType, dateStart, dateEnd)
            .then(task => setElephantTask(task?.elephantTask || ""))
            .catch(console.error);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && e.ctrlKey) {
            handleSave();
        } else if (e.key === "Escape") {
            handleCancel();
        }
    };

    if (isLoading) {
        return (
            <div className="w-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🐘</span>
                    <span className="text-sm text-gray-500">Loading elephant task...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 px-3 py-2 rounded-lg">
            <div className="flex items-start gap-2">
                <span className="text-lg mt-1" title="Elephant Task - Planning block">🐘</span>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-orange-700 uppercase tracking-wide">
                            {viewType} Elephant Task
                        </span>
                        {isEditing && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded disabled:opacity-50"
                                >
                                    {isSaving ? "Saving..." : "Save"}
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {isEditing ? (
                        <textarea
                            value={elephantTask}
                            onChange={(e) => setElephantTask(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={`What's your main focus for this ${viewType}?`}
                            className="w-full bg-white border border-orange-300 rounded px-2 py-1 text-sm resize-none"
                            rows={2}
                            autoFocus
                        />
                    ) : (
                        <div
                            onClick={() => setIsEditing(true)}
                            className="w-full min-h-[2rem] bg-white border border-orange-200 rounded px-2 py-1 text-sm cursor-pointer hover:border-orange-300 transition-colors"
                        >
                            {elephantTask || (
                                <span className="text-gray-400 italic">
                                    Click to add your {viewType} planning focus...
                                </span>
                            )}
                        </div>
                    )}
                    
                    {isEditing && (
                        <div className="text-xs text-gray-500 mt-1">
                            Ctrl+Enter to save • Esc to cancel
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ElephantTaskInput;