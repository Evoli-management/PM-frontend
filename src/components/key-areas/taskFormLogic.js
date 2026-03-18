import { isDurationInputValid } from '../../utils/duration.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const normalizeGoalId = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value === 'object') {
    return value.id || value.goalId || value.goal_id || value._id || null;
  }
  return value;
};

export const safeDate = (value) => {
  if (!value && value !== 0) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

export const normalizeMemberIds = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  return [String(value)].filter(Boolean);
};

export const validateTaskDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return { valid: true };
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { valid: true };
  if (end < start) return { valid: false, error: 'End date must be after or equal to start date' };
  return { valid: true };
};

export const validateTaskDeadline = (startDate, endDate, deadline) => {
  if (!deadline) return { valid: true };
  const dl = new Date(deadline);
  if (Number.isNaN(dl.getTime())) return { valid: true };

  if (startDate) {
    const start = new Date(startDate);
    if (!Number.isNaN(start.getTime()) && dl < start) {
      return { valid: false, error: 'Deadline must be on or after start date' };
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (!Number.isNaN(end.getTime()) && dl > end) {
      return { valid: false, error: 'Deadline must be on or before end date' };
    }
  }

  return { valid: true };
};

export const validateTaskDuration = (value) => {
  if (!value) return { valid: true };
  if (typeof value !== 'string') return { valid: true };
  const trimmed = value.trim();
  if (!trimmed) return { valid: true };
  if (isDurationInputValid(trimmed)) return { valid: true };
  return { valid: false, error: 'Duration format invalid. Use HH:MM, for example 01:00, 01:30, or 02:00.' };
};

export const getTaskStartDatePatch = ({
  startDate,
  endDate,
  deadline,
  endAuto,
  deadlineAuto,
}, value) => {
  const patch = { startDate: value };
  if (!value) return patch;

  if (!startDate && !endDate && !deadline) {
    patch.endDate = value;
    // Removed auto-setting deadline
    // patch.deadline = value;
    return patch;
  }

  if (!endDate && endAuto) {
    patch.endDate = value;
  }

  // Removed auto-setting deadline
  // if (!deadline && deadlineAuto && (!endDate || endAuto)) {
  //   patch.deadline = value;
  // }

  if (endDate && value > endDate) {
    patch.endDate = value;
    // Removed auto-setting deadline
    // patch.deadline = value;
  } else if (deadline && deadline < value) {
    // Removed auto-setting deadline
    // patch.deadline = endDate && endDate >= value ? endDate : value;
  }

  return patch;
};

export const getTaskEndDatePatch = ({ startDate }, value) => {
  const patch = {
    endDate: value,
    endAuto: false,
  };
  if (!value) return patch;

  // Removed auto-setting deadline to endDate
  // patch.deadline = value;
  if (startDate && value < startDate) {
    patch.startDate = value;
  }
  return patch;
};

export const getTaskDeadlinePatch = (value) => ({
  deadline: value,
  deadlineAuto: false,
});

export const resolveInlineTaskDates = ({ startDate, endDate, deadline, key, value }) => {
  const normalizedStartDate = safeDate(startDate) || '';
  const normalizedEndDate = safeDate(endDate) || '';
  const normalizedDeadline = safeDate(deadline) || '';
  const nextValue = safeDate(value) || '';
  const normalizedKey = String(key || '');

  if (normalizedKey === 'start_date' || normalizedKey === 'startDate') {
    const patch = getTaskStartDatePatch({
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      deadline: normalizedDeadline,
      endAuto: !normalizedEndDate,
      deadlineAuto: !normalizedDeadline,
    }, nextValue);
    return {
      startDate: Object.prototype.hasOwnProperty.call(patch, 'startDate') ? (patch.startDate || '') : normalizedStartDate,
      endDate: Object.prototype.hasOwnProperty.call(patch, 'endDate') ? (patch.endDate || '') : normalizedEndDate,
      deadline: Object.prototype.hasOwnProperty.call(patch, 'deadline') ? (patch.deadline || '') : normalizedDeadline,
    };
  }

  if (normalizedKey === 'end_date' || normalizedKey === 'endDate') {
    const patch = getTaskEndDatePatch({ startDate: normalizedStartDate }, nextValue);
    return {
      startDate: Object.prototype.hasOwnProperty.call(patch, 'startDate') ? (patch.startDate || '') : normalizedStartDate,
      endDate: Object.prototype.hasOwnProperty.call(patch, 'endDate') ? (patch.endDate || '') : normalizedEndDate,
      deadline: Object.prototype.hasOwnProperty.call(patch, 'deadline') ? (patch.deadline || '') : normalizedDeadline,
    };
  }

  if (normalizedKey === 'deadline' || normalizedKey === 'dueDate' || normalizedKey === 'due_date') {
    const patch = getTaskDeadlinePatch(nextValue);
    return {
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      deadline: patch.deadline || '',
    };
  }

  return null;
};

export const normalizeUserLookupValue = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') {
    return (
      value.id ||
      value.userId ||
      value.user_id ||
      value.name ||
      value.username ||
      value.email ||
      ''
    );
  }
  return String(value).trim();
};

