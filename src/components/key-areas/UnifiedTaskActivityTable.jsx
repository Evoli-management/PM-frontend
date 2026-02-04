import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';

/**
 * UnifiedTaskActivityTable - Displays tasks AND activities in a single table
 * Used for DELEGATED, TODO, and ACTIVITY TRAP tabs
 */
export default function UnifiedTaskActivityTable({ 
    tasks = [], 
    activitiesByTask = {}, 
    viewTab,
    keyAreas = [],
    onTaskClick,
    onActivityClick 
}) {
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [sortField, setSortField] = useState('priority');
    const [sortDirection, setSortDirection] = useState('desc');
    const [keyAreaFilter, setKeyAreaFilter] = useState('');
    const [responsibleFilter, setResponsibleFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Flatten tasks and activities into single array
    const allItems = useMemo(() => {
        const items = [];
        
        // Add all tasks
        tasks.forEach(task => {
            items.push({
                ...task,
                type: 'task',
                itemId: `task-${task.id}`,
                displayId: task.id,
            });
            
            // Add activities for this task
            const activities = activitiesByTask[task.id] || [];
            activities.forEach(activity => {
                items.push({
                    ...activity,
                    type: 'activity',
                    itemId: `activity-${activity.id}`,
                    displayId: activity.id,
                    taskId: task.id,
                    // Inherit some task properties
                    keyAreaId: task.keyAreaId || task.key_area_id,
                });
            });
        });
        
        return items;
    }, [tasks, activitiesByTask]);

    // Filter items
    const filteredItems = useMemo(() => {
        let filtered = allItems;
        
        // Key area filter
        if (keyAreaFilter) {
            filtered = filtered.filter(item => 
                (item.keyAreaId || item.key_area_id) === keyAreaFilter
            );
        }
        
        // Responsible filter
        if (responsibleFilter) {
            filtered = filtered.filter(item => 
                (item.assignee || item.responsible) === responsibleFilter
            );
        }
        
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item => 
                (item.title || '').toLowerCase().includes(query) ||
                (item.description || '').toLowerCase().includes(query)
            );
        }
        
        return filtered;
    }, [allItems, keyAreaFilter, responsibleFilter, searchQuery]);

    // Sort items
    const sortedItems = useMemo(() => {
        const sorted = [...filteredItems];
        sorted.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];
            
            if (sortField === 'priority') {
                // High=3, Medium=2, Low=1
                const priorityMap = { high: 3, medium: 2, normal: 2, low: 1 };
                aVal = priorityMap[String(aVal || 'medium').toLowerCase()] || 2;
                bVal = priorityMap[String(bVal || 'medium').toLowerCase()] || 2;
            }
            
            if (aVal === bVal) return 0;
            const comparison = aVal < bVal ? -1 : 1;
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return sorted;
    }, [filteredItems, sortField, sortDirection]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const toggleSelectItem = (itemId) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    const formatDate = (date) => {
        if (!date) return '';
        try {
            return format(new Date(date), 'dd.MM.yyyy');
        } catch {
            return '';
        }
    };

    const getPriorityIcon = (priority) => {
        const p = String(priority || 'medium').toLowerCase();
        if (p === 'high' || p === '3') return '!';
        if (p === 'low' || p === '1') return '↓';
        return '';
    };

    const isOverdue = (deadline, endDate) => {
        const now = new Date();
        const deadlineDate = deadline ? new Date(deadline) : null;
        const endD = endDate ? new Date(endDate) : null;
        
        return (deadlineDate && deadlineDate < now) || (endD && endD < now);
    };

    // Column configuration based on viewTab
    const columns = useMemo(() => {
        if (viewTab === 'delegated') {
            return ['priority', 'title', 'deadline', 'keyArea', 'responsible'];
        } else if (viewTab === 'todo') {
            return ['priority', 'title', 'tab', 'startDate', 'endDate', 'deadline', 'keyArea', 'responsible'];
        } else if (viewTab === 'activity-trap') {
            return ['priority', 'title', 'tab', 'goal', 'startDate', 'endDate', 'deadline', 'keyArea'];
        }
        return ['priority', 'title', 'tab', 'startDate', 'endDate', 'deadline', 'keyArea', 'responsible'];
    }, [viewTab]);

    const getKeyAreaName = (keyAreaId) => {
        const ka = keyAreas.find(k => k.id === keyAreaId);
        return ka?.name || ka?.keyArea || '';
    };

    return (
        <div className="flex flex-col h-full">
            {/* Filters Row */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 border-b">
                <span className="text-sm font-medium">Filter:</span>
                
                {/* Key Area Filter */}
                <select
                    value={keyAreaFilter}
                    onChange={(e) => setKeyAreaFilter(e.target.value)}
                    className="px-3 py-1 text-sm border rounded"
                >
                    <option value="">All Key Areas</option>
                    {keyAreas.map(ka => (
                        <option key={ka.id} value={ka.id}>{ka.name || ka.keyArea}</option>
                    ))}
                </select>

                {/* Responsible Filter */}
                {columns.includes('responsible') && (
                    <select
                        value={responsibleFilter}
                        onChange={(e) => setResponsibleFilter(e.target.value)}
                        className="px-3 py-1 text-sm border rounded"
                    >
                        <option value="">All Responsible</option>
                        {/* TODO: Add unique responsible people from items */}
                    </select>
                )}

                {/* Search */}
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-1 text-sm border rounded flex-1 max-w-xs"
                />

                {/* Mass Edit */}
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-sm">{selectedItems.size} selected</span>
                    <button
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        disabled={selectedItems.size === 0}
                    >
                        Mass Edit
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr>
                            <th className="w-8 p-2"></th>
                            {columns.includes('priority') && (
                                <th className="w-12 p-2 cursor-pointer" onClick={() => handleSort('priority')}>
                                    Pr {sortField === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                            {columns.includes('title') && (
                                <th className="p-2 text-left cursor-pointer" onClick={() => handleSort('title')}>
                                    Title {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                            {columns.includes('tab') && (
                                <th className="w-20 p-2">Tab</th>
                            )}
                            {columns.includes('goal') && (
                                <th className="w-32 p-2">Goal</th>
                            )}
                            {columns.includes('startDate') && (
                                <th className="w-28 p-2 cursor-pointer" onClick={() => handleSort('startDate')}>
                                    Start {sortField === 'startDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                            {columns.includes('endDate') && (
                                <th className="w-28 p-2 cursor-pointer" onClick={() => handleSort('endDate')}>
                                    End {sortField === 'endDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                            {columns.includes('deadline') && (
                                <th className="w-28 p-2 cursor-pointer" onClick={() => handleSort('dueDate')}>
                                    Deadline {sortField === 'dueDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                            {columns.includes('keyArea') && (
                                <th className="w-32 p-2">Key Area</th>
                            )}
                            {columns.includes('responsible') && (
                                <th className="w-32 p-2">Responsible</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedItems.map((item) => {
                            const overdue = isOverdue(item.dueDate || item.due_date, item.endDate || item.end_date);
                            return (
                                <tr
                                    key={item.itemId}
                                    className={`border-b hover:bg-gray-50 cursor-pointer ${overdue ? 'bg-red-50' : ''}`}
                                    onClick={() => {
                                        if (item.type === 'task' && onTaskClick) {
                                            onTaskClick(item);
                                        } else if (item.type === 'activity' && onActivityClick) {
                                            onActivityClick(item);
                                        }
                                    }}
                                >
                                    <td className="p-2 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.has(item.itemId)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                toggleSelectItem(item.itemId);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </td>
                                    {columns.includes('priority') && (
                                        <td className="p-2 text-center font-bold">
                                            {getPriorityIcon(item.priority)}
                                        </td>
                                    )}
                                    {columns.includes('title') && (
                                        <td className="p-2">
                                            <div className="flex items-center gap-2">
                                                {item.type === 'task' ? '📦' : '📋'}
                                                <span>{item.title}</span>
                                            </div>
                                        </td>
                                    )}
                                    {columns.includes('tab') && (
                                        <td className="p-2 text-center text-xs">{item.displayId || ''}</td>
                                    )}
                                    {columns.includes('goal') && (
                                        <td className="p-2 text-xs">{item.goalId || item.goal_id ? 'Assigned' : ''}</td>
                                    )}
                                    {columns.includes('startDate') && (
                                        <td className="p-2 text-xs">{formatDate(item.startDate || item.start_date)}</td>
                                    )}
                                    {columns.includes('endDate') && (
                                        <td className="p-2 text-xs">{formatDate(item.endDate || item.end_date)}</td>
                                    )}
                                    {columns.includes('deadline') && (
                                        <td className="p-2 text-xs">{formatDate(item.dueDate || item.due_date)}</td>
                                    )}
                                    {columns.includes('keyArea') && (
                                        <td className="p-2 text-xs">{getKeyAreaName(item.keyAreaId || item.key_area_id)}</td>
                                    )}
                                    {columns.includes('responsible') && (
                                        <td className="p-2 text-xs">{item.assignee || item.responsible || ''}</td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {sortedItems.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No items found
                    </div>
                )}
            </div>
        </div>
    );
}
