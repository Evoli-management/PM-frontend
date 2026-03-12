import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaInfoCircle, FaRegCalendarAlt, FaUser, FaUsers } from 'react-icons/fa';
import { formatKeyAreaLabel } from '../../utils/keyAreaDisplay';

const IconChevron = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"
    />
  </svg>
);

const InformedMembersIcon = ({ className = '' }) => (
  <span className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${className}`}>
    <FaUsers className="h-5 w-5 text-slate-500" />
    <FaInfoCircle className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-white text-slate-500" />
  </span>
);

export default function TaskFormFields({
  showField = () => true,
  isDontForgetMode = false,
  values,
  usersList = [],
  localKeyAreas = [],
  keyAreas = [],
  localGoals = [],
  goals = [],
  allTasks = [],
  listNames = {},
  availableLists = [1],
  parentListNames = null,
  startRef,
  endRef,
  deadlineRef,
  membersMenuRefs,
  openMembersRole,
  setOpenMembersRole,
  toggleLocalMember,
  formatMemberSummary,
  keyAreaError = '',
  listError = '',
  onTitleChange,
  onDescriptionChange,
  onKeyAreaChange,
  onListIndexChange,
  onStartDateChange,
  onEndDateChange,
  onDeadlineChange,
  onPriorityChange,
  onDurationChange,
  onGoalChange,
  onStatusChange,
  onTagsChange,
  onAssigneeChange,
}) {
  const { t } = useTranslation();

  const {
    title = '',
    description = '',
    keyAreaId = '',
    listIndex = '',
    startDate = '',
    endDate = '',
    deadline = '',
    priority = 2,
    duration = '',
    goal = '',
    status = 'open',
    tags = '',
    assignee = '',
    consultedIds = [],
    informedIds = [],
  } = values || {};
  const shouldDisableKeyAreaListField = isDontForgetMode && !keyAreaId;

  const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-50';
  const textareaCls = `${inputCls} min-h-[160px] resize-none`;
  const dateCls = `${inputCls} appearance-none pr-12 no-calendar`;
  const selectCls = `${inputCls} appearance-none pr-12`;
  const memberFieldCls = `${selectCls} pl-11`;
  const labelCls = 'mb-2 block text-sm font-medium text-slate-700';
  const sectionTitleCls = 'text-[1.55rem] font-semibold tracking-[-0.01em] text-slate-900';

  const getListOptions = () => {
    if (!keyAreaId) {
      const listsToUse = availableLists?.length ? availableLists : [1];
      return listsToUse.map((item) => ({
        value: item,
        label: (parentListNames && parentListNames[item]) || (listNames && listNames[item]) || t('createTaskModal.list', { n: item }),
      }));
    }

    const named = Object.keys(listNames || {})
      .map(Number)
      .filter((item) => listNames[item] && String(listNames[item]).trim() !== '');
    const listsWithTasks = (allTasks || [])
      .filter((task) => String(task.keyAreaId || task.key_area_id) === String(keyAreaId))
      .map((task) => task.list_index ?? task.listIndex ?? task.list)
      .filter((item) => item !== undefined && item !== null && item !== '')
      .filter((item, index, array) => array.indexOf(item) === index);
    const merged = [...new Set([1, ...named, ...listsWithTasks])].sort((a, b) => a - b);
    const listsToUse = merged.length ? merged : (availableLists || [1]);
    return listsToUse.map((item) => ({
      value: item,
      label: (listNames && listNames[item]) || t('createTaskModal.list', { n: item }),
    }));
  };

  return (
    <div className="space-y-8">
      {showField('title') && (
        <div>
          <label className={labelCls} htmlFor="task-form-title">{t('createTaskModal.taskNameLabel')}</label>
          <input
            id="task-form-title"
            name="title"
            required
            className={inputCls}
            value={title}
            onChange={(event) => onTitleChange?.(event.target.value)}
            placeholder={t('createTaskModal.taskNamePlaceholder')}
          />
        </div>
      )}

      {showField('description') && (
        <div>
          <label className={labelCls}>{t('createTaskModal.descLabel')}</label>
          <textarea
            name="description"
            rows={5}
            className={textareaCls}
            placeholder={t('createTaskModal.descPlaceholder')}
            value={description}
            onChange={(event) => onDescriptionChange?.(event.target.value)}
          />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {showField('key_area_id') && (
          <div>
            <label className={labelCls}>{t('createTaskModal.keyAreaLabel')}</label>
            <div className="relative">
              <select
                name="key_area_id"
                className={selectCls}
                value={keyAreaId}
                onChange={(event) => onKeyAreaChange?.(event.target.value)}
                required={!isDontForgetMode}
              >
                <option value="">{t('createTaskModal.selectKeyArea')}</option>
                {(localKeyAreas.length ? localKeyAreas : keyAreas).map((area, index) => (
                  <option key={area.id} value={area.id}>{formatKeyAreaLabel(area, index)}</option>
                ))}
              </select>
              <IconChevron className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-500" />
            </div>
            {keyAreaError ? <p className="mt-2 text-sm text-red-600">{keyAreaError}</p> : null}
          </div>
        )}

        {showField('list_index') && (
          <div>
            <label className={labelCls}>{t('createTaskModal.taskListLabel', 'Task List')}</label>
            <div className="relative">
              <select
                name="list_index"
                className={selectCls}
                value={shouldDisableKeyAreaListField ? '' : listIndex}
                onChange={(event) => onListIndexChange?.(Number(event.target.value))}
                required={!shouldDisableKeyAreaListField}
                disabled={shouldDisableKeyAreaListField}
              >
                {shouldDisableKeyAreaListField ? (
                  <option value="">{t('createTaskModal.selectKeyAreaFirst', 'Select Key Area First')}</option>
                ) : (
                  getListOptions().map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))
                )}
              </select>
              <IconChevron className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-500" />
            </div>
            {listError ? <p className="mt-2 text-sm text-red-600">{listError}</p> : null}
          </div>
        )}
      </div>

      <section>
        <div className="mb-6 flex items-center gap-4">
          <h4 className={sectionTitleCls}>{t('createTaskModal.taskInformationTitle', 'Task Information')}</h4>
          <div className="h-px flex-1 bg-slate-300/80" />
        </div>

        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
          {showField('start_date') && (
            <div>
              <label className={labelCls}>{t('createTaskModal.startDateLabel')}</label>
              <div className="relative">
                <input
                  name="start_date"
                  type="date"
                  className={dateCls}
                  value={startDate}
                  onChange={(event) => onStartDateChange?.(event.target.value)}
                  ref={startRef}
                />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" onClick={() => { try { startRef?.current?.showPicker?.(); startRef?.current?.focus(); } catch {} }} aria-label="Open date picker">
                  <FaRegCalendarAlt className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {showField('end_date') && (
            <div>
              <label className={labelCls}>{t('createTaskModal.endDateLabel')}</label>
              <div className="relative">
                <input
                  name="end_date"
                  type="date"
                  className={dateCls}
                  value={endDate}
                  onChange={(event) => onEndDateChange?.(event.target.value)}
                  ref={endRef}
                />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" onClick={() => { try { endRef?.current?.showPicker?.(); endRef?.current?.focus(); } catch {} }} aria-label="Open date picker">
                  <FaRegCalendarAlt className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {showField('deadline') && (
            <div>
              <label className={labelCls}>{t('createTaskModal.deadlineLabel')}</label>
              <div className="relative">
                <input
                  name="deadline"
                  type="date"
                  className={dateCls}
                  value={deadline}
                  min={startDate || undefined}
                  max={endDate || undefined}
                  onChange={(event) => onDeadlineChange?.(event.target.value)}
                  ref={deadlineRef}
                />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" onClick={() => { try { deadlineRef?.current?.showPicker?.(); deadlineRef?.current?.focus(); } catch {} }} aria-label="Open date picker">
                  <FaRegCalendarAlt className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {showField('priority') && (
            <div>
              <label className={labelCls}>{t('createTaskModal.priorityLabel')}</label>
              <div className="relative">
                <select name="priority" className={selectCls} value={String(priority)} onChange={(event) => onPriorityChange?.(Number(event.target.value))}>
                  <option value={1}>{t('createTaskModal.lowOpt')}</option>
                  <option value={2}>{t('createTaskModal.normalOpt')}</option>
                  <option value={3}>{t('createTaskModal.highOpt')}</option>
                </select>
                <IconChevron className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-500" />
              </div>
            </div>
          )}

          {showField('duration') && (
            <div>
              <label className={labelCls}>{t('createTaskModal.estimatedDurationLabel', 'Est. Duration')}</label>
              <input
                name="duration"
                type="time"
                step="60"
                className={inputCls}
                value={duration}
                onChange={(event) => onDurationChange?.(event.target.value)}
              />
            </div>
          )}

          {showField('goal_id') && (
            <div>
              <label className={labelCls}>{t('createTaskModal.goalLabel')}</label>
              <div className="relative">
                <select name="goal" className={selectCls} value={goal} onChange={(event) => onGoalChange?.(event.target.value)}>
                  <option value="">{t('createTaskModal.selectGoal')}</option>
                  {(localGoals.length ? localGoals : goals).map((goalItem) => (
                    <option key={goalItem.id} value={goalItem.id}>{goalItem.title}</option>
                  ))}
                </select>
                <IconChevron className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-500" />
              </div>
            </div>
          )}

          {showField('status') && (
            <div>
              <label className={labelCls}>{t('createTaskModal.statusLabel')}</label>
              <div className="relative">
                <select name="status" className={selectCls} value={status} onChange={(event) => onStatusChange?.(event.target.value)}>
                  <option value="open">{t('createTaskModal.openOpt')}</option>
                  <option value="in_progress">{t('createTaskModal.inProgressOpt')}</option>
                  <option value="done">{t('createTaskModal.doneOpt')}</option>
                </select>
                <IconChevron className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-500" />
              </div>
            </div>
          )}

          {showField('tags') && (
            <div>
              <label className={labelCls}>{t('createTaskModal.tagsLabel', 'Tags')}</label>
              <input
                name="tags"
                className={inputCls}
                value={tags}
                onChange={(event) => onTagsChange?.(event.target.value)}
                placeholder={t('createTaskModal.tagsPlaceholder', '+ Add tag')}
              />
            </div>
          )}
        </div>
      </section>

      {showField('assignee') && (
        <section>
          <div className="mb-6 flex items-center gap-4">
            <h4 className={sectionTitleCls}>{t('createTaskModal.associatedMembersTitle')}</h4>
            <div className="h-px flex-1 bg-slate-300/80" />
          </div>

          <div className="space-y-4 md:w-[calc((100%-1.5rem)/2)]">
            <div>
              <label className={labelCls}>{t('createTaskModal.responsibleLabel')}</label>
              <div className="relative">
                <FaUser className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <select name="assignee" className={memberFieldCls} value={assignee} onChange={(event) => onAssigneeChange?.(event.target.value)}>
                  <option value="">{t('createTaskModal.unassigned')}</option>
                  {usersList.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
                <IconChevron className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-500" />
              </div>
            </div>

            {[
              { role: 'consulted', label: t('createTaskModal.consultedLabel'), value: consultedIds, Icon: FaUsers },
              { role: 'informed', label: t('createTaskModal.informedLabel'), value: informedIds, Icon: InformedMembersIcon },
            ].map(({ role, label, value, Icon }) => (
              <div key={role}>
                <label className={labelCls}>{label}</label>
                <div
                  ref={(node) => {
                    if (!membersMenuRefs) return;
                    if (node) membersMenuRefs.current[role] = node;
                    else delete membersMenuRefs.current[role];
                  }}
                  className="relative"
                >
                  {role === 'informed' ? (
                    <Icon />
                  ) : (
                    <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  )}
                  <button
                    type="button"
                    className={`${memberFieldCls} text-left text-base transition-colors hover:border-slate-400 ${value.length ? 'text-slate-900' : 'text-slate-400'}`}
                    onClick={() => setOpenMembersRole?.((current) => (current === role ? null : role))}
                  >
                    {formatMemberSummary?.(value)}
                  </button>
                  <IconChevron className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-500" />

                  {openMembersRole === role && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {usersList.map((user) => {
                          const checked = value.includes(String(user.id));
                          return (
                            <label key={`${role}-${user.id}`} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={checked}
                                onChange={() => toggleLocalMember?.(role, String(user.id))}
                              />
                              <span>{user.name}</span>
                            </label>
                          );
                        })}
                        {usersList.length === 0 && (
                          <div className="px-3 py-2 text-sm text-slate-400">{t('createTaskModal.noMembersFound')}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm text-slate-500">{t('createTaskModal.previewOnlyNote')}</p>
        </section>
      )}
    </div>
  );
}
