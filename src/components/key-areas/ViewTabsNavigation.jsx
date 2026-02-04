import React from 'react';
import { FaSearch, FaCog } from 'react-icons/fa';

/**
 * ViewTabsNavigation - Main view tabs for Key Areas page
 * Now integrates into header with search for compact layout
 */
export default function ViewTabsNavigation({ 
    viewTab, 
    setViewTab, 
    activeFilter, 
    setActiveFilter,
    searchValue = '',
    onSearchChange = () => {},
    onSettingsClick = () => {}
}) {
    return (
        <div className="bg-white border-b border-slate-200 px-4 py-0 shadow-sm">
            <div className="flex items-center gap-4">
                {/* DELEGATED Tab */}
                <button
                    type="button"
                    onClick={() => setViewTab('delegated')}
                    className={`px-2 py-2 rounded text-xs font-semibold whitespace-nowrap transition ${
                        viewTab === 'delegated'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Show delegated tasks"
                >
                    DELEGATED
                </button>
                
                {/* TO-DO Tab */}
                <button
                    type="button"
                    onClick={() => setViewTab('todo')}
                    className={`px-2 py-2 rounded text-xs font-semibold whitespace-nowrap transition ${
                        viewTab === 'todo'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Show to-do items"
                >
                    TO-DO (RED)
                </button>
                
                {/* ACTIVITY TRAP Tab */}
                <button
                    type="button"
                    onClick={() => setViewTab('activity-trap')}
                    className={`px-2 py-2 rounded text-xs font-semibold whitespace-nowrap transition ${
                        viewTab === 'activity-trap'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Show tasks without goal assignment"
                >
                    ACTIVITY TRAP
                </button>
                
                {/* MY FOCUS Tab */}
                <button
                    type="button"
                    onClick={() => setViewTab('my-focus')}
                    className={`px-2 py-2 rounded text-xs font-semibold whitespace-nowrap transition ${
                        viewTab === 'my-focus'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Show My Focus (Eisenhower matrix)"
                >
                    MY FOCUS
                </button>

                {/* Spacer */}
                <div className="flex-1"></div>

                {/* Search Box */}
                <div className="flex items-center bg-slate-50 rounded-lg px-2 py-1 border border-slate-200">
                    <FaSearch className="text-slate-500 mr-1.5 text-xs" />
                    <input
                        placeholder="Search…"
                        className="bg-transparent outline-none text-xs w-24 sm:w-32"
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                {/* Settings Icon */}
                <button
                    type="button"
                    onClick={onSettingsClick}
                    className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                    aria-label="Settings"
                    title="Column settings"
                >
                    <FaCog className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
