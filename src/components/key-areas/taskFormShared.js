import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import usersService from '../../services/usersService';
import {
  safeDate,
  normalizeMemberIds,
  validateTaskDateRange,
  validateTaskDuration,
  validateTaskDeadline,
  getTaskStartDatePatch,
  getTaskEndDatePatch,
  getTaskDeadlinePatch,
} from './taskFormLogic.js';

const idsOf = (arr = []) => (Array.isArray(arr) ? arr.map((item) => String(item && item.id)).join(',') : '');

const hasSameListNames = (a, b) => {
  const aObj = a && typeof a === 'object' ? a : {};
  const bObj = b && typeof b === 'object' ? b : {};
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => String(aObj[key] ?? '') === String(bObj[key] ?? ''));
};

const userIdsOf = (arr = []) => (Array.isArray(arr) ? arr.map((item) => String(item && item.id)).join(',') : '');

const mergeUsersById = (...groups) => {
  const map = new Map();
  groups.flat().filter(Boolean).forEach((user) => {
    if (!user?.id) return;
    map.set(String(user.id), user);
  });
  return Array.from(map.values());
};

export {
  safeDate,
  normalizeMemberIds,
  validateTaskDateRange,
  validateTaskDuration,
  validateTaskDeadline,
  getTaskStartDatePatch,
  getTaskEndDatePatch,
  getTaskDeadlinePatch,
};

export function useTaskFormState({
  isOpen,
  resetSignal,
  buildInitialValues,
}) {
  const buildInitialValuesRef = useRef(buildInitialValues);
  buildInitialValuesRef.current = buildInitialValues;

  const initialValuesRef = useRef(null);
  if (!initialValuesRef.current) {
    initialValuesRef.current = buildInitialValues();
  }

  const initialValues = initialValuesRef.current;

  const [title, setTitle] = useState(initialValues.title || '');
  const [description, setDescription] = useState(initialValues.description || '');
  const [assignee, setAssignee] = useState(initialValues.assignee || '');
  const [startDate, setStartDate] = useState(initialValues.startDate || '');
  const [startTime, setStartTime] = useState(initialValues.startTime || '');
  const [endDate, setEndDate] = useState(initialValues.endDate || '');
  const [endTime, setEndTime] = useState(initialValues.endTime || '');
  const [endAuto, setEndAuto] = useState(initialValues.endAuto ?? true);
  const [deadline, setDeadline] = useState(initialValues.deadline || '');
  const [deadlineAuto, setDeadlineAuto] = useState(initialValues.deadlineAuto ?? true);
  const [duration, setDuration] = useState(initialValues.duration || '');
  const [priority, setPriority] = useState(initialValues.priority ?? 2);
  const [status, setStatus] = useState(initialValues.status || 'open');
  const [keyAreaId, setKeyAreaId] = useState(initialValues.keyAreaId || '');
  const [listIndex, setListIndex] = useState(initialValues.listIndex ?? '');
  const [goal, setGoal] = useState(initialValues.goal || '');
  const [tags, setTags] = useState(initialValues.tags || '');
  const [consultedIds, setConsultedIds] = useState(normalizeMemberIds(initialValues.consultedIds));
  const [informedIds, setInformedIds] = useState(normalizeMemberIds(initialValues.informedIds));

  useEffect(() => {
    if (!isOpen) return;
    const next = buildInitialValuesRef.current();
    setTitle(next.title || '');
    setDescription(next.description || '');
    setAssignee(next.assignee || '');
    setStartDate(next.startDate || '');
    setStartTime(next.startTime || '');
    setEndDate(next.endDate || '');
    setEndTime(next.endTime || '');
    setEndAuto(next.endAuto ?? true);
    setDeadline(next.deadline || '');
    setDeadlineAuto(next.deadlineAuto ?? true);
    setDuration(next.duration || '');
    setPriority(next.priority ?? 2);
    setStatus(next.status || 'open');
    setKeyAreaId(next.keyAreaId || '');
    setListIndex(next.listIndex ?? '');
    setGoal(next.goal || '');
    setTags(next.tags || '');
    setConsultedIds(normalizeMemberIds(next.consultedIds));
    setInformedIds(normalizeMemberIds(next.informedIds));
  }, [isOpen, resetSignal]);

  return {
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
  };
}

