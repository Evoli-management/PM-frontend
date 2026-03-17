import React from 'react';
import { FaEllipsisV } from 'react-icons/fa';
import EmptyState from '../goals/EmptyState.jsx';
import MassActionMenu from '../shared/MassActionMenu.jsx';
import ActivityList from './ActivityList';
import TaskRow from './TaskRow';
import { computeEisenhowerQuadrant, formatDuration, toDateOnly } from '../../utils/keyareasHelpers';

function buildTaskFormState(task, selectedKA) {
    return {
        id: task.id || task.taskId || task._id || null,
        title: task.title || task.name || '',
        description: task.description || task.notes || '',
        list_index: task.list_index || task.listIndex || 1,
        goal_id: task.goal_id || task.goalId || task.goal || '',
        start_date: toDateOnly(task.start_date) || toDateOnly(task.startDate) || '',
        deadline: toDateOnly(task.deadline) || toDateOnly(task.dueDate) || '',
        end_date: toDateOnly(task.end_date) || toDateOnly(task.endDate) || '',
        status: task.status || 'open',
        priority: (() => {
            const value = String(task.priority || 'normal').toLowerCase();
            if (value === 'low' || value === '1') return 1;
            if (value === 'high' || value === '3') return 3;
            return 2;
        })(),
        tags: task.tags || '',
        assignee: task.assignee || '',
        key_area_id: task.key_area_id || task.keyAreaId || selectedKA?.id || null,
        list: '',
        finish_date: task.finish_date || '',
        duration: task.duration || '',
        _endAuto: false,
    };
}

