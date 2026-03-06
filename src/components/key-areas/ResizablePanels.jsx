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
    mode = 'triple',
    simpleActivePanel = 'task',
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
    const isSimpleMode = mode === 'simple';

    return (
        <div
            ref={containerRef}
            className="flex w-full h-full gap-0 rounded-xl overflow-hidden bg-white"
            style={{ position: 'relative' }}
        >
            {/* Left Panel - Tasks */}
            <div
                className={`${leftPanelScrollable ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'} ${isSimpleMode && simpleActivePanel === 'activity' ? 'bg-slate-50' : 'bg-white'} h-full min-h-0`}
                style={{
                    width: isSimpleMode ? '100%' : `${taskWidth}%`,
                    transition: isDragging ? 'none' : 'width 0.2s ease',
                }}
            >
                {isSimpleMode && simpleActivePanel === 'activity' ? activityPanel : taskPanel}
            </div>

            {!isSimpleMode && (
                <>
                    {/* Divider */}
                    <div
                        className="group relative w-0 flex-shrink-0 mx-0"
                        aria-label="Resize divider"
                        role="separator"
                        style={{
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                        }}
                    >
                        <div
                            className={`absolute left-0 top-[13px] bottom-3 w-px transition-colors ${
                                isDragging ? 'bg-blue-400/80' : 'bg-transparent group-hover:bg-blue-400/80'
                            }`}
                            aria-hidden="true"
                        />
                        <div
                            className="absolute -left-1.5 top-[13px] bottom-3 w-3 cursor-col-resize"
                            onMouseDown={() => setIsDragging(true)}
                            aria-hidden="true"
                        />
                    </div>

                    {/* Right Panel - Activities */}
                    <div
                        className={`${rightPanelScrollable ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'} bg-slate-50 h-full min-h-0`}
                        style={{
                            width: `${activityWidth}%`,
                            transition: isDragging ? 'none' : 'width 0.2s ease',
                        }}
                    >
                        {activityPanel}
                    </div>
                </>
            )}
        </div>
    );
}
