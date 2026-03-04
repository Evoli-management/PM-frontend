import React, { useRef, useState, useEffect } from 'react';

/**
 * ResizablePanels Component
 * 
 * A simpler implementation of the triple-view that works well with
 * existing KeyAreas task rendering without major refactoring.
 * 
 * Uses CSS Grid to create a resizable two-panel layout
 */
export default function ResizablePanels({
    taskPanel,
    activityPanel,
    initialTaskWidth = 50,
    minTaskWidth = 25,
    minActivityWidth = 25,
    leftPanelScrollable = true,
    rightPanelScrollable = true,
}) {
    const [taskWidth, setTaskWidth] = useState(initialTaskWidth);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const newPercentage = ((e.clientX - rect.left) / rect.width) * 100;

            if (
                newPercentage >= minTaskWidth &&
                newPercentage <= 100 - minActivityWidth
            ) {
                setTaskWidth(newPercentage);
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
    }, [isDragging, minTaskWidth, minActivityWidth]);

    const activityWidth = 100 - taskWidth;

    return (
        <div
            ref={containerRef}
            className="flex w-full h-full gap-0"
            style={{ position: 'relative' }}
        >
            {/* Left Panel - Tasks */}
            <div
                className={`${leftPanelScrollable ? 'overflow-auto' : 'overflow-hidden'} bg-white h-full min-h-0`}
                style={{
                    width: `${taskWidth}%`,
                    transition: isDragging ? 'none' : 'width 0.2s ease',
                }}
            >
                {taskPanel}
            </div>

            {/* Divider */}
            <div
                className="relative w-0 flex-shrink-0"
                aria-label="Resize divider"
                role="separator"
                style={{
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                }}
            >
                <div
                    className={`absolute left-0 top-0 h-full w-px transition-colors ${
                        isDragging ? 'bg-blue-500' : 'bg-slate-300'
                    }`}
                    aria-hidden="true"
                />
                <div
                    className={`absolute -left-1.5 top-0 h-full w-3 cursor-col-resize transition-colors ${
                        isDragging ? 'bg-blue-200/40' : 'hover:bg-sky-100/50'
                    }`}
                    onMouseDown={() => setIsDragging(true)}
                    aria-hidden="true"
                />
            </div>

            {/* Right Panel - Activities */}
            <div
                className={`${rightPanelScrollable ? 'overflow-auto' : 'overflow-hidden'} bg-slate-50 h-full min-h-0`}
                style={{
                    width: `${activityWidth}%`,
                    transition: isDragging ? 'none' : 'width 0.2s ease',
                }}
            >
                {activityPanel}
            </div>
        </div>
    );
}
