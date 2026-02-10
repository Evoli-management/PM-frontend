import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { FaCheck, FaTimes, FaTrash, FaLock, FaLockOpen, FaExternalLinkAlt, FaStop, FaAlignJustify, FaBan, FaSquare, FaListUl } from 'react-icons/fa';
import { toDateOnly } from '../../utils/keyareasHelpers';
import taskDelegationService from '../../services/taskDelegationService';
import activityDelegationService from '../../services/activityDelegationService';
import keyAreaService from '../../services/keyAreaService';

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
    currentUserId,
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
    const [editValue, setEditValue] = useState('');
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [acceptingTask, setAcceptingTask] = useState(null);
    const [acceptingActivity, setAcceptingActivity] = useState(null); // For activity delegation
    const [userKeyAreas, setUserKeyAreas] = useState([]);
    const [userTasks, setUserTasks] = useState([]); // For accept-into-task feature
    const [selectedKeyArea, setSelectedKeyArea] = useState('');
    const [selectedTaskForActivity, setSelectedTaskForActivity] = useState(''); // For accept-into-task
    const [respondingTaskId, setRespondingTaskId] = useState(null);

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
        
        // Debug: Log delegation status for delegated view
        if (viewTab === 'delegated') {
            console.log('🔍 Delegated tasks delegation status:', items.filter(i => i.type === 'task').map(t => ({
                id: t.id,
                title: t.title,
                delegationStatus: t.delegationStatus,
                delegation_status: t.delegation_status
            })));
        }
        
        return items;
    }, [tasks, activities, showTasks, showActivities, viewTab]);

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

    const handleCellEdit = (item, updates) => {
        if (item.type === 'task' && onTaskUpdate) {
            onTaskUpdate(item.id || item.task_id, updates);
        } else if (item.type === 'activity' && onActivityUpdate) {
            // For activities, map frontend field names to backend expected names
            const activityUpdates = { ...updates };
            
            // Backend expects 'text' not 'title' or 'name' for activity content
            if (updates.title !== undefined || updates.name !== undefined) {
                activityUpdates.text = updates.title || updates.name;
                delete activityUpdates.title;
                delete activityUpdates.name;
            }
            
            // Backend expects snake_case for dates
            if (updates.start_date !== undefined) {
                activityUpdates.startDate = updates.start_date;
                delete activityUpdates.start_date;
            }
            if (updates.end_date !== undefined) {
                activityUpdates.endDate = updates.end_date;
                delete activityUpdates.end_date;
            }
            if (updates.due_date !== undefined) {
                activityUpdates.deadline = updates.due_date;
                delete activityUpdates.due_date;
            }
            
            // Map key area and assignee IDs (backend might not support these for activities)
            if (updates.key_area_id !== undefined) {
                delete activityUpdates.key_area_id;
                delete activityUpdates.keyAreaId;
            }
            if (updates.assignee_id !== undefined || updates.responsible_id !== undefined) {
                delete activityUpdates.assignee_id;
                delete activityUpdates.responsible_id;
                delete activityUpdates.assigneeId;
                delete activityUpdates.responsibleId;
            }
            
            onActivityUpdate(item.id || item.activity_id, activityUpdates);
        }
        
        setEditingCell(null);
        setEditValue('');
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

    const getCellKey = (item, field) => `${item.itemId}-${field}`;

    const startEdit = (item, field, value) => {
        setEditingCell(getCellKey(item, field));
        setEditValue(value ?? '');
    };

    const cancelEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    const saveEdit = async (item, field, value) => {
        const updates = {};
        
        // Standard field updates
        if (field === 'title') {
            updates.title = value;
            updates.name = value;
        } else if (field === 'startDate') {
            const v = value ? toDateOnly(value) : null;
            updates.start_date = v;
            updates.startDate = v;
        } else if (field === 'endDate') {
            const v = value ? toDateOnly(value) : null;
            updates.end_date = v;
            updates.endDate = v;
        } else if (field === 'deadline') {
            const v = value ? toDateOnly(value) : null;
            updates.deadline = v;
            updates.dueDate = v;
            updates.due_date = v;
        } else if (field === 'keyAreaId') {
            updates.keyAreaId = value || null;
            updates.key_area_id = value || null;
        } else if (field === 'responsibleId') {
            // Handle responsible/assignee changes with auto-delegation
            if (item.type === 'task' && value) {
                // Find the selected user to get both ID and name
                const selectedUser = users.find(u => String(u.id || u.member_id) === String(value));
                
                if (selectedUser) {
                    const userId = selectedUser.id || selectedUser.member_id;
                    
                    // Set assignee name for display
                    if (String(userId) === String(currentUserId)) {
                        updates.assignee = 'Me';
                    } else {
                        updates.assignee = `${selectedUser.name || selectedUser.firstname || ''} ${selectedUser.lastname || ''}`.trim();
                    }
                    
                    // Add delegatedToUserId to auto-create delegation (only if different user)
                    if (String(userId) !== String(currentUserId)) {
                        updates.delegatedToUserId = userId;
                    }
                }
            } else {
                // Fallback for activities or empty value
                updates.assigneeId = value || null;
                updates.assignee_id = value || null;
                updates.responsibleId = value || null;
                updates.responsible_id = value || null;
            }
        } else if (field === 'goalId') {
            updates.goalId = value || null;
            updates.goal_id = value || null;
        } else {
            updates[field] = value;
        }

        handleCellEdit(item, updates);
    };

    const getResponsibleLabel = (item) => {
        // For delegated view, show who delegated the task (delegatedBy)
        if (viewTab === 'delegated') {
            // First try to get delegator from the delegatedByUser object (enriched by backend)
            if (item.delegatedByUser) {
                const delegator = item.delegatedByUser;
                return `${delegator.firstName || ''} ${delegator.lastName || ''}`.trim();
            }
            
            // Fallback to delegatedByUserId if we have the users list
            const delegatorId = item.delegatedByUserId || item.delegated_by_user_id;
            if (delegatorId) {
                const user = users.find(u => String(u.id || u.member_id) === String(delegatorId));
                if (user) return `${user.name || user.firstname || ''} ${user.lastname || ''}`.trim();
            }
            return '';
        }
        
        // For other views, show assignee/responsible
        const id = item.assigneeId || item.assignee_id || item.responsibleId || item.responsible_id;
        const user = users.find(u => String(u.id || u.member_id) === String(id));
        if (user) return `${user.name || user.firstname || ''} ${user.lastname || ''}`.trim();
        return item.assignee || item.responsible || '';
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
        return ['priority', 'title', 'startDate', 'endDate', 'deadline', 'keyArea', 'responsible'];
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

    const getUserName = (userId) => {
        if (!userId) return '';
        const user = users.find(u => String(u.id || u.member_id) === String(userId));
        return user ? (user.name || `${user.firstname || ''} ${user.lastname || ''}`.trim()) : '';
    };

    const handleAcceptClick = async (task) => {
        // Load user's key areas for selection
        setAcceptingTask(task);
        setShowAcceptModal(true);
        
        try {
            const areas = await keyAreaService.list();
            setUserKeyAreas(areas || []);
        } catch (error) {
            console.error('Failed to load key areas:', error);
            setUserKeyAreas([]);
        }
    };

    const confirmAcceptDelegation = async () => {
        if (!selectedKeyArea || !acceptingTask) return;
        
        setRespondingTaskId(acceptingTask.id);
        try {
            await taskDelegationService.acceptDelegation(acceptingTask.id, {
                keyAreaId: selectedKeyArea,
            });
            
            alert('Task accepted successfully! The new task has been added to your selected Key Area.');
            
            // Close modal
            setShowAcceptModal(false);
            setAcceptingTask(null);
            setSelectedKeyArea('');
            
            // Redirect to the selected key area to view the new task (matching legacy behavior)
            window.location.href = `/key-areas?id=${selectedKeyArea}`;
        } catch (error) {
            console.error('Failed to accept delegation:', error);
            alert(error.response?.data?.message || 'Failed to accept delegation');
        } finally {
            setRespondingTaskId(null);
        }
    };

    const handleRejectClick = async (task) => {
        if (!confirm('Are you sure you want to reject this delegation?')) return;
        
        setRespondingTaskId(task.id);
        try {
            await taskDelegationService.rejectDelegation(task.id);
            
            // Update local state - mark as rejected
            if (onTaskUpdate) {
                onTaskUpdate(task.id, { delegationStatus: 'rejected' });
            }
            
            alert('Task rejected successfully');
        } catch (error) {
            console.error('Failed to reject delegation:', error);
            alert(error.response?.data?.message || 'Failed to reject delegation');
        } finally {
            setRespondingTaskId(null);
        }
    };

    // Activity delegation handlers
    const handleAcceptActivityClick = async (activity) => {
        // Load user's key areas and tasks for selection
        setAcceptingActivity(activity);
        setShowAcceptModal(true);
        
        try {
            const areas = await keyAreaService.list();
            setUserKeyAreas(areas || []);
            
            // Also load user's tasks for the accept-into-task option
            // This will be populated when a key area is selected
            setUserTasks([]);
        } catch (error) {
            console.error('Failed to load key areas:', error);
            setUserKeyAreas([]);
        }
    };

    const handleKeyAreaChangeForActivity = async (keyAreaId) => {
        setSelectedKeyArea(keyAreaId);
        setSelectedTaskForActivity(''); // Reset task selection
        
        if (keyAreaId) {
            try {
                // Load tasks for the selected key area
                const response = await fetch(`/api/tasks?keyAreaId=${keyAreaId}`);
                if (response.ok) {
                    const tasksData = await response.json();
                    setUserTasks(tasksData || []);
                }
            } catch (error) {
                console.error('Failed to load tasks:', error);
                setUserTasks([]);
            }
        } else {
            setUserTasks([]);
        }
    };

    const confirmAcceptActivityDelegation = async () => {
        if (!selectedKeyArea || !acceptingActivity) return;
        
        setRespondingTaskId(acceptingActivity.id);
        try {
            const payload = {
                keyAreaId: selectedKeyArea,
            };
            
            // If user selected an existing task, add it to payload
            if (selectedTaskForActivity) {
                payload.taskId = selectedTaskForActivity;
            }
            
            const result = await activityDelegationService.acceptDelegation(acceptingActivity.id, payload);
            
            if (result.type === 'task') {
                alert('Activity accepted and converted to a task in your selected Key Area!');
            } else {
                alert('Activity accepted and added to the selected task!');
            }
            
            // Close modal
            setShowAcceptModal(false);
            setAcceptingActivity(null);
            setSelectedKeyArea('');
            setSelectedTaskForActivity('');
            setUserTasks([]);
            
            // Redirect to the selected key area
            window.location.href = `/key-areas?id=${selectedKeyArea}`;
        } catch (error) {
            console.error('Failed to accept activity delegation:', error);
            alert(error.response?.data?.message || 'Failed to accept activity delegation');
        } finally {
            setRespondingTaskId(null);
        }
    };

    const handleRejectActivityClick = async (activity) => {
        if (!confirm('Are you sure you want to reject this activity delegation?')) return;
        
        setRespondingTaskId(activity.id);
        try {
            await activityDelegationService.rejectDelegation(activity.id);
            
            // Update local state - mark as rejected
            if (onActivityUpdate) {
                onActivityUpdate(activity.id, { delegationStatus: 'rejected' });
            }
            
            alert('Activity rejected successfully');
        } catch (error) {
            console.error('Failed to reject activity delegation:', error);
            alert(error.response?.data?.message || 'Failed to reject activity delegation');
        } finally {
            setRespondingTaskId(null);
        }
    };

    return (
        <div className="flex flex-col h-full ta-legacy">
            {/* Special Header for Delegated View */}
            {viewTab === 'delegated' && (
                <div className="px-4 py-3 bg-white border-b ta-header">
                    <h3 className="text-lg font-semibold text-center ta-accent">Delegated Tasks</h3>
                </div>
            )}

            {/* Filters Row */}
            <div className="flex items-center justify-between gap-3 px-4 py-2 bg-white border-b flex-wrap ta-filters-row">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium ta-filter-label">Filter:</span>

                    {/* Task/Activity Toggle Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowTasks(!showTasks)}
                            className={`ta-toggle-btn ${showTasks ? 'is-active' : ''}`}
                            title="Filter tasks"
                        >
                            <FaStop className="text-xs" />
                        </button>
                        <button
                            onClick={() => setShowActivities(!showActivities)}
                            className={`ta-toggle-btn ${showActivities ? 'is-active' : ''}`}
                            title="Filter activities"
                        >
                            <FaAlignJustify className="text-xs" />
                        </button>
                    </div>

                    {/* Key Area Filter */}
                    <select
                        value={keyAreaFilter}
                        onChange={(e) => setKeyAreaFilter(e.target.value)}
                        className="ta-filter-control"
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
                            className="ta-filter-control"
                        >
                            <option value="">Responsible</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id || user.member_id}>
                                    {user.name || user.firstname} {user.lastname || ''}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="ta-filter-control ta-search-input"
                        />
                        <span className="ta-accent cursor-pointer">🔍</span>
                    </div>

                    {/* Mass Edit - hidden for delegated view */}
                    {viewTab !== 'delegated' && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm ta-selected-count">{selectedItems.size} selected</span>
                            <button
                                onClick={handleMassEdit}
                                className={`ta-mass-edit-btn ${
                                    selectedItems.size === 0 ? 'is-disabled' : ''
                                }`}
                                disabled={selectedItems.size === 0}
                            >
                                Mass edit
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm ta-table">
                    <thead className="bg-slate-50 sticky top-0 ta-thead">
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
                                <th className="w-32 p-2">{viewTab === 'delegated' ? 'Received From' : 'Responsible'}</th>
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
                            const titleKey = getCellKey(item, 'title');
                            const startDateKey = getCellKey(item, 'startDate');
                            const endDateKey = getCellKey(item, 'endDate');
                            const deadlineKey = getCellKey(item, 'deadline');
                            const keyAreaKey = getCellKey(item, 'keyAreaId');
                            const responsibleKey = getCellKey(item, 'responsibleId');
                            const goalKey = getCellKey(item, 'goalId');
                            const titleValue = item.title || item.name || item.text || item.activity_name || '';
                            const startDateValue = toDateOnly(item.startDate || item.start_date);
                            const endDateValue = toDateOnly(item.endDate || item.end_date);
                            const deadlineValueInput = toDateOnly(deadlineValue);
                            const keyAreaIdValue = item.keyAreaId || item.key_area_id || item.key_area || item.keyArea || '';
                            const responsibleIdValue = item.assigneeId || item.assignee_id || item.responsibleId || item.responsible_id || '';
                            const responsibleNameValue = item.assignee || item.responsible || getUserName(responsibleIdValue);
                            const goalIdValue = item.goalId || item.goal_id || '';
                            
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
                                        <td className="p-2 text-center font-bold ta-priority">
                                            {getPriorityIcon(item.priority)}
                                        </td>
                                    )}
                                    {columns.includes('title') && (
                                        <td 
                                            className="p-2 hover:bg-blue-100"
                                            onClick={() => {
                                                if (editingCell === titleKey) return;
                                                if (item.type === 'task' && onTaskClick) {
                                                    onTaskClick(item);
                                                } else if (item.type === 'activity' && onActivityClick) {
                                                    onActivityClick(item);
                                                }
                                            }}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(item, 'title', titleValue);
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                {viewTab === 'delegated' ? (
                                                    item.type === 'task' ? (
                                                        <FaSquare title="Task" className="text-blue-600 flex-shrink-0" />
                                                    ) : (
                                                        <FaListUl title="Activity" className="text-purple-600 flex-shrink-0" />
                                                    )
                                                ) : (
                                                    item.type === 'task' ? '📦' : '📋'
                                                )}
                                                {editingCell === titleKey ? (
                                                    <input
                                                        autoFocus
                                                        className="w-full border rounded px-2 py-1 text-sm"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={() => saveEdit(item, 'title', editValue)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') saveEdit(item, 'title', editValue);
                                                            if (e.key === 'Escape') cancelEdit();
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span className={isCompleted ? 'line-through text-gray-500' : ''}>{titleValue || 'Untitled'}</span>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    {columns.includes('tab') && (
                                        <td className="p-2 text-xs text-center">
                                            {item.list_index || item.listIndex || item.list || ''}
                                        </td>
                                    )}
                                    {columns.includes('goal') && (
                                        <td
                                            className="p-2 text-xs"
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(item, 'goalId', String(goalIdValue || ''));
                                            }}
                                        >
                                            {editingCell === goalKey ? (
                                                <select
                                                    autoFocus
                                                    className="w-full border rounded px-2 py-1 text-xs"
                                                    value={editValue}
                                                    onChange={(e) => saveEdit(item, 'goalId', e.target.value)}
                                                    onBlur={cancelEdit}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="">Goal</option>
                                                    {goals.map((g) => (
                                                        <option key={g.id} value={g.id}>
                                                            {g.title || g.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span>{getGoalName(goalIdValue)}</span>
                                            )}
                                        </td>
                                    )}
                                    {columns.includes('startDate') && (
                                        <td
                                            className="p-2 text-xs"
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(item, 'startDate', startDateValue);
                                            }}
                                        >
                                            {editingCell === startDateKey ? (
                                                <input
                                                    autoFocus
                                                    type="date"
                                                    className="w-full border rounded px-2 py-1 text-xs"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => saveEdit(item, 'startDate', editValue)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span>{formatDate(startDateValue)}</span>
                                            )}
                                        </td>
                                    )}
                                    {columns.includes('endDate') && (
                                        <td
                                            className="p-2 text-xs"
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(item, 'endDate', endDateValue);
                                            }}
                                        >
                                            {editingCell === endDateKey ? (
                                                <input
                                                    autoFocus
                                                    type="date"
                                                    className="w-full border rounded px-2 py-1 text-xs"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => saveEdit(item, 'endDate', editValue)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span>{formatDate(endDateValue)}</span>
                                            )}
                                        </td>
                                    )}
                                    {columns.includes('deadline') && (
                                        <td
                                            className={`p-2 text-xs ${overdue ? 'text-red-600 font-bold' : ''}`}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(item, 'deadline', deadlineValueInput);
                                            }}
                                        >
                                            {editingCell === deadlineKey ? (
                                                <input
                                                    autoFocus
                                                    type="date"
                                                    className="w-full border rounded px-2 py-1 text-xs"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => saveEdit(item, 'deadline', editValue)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span>{formatDate(deadlineValue)}</span>
                                            )}
                                        </td>
                                    )}
                                    {columns.includes('keyArea') && (
                                        <td
                                            className="p-2 text-xs"
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(item, 'keyAreaId', String(keyAreaIdValue || ''));
                                            }}
                                        >
                                            {editingCell === keyAreaKey ? (
                                                <select
                                                    autoFocus
                                                    className="w-full border rounded px-2 py-1 text-xs"
                                                    value={editValue}
                                                    onChange={(e) => saveEdit(item, 'keyAreaId', e.target.value)}
                                                    onBlur={cancelEdit}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="">Key Area</option>
                                                    {keyAreas.map((ka, idx) => (
                                                        <option key={ka.id} value={ka.id}>
                                                            {idx + 1}. {ka.name || ka.title}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span>{getKeyAreaName(keyAreaIdValue)}</span>
                                            )}
                                        </td>
                                    )}
                                    {columns.includes('responsible') && (
                                        <td
                                            className="p-2 text-xs"
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(item, 'responsibleId', String(responsibleIdValue || ''));
                                            }}
                                        >
                                            {editingCell === responsibleKey ? (
                                                <select
                                                    autoFocus
                                                    className="w-full border rounded px-2 py-1 text-xs"
                                                    value={editValue}
                                                    onChange={(e) => saveEdit(item, 'responsibleId', e.target.value)}
                                                    onBlur={cancelEdit}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="">Responsible</option>
                                                    {users.map((user) => (
                                                        <option key={user.id || user.member_id} value={user.id || user.member_id}>
                                                            {user.name || user.firstname} {user.lastname || ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span>{responsibleNameValue || '—'}</span>
                                            )}
                                        </td>
                                    )}
                                    {/* Action Buttons */}
                                    <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {/* Debug delegation status */}
                                            {viewTab === 'delegated' && item.type === 'task' && (() => {
                                                const isPending = item.delegationStatus === 'pending' || item.delegation_status === 'pending';
                                                if (!isPending) {
                                                    console.log('⚠️ Task not showing accept/reject buttons:', {
                                                        id: item.id,
                                                        title: item.title,
                                                        viewTab,
                                                        type: item.type,
                                                        delegationStatus: item.delegationStatus,
                                                        delegation_status: item.delegation_status
                                                    });
                                                }
                                                return null;
                                            })()}
                                            {/* Accept/Reject for pending delegations */}
                                            {viewTab === 'delegated' && item.type === 'task' && (item.delegationStatus === 'pending' || item.delegation_status === 'pending') ? (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAcceptClick(item);
                                                        }}
                                                        disabled={respondingTaskId === item.id}
                                                        className="text-green-600 hover:text-green-700 p-1 disabled:opacity-50"
                                                        title="Accept this delegation"
                                                    >
                                                        <FaCheck size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRejectClick(item);
                                                        }}
                                                        disabled={respondingTaskId === item.id}
                                                        className="text-red-600 hover:text-red-700 p-1 disabled:opacity-50"
                                                        title="Reject this delegation"
                                                    >
                                                        <FaBan size={14} />
                                                    </button>
                                                </>
                                            ) : viewTab === 'delegated' && item.type === 'activity' && (item.delegationStatus === 'pending' || item.delegation_status === 'pending') ? (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAcceptActivityClick(item);
                                                        }}
                                                        disabled={respondingTaskId === item.id}
                                                        className="text-green-600 hover:text-green-700 p-1 disabled:opacity-50"
                                                        title="Accept this activity delegation"
                                                    >
                                                        <FaCheck size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRejectActivityClick(item);
                                                        }}
                                                        disabled={respondingTaskId === item.id}
                                                        className="text-red-600 hover:text-red-700 p-1 disabled:opacity-50"
                                                        title="Reject this activity delegation"
                                                    >
                                                        <FaBan size={14} />
                                                    </button>
                                                </>
                                            ) : viewTab === 'delegated' ? (
                                                // For delegated view with accepted/rejected tasks - only show view link
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (item.type === 'task' && onTaskClick) {
                                                            onTaskClick(item);
                                                        } else if (item.type === 'activity' && onActivityClick) {
                                                            onActivityClick(item);
                                                        }
                                                    }}
                                                    className="ta-accent hover:opacity-80 p-1"
                                                    title="Open details"
                                                >
                                                    <FaExternalLinkAlt size={14} />
                                                </button>
                                            ) : (
                                                <>
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
                                                        className="ta-accent hover:opacity-80 p-1"
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
                                                </>
                                            )}
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

            {/* Accept Delegation Modal - Styled to match app theme */}
            {showAcceptModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-[#2c3e50] rounded-lg shadow-2xl w-full max-w-md border border-gray-600">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-600">
                            <div className="flex items-center gap-2">
                                <FaCheck className="text-green-400" />
                                <h2 className="text-lg font-semibold text-white">
                                    Accept Delegation
                                </h2>
                            </div>
                            <button
                                onClick={() => {
                                    setShowAcceptModal(false);
                                    setAcceptingTask(null);
                                    setAcceptingActivity(null);
                                    setSelectedKeyArea('');
                                    setSelectedTaskForActivity('');
                                    setUserTasks([]);
                                }}
                                className="text-gray-400 hover:text-white"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4">
                            {acceptingTask && (
                                <div className="bg-[#34495e] p-3 rounded-lg mb-4 border border-gray-600">
                                    <p className="text-sm text-gray-400 mb-1">Task:</p>
                                    <p className="font-medium text-white">
                                        {acceptingTask.title}
                                    </p>
                                </div>
                            )}
                            
                            {acceptingActivity && (
                                <div className="bg-[#34495e] p-3 rounded-lg mb-4 border border-gray-600">
                                    <p className="text-sm text-gray-400 mb-1">Activity:</p>
                                    <p className="font-medium text-white">
                                        {acceptingActivity.text}
                                    </p>
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Select Key Area <span className="text-red-400">*</span>
                                </label>
                                <p className="text-xs text-gray-400 mb-2">
                                    Choose which Key Area to add this {acceptingTask ? 'task' : 'activity'} to
                                </p>
                                <select
                                    value={selectedKeyArea}
                                    onChange={(e) => acceptingActivity ? handleKeyAreaChangeForActivity(e.target.value) : setSelectedKeyArea(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-600 rounded-lg 
                                             bg-[#34495e] text-white focus:ring-2 focus:ring-blue-500 
                                             focus:border-transparent"
                                >
                                    <option value="">-- Select a Key Area --</option>
                                    {userKeyAreas.map((area) => (
                                        <option key={area.id} value={area.id}>
                                            {area.title || area.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Task selector for activities (accept-into-task feature) */}
                            {acceptingActivity && selectedKeyArea && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Add to Existing Task (Optional)
                                    </label>
                                    <p className="text-xs text-gray-400 mb-2">
                                        Leave empty to convert activity into a new task, or select a task to add this activity to it
                                    </p>
                                    <select
                                        value={selectedTaskForActivity}
                                        onChange={(e) => setSelectedTaskForActivity(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-600 rounded-lg 
                                                 bg-[#34495e] text-white focus:ring-2 focus:ring-blue-500 
                                                 focus:border-transparent"
                                    >
                                        <option value="">-- Create New Task --</option>
                                        {userTasks.map((task) => (
                                            <option key={task.id} value={task.id}>
                                                {task.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-600">
                            <button
                                onClick={() => {
                                    setShowAcceptModal(false);
                                    setAcceptingTask(null);
                                    setAcceptingActivity(null);
                                    setSelectedKeyArea('');
                                    setSelectedTaskForActivity('');
                                    setUserTasks([]);
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#34495e] 
                                         rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={acceptingTask ? confirmAcceptDelegation : confirmAcceptActivityDelegation}
                                disabled={!selectedKeyArea || respondingTaskId}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 
                                         rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {respondingTaskId ? 'Accepting...' : `Accept ${acceptingTask ? 'Task' : 'Activity'}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
