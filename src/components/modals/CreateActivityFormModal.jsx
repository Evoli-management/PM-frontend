import React, { useEffect, useState, useRef } from 'react'
import Modal from '../shared/Modal'
import { FaSave } from 'react-icons/fa'

// A clean reusable Create Activity form modal. Use this file if the original got corrupted.
export default function CreateActivityFormModal({
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
  parentListNames = {},
}) {
  // Normalize parentListNames keys to numbers for robust lookup (parents may store keys as strings)
  const normalizedParentListNames = {};
  try {
    Object.keys(parentListNames || {}).forEach((k) => {
      const num = Number(k);
      if (!Number.isNaN(num)) normalizedParentListNames[num] = parentListNames[k];
      else normalizedParentListNames[k] = parentListNames[k];
    });
  } catch (e) {}
  const safeDate = (v) => {
    if (!v && v !== 0) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v)
    try {
      const d = new Date(v)
      if (isNaN(d.getTime())) return ''
      return d.toISOString().slice(0, 10)
    } catch {
      return ''
    }
  }

  const IconChevron = (props) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"
      />
    </svg>
  )

  const [title, setTitle] = useState(initialData.text || '')
  const [description, setDescription] = useState(initialData.description || '')
  const [startDate, setStartDate] = useState(safeDate(initialData.startDate || initialData.date_start))
  const [endDate, setEndDate] = useState(safeDate(initialData.endDate || initialData.date_end))
  const [endAuto, setEndAuto] = useState(!(initialData.endDate || initialData.date_end))
  const [deadline, setDeadline] = useState(safeDate(initialData.deadline || initialData.dueDate))
  const [priority, setPriority] = useState(initialData.priority ?? initialData.priority_level ?? 'normal')
  const [goalId, setGoalId] = useState(initialData.goalId || initialData.goal || '')
  const [completed, setCompleted] = useState(initialData.completed || false)
  const [taskId, setTaskId] = useState(initialData.taskId || initialData.task_id || initialData.task || '')
  const [keyAreaId, setKeyAreaId] = useState(initialData.keyAreaId || initialData.key_area_id || initialData.keyArea || initialData.key_area || '')
  const [listIndex, setListIndex] = useState(initialData.list || initialData.list_index || (availableLists && availableLists[0]) || 1)
  // localAvailableLists are populated when a key area is selected so the List
  // dropdown doesn't auto-fill until the user chooses a key area.
  const [localAvailableLists, setLocalAvailableLists] = useState(Array.isArray(availableLists) ? availableLists : [1])
  // map of list number => display name for the currently selected key area
  const [localListNames, setLocalListNames] = useState({})
  const [assignee, setAssignee] = useState(initialData.assignee || initialData.responsible || '')
  const [duration, setDuration] = useState(initialData.duration || '')
  const [keyAreaError, setKeyAreaError] = useState('')

  const startRef = useRef(null)
  const endRef = useRef(null)
  const deadlineRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    setTitle(initialData.text || '')
    setDescription(initialData.description || '')
  setStartDate(safeDate(initialData.startDate || initialData.date_start))
  const nextEnd = safeDate(initialData.endDate || initialData.date_end)
  setEndDate(nextEnd)
  // If initial data provides an explicit end date, disable auto-sync; otherwise keep auto-sync enabled
  setEndAuto(!Boolean(initialData.endDate || initialData.date_end))
    setDeadline(safeDate(initialData.deadline || initialData.dueDate))
    setPriority(initialData.priority ?? initialData.priority_level ?? 'normal')
    setGoalId(initialData.goalId || initialData.goal || '')
    setCompleted(initialData.completed || false)
    setTaskId(initialData.taskId || initialData.task_id || initialData.task || '')
    setKeyAreaId(initialData.keyAreaId || initialData.key_area_id || initialData.keyArea || initialData.key_area || '')
    // Only prefill listIndex when the caller explicitly provided one; otherwise leave empty
    setListIndex(initialData.list || initialData.list_index || '')
    setAssignee(initialData.assignee || initialData.responsible || '')
    setDuration(initialData.duration || '')
  }, [isOpen, initialData])

  // When the selected key area changes, populate the available lists for that area
  useEffect(() => {
    try {
      if (!keyAreaId) {
        setLocalAvailableLists(Array.isArray(availableLists) ? availableLists : [1])
        return
      }
      const selected = (keyAreas || []).find((k) => String(k.id) === String(keyAreaId))
      if (selected) {
        // If the key area provides listNames, use those keys. Otherwise use list_count
        if (selected.listNames && Object.keys(selected.listNames).length) {
          // selected.listNames is expected to be an object like { "1": "Inbox", "2": "Doing" }
          const nums = Object.keys(selected.listNames).map((n) => Number(n)).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b)
          setLocalAvailableLists(nums.length ? nums : (Array.isArray(availableLists) ? availableLists : [1]))
          setLocalListNames(Object.keys(selected.listNames).reduce((acc, k) => {
            const num = Number(k)
            if (!Number.isNaN(num)) acc[num] = selected.listNames[k]
            else acc[k] = selected.listNames[k]
            return acc
          }, {}))
        } else if (selected.list_count && Number.isFinite(Number(selected.list_count))) {
          const count = Number(selected.list_count) || 1
          setLocalAvailableLists(Array.from({ length: Math.max(1, count) }, (_, i) => i + 1))
          setLocalListNames({})
        } else {
          setLocalAvailableLists(Array.isArray(availableLists) ? availableLists : [1])
          setLocalListNames({})
        }
        // If the previously selected listIndex doesn't belong to the new area, clear it so user must choose
        if (listIndex && !String((selected.list_index || selected.list || '').length ? listIndex : listIndex)) {
          // keep current listIndex if it exists in new options
          if (!localAvailableLists.includes(Number(listIndex))) setListIndex('')
        }
      } else {
        setLocalAvailableLists(Array.isArray(availableLists) ? availableLists : [1])
        setLocalListNames({})
      }
    } catch (e) {
      setLocalAvailableLists(Array.isArray(availableLists) ? availableLists : [1])
      setLocalListNames({})
    }
  }, [keyAreaId, keyAreas, availableLists])

  // Filter tasks to those belonging to the selected key area and selected list.
  // The Task dropdown will remain empty until the user picks both a Key Area
  // and a List (the UX you requested).
  const filteredTasks = React.useMemo(() => {
    try {
      if (!keyAreaId) return []
      // require list selection to show tasks for that list only
      if (!listIndex) return []
      return (tasks || []).filter((t) => {
        const taskKA = String(t.key_area_id || t.keyAreaId || t.keyArea || '')
        if (taskKA !== String(keyAreaId)) return false
        const tList = String(t.list || t.list_index || t.listIndex || t.parent_list || '')
        return String(tList) === String(listIndex)
      })
    } catch (e) { return [] }
  }, [tasks, keyAreaId, listIndex])

  // If the currently selected taskId no longer exists in the filtered set (for
  // example because the user changed the Key Area or List), clear the selection
  // so the user must explicitly pick a task that belongs to the chosen list.
  useEffect(() => {
    try {
      if (!taskId) return
      const exists = (filteredTasks || []).some((t) => String(t.id) === String(taskId))
      if (!exists) setTaskId('')
    } catch (e) { /* ignore */ }
  }, [filteredTasks, taskId])

  const handleSave = () => {
    // Require a Key Area before creating an activity
    if (!keyAreaId) {
      setKeyAreaError('Please select a Key Area before creating an activity')
      try { document.querySelector('select[name="key_area_id"]')?.focus?.(); } catch (__) {}
      return
    }
    const payload = {
      text: (title || '').trim(),
      priority: priority || undefined,
      keyAreaId: keyAreaId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      deadline: deadline || undefined,
      goalId: goalId || undefined,
      completed: typeof completed === 'boolean' ? completed : undefined,
      taskId: taskId || undefined,
      listIndex: listIndex || undefined,
      assignee: assignee || undefined,
      duration: duration || undefined,
    }
    onSave && onSave(payload)
  }

  useEffect(() => {
    if (keyAreaId) setKeyAreaError('')
  }, [keyAreaId])

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50'
  const dateCls = `${inputCls} appearance-none pr-11 no-calendar`
  const selectCls = `${inputCls} appearance-none pr-10`

  return (
    <Modal open={isOpen} onClose={onCancel}>
      <div className="relative z-10 w-[640px] max-w-[95vw] rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="relative px-5 py-2 border-b border-slate-200 text-center font-semibold text-slate-900">Add Activity</div>
        <form className="px-4 pb-4 pt-2" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div className="mb-3">
          <label className="text-sm font-medium text-slate-700 mb-0 block" htmlFor="ka-activity-title">Activity name</label>
          <input
            id="ka-activity-title"
            required
            name="title"
            className={`${inputCls} mt-0 h-9 text-sm`}
            placeholder="Activity name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="grid grid-rows-6 gap-2">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <input
                name="description"
                className={`${inputCls} mt-0 h-9 text-sm`}
                placeholder="Brief description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">Start date</label>
              <div className="relative mt-0">
                <input
                  name="start_date"
                  type="date"
                  className={`${dateCls} h-9 pr-10 pl-3 text-sm hide-native-date-icon`}
                  value={startDate}
                    onChange={(e) => {
                      const v = e.target.value
                      setStartDate(v)
                      // auto-fill end date to match start if end is still auto-synced
                      try { if (endAuto) setEndDate(v) } catch (__) {}
                    }}
                  ref={startRef}
                />
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Open date picker"
                  className="absolute inset-y-0 right-2 grid place-items-center text-sm cursor-pointer select-none"
                  onClick={() => { try { startRef.current?.showPicker?.(); startRef.current?.focus(); } catch (__) {} }}
                >📅</span>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">End date</label>
              <div className="relative mt-0">
                <input
                  name="end_date"
                  type="date"
                  className={`${dateCls} h-9 pr-10 pl-3 text-sm hide-native-date-icon`}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    // user manually changed end date -> disable auto-sync
                    try { setEndAuto(false) } catch (__) {}
                  }}
                  ref={endRef}
                />
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Open date picker"
                  className="absolute inset-y-0 right-2 grid place-items-center text-sm cursor-pointer select-none"
                  onClick={() => { try { endRef.current?.showPicker?.(); endRef.current?.focus(); } catch (__) {} }}
                >📅</span>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">Deadline</label>
              <div className="relative mt-0">
                <input
                  name="deadline"
                  type="date"
                  className={`${dateCls} h-9 pr-10 pl-3 text-sm hide-native-date-icon`}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  ref={deadlineRef}
                />
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Open date picker"
                  className="absolute inset-y-0 right-2 grid place-items-center text-sm cursor-pointer select-none"
                  onClick={() => { try { deadlineRef.current?.showPicker?.(); deadlineRef.current?.focus(); } catch (__) {} }}
                >📅</span>
              </div>
              <p className="mt-0 text-xs text-slate-500">No later than</p>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">Duration</label>
              <div className="relative mt-0">
                    <input
                      name="duration"
                      className={`${inputCls} h-9 pr-3 pl-3 text-sm`}
                      placeholder="e.g., 1h, 1d"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
              </div>
            </div>
            {/* spacer to align with right column's extra 'Goal' row */}
            <div aria-hidden="true" />
          </div>

          <div className="grid grid-rows-6 gap-2 content-start">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">Key Area</label>
              <div className="relative mt-0">
                <select name="key_area_id" className={`${selectCls} mt-0 h-9`} value={keyAreaId} onChange={(e) => setKeyAreaId(e.target.value)}>
                  <option value="">— Select Key Area —</option>
                  {keyAreas.map((ka) => (<option key={ka.id} value={ka.id}>{ka.title || ka.name}</option>))}
                </select>
                <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
              {keyAreaError ? (<p className="mt-1 text-xs text-red-600">{keyAreaError}</p>) : null}
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">List</label>
              <div className="relative mt-0">
                <select name="list_index" className={`${selectCls} mt-0 h-9`} value={listIndex} onChange={(e) => setListIndex(e.target.value)} disabled={!keyAreaId}>
                  {!keyAreaId ? (<option value="">— Select Key Area first —</option>) : (<option value="">— Select List —</option>)}
                  {keyAreaId && localAvailableLists.map((n) => {
                    const label = (localListNames && localListNames[n]) || (normalizedParentListNames && (normalizedParentListNames[n] || normalizedParentListNames[String(n)])) || (parentListNames && parentListNames[n]) || `List ${n}`;
                    return (<option key={n} value={n}>{label}</option>);
                  })}
                </select>
                <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">Task</label>
              <div className="relative mt-0">
                <select name="task_id" className={`${selectCls} mt-0 h-9`} value={taskId} onChange={(e) => setTaskId(e.target.value)} disabled={!keyAreaId || !listIndex}>
                  {!keyAreaId ? (<option value="">— Select Key Area first —</option>) : (!listIndex ? (<option value="">— Select List first —</option>) : (<option value="">— Select Task —</option>))}
                  {keyAreaId && listIndex && filteredTasks.map((t) => {
                    const label = t.title || t.name || t.activity_name || t.text || String(t.id);
                    return (<option key={t.id} value={t.id}>{label}</option>);
                  })}
                </select>
                <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">Assignee</label>
              <div className="relative mt-0">
                <select name="assignee" className={`${selectCls} mt-0 h-9`} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                  <option value="">— Unassigned —</option>
                  <option value="Me">Me</option>
                </select>
                <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">Priority</label>
              <div className="relative mt-0">
                <select name="priority" className={`${selectCls} mt-0 h-9`} value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
                <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-700">Goal</label>
              <div className="relative mt-0">
                <select name="goal" className={`${selectCls} mt-0 h-9`} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                  <option value="">— Select Goal —</option>
                  {goals.map((g) => (<option key={g.id} value={g.id}>{g.title}</option>))}
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
        <button type="button" className="absolute top-2 right-2 p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100" aria-label="Close" onClick={onCancel}>
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>
        </button>
      </div>
    </Modal>
  )
}