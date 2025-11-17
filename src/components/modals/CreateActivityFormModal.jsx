import React, { useEffect, useState } from 'react'
import { Modal, FormField, Input, Select, DateInput, Button } from '../shared/primitives'
import { Save, Calendar } from 'lucide-react'

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

  const priorityOptions = [
    { value: 'high', label: 'High' },
    { value: 'normal', label: 'Normal' },
    { value: 'low', label: 'Low' }
  ]

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onCancel} 
      title="Add Activity"
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
            Save Activity
          </Button>
        </div>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
        <FormField label="Activity name" required>
          <Input
            required
            placeholder="Activity name"
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

          <FormField label="Key Area" required error={keyAreaError}>
            <Select
              value={keyAreaId}
              onChange={(e) => setKeyAreaId(e.target.value)}
              placeholder="— Select Key Area —"
              options={keyAreas.map(ka => ({ value: ka.id, label: ka.title || ka.name }))}
              disabled={isSaving}
              error={!!keyAreaError}
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
              onChange={(e) => setListIndex(e.target.value)}
              placeholder={!keyAreaId ? "— Select Key Area first —" : "— Select List —"}
              options={keyAreaId ? localAvailableLists.map(n => {
                const label = (localListNames && localListNames[n]) || (normalizedParentListNames && (normalizedParentListNames[n] || normalizedParentListNames[String(n)])) || (parentListNames && parentListNames[n]) || `List ${n}`;
                return { value: n, label };
              }) : []}
              disabled={!keyAreaId || isSaving}
            />
          </FormField>

          <FormField label="Task">
            <Select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder={!keyAreaId ? "— Select Key Area first —" : (!listIndex ? "— Select List first —" : "— Select Task —")}
              options={keyAreaId && listIndex ? filteredTasks.map(t => ({
                value: t.id,
                label: t.title || t.name || t.activity_name || t.text || String(t.id)
              })) : []}
              disabled={!keyAreaId || !listIndex || isSaving}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Priority">
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={priorityOptions}
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Assignee">
            <Select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="— Unassigned —"
              options={[{ value: 'Me', label: 'Me' }]}
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

        <FormField label="Goal">
          <Select
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            placeholder="— Select Goal —"
            options={goals.map(g => ({ value: g.id, label: g.title }))}
            disabled={isSaving}
          />
        </FormField>
      </form>
    </Modal>
  )
}