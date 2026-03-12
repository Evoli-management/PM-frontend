import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TaskFormFields from './TaskFormFields.jsx';
import TaskFormModalShell from './TaskFormModalShell.jsx';
import { durationToTimeInputValue } from '../../utils/duration';
import { buildCreateTaskPayload } from './taskFormLogic.js';
import {
  safeDate,
  useTaskDateHandlers,
  useTaskFormResources,
  useTaskFormState,
  useTaskMemberMenus,
  validateTaskDateRange,
  validateTaskDuration,
} from './taskFormShared.js';

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
  parentListNames = null,
  isDontForgetMode = false,
  currentUserId = null,
}) {
  const { t } = useTranslation();
  const [resolvedCurrentUserId, setResolvedCurrentUserId] = useState(currentUserId || null);

  const startRef = useRef(null);
  const endRef = useRef(null);
  const deadlineRef = useRef(null);
  const currentUserIdRef = useRef(false);
  const {
    title,
    setTitle,
    description,
    setDescription,
    assignee,
    setAssignee,
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
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
      assignee: initialData.assignee || '',
      startDate: safeDate(initialData.start_date || initialData.startDate || initialData.date) || '',
      startTime: initialData.start_time || initialData.startTime || initialData.time || '',
      endDate: safeDate(initialData.end_date || initialData.endDate || initialData.date) || '',
      endTime: initialData.end_time || initialData.endTime || '',
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
    if (!isOpen) return;
    setOpenMembersRole(null);
  }, [isOpen, setOpenMembersRole]);

  useEffect(() => {
    if (!isOpen || resolvedCurrentUserId) return;
    if (currentUserIdRef.current) return;
    currentUserIdRef.current = true;

    let ignore = false;
    (async () => {
      try {
        const mod = await import('../../services/userProfileService');
        const service = mod?.default || mod;
        const profile = await service?.getProfile?.();
        if (!ignore && profile?.id) setResolvedCurrentUserId(profile.id);
      } catch {
        // ignore: assignment still works, only "Me" label resolution is affected
      }
    })();

    return () => {
      ignore = true;
    };
  }, [isOpen, resolvedCurrentUserId]);

  useEffect(() => {
    if (!isOpen || !deadlineAuto || !endDate) return;
    if (deadline !== endDate) setDeadline(endDate);
  }, [isOpen, endDate, deadline, deadlineAuto]);

  const selectedKeyArea = (localKeyAreas.length ? localKeyAreas : keyAreas).find((area) => String(area.id) === String(keyAreaId));
  const isDontForgetKeyArea = !!(selectedKeyArea && String(selectedKeyArea.title || selectedKeyArea.name || '').toLowerCase().match(/dont'?\s*forget/));
  const finalIsDontForget = !!(isDontForgetMode || isDontForgetKeyArea);
  const effectiveListIndex = finalIsDontForget && !keyAreaId ? undefined : listIndex;

  const handleSave = () => {
    const dateValidation = validateTaskDateRange(startDate, endDate);
    if (!dateValidation.valid) return;

    const durationValidation = validateTaskDuration(duration);
    if (!durationValidation.valid) return;

    const payload = buildCreateTaskPayload({
      title,
      description,
      startDate,
      startTime,
      endDate,
      endTime,
      deadline,
      duration,
      priority,
      status,
      keyAreaId,
      listIndex: effectiveListIndex,
      goal,
      tags,
      assignee,
      consultedIds,
      informedIds,
      usersList,
      currentUserId: resolvedCurrentUserId,
    });

    if (onSave) onSave(payload);
  };
  const taskTitle = finalIsDontForget ? t('createTaskModal.createDontForget') : t('createTaskModal.modalTitle', 'Task');
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
        form="create-task-form"
        disabled={isSaving}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
      >
        {t('createTaskModal.save')}
      </button>
    </>
  );

  return (
    <TaskFormModalShell
      isOpen={isOpen}
      title={taskTitle}
      onClose={onCancel}
      closeOnOverlayClick={false}
      formId="create-task-form"
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
      footerEnd={footerEnd}
    >
          <TaskFormFields
            isDontForgetMode={finalIsDontForget}
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
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onKeyAreaChange={setKeyAreaId}
            onListIndexChange={setListIndex}
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
