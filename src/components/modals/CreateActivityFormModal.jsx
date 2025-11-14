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
}) {
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
  const [deadline, setDeadline] = useState(safeDate(initialData.deadline || initialData.dueDate))
  const [priority, setPriority] = useState(initialData.priority ?? initialData.priority_level ?? 'normal')
  const [goalId, setGoalId] = useState(initialData.goalId || initialData.goal || '')
  const [completed, setCompleted] = useState(initialData.completed || false)
  const [taskId, setTaskId] = useState(initialData.taskId || initialData.task_id || initialData.task || '')
  const [keyAreaId, setKeyAreaId] = useState(initialData.keyAreaId || initialData.key_area_id || initialData.keyArea || initialData.key_area || '')
  const [listIndex, setListIndex] = useState(initialData.list || initialData.list_index || (availableLists && availableLists[0]) || 1)
  const [assignee, setAssignee] = useState(initialData.assignee || initialData.responsible || '')
  const [duration, setDuration] = useState(initialData.duration || '')

  const startRef = useRef(null)
  const endRef = useRef(null)
  const deadlineRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    setTitle(initialData.text || '')
    setDescription(initialData.description || '')
    setStartDate(safeDate(initialData.startDate || initialData.date_start))
    setEndDate(safeDate(initialData.endDate || initialData.date_end))
    setDeadline(safeDate(initialData.deadline || initialData.dueDate))
    setPriority(initialData.priority ?? initialData.priority_level ?? 'normal')
    setGoalId(initialData.goalId || initialData.goal || '')
    setCompleted(initialData.completed || false)
    setTaskId(initialData.taskId || initialData.task_id || initialData.task || '')
    setKeyAreaId(initialData.keyAreaId || initialData.key_area_id || initialData.keyArea || initialData.key_area || '')
    setListIndex(initialData.list || initialData.list_index || (availableLists && availableLists[0]) || 1)
    setAssignee(initialData.assignee || initialData.responsible || '')
    setDuration(initialData.duration || '')
  }, [isOpen, initialData])

  const handleSave = () => {
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

  const inputCls =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100'
  const dateCls = `${inputCls} appearance-none pr-11 no-calendar`
  const selectCls = `${inputCls} appearance-none pr-10`

  return (
    <Modal open={isOpen} onClose={onCancel}>
      <div className="relative bg-white border border-slate-300 rounded-xl shadow-2xl w-[95vw] max-w-4xl overflow-hidden">
        <div className="bg-white text-slate-900 border-b border-slate-200 py-3 px-4 text-center font-semibold">Add Activity</div>
        <form className="p-4 md:p-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-700 mb-1 block" htmlFor="ka-activity-title">Activity name</label>
          <input
            id="ka-activity-title"
            required
            name="title"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Activity name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="grid gap-3 content-start">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <input
                name="description"
                className="mt-1 h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700">Start date</label>
              <div className="relative mt-1">
                <input
                  name="start_date"
                  type="date"
                  className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  ref={startRef}
                />
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Open date picker"
                  className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                  onClick={() => { try { startRef.current?.showPicker?.(); startRef.current?.focus(); } catch (__) {} }}
                >📅</span>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700">End date</label>
              <div className="relative mt-1">
                <input
                  name="end_date"
                  type="date"
                  className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  ref={endRef}
                />
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Open date picker"
                  className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                  onClick={() => { try { endRef.current?.showPicker?.(); endRef.current?.focus(); } catch (__) {} }}
                >📅</span>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700">Deadline</label>
              <div className="relative mt-1">
                <input
                  name="deadline"
                  type="date"
                  className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hide-native-date-icon"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  ref={deadlineRef}
                />
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Open date picker"
                  className="absolute inset-y-0 right-2 grid place-items-center text-base cursor-pointer select-none"
                  onClick={() => { try { deadlineRef.current?.showPicker?.(); deadlineRef.current?.focus(); } catch (__) {} }}
                >📅</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">No later than</p>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700">Duration</label>
              <div className="relative mt-1">
                    <input
                      name="duration"
                      className="h-9 w-full rounded-md border border-slate-300 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 1h, 1d"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                <span className="absolute inset-y-0 right-2 grid place-items-center text-base">📅</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 content-start">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700">Key Area</label>
              <select name="key_area_id" className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={keyAreaId} onChange={(e) => setKeyAreaId(e.target.value)}>
                <option value="">— Select Key Area —</option>
                {keyAreas.map((ka) => (<option key={ka.id} value={ka.id}>{ka.title || ka.name}</option>))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700">List</label>
              <select name="list_index" className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={listIndex} onChange={(e) => setListIndex(Number(e.target.value))}>
                {availableLists.map((n) => (<option key={n} value={n}>List {n}</option>))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700">Task</label>
              <select name="task_id" className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">— Select Task —</option>
                {tasks.map((t) => (<option key={t.id} value={t.id}>{t.title}</option>))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700">Assignee</label>
              <select name="assignee" className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">— Unassigned —</option>
                <option value="Me">Me</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700">Priority</label>
              <select name="priority" className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700">Goal</label>
              <select name="goal" className="mt-1 h-10 rounded-md border border-slate-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                <option value="">— Select Goal —</option>
                {goals.map((g) => (<option key={g.id} value={g.id}>{g.title}</option>))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span />
          <div className="flex items-center gap-2">
            <button type="submit" className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-4 py-2 text-sm">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM224 416c-35.346 0-64-28.654-64-64 0-35.346 28.654-64 64-64s64 28.654 64 64c0 35.346-28.654 64-64 64zm96-304.52V212c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h228.52c3.183 0 6.235 1.264 8.485 3.515l3.48 3.48A11.996 11.996 0 0 1 320 111.48z"></path></svg>
              OK
            </button>
            <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={onCancel}>Cancel</button>
            <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50" disabled>Help</button>
          </div>
        </div>
        </form>
        <button type="button" className="absolute top-2 right-2 p-2 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100" aria-label="Close" onClick={onCancel}>
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>
        </button>
      </div>
    </Modal>
  )
}