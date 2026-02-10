import React, { useState, useRef, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

/**
 * TripleViewLayout Component
 * 
 * Provides a three-panel layout:
 * - Left: Fixed sidebar (managed externally)
 * - Middle-Left: Task list panel
 * - Middle-Right: Activity/Detail panel
 * 
 * The two middle panels can be resized via a draggable divider.
 */
export default function TripleViewLayout({
    taskListContent,
    activityListContent,
    selectedTask,
    onTaskSelect,
    className = '',
    taskPanelMinWidth = 300,
    activityPanelMinWidth = 300,
    defaultTaskWidth = '50%',
}) {
    const [taskPanelWidth, setTaskPanelWidth] = useState(defaultTaskWidth);
    const [isDragging, setIsDragging] = useState(false);
    const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
    const containerRef = useRef(null);
    const dividerRef = useRef(null);

    // Handle divider drag
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const newWidth = e.clientX - rect.left;
            const containerWidth = rect.width;

            // Ensure minimum widths
            if (newWidth >= taskPanelMinWidth && containerWidth - newWidth >= activityPanelMinWidth) {
                setTaskPanelWidth(`${(newWidth / containerWidth) * 100}%`);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, taskPanelMinWidth, activityPanelMinWidth]);

    return (
        <div
            ref={containerRef}
            className={`flex w-full h-full bg-white ${className}`}
        >
            {/* Task List Panel (Left) */}
            <div
                className="flex flex-col border-r border-slate-200 overflow-hidden"
                style={{
                    width: taskPanelWidth,
                    minWidth: `${taskPanelMinWidth}px`,
                }}
            >
                {taskListContent}
            </div>

            {/* Divider */}
            <div
                ref={dividerRef}
                className={`w-1 bg-slate-200 hover:bg-blue-400 cursor-col-resize transition-colors ${
                    isDragging ? 'bg-blue-500' : ''
                }`}
                onMouseDown={() => setIsDragging(true)}
                aria-label="Resize divider"
                role="separator"
            />

            {/* Activity List Panel (Right) */}
            {!isRightPanelCollapsed && (
                <div
                    className="flex flex-col flex-1 overflow-hidden bg-slate-50"
                    style={{
                        minWidth: `${activityPanelMinWidth}px`,
                    }}
                >
                    <div className="flex-1 overflow-auto">
                        {selectedTask ? (
                            activityListContent
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500 text-center p-4">
                                <div>
                                    <p className="text-lg font-medium mb-2">Select a task</p>
                                    <p className="text-sm">Choose a task from the left panel to view its activities</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Collapse/Expand Toggle */}
            {isRightPanelCollapsed && (
                <button
                    onClick={() => setIsRightPanelCollapsed(false)}
                    className="w-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 border-l border-slate-200 transition-colors"
                    title="Expand activity panel"
                    aria-label="Expand activity panel"
                >
                    <FaChevronLeft className="w-3 h-3 text-slate-600" />
                </button>
            )}

            {!isRightPanelCollapsed && (
                <button
                    onClick={() => setIsRightPanelCollapsed(true)}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-l bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors z-10"
                    title="Collapse activity panel"
                    aria-label="Collapse activity panel"
                    style={{ transform: 'translateY(-50%) translateX(0)' }}
                >
                    <FaChevronRight className="w-3 h-3 text-slate-600" />
                </button>
            )}
        </div>
    );
}
