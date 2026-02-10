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
                className="overflow-auto bg-white"
                style={{
                    width: `${taskWidth}%`,
                    borderRight: '1px solid #e2e8f0',
                    transition: isDragging ? 'none' : 'width 0.2s ease',
                }}
            >
                {taskPanel}
            </div>

            {/* Divider */}
            <div
                className={`w-1 bg-slate-200 hover:bg-blue-400 cursor-col-resize transition-colors ${
                    isDragging ? 'bg-blue-500' : ''
                }`}
                onMouseDown={() => setIsDragging(true)}
                aria-label="Resize divider"
                role="separator"
                style={{
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                }}
            />

            {/* Right Panel - Activities */}
            <div
                className="overflow-auto bg-slate-50"
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
