import React, { useEffect, useState, useRef, useMemo } from 'react';
import { toDateOnly } from '../../utils/keyareasHelpers';
import Modal from '../shared/Modal';
import { getPriorityLevel } from '../../utils/keyareasHelpers';
import usersService from '../../services/usersService';
import { useDraggable } from '../../hooks/useDraggable';
import { useResizable } from '../../hooks/useResizable';

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

const normalizePriority = (value) => {
  if (value === undefined || value === null || value === '') return 'normal';
  const raw = String(value).toLowerCase();
  if (raw === '3' || raw === 'high') return 'high';
  if (raw === '1' || raw === 'low') return 'low';
  if (raw === '2' || raw === 'normal' || raw === 'med' || raw === 'medium') return 'normal';
  return 'normal';
};

// inline SVG icons (untyped)

const IconChevron = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"
    />
  </svg>
);

export default function EditActivityModal({
  isOpen,
  initialData = {},
  onSave,
  onCancel,
  isSaving = false,
  keyAreas = [],
  users = [],
  goals = [],
  tasks = [],
  availableLists = [1],
  currentUserId = null,
}) {
  const usersLoadedRef = useRef(false);
  const [localKeyAreas, setLocalKeyAreas] = useState(keyAreas || []);
  const [localTasks, setLocalTasks] = useState(tasks || []);
  const [localGoals, setLocalGoals] = useState(goals || []);
  const [usersList, setUsersList] = useState(users || []);
  const [listNamesMap, setListNamesMap] = useState({});
  const [title, setTitle] = useState(initialData.text || initialData.activity_name || '');
  const [description, setDescription] = useState(initialData.notes || initialData.description || '');
  const [startDate, setStartDate] = useState(safeDate(initialData.date_start || initialData.startDate) || defaultDate);
  const [endDate, setEndDate] = useState(safeDate(initialData.date_end || initialData.endDate) || defaultDate);
  const [endAuto, setEndAuto] = useState(!(initialData.endDate || initialData.date_end));
  const [keyAreaError, setKeyAreaError] = useState('');
  const [listError, setListError] = useState('');
  const [deadline, setDeadline] = useState(safeDate(initialData.deadline || initialData.dueDate));
  const [duration, setDuration] = useState(initialData.duration || '');
  const [keyAreaId, setKeyAreaId] = useState(
    initialData.key_area_id || initialData.keyAreaId || initialData.keyArea || initialData.key_area || ''
  );
  const [listIndex, setListIndex] = useState(
    initialData.list || initialData.list_index || ''
  );
  const [localAvailableLists, setLocalAvailableLists] = useState(Array.isArray(availableLists) ? availableLists : [1]);
  const [localListNames, setLocalListNames] = useState({});
  const [taskId, setTaskId] = useState(initialData.taskId || initialData.task_id || initialData.task || '');
  const [assignee, setAssignee] = useState(initialData.responsible || initialData.assignee || '');
  const [priority, setPriority] = useState(normalizePriority(initialData.priority ?? initialData.priority_level ?? 'normal'));
  const [goal, setGoal] = useState(initialData.goal || initialData.goalId || '');
  const startRef = useRef(null);
  const endRef = useRef(null);
  const deadlineRef = useRef(null);
  const { position, isDragging, handleMouseDown, handleMouseMove, handleMouseUp, resetPosition } = useDraggable();
  const { size, isDraggingResize, handleResizeMouseDown } = useResizable(550, 510);

  // Filter tasks by selected key area and list
  const filteredTasks = useMemo(() => {
    if (!keyAreaId || !listIndex) return [];
    const allTasks = localTasks.length > 0 ? localTasks : (tasks || []);
    return allTasks.filter((t) => {
      const tKeyArea = t.keyAreaId || t.key_area_id || t.keyArea || t.key_area;
      const tList = t.list || t.list_index || t.listIndex;
      return String(tKeyArea) === String(keyAreaId) && String(tList) === String(listIndex);
    });
  }, [keyAreaId, listIndex, localTasks, tasks]);

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
    if (isOpen) resetPosition();
  }, [isOpen, resetPosition]);

  useEffect(() => {
    if (!isOpen) return;
    try { console.debug('[EditActivityModal] opening with initialData', initialData, { keyAreasLength: (keyAreas||[]).length, tasksLength: (tasks||[]).length }); } catch (__) {}
    setTitle(initialData.text || initialData.activity_name || '');
    setDescription(initialData.notes || initialData.description || '');
    // Try multiple possible date aliases to maximize chance of prefill
    setStartDate(safeDate(initialData.date_start ?? initialData.dateStart ?? initialData.startDate ?? initialData.start_date ?? initialData.date) || defaultDate);
    const nextEnd = safeDate(initialData.date_end ?? initialData.endDate ?? initialData.end_date ?? initialData.date_end) || defaultDate;
    setEndDate(nextEnd);
    setEndAuto(!Boolean(initialData.endDate || initialData.date_end));
    setDeadline(safeDate(initialData.deadline ?? initialData.dueDate ?? initialData.due_date ?? initialData.deadline));
    setDuration(initialData.duration || '');
    setKeyAreaId(initialData.key_area_id || initialData.keyAreaId || initialData.keyArea || initialData.key_area || '');
    setListIndex(initialData.list || initialData.list_index || '');
    setTaskId(initialData.taskId || initialData.task_id || initialData.task || initialData.task_id || '');
    // Activity assignee can come from responsible, assignee, or delegatedToUserId fields
    const initialAssigneeValue = initialData.responsible || initialData.assignee || initialData.delegatedToUserId || initialData.delegated_to_user_id || '';
    let nextAssignee = '';
    if (initialAssigneeValue) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(initialAssigneeValue)) {
        nextAssignee = initialAssigneeValue;
      } else {
        const user = usersList.find((u) => {
          const fullName = `${u.name || ''} ${u.lastname || ''}`.trim();
          const email = u.email || '';
          const initialLower = String(initialAssigneeValue).toLowerCase();
          return (
            String(u.id) === String(initialAssigneeValue) ||
            u.name === initialAssigneeValue ||
            fullName === initialAssigneeValue ||
            email === initialAssigneeValue ||
            initialLower.includes(email.toLowerCase()) ||
            initialLower.includes(u.name?.toLowerCase() || '')
          );
        });
        nextAssignee = user?.id || '';
      }
    }
    if (nextAssignee) setAssignee(nextAssignee);
    else {
      try {
        const lookupTasks = (localTasks && localTasks.length) ? localTasks : (tasks && tasks.length ? tasks : []);
        const tid = initialData.taskId || initialData.task_id || initialData.task || null;
        if (tid) {
          const parent = lookupTasks.find((t) => String(t.id) === String(tid));
          if (parent && (parent.assignee || parent.responsible)) {
            const parentAssignee = parent.assignee || parent.responsible || '';
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parentAssignee)) {
              setAssignee(parentAssignee);
            } else {
              const parentUser = usersList.find((u) => {
                const fullName = `${u.name || ''} ${u.lastname || ''}`.trim();
                const email = u.email || '';
                const parentLower = String(parentAssignee).toLowerCase();
                return (
                  String(u.id) === String(parentAssignee) ||
                  u.name === parentAssignee ||
                  fullName === parentAssignee ||
                  email === parentAssignee ||
                  parentLower.includes(email.toLowerCase()) ||
                  parentLower.includes(u.name?.toLowerCase() || '')
                );
              });
              if (parentUser?.id) setAssignee(parentUser.id);
            }
          }
        }
      } catch (e) {}
    }
    setPriority(normalizePriority(initialData.priority ?? initialData.priority_level ?? 'normal'));
    setGoal(initialData.goal || initialData.goalId || '');
  }, [isOpen, initialData, keyAreas, availableLists]);

  // Load key areas, tasks and goals when modal opens so Task and List dropdowns
  // are populated even if parent didn't pass full lists. This mirrors EditTaskModal.
  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    (async () => {
      try {
        const kaMod = await import('../../services/keyAreaService');
        const kaSvc = kaMod?.default || kaMod;
        const tsMod = await import('../../services/taskService').catch(() => null);
        const taskSvc = tsMod?.default || tsMod;
        const goalsMod = await import('../../services/goalService').catch(() => null);
        const [areas, fetchedTasks, fetchedGoals] = await Promise.all([
          kaSvc.list({ includeTaskCount: false }).catch(() => []),
          taskSvc ? taskSvc.list({}).catch(() => []) : Promise.resolve([]),
          goalsMod && goalsMod.getGoals ? goalsMod.getGoals().catch(() => []) : Promise.resolve([]),
        ]);
        if (ignore) return;
        setLocalKeyAreas(Array.isArray(areas) ? areas : []);
        setLocalTasks(Array.isArray(fetchedTasks) ? fetchedTasks : []);
        setLocalGoals(Array.isArray(fetchedGoals) ? fetchedGoals : []);
        // If a key area is already selected, set list names for it
        try {
          const kaId = initialData.key_area_id || initialData.keyAreaId || initialData.keyArea || null;
          if (kaId) {
            const selected = (areas || []).find((k) => String(k.id) === String(kaId));
            if (selected && selected.listNames) setListNamesMap(selected.listNames || {});
          }
        } catch (e) {}
      } catch (e) {
        // non-fatal
      }
    })();
    return () => { ignore = true; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
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
              const prevIds = (usersList || []).map((u) => String(u.id)).join(',');
              const newIds = (merged || []).map((u) => String(u.id)).join(',');
              if (prevIds !== newIds) setUsersList(merged);
            } else {
              const prevIds = (usersList || []).map((u) => String(u.id)).join(',');
              const newIds = (users || []).map((u) => String(u.id)).join(',');
              if (prevIds !== newIds) setUsersList(users || []);
            }
          } else {
            const prevIds = (usersList || []).map((u) => String(u.id)).join(',');
            const merged = (usersList || []).slice();
            const existingIdsSet = new Set((usersList || []).map((u) => String(u.id)));
            (users || []).forEach((u) => {
              if (!existingIdsSet.has(String(u.id))) merged.push(u);
            });
            const newIds = (merged || []).map((u) => String(u.id)).join(',');
            if (prevIds !== newIds) setUsersList(merged);
          }
        } else if (!usersLoadedRef.current) {
          const me = await usersService.list();
          usersLoadedRef.current = true;
          setUsersList(me || []);
        }
      } catch (e) {
        if (users && users.length) setUsersList(users || []);
      }
    })();
  }, [isOpen, users]);

  if (!isOpen) return null;

  const handleSave = () => {
    // Activities don't require key area or list - they're attached to tasks which have those
    // Normalize dates to date-only strings (YYYY-MM-DD) to avoid timezone shifts
    const normStart = toDateOnly(startDate) || null;
    const normEnd = toDateOnly(endDate) || null;
    const normDeadline = toDateOnly(deadline) || null;

  // Handle assignee - convert user ID to delegatedToUserId for auto-delegation
  let delegatedToUserId = null;
  
  if (assignee) {
    const selectedUser = usersList.find(u => String(u.id) === String(assignee));
    if (selectedUser) {
      const userId = selectedUser.id;
      
      // Only add delegatedToUserId if assigning to different user (auto-creates delegation)
      if (String(userId) !== String(currentUserId)) {
        delegatedToUserId = userId;
      }
    }
  }

    const payload = {
      ...initialData,
      text: (title || '').trim(),
      notes: (description || '').trim(),
      // Backend expects camelCase date fields
      startDate: normStart,
      endDate: normEnd,
      deadline: normDeadline,
      duration: duration || null,
      taskId: taskId || null,
      delegatedToUserId: delegatedToUserId,
      priority,
      goalId: goal || null,
    };
    // Strip empty-string values and fields not supported by activities backend
    const unsupportedFields = ['key_area_id', 'keyAreaId', 'keyArea', 'list', 'listIndex', 'list_index', 'assignee', 'responsible', 'assigneeId', 'responsibleId'];
    Object.keys(payload).forEach((k) => {
      try {
        if (payload[k] === '' || unsupportedFields.includes(k)) delete payload[k];
      } catch (__) {}
    });

    try { console.debug('[EditActivityModal] onSave payload', payload); } catch (__) {}
    onSave && onSave(payload);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <Modal open={isOpen} onClose={onCancel}>
      <div
        className="relative z-10 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 flex flex-col overflow-hidden"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : isDraggingResize ? 'se-resize' : 'default',
          width: `${size.width}px`,
          height: `${size.height}px`,
          minWidth: '300px',
          minHeight: '200px',
        }}
      >
        {/* hide native date picker icons for inputs with .no-calendar */}
        <style>{`
          .no-calendar::-webkit-calendar-picker-indicator { opacity: 0; pointer-events: none; display: block; width: 0; height: 0; }
          .no-calendar::-webkit-clear-button,
          .no-calendar::-webkit-inner-spin-button { display: none; }
          .no-calendar { -webkit-appearance: none; appearance: none; }
          .no-calendar::-moz-focus-inner { border: 0; }
        `}</style>

        <div
          className="relative px-5 py-2 border-b border-slate-200 text-center font-semibold text-slate-900 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
          onMouseDown={handleMouseDown}
        >
          Edit Activity
        </div>

        <form className="px-4 pb-4 pt-2 space-y-2 overflow-y-auto flex-1" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="ka-activity-title">Activity name</label>
            <input
              id="ka-activity-title"
              required
              name="title"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 mt-0.5"
              placeholder="Activity name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-y-4 md:gap-x-6">
            <div className="grid grid-rows-6 gap-0 md:col-span-1">
              <div>
                <label className="text-sm font-medium text-slate-700">Description</label>
                <input
                  name="description"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 mt-0"
                  placeholder="Brief description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Start date</label>
                <div className="relative mt-0">
                  <input
                    name="start_date"
                    type="date"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar"
                    value={startDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStartDate(v);
                      try { if (endAuto) setEndDate(v); } catch (__) {}
                    }}
                    ref={startRef}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600" aria-label="Open date picker" onClick={() => { try { startRef.current?.showPicker?.(); startRef.current?.focus(); } catch (__) {} }}>
                    📅
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">End date</label>
                <div className="relative mt-0">
                  <input
                    name="end_date"
                    type="date"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      try { setEndAuto(false); } catch (__) {}
                    }}
                    ref={endRef}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600" aria-label="Open date picker" onClick={() => { try { endRef.current?.showPicker?.(); endRef.current?.focus(); } catch (__) {} }}>
                    📅
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Deadline</label>
                <div className="relative mt-0.5">
                  <input
                    name="deadline"
                    type="date"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    ref={deadlineRef}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600" aria-label="Open date picker" onClick={() => { try { deadlineRef.current?.showPicker?.(); deadlineRef.current?.focus(); } catch (__) {} }}>
                    📅
                  </button>
                </div>
                <p className="mt-0 text-xs text-slate-500">No later than</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Duration</label>
                <input
                  name="duration"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 mt-0"
                  placeholder="e.g., 1h, 1d"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>

            <div className="hidden md:flex md:items-stretch md:justify-center md:col-span-1">
              <div className="w-px bg-slate-200 my-2" />
            </div>

            <div className="grid grid-rows-6 gap-0 md:col-span-1">
              <div>
                <label className="text-sm font-medium text-slate-700">Key Area</label>
                <div className="relative mt-0">
                  <select name="key_area_id" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10" value={keyAreaId} onChange={(e) => { setKeyAreaId(e.target.value); setKeyAreaError(''); }} required>
                    <option value="">— Select Key Area —</option>
                    {(localKeyAreas && localKeyAreas.length ? localKeyAreas : keyAreas).map((ka) => (<option key={ka.id} value={ka.id}>{ka.title || ka.name}</option>))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
                {keyAreaError ? (<p className="mt-1 text-xs text-red-600">{keyAreaError}</p>) : null}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">List</label>
                <div className="relative mt-0">
                  <select name="list_index" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10" value={listIndex} onChange={(e) => { setListIndex(e.target.value); setListError(''); }} disabled={!keyAreaId} required>
                    {!keyAreaId ? (<option value="">— Select Key Area first —</option>) : (<option value="">— Select List —</option>)}
                    {keyAreaId && localAvailableLists.map((n) => {
                      const label = (localListNames && localListNames[n]) || `List ${n}`;
                      return (<option key={n} value={n}>{label}</option>);
                    })}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
                {listError ? (<p className="mt-1 text-xs text-red-600">{listError}</p>) : null}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Task</label>
                <div className="relative mt-0">
                  <select name="task_id" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10" value={taskId} onChange={(e) => setTaskId(e.target.value)} disabled={!keyAreaId || !listIndex}>
                    {!keyAreaId ? (<option value="">— Select Key Area first —</option>) : (!listIndex ? (<option value="">— Select List first —</option>) : (<option value="">— Select Task —</option>))}
                    {keyAreaId && listIndex && filteredTasks.map((t) => {
                      const label = t.title || t.name || t.activity_name || t.text || String(t.id);
                      return (<option key={t.id} value={t.id}>{label}</option>);
                    })}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Responsible</label>
                <div className="relative mt-0">
                  <select name="assignee" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                    <option value="">— Unassigned —</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.firstname} {u.lastname || ''}
                      </option>
                    ))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Priority</label>
                <div className="relative mt-0">
                  <select name="priority" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Goal</label>
                <div className="relative mt-0">
                  <select name="goal" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50 appearance-none pr-10" value={goal} onChange={(e) => setGoal(e.target.value)}>
                    <option value="">— Select Goal —</option>
                    {(localGoals && localGoals.length ? localGoals : goals).map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 w-full mt-2">
            <button type="submit" className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-4 py-2 text-sm">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM224 416c-35.346 0-64-28.654-64-64 0-35.346 28.654-64 64-64s64 28.654 64 64c0 35.346-28.654 64-64 64zm96-304.52V212c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h228.52c3.183 0 6.235 1.264 8.485 3.515l3.48 3.48A11.996 11.996 0 0 1 320 111.48z"></path></svg>
              OK
            </button>
            <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={onCancel}>Cancel</button>
            <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" disabled>Help</button>
          </div>
        </form>

        <div
          onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
          className="absolute top-0 right-0 w-1 h-full cursor-e-resize hover:bg-blue-500/20 transition-colors"
          style={{ zIndex: 40 }}
        />
        <div
          onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
          className="absolute bottom-0 left-0 w-full h-1 cursor-s-resize hover:bg-blue-500/20 transition-colors"
          style={{ zIndex: 40 }}
        />
        <div
          onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-blue-500/30 transition-colors rounded-tl"
          style={{ zIndex: 41 }}
          title="Drag to resize"
        />

        <button type="button" className="absolute top-2 right-2 p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100" aria-label="Close" onClick={onCancel}>
          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>
        </button>
      </div>
    </Modal>
  );
}