export const extractAssigneeCandidate = (item = {}) => {
  const candidates = [
    item.assigneeId,
    item.assignee_id,
    item.responsibleId,
    item.responsible_id,
    item.delegatedToUserId,
    item.delegated_to_user_id,
    item.assignee,
    item.responsible,
    item.assignee_name,
    item.responsibleName,
    item.responsible_name,
    item.owner,
    item.assigned_to,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeUserLookupValue(candidate);
    if (normalized) return normalized;
  }
  return '';
};

export const findUserIdFromValue = (value, users = [], currentUserId = null) => {
  const normalized = normalizeUserLookupValue(value);
  if (!normalized) return '';
  if (String(normalized).toLowerCase() === 'me' && currentUserId) return String(currentUserId);
  if (UUID_RE.test(normalized)) return normalized;

  const target = String(normalized).toLowerCase();
  const user = (users || []).find((u) => {
    const candidates = [
      u.id,
      u.userId,
      u.user_id,
      u.name,
      u.username,
      u.email,
      `${u.firstname || ''} ${u.lastname || ''}`.trim(),
      `${u.name || u.firstname || ''} ${u.lastname || ''}`.trim(),
    ]
      .map((candidate) => String(candidate || '').trim())
      .filter(Boolean);

    return candidates.some((candidate) => {
      const lower = candidate.toLowerCase();
      return lower === target || target.includes(lower);
    });
  });

  return user?.id ? String(user.id) : '';
};

export const resolveAssigneeSelectValue = (item = {}, users = [], currentUserId = null, fallbackItem = null) => {
  const direct = findUserIdFromValue(extractAssigneeCandidate(item), users, currentUserId);
  if (direct) return direct;
  if (fallbackItem) {
    return findUserIdFromValue(extractAssigneeCandidate(fallbackItem), users, currentUserId);
  }
  return '';
};

export const resolveCreateTaskAssignment = ({ assignee, usersList = [], currentUserId = null }) => {
  let assigneeName = assignee;
  let delegatedToUserId = null;

  if (assignee) {
    const selectedUser = usersList.find((user) => String(user.id || user.member_id) === String(assignee));
    if (selectedUser) {
      const selectedUserId = selectedUser.id || selectedUser.member_id;
      const selectedUserName = selectedUser.name || `${selectedUser.firstname || ''} ${selectedUser.lastname || ''}`.trim();
      if (String(selectedUserId) === String(currentUserId)) {
        assigneeName = 'Me';
      } else {
        assigneeName = selectedUserName;
        delegatedToUserId = selectedUserId;
      }
    }
  }

  return {
    assignee: assigneeName || null,
    delegatedToUserId,
  };
};

export const resolveEditTaskAssignment = ({ assignee, usersList = [], currentUserId = null }) => {
  let assigneeName = null;
  let delegatedToUserId = null;

  if (assignee) {
    const selectedUser = usersList.find((user) => String(user.id || user.member_id) === String(assignee));
    if (selectedUser) {
      const userId = selectedUser.id || selectedUser.member_id;
      const selectedUserName = selectedUser.name || `${selectedUser.firstname || ''} ${selectedUser.lastname || ''}`.trim();
      if (String(userId) === String(currentUserId)) {
        assigneeName = 'Me';
      } else {
        assigneeName = selectedUserName;
        delegatedToUserId = userId;
      }
    }
  }

  return {
    assignee: assigneeName,
    delegatedToUserId,
  };
};