export default function KeyAreasTaskPanel({
    activitiesByTask,
    addToast,
    allStatusesSelected,
    currentUserId,
    deleteList,
    expandedActivityRows,
    filterStatuses,
    getKeyAreaService,
    getListName,
    getPriorityLevel,
    goalTitleMap,
    goals,
    handleDeleteTask,
    handleTaskMassActionChange,
    handleTaskSort,
    handleTaskStatusChange,
    isSelected,
    leftListCount,
    listMenuPos,
    listNames,
    openListMenu,
    panelViewMode,
    renameList,
    savingActivityIds,
    savingIds,
    selectAllVisible,
    selectedIds,
    selectedKA,
    setActivitiesByTask,
    setEditingTaskId,
    setExpandedActivityRows,
    setListMenuPos,
    setListNames,
    setOpenListMenu,
    setSelectedTaskFull,
    setSelectedTaskInPanel,
    setSavingActivityIds,
    setShowTaskComposer,
    setTaskForm,
    setTaskFullInitialTab,
    setTaskTab,
    showMassEdit,
    sortedTasks,
    t,
    tabsRef,
    taskSortDirection,
    taskSortField,
    taskTab,
    tasksDisplayRef,
    toggleActivitiesRow,
    toggleSelect,
    updateField,
    users,
    viewTab,
    visibleColumns,
}) {
    return (
        <div className="flex flex-col h-full bg-white">
            <div
                className={`flex-1 min-h-0 overflow-hidden pt-3 pb-0 ${
                    panelViewMode === 'simple' ? 'px-3' : 'pl-3 pr-px'
                }`}
            >
                <div className="space-y-6 flex flex-col min-h-0 h-full">
                    <div className="bg-white border border-blue-300 rounded-lg shadow-sm overflow-hidden p-3 space-y-2 flex flex-col flex-1 min-h-0">
                        <div className="flex items-center justify-between border-b border-black pb-2">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-700">
                                    {viewTab === 'delegated'
                                        ? 'Delegated Tasks:'
                                        : viewTab === 'todo'
                                          ? 'All Tasks:'
                                          : 'Task Lists:'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <span className="text-slate-500" aria-live="polite">
                                    {selectedIds.size} selected
                                </span>
                                <MassActionMenu
                                    label="Mass Edit"
                                    ariaLabel="mass action"
                                    disabled={selectedIds.size === 0}
                                    title={selectedIds.size === 0 ? 'Select tasks to enable mass edit' : undefined}
                                    onSelect={handleTaskMassActionChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTaskForm({
                                            title: '',
                                            description: '',
                                            list_index: taskTab || 1,
                                            goal_id: '',
                                            start_date: '',
                                            deadline: '',
                                            end_date: '',
                                            status: 'open',
                                            priority: 'normal',
                                            tags: '',
                                            assignee: '',
                                            duration: '',
                                            key_area_id: selectedKA?.id || null,
                                            list: '',
                                            finish_date: '',
                                            _endAuto: true,
                                        });
                                        setShowTaskComposer(true);
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-1 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    aria-label="Add task"
                                >
                                    Add Task
                                </button>
                            </div>
                        </div>

                        <div className="pt-0">
                            <div
                                ref={tabsRef}
                                className="flex items-center gap-1 overflow-x-auto bg-slate-100 border border-slate-200 rounded-lg px-1 py-0.5"
                            >
                                {Array.from({ length: leftListCount }).map((_, index) => {
                                    const listNumber = index + 1;
                                    return (
                                        <div key={listNumber} className="relative">
                                            <button
                                                onClick={() => setTaskTab(listNumber)}
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold border transition ${
                                                    taskTab === listNumber
                                                        ? 'bg-white text-slate-900 border-slate-300 shadow'
                                                        : 'bg-transparent text-slate-800 border-transparent hover:bg-slate-200'
                                                }`}
                                            >
                                                <span>{getListName(selectedKA?.id, listNumber)}</span>
                                                <span
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        const rect = event.currentTarget.getBoundingClientRect();
                                                        setListMenuPos({
                                                            top: rect.bottom + window.scrollY + 6,
                                                            left: rect.left + window.scrollX,
                                                        });
                                                        setOpenListMenu((current) =>
                                                            current === listNumber ? null : listNumber,
                                                        );
                                                    }}
                                                    aria-haspopup="menu"
                                                    aria-expanded={openListMenu === listNumber ? 'true' : 'false'}
                                                    title={`Options for ${getListName(selectedKA?.id, listNumber)}`}
                                                    className={`ml-1 p-1 rounded cursor-pointer ${
                                                        taskTab === listNumber
                                                            ? 'text-slate-600 hover:bg-slate-100'
                                                            : 'text-slate-700 hover:bg-slate-200'
                                                    }`}
                                                    role="button"
                                                >
                                                    <FaEllipsisV className="w-3.5 h-3.5" />
                                                </span>
                                            </button>
                                            {openListMenu === listNumber && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-40"
                                                        onClick={() => setOpenListMenu(null)}
                                                    />
                                                    <div
                                                        role="menu"
                                                        className="fixed z-50 w-32 bg-white border border-slate-200 rounded-lg shadow"
                                                        style={{
                                                            top: `${listMenuPos.top}px`,
                                                            left: `${listMenuPos.left}px`,
                                                        }}
                                                    >
                                                        <button
                                                            role="menuitem"
                                                            onClick={() => {
                                                                renameList(listNumber);
                                                                setOpenListMenu(null);
                                                            }}
                                                            className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                                            aria-label="Rename list"
                                                        >
                                                            Rename List
                                                        </button>
                                                        <button
                                                            role="menuitem"
                                                            onClick={() => {
                                                                deleteList(listNumber);
                                                                setOpenListMenu(null);
                                                            }}
                                                            className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                                            aria-label="Delete list"
                                                        >
                                                            Delete List
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                                {leftListCount < 10 && (
                                    <div className="flex items-center">
                                        <button
                                            onClick={async () => {
                                                if (!selectedKA) return;
                                                if (
                                                    selectedKA.is_default ||
                                                    (selectedKA.title || '').toLowerCase() === 'ideas'
                                                ) {
                                                    alert(t('keyAreas.alertCannotAddListIdeas'));
                                                    return;
                                                }
                                                const keyAreaId = selectedKA.id;
                                                const next = leftListCount + 1;
                                                const nextName = `List ${next}`;
                                                setListNames((prev) => {
                                                    const copy = { ...(prev || {}) };
                                                    copy[keyAreaId] = { ...(copy[keyAreaId] || {}) };
                                                    copy[keyAreaId][next] = nextName;
                                                    return copy;
                                                });
                                                setTaskTab(next);
                                                try {
                                                    const names = listNames[keyAreaId] || {};
                                                    const service = await getKeyAreaService();
                                                    await service.update(keyAreaId, {
                                                        listNames: {
                                                            ...names,
                                                            [next]: nextName,
                                                        },
                                                    });
                                                } catch (error) {
                                                    console.error('Failed to persist new list', error);
                                                }
                                            }}
                                            title="Add list"
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border bg-white text-slate-800 hover:bg-slate-50"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            Add List
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div ref={tasksDisplayRef} className="flex flex-col flex-1 min-h-0">
                            {sortedTasks.length === 0 ? (
                                <EmptyState
                                    title="List is empty."
                                    hint="Use the 'Add Task' button below to create your first task."
                                />
                            ) : (
                                <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto hover-scrollbar-y">
                                    <table className="min-w-[1400px] w-full text-sm table-fixed">
                                        <colgroup>
                                            <col style={{ width: '3rem' }} />
                                            <col style={{ width: '15rem' }} />
                                            {visibleColumns.responsible && <col style={{ width: '6rem' }} />}
                                            <col style={{ width: '6rem' }} />
                                            {visibleColumns.priority && <col style={{ width: '6rem' }} />}
                                            {visibleColumns.quadrant && <col style={{ width: '6rem' }} />}
                                            {visibleColumns.start_date && <col style={{ width: '6rem' }} />}
                                            {visibleColumns.end_date && <col style={{ width: '6rem' }} />}
                                            {visibleColumns.deadline && <col style={{ width: '6rem' }} />}
                                            {visibleColumns.duration && <col style={{ width: '6rem' }} />}
                                            {visibleColumns.completed && <col style={{ width: '6rem' }} />}
                                        </colgroup>
                                        <thead className="bg-slate-50 border border-slate-200 text-slate-700">
                                            <tr>
                                                <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left w-12">
                                                    <input
                                                        type="checkbox"
                                                        aria-label="Select all visible"
                                                        checked={
                                                            sortedTasks.length > 0 &&
                                                            sortedTasks.every((task) => selectedIds.has(task.id))
                                                        }
                                                        onChange={selectAllVisible}
                                                    />
                                                </th>
                                                <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[240px] cursor-pointer hover:bg-slate-100" onClick={() => handleTaskSort('title')}>
                                                    Task {taskSortField === 'title' && (taskSortDirection === 'asc' ? '↑' : '↓')}
                                                </th>
                                                {visibleColumns.responsible && (
                                                    <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleTaskSort('responsible')}>
                                                        Responsible {taskSortField === 'responsible' && (taskSortDirection === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                )}
                                                <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleTaskSort('status')}>
                                                    Status {taskSortField === 'status' && (taskSortDirection === 'asc' ? '↑' : '↓')}
                                                </th>
                                                {visibleColumns.priority && (
                                                    <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleTaskSort('priority')}>
                                                        Priority {taskSortField === 'priority' && (taskSortDirection === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                )}
                                                {visibleColumns.quadrant && (
                                                    <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleTaskSort('quadrant')}>
                                                        Quadrant {taskSortField === 'quadrant' && (taskSortDirection === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                )}
                                                {visibleColumns.start_date && (
                                                    <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleTaskSort('start_date')}>
                                                        Start Date {taskSortField === 'start_date' && (taskSortDirection === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                )}
                                                {visibleColumns.end_date && (
                                                    <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleTaskSort('end_date')}>
                                                        End date {taskSortField === 'end_date' && (taskSortDirection === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                )}
                                                {visibleColumns.deadline && (
                                                    <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleTaskSort('deadline')}>
                                                        Deadline {taskSortField === 'deadline' && (taskSortDirection === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                )}
                                                {visibleColumns.duration && (
                                                    <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleTaskSort('duration')}>
                                                        Duration {taskSortField === 'duration' && (taskSortDirection === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                )}
                                                {visibleColumns.completed && (
                                                    <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleTaskSort('completed')}>
                                                        Completed {taskSortField === 'completed' && (taskSortDirection === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {sortedTasks.map((task) => {
                                                const quadrant = computeEisenhowerQuadrant({
                                                    deadline: task.deadline,
                                                    end_date: task.end_date,
                                                    start_date: task.start_date || task.startDate,
                                                    priority: task.priority,
                                                    status: task.status,
                                                    key_area_id: task.key_area_id || task.keyAreaId || task.key_area || task.keyArea,
                                                });
                                                return (
                                                    <React.Fragment key={task.id}>
                                                        <TaskRow
                                                            t={task}
                                                            goals={goals}
                                                            goalMap={goalTitleMap}
                                                            visibleColumns={visibleColumns}
                                                            q={quadrant}
                                                            isSelected={isSelected(task.id)}
                                                            onToggleSelect={() => toggleSelect(task.id)}
                                                            onOpenTask={(nextTask) => {
                                                                setSelectedTaskFull(nextTask);
                                                                setTaskFullInitialTab('activities');
                                                            }}
                                                            onStatusChange={(value) => handleTaskStatusChange(task.id, value)}
                                                            onToggleActivitiesRow={() => toggleActivitiesRow(task.id)}
                                                            activityCount={(activitiesByTask[String(task.id)] || []).length}
                                                            getPriorityLevel={getPriorityLevel}
                                                            toDateOnly={toDateOnly}
                                                            formatDuration={formatDuration}
                                                            updateField={updateField}
                                                            enableInlineEditing={!showMassEdit}
                                                            users={users}
                                                            currentUserId={currentUserId}
                                                            isSaving={savingIds.has(task.id)}
                                                            onMouseEnter={() => {
                                                                if (
                                                                    expandedActivityRows &&
                                                                    expandedActivityRows.size > 0 &&
                                                                    !(
                                                                        expandedActivityRows.size === 1 &&
                                                                        expandedActivityRows.has(task.id)
                                                                    )
                                                                ) {
                                                                    setExpandedActivityRows(new Set());
                                                                }
                                                            }}
                                                            expandedActivity={expandedActivityRows.has(task.id)}
                                                            onEditClick={() => {
                                                                setTaskForm(buildTaskFormState(task, selectedKA));
                                                                setEditingTaskId(task.id);
                                                                setShowTaskComposer(true);
                                                            }}
                                                            onDeleteClick={() => handleDeleteTask(task)}
                                                            onRowClick={(nextTask) => {
                                                                if (panelViewMode === 'simple') {
                                                                    setSelectedTaskInPanel(nextTask);
                                                                    return;
                                                                }
                                                                setSelectedTaskInPanel(nextTask);
                                                            }}
                                                            rowClassName=""
                                                        />
                                                        {expandedActivityRows.has(task.id) && (
                                                            <tr className="bg-slate-50">
                                                                <td className="px-3 py-2" />
                                                                <td colSpan={14} className="px-0 py-2">
                                                                    <div className="ml-6 pl-6 border-l-2 border-slate-200">
                                                                        <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
                                                                            {t('keyAreas.activities')}
                                                                        </div>
                                                                        <ActivityList
                                                                            task={task}
                                                                            activitiesByTask={activitiesByTask}
                                                                            setActivitiesByTask={setActivitiesByTask}
                                                                            savingActivityIds={savingActivityIds}
                                                                            setSavingActivityIds={setSavingActivityIds}
                                                                            getPriorityLevel={getPriorityLevel}
                                                                            addToast={addToast}
                                                                            enableInlineEditing={!showMassEdit}
                                                                            users={users}
                                                                            currentUserId={currentUserId}
                                                                            goals={goals}
                                                                            filterStatuses={filterStatuses}
                                                                            allStatusesSelected={allStatusesSelected}
                                                                        />
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
