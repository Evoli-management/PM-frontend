import React from 'react';
import { FaBars, FaChevronLeft, FaChevronDown } from 'react-icons/fa';
import ViewTabsNavigation from './ViewTabsNavigation';

export default function KeyAreasHeaderBar({
    activeFilter,
    setActiveFilter,
    allStatusesSelected,
    canAdd,
    columnsMenuRef,
    filterAssignee,
    filterStatuses,
    getPriorityLevel,
    isGlobalTasksView,
    pendingDelegationsCount,
    panelViewMenuRef,
    panelViewMode,
    selectedKA,
    selectedTaskFull,
    selectedTaskInPanel,
    setEditing,
    setFilterAssignee,
    setMobileSidebarOpen,
    setPanelViewMode,
    setSelectedTaskInPanel,
    setShowColumnsMenu,
    setShowForm,
    setShowPanelViewMenu,
    setShowStatusMenu,
    setSortBy,
    setViewTab,
    showAllKeyAreas,
    showColumnsMenu,
    showOnlyIdeas,
    showPanelViewMenu,
    showStatusMenu,
    sortBy,
    statusFilterLabel,
    statusFilterOptions,
    statusMenuRef,
    t,
    toggleStatusFilter,
    users,
    viewTab,
    visibleColumns,
    setVisibleColumns,
    navigate,
}) {
    const title =
        viewTab === 'delegated'
            ? 'Delegated Tasks'
            : viewTab === 'todo'
                ? 'To-Do (All Tasks)'
                : viewTab === 'activity-trap'
                    ? 'Activity Trap'
                    : selectedKA?.title || '';

    return (
        <>
            <div className="md:hidden">
                <ViewTabsNavigation
                    viewTab={viewTab}
                    setViewTab={setViewTab}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    pendingDelegationsCount={pendingDelegationsCount}
                />
            </div>

            <div
                className="flex items-center justify-between gap-3 mb-4"
                style={{ display: selectedTaskFull ? 'none' : undefined }}
            >
                {!selectedKA && !isGlobalTasksView ? (
                    <div className="flex items-center gap-3 w-full">
                        <h1 className="text-2xl font-bold text-slate-900">{t('keyAreas.title')}</h1>
                        <div className="ml-auto flex items-center gap-2">
                            {!showOnlyIdeas && (
                                <>
                                    <button
                                        className={`flex items-center gap-2 rounded-lg font-semibold shadow px-2 py-1 text-sm border border-slate-200 ${
                                            canAdd
                                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                        }`}
                                        onClick={() => canAdd && (setShowForm(true), setEditing(null))}
                                        disabled={!canAdd}
                                        title={
                                            canAdd
                                                ? undefined
                                                : 'Limit reached: You can have up to 9 custom Key Areas (Ideas is fixed as the 10th).'
                                        }
                                    >
                                        New Key Area
                                    </button>
                                    {!canAdd && (
                                        <span className="text-xs text-slate-500">Max 10 Key Areas reached.</span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-2 w-full">
                        <button
                            className="md:hidden p-2 rounded-lg bg-white border border-slate-200 mr-2"
                            onClick={() => setMobileSidebarOpen(true)}
                            aria-label="Open menu"
                        >
                            <FaBars />
                        </button>

                        {selectedKA && !(panelViewMode === 'simple' && selectedTaskInPanel) && (
                            <button
                                className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                                aria-label="Back"
                                style={{ minWidth: 36, minHeight: 36 }}
                                onClick={() => {
                                    showAllKeyAreas();
                                    navigate('/key-areas', { replace: true });
                                }}
                            >
                                <FaChevronLeft />
                            </button>
                        )}

                        {(selectedKA || isGlobalTasksView) && (
                            <div className="inline-flex items-center gap-1">
                                <img
                                    alt="Key Areas"
                                    className="w-7 h-7 md:w-8 md:h-8 object-contain"
                                    src={`${import.meta.env.BASE_URL}key-area.png`}
                                    onError={(e) => {
                                        if (e?.currentTarget) e.currentTarget.src = '/key-area.png';
                                    }}
                                />
                                <span
                                    className="relative text-base md:text-lg font-bold text-slate-900 truncate px-1"
                                    style={{ color: (selectedKA && selectedKA.color) || '#1F2937' }}
                                >
                                    {title}
                                </span>
                            </div>
                        )}

                        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                            {selectedKA && viewTab !== 'delegated' && viewTab !== 'todo' && viewTab !== 'activity-trap' && (
                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-600">Sort by:</span>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="border border-slate-200 rounded px-2 py-0.5 text-sm bg-white w-[100px]"
                                        >
                                            <option value="manual">{t('keyAreas.sortManual')}</option>
                                            <option value="date">{t('keyAreas.sortDate')}</option>
                                            <option value="priority">{t('keyAreas.sortPriority')}</option>
                                            <option value="status">{t('keyAreas.sortStatus')}</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-600">Status:</span>
                                        <div className="relative" ref={statusMenuRef}>
                                            <button
                                                type="button"
                                                onClick={() => setShowStatusMenu((s) => !s)}
                                                className="border border-slate-200 rounded px-2 py-0.5 text-sm bg-white min-w-[100px] inline-flex items-center justify-between gap-2"
                                                aria-haspopup="menu"
                                                aria-expanded={showStatusMenu ? 'true' : 'false'}
                                            >
                                                <span className="truncate">{statusFilterLabel}</span>
                                                <span className="text-[10px]">▾</span>
                                            </button>
                                            {showStatusMenu && (
                                                <div className="absolute right-0 mt-1 w-44 rounded-md border border-slate-200 bg-white shadow-lg z-50 p-2">
                                                    <label className="flex items-center gap-2 px-1 py-1 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={allStatusesSelected}
                                                            onChange={() => toggleStatusFilter('all')}
                                                        />
                                                        <span>All</span>
                                                    </label>
                                                    {statusFilterOptions.map((option) => (
                                                        <label key={option.value} className="flex items-center gap-2 px-1 py-1 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={filterStatuses.includes(option.value)}
                                                                onChange={() => toggleStatusFilter(option.value)}
                                                            />
                                                            <span>{option.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-600">Responsible:</span>
                                        <select
                                            value={filterAssignee}
                                            onChange={(e) => setFilterAssignee(e.target.value)}
                                            className="border border-slate-200 rounded px-2 py-0.5 text-sm bg-white w-[100px]"
                                        >
                                            <option value="">All</option>
                                            {(users || []).map((u) => (
                                                <option key={u.id} value={String(u.id)}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {selectedKA && viewTab !== 'delegated' && viewTab !== 'todo' && viewTab !== 'activity-trap' && (
                                <div className="relative" ref={panelViewMenuRef}>
                                    <button
                                        type="button"
                                        className="day-header-btn px-2 py-0 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center gap-2 focus:outline-none focus:ring-0 focus:border-slate-300"
                                        style={{ minWidth: 32, minHeight: 30, outline: 'none', boxShadow: 'none' }}
                                        onClick={() => setShowPanelViewMenu((s) => !s)}
                                        aria-haspopup="menu"
                                        aria-expanded={showPanelViewMenu ? 'true' : 'false'}
                                    >
                                        <span>View</span>
                                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                            {panelViewMode === 'triple' ? t('keyAreas.viewTriple') : t('keyAreas.viewSimple')}
                                        </span>
                                        <FaChevronDown className={`${showPanelViewMenu ? 'rotate-180' : 'rotate-0'} transition-transform`} />
                                    </button>
                                    {showPanelViewMenu && (
                                        <div role="menu" className="absolute right-0 z-50 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                                            {['triple', 'simple'].map((mode) => (
                                                <button
                                                    key={mode}
                                                    role="menuitemradio"
                                                    aria-checked={panelViewMode === mode}
                                                    className={`w-full text-left px-3 py-2 text-sm ${
                                                        panelViewMode === mode ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                    onClick={() => {
                                                        setPanelViewMode(mode);
                                                        setShowPanelViewMenu(false);
                                                    }}
                                                >
                                                    {mode === 'triple' ? t('keyAreas.viewTripleFull') : t('keyAreas.viewSimpleFull')}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="relative ml-1" ref={columnsMenuRef}>
                                <button
                                    type="button"
                                    aria-haspopup="menu"
                                    aria-expanded={showColumnsMenu ? 'true' : 'false'}
                                    className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm font-semibold hover:bg-slate-50"
                                    onClick={() => setShowColumnsMenu((s) => !s)}
                                    title="Columns"
                                >
                                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M487.4 315.7l-42.6-24.6c4.3-23.2 4.3-47 0-70.2l42.6-24.6c4.9-2.8 7.1-8.6 5.5-14-11.1-35.6-30-67.8-54.7-94.6-3.8-4.1-10-5.1-14.8-2.3L380.8 110c-17.9-15.4-38.5-27.3-60.8-35.1V25.8c0-5.6-3.9-10.5-9.4-11.7-36.7-8.2-74.3-7.8-109.2 0-5.5 1.2-9.4 6.1-9.4 11.7V75c-22.2 7.9-42.8 19.8-60.8 35.1L88.7 85.5c-4.9-2.8-11-1.9-14.8 2.3-24.7 26.7-43.6 58.9-54.7 94.6-1.7 5.4.6 11.2 5.5 14L67.3 221c-4.3 23.2-4.3 47 0 70.2l-42.6 24.6c-4.9 2.8-7.1 8.6-5.5 14 11.1 35.6 30 67.8 54.7 94.6 3.8 4.1 10 5.1 14.8 2.3l42.6-24.6c17.9 15.4 38.5 27.3 60.8 35.1v49.2c0 5.6 3.9 10.5 9.4 11.7 36.7 8.2 74.3 7.8 109.2 0 5.5-1.2 9.4-6.1 9.4-11.7v-49.2c22.2-7.9 42.8-19.8 60.8-35.1l42.6 24.6c4.9 2.8 11 1.9 14.8-2.3 24.7-26.7 43.6-58.9 54.7-94.6 1.5-5.5-.7-11.3-5.6-14.1zM256 336c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z"></path>
                                    </svg>
                                </button>
                                {showColumnsMenu && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded shadow z-50 p-3 text-sm">
                                        <div className="font-medium mb-2">{t('keyAreas.columns')}</div>
                                        {Object.keys(visibleColumns).map((key) => (
                                            <label key={key} className="flex items-center gap-2 py-1">
                                                <input
                                                    type="checkbox"
                                                    checked={!!visibleColumns[key]}
                                                    onChange={() => setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))}
                                                />
                                                <span className="capitalize">{key.replace('_', ' ')}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {panelViewMode === 'simple' && viewTab === 'active-tasks' && selectedTaskInPanel && selectedKA && !isGlobalTasksView && (
                <div className="mt-2 mb-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                    <button
                        type="button"
                        className="px-2 py-1 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                        aria-label="Back to task list"
                        onClick={() => setSelectedTaskInPanel(null)}
                    >
                        <FaChevronLeft />
                    </button>
                    <span
                        className="inline-block w-4 h-4 rounded-[3px]"
                        style={{ backgroundColor: (selectedKA && selectedKA.color) || '#10b981' }}
                        aria-hidden="true"
                    />
                    {(() => {
                        const lvl = getPriorityLevel ? getPriorityLevel(selectedTaskInPanel?.priority) : 2;
                        if (lvl === 2) return null;
                        if (lvl === 3) {
                            return (
                                <img src={`${import.meta.env.BASE_URL}high-priority.svg`} alt="High priority" className="inline-block w-2 h-4" title="Priority: High" />
                            );
                        }
                        return (
                            <img src={`${import.meta.env.BASE_URL}low-priority-down.svg`} alt="Low priority" className="inline-block w-2 h-4" title="Priority: Low" />
                        );
                    })()}
                    <span className="text-sm font-semibold text-slate-900 truncate">
                        {selectedTaskInPanel?.title || selectedTaskInPanel?.name || 'Untitled Task'}
                    </span>
                </div>
            )}
        </>
    );
}