export const buildCreateTaskPayload = ({
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
  listIndex,
  goal,
  tags,
  assignee,
  consultedIds = [],
  informedIds = [],
  usersList = [],
  currentUserId = null,
}) => {
  const assignment = resolveCreateTaskAssignment({ assignee, usersList, currentUserId });
  return {
    title: (title || '').trim(),
    description: (description || '').trim(),
    assignee: assignment.assignee,
    delegatedToUserId: assignment.delegatedToUserId,
    start_date: startDate || null,
    time: startTime || null,
    start_time: startTime || null,
    date: startDate || null,
    end_date: endDate || null,
    end_time: endTime || null,
    deadline: deadline || null,
    duration: duration || null,
    priority: priority || 'medium',
    status,
    key_area_id: keyAreaId || null,
    list_index: listIndex,
    listIndex: listIndex,
    goalId: normalizeGoalId(goal),
    goal_id: normalizeGoalId(goal),
    tags: (tags || '').trim(),
    consulted: Array.isArray(consultedIds) ? consultedIds : [],
    informed: Array.isArray(informedIds) ? informedIds : [],
  };
};

export const buildEditTaskPayload = ({
  initialData = {},
  title,
  description,
  startDate,
  endDate,
  deadline,
  duration,
  priority,
  status,
  keyAreaId,
  listIndex,
  goal,
  tags,
  assignee,
  usersList = [],
  currentUserId = null,
}) => {
  const assignment = resolveEditTaskAssignment({ assignee, usersList, currentUserId });
  return {
    ...initialData,
    id: initialData.id || initialData.taskId || initialData.task_id || initialData._id || undefined,
    title: (title || '').trim(),
    description: (description || '').trim(),
    assignee: assignment.assignee,
    delegatedToUserId: assignment.delegatedToUserId,
    start_date: startDate || null,
    startDate: startDate || null,
    end_date: endDate || null,
    endDate: endDate || null,
    deadline: deadline || null,
    dueDate: deadline || null,
    due_date: deadline || null,
    duration: duration || null,
    priority,
    status,
    key_area_id: keyAreaId || null,
    list_index: listIndex,
    listIndex: listIndex,
    goal_id: normalizeGoalId(goal),
    goalId: normalizeGoalId(goal),
    tags: (tags || '').trim(),
  };
};

export const toIsoDateTimeFromModal = (dateValue, timeValue) => {
  try {
    if (!dateValue) return null;
    if (timeValue) return new Date(`${dateValue}T${timeValue}`).toISOString();
    return new Date(dateValue).toISOString();
  } catch {
    return null;
  }
};

export const buildTaskServiceCreateBodyFromModalPayload = (payload = {}, {
  fallbackTitle = '',
  defaultStatus,
  defaultPriority,
} = {}) => {
  const title = String(payload?.title || payload?.name || fallbackTitle || '').trim();
  const body = {
    title,
    description: payload?.description || payload?.notes || null,
    assignee: payload?.assignee || null,
    startDate: toIsoDateTimeFromModal(payload?.date || payload?.start_date || payload?.startDate, payload?.time) || undefined,
    endDate: toIsoDateTimeFromModal(payload?.end_date || payload?.endDate, null) || undefined,
    dueDate: toIsoDateTimeFromModal(payload?.deadline || payload?.dueDate || payload?.due_date, null) || undefined,
    duration: payload?.duration ? String(payload.duration) : undefined,
    goalId: normalizeGoalId(payload?.goal_id ?? payload?.goalId ?? payload?.goal),
    status: payload?.status || defaultStatus,
    priority: payload?.priority || defaultPriority,
    keyAreaId: payload?.key_area_id || payload?.keyAreaId || undefined,
    listIndex: payload?.listIndex ?? payload?.list_index ?? undefined,
    delegatedToUserId: payload?.delegatedToUserId ?? null,
    consulted: Array.isArray(payload?.consulted) ? payload.consulted : undefined,
    informed: Array.isArray(payload?.informed) ? payload.informed : undefined,
  };

  Object.keys(body).forEach((key) => {
    if (typeof body[key] === 'undefined') delete body[key];
  });

  return body;
};

