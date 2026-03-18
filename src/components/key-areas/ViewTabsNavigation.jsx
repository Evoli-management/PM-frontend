import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const [openActiveMenu, setOpenActiveMenu] = useState(false);
    const activeMenuRef = useRef(null);
    const activeTasksLabel = activeFilter === 'completed'
        ? t("viewTabsNavigation.completedTasks")
        : activeFilter === 'all'
            ? t("viewTabsNavigation.allTasks")
            : t("viewTabsNavigation.activeTasks");
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
                                {t("viewTabsNavigation.activeTasks")}
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
                                {t("viewTabsNavigation.allTasks")}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setViewTab('active-tasks');
                                    setActiveFilter('completed');
                                    setOpenActiveMenu(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                                    viewTab === 'active-tasks' && activeFilter === 'completed'
                                        ? 'text-blue-600'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {t("viewTabsNavigation.completedTasks")}
                            </button>
                        </div>
                    )}
                </div>

                {/* DELEGATED Tab */}
                <button
                    type="button"
                    onClick={() => {
                        setViewTab('delegated');
                    }}
                    className={`px-2 py-2 rounded text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                        viewTab === 'delegated'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Show delegated tasks"
                >
                    {t("viewTabsNavigation.delegated")}
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
                    }}
                    className={`px-2 py-2 rounded text-xs font-semibold whitespace-nowrap transition ${
                        viewTab === 'todo'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Show to-do items"
                >
                    {t("viewTabsNavigation.todo")}
                </button>
                
                {/* ACTIVITY TRAP Tab */}
                <button
                    type="button"
                    onClick={() => {
                        setViewTab('activity-trap');
                    }}
                    className={`px-2 py-2 rounded text-xs font-semibold whitespace-nowrap transition ${
                        viewTab === 'activity-trap'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Show tasks without goal assignment"
                >
                    {t("viewTabsNavigation.activityTrap")}
                </button>
                
                {/* MY FOCUS Tab */}
                <button
                    type="button"
                    onClick={() => {
                        // my-focus is a separate route; we keep the viewTab state update for local UI,
                        // but the useKeyAreasPageSync hook will navigate to /my-focus automatically.
                        setViewTab('my-focus');
                    }}
                    className={`px-2 py-2 rounded text-xs font-semibold whitespace-nowrap transition ${
                        viewTab === 'my-focus'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Show My Focus (Eisenhower matrix)"
                >
                    {t("viewTabsNavigation.myFocus")}
                </button>
            </div>
        </div>
    );
}
