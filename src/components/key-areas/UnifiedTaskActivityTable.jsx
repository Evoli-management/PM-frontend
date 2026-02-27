import React, { useState, useMemo, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { FaCheck, FaTimes, FaTrash, FaLock, FaLockOpen, FaExternalLinkAlt, FaStop, FaAlignJustify, FaBan, FaSquare, FaListUl, FaEllipsisV } from 'react-icons/fa';
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
    const [sortField, setSortField] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
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
    const [openRowMenuId, setOpenRowMenuId] = useState(null);

    useEffect(() => {
        if (!openRowMenuId) return;
        const onDown = (e) => {
            if (e.target.closest('[data-row-actions-menu]')) return;
            if (e.target.closest('[data-row-actions-btn]')) return;
            setOpenRowMenuId(null);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [openRowMenuId]);

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
        if (!sortField) return filteredItems;
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

            if (sortField === 'keyArea') {
                const aKaId = a.keyAreaId || a.key_area_id || a.key_area || a.keyArea || '';
                const bKaId = b.keyAreaId || b.key_area_id || b.key_area || b.keyArea || '';
                const aKa = keyAreas.find(k => String(k.id) === String(aKaId));
                const bKa = keyAreas.find(k => String(k.id) === String(bKaId));
                aVal = aKa?.name || aKa?.title || aKa?.keyArea || '';
                bVal = bKa?.name || bKa?.title || bKa?.keyArea || '';
            }

            if (sortField === 'responsible') {
                if (viewTab === 'delegated') {
                    const aDelegatorId = a.delegatedByUserId || a.delegated_by_user_id;
                    const bDelegatorId = b.delegatedByUserId || b.delegated_by_user_id;
                    const aDelegator = users.find(u => String(u.id || u.member_id) === String(aDelegatorId));
                    const bDelegator = users.find(u => String(u.id || u.member_id) === String(bDelegatorId));
                    aVal = (a.delegatedByUser && `${a.delegatedByUser.firstName || ''} ${a.delegatedByUser.lastName || ''}`.trim()) || (aDelegator ? `${aDelegator.name || aDelegator.firstname || ''} ${aDelegator.lastname || ''}`.trim() : '');
                    bVal = (b.delegatedByUser && `${b.delegatedByUser.firstName || ''} ${b.delegatedByUser.lastName || ''}`.trim()) || (bDelegator ? `${bDelegator.name || bDelegator.firstname || ''} ${bDelegator.lastname || ''}`.trim() : '');
                } else {
                    const aUserId = a.assigneeId || a.assignee_id || a.responsibleId || a.responsible_id || a.delegatedToUserId || a.delegated_to_user_id;
                    const bUserId = b.assigneeId || b.assignee_id || b.responsibleId || b.responsible_id || b.delegatedToUserId || b.delegated_to_user_id;
                    const aUser = users.find(u => String(u.id || u.member_id) === String(aUserId));
                    const bUser = users.find(u => String(u.id || u.member_id) === String(bUserId));
                    aVal = aUser ? `${aUser.name || aUser.firstname || ''} ${aUser.lastname || ''}`.trim() : (a.assignee || a.responsible || '');
                    bVal = bUser ? `${bUser.name || bUser.firstname || ''} ${bUser.lastname || ''}`.trim() : (b.assignee || b.responsible || '');
                }
            }

            if (sortField === 'tab') {
                aVal = Number(a.list_index ?? a.listIndex ?? a.list ?? 0);
                bVal = Number(b.list_index ?? b.listIndex ?? b.list ?? 0);
            }

            if (sortField === 'goal') {
                const aGoalId = a.goalId || a.goal_id || '';
                const bGoalId = b.goalId || b.goal_id || '';
                const aGoal = goals.find(g => String(g.id) === String(aGoalId));
                const bGoal = goals.find(g => String(g.id) === String(bGoalId));
                aVal = aGoal?.title || aGoal?.name || '';
                bVal = bGoal?.title || bGoal?.name || '';
            }

            if (aVal === bVal) return 0;
            const comparison = aVal < bVal ? -1 : 1;
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        return sorted;
    }, [filteredItems, sortField, sortDirection]);

    const handleSort = (field) => {
        if (sortField !== field) {
            setSortField(field);
            setSortDirection('asc');
            return;
        }
        if (sortDirection === 'asc') {
            setSortDirection('desc');
            return;
        }
        setSortField(null);
        setSortDirection('asc');
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
        // For activities, also check the 'completed' boolean field and 'completionDate'
        const isCompleted = item.dateCompleted || item.date_completed || item.completionDate || (item.type === 'activity' && item.completed);
        const updatedItem = {
            ...item,
            dateCompleted: isCompleted ? null : new Date().toISOString(),
            date_completed: isCompleted ? null : new Date().toISOString(),
            completionDate: isCompleted ? null : new Date().toISOString(),
            ...(item.type === 'activity' ? { 
                completed: !isCompleted,
                status: isCompleted ? 'open' : 'done'
            } : {})
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
            
            // Backend expects camelCase for dates
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
            
            // Activities don't have key_area, list, or assignee fields (they inherit from parent task)
            // Remove all unsupported fields
            const unsupportedFields = [
                'key_area_id', 'keyAreaId', 'keyArea',
                'list', 'listIndex', 'list_index',
                'assignee_id', 'responsible_id', 'assigneeId', 'responsibleId',
                'assignee', 'responsible'
            ];
            unsupportedFields.forEach(field => delete activityUpdates[field]);
            
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
        } else if (field === 'priority') {
            updates.priority = value;
            updates.priority_level = value;
            updates.priorityLevel = value;
        } else if (field === 'listIndex') {
            const v = value === '' || value === null ? null : Number(value);
            updates.listIndex = Number.isNaN(v) ? value : v;
            updates.list_index = Number.isNaN(v) ? value : v;
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
            } else if (item.type === 'activity') {
                // For activities, use delegatedToUserId (auto-creates delegation)
                if (value && String(value) !== String(currentUserId)) {
                    updates.delegatedToUserId = value;
                } else {
                    // Clear delegation if assigning to self or empty
                    updates.delegatedToUserId = null;
                }
            } else {
                // Fallback for empty value or unknown types
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
        // For activities, delegatedToUserId represents the assigned user
        const id = item.assigneeId || item.assignee_id || item.responsibleId || item.responsible_id || item.delegatedToUserId || item.delegated_to_user_id;
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
            return ['title', 'responsible', 'keyArea', 'priority', 'deadline'];
        } else if (viewTab === 'todo') {
            return ['title', 'responsible', 'keyArea', 'tab', 'priority', 'startDate', 'endDate', 'deadline'];
        } else if (viewTab === 'activity-trap') {
            return ['title', 'keyArea', 'tab', 'goal', 'priority', 'startDate', 'endDate', 'deadline'];
        }
        return ['title', 'responsible', 'keyArea', 'priority', 'startDate', 'endDate', 'deadline'];
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
                // Load tasks for the selected key area using service
                if (String(keyAreaId).startsWith('__missing_')) {
                    setUserTasks([]);
                    return;
                }
                const { get } = await import('../../services/taskService');
                const tasks = await get({ keyAreaId });
                setUserTasks(Array.isArray(tasks) ? tasks : []);
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
        <div className="flex flex-col h-full min-h-0 bg-white border border-slate-200 rounded-lg overflow-hidden">
            {/* Special Header for Delegated View */}
            {viewTab === 'delegated' && (
                <div className="px-4 py-3 bg-white border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-center text-slate-900">Delegated Tasks</h3>
                </div>
            )}

            {/* Filters Row */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-slate-700">Filter:</span>

                    {/* Task/Activity Toggle Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowTasks(!showTasks)}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-md border transition ${
                                showTasks
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                            title="Filter tasks"
                        >
                            <FaStop className="text-xs" />
                        </button>
                        <button
                            onClick={() => setShowActivities(!showActivities)}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-md border transition ${
                                showActivities
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                            title="Filter activities"
                        >
                            <FaAlignJustify className="text-xs" />
                        </button>
                    </div>

                    {/* Key Area Filter */}
                    <select
                        value={keyAreaFilter}
                        onChange={(e) => setKeyAreaFilter(e.target.value)}
                        className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        <span className="text-slate-500 cursor-default">🔍</span>
                    </div>

                    {/* Mass Edit - hidden for delegated view */}
                    {viewTab !== 'delegated' && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600">{selectedItems.size} selected</span>
                            <button
                                onClick={handleMassEdit}
                                className="px-3 py-2 rounded-md text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={selectedItems.size === 0}
                            >
                                Mass edit
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 h-0 min-h-0 overflow-y-auto overflow-x-auto -mx-2 sm:mx-0">
                <table className="min-w-full text-sm whitespace-nowrap sm:whitespace-normal">
                    <thead className="bg-slate-50 border border-slate-200 text-slate-700">
                        <tr>
                            <th className="w-8 px-2 sm:px-3 py-2 text-left"></th>
                            {columns.includes('title') && (
                                <>
                                  <th className="px-2 sm:px-3 py-2 text-left font-semibold cursor-pointer hover:bg-slate-100" onClick={() => handleSort('title')}>
                                      Title {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                                  </th>
                                </>
                            )}
                            {columns.includes('responsible') && (
                                <th
                                    className="w-40 px-2 sm:px-3 py-2 text-left font-semibold cursor-pointer hover:bg-slate-100"
                                    onClick={() => handleSort('responsible')}
                                >
                                    {viewTab === 'delegated' ? 'Received From' : 'Responsible'} {sortField === 'responsible' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                            {columns.includes('keyArea') && (
                                <th
                                    className="w-32 px-2 sm:px-3 py-2 text-left font-semibold cursor-pointer hover:bg-slate-100"
                                    onClick={() => handleSort('keyArea')}
                                >
                                    Key Area {sortField === 'keyArea' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                            {columns.includes('tab') && (
                                <th
                                    className="w-20 px-2 sm:px-3 py-2 text-left font-semibold cursor-pointer hover:bg-slate-100"
                                    onClick={() => handleSort('tab')}
                                >
                                    Tab {sortField === 'tab' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                            {columns.includes('priority') && (
                                <th className="w-28 px-2 sm:px-3 py-2 text-left font-semibold cursor-pointer hover:bg-slate-100" onClick={() => handleSort('priority')}>
                                    Priority {sortField === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                            {columns.includes('goal') && (
                                <th
                                    className="w-40 px-2 sm:px-3 py-2 text-left font-semibold cursor-pointer hover:bg-slate-100"
                                    onClick={() => handleSort('goal')}
                                >
                                    Goal {sortField === 'goal' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                            {columns.includes('startDate') && (
                                <th className="w-28 px-2 sm:px-3 py-2 text-left font-semibold cursor-pointer hover:bg-slate-100" onClick={() => handleSort('startDate')}>
                                    Start {sortField === 'startDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                            {columns.includes('endDate') && (
                                <th className="w-28 px-2 sm:px-3 py-2 text-left font-semibold cursor-pointer hover:bg-slate-100" onClick={() => handleSort('endDate')}>
                                    End {sortField === 'endDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                            {columns.includes('deadline') && (
                                <th className="w-28 px-2 sm:px-3 py-2 text-left font-semibold cursor-pointer hover:bg-slate-100" onClick={() => handleSort('dueDate')}>
                                    Deadline {sortField === 'dueDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {sortedItems.map((item) => {
                            const deadlineValue = item.deadline || item.dueDate || item.due_date;
                            const overdue = isOverdue(deadlineValue, item.endDate || item.end_date);
                            // For activities, also check the 'completed' boolean field and 'completionDate'
                            const isCompleted = item.dateCompleted || item.date_completed || item.completionDate || (item.type === 'activity' && item.completed);
                            const isPrivate = item.public === 0 || item.public === '0' ? true : false;
                            const titleKey = getCellKey(item, 'title');
                            const startDateKey = getCellKey(item, 'startDate');
                            const endDateKey = getCellKey(item, 'endDate');
                            const deadlineKey = getCellKey(item, 'deadline');
                            const keyAreaKey = getCellKey(item, 'keyAreaId');
                            const responsibleKey = getCellKey(item, 'responsibleId');
                            const goalKey = getCellKey(item, 'goalId');
                            const priorityKey = getCellKey(item, 'priority');
                            const listIndexKey = getCellKey(item, 'listIndex');
                            const titleValue = item.title || item.name || item.text || item.activity_name || '';
                            const startDateValue = toDateOnly(item.startDate || item.start_date);
                            const endDateValue = toDateOnly(item.endDate || item.end_date);
                            const deadlineValueInput = toDateOnly(deadlineValue);
                            const keyAreaIdValue = item.keyAreaId || item.key_area_id || item.key_area || item.keyArea || '';
                            // For activities, delegatedToUserId represents the assigned user
                            const responsibleIdValue = item.assigneeId || item.assignee_id || item.responsibleId || item.responsible_id || item.delegatedToUserId || item.delegated_to_user_id || '';
                            const responsibleNameValue = viewTab === 'delegated'
                                ? getResponsibleLabel(item)
                                : (item.assignee || item.responsible || getUserName(responsibleIdValue));
                            const goalIdValue = item.goalId || item.goal_id || '';
                            
                            return (
                                <tr
                                    key={item.itemId}
                                    className={`border-t border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors ${isCompleted ? 'bg-slate-50/70' : ''}`}
                                >
                                    <td className="px-3 py-2 align-top text-center">
                                        <div className="relative inline-flex items-center gap-2">
                                            <input
                                                aria-label={`Select ${titleValue || 'item'}`}
                                                type="checkbox"
                                                checked={selectedItems.has(item.itemId)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelectItem(item.itemId);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    data-row-actions-btn="true"
                                                    aria-haspopup="menu"
                                                    aria-expanded={openRowMenuId === item.itemId ? 'true' : 'false'}
                                                    className="p-1 rounded hover:bg-slate-100 text-slate-600"
                                                    title="More actions"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenRowMenuId((prev) => (prev === item.itemId ? null : item.itemId));
                                                    }}
                                                >
                                                    <FaEllipsisV />
                                                </button>
                                                {openRowMenuId === item.itemId && (
                                                    <div
                                                        data-row-actions-menu="true"
                                                        className="absolute left-0 mt-1 z-20 min-w-[170px] rounded-md border border-slate-200 bg-white shadow-lg"
                                                    >
                                                        <button
                                                            type="button"
                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenRowMenuId(null);
                                                                if (item.type === 'task' && onTaskClick) onTaskClick(item);
                                                                if (item.type === 'activity' && onActivityClick) onActivityClick(item);
                                                            }}
                                                        >
                                                            <FaExternalLinkAlt size={12} />
                                                            Open details
                                                        </button>
                                                        {viewTab !== 'delegated' && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCompleteToggle(item, e);
                                                                        setOpenRowMenuId(null);
                                                                    }}
                                                                >
                                                                    {isCompleted ? <FaTimes size={12} /> : <FaCheck size={12} />}
                                                                    {isCompleted ? 'Mark as not completed' : 'Mark as completed'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleTogglePrivate(item, e);
                                                                        setOpenRowMenuId(null);
                                                                    }}
                                                                >
                                                                    {isPrivate ? <FaLockOpen size={12} /> : <FaLock size={12} />}
                                                                    {isPrivate ? 'Mark as public' : 'Mark as private'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(item, e);
                                                                        setOpenRowMenuId(null);
                                                                    }}
                                                                >
                                                                    <FaTrash size={12} />
                                                                    Delete
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    {columns.includes('title') && (
                                        <td 
                                            className="px-3 py-2 align-top"
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
                                                    <>
                                                      {item.type === 'task' ? (
                                                        <FaSquare title="Task" className="text-blue-600 flex-shrink-0" />
                                                      ) : (
                                                        <FaListUl title="Activity" className="text-purple-600 flex-shrink-0" />
                                                      )}
                                                      <div className="flex-grow min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 truncate">{titleValue || 'Untitled'}</p>
                                                        <p className="text-xs text-slate-500">From: {responsibleNameValue || '—'}</p>
                                                      </div>
                                                    </>
                                                ) : (
                                                    <>
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
                                                        <span className={`text-sm ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>{titleValue || 'Untitled'}</span>
                                                      )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    {columns.includes('responsible') && viewTab === 'delegated' && (
                                        <td className="px-3 py-2 align-top text-slate-800">
                                            <span>{responsibleNameValue || '—'}</span>
                                        </td>
                                    )}
                                    {columns.includes('responsible') && viewTab !== 'delegated' && (
                                        <td
                                            className="px-3 py-2 align-top text-slate-800"
                                        >
                                            <select
                                                className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm w-20"
                                                value={String(responsibleIdValue || '')}
                                                onChange={(e) => saveEdit(item, 'responsibleId', e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="">—</option>
                                                {users.map((user) => (
                                                    <option key={user.id || user.member_id} value={user.id || user.member_id}>
                                                        {user.name || user.firstname} {user.lastname || ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    )}
                                    {columns.includes('keyArea') && (
                                        <td
                                            className="px-3 py-2 align-top text-slate-800"
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
                                    {columns.includes('tab') && (
                                        <td
                                            className="px-3 py-2 align-top text-center text-slate-800"
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(item, 'listIndex', String(item.list_index ?? item.listIndex ?? item.list ?? ''));
                                            }}
                                        >
                                            {editingCell === listIndexKey ? (
                                                <input
                                                    autoFocus
                                                    type="number"
                                                    className="w-full border rounded px-2 py-1 text-xs text-center"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => saveEdit(item, 'listIndex', editValue)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span>{item.list_index || item.listIndex || item.list || ''}</span>
                                            )}
                                        </td>
                                    )}
                                    {columns.includes('priority') && (
                                        <td
                                            className="px-3 py-2 align-top text-slate-800 w-28"
                                        >
                                            <select
                                                className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm w-full"
                                                value={(() => {
                                                    const raw = item.priority ?? item.priority_level ?? item.priorityLevel;
                                                    if (raw === 1 || String(raw) === '1' || String(raw).toLowerCase() === 'low') return 'low';
                                                    if (raw === 3 || String(raw) === '3' || String(raw).toLowerCase() === 'high') return 'high';
                                                    return 'normal';
                                                })()}
                                                onChange={(e) => saveEdit(item, 'priority', e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="low">Low</option>
                                                <option value="normal">Normal</option>
                                                <option value="high">High</option>
                                            </select>
                                        </td>
                                    )}
                                    {columns.includes('goal') && (
                                        <td
                                            className="px-3 py-2 align-top text-slate-800 w-40"
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
                                            className="px-3 py-2 align-top text-slate-800"
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
                                            className="px-3 py-2 align-top text-slate-800"
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
                                            className="px-3 py-2 align-top text-slate-800"
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
                                        How would you like to proceed?
                                    </label>
                                    <div className="flex flex-col gap-2">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="accept-activity-mode"
                                                value="new-task"
                                                checked={!selectedTaskForActivity}
                                                onChange={() => setSelectedTaskForActivity('')}
                                            />
                                            <span className="text-gray-200">Add as <b>new Task</b> in Key Area</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="accept-activity-mode"
                                                value="attach-task"
                                                checked={!!selectedTaskForActivity}
                                                onChange={() => {
                                                    if (userTasks.length > 0) setSelectedTaskForActivity(userTasks[0].id);
                                                }}
                                            />
                                            <span className="text-gray-200">Attach as <b>Activity</b> under an existing Task</span>
                                        </label>
                                    </div>
                                    {/* Only show task select if "Attach as Activity" is chosen */}
                                    {!!selectedTaskForActivity && (
                                        <div className="mt-2 p-2 border-l-4 border-orange-400 bg-orange-100 bg-opacity-10 rounded">
                                            <label className="block text-xs font-medium text-orange-300 mb-1">
                                                Select Task to attach Activity
                                            </label>
                                            <select
                                                value={selectedTaskForActivity}
                                                onChange={(e) => setSelectedTaskForActivity(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-600 rounded-lg 
                                                         bg-[#34495e] text-white focus:ring-2 focus:ring-blue-500 
                                                         focus:border-transparent"
                                            >
                                                {userTasks.map((task) => (
                                                    <option key={task.id} value={task.id}>
                                                        {task.title}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-orange-300 mt-1">
                                                The activity will be added under the selected task.
                                            </p>
                                        </div>
                                    )}
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
