import React from 'react';
import { FaTimes } from 'react-icons/fa';

/**
 * ActivityListPanel Component
 * 
 * Renders the right panel of the triple view with activity list content
 * for the selected task.
 */
export default function ActivityListPanel({
    children,
    selectedTask,
    onTaskDeselect,
    header,
}) {
    return (
        <div className="flex flex-col h-full">
            {/* Header with Close Button */}
            <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                <div className="flex-1">
                    {header ? (
                        header
                    ) : selectedTask ? (
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 truncate">
                                {selectedTask.title || 'Untitled Task'}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Activities
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">Activities</p>
                    )}
                </div>
                {onTaskDeselect && (
                    <button
                        type="button"
                        onClick={onTaskDeselect}
                        className="ml-2 p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Close activity panel"
                        aria-label="Close activity panel"
                    >
                        <FaTimes className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 p-4">
                {selectedTask ? (
                    children
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                        Select a task to view activities
                    </div>
                )}
            </div>
        </div>
    );
}
