import React from 'react';

/**
 * ViewTabsNavigation - Main view tabs for Key Areas page
 * Matches legacy UI pattern with tabs: ACTIVE TASKS, DELEGATED, TO-DO, ACTIVITY TRAP, MY FOCUS
 */
export default function ViewTabsNavigation({ viewTab, setViewTab, activeFilter, setActiveFilter }) {
    return (
        <div className="bg-gradient-to-r from-cyan-400 to-cyan-500 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 overflow-x-auto">
                {/* ACTIVE TASKS Tab */}
                <button
                    type="button"
                    onClick={() => setViewTab('active-tasks')}
                    className={`px-3 py-1.5 rounded text-sm font-semibold whitespace-nowrap transition ${
                        viewTab === 'active-tasks'
                            ? 'bg-white text-slate-900 shadow'
                            : 'bg-transparent text-white hover:bg-cyan-600'
                    }`}
                >
                    ACTIVE TASKS
                </button>
                
                {/* DELEGATED Tab */}
                <button
                    type="button"
                    onClick={() => setViewTab('delegated')}
                    className={`px-3 py-1.5 rounded text-sm font-semibold whitespace-nowrap transition ${
                        viewTab === 'delegated'
                            ? 'bg-white text-slate-900 shadow'
                            : 'bg-transparent text-white hover:bg-cyan-600'
                    }`}
                    title="Show delegated tasks"
                >
                    DELEGATED
                </button>
                
                {/* TO-DO Tab */}
                <button
                    type="button"
                    onClick={() => setViewTab('todo')}
                    className={`px-3 py-1.5 rounded text-sm font-semibold whitespace-nowrap transition ${
                        viewTab === 'todo'
                            ? 'bg-white text-slate-900 shadow'
                            : 'bg-transparent text-white hover:bg-cyan-600'
                    }`}
                    title="Show to-do items"
                >
                    TO-DO (RED)
                </button>
                
                {/* ACTIVITY TRAP Tab */}
                <button
                    type="button"
                    onClick={() => setViewTab('activity-trap')}
                    className={`px-3 py-1.5 rounded text-sm font-semibold whitespace-nowrap transition ${
                        viewTab === 'activity-trap'
                            ? 'bg-white text-slate-900 shadow'
                            : 'bg-transparent text-white hover:bg-cyan-600'
                    }`}
                    title="Show tasks without goal assignment"
                >
                    ACTIVITY TRAP
                </button>
                
                {/* MY FOCUS Tab */}
                <button
                    type="button"
                    onClick={() => setViewTab('my-focus')}
                    className={`px-3 py-1.5 rounded text-sm font-semibold whitespace-nowrap transition ${
                        viewTab === 'my-focus'
                            ? 'bg-white text-slate-900 shadow'
                            : 'bg-transparent text-white hover:bg-cyan-600'
                    }`}
                    title="Show My Focus (Eisenhower matrix)"
                >
                    MY FOCUS
                </button>
                
                {/* Sub-filter: Active / All Tasks (only visible when in ACTIVE TASKS tab) */}
                {viewTab === 'active-tasks' && (
                    <div className="ml-4 flex items-center gap-2">
                        <select
                            value={activeFilter}
                            onChange={(e) => setActiveFilter(e.target.value)}
                            className="px-2 py-1 border border-cyan-300 rounded text-sm bg-white hover:border-cyan-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="active">Active tasks</option>
                            <option value="all">All tasks</option>
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
}
