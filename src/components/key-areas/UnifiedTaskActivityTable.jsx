import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { FaCheck, FaTimes, FaTrash, FaLock, FaLockOpen, FaExternalLinkAlt, FaExclamation } from 'react-icons/fa';

/**
 * UnifiedTaskActivityTable - Displays tasks AND activities in a single table
 * Used for DELEGATED, TODO, and ACTIVITY TRAP tabs
 * 
 * Features:
 * - Inline editing of title, dates, key area, responsible person
 * - Mark as complete/incomplete
 * - Delete items
 * - Toggle private/public
 * - Mass selection and bulk edit
 * - Open detailed view modal
 */
export default function UnifiedTaskActivityTable({ 
    tasks = [], 
    activities = [], 
    viewTab,
    keyAreas = [],
    users = [],
    goals = [],
    onTaskClick,
    onActivityClick,
    onTaskUpdate,
    onActivityUpdate,
    onTaskDelete,
    onActivityDelete,
    onMassEdit
}) {
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [sortField, setSortField] = useState('priority');
    const [sortDirection, setSortDirection] = useState('desc');
    const [keyAreaFilter, setKeyAreaFilter] = useState('');
    const [responsibleFilter, setResponsibleFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showTasks, setShowTasks] = useState(true);
    const [showActivities, setShowActivities] = useState(true);
    const [editingCell, setEditingCell] = useState(null);
    const [editValues, setEditValues] = useState({});

    // Flatten tasks and activities into single array
    const allItems = useMemo(() => {
        const items = [];
        
        // Add all tasks
        if (showTasks) {
            tasks.forEach(task => {
                items.push({
                    ...task,
                    type: 'task',
                    itemId: `task-${task.id}`,
                    displayId: task.id,
                });
            });
        }
        
        // Add all activities
        if (showActivities) {
            activities.forEach(activity => {
                items.push({
                    ...activity,
                    type: 'activity',
                    itemId: `activity-${activity.id}`,
                    displayId: activity.id,
                });
            });
        }
        
        return items;
    }, [tasks, activities, showTasks, showActivities]);

    // Filter items
    const filteredItems = useMemo(() => {
        let filtered = allItems;
        
        // Key area filter
        if (keyAreaFilter) {
            filtered = filtered.filter(item => {
                const itemKeyArea = item.keyAreaId || item.key_area_id || item.key_area || item.keyArea;
                return String(itemKeyArea || '') === String(keyAreaFilter);
            });
        }
        
        // Responsible filter
        if (responsibleFilter) {
            filtered = filtered.filter(item => {
                const assignee = item.assignee || item.responsible || '';
                const assigneeId = item.assigneeId || item.assignee_id || item.responsibleId || item.responsible_id;
                return String(assigneeId || '') === String(responsibleFilter) || String(assignee) === String(responsibleFilter);
            });
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

            if (sortField === 'dueDate') {
                aVal = a.dueDate || a.due_date || a.deadline;
                bVal = b.dueDate || b.due_date || b.deadline;
            }

            if (sortField === 'startDate') {
                aVal = a.startDate || a.start_date;
                bVal = b.startDate || b.start_date;
            }

            if (sortField === 'endDate') {
                aVal = a.endDate || a.end_date;
                bVal = b.endDate || b.end_date;
            }
            
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

    const handleCompleteToggle = (item, e) => {
        e.stopPropagation();
        const isCompleted = item.dateCompleted || item.date_completed;
        const updatedItem = {
            ...item,
            dateCompleted: isCompleted ? null : new Date().toISOString(),
            date_completed: isCompleted ? null : new Date().toISOString()
        };
        
        if (item.type === 'task' && onTaskUpdate) {
            onTaskUpdate(item.id || item.task_id, updatedItem);
        } else if (item.type === 'activity' && onActivityUpdate) {
            onActivityUpdate(item.id || item.activity_id, updatedItem);
        }
    };

    const handleDelete = (item, e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete this ${item.type}?`)) {
            if (item.type === 'task' && onTaskDelete) {
                onTaskDelete(item.id || item.task_id);
            } else if (item.type === 'activity' && onActivityDelete) {
                onActivityDelete(item.id || item.activity_id);
            }
        }
    };

    const handleTogglePrivate = (item, e) => {
        e.stopPropagation();
        const updatedItem = {
            ...item,
            public: item.public ? 0 : 1
        };
        
        if (item.type === 'task' && onTaskUpdate) {
            onTaskUpdate(item.id || item.task_id, updatedItem);
        } else if (item.type === 'activity' && onActivityUpdate) {
            onActivityUpdate(item.id || item.activity_id, updatedItem);
        }
    };

    const handleCellEdit = (item, field, value) => {
        const updatedItem = { ...item, [field]: value };
        
        if (item.type === 'task' && onTaskUpdate) {
            onTaskUpdate(item.id || item.task_id, updatedItem);
        } else if (item.type === 'activity' && onActivityUpdate) {
            onActivityUpdate(item.id || item.activity_id, updatedItem);
        }
        
        setEditingCell(null);
    };

    const handleMassEdit = (e) => {
        e.stopPropagation();
        if (selectedItems.size > 0 && onMassEdit) {
            const selectedIds = Array.from(selectedItems);
            const tasks = selectedIds.filter(id => id.startsWith('task-')).map(id => id.replace('task-', ''));
            const acts = selectedIds.filter(id => id.startsWith('activity-')).map(id => id.replace('activity-', ''));
            onMassEdit({ taskIds: tasks, activityIds: acts });
        }
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
        if (!keyAreaId) return '';
        const ka = keyAreas.find(k => String(k.id) === String(keyAreaId));
        return ka?.name || ka?.title || ka?.keyArea || '';
    };

    const getGoalName = (goalId) => {
        if (!goalId) return '';
        const goal = goals.find(g => String(g.id) === String(goalId));
        return goal?.title || goal?.name || '';
    };

    return (
        <div className="flex flex-col h-full">
            {/* Special Header for Delegated View */}
            {viewTab === 'delegated' && (
                <div className="px-4 py-2 bg-white border-b">
                    <h3 className="text-lg font-semibold">Delegated Tasks</h3>
                </div>
            )}

            {/* Filters Row */}
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b flex-wrap">
                <span className="text-sm font-medium">Filter:</span>
                
                {/* Task/Activity Toggle Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowTasks(!showTasks)}
                        className={`p-2 rounded hover:bg-gray-200 ${showTasks ? 'text-blue-600' : 'text-gray-400'}`}
                        title="Filter tasks"
                    >
                        <span className="text-xl">📦</span>
                    </button>
                    <button
                        onClick={() => setShowActivities(!showActivities)}
                        className={`p-2 rounded hover:bg-gray-200 ${showActivities ? 'text-blue-600' : 'text-gray-400'}`}
                        title="Filter activities"
                    >
                        <span className="text-xl">📋</span>
                    </button>
                </div>

                {/* Key Area Filter */}
                <select
                    value={keyAreaFilter}
                    onChange={(e) => setKeyAreaFilter(e.target.value)}
                    className="px-3 py-1 text-sm border rounded bg-white"
                >
                    <option value="">Key Area</option>
                    {keyAreas.map((ka, idx) => (
                        <option key={ka.id} value={ka.id}>
                            {idx + 1}. {ka.name || ka.title}
                        </option>
                    ))}
                </select>

                {/* Responsible Filter - only if column is visible */}
                {columns.includes('responsible') && (
                    <select
                        value={responsibleFilter}
                        onChange={(e) => setResponsibleFilter(e.target.value)}
                        className="px-3 py-1 text-sm border rounded bg-white"
                    >
                        <option value="">Responsible</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id || user.member_id}>
                                {user.name || user.firstname} {user.lastname || ''}
                            </option>
                        ))}
                    </select>
                )}

                {/* Search */}
                <div className="ml-auto flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="px-3 py-1 text-sm border rounded w-48 bg-white"
                    />
                    <span className="text-blue-500 cursor-pointer">🔍</span>
                </div>

                {/* Mass Edit - hidden for delegated view */}
                {viewTab !== 'delegated' && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm">{selectedItems.size} selected</span>
                        <button
                            onClick={handleMassEdit}
                            className={`px-3 py-1 text-sm rounded ${
                                selectedItems.size === 0
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                            disabled={selectedItems.size === 0}
                        >
                            Mass edit
                        </button>
                    </div>
                )}
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
                            <th className="w-24 p-2 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedItems.map((item) => {
                            const deadlineValue = item.deadline || item.dueDate || item.due_date;
                            const overdue = isOverdue(deadlineValue, item.endDate || item.end_date);
                            const isCompleted = item.dateCompleted || item.date_completed;
                            const isPrivate = item.public === 0 || item.public === '0' ? true : false;
                            
                            return (
                                <tr
                                    key={item.itemId}
                                    className={`border-b hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''} ${isCompleted ? 'opacity-60' : ''}`}
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
                                        <td className="p-2 text-center font-bold text-red-600">
                                            {getPriorityIcon(item.priority)}
                                        </td>
                                    )}
                                    {columns.includes('title') && (
                                        <td 
                                            className="p-2 cursor-pointer hover:bg-blue-100"
                                            onClick={() => {
                                                if (item.type === 'task' && onTaskClick) {
                                                    onTaskClick(item);
                                                } else if (item.type === 'activity' && onActivityClick) {
                                                    onActivityClick(item);
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                {item.type === 'task' ? '📦' : '📋'}
                                                <span className={isCompleted ? 'line-through text-gray-500' : ''}>{item.title}</span>
                                            </div>
                                        </td>
                                    )}
                                    {columns.includes('tab') && (
                                        <td className="p-2 text-center text-xs">{item.displayId || ''}</td>
                                    )}
                                    {columns.includes('goal') && (
                                        <td className="p-2 text-xs">{getGoalName(item.goalId || item.goal_id)}</td>
                                    )}
                                    {columns.includes('startDate') && (
                                        <td className="p-2 text-xs">{formatDate(item.startDate || item.start_date)}</td>
                                    )}
                                    {columns.includes('endDate') && (
                                        <td className="p-2 text-xs">{formatDate(item.endDate || item.end_date)}</td>
                                    )}
                                    {columns.includes('deadline') && (
                                        <td className={`p-2 text-xs ${overdue ? 'text-red-600 font-bold' : ''}`}>
                                            {formatDate(deadlineValue)}
                                        </td>
                                    )}
                                    {columns.includes('keyArea') && (
                                        <td className="p-2 text-xs">
                                            {getKeyAreaName(item.keyAreaId || item.key_area_id || item.key_area || item.keyArea)}
                                        </td>
                                    )}
                                    {columns.includes('responsible') && (
                                        <td className="p-2 text-xs">{item.assignee || item.responsible || ''}</td>
                                    )}
                                    {/* Action Buttons */}
                                    <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {/* Open Details Link */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (item.type === 'task' && onTaskClick) {
                                                        onTaskClick(item);
                                                    } else if (item.type === 'activity' && onActivityClick) {
                                                        onActivityClick(item);
                                                    }
                                                }}
                                                className="text-blue-500 hover:text-blue-700 p-1"
                                                title="Open details"
                                            >
                                                <FaExternalLinkAlt size={14} />
                                            </button>

                                            {/* Toggle Complete */}
                                            {isCompleted ? (
                                                <button
                                                    onClick={(e) => handleCompleteToggle(item, e)}
                                                    className="text-gray-400 hover:text-red-600 p-1"
                                                    title="Mark as not completed"
                                                >
                                                    <FaTimes size={14} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => handleCompleteToggle(item, e)}
                                                    className="text-gray-400 hover:text-green-600 p-1"
                                                    title="Mark as completed"
                                                >
                                                    <FaCheck size={14} />
                                                </button>
                                            )}

                                            {/* Toggle Private/Public */}
                                            {viewTab !== 'delegated' && (
                                                <button
                                                    onClick={(e) => handleTogglePrivate(item, e)}
                                                    className={`p-1 ${isPrivate ? 'text-yellow-600' : 'text-gray-400'}`}
                                                    title={isPrivate ? 'Mark as public' : 'Mark as private'}
                                                >
                                                    {isPrivate ? (
                                                        <FaLock size={14} />
                                                    ) : (
                                                        <FaLockOpen size={14} />
                                                    )}
                                                </button>
                                            )}

                                            {/* Delete */}
                                            <button
                                                onClick={(e) => handleDelete(item, e)}
                                                className="text-gray-400 hover:text-red-700 p-1"
                                                title="Delete"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    </td>
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
