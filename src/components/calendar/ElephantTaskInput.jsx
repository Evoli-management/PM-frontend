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
    const isDayView = String(viewType || "").toLowerCase() === "day";
    const isWeekView = String(viewType || "").toLowerCase() === "week";
    const isMonthView = String(viewType || "").toLowerCase() === "month";
    const isQuarterView = String(viewType || "").toLowerCase() === "quarter";
    const isUnifiedRowView = isDayView || isWeekView || isMonthView || isQuarterView;

    const getDayMeta = (isoDate) => {
        try {
            const d = new Date(isoDate);
            if (Number.isNaN(d.getTime())) return { weekday: "", weekNumber: null, dayOfYear: null };

            const weekday = d.toLocaleDateString("en-US", { weekday: "long" });

            const startOfYear = new Date(d.getFullYear(), 0, 1);
            const dayOfYear = Math.floor((d - startOfYear) / 86400000) + 1;

            // ISO week number
            const utcDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            const dayNum = utcDate.getUTCDay() || 7;
            utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
            const weekNumber = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);

            return { weekday, weekNumber, dayOfYear };
        } catch (_) {
            return { weekday: "", weekNumber: null, dayOfYear: null };
        }
    };

    const dayMeta = getDayMeta(dateStart);

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
        if (isDayView && e.key === "Enter") {
            e.preventDefault();
            handleSave();
        } else if (e.key === "Enter" && e.ctrlKey) {
            handleSave();
        } else if (e.key === "Escape") {
            handleCancel();
        }
    };

    if (isLoading && !isUnifiedRowView) {
        return (
            <div className="w-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🐘</span>
                    <span className="text-sm text-gray-500">Loading elephant task...</span>
                </div>
            </div>
        );
    }

    if (isUnifiedRowView) {
        return (
            <div className="w-full border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 flex items-center h-[48px] rounded-lg overflow-hidden">
                <div className="w-[68px] self-stretch bg-orange-100/80 flex items-center justify-center text-orange-500 text-2xl select-none">
                    🐘
                </div>
                <input
                    id="vpc-elephant-task-input"
                    type="text"
                    className="vpc-elephant-task-input form-control flex-1 h-[34px] mx-2 px-3 bg-white border border-orange-200 rounded text-[14px] md:text-[15px] leading-tight text-[#7a8790] placeholder:text-gray-400 placeholder:italic outline-none cursor-text"
                    placeholder="Enter your elephant task..."
                    value={isEditing ? draft : (elephantTask || "")}
                    disabled={isLoading}
                    onFocus={() => {
                        setDraft(elephantTask || "");
                        setIsEditing(true);
                    }}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleSave();
                        } else if (e.key === "Escape") {
                            e.preventDefault();
                            handleCancel();
                        }
                    }}
                    onBlur={() => {
                        if (isEditing) handleSave();
                    }}
                />
                {isDayView ? (
                    <div className="w-[170px] sm:w-[220px] self-stretch px-3 py-0.5 text-right flex flex-col justify-center">
                        <div className="text-[13px] md:text-[14px] leading-tight font-semibold text-[#1f2937]">{dayMeta.weekday || "Day"}</div>
                        <div className="text-[12px] md:text-[13px] leading-tight text-[#111827]">
                            Week: {dayMeta.weekNumber ?? "--"} / Day: {dayMeta.dayOfYear ?? "--"}
                        </div>
                    </div>
                ) : null}
                {isWeekView ? (
                    <div className="w-[120px] sm:w-[160px] self-stretch px-3 py-0.5 text-right flex items-center justify-end">
                        <div className="text-[13px] md:text-[14px] leading-tight font-semibold text-[#1f2937]">
                            Week: {dayMeta.weekNumber ?? "--"}
                        </div>
                    </div>
                ) : null}
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
