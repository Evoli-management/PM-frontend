import React, { useEffect, useState, useRef } from 'react';
import { FaSave } from 'react-icons/fa';
import usersService from '../../services/usersService';
import { useFormattedDate } from '../../hooks/useFormattedDate';

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
  onCancel,
  isSaving = false,
  keyAreas = [],
  users = [],
  goals = [],
  availableLists = [1],
  currentUserId = null,
  // optional mapping of parent list names (used by DontForget)
  parentListNames = {},
  // optional custom modal title (used for mass-editing banner)
  modalTitle = undefined,
  // When true, editing a Don't Forget task (no Key Area required)
  isDontForgetMode = false,
}) {
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
  const [keyAreaError, setKeyAreaError] = useState('');
  const [listError, setListError] = useState('');
  const [deadline, setDeadline] = useState(safeDate(initialData.deadline || initialData.dueDate));
  const [duration, setDuration] = useState(initialData.duration || initialData.duration_minutes || '');
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
    const nextDeadline = safeDate(initialData.deadline || initialData.dueDate);
    if (deadline !== nextDeadline) setDeadline(nextDeadline);
    const nextDuration = initialData.duration || initialData.duration_minutes || '';
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
          import('../../services/goalService').then((m) => m.getGoals()).catch(() => []),
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
  setLocalGoals((prev) => {
    try {
      if (_idsOf(prev) === _idsOf(fetchedGoals)) return prev;
    } catch (_) {}
    return fetchedGoals;
  });
        // If the task has a goal id that wasn't included in fetched goals, try to fetch it individually
        try {
          const taskGoalId = initialData && (initialData.goal || initialData.goal_id || initialData.goalId);
          const hasGoal = fetchedGoals.some((g) => String(g.id) === String(taskGoalId));
          if (taskGoalId && !hasGoal) {
            const getGoal = (await import('../../services/goalService')).getGoalById;
            if (typeof getGoal === 'function') {
              const single = await getGoal(taskGoalId).catch(() => null);
              if (single) {
                setLocalGoals((prev) => {
                  const exists = (prev || []).some((g) => String(g.id) === String(single.id));
                  if (exists) return prev;
                  return [single, ...(prev || [])];
                });
              }
            }
          }
        } catch (err) {
          // non-fatal
          console.warn('Could not fetch single goal for EditTaskModal', err);
        }
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
      setListNames(parentListNames && Object.keys(parentListNames).length ? parentListNames : {});
      return;
    }
    const selectedArea = (localKeyAreas && localKeyAreas.length ? localKeyAreas : keyAreas).find(
      (a) => String(a.id) === String(kaId)
    );
    if (selectedArea?.listNames) {
      setListNames(selectedArea.listNames || {});
    } else {
      setListNames({});
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
      setKeyAreaError('Please select a Key Area');
      try { document.querySelector('select[name="key_area_id"]')?.focus?.(); } catch (_) {}
      return;
    }
    if (!listIndex) {
      setListError('Please select a List');
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

  // shared styles to match existing UI
  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50';
  const dateCls = `${inputCls} appearance-none pr-11 no-calendar`;
  const selectCls = `${inputCls} appearance-none pr-10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      {/* dialog */}
  <div className="relative z-10 w-[640px] max-w-[95vw] rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        {/* hide native date picker icons for inputs with .no-calendar */}
        <style>{`
          .no-calendar::-webkit-calendar-picker-indicator { display: none; -webkit-appearance: none; }
          .no-calendar::-webkit-clear-button, .no-calendar::-webkit-inner-spin-button { display: none; -webkit-appearance: none; }
          .no-calendar::-ms-clear { display: none; }
        `}</style>
  {/* header - title centered, divider gray */}
  <div className="relative px-5 py-2 border-b border-slate-200">
          <h3 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-semibold text-slate-900">
            {modalTitle || 'Edit Task'}
          </h3>
          <div className="flex items-center justify-end">
            <button
              type="button"
              className="p-2 rounded-full text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
              onClick={onCancel}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

  {/* body */}
  <form onSubmit={onSubmit} className="px-4 pb-4 pt-2 space-y-2">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="ka-task-title">Task name</label>
            <input
              id="ka-task-title"
              name="title"
              required
              className={`${inputCls} mt-0.5`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-y-2 md:gap-x-0.5">
            {/* LEFT column */}
            <div className="grid grid-rows-5 gap-0 md:col-span-1">
              <div>
                <label className="text-sm font-medium text-slate-700">Description</label>
                <input
                  name="description"
                  className={`${inputCls} mt-0`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Start date</label>
                <div className="relative mt-0">
                  <input
                    ref={startRef}
                    name="start_date"
                    type="date"
                    className={dateCls}
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); }}
                    // onInput helps catch native picker changes in some browsers
                    onInput={(e) => { setStartDate(e.target.value); }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        // If no date is set, prefill with today's date so the native
                        // showPicker opens with a sensible value instead of empty.
                        const today = new Date();
                        const todayStr = today.toISOString().slice(0, 10);
                        if (!startRef.current?.value) {
                          setStartDate(todayStr);
                        }
                        startRef.current?.showPicker?.();
                        startRef.current?.focus();
                      } catch (e) {}
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                    aria-label="Open date picker"
                  >
                    📅
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">{dateLabel(startDate)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">End date</label>
                <div className="relative mt-0.5">
                  <input
                    ref={endRef}
                    name="end_date"
                    type="date"
                    className={dateCls}
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); }}
                    onInput={(e) => { setEndDate(e.target.value); }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const today = new Date();
                        const todayStr = today.toISOString().slice(0, 10);
                        if (!endRef.current?.value) {
                          setEndDate(todayStr);
                        }
                        endRef.current?.showPicker?.();
                        endRef.current?.focus();
                      } catch (e) {}
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                    aria-label="Open date picker"
                  >
                    📅
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">{dateLabel(endDate)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Deadline</label>
                <div className="relative mt-0">
                  <input
                    ref={deadlineRef}
                    name="deadline"
                    type="date"
                    className={dateCls}
                    value={deadline}
                    onChange={(e) => { setDeadline(e.target.value); }}
                    onInput={(e) => { setDeadline(e.target.value); }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const today = new Date();
                        const todayStr = today.toISOString().slice(0, 10);
                        if (!deadlineRef.current?.value) {
                          setDeadline(todayStr);
                        }
                        deadlineRef.current?.showPicker?.();
                        deadlineRef.current?.focus();
                      } catch (e) {}
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                    aria-label="Open date picker"
                  >
                    📅
                  </button>
                </div>
                <p className="mt-0 text-xs text-slate-500">No later than</p>
                <p className="mt-1 text-xs text-slate-500">{dateLabel(deadline)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Duration</label>
                <input
                  name="duration"
                  className={`${inputCls} mt-0.5`}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., 1h, 1d"
                />
              </div>
            </div>
            {/* separator column centered between left and right on md+ */}
            <div className="hidden md:flex md:items-stretch md:justify-center md:col-span-1">
              <div className="w-px bg-slate-400 my-2" />
            </div>

            {/* RIGHT column */}
            <div className="grid grid-rows-5 gap-0 md:col-span-1">
              <div>
                <label className="text-sm font-medium text-slate-700">Key Area</label>
                <div className="relative mt-0">
                  <select
                    name="key_area_id"
                    className={selectCls}
                    value={keyAreaId}
                    onChange={(e) => { setKeyAreaId(e.target.value); setKeyAreaError(''); }}
                    required={!isDontForgetMode}
                  >
                    <option value="">— Select Key Area —</option>
                    {(localKeyAreas && localKeyAreas.length ? localKeyAreas : keyAreas).map((ka) => (
                      <option key={ka.id} value={ka.id}>{ka.title || ka.name}</option>
                    ))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
                {keyAreaError ? (<p className="mt-1 text-xs text-red-600">{keyAreaError}</p>) : null}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">List</label>
                <div className="relative mt-0">
                  <select
                    name="list_index"
                    className={selectCls}
                    value={listIndex}
                    onChange={(e) => { setListIndex(Number(e.target.value)); setListError(''); }}
                    required
                  >
                      {// compute available lists using listNames and allTasks similar to other modals
                        (() => {
                          try {
                            // Debug: log which listNames/availableLists are being used when the modal is open
                            // eslint-disable-next-line no-console
                            console.log('[EditTaskModal] keyAreaId, parentListNames, listNames, availableLists:', keyAreaId, parentListNames, listNames, availableLists);
                          } catch (e) {}
                          // prefer listNames for the selected key area
                          const named = Object.keys(listNames || {})
                            .map(Number)
                            .filter((idx) => listNames[idx] && String(listNames[idx]).trim() !== '');
                          const listsWithTasks = (allTasks || [])
                            .filter((t) => String(t.keyAreaId) === String(keyAreaId) && t.list_index)
                            .map((t) => t.list_index)
                            .filter((v, i, arr) => arr.indexOf(v) === i);
                          const combined = [1, ...named, ...listsWithTasks];
                          const uniq = [...new Set(combined)].sort((a, b) => a - b);
                          const toUse = (uniq && uniq.length) ? uniq : (availableLists || [1]);
                          try {
                            // eslint-disable-next-line no-console
                            console.log('[EditTaskModal] computed lists toUse:', toUse);
                          } catch (e) {}
                          return toUse.map((n) => (
                            <option key={n} value={n}>{(listNames && listNames[n]) || `List ${n}`}</option>
                          ));
                        })()
                    }
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
                {listError ? (<p className="mt-1 text-xs text-red-600">{listError}</p>) : null}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Responsible</label>
                <div className="relative mt-0">
                  <select
                    name="assignee"
                    className={selectCls}
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    <option value="">— Unassigned —</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {/* Task field removed per request */}

              <div>
                <label className="text-sm font-medium text-slate-700">Priority</label>
                <div className="relative mt-0">
                  <select
                    name="priority"
                    className={selectCls}
                    value={String(priority)}
                    onChange={(e) => setPriority(Number(e.target.value))}
                  >
                    <option value={1}>Low</option>
                    <option value={2}>Normal</option>
                    <option value={3}>High</option>
                  </select>
                  <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Goal</label>
                <div className="relative mt-0">
                  <select
                    name="goal"
                    className={selectCls}
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  >
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

          {/* footer */}
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              onClick={(e) => {
                e.preventDefault();
                if (!isSaving && title.trim()) {
                  handleSave();
                } else if (!title.trim()) {
                  console.warn('EditTaskModal: Save not triggered because title is empty');
                }
              }}
              className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-4 py-2 text-sm"
            >
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM224 416c-35.346 0-64-28.654-64-64 0-35.346 28.654-64 64-64s64 28.654 64 64c0 35.346-28.654 64-64 64zm96-304.52V212c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h228.52c3.183 0 6.235 1.264 8.485 3.515l3.48 3.48A11.996 11.996 0 0 1 320 111.48z"></path></svg>
              Save
            </button>
            <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" disabled>Help</button>
          </div>
        </form>
      </div>
    </div>
  );
}
