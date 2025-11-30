import React, { useState, useEffect, useRef } from "react";
import elephantTaskService from "../../services/elephantTaskService";
import { useToast } from "../shared/ToastProvider";

const ElephantTaskInput = ({ viewType, dateStart, dateEnd, onTaskChange }) => {
    const [elephantTask, setElephantTask] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setSaving] = useState(false);
    const { addToast } = useToast();

    const contentRef = useRef(null);

    // when entering edit mode focus and place caret at end
    useEffect(() => {
        if (isEditing && contentRef.current) {
            const el = contentRef.current;
            // initialize editable content once when entering edit mode
            el.innerText = draft || elephantTask || "";
            el.focus();
            try {
                const range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(false);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (err) {
                // ignore selection errors
            }
        }
    }, [isEditing, draft, elephantTask]);

    // Use a draft state while editing to avoid committing every keystroke to
    // the main `elephantTask` state. We update `draft` on input and only
    // persist to `elephantTask` on save. This prevents cursor jumps and
    // reduces re-render churn while typing.

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
        const value = (draft || "").trim();
        if (!value) {
            // Delete the task if empty
            try {
                setSaving(true);
                await elephantTaskService.deleteCalendarElephantTask(viewType, dateStart, dateEnd);
                setIsEditing(false);
                setDraft("");
                setElephantTask("");
                onTaskChange?.();
                addToast({ title: "Elephant task cleared", variant: "success" });
            } catch (error) {
                console.error("Error deleting elephant task:", error);
                addToast({ title: "Failed to clear elephant task", description: error.message, variant: "error" });
            } finally {
                setSaving(false);
            }
            return;
        }

        try {
            setSaving(true);
            await elephantTaskService.upsertCalendarElephantTask(value, viewType, dateStart, dateEnd);
            setIsEditing(false);
            setElephantTask(value);
            setDraft(value);
            onTaskChange?.();
            addToast({ title: "Elephant task saved", variant: "success" });
        } catch (error) {
            console.error("Error saving elephant task:", error);
            addToast({ title: "Failed to save elephant task", description: error.message, variant: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        // Discard draft and stop editing
        setDraft(elephantTask || "");
        setIsEditing(false);
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
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            

                            {/* Wrapper keeps the original visual markup; editable area is an inner element so we can place buttons inside the same bordered box. */}
                            <div className="w-full min-h-[1.5rem] bg-white border border-orange-200 rounded px-2 py-1 text-sm cursor-text hover:border-orange-300 transition-colors relative" aria-label={`${viewType} elephant task input`}> 
                                <div
                                    ref={contentRef}
                                    onClick={() => { setDraft(elephantTask || ""); setIsEditing(true); }}
                                    onInput={(e) => setDraft(e.currentTarget.innerText)}
                                    onKeyDown={handleKeyDown}
                                    contentEditable={isEditing}
                                    suppressContentEditableWarning={true}
                                    className="w-full min-h-[1.5rem] bg-transparent text-sm outline-none pr-20"
                                    aria-label={`${viewType} elephant task editable`}
                                >
                                    {/* When not editing render the stable text via React so it's
                                        part of the virtual DOM. When editing we leave the DOM
                                        unmanaged (we set innerText once in the effect) and
                                        update `draft` from onInput to avoid cursor jumps. */}
                                    {!isEditing ? (
                                        ((elephantTask || "").trim() === "") ? (
                                            <span className="text-gray-400 italic">
                                                Click to add your {viewType} planning focus...
                                            </span>
                                        ) : (
                                            elephantTask
                                        )
                                    ) : null}
                                </div>

                                {/* Buttons moved outside contentEditable wrapper (rendered as sibling) */}
                            </div>
                        </div>

                        {/* Buttons placed as a sibling so they sit in the same row as the editable box */}
                                <div className="flex items-center gap-2 p-0.5 self-end">
                            <button
                                onClick={handleSave}
                                disabled={!isEditing || isSaving}
                                        className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 h-[1.5rem] flex items-center rounded disabled:opacity-50"
                                aria-label="Save elephant task"
                            >
                                {isSaving ? "Saving..." : "Save"}
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={!isEditing || isSaving}
                                        className="text-xs text-gray-500 hover:text-gray-700 px-2 h-[1.5rem] flex items-center rounded disabled:opacity-50"
                                aria-label="Cancel editing elephant task"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                    
                    {/* helper text removed per request */}
                </div>
            </div>
        </div>
    );
};

export default ElephantTaskInput;