import React from 'react';
import { FaTimes } from 'react-icons/fa';
import MassActionMenu from '../shared/MassActionMenu.jsx';
import DurationPicker from '../shared/DurationPicker.jsx';
import {
    getItemStatusFilterValue,
    resolveAssignee,
    toDateOnly,
} from '../../utils/keyareasHelpers';
import { durationToTimeInputValue, parseDurationToMinutes } from '../../utils/duration';

export default function KeyAreasActivityPanel({
    ActivityRowMenu,
    activityDateRefs,
    activityDurationEdit,
    activityNameEditId,
    activityNameEditValue,
    activitySortDirection,
    activitySortField,
    activitiesByTask,
    allStatusesSelected,
    currentUserId,
    formatDate,
    getActivityService,
    getPriorityLevel,
    handleActivitySort,
    panelTargetActivityId,
    panelViewMode,
    savingActivityIds,
    selectedActivityCountInPanel,
    selectedActivityIdsInPanel,
    selectedKA,
    selectedTaskInPanel,
    setActivitiesByTask,
    setActivityDateEditId,
    setActivityDurationEdit,
    setActivityNameEditId,
    setActivityNameEditValue,
    setSelectedActivityIdsInPanel,
    setSelectedTaskInPanel,
    setShowActivityMassFieldPicker,
    t,
    updateActivityField,
    users,
    visibleColumns,
    filterStatuses,
    saveActivityName,
}) {
    if (!selectedTaskInPanel) {
        return (
            <div className="flex flex-col h-full bg-white">
                <div className="flex-1 min-h-0 overflow-hidden pl-px pr-3 pt-3 pb-0">
                    <div className="space-y-6 flex flex-col min-h-0 h-full">
                        <div className="bg-white border border-blue-300 rounded-lg shadow-sm overflow-hidden p-3 space-y-2 flex flex-col flex-1 min-h-0">
                            <div className="pt-0">
                                <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                    <div className="px-3 py-1 rounded-md text-sm font-semibold bg-white text-slate-900 shadow" aria-label="Activities">
                                        <span className="inline-flex items-center gap-1">
                                            <svg className="w-4 h-4" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" fill="currentColor" style={{ color: 'rgb(16, 185, 129)' }}>
                                                <path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z" />
                                            </svg>
                                            Activities
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 min-h-0 overflow-auto p-4">
                                <div className="flex items-center justify-center h-full text-slate-500 text-center">
                                    <div>
                                        <p className="text-lg font-medium mb-2">{t('keyAreas.selectTask')}</p>
                                        <p className="text-sm">Choose a task from the left panel to view its activities</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white">
            <div
                className={`flex-1 min-h-0 overflow-hidden pt-3 pb-0 ${
                    panelViewMode === 'simple' ? 'px-3' : 'pl-px pr-3'
                }`}
            >
                <div className="space-y-6 flex flex-col min-h-0 h-full">
                    <div className="bg-white border border-blue-300 rounded-lg shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                        {panelViewMode !== 'simple' && (
                            <div className="px-4 pt-3 pb-2 border-b border-black bg-white flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
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
                                    <h3 className="text-sm font-semibold text-slate-900 truncate">{selectedTaskInPanel.title || 'Untitled Task'}</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedTaskInPanel(null)}
                                    className="ml-2 p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                    aria-label="Close activity panel"
                                >
                                    <FaTimes className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                            <div className="px-2 pt-2 bg-white flex items-center gap-2">
                                <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                    <div className="px-3 py-1 rounded-md text-sm font-semibold bg-white text-slate-900 shadow" aria-label="Activities">
                                        <span className="inline-flex items-center gap-1">
                                            <svg className="w-4 h-4" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" fill="currentColor" style={{ color: selectedKA?.color || 'rgb(16, 185, 129)' }}>
                                                <path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z" />
                                            </svg>
                                            Activities
                                        </span>
                                    </div>
                                </div>
                                <div className="ml-auto flex items-center gap-3 text-sm">
                                    <span className="text-slate-500" aria-live="polite">
                                        {selectedActivityCountInPanel} selected
                                    </span>
                                    <MassActionMenu
                                        label="Mass Edit"
                                        ariaLabel="activity mass action"
                                        disabled={selectedActivityCountInPanel === 0}
                                        title={selectedActivityCountInPanel === 0 ? 'Select activities to enable mass edit' : undefined}
                                        onSelect={(action) => {
                                            if (!action) return;
                                            if (action === 'edit') {
                                                setShowActivityMassFieldPicker(true);
                                                return;
                                            }
                                            if (action === 'delete') {
                                                const confirmed = window.confirm(
                                                    t('unifiedTable.confirmDeleteSelected') || 'Delete selected items?',
                                                );
                                                if (!confirmed) return;
                                                const taskKey = String(selectedTaskInPanel?.id || '');
                                                const list = Array.isArray(activitiesByTask[taskKey])
                                                    ? activitiesByTask[taskKey]
                                                    : [];
                                                const toDelete = list.filter((activity) =>
                                                    selectedActivityIdsInPanel.has(activity.id),
                                                );
                                                Promise.all(
                                                    toDelete.map(async (activity) => {
                                                        try {
                                                            const activityService = await getActivityService();
                                                            await activityService.remove(activity.id);
                                                            return activity.id;
                                                        } catch (error) {
                                                            console.error('Failed to delete activity:', error);
                                                            return null;
                                                        }
                                                    }),
                                                ).then((removedIds) => {
                                                    const deleted = new Set(
                                                        removedIds.filter(Boolean).map((id) => String(id)),
                                                    );
                                                    setActivitiesByTask((prev) => ({
                                                        ...prev,
                                                        [taskKey]: (prev[taskKey] || []).filter(
                                                            (item) => !deleted.has(String(item.id)),
                                                        ),
                                                    }));
                                                });
                                                setSelectedActivityIdsInPanel(new Set());
                                            }
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="px-3 py-1 rounded-md text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
                                    onClick={() => window.dispatchEvent(new CustomEvent('ka-open-activity-composer', { detail: { taskId: selectedTaskInPanel?.id } }))}
                                >
                                    Add Activity
                                </button>
                            </div>

                            <div className="flex-1 min-h-0 px-2 pt-2 pb-4 flex flex-col">
                                <div className="mb-3 flex-1 min-h-0 flex flex-col">
                                    {(() => {
                                        const taskKey = String(selectedTaskInPanel.id);
                                        let list = (activitiesByTask[taskKey] || []).slice();

                                        if (!allStatusesSelected) {
                                            list = list.filter((activity) =>
                                                filterStatuses.includes(getItemStatusFilterValue(activity)),
                                            );
                                        }

                                        if (activitySortField && activitySortDirection) {
                                            list.sort((a, b) => {
                                                let aVal;
                                                let bVal;

                                                switch (activitySortField) {
                                                    case 'name':
                                                        aVal = (a.name || a.activity || '').toLowerCase();
                                                        bVal = (b.name || b.activity || '').toLowerCase();
                                                        break;
                                                    case 'responsible':
                                                        aVal = (a.responsible || '').toLowerCase();
                                                        bVal = (b.responsible || '').toLowerCase();
                                                        break;
                                                    case 'status':
                                                        aVal = (a.status || '').toLowerCase();
                                                        bVal = (b.status || '').toLowerCase();
                                                        break;
                                                    case 'priority':
                                                        aVal = getPriorityLevel(a.priority);
                                                        bVal = getPriorityLevel(b.priority);
                                                        break;
                                                    case 'start_date':
                                                        aVal = a.start_date || a.startDate || '';
                                                        bVal = b.start_date || b.startDate || '';
                                                        break;
                                                    case 'end_date':
                                                        aVal = a.end_date || a.endDate || '';
                                                        bVal = b.end_date || b.endDate || '';
                                                        break;
                                                    case 'deadline':
                                                        aVal = a.deadline || '';
                                                        bVal = b.deadline || '';
                                                        break;
                                                    case 'duration':
                                                        aVal = parseDurationToMinutes(a.duration ?? a.duration_minutes) ?? 0;
                                                        bVal = parseDurationToMinutes(b.duration ?? b.duration_minutes) ?? 0;
                                                        break;
                                                    case 'completed':
                                                        aVal = a.completionDate || a.completion_date || '';
                                                        bVal = b.completionDate || b.completion_date || '';
                                                        break;
                                                    default:
                                                        return 0;
                                                }

                                                if (!aVal && !bVal) return 0;
                                                if (!aVal) return 1;
                                                if (!bVal) return -1;

                                                const comparison =
                                                    typeof aVal === 'string' && typeof bVal === 'string'
                                                        ? aVal.localeCompare(bVal)
                                                        : aVal < bVal
                                                          ? -1
                                                          : aVal > bVal
                                                            ? 1
                                                            : 0;

                                                return activitySortDirection === 'asc' ? comparison : -comparison;
                                            });
                                        }

                                        return Array.isArray(list) && list.length > 0 ? (
                                            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto hover-scrollbar-y">
                                                <table className="min-w-[1400px] w-full text-sm table-fixed border-collapse">
                                                    <colgroup>
                                                        <col style={{ width: '3rem' }} />
                                                        <col style={{ width: '15rem' }} />
                                                        {visibleColumns.responsible && <col style={{ width: '6rem' }} />}
                                                        {visibleColumns.status !== false && <col style={{ width: '6rem' }} />}
                                                        {visibleColumns.priority && <col style={{ width: '6rem' }} />}
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
                                                                    aria-label="Select all visible activities"
                                                                    checked={
                                                                        list.length > 0 &&
                                                                        list.every((activity) =>
                                                                            selectedActivityIdsInPanel.has(activity.id),
                                                                        )
                                                                    }
                                                                    onChange={() => {
                                                                        if (
                                                                            list.length > 0 &&
                                                                            list.every((activity) =>
                                                                                selectedActivityIdsInPanel.has(activity.id),
                                                                            )
                                                                        ) {
                                                                            setSelectedActivityIdsInPanel(new Set());
                                                                            return;
                                                                        }
                                                                        setSelectedActivityIdsInPanel(
                                                                            new Set(list.map((activity) => activity.id)),
                                                                        );
                                                                    }}
                                                                />
                                                            </th>
                                                            <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[240px] cursor-pointer hover:bg-slate-100" onClick={() => handleActivitySort('name')}>
                                                                Activity {activitySortField === 'name' && (activitySortDirection === 'asc' ? '↑' : '↓')}
                                                            </th>
                                                            {visibleColumns.responsible && (
                                                                <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleActivitySort('responsible')}>
                                                                    Responsible {activitySortField === 'responsible' && (activitySortDirection === 'asc' ? '↑' : '↓')}
                                                                </th>
                                                            )}
                                                            {visibleColumns.status !== false && (
                                                                <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleActivitySort('status')}>
                                                                    Status {activitySortField === 'status' && (activitySortDirection === 'asc' ? '↑' : '↓')}
                                                                </th>
                                                            )}
                                                            {visibleColumns.priority && (
                                                                <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleActivitySort('priority')}>
                                                                    Priority {activitySortField === 'priority' && (activitySortDirection === 'asc' ? '↑' : '↓')}
                                                                </th>
                                                            )}
                                                            {visibleColumns.start_date && (
                                                                <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleActivitySort('start_date')}>
                                                                    Start date {activitySortField === 'start_date' && (activitySortDirection === 'asc' ? '↑' : '↓')}
                                                                </th>
                                                            )}
                                                            {visibleColumns.end_date && (
                                                                <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleActivitySort('end_date')}>
                                                                    End date {activitySortField === 'end_date' && (activitySortDirection === 'asc' ? '↑' : '↓')}
                                                                </th>
                                                            )}
                                                            {visibleColumns.deadline && (
                                                                <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleActivitySort('deadline')}>
                                                                    Deadline {activitySortField === 'deadline' && (activitySortDirection === 'asc' ? '↑' : '↓')}
                                                                </th>
                                                            )}
                                                            {visibleColumns.duration && (
                                                                <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleActivitySort('duration')}>
                                                                    Duration {activitySortField === 'duration' && (activitySortDirection === 'asc' ? '↑' : '↓')}
                                                                </th>
                                                            )}
                                                            {visibleColumns.completed && (
                                                                <th className="sticky top-0 z-20 bg-slate-50 px-3 py-2 text-left font-semibold w-[96px] cursor-pointer hover:bg-slate-100" onClick={() => handleActivitySort('completed')}>
                                                                    Completed {activitySortField === 'completed' && (activitySortDirection === 'asc' ? '↑' : '↓')}
                                                                </th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {list.map((a) => (
                                                            <tr
                                                                key={a.id}
                                                                data-activity-row-id={String(a.id)}
                                                                className={`border-b border-slate-100 ${String(panelTargetActivityId || '') === String(a.id) ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'bg-white'}`}
                                                            >
                                                                <td className="px-3 py-2 align-top w-12">
                                                                    <div className="relative inline-flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            aria-label={`Select ${a.text || a.activity_name || 'activity'}`}
                                                                            checked={selectedActivityIdsInPanel.has(a.id)}
                                                                            onChange={() => {
                                                                                setSelectedActivityIdsInPanel((prev) => {
                                                                                    const next = new Set(prev);
                                                                                    if (next.has(a.id)) next.delete(a.id);
                                                                                    else next.add(a.id);
                                                                                    return next;
                                                                                });
                                                                            }}
                                                                        />
                                                                        <ActivityRowMenu activity={a} taskId={selectedTaskInPanel?.id} />
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-2 align-top w-[240px] overflow-hidden">
                                                                    <div className="flex items-center gap-2">
                                                                        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="w-4 h-4 shrink-0" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" style={{ color: selectedKA?.color || 'rgb(16, 185, 129)' }}>
                                                                            <path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z" />
                                                                        </svg>
                                                                        <div className="flex flex-col">
                                                                            {activityNameEditId === a.id ? (
                                                                                <input
                                                                                    autoFocus
                                                                                    className="text-sm text-slate-800 border rounded px-1 py-0.5 max-w-[540px]"
                                                                                    value={activityNameEditValue}
                                                                                    onChange={(e) => setActivityNameEditValue(e.target.value)}
                                                                                    onBlur={() => saveActivityName(a, selectedTaskInPanel?.id, activityNameEditValue)}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter') {
                                                                                            e.preventDefault();
                                                                                            saveActivityName(a, selectedTaskInPanel?.id, activityNameEditValue);
                                                                                        } else if (e.key === 'Escape') {
                                                                                            setActivityNameEditId(null);
                                                                                            setActivityNameEditValue((a.text || a.activity_name || '').trim());
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            ) : (
                                                                                <div
                                                                                    className="text-sm text-slate-800 truncate max-w-[540px] cursor-pointer"
                                                                                    onDoubleClick={() => {
                                                                                        setActivityNameEditId(a.id);
                                                                                        setActivityNameEditValue((a.text || a.activity_name || '').trim());
                                                                                    }}
                                                                                    title="Double click to edit"
                                                                                >
                                                                                    {a.text || a.activity_name || 'Untitled activity'}
                                                                                </div>
                                                                            )}
                                                                            <div className="text-xs text-slate-500">{a.note || ''}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                {visibleColumns.responsible && (
                                                                    <td className="px-3 py-2 align-top text-slate-800 w-[96px]">
                                                                        {Array.isArray(users) && users.length ? (
                                                                            <select
                                                                                className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm"
                                                                                value={resolveAssignee({ activity: a, taskAssignee: selectedTaskInPanel?.assignee, users, currentUserId }).selectValue}
                                                                                onChange={(e) => updateActivityField(a, selectedTaskInPanel?.id, 'assignee', e.target.value)}
                                                                                disabled={savingActivityIds.has(a.id)}
                                                                            >
                                                                                <option value="">—</option>
                                                                                {users.map((u) => (
                                                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        ) : (
                                                                            a.assignee || selectedTaskInPanel?.assignee || '—'
                                                                        )}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.status !== false && (
                                                                    <td className="px-3 py-2 align-top w-[96px]">
                                                                        <div className="flex w-full items-center gap-2">
                                                                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${String(a.status || '').toLowerCase() === 'done' ? 'bg-emerald-500' : String(a.status || '').toLowerCase() === 'in_progress' ? 'bg-blue-500' : 'bg-slate-400'}`} aria-hidden="true" />
                                                                            <div className="min-w-0 flex-1">
                                                                                <select
                                                                                    value={a.status || 'open'}
                                                                                    onChange={(e) => updateActivityField(a, selectedTaskInPanel?.id, 'status', e.target.value)}
                                                                                    disabled={savingActivityIds.has(a.id)}
                                                                                    className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm"
                                                                                    aria-label={`Change status for ${a.text || 'activity'}`}
                                                                                >
                                                                                    <option value="open">Open</option>
                                                                                    <option value="in_progress">In progress</option>
                                                                                    <option value="done">Done</option>
                                                                                </select>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                )}
                                                                {visibleColumns.priority && (
                                                                    <td className="px-3 py-2 align-top w-[96px]">
                                                                        {(() => {
                                                                            const raw = a.priority ?? selectedTaskInPanel.priority;
                                                                            const priorityValue =
                                                                                raw === 1 || String(raw) === '1' || String(raw).toLowerCase() === 'low'
                                                                                    ? 'low'
                                                                                    : raw === 3 || String(raw) === '3' || String(raw).toLowerCase() === 'high'
                                                                                      ? 'high'
                                                                                      : 'normal';
                                                                            return (
                                                                                <select
                                                                                    className="w-full min-w-0 rounded-md border border-slate-300 bg-white py-0.5 text-sm px-2"
                                                                                    value={priorityValue}
                                                                                    onChange={(e) => updateActivityField(a, selectedTaskInPanel?.id, 'priority', e.target.value)}
                                                                                    disabled={savingActivityIds.has(a.id)}
                                                                                >
                                                                                    <option value="high">High</option>
                                                                                    <option value="normal">Normal</option>
                                                                                    <option value="low" style={{ color: '#6b7280' }}>Low</option>
                                                                                </select>
                                                                            );
                                                                        })()}
                                                                    </td>
                                                                )}
                                                                {visibleColumns.start_date && (
                                                                    <td className="px-3 py-2 align-top text-slate-800 w-[96px]">
                                                                        <div className="relative block w-full">
                                                                            <button
                                                                                type="button"
                                                                                className="flex w-full items-center justify-start gap-1 rounded px-1 text-left hover:bg-slate-100"
                                                                                onClick={() => {
                                                                                    const key = `start_${a.id}`;
                                                                                    setActivityDateEditId(key);
                                                                                    setTimeout(() => {
                                                                                        try {
                                                                                            activityDateRefs.current[key]?.showPicker?.();
                                                                                            activityDateRefs.current[key]?.focus();
                                                                                        } catch (_) {}
                                                                                    }, 0);
                                                                                }}
                                                                                disabled={savingActivityIds.has(a.id)}
                                                                                title="Edit start date"
                                                                            >
                                                                                <span>{(a.start_date || a.startDate) ? formatDate(a.start_date || a.startDate) : '—'}</span>
                                                                            </button>
                                                                            <input
                                                                                ref={(el) => { activityDateRefs.current[`start_${a.id}`] = el; }}
                                                                                type="date"
                                                                                className="absolute opacity-0"
                                                                                value={toDateOnly(a.start_date || a.startDate) || ''}
                                                                                onChange={(e) => updateActivityField(a, selectedTaskInPanel?.id, 'start_date', e.target.value)}
                                                                                onBlur={() => setActivityDateEditId(null)}
                                                                                disabled={savingActivityIds.has(a.id)}
                                                                                style={{ width: 0, height: 0 }}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                )}
                                                                {visibleColumns.end_date && (
                                                                    <td className="px-3 py-2 align-top text-slate-800 w-[96px]">
                                                                        <div className="relative block w-full">
                                                                            <button
                                                                                type="button"
                                                                                className="flex w-full items-center justify-start gap-1 rounded px-1 text-left hover:bg-slate-100"
                                                                                onClick={() => {
                                                                                    const key = `end_${a.id}`;
                                                                                    setActivityDateEditId(key);
                                                                                    setTimeout(() => {
                                                                                        try {
                                                                                            activityDateRefs.current[key]?.showPicker?.();
                                                                                            activityDateRefs.current[key]?.focus();
                                                                                        } catch (_) {}
                                                                                    }, 0);
                                                                                }}
                                                                                disabled={savingActivityIds.has(a.id)}
                                                                                title="Edit end date"
                                                                            >
                                                                                <span>{(a.end_date || a.endDate) ? formatDate(a.end_date || a.endDate) : '—'}</span>
                                                                            </button>
                                                                            <input
                                                                                ref={(el) => { activityDateRefs.current[`end_${a.id}`] = el; }}
                                                                                type="date"
                                                                                className="absolute opacity-0"
                                                                                value={toDateOnly(a.end_date || a.endDate) || ''}
                                                                                onChange={(e) => updateActivityField(a, selectedTaskInPanel?.id, 'end_date', e.target.value)}
                                                                                onBlur={() => setActivityDateEditId(null)}
                                                                                disabled={savingActivityIds.has(a.id)}
                                                                                style={{ width: 0, height: 0 }}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                )}
                                                                {visibleColumns.deadline && (
                                                                    <td className="px-3 py-2 align-top text-slate-800 w-[96px]">
                                                                        <div className="relative block w-full">
                                                                            <button
                                                                                type="button"
                                                                                className="flex w-full items-center justify-start gap-1 rounded px-1 text-left hover:bg-slate-100"
                                                                                onClick={() => {
                                                                                    const key = `deadline_${a.id}`;
                                                                                    setActivityDateEditId(key);
                                                                                    setTimeout(() => {
                                                                                        try {
                                                                                            activityDateRefs.current[key]?.showPicker?.();
                                                                                            activityDateRefs.current[key]?.focus();
                                                                                        } catch (_) {}
                                                                                    }, 0);
                                                                                }}
                                                                                disabled={savingActivityIds.has(a.id)}
                                                                                title="Edit deadline"
                                                                            >
                                                                                <span>{a.deadline ? formatDate(a.deadline) : '—'}</span>
                                                                            </button>
                                                                            <input
                                                                                ref={(el) => { activityDateRefs.current[`deadline_${a.id}`] = el; }}
                                                                                type="date"
                                                                                className="absolute opacity-0"
                                                                                value={toDateOnly(a.deadline) || ''}
                                                                                onChange={(e) => updateActivityField(a, selectedTaskInPanel?.id, 'deadline', e.target.value)}
                                                                                onBlur={() => setActivityDateEditId(null)}
                                                                                disabled={savingActivityIds.has(a.id)}
                                                                                style={{ width: 0, height: 0 }}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                )}
                                                                {visibleColumns.duration && (
                                                                    <td className="px-3 py-2 align-top text-slate-800 w-[96px]">
                                                                        <div className="w-full text-left">
                                                                            {activityDurationEdit.id === a.id ? (
                                                                                <DurationPicker
                                                                                    value={activityDurationEdit.value}
                                                                                    onChange={(nextValue) => setActivityDurationEdit({ id: a.id, value: nextValue })}
                                                                                    onClose={(reason, nextValue) => {
                                                                                        if (reason !== 'done') {
                                                                                            setActivityDurationEdit({ id: null, value: '' });
                                                                                            return;
                                                                                        }
                                                                                        const currentValue = durationToTimeInputValue(a.duration);
                                                                                        setActivityDurationEdit({ id: null, value: '' });
                                                                                        if ((nextValue || '') !== currentValue) {
                                                                                            updateActivityField(a, selectedTaskInPanel?.id, 'duration', nextValue || null);
                                                                                        }
                                                                                    }}
                                                                                    compact
                                                                                    autoFocus
                                                                                    className="w-full"
                                                                                    allowClear
                                                                                    disabled={savingActivityIds.has(a.id)}
                                                                                    hoursAriaLabel="Activity duration hours"
                                                                                    minutesAriaLabel="Activity duration minutes"
                                                                                />
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    className="w-full rounded px-1 text-left hover:bg-slate-100"
                                                                                    onClick={() => {
                                                                                        setActivityDurationEdit({
                                                                                            id: a.id,
                                                                                            value: durationToTimeInputValue(a.duration),
                                                                                        });
                                                                                    }}
                                                                                    disabled={savingActivityIds.has(a.id)}
                                                                                    title="Edit duration"
                                                                                >
                                                                                    {durationToTimeInputValue(a.duration) || String(a.duration ?? '').trim() || '—'}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                )}
                                                                {visibleColumns.completed && (
                                                                    <td className="px-3 py-2 align-top text-slate-800 w-[96px]">
                                                                        <div className="w-full text-left">
                                                                            {(() => {
                                                                                const date = a.completionDate || a.completion_date;
                                                                                if (!date) return '';
                                                                                try {
                                                                                    const d = new Date(date);
                                                                                    return d.toISOString().split('T')[0];
                                                                                } catch {
                                                                                    return '';
                                                                                }
                                                                            })()}
                                                                        </div>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-500 mt-2">No activities yet.</div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
