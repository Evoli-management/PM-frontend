import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { FaCheck, FaTimes, FaTrash, FaLock, FaLockOpen, FaStop, FaAlignJustify, FaBan, FaSquare, FaListUl, FaEllipsisV, FaEdit } from 'react-icons/fa';
import { toDateOnly } from '../../utils/keyareasHelpers';
import taskDelegationService from '../../services/taskDelegationService';
import activityDelegationService from '../../services/activityDelegationService';
import keyAreaService from '../../services/keyAreaService';
import { formatKeyAreaLabel } from '../../utils/keyAreaDisplay';
import BulkFieldPickerModal from '../shared/BulkFieldPickerModal';

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
    title = '',
    keyAreas = [],
    users = [],
    goals = [],
    currentUserId,
    onTaskClick,
    onActivityClick,
    onTaskEdit,
    onActivityEdit,
    onTaskUpdate,
    onActivityUpdate,
    onTaskDelete,
    onActivityDelete,
    onMassEdit,
    hideSearch = false,
    delegationActionsEnabled = false,
    onDelegationRefresh,
}) {
    const { t } = useTranslation();
    const [selectedItems, setSelectedItems] = useState(new Set());
    const selectAllRef = useRef(null);
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
    const [rowMenuPos, setRowMenuPos] = useState({ top: 0, left: 0 });
    const bodyScrollRef = useRef(null);
    const [bodyScrollbarWidth, setBodyScrollbarWidth] = useState(0);
    const [showMassFieldPicker, setShowMassFieldPicker] = useState(false);

    useEffect(() => {
        if (!openRowMenuId) return;
        const onDown = (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            if (target.closest('[data-row-actions-menu]')) return;
            if (target.closest('[data-row-actions-btn]')) return;
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

    const normalizeText = (v) => String(v || '').trim().toLowerCase();
    const getResolvedResponsibleId = (item) => {
        const directId =
            item.assigneeId ||
            item.assignee_id ||
            item.responsibleId ||
            item.responsible_id ||
            item.delegatedToUserId ||
            item.delegated_to_user_id ||
            item.assignee?.id ||
            item.responsible?.id ||
            '';

        if (directId) return directId;

        const rawResponsible =
            item.assignee?.name ||
            item.assignee?.email ||
            item.responsible?.name ||
            item.responsible?.email ||
            item.assignee ||
            item.responsible ||
            '';

        const normalized = normalizeText(rawResponsible);
        if (!normalized) return '';
        if (normalized === 'me' || normalized === 'myself') return currentUserId || '';

        const matched = users.find((u) => {
            const uid = u.id || u.member_id;
            const first = u.firstname || '';
            const last = u.lastname || '';
            const name = u.name || `${first} ${last}`.trim();
            const email = u.email || '';
            const nName = normalizeText(name);
            const nEmail = normalizeText(email);
            return (
                normalizeText(uid) === normalized ||
                nName === normalized ||
                nEmail === normalized ||
                (nEmail && normalized.includes(nEmail))
            );
        });
        return matched ? (matched.id || matched.member_id || '') : '';
    };

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
                const assigneeId = getResolvedResponsibleId(item);
                return String(assigneeId || '') === String(responsibleFilter) || String(assignee) === String(responsibleFilter);
            });
        }
        
        // Search filter
        if (!hideSearch && searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item => 
                (item.title || '').toLowerCase().includes(query) ||
                (item.description || '').toLowerCase().includes(query)
            );
        }
        
        return filtered;
    }, [allItems, keyAreaFilter, responsibleFilter, searchQuery]);

    const selectedEntries = useMemo(
        () => allItems.filter((item) => selectedItems.has(item.itemId)),
        [allItems, selectedItems],
    );
    const hasSelectedActivities = selectedEntries.some((item) => item.type === 'activity');
    const massEditableFields = useMemo(() => {
        const baseFields = [
            { value: 'assignee', label: 'Responsible' },
            { value: 'status', label: 'Status' },
            { value: 'priority', label: 'Priority' },
            { value: 'goalId', label: 'Goal' },
            { value: 'duration', label: 'Duration' },
            { value: 'date', label: 'Date' },
        ];

        if (!hasSelectedActivities) {
            baseFields.splice(5, 0, { value: 'key_area_bundle', label: 'Key Area' });
        }

        return baseFields;
    }, [hasSelectedActivities]);

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
                    const aUserId = getResolvedResponsibleId(a);
                    const bUserId = getResolvedResponsibleId(b);
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

    useEffect(() => {
        const node = bodyScrollRef.current;
        if (!node) return;

        const updateScrollbarWidth = () => {
            const width = Math.max(0, node.offsetWidth - node.clientWidth);
            setBodyScrollbarWidth(width);
        };

        updateScrollbarWidth();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', updateScrollbarWidth);
            return () => window.removeEventListener('resize', updateScrollbarWidth);
        }

        const observer = new ResizeObserver(() => updateScrollbarWidth());
        observer.observe(node);

        return () => observer.disconnect();
    }, [sortedItems.length]);

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

    const allVisibleItemIds = useMemo(() => sortedItems.map((item) => item.itemId), [sortedItems]);
    const allVisibleSelected =
        allVisibleItemIds.length > 0 && allVisibleItemIds.every((id) => selectedItems.has(id));
    const someVisibleSelected =
        allVisibleItemIds.some((id) => selectedItems.has(id)) && !allVisibleSelected;

    useEffect(() => {
        if (!selectAllRef.current) return;
        selectAllRef.current.indeterminate = someVisibleSelected;
    }, [someVisibleSelected]);

    const toggleSelectAllVisible = () => {
        const next = new Set(selectedItems);
        if (allVisibleSelected) {
            allVisibleItemIds.forEach((id) => next.delete(id));
        } else {
            allVisibleItemIds.forEach((id) => next.add(id));
        }
        setSelectedItems(next);
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
            ...(item.type === 'task' ? {
                status: isCompleted ? 'open' : 'done',
            } : {}),
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
        if (confirm(t("unifiedTable.deleteConfirm", { type: item.type }))) {
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

    const handleMassEdit = async (field, value) => {
        const editFieldMap = {
            assignee: 'responsibleId',
            status: 'status',
            priority: 'priority',
            date: 'date',
            duration: 'duration',
            key_area_bundle: 'key_area_bundle',
        };
        const editField = editFieldMap[field] || field;
        const selectedIds = Array.from(selectedItems);

        if ((onTaskUpdate || onActivityUpdate) && selectedIds.length > 0) {
            for (const itemId of selectedIds) {
                const item = allItems.find((entry) => entry.itemId === itemId);
                if (!item) continue;
                if (field === 'date') {
                    // eslint-disable-next-line no-await-in-loop
                    await saveEdit(item, 'startDate', value?.start_date || '');
                    // eslint-disable-next-line no-await-in-loop
                    await saveEdit(item, 'endDate', value?.end_date || '');
                    // eslint-disable-next-line no-await-in-loop
                    await saveEdit(item, 'deadline', value?.deadline || '');
                } else if (field === 'key_area_bundle') {
                    // eslint-disable-next-line no-await-in-loop
                    await saveEdit(item, 'keyAreaId', value?.key_area_id || '');
                    if (value?.list_index && columns.includes('tab')) {
                        // eslint-disable-next-line no-await-in-loop
                        await saveEdit(item, 'listIndex', value.list_index);
                    }
                } else {
                    // eslint-disable-next-line no-await-in-loop
                    await saveEdit(item, editField, value);
                }
            }
            setSelectedItems(new Set());
            return;
        }

        if (selectedIds.length > 0 && onMassEdit) {
            const tasks = selectedIds.filter(id => id.startsWith('task-')).map(id => id.replace('task-', ''));
            const acts = selectedIds.filter(id => id.startsWith('activity-')).map(id => id.replace('activity-', ''));
            onMassEdit({ taskIds: tasks, activityIds: acts, field, value });
        }
    };

    const handleMassDelete = async (e) => {
        e.stopPropagation();
        if (selectedItems.size === 0) return;
        const confirmed = window.confirm(t("unifiedTable.confirmDeleteSelected") || "Delete selected items?");
        if (!confirmed) return;

        const selectedIds = Array.from(selectedItems);
        for (const itemId of selectedIds) {
            const item = allItems.find((entry) => entry.itemId === itemId);
            if (!item) continue;
            try {
                if (item.type === 'task' && onTaskDelete) {
                    await onTaskDelete(item.id);
                } else if (item.type === 'activity' && onActivityDelete) {
                    await onActivityDelete(item.id);
                }
            } catch (error) {
                console.error('Failed to delete selected item', item, error);
            }
        }
        setSelectedItems(new Set());
    };

    const handleMassActionChange = async (e) => {
        const action = e.target.value;
        e.target.value = '';
        if (!action || selectedItems.size === 0) return;
        if (action === 'edit') {
            setShowMassFieldPicker(true);
            return;
        }
        if (action === 'delete') {
            await handleMassDelete(e);
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
                const existingDelegatedToUserId = item.delegatedToUserId || item.delegated_to_user_id || null;
                // Find the selected user to get both ID and name
                const selectedUser = users.find(u => String(u.id || u.member_id) === String(value));
                
                if (selectedUser) {
                    const userId = selectedUser.id || selectedUser.member_id;
                    const assigningToSelf = String(userId) === String(currentUserId);
                    
                    // Set assignee name for display
                    if (assigningToSelf) {
                        updates.assignee = 'Me';
                        updates.delegatedToUserId = existingDelegatedToUserId || null;
                    } else {
                        updates.assignee = `${selectedUser.name || selectedUser.firstname || ''} ${selectedUser.lastname || ''}`.trim();
                        updates.delegatedToUserId = userId;
                    }
                } else {
                    updates.assignee = value || '';
                    updates.delegatedToUserId = existingDelegatedToUserId || null;
                }
            } else if (item.type === 'task') {
                updates.assignee = '';
                updates.delegatedToUserId = item.delegatedToUserId || item.delegated_to_user_id || null;
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
        const id = getResolvedResponsibleId(item);
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

    const standardHeaderPadding = 'px-2 sm:px-3';
    const standardCellPadding = 'px-3';

    const renderHeaderCells = () => (
        <>
            <th className="sticky top-0 z-20 w-12 px-2 sm:px-3 py-2 text-center bg-slate-50">
                <div className="relative inline-flex items-center gap-2">
                    <input
                        ref={selectAllRef}
                        type="checkbox"
                        aria-label="Select all visible items"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <span className="p-1 invisible" aria-hidden="true">
                        <FaEllipsisV />
                    </span>
                </div>
            </th>
            {columns.includes('title') && (
                <th className={`sticky top-0 z-20 w-[240px] ${standardHeaderPadding} py-2 text-left font-semibold cursor-pointer hover:bg-slate-100 bg-slate-50`} onClick={() => handleSort('title')}>
                    {t("unifiedTable.colTitle")} {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
            )}
            {columns.includes('responsible') && (
                <th
                    className={`sticky top-0 z-20 w-[96px] ${standardHeaderPadding} py-2 text-left font-semibold cursor-pointer hover:bg-slate-100 bg-slate-50`}
                    onClick={() => handleSort('responsible')}
                >
                    {viewTab === 'delegated' ? t("unifiedTable.receivedFrom") : t("unifiedTable.responsible")} {sortField === 'responsible' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
            )}
            {columns.includes('keyArea') && (
                <th
                    className={`sticky top-0 z-20 w-[64px] ${standardHeaderPadding} py-2 text-left font-semibold cursor-pointer hover:bg-slate-100 bg-slate-50`}
                    onClick={() => handleSort('keyArea')}
                >
                    {t("unifiedTable.colKeyArea")} {sortField === 'keyArea' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
            )}
            {columns.includes('tab') && (
                <th
                    className={`sticky top-0 z-20 w-[56px] ${standardHeaderPadding} py-2 text-left font-semibold cursor-pointer hover:bg-slate-100 bg-slate-50`}
                    onClick={() => handleSort('tab')}
                >
                    {t("unifiedTable.colTab")} {sortField === 'tab' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
            )}
            {columns.includes('priority') && (
                <th className={`sticky top-0 z-20 w-[96px] ${standardHeaderPadding} py-2 text-left font-semibold cursor-pointer hover:bg-slate-100 bg-slate-50`} onClick={() => handleSort('priority')}>
                    {t("unifiedTable.colPriority")} {sortField === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
            )}
            {columns.includes('goal') && (
                <th
                    className={`sticky top-0 z-20 w-[64px] ${standardHeaderPadding} py-2 text-left font-semibold cursor-pointer hover:bg-slate-100 bg-slate-50`}
                    onClick={() => handleSort('goal')}
                >
                    {t("unifiedTable.colGoal")} {sortField === 'goal' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
            )}
            {columns.includes('startDate') && (
                <th className={`sticky top-0 z-20 w-[64px] ${standardHeaderPadding} py-2 text-left font-semibold cursor-pointer hover:bg-slate-100 bg-slate-50`} onClick={() => handleSort('startDate')}>
                    Start Date {sortField === 'startDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
            )}
            {columns.includes('endDate') && (
                <th className={`sticky top-0 z-20 w-[64px] ${standardHeaderPadding} py-2 text-left font-semibold cursor-pointer hover:bg-slate-100 bg-slate-50`} onClick={() => handleSort('endDate')}>
                    End Date {sortField === 'endDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
            )}
            {columns.includes('deadline') && (
                <th className={`sticky top-0 z-20 w-[64px] ${standardHeaderPadding} py-2 text-left font-semibold cursor-pointer hover:bg-slate-100 bg-slate-50`} onClick={() => handleSort('dueDate')}>
                    {t("unifiedTable.colDeadline")} {sortField === 'dueDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
            )}
            {delegationActionsEnabled && (
                <th className="w-28 px-2 sm:px-3 py-2 text-left font-semibold bg-slate-50">
                    {t("pendingDelegationsSection.colActions")}
                </th>
            )}
        </>
    );

    const renderColGroup = () => (
        <colgroup>
            <col style={{ width: '3rem' }} />
            {columns.includes('title') && <col style={{ width: '15rem' }} />}
            {columns.includes('responsible') && <col style={{ width: '6rem' }} />}
            {columns.includes('keyArea') && <col style={{ width: '4rem' }} />}
            {columns.includes('tab') && <col style={{ width: '3.5rem' }} />}
            {columns.includes('priority') && <col style={{ width: '6rem' }} />}
            {columns.includes('goal') && <col style={{ width: '4rem' }} />}
            {columns.includes('startDate') && <col style={{ width: '4rem' }} />}
            {columns.includes('endDate') && <col style={{ width: '4rem' }} />}
            {columns.includes('deadline') && <col style={{ width: '4rem' }} />}
            {delegationActionsEnabled && <col style={{ width: '7rem' }} />}
        </colgroup>
    );

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
            
            await onDelegationRefresh?.();
            
            // Close modal
            setShowAcceptModal(false);
            setAcceptingTask(null);
            setSelectedKeyArea('');
        } catch (error) {
            console.error('Failed to accept delegation:', error);
            alert(error.response?.data?.message || t("unifiedTable.failedAccept"));
        } finally {
            setRespondingTaskId(null);
        }
    };

    const handleRejectClick = async (task) => {
        if (!confirm(t("unifiedTable.rejectConfirm"))) return;
        
        setRespondingTaskId(task.id);
        try {
            await taskDelegationService.rejectDelegation(task.id);
            
            await onDelegationRefresh?.();
        } catch (error) {
            console.error('Failed to reject delegation:', error);
            alert(error.response?.data?.message || t("unifiedTable.failedReject"));
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
            
            await onDelegationRefresh?.();
            
            // Close modal
            setShowAcceptModal(false);
            setAcceptingActivity(null);
            setSelectedKeyArea('');
            setSelectedTaskForActivity('');
            setUserTasks([]);
        } catch (error) {
            console.error('Failed to accept activity delegation:', error);
            alert(error.response?.data?.message || t("unifiedTable.failedAcceptActivity"));
        } finally {
            setRespondingTaskId(null);
        }
    };

    const handleRejectActivityClick = async (activity) => {
        if (!confirm(t("unifiedTable.rejectActivityConfirm"))) return;
        
        setRespondingTaskId(activity.id);
        try {
            await activityDelegationService.rejectDelegation(activity.id);
            
            await onDelegationRefresh?.();
        } catch (error) {
            console.error('Failed to reject activity delegation:', error);
            alert(error.response?.data?.message || t("unifiedTable.failedRejectActivity"));
        } finally {
            setRespondingTaskId(null);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0 w-full bg-white border border-slate-200 rounded-lg overflow-hidden">
            {/* Filters Row */}
            <div className="shrink-0 flex items-start justify-between gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-wrap">
                <div className="min-w-0">
                    {title ? (
                        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                    ) : (
                        <span className="text-sm font-medium text-slate-700">{t("unifiedTable.filter")}</span>
                    )}
                </div>

                <div className="ml-auto flex items-center justify-end gap-3 flex-wrap">
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

                    <select
                        value={keyAreaFilter}
                        onChange={(e) => setKeyAreaFilter(e.target.value)}
                        className="h-[32px] rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                        <option value="">{t("unifiedTable.keyArea")}</option>
                        {keyAreas.map((ka, idx) => (
                            <option key={ka.id} value={ka.id}>
                                {formatKeyAreaLabel(ka, idx)}
                            </option>
                        ))}
                    </select>

                    {columns.includes('responsible') && (
                        <select
                            value={responsibleFilter}
                            onChange={(e) => setResponsibleFilter(e.target.value)}
                            className="h-[32px] rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="">{t("unifiedTable.responsible")}</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id || user.member_id}>
                                    {user.name || user.firstname} {user.lastname || ''}
                                </option>
                            ))}
                        </select>
                    )}

                    {viewTab !== 'delegated' && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600">{t("unifiedTable.selectedCount", { n: selectedItems.size })}</span>
                            <select
                                defaultValue=""
                                onChange={handleMassActionChange}
                                className="h-[32px] rounded-md border border-emerald-700 bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-50"
                                disabled={selectedItems.size === 0}
                            >
                                <option value="" hidden>{t("unifiedTable.massEdit")}</option>
                                <option value="edit" className="bg-white text-slate-900">Select field</option>
                                <option value="delete" className="bg-white text-slate-900">Delete</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <BulkFieldPickerModal
                isOpen={showMassFieldPicker}
                title="Select field"
                fields={massEditableFields}
                users={users}
                keyAreas={keyAreas}
                goals={goals}
                availableLists={[1, 2, 3, 4, 5]}
                onCancel={() => setShowMassFieldPicker(false)}
                onSave={async (field, value) => {
                    setShowMassFieldPicker(false);
                    await handleMassEdit(field, value);
                }}
            />

            <div
                ref={bodyScrollRef}
                className={`flex-1 min-h-0 overflow-x-auto overflow-y-auto hover-scrollbar-y ${sortedItems.length === 0 ? 'overflow-y-hidden' : ''}`}
            >
                {sortedItems.length > 0 ? (
                    <table className="min-w-[1200px] w-full table-fixed text-sm whitespace-nowrap">
                        {renderColGroup()}
                        <thead className="border border-slate-200 text-slate-700">
                            <tr>{renderHeaderCells()}</tr>
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
                            const responsibleIdValue = getResolvedResponsibleId(item);
                            const responsibleNameValue = viewTab === 'delegated'
                                ? getResponsibleLabel(item)
                                : (item.assignee || item.responsible || getUserName(responsibleIdValue));
                            const goalIdValue = item.goalId || item.goal_id || '';
                            
                            return (
                                <tr
                                    key={item.itemId}
                                    className={`border-t border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors ${isCompleted ? 'bg-slate-50/70' : ''}`}
                                >
                                    <td className="w-12 px-2 sm:px-3 py-2 align-top text-center">
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
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const btnEl = e.currentTarget;
                                                        setOpenRowMenuId((prev) => {
                                                            if (prev === item.itemId) return null;
                                                            if (!btnEl || typeof btnEl.getBoundingClientRect !== 'function') {
                                                                return item.itemId;
                                                            }
                                                            const rect = btnEl.getBoundingClientRect();
                                                            const menuHeight = 220;
                                                            const menuWidth = 170;
                                                            const spaceBelow = window.innerHeight - rect.bottom;
                                                            const spaceAbove = rect.top;
                                                            const openUp = spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow;
                                                            let left = rect.left;
                                                            const maxLeft = window.innerWidth - menuWidth - 8;
                                                            if (left > maxLeft) left = Math.max(8, maxLeft);
                                                            if (left < 8) left = 8;
                                                            const top = openUp
                                                                ? Math.max(8, rect.top - menuHeight - 4)
                                                                : Math.min(window.innerHeight - menuHeight - 8, rect.bottom + 4);
                                                            setRowMenuPos({ top, left });
                                                            return item.itemId;
                                                        });
                                                    }}
                                                >
                                                    <FaEllipsisV />
                                                </button>
                                                {openRowMenuId === item.itemId && createPortal(
                                                    <div
                                                        data-row-actions-menu="true"
                                                        style={{ position: 'fixed', top: rowMenuPos.top, left: rowMenuPos.left, zIndex: 6000, minWidth: 170 }}
                                                        className="rounded-md border border-slate-200 bg-white shadow-lg"
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            type="button"
                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenRowMenuId(null);
                                                                if (item.type === 'task' && onTaskEdit) onTaskEdit(item);
                                                                if (item.type === 'activity' && onActivityEdit) onActivityEdit(item);
                                                            }}
                                                        >
                                                            <FaEdit size={12} />
                                                            {t("unifiedTable.edit")}
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
                                                            {t("unifiedTable.delete")}
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
                                                                    {isCompleted ? t("unifiedTable.markNotCompleted") : t("unifiedTable.markCompleted")}
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
                                                                    {isPrivate ? t("unifiedTable.markPublic") : t("unifiedTable.markPrivate")}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                , document.body)}
                                            </div>
                                        </div>
                                    </td>
                                    {columns.includes('title') && (
                                        <td 
                                            className="w-[240px] px-3 py-2 align-top overflow-hidden"
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(item, 'title', titleValue);
                                            }}
                                        >
                                            <div className="flex items-start gap-2">
                                                {viewTab === 'delegated' ? (
                                                    <>
                                                      {item.type === 'task' ? (
                                                        <FaSquare title="Task" className="text-blue-600 flex-shrink-0" />
                                                      ) : (
                                                        <FaListUl title="Activity" className="text-purple-600 flex-shrink-0" />
                                                      )}
                                                      <div className="flex-grow min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 truncate">{titleValue || t("unifiedTable.untitled")}</p>
                                                        <p className="text-xs text-slate-500">{t("unifiedTable.from")} {responsibleNameValue || '—'}</p>
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
                                                        <div className="min-w-0 flex-1">
                                                            <span className={`block truncate text-sm ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>{titleValue || t("unifiedTable.untitled")}</span>
                                                        </div>
                                                      )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    {columns.includes('responsible') && viewTab === 'delegated' && (
                                        <td className={`w-[96px] ${standardCellPadding} py-2 align-top text-slate-800`}>
                                            <span>{responsibleNameValue || '—'}</span>
                                        </td>
                                    )}
                                    {columns.includes('responsible') && viewTab !== 'delegated' && (
                                        <td className={`w-[96px] ${standardCellPadding} py-2 align-top text-slate-800`}>
                                            <select
                                                className="w-full rounded-md border border-slate-300 bg-white px-2 py-0.5 text-sm"
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
                                            className={`w-[64px] ${standardCellPadding} py-2 align-top text-slate-800`}
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
                                                    <option value="">{t("unifiedTable.keyArea")}</option>
                                                    {keyAreas.map((ka, idx) => (
                                                        <option key={ka.id} value={ka.id}>
                                                            {formatKeyAreaLabel(ka, idx)}
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
                                            className={`w-[56px] ${standardCellPadding} py-2 align-top text-left text-slate-800`}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                startEdit(item, 'listIndex', String(item.list_index ?? item.listIndex ?? item.list ?? ''));
                                            }}
                                        >
                                            {editingCell === listIndexKey ? (
                                                <input
                                                    autoFocus
                                                    type="number"
                                                    className="w-full border rounded px-2 py-1 text-xs text-left"
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
                                            className={`w-[96px] ${standardCellPadding} py-2 align-top text-slate-800`}
                                        >
                                            {(() => {
                                                const priorityValue = (() => {
                                                    const raw = item.priority ?? item.priority_level ?? item.priorityLevel;
                                                    if (raw === 1 || String(raw) === '1' || String(raw).toLowerCase() === 'low') return 'low';
                                                    if (raw === 3 || String(raw) === '3' || String(raw).toLowerCase() === 'high') return 'high';
                                                    return 'normal';
                                                })();
                                                return (
                                                    <select
                                                        className="w-full rounded-md border border-slate-300 bg-white py-0.5 text-sm px-2"
                                                        value={priorityValue}
                                                        onChange={(e) => saveEdit(item, 'priority', e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="high">High</option>
                                                        <option value="normal">Normal</option>
                                                        <option value="low" style={{ color: "#6b7280" }}>Low</option>
                                                    </select>
                                                );
                                            })()}
                                        </td>
                                    )}
                                    {columns.includes('goal') && (
                                        <td
                                            className={`w-[64px] ${standardCellPadding} py-2 align-top text-slate-800`}
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
                                                <span className="block truncate">{getGoalName(goalIdValue)}</span>
                                            )}
                                        </td>
                                    )}
                                    {columns.includes('startDate') && (
                                        <td
                                            className={`w-[64px] ${standardCellPadding} py-2 align-top text-slate-800`}
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
                                            className={`w-[64px] ${standardCellPadding} py-2 align-top text-slate-800`}
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
                                            className={`w-[64px] ${standardCellPadding} py-2 align-top text-slate-800`}
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
                                    {delegationActionsEnabled && (
                                        <td className="w-28 px-3 py-2 align-top">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (item.type === 'task') {
                                                            handleAcceptClick(item);
                                                        } else {
                                                            handleAcceptActivityClick(item);
                                                        }
                                                    }}
                                                    disabled={respondingTaskId === item.id}
                                                    className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                                    title="Accept delegation"
                                                >
                                                    <FaCheck size={12} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (item.type === 'task') {
                                                            handleRejectClick(item);
                                                        } else {
                                                            handleRejectActivityClick(item);
                                                        }
                                                    }}
                                                    disabled={respondingTaskId === item.id}
                                                    className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-2 py-1 text-red-700 hover:bg-red-100 disabled:opacity-50"
                                                    title="Reject delegation"
                                                >
                                                    <FaTimes size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                                    })}
                        </tbody>
                    </table>
                ) : (
                    <div className="flex min-h-[220px] items-start justify-center px-4 pt-8 pb-10 overflow-visible">
                        <div className="text-center overflow-visible">
                            <h3 className="mb-2 text-xl font-bold text-slate-900">
                                No items found
                            </h3>
                            <p className="text-slate-600 leading-6">
                                Try adjusting your filters.
                            </p>
                        </div>
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
                                    {userKeyAreas.map((area, idx) => (
                                        <option key={area.id} value={area.id}>
                                            {formatKeyAreaLabel(area, idx)}
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