export const buildTaskServiceUpdatePatchFromModalPayload = (payload = {}) => {
  const patch = {};
  if (payload.title !== undefined) patch.title = payload.title;
  if (payload.description !== undefined) patch.description = payload.description;
  if (payload.assignee !== undefined) patch.assignee = payload.assignee;
  if (payload.status !== undefined) patch.status = payload.status;
  if (payload.priority !== undefined) patch.priority = payload.priority;
  if (payload.duration !== undefined) patch.duration = payload.duration;
  if (payload.goal_id !== undefined || payload.goalId !== undefined || payload.goal !== undefined) {
    patch.goalId = normalizeGoalId(payload.goal_id ?? payload.goalId ?? payload.goal);
  }
  if (payload.key_area_id !== undefined || payload.keyAreaId !== undefined) {
    patch.keyAreaId = payload.key_area_id ?? payload.keyAreaId ?? null;
  }
  if (payload.list_index !== undefined || payload.listIndex !== undefined) {
    patch.listIndex = payload.list_index ?? payload.listIndex;
  }
  if (payload.delegatedToUserId !== undefined || payload.delegated_to_user_id !== undefined) {
    patch.delegatedToUserId = payload.delegatedToUserId ?? payload.delegated_to_user_id ?? null;
  }

  if (
    payload.date !== undefined ||
    payload.time !== undefined ||
    payload.start_date !== undefined ||
    payload.startDate !== undefined
  ) {
    const startValue = payload.date ?? payload.start_date ?? payload.startDate;
    patch.startDate = startValue ? toIsoDateTimeFromModal(startValue, payload.time) : null;
  }
  if (payload.endDate !== undefined || payload.end_date !== undefined) {
    const endValue = payload.end_date !== undefined ? payload.end_date : payload.endDate;
    patch.endDate = endValue ? toIsoDateTimeFromModal(endValue, null) : null;
  }
  if (payload.deadline !== undefined || payload.dueDate !== undefined || payload.due_date !== undefined) {
    const dueValue = payload.deadline ?? payload.dueDate ?? payload.due_date;
    patch.dueDate = dueValue ? toIsoDateTimeFromModal(dueValue, null) : null;
  }

  return patch;
};

export const buildInlineTaskFieldUpdate = ({
  task = {},
  key,
  value,
  usersList = [],
  currentUserId = null,
  getPriorityLevel,
}) => {
  const patch = {};
  const optimistic = {};
  const normalizedKey = String(key || '');

  if (normalizedKey === 'name') {
    optimistic.name = value;
    patch.title = value;
    return { optimistic, patch, persist: true };
  }

  if (normalizedKey === 'notes') {
    optimistic.notes = value;
    patch.description = value;
    return { optimistic, patch, persist: true };
  }

  if (normalizedKey === 'assignee') {
    const assignment = value
      ? resolveEditTaskAssignment({ assignee: value, usersList, currentUserId })
      : { assignee: null, delegatedToUserId: null };
    optimistic.assignee = assignment.assignee || '';
    optimistic.delegatedToUserId = assignment.delegatedToUserId ?? null;
    patch.assignee = assignment.assignee;
    patch.delegatedToUserId = assignment.delegatedToUserId;
    return { optimistic, patch, persist: true };
  }

  const resolvedDates = resolveInlineTaskDates({
    startDate: task.start_date ?? task.startDate,
    endDate: task.end_date ?? task.endDate,
    deadline: task.deadline ?? task.dueDate ?? task.due_date,
    key: normalizedKey,
    value,
  });
  if (resolvedDates) {
    optimistic.start_date = resolvedDates.startDate || null;
    optimistic.startDate = resolvedDates.startDate || null;
    optimistic.end_date = resolvedDates.endDate || null;
    optimistic.endDate = resolvedDates.endDate || null;
    optimistic.deadline = resolvedDates.deadline || null;
    optimistic.dueDate = resolvedDates.deadline || null;
    optimistic.due_date = resolvedDates.deadline || null;
    patch.startDate = resolvedDates.startDate ? new Date(resolvedDates.startDate).toISOString() : null;
    patch.endDate = resolvedDates.endDate ? new Date(resolvedDates.endDate).toISOString() : null;
    patch.dueDate = resolvedDates.deadline ? new Date(resolvedDates.deadline).toISOString() : null;
    return { optimistic, patch, persist: true, resolvedDates };
  }

  if (normalizedKey === 'duration') {
    optimistic.duration = value;
    patch.duration = value;
    return { optimistic, patch, persist: true };
  }

  if (normalizedKey === 'priority') {
    optimistic.priority = typeof getPriorityLevel === 'function' ? getPriorityLevel(value) : value;
    patch.priority = value;
    return { optimistic, patch, persist: true };
  }

  if (normalizedKey === 'status') {
    optimistic.status = value;
    patch.status = value;
    return { optimistic, patch, persist: true };
  }

  optimistic[normalizedKey] = value;
  return { optimistic, patch: null, persist: false };
};
