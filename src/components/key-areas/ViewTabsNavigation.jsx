import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * ViewTabsNavigation - Main view tabs for Key Areas page
 */
export default function ViewTabsNavigation({ 
    viewTab, 
    setViewTab, 
    activeFilter, 
    setActiveFilter,
    pendingDelegationsCount = 0
}) {
    const [openActiveMenu, setOpenActiveMenu] = useState(false);
    const activeMenuRef = useRef(null);
    const activeTasksLabel = activeFilter === 'all' ? 'ALL TASKS' : 'ACTIVE TASKS';
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (activeMenuRef.current && !activeMenuRef.current.contains(e.target)) {
                setOpenActiveMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="bg-white border-b border-slate-200 px-4 py-0 shadow-sm">
            <div className="flex items-center gap-4">
                {/* ACTIVE/ALL dropdown */}
                <div className="relative" ref={activeMenuRef}>
                    <button
                        type="button"
                        onClick={() => setOpenActiveMenu((prev) => !prev)}
                        className={`px-2 py-2 rounded text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
                            viewTab === 'active-tasks'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Active tasks filter"
                    >
                        {activeTasksLabel}
                        <span className="text-[10px]">▾</span>
                    </button>
                    {openActiveMenu && (
                        <div className="absolute left-0 mt-2 w-36 rounded-md border border-gray-200 bg-white shadow-lg z-50">
                            <button
                                type="button"
                                onClick={() => {
                                    setViewTab('active-tasks');
                                    setActiveFilter('active');
                                    setOpenActiveMenu(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                                    viewTab === 'active-tasks' && activeFilter === 'active'
                                        ? 'text-blue-600'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                ACTIVE TASKS
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setViewTab('active-tasks');
                                    setActiveFilter('all');
                                    setOpenActiveMenu(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                                    viewTab === 'active-tasks' && activeFilter === 'all'
                                        ? 'text-blue-600'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                ALL TASKS
                            </button>
                        </div>
                    )}
                </div>

                {/* DELEGATED Tab */}
                <button
                    type="button"
                    onClick={() => {
                        setViewTab('delegated');
                        const params = new URLSearchParams(location.search);
                        params.set('view', 'delegated');
                        navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
                    }}
                    className={`px-2 py-2 rounded text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                        viewTab === 'delegated'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Show delegated tasks"
                >
                    DELEGATED
                    {pendingDelegationsCount > 0 && (
                        <span className="inline-block px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                            {pendingDelegationsCount}
                        </span>
                    )}
                </button>
                
                {/* TO-DO Tab */}
                <button
                    type="button"
                    onClick={() => {
                        setViewTab('todo');
                        const params = new URLSearchParams(location.search);
                        params.set('view', 'todo');
                        navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
                    }}
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
                    onClick={() => {
                        setViewTab('activity-trap');
                        const params = new URLSearchParams(location.search);
                        params.set('view', 'activity-trap');
                        navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
                    }}
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
                    onClick={() => {
                        setViewTab('my-focus');
                        const params = new URLSearchParams(location.search);
                        params.set('view', 'my-focus');
                        navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
                    }}
                    className={`px-2 py-2 rounded text-xs font-semibold whitespace-nowrap transition ${
                        viewTab === 'my-focus'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Show My Focus (Eisenhower matrix)"
                >
                    MY FOCUS
                </button>
            </div>
        </div>
    );
}
