import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSave, FaTrash } from 'react-icons/fa';
import Modal from '../shared/Modal';
import usersService from '../../services/usersService';
import taskService from '../../services/taskService';
import { useFormattedDate } from '../../hooks/useFormattedDate';
import { useDraggable } from '../../hooks/useDraggable';
import { useResizable } from '../../hooks/useResizable';
import { formatKeyAreaLabel } from '../../utils/keyAreaDisplay';
import { durationToTimeInputValue } from '../../utils/duration';

// ---- helpers (JS only) ----
const safeDate = (v) => {
  if (!v && v !== 0) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
};

const now = new Date();
const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const _idsOf = (arr = []) => (Array.isArray(arr) ? arr.map((x) => String(x && x.id)).join(',') : '');

// inline SVG icons (untyped)

const IconChevron = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"
    />
  </svg>
);

export default function EditTaskModal({
  isOpen,
  initialData = {},
  onSave,
  onDelete,
  onCancel,
  isSaving = false,
  keyAreas = [],
  users = [],
  goals = [],
  availableLists = [1],
  currentUserId = null,
  // optional mapping of parent list names (used by DontForget)
  parentListNames = null,
  // optional custom modal title (used for mass-editing banner)
  modalTitle = undefined,
  visibleFields = null,
  // When true, editing a Don't Forget task (no Key Area required)
  isDontForgetMode = false,
}) {
  const { t } = useTranslation();
  const hasSameListNames = (a, b) => {
    const aObj = a && typeof a === 'object' ? a : {};
    const bObj = b && typeof b === 'object' ? b : {};
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => String(aObj[k] ?? '') === String(bObj[k] ?? ''));
  };
  // Draggable and resizable hooks for modern modal
  const { position, isDragging, handleMouseDown, handleMouseMove, handleMouseUp, resetPosition } = useDraggable();
  const { size, isDraggingResize, handleResizeMouseDown } = useResizable(500, 490);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isDraggingResize) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingResize, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isOpen) resetPosition();
  }, [isOpen, resetPosition]);
  // Helper to find user ID from assignee name or ID
  const getInitialAssigneeId = () => {
    const initial = initialData.assignee || initialData.assigneeId || initialData.assignee_id || '';
    if (!initial) return '';
    
    // If it's already a UUID, return it
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(initial)) {
      return initial;
    }
    
    // Try to find user by name, email, or ID
    const user = (users || []).find(u => {
      const fullName = `${u.name || ''} ${u.lastname || ''}`.trim();
      const email = u.email || '';
      const initialLower = String(initial).toLowerCase();
      
      return (
        String(u.id) === String(initial) ||
        u.name === initial ||
        fullName === initial ||
        email === initial ||
        // Match email or email-like strings (e.g., "Hussein husseinramdin@hotmail.com")
        initialLower.includes(email.toLowerCase()) ||
        initialLower.includes(u.name?.toLowerCase() || '')
      );
    });
    
    return user?.id || '';
  };
  
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [assignee, setAssignee] = useState(getInitialAssigneeId());
  const [startDate, setStartDate] = useState(safeDate(initialData.start_date || initialData.startDate) || defaultDate);
  const [endDate, setEndDate] = useState(safeDate(initialData.end_date || initialData.endDate) || defaultDate);
  const [endAuto, setEndAuto] = useState(!(initialData.end_date || initialData.endDate));
  const [keyAreaError, setKeyAreaError] = useState('');
  const [listError, setListError] = useState('');
  const [deadline, setDeadline] = useState(safeDate(initialData.deadline || initialData.dueDate));
  const [deadlineAuto, setDeadlineAuto] = useState(true);
  const [duration, setDuration] = useState(durationToTimeInputValue(initialData.duration || initialData.duration_minutes || ''));
  const [priority, setPriority] = useState(initialData.priority ?? initialData.priority_level ?? 2);
  const [status, setStatus] = useState(initialData.status || initialData.state || 'open');
  const [keyAreaId, setKeyAreaId] = useState(
    initialData.key_area_id || initialData.keyAreaId || ''
  );
  const [listIndex, setListIndex] = useState(
    initialData.list || initialData.list_index || (availableLists && availableLists[0]) || 1
  );
  const { formatDate, dateFormat } = useFormattedDate();

  const dateLabel = (value) => {
    if (!value) return `Format: ${dateFormat}`;
    return `${formatDate(value)} (Format: ${dateFormat})`;
  };
  // taskId removed per UX request; tasks selection no longer shown
  const [goal, setGoal] = useState(initialData.goalId || initialData.goal_id || initialData.goal || '');
  const [usersList, setUsersList] = useState(users || []);
  const [localKeyAreas, setLocalKeyAreas] = useState(keyAreas || []);
  const [allTasks, setAllTasks] = useState([]);
  const [listNames, setListNames] = useState({});
  const [localGoals, setLocalGoals] = useState(goals || []);

  const startRef = useRef(null);
  const endRef = useRef(null);
  const deadlineRef = useRef(null);
  const usersLoadedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const nextTitle = initialData.title || '';
    if (title !== nextTitle) setTitle(nextTitle);
    const nextDescription = initialData.description || '';
    if (description !== nextDescription) setDescription(nextDescription);
    
    // Convert assignee name to user ID for select dropdown
    const initialAssigneeValue = initialData.assignee || initialData.assigneeId || initialData.assignee_id || '';
    let nextAssignee = '';
    
    if (initialAssigneeValue) {
      // Check if it's already a UUID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(initialAssigneeValue)) {
        nextAssignee = initialAssigneeValue;
      } else {
        // Try to find user by name, email, or ID
        const user = usersList.find(u => {
          const fullName = `${u.name || ''} ${u.lastname || ''}`.trim();
          const email = u.email || '';
          const initialLower = String(initialAssigneeValue).toLowerCase();
          
          return (
            String(u.id) === String(initialAssigneeValue) ||
            u.name === initialAssigneeValue ||
            fullName === initialAssigneeValue ||
            email === initialAssigneeValue ||
            // Match email or email-like strings
            initialLower.includes(email.toLowerCase()) ||
            initialLower.includes(u.name?.toLowerCase() || '')
          );
        });
        nextAssignee = user?.id || '';
      }
    }
    
    if (assignee !== nextAssignee) setAssignee(nextAssignee);
  const nextStart = safeDate(initialData.start_date || initialData.startDate) || defaultDate;
  if (startDate !== nextStart) setStartDate(nextStart);
  const nextEnd = safeDate(initialData.end_date || initialData.endDate) || defaultDate;
  if (endDate !== nextEnd) setEndDate(nextEnd);
  setEndAuto(!Boolean(initialData.end_date || initialData.endDate));
  setDeadlineAuto(true);
    const nextDeadline = safeDate(initialData.deadline || initialData.dueDate);
    if (deadline !== nextDeadline) setDeadline(nextDeadline);
    const nextDuration = durationToTimeInputValue(initialData.duration || initialData.duration_minutes || '');
    if (duration !== nextDuration) setDuration(nextDuration);
    const nextPriority = initialData.priority ?? initialData.priority_level ?? 2;
    if (priority !== nextPriority) setPriority(nextPriority);
    const nextStatus = initialData.status || initialData.state || 'open';
    if (status !== nextStatus) setStatus(nextStatus);
    // Initialize keyAreaId from the incoming task data only. We set defaults from
    // fetched key areas in a separate effect to avoid update loops.
  const nextKA = initialData.key_area_id || initialData.keyAreaId || '';
  if (String(keyAreaId) !== String(nextKA)) setKeyAreaId(nextKA);
  const nextList = initialData.list || initialData.list_index || (availableLists && availableLists[0]) || 1;
  if (listIndex !== nextList) setListIndex(nextList);
  // taskId removed per UX request; tasks selection no longer shown
  const nextGoal = initialData.goalId || initialData.goal_id || initialData.goal || '';
  if (goal !== nextGoal) setGoal(nextGoal);
    // load users if none provided so the assignee dropdown always contains at least the current user
    (async () => {
      try {
        // Only fetch current user once per modal open to avoid repeated /users/me calls
        if (users && users.length) {
          if (!usersLoadedRef.current) {
            const me = await usersService.list();
            usersLoadedRef.current = true;
              if (me && me.length) {
              const existingIds = new Set((users || []).map((u) => String(u.id)));
              const merged = [...users];
              me.forEach((m) => {
                if (!existingIds.has(String(m.id))) merged.push(m);
              });
              // only update state if content differs to avoid re-render loops
              const prevIds = (usersList || []).map((u) => String(u.id)).join(',');
              const newIds = (merged || []).map((u) => String(u.id)).join(',');
              if (prevIds !== newIds) setUsersList(merged);
            } else {
              const prevIds = (usersList || []).map((u) => String(u.id)).join(',');
              const newIds = (users || []).map((u) => String(u.id)).join(',');
              if (prevIds !== newIds) setUsersList(users || []);
            }
          } else {
            // merge any newly provided users prop without refetching, only if new ids appear
            const prevIds = (usersList || []).map((u) => String(u.id)).join(',');
            const merged = (usersList || []).slice();
            const existingIdsSet = new Set((usersList || []).map((u) => String(u.id)));
            (users || []).forEach((u) => {
              if (!existingIdsSet.has(String(u.id))) merged.push(u);
            });
            const newIds = (merged || []).map((u) => String(u.id)).join(',');
            if (prevIds !== newIds) setUsersList(merged);
          }
        } else {
          if (!usersLoadedRef.current) {
            const me = await usersService.list();
            usersLoadedRef.current = true;
            setUsersList(me || []);
          }
        }
      } catch (e) {
        setUsersList(users || []);
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!endAuto) return;
    if (!startDate) return;
    if (endDate !== startDate) setEndDate(startDate);
  }, [isOpen, startDate, endDate, endAuto]);

  useEffect(() => {
    if (!isOpen) return;
    if (!deadlineAuto) return;
    if (!endDate) return;
    if (deadline !== endDate) setDeadline(endDate);
  }, [isOpen, endDate, deadline, deadlineAuto]);

  // When fetched key areas load, if no keyAreaId is set, default to the first area.
  useEffect(() => {
    if (!isOpen) return;
    // We intentionally do NOT auto-default the key area here. The dropdown will
    // be populated from `localKeyAreas` / `keyAreas`, but the selected value
    // should remain empty unless the caller provided an initial value. This
    // keeps the modal consistent with the requirement that the key area be
    // "not filled by default".
    if ((!listIndex || listIndex === 0) && availableLists && availableLists.length) {
      setListIndex((prev) => (prev && prev !== 0 ? prev : (availableLists[0] || 1)));
    }
  }, [isOpen, localKeyAreas, keyAreas, availableLists, keyAreaId, listIndex]);

  // reset usersLoadedRef when modal closes so next open can refresh if needed
  useEffect(() => {
    if (!isOpen) usersLoadedRef.current = false;
  }, [isOpen]);

  // Load key areas and tasks when modal opens so we can show the full list and list names
  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    (async () => {
      try {
        // dynamic import to keep bundles small like other modals
        const mod = await import('../../services/keyAreaService');
        const kaSvc = mod?.default || mod;
        const tsMod = await import('../../services/taskService').catch(() => null);
        const taskSvc = tsMod?.default || tsMod;
        const [areas, tasks, goalsData] = await Promise.all([
          kaSvc.list({ includeTaskCount: false }).catch(() => []),
          taskSvc ? taskSvc.list({}).catch(() => []) : Promise.resolve([]),
          import('../../services/goalService').then((m) => m.getGoals({ status: 'active' })).catch(() => []),
        ]);
        if (ignore) return;
        const newAreas = Array.isArray(areas) ? areas : [];
        setLocalKeyAreas((prev) => {
          try {
            if (_idsOf(prev) === _idsOf(newAreas)) return prev;
          } catch (_) {}
          return newAreas;
        });
        const newTasks = Array.isArray(tasks) ? tasks : [];
        setAllTasks((prev) => {
          try {
            if (_idsOf(prev) === _idsOf(newTasks)) return prev;
          } catch (_) {}
          return newTasks;
        });
        const fetchedGoals = Array.isArray(goalsData) ? goalsData : [];
        const taskGoalId = initialData && (initialData.goal || initialData.goal_id || initialData.goalId);
        const mergedGoals = Array.isArray(fetchedGoals) ? [...fetchedGoals] : [];
        const hasGoal = mergedGoals.some((g) => String(g.id) === String(taskGoalId));
        if (taskGoalId && !hasGoal) {
          mergedGoals.unshift({
            id: taskGoalId,
            title: initialData.goalTitle || initialData.goal_name || initialData.goalName || 'Current goal',
            milestones: [],
            _missing: true,
          });
        }
        setLocalGoals((prev) => {
          try {
            if (_idsOf(prev) === _idsOf(mergedGoals)) return prev;
          } catch (_) {}
          return mergedGoals;
        });
      } catch (e) {
        console.error('Failed to load key areas or tasks for EditTaskModal', e);
        if (!ignore) {
          setLocalKeyAreas([]);
          setAllTasks([]);
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  // When selected key area or loaded areas change, populate listNames for that area
  useEffect(() => {
    const kaId = keyAreaId;
    if (!kaId) {
      // If no key area selected, prefer parent-provided list names (DontForget flow)
      const fallback = parentListNames && Object.keys(parentListNames).length ? parentListNames : {};
      setListNames((prev) => (hasSameListNames(prev, fallback) ? prev : fallback));
      return;
    }
    const selectedArea = (localKeyAreas && localKeyAreas.length ? localKeyAreas : keyAreas).find(
      (a) => String(a.id) === String(kaId)
    );
    if (selectedArea?.listNames) {
      const nextListNames = selectedArea.listNames || {};
      setListNames((prev) => (hasSameListNames(prev, nextListNames) ? prev : nextListNames));
      // If current list is not in the new key area's lists, reset to first available
      const availableListIndices = Object.keys(selectedArea.listNames || {});
      if (availableListIndices.length > 0 && !availableListIndices.includes(String(listIndex))) {
        setListIndex(Number(availableListIndices[0]));
      }
    } else {
      setListNames((prev) => (Object.keys(prev || {}).length === 0 ? prev : {}));
    }
  }, [keyAreaId, localKeyAreas, keyAreas, parentListNames]);

  // Merge incoming goals prop into localGoals when it changes so newly-created goals become available
  useEffect(() => {
    if (!goals || !Array.isArray(goals)) return;
    setLocalGoals((prev = []) => {
      const map = new Map();
      (goals || []).forEach((g) => map.set(String(g.id), g));
      (prev || []).forEach((g) => map.set(String(g.id), g));
      const merged = Array.from(map.values());
      try {
        if (_idsOf(prev) === _idsOf(merged)) return prev;
      } catch (_) {}
      return merged;
    });
  }, [goals]);

  // Listen for global 'goal-created' events so the modal updates instantly when goals are created elsewhere
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      // Support both { detail: goal } and { detail: { goal } } shapes
      const g = (e && (e.detail && (e.detail.goal || e.detail))) || null;
      if (!g || !g.id) return;
      setLocalGoals((prev = []) => {
        if ((prev || []).some((x) => String(x.id) === String(g.id))) return prev;
        return [g, ...(prev || [])];
      });
    };
    window.addEventListener('goal-created', handler);
    return () => window.removeEventListener('goal-created', handler);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    // Validate required fields
    if (!keyAreaId && !isDontForgetMode) {
      setKeyAreaError(t("editTaskModal.keyAreaRequired"));
      try { document.querySelector('select[name="key_area_id"]')?.focus?.(); } catch (_) {}
      return;
    }
    if (!listIndex) {
      setListError(t("editTaskModal.listRequired"));
      try { document.querySelector('select[name="list_index"]')?.focus?.(); } catch (_) {}
      return;
    }

    // Handle assignee - convert user ID to name and add delegatedToUserId for auto-delegation
    let assigneeName = null;
    let delegatedToUserId = null;
    
    if (assignee) {
      const selectedUser = usersList.find(u => String(u.id) === String(assignee));
      if (selectedUser) {
        const userId = selectedUser.id;
        
        // Set assignee name for display
        if (String(userId) === String(currentUserId)) {
          assigneeName = 'Me';
        } else {
          assigneeName = selectedUser.name;
          // Only add delegatedToUserId if assigning to different user (auto-creates delegation)
          delegatedToUserId = userId;
        }
      }
    }
    
    const payload = {
      ...initialData,
      // ensure we include a usable id for update flows
      id: initialData.id || initialData.taskId || initialData.task_id || initialData._id || undefined,
      title: (title || '').trim(),
      description: (description || '').trim(),
      assignee: assigneeName,
      delegatedToUserId: delegatedToUserId,
      start_date: startDate || null,
      end_date: endDate || null,
      deadline: deadline || null,
      duration: duration || null,
      priority,
      status,
      key_area_id: keyAreaId || null,
      // backend and page expect `list_index` and `goal_id` keys
      // include both snake_case and camelCase to be explicit and compatible
      list_index: listIndex,
      listIndex: listIndex,
      goal_id: goal || null,
    };
    // payload prepared for save
    if (!onSave) {
      console.warn('EditTaskModal: onSave prop not provided');
      return;
    }
    onSave && onSave(payload);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  const handleDelete = async () => {
    const id = initialData.id || initialData.taskId || initialData.task_id || initialData._id;
    if (!id) return;
    if (!window.confirm(t("editTaskModal.deleteConfirm"))) return;
    try {
      if (typeof onDelete === 'function') {
        await onDelete(id, initialData);
      } else {
        await taskService.remove(id);
      }
      onCancel && onCancel();
    } catch (e) {
      console.error('Failed to delete task', e);
    }
  };

  // shared styles to match existing UI
  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50';
  const dateCls = `${inputCls} appearance-none pr-11 no-calendar`;
  const selectCls = `${inputCls} appearance-none pr-10`;
  const showField = (field) => !Array.isArray(visibleFields) || visibleFields.length === 0 || visibleFields.includes(field);

  return (
    <Modal open={isOpen} onClose={onCancel}>
      <style>{`
          .no-calendar::-webkit-calendar-picker-indicator { display: none; -webkit-appearance: none; }
          .no-calendar::-webkit-clear-button, .no-calendar::-webkit-inner-spin-button { display: none; -webkit-appearance: none; }
          .no-calendar::-ms-clear { display: none; }
        `}</style>
      <div 
        className="relative z-10 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 flex flex-col overflow-hidden"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : isDraggingResize ? 'se-resize' : 'default',
          width: `${size.width}px`,
          height: `${size.height}px`,
          minWidth: '300px',
          minHeight: '200px'
        }}
      >
        <div 
          className="relative px-5 py-2 border-b border-slate-200 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
        >
          <h3 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-semibold text-slate-900">
            {modalTitle || t("editTaskModal.title")}
          </h3>
          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              form="edit-task-form"
              className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 text-sm inline-flex items-center gap-1.5"
            >
              <FaSave className="text-xs" />
              {t("createTaskModal.save")}
            </button>
            <button
              type="button"
              className="p-2 rounded-md text-red-600 hover:bg-red-50"
              aria-label="Delete"
              onClick={handleDelete}
            >
              <FaTrash className="text-sm" />
            </button>
            <button 
              type="button" 
              className="p-2 rounded-full text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" 
              aria-label="Close"
              onClick={onCancel}
            >
              ✕
            </button>
          </div>
        </div>
        <form id="edit-task-form" className="pm-notched-form px-4 pb-4 pt-2 space-y-2 overflow-y-auto flex-1" onSubmit={onSubmit}>
          {showField('title') && (
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700" htmlFor="edit-task-title">{t("createTaskModal.taskNameLabel")}</label>
            <input autoFocus id="edit-task-title" required className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 mt-0.5" placeholder="Task name" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-y-4 md:gap-x-6">
            <div className="grid grid-rows-5 gap-0 md:col-span-1">
              {showField('description') && <div style={{ minHeight: '64px' }}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.descLabel")}</label>
                <input className="left-focus w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 mt-0" placeholder="Brief description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>}
              {showField('start_date') && <div style={{ minHeight: '64px' }}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.startDateLabel")}</label>
                <div className="relative mt-0">
                  <input ref={startRef} className="left-focus w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                    aria-label="Open date picker"
                    onClick={() => {
                      try {
                        startRef.current?.showPicker?.();
                        startRef.current?.focus();
                      } catch (_) {}
                    }}
                  >
                    📅
                  </button>
                </div>
              </div>}
              {showField('end_date') && <div style={{ minHeight: '64px' }}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.endDateLabel")}</label>
                <div className="relative mt-0">
                  <input ref={endRef} className="left-focus w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar" type="date" value={endDate} onChange={(e) => { const v = e.target.value; setEndDate(v); setEndAuto(false); if (v && startDate && v < startDate) setStartDate(v); }} />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                    aria-label="Open date picker"
                    onClick={() => {
                      try {
                        endRef.current?.showPicker?.();
                        endRef.current?.focus();
                      } catch (_) {}
                    }}
                  >
                    📅
                  </button>
                </div>
              </div>}
              {showField('deadline') && <div style={{ minHeight: '64px' }}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.deadlineLabel")}</label>
                <div className="relative mt-0.5">
                  <input ref={deadlineRef} className="left-focus w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar" type="date" value={deadline} onChange={(e) => { setDeadline(e.target.value); setDeadlineAuto(false); }} />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                    aria-label="Open date picker"
                    onClick={() => {
                      try {
                        deadlineRef.current?.showPicker?.();
                        deadlineRef.current?.focus();
                      } catch (_) {}
                    }}
                  >
                    📅
                  </button>
                </div>
                <p className="mt-0 text-xs text-slate-500" aria-hidden="true">&nbsp;</p>
              </div>}
              {showField('duration') && <div style={{ minHeight: '64px' }}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.durationLabel")}</label>
                <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 mt-0" type="time" step="60" value={duration || ""} onChange={(e) => setDuration(e.target.value)} />
              </div>}
            </div>

            <div className="hidden md:flex md:items-stretch md:justify-center md:col-span-1">
              <div className="w-px bg-slate-200 my-2"></div>
            </div>

            <div className="grid grid-rows-5 gap-0 md:col-span-1">
              {showField('key_area_id') && <div style={{ minHeight: '64px' }}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.keyAreaLabel")}</label>
                <div className="relative mt-0">
                  <select name="key_area_id" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10" required="" value={keyAreaId} onChange={(e) => setKeyAreaId(e.target.value)}>
                    <option value="">{t("createTaskModal.selectKeyArea")}</option>
                    {(localKeyAreas && localKeyAreas.length ? localKeyAreas : keyAreas).map((area, idx) => (
                      <option key={area.id} value={area.id}>{formatKeyAreaLabel(area, idx)}</option>
                    ))}
                  </select>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"><path fill="currentColor" d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"></path></svg>
                </div>
              </div>}
              {showField('list_index') && <div style={{ minHeight: '64px' }}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.listLabel")}</label>
                <div className="relative mt-0">
                  <select name="list_index" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10" required="" value={listIndex} onChange={(e) => setListIndex(Number(e.target.value))} disabled={!keyAreaId}>
                    {!keyAreaId && <option value="">{t("editTaskModal.selectKeyAreaFirst")}</option>}
                    {keyAreaId && Object.keys(listNames).length > 0 ? (
                      Object.entries(listNames).map(([idx, name]) => (
                        <option key={idx} value={idx}>
                          {name || t("createTaskModal.list", { n: idx })}
                        </option>
                      ))
                    ) : (
                      keyAreaId && (availableLists || [1]).map((idx) => (
                        <option key={idx} value={idx}>
                          {(listNames && listNames[idx]) || t("createTaskModal.list", { n: idx })}
                        </option>
                      ))
                    )}
                  </select>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"><path fill="currentColor" d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"></path></svg>
                </div>
              </div>}
              {showField('assignee') && <div style={{ minHeight: '64px' }}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.responsibleLabel")}</label>
                <div className="relative mt-0">
                  <select name="assignee" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10 mt-0 h-9" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                    <option value="">{t("createTaskModal.unassigned")}</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"><path fill="currentColor" d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"></path></svg>
                </div>
              </div>}
              {showField('priority') && <div style={{ minHeight: '64px' }}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.priorityLabel")}</label>
                <div className="relative mt-0">
                  <select
                    name="priority"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                  >
                    <option value="3">{t("createTaskModal.highOpt")}</option>
                    <option value="2">{t("createTaskModal.normalOpt")}</option>
                    <option value="1" style={{ color: "#6b7280" }}>{t("createTaskModal.lowOpt")}</option>
                  </select>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"><path fill="currentColor" d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"></path></svg>
                </div>
              </div>}
              {showField('goal_id') && <div style={{ minHeight: '64px' }}>
                <label className="text-sm font-medium text-slate-700">{t("createTaskModal.goalLabel")}</label>
                <div className="relative mt-0">
                  <select name="goal" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10" value={goal || ""} onChange={(e) => setGoal(e.target.value)}>
                    <option value="">{t("createTaskModal.selectGoal")}</option>
                    {(localGoals && localGoals.length ? localGoals : goals).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"><path fill="currentColor" d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"></path></svg>
                </div>
              </div>}
            </div>
          </div>
        </form>
        <div className="absolute top-0 right-0 w-1 h-full cursor-e-resize hover:bg-blue-500/20 transition-colors" style={{ zIndex: 40 }} onMouseDown={(e) => handleResizeMouseDown(e, 'right')} />
        <div className="absolute bottom-0 left-0 w-full h-1 cursor-s-resize hover:bg-blue-500/20 transition-colors" style={{ zIndex: 40 }} onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')} />
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-blue-500/30 transition-colors rounded-tl" title="Drag to resize" style={{ zIndex: 41 }} onMouseDown={(e) => handleResizeMouseDown(e, 'se')} />
      </div>
    </Modal>
  );
}
