import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSave, FaTrash } from 'react-icons/fa';
import taskService from '../../services/taskService';
import TaskFormFields from './TaskFormFields.jsx';
import TaskFormModalShell from './TaskFormModalShell.jsx';
import { durationToTimeInputValue } from '../../utils/duration';
import { buildEditTaskPayload, resolveAssigneeSelectValue } from './taskFormLogic.js';
import {
  safeDate,
  useTaskDateHandlers,
  useTaskFormResources,
  useTaskFormState,
  useTaskMemberMenus,
  validateTaskDateRange,
  validateTaskDuration,
} from './taskFormShared.js';

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
  const [keyAreaError, setKeyAreaError] = useState('');
  const [listError, setListError] = useState('');

  const startRef = useRef(null);
  const endRef = useRef(null);
  const deadlineRef = useRef(null);
  const currentTaskId = initialData.id || initialData.taskId || initialData.task_id || initialData._id || null;
  const {
    title,
    setTitle,
    description,
    setDescription,
    assignee,
    setAssignee,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    endAuto,
    setEndAuto,
    deadline,
    setDeadline,
    deadlineAuto,
    setDeadlineAuto,
    duration,
    setDuration,
    priority,
    setPriority,
    status,
    setStatus,
    keyAreaId,
    setKeyAreaId,
    listIndex,
    setListIndex,
    goal,
    setGoal,
    tags,
    setTags,
    consultedIds,
    setConsultedIds,
    informedIds,
    setInformedIds,
  } = useTaskFormState({
    isOpen,
    resetSignal: initialData,
    buildInitialValues: () => ({
      title: initialData.title || '',
      description: initialData.description || '',
      assignee: resolveAssigneeSelectValue(initialData, users, currentUserId),
      startDate: safeDate(initialData.start_date || initialData.startDate) || '',
      endDate: safeDate(initialData.end_date || initialData.endDate) || '',
      endAuto: !(initialData.end_date || initialData.endDate),
      deadline: safeDate(initialData.deadline || initialData.dueDate),
      deadlineAuto: true,
      duration: durationToTimeInputValue(initialData.duration || initialData.duration_minutes || ''),
      priority: initialData.priority ?? initialData.priority_level ?? 2,
      status: initialData.status || initialData.state || 'open',
      keyAreaId: initialData.key_area_id || initialData.keyAreaId || '',
      listIndex:
        isDontForgetMode && !(initialData.key_area_id || initialData.keyAreaId)
          ? ''
          : (initialData.list || initialData.list_index || (availableLists && availableLists[0]) || 1),
      goal: initialData.goalId || initialData.goal_id || initialData.goal || '',
      tags: initialData.tags || '',
      consultedIds: initialData.consulted,
      informedIds: initialData.informed,
    }),
  });
  const { usersList, localKeyAreas, allTasks, listNames, localGoals } = useTaskFormResources({
    isOpen,
    users,
    keyAreas,
    goals,
    keyAreaId,
    listIndex,
    setListIndex,
    availableLists,
    parentListNames,
    isDontForgetMode,
    initialGoal: {
      id: initialData.goal || initialData.goal_id || initialData.goalId || null,
      title: initialData.goalTitle || initialData.goal_name || initialData.goalName || 'Current goal',
    },
  });
  const {
    openMembersRole,
    setOpenMembersRole,
    membersMenuRefs,
    toggleLocalMember,
    formatMemberSummary,
  } = useTaskMemberMenus({
    isOpen,
    usersList,
    setConsultedIds,
    setInformedIds,
  });
  const {
    handleStartDateChange,
    handleEndDateChange,
    handleDeadlineChange,
  } = useTaskDateHandlers({
    startDate,
    endDate,
    deadline,
    endAuto,
    deadlineAuto,
    setStartDate,
    setEndDate,
    setEndAuto,
    setDeadline,
    setDeadlineAuto,
  });

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (!isOpen) return;
    setOpenMembersRole(null);
  }, [isOpen, setOpenMembersRole]);

  useEffect(() => {
    if (!isOpen) return;
    if (assignee) return;
    const fallbackTask = currentTaskId
      ? (allTasks || []).find((task) => String(task.id || task.taskId || task.task_id || task._id) === String(currentTaskId))
      : null;
    const nextAssignee = resolveAssigneeSelectValue(initialData, usersList, currentUserId, fallbackTask);
    if (nextAssignee) setAssignee(nextAssignee);
  }, [isOpen, assignee, initialData, usersList, currentUserId, allTasks, currentTaskId]);

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

  const effectiveListIndex = isDontForgetMode && !keyAreaId ? undefined : listIndex;


  const handleSave = () => {
    const dateValidation = validateTaskDateRange(startDate, endDate);
    if (!dateValidation.valid) return;

    const durationValidation = validateTaskDuration(duration);
    if (!durationValidation.valid) return;

    // Validate required fields
    if (!keyAreaId && !isDontForgetMode) {
      setKeyAreaError(t("editTaskModal.keyAreaRequired"));
      try { document.querySelector('select[name="key_area_id"]')?.focus?.(); } catch (_) {}
      return;
    }
    if ((!isDontForgetMode || keyAreaId) && !listIndex) {
      setListError(t("editTaskModal.listRequired"));
      try { document.querySelector('select[name="list_index"]')?.focus?.(); } catch (_) {}
      return;
    }

    const payload = buildEditTaskPayload({
      initialData,
      title,
      description,
      startDate,
      endDate,
      deadline,
      duration,
      priority,
      status,
      keyAreaId,
      listIndex: effectiveListIndex,
      goal,
      tags,
      assignee,
      usersList,
      currentUserId,
    });
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

  const taskTitle = modalTitle || t('editTaskModal.title');
  const showField = (field) => !Array.isArray(visibleFields) || visibleFields.length === 0 || visibleFields.includes(field);
  const showDeleteButton = Boolean(currentTaskId) && (!Array.isArray(visibleFields) || visibleFields.length === 0);
  const footerStart = showDeleteButton ? (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-1 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
      onClick={handleDelete}
    >
      <FaTrash className="text-xs" />
      {t('taskFullView.delete')}
    </button>
  ) : null;
  const footerEnd = (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-1 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
        onClick={onCancel}
      >
        {t('createTaskModal.cancel', 'Cancel')}
      </button>
      <button
        type="submit"
        form="edit-task-form"
        disabled={isSaving}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
      >
        <FaSave className="text-xs" />
        {t('createTaskModal.save')}
      </button>
    </>
  );

  return (
    <TaskFormModalShell
      isOpen={isOpen}
      title={taskTitle}
      onClose={onCancel}
      formId="edit-task-form"
      onSubmit={onSubmit}
      footerStart={footerStart}
      footerEnd={footerEnd}
    >
          <TaskFormFields
            showField={showField}
            isDontForgetMode={isDontForgetMode}
            values={{
              title,
              description,
              keyAreaId,
              listIndex: effectiveListIndex,
              startDate,
              endDate,
              deadline,
              priority,
              duration,
              goal,
              status,
              tags,
              assignee,
              consultedIds,
              informedIds,
            }}
            usersList={usersList}
            localKeyAreas={localKeyAreas}
            keyAreas={keyAreas}
            localGoals={localGoals}
            goals={goals}
            allTasks={allTasks}
            listNames={listNames}
            availableLists={availableLists}
            parentListNames={parentListNames}
            startRef={startRef}
            endRef={endRef}
            deadlineRef={deadlineRef}
            membersMenuRefs={membersMenuRefs}
            openMembersRole={openMembersRole}
            setOpenMembersRole={setOpenMembersRole}
            toggleLocalMember={toggleLocalMember}
            formatMemberSummary={formatMemberSummary}
            keyAreaError={keyAreaError}
            listError={listError}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onKeyAreaChange={(value) => {
              setKeyAreaId(value);
              setKeyAreaError('');
            }}
            onListIndexChange={(value) => {
              setListIndex(value);
              setListError('');
            }}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onDeadlineChange={handleDeadlineChange}
            onPriorityChange={setPriority}
            onDurationChange={setDuration}
            onGoalChange={setGoal}
            onStatusChange={setStatus}
            onTagsChange={setTags}
            onAssigneeChange={setAssignee}
          />
    </TaskFormModalShell>
  );
}