export function useTaskDateHandlers({
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
}) {
  const handleStartDateChange = useCallback((value) => {
    const patch = getTaskStartDatePatch({
      startDate,
      endDate,
      deadline,
      endAuto,
      deadlineAuto,
    }, value);
    setStartDate(patch.startDate);
    if (Object.prototype.hasOwnProperty.call(patch, 'endDate')) setEndDate(patch.endDate);
    if (Object.prototype.hasOwnProperty.call(patch, 'deadline')) setDeadline(patch.deadline);
  }, [
    deadline,
    deadlineAuto,
    endAuto,
    endDate,
    setDeadline,
    setEndDate,
    setStartDate,
    startDate,
  ]);

  const handleEndDateChange = useCallback((value) => {
    const patch = getTaskEndDatePatch({ startDate }, value);
    setEndDate(patch.endDate);
    setEndAuto(patch.endAuto);
    if (Object.prototype.hasOwnProperty.call(patch, 'deadline')) setDeadline(patch.deadline);
    if (Object.prototype.hasOwnProperty.call(patch, 'startDate')) setStartDate(patch.startDate);
  }, [setEndDate, setEndAuto, setDeadline, setStartDate, startDate]);

  const handleDeadlineChange = useCallback((value) => {
    const patch = getTaskDeadlinePatch(value);
    setDeadline(patch.deadline);
    setDeadlineAuto(patch.deadlineAuto);
  }, [setDeadline, setDeadlineAuto]);

  return {
    handleStartDateChange,
    handleEndDateChange,
    handleDeadlineChange,
  };
}

