import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Modal, FormField, Input, Select, DateInput, Button } from '../shared/primitives';
import usersService from '../../services/usersService';

// ---- helpers (JS only) ----
const safeDate = (v) => {
  if (!v && v !== 0) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const _idsOf = (arr = []) => (Array.isArray(arr) ? arr.map((x) => String(x && x.id)).join(',') : '');

export default function CreateTaskModal({
  isOpen,
  initialData = {},
  onSave,
  onCancel,
  isSaving = false,
  keyAreas = [],
  users = [],
  goals = [],
  availableLists = [1],
  // parentListNames: optional mapping passed by parent when no key area is selected
  parentListNames = null,
}) {
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [assignee, setAssignee] = useState(initialData.assignee || '');
  const [startDate, setStartDate] = useState(safeDate(initialData.start_date || initialData.startDate));
  const [endDate, setEndDate] = useState(safeDate(initialData.end_date || initialData.endDate));
  // When creating, we keep end date in-sync with start date until the user edits end date.
  const [endAuto, setEndAuto] = useState(!(initialData.end_date || initialData.endDate));
  const [deadline, setDeadline] = useState(safeDate(initialData.deadline || initialData.dueDate));
  const [duration, setDuration] = useState(initialData.duration || initialData.duration_minutes || '');
  const [priority, setPriority] = useState(initialData.priority ?? initialData.priority_level ?? 2);
  const [status, setStatus] = useState(initialData.status || initialData.state || 'open');
  const [keyAreaId, setKeyAreaId] = useState(
    initialData.key_area_id || initialData.keyAreaId || ''
  );
  const [listIndex, setListIndex] = useState(
    initialData.list || initialData.list_index || ''
  );
  const [goal, setGoal] = useState(initialData.goal || '');
  const [usersList, setUsersList] = useState(users || []);
  const [localKeyAreas, setLocalKeyAreas] = useState(keyAreas || []);
  const [allTasks, setAllTasks] = useState([]);
  const [listNames, setListNames] = useState({});
  const [localGoals, setLocalGoals] = useState(goals || []);
  const usersLoadedRef = React.useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const nextTitle = initialData.title || '';
    if (title !== nextTitle) setTitle(nextTitle);
    const nextDescription = initialData.description || '';
    if (description !== nextDescription) setDescription(nextDescription);
    const nextAssignee = initialData.assignee || '';
    if (assignee !== nextAssignee) setAssignee(nextAssignee);
    const nextStart = safeDate(initialData.start_date || initialData.startDate);
    if (startDate !== nextStart) setStartDate(nextStart);
  const nextEnd = safeDate(initialData.end_date || initialData.endDate);
  if (endDate !== nextEnd) setEndDate(nextEnd);
  // If the initial data provides an explicit end date, disable auto-sync; otherwise keep auto-sync enabled
  const nextEndAuto = !Boolean(initialData.end_date || initialData.endDate);
  if (endAuto !== nextEndAuto) setEndAuto(nextEndAuto);
    const nextDeadline = safeDate(initialData.deadline || initialData.dueDate);
    if (deadline !== nextDeadline) setDeadline(nextDeadline);
    const nextDuration = initialData.duration || initialData.duration_minutes || '';
    if (duration !== nextDuration) setDuration(nextDuration);
    const nextPriority = initialData.priority ?? initialData.priority_level ?? 2;
    if (priority !== nextPriority) setPriority(nextPriority);
    const nextStatus = initialData.status || initialData.state || 'open';
    if (status !== nextStatus) setStatus(nextStatus);
    const nextKA = initialData.key_area_id || initialData.keyAreaId || '';
    if (String(keyAreaId) !== String(nextKA)) setKeyAreaId(nextKA);
    const nextList = initialData.list || initialData.list_index || (availableLists && availableLists[0]) || 1;
    if (listIndex !== nextList) setListIndex(nextList);
    const nextGoal = initialData.goal || '';
    if (goal !== nextGoal) setGoal(nextGoal);

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
    // For CreateTaskModal we intentionally don't auto-default key area or list
    // so that all left-column fields (including Task name) start empty when creating.
    // This effect is intentionally a no-op here.
  }, [isOpen, localKeyAreas, keyAreas, availableLists, keyAreaId, listIndex]);

  useEffect(() => {
    if (!isOpen) usersLoadedRef.current = false;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    (async () => {
      try {
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
      } catch (e) {
        console.error('Failed to load key areas or tasks for CreateTaskModal', e);
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

  // When a specific Key Area is selected while creating a task, fetch tasks for that
  // key area so the List dropdown can include any list_index values already used by
  // tasks in that area. This keeps the dropdown up-to-date without needing to load
  // all tasks for the entire workspace.
  useEffect(() => {
    if (!isOpen || !keyAreaId) return;
    let ignore = false;
    (async () => {
      try {
        const tsMod = await import('../../services/taskService').catch(() => null);
        const taskSvc = tsMod?.default || tsMod;
        if (!taskSvc) return;
        const tasksForArea = await taskSvc.list({ keyAreaId }).catch(() => []);
        if (ignore) return;
        setAllTasks((prev) => {
          try {
            if (_idsOf(prev) === _idsOf(tasksForArea)) return prev;
          } catch (_) {}
          return tasksForArea;
        });
      } catch (e) {
        if (!ignore) setAllTasks([]);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [isOpen, keyAreaId]);

  useEffect(() => {
    const kaId = keyAreaId;
    if (!kaId) {
      setListNames({});
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
  }, [keyAreaId, localKeyAreas, keyAreas]);

  // If the availableLists prop updates after the modal opened (for example when
  // DontForget computes its available lists asynchronously), default the list
  // index to the first available value so the dropdown reflects the latest data.
  useEffect(() => {
    if (!isOpen) return;
    try {
      if ((!listIndex || listIndex === 0) && Array.isArray(availableLists) && availableLists.length) {
        setListIndex(availableLists[0]);
      }
    } catch (_) {}
  }, [availableLists, isOpen]);

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

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
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
    const payload = {
      title: (title || '').trim(),
      description: (description || '').trim(),
      assignee: assignee || null,
      start_date: startDate || null,
      end_date: endDate || null,
      deadline: deadline || null,
      duration: duration || null,
      priority,
      status,
      key_area_id: keyAreaId || null,
      // include both snake_case and camelCase for compatibility; prefer camelCase server-side
      list_index: listIndex,
      listIndex: listIndex,
      goal_id: goal || null,
    };
    if (!onSave) {
      console.warn('CreateTaskModal: onSave prop not provided');
      return;
    }
    onSave && onSave(payload);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  if (!isOpen) return null;

  const priorityOptions = [
    { value: '1', label: 'Low' },
    { value: '2', label: 'Normal' },
    { value: '3', label: 'High' }
  ];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onCancel} 
      title="Create Task"
      size="lg"
      isSaving={isSaving}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            loading={isSaving}
            icon={<Save className="w-4 h-4" />}
          >
            Save Task
          </Button>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Task name" required>
          <Input
            required
            placeholder="Task name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSaving}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Description">
            <Input
              placeholder="Brief description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Key Area">
            <Select
              value={keyAreaId}
              onChange={(e) => setKeyAreaId(e.target.value)}
              placeholder="— Select Key Area —"
              options={(localKeyAreas && localKeyAreas.length ? localKeyAreas : keyAreas).map(ka => ({ 
                value: ka.id, 
                label: ka.title || ka.name 
              }))}
              disabled={isSaving}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Start date">
            <DateInput
              value={startDate}
              onChange={(e) => {
                const v = e.target.value
                setStartDate(v)
                if (endAuto) setEndDate(v)
              }}
              disabled={isSaving}
            />
          </FormField>

          <FormField label="End date">
            <DateInput
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setEndAuto(false)
              }}
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Deadline" hint="No later than">
            <DateInput
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={isSaving}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="List">
            <Select
              value={listIndex}
              onChange={(e) => setListIndex(Number(e.target.value))}
              options={(() => {
                if (!keyAreaId) {
                  const useLists = (availableLists && availableLists.length) ? availableLists : [1];
                  return useLists.map((n) => ({
                    value: n,
                    label: (parentListNames && parentListNames[n]) || (listNames && listNames[n]) || `List ${n}`
                  }));
                }
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
                return toUse.map((n) => ({
                  value: n,
                  label: (listNames && listNames[n]) || `List ${n}`
                }));
              })()}
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Duration">
            <Input
              placeholder="e.g., 1h, 1d"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              disabled={isSaving}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Priority">
            <Select
              value={String(priority)}
              onChange={(e) => setPriority(Number(e.target.value))}
              options={priorityOptions}
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Assignee">
            <Select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="— Unassigned —"
              options={(usersList || []).map(u => ({ value: u.name, label: u.name }))}
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Goal">
            <Select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="— Select Goal —"
              options={(localGoals && localGoals.length ? localGoals : goals).map(g => ({ 
                value: g.id, 
                label: g.title 
              }))}
              disabled={isSaving}
            />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
