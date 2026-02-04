import React from 'react';

/**
 * ViewTabsNavigation - Main view tabs for Key Areas page
 * Matches legacy UI pattern with tabs: ACTIVE TASKS, DELEGATED, TO-DO, ACTIVITY TRAP, MY FOCUS
 */
export default function ViewTabsNavigation({ viewTab, setViewTab, activeFilter, setActiveFilter }) {
    return (
        <div className="bg-gradient-to-r from-cyan-400 to-cyan-500 px-4 py-2 shadow-sm">
            <div className="flex items-center gap-2 overflow-x-auto flex-wrap">
                {/* DELEGATED Tab */}
                <button
                    type="button"
                    onClick={() => setViewTab('delegated')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition ${
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
                    className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition ${
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
                    className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition ${
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
                    className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition ${
                        viewTab === 'my-focus'
                            ? 'bg-white text-slate-900 shadow'
                            : 'bg-transparent text-white hover:bg-cyan-600'
                    }`}
                    title="Show My Focus (Eisenhower matrix)"
                >
                    MY FOCUS
                </button>
            </div>
        </div>
    );
}