export function useTaskMemberMenus({
  isOpen,
  usersList = [],
  setConsultedIds,
  setInformedIds,
}) {
  const { t } = useTranslation();
  const [openMembersRole, setOpenMembersRole] = useState(null);
  const membersMenuRefs = useRef({});

  useEffect(() => {
    if (!isOpen || !openMembersRole) return undefined;

    const handlePointerDown = (event) => {
      const menu = membersMenuRefs.current?.[openMembersRole];
      if (menu && !menu.contains(event.target)) {
        setOpenMembersRole(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpenMembersRole(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, openMembersRole]);

  const toggleLocalMember = useCallback((role, memberId) => {
    const setter = role === 'consulted' ? setConsultedIds : setInformedIds;
    setter((prev) => (
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    ));
  }, [setConsultedIds, setInformedIds]);

  const formatMemberSummary = useCallback((memberIds) => {
    const selectedMembers = (usersList || []).filter((user) => memberIds.includes(String(user.id)));
    if (selectedMembers.length === 0) return t('createTaskModal.selectMembers');
    if (selectedMembers.length <= 2) return selectedMembers.map((user) => user.name).join(', ');
    return `${selectedMembers[0].name}, ${selectedMembers[1].name} +${selectedMembers.length - 2}`;
  }, [t, usersList]);

  return {
    openMembersRole,
    setOpenMembersRole,
    membersMenuRefs,
    toggleLocalMember,
    formatMemberSummary,
  };
}

export function useTaskFormResources({
  isOpen,
  users = [],
  keyAreas = [],
  goals = [],
  keyAreaId,
  listIndex,
  setListIndex,
  availableLists = [1],
  parentListNames = null,
  initialGoal = null,
  isDontForgetMode = false,
}) {
  const [usersList, setUsersList] = useState(users || []);
  const [localKeyAreas, setLocalKeyAreas] = useState(keyAreas || []);
  const [allTasks, setAllTasks] = useState([]);
  const [listNames, setListNames] = useState({});
  const [localGoals, setLocalGoals] = useState(goals || []);
  const usersLoadedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;
    (async () => {
      try {
        if (users && users.length) {
          if (!usersLoadedRef.current) {
            const fetchedUsers = await usersService.list();
            usersLoadedRef.current = true;
            const merged = mergeUsersById(users, fetchedUsers || []);
            if (!ignore) {
              setUsersList((prev) => (userIdsOf(prev) === userIdsOf(merged) ? prev : merged));
            }
          } else if (!ignore) {
            setUsersList((prev) => {
              const merged = mergeUsersById(prev, users);
              return userIdsOf(prev) === userIdsOf(merged) ? prev : merged;
            });
          }
        } else if (!usersLoadedRef.current) {
          const fetchedUsers = await usersService.list();
          usersLoadedRef.current = true;
          if (!ignore) setUsersList(fetchedUsers || []);
        }
      } catch {
        if (!ignore) {
          setUsersList((prev) => (userIdsOf(prev) === userIdsOf(users || []) ? prev : (users || [])));
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [isOpen, users]);

  useEffect(() => {
    if (!isOpen) usersLoadedRef.current = false;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;

    (async () => {
      try {
        const keyAreaMod = await import('../../services/keyAreaService');
        const taskMod = await import('../../services/taskService').catch(() => null);
        const goalMod = await import('../../services/goalService').catch(() => null);
        const keyAreaService = keyAreaMod?.default || keyAreaMod;
        const taskService = taskMod?.default || taskMod;
        const goalService = goalMod?.default || goalMod;
        const [areas, tasks, goalsData] = await Promise.all([
          keyAreaService?.list?.({ includeTaskCount: false }).catch(() => []),
          taskService?.list ? taskService.list({}).catch(() => []) : Promise.resolve([]),
          goalService?.getGoals ? goalService.getGoals({ status: 'active' }).catch(() => []) : Promise.resolve([]),
        ]);
        if (ignore) return;

        const nextAreas = Array.isArray(areas) ? areas : [];
        const nextTasks = Array.isArray(tasks) ? tasks : [];
        const fetchedGoals = Array.isArray(goalsData) ? goalsData : [];
        const mergedGoals = [...fetchedGoals];
        if (initialGoal?.id && !mergedGoals.some((goal) => String(goal.id) === String(initialGoal.id))) {
          mergedGoals.unshift({
            id: initialGoal.id,
            title: initialGoal.title || 'Current goal',
            milestones: [],
            _missing: true,
          });
        }

        setLocalKeyAreas((prev) => (idsOf(prev) === idsOf(nextAreas) ? prev : nextAreas));
        setAllTasks((prev) => (idsOf(prev) === idsOf(nextTasks) ? prev : nextTasks));
        setLocalGoals((prev) => (idsOf(prev) === idsOf(mergedGoals) ? prev : mergedGoals));
      } catch {
        if (!ignore) {
          setLocalKeyAreas([]);
          setAllTasks([]);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [isOpen, initialGoal?.id, initialGoal?.title]);

  useEffect(() => {
    if (!isOpen || !keyAreaId) return undefined;
    let ignore = false;

    (async () => {
      try {
        const mod = await import('../../services/taskService').catch(() => null);
        const taskService = mod?.default || mod;
        if (!taskService?.list) return;
        const tasksForArea = await taskService.list({ keyAreaId }).catch(() => []);
        if (!ignore) {
          const nextTasks = Array.isArray(tasksForArea) ? tasksForArea : [];
          setAllTasks((prev) => (idsOf(prev) === idsOf(nextTasks) ? prev : nextTasks));
        }
      } catch {
        if (!ignore) setAllTasks([]);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [isOpen, keyAreaId]);

  useEffect(() => {
    if (!isOpen) return;
    if (isDontForgetMode && !keyAreaId) return;
    if ((!listIndex || listIndex === 0) && availableLists && availableLists.length) {
      setListIndex?.((prev) => (prev && prev !== 0 ? prev : (availableLists[0] || 1)));
    }
  }, [availableLists, isDontForgetMode, isOpen, keyAreaId, listIndex, setListIndex]);

  useEffect(() => {
    const selectedAreas = localKeyAreas.length ? localKeyAreas : keyAreas;

    if (!keyAreaId) {
      const fallback = parentListNames && Object.keys(parentListNames).length ? parentListNames : {};
      setListNames((prev) => (hasSameListNames(prev, fallback) ? prev : fallback));
      return;
    }

    const selectedArea = selectedAreas.find((area) => String(area.id) === String(keyAreaId));
    if (selectedArea?.listNames) {
      const nextListNames = selectedArea.listNames || {};
      setListNames((prev) => (hasSameListNames(prev, nextListNames) ? prev : nextListNames));

      const availableListIndices = Object.keys(nextListNames);
      if (availableListIndices.length > 0 && !availableListIndices.includes(String(listIndex))) {
        setListIndex?.(Number(availableListIndices[0]));
      }
    } else {
      setListNames((prev) => (Object.keys(prev || {}).length === 0 ? prev : {}));
    }
  }, [keyAreaId, listIndex, localKeyAreas, keyAreas, parentListNames, setListIndex]);

  useEffect(() => {
    if (!goals || !Array.isArray(goals)) return;
    setLocalGoals((prev = []) => {
      const map = new Map();
      goals.forEach((goal) => map.set(String(goal.id), goal));
      prev.forEach((goal) => map.set(String(goal.id), goal));
      const merged = Array.from(map.values());
      return idsOf(prev) === idsOf(merged) ? prev : merged;
    });
  }, [goals]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (event) => {
      const createdGoal = event?.detail?.goal || event?.detail || null;
      if (!createdGoal?.id) return;
      setLocalGoals((prev = []) => {
        if (prev.some((goal) => String(goal.id) === String(createdGoal.id))) return prev;
        return [createdGoal, ...prev];
      });
    };
    window.addEventListener('goal-created', handler);
    return () => window.removeEventListener('goal-created', handler);
  }, [isOpen]);

  return {
    usersList,
    localKeyAreas,
    allTasks,
    listNames,
    localGoals,
  };
}
