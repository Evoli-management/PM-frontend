import React from 'react';
import { FaPlus } from 'react-icons/fa';

/**
 * TaskListPanel Component
 * 
 * Renders the left panel of the triple view with task list content
 * and an "Add Task" button footer.
 */
export default function TaskListPanel({
    children,
    selectedKA,
    onAddTask,
    tasksLoading = false,
    header,
}) {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            {header && (
                <div className="px-4 py-3 border-b border-slate-200 bg-white">
                    {header}
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
                {tasksLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-slate-500 text-sm">Loading tasks...</div>
                    </div>
                ) : (
                    children
                )}
            </div>

            {/* Footer with Add Task Button */}
            {selectedKA && (
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                    <button
                        type="button"
                        onClick={onAddTask}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        aria-label="Add task"
                    >
                        <FaPlus className="w-3.5 h-3.5" />
                        Add Task
                    </button>
                </div>
            )}
        </div>
    );
}
