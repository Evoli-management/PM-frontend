import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal';
import { FaRegClock } from 'react-icons/fa';

const IconChevron = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"
    />
  </svg>
);

const priorityOptions = [
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

export default function BulkFieldPickerModal({
  isOpen,
  title = 'Select field',
  fields = [],
  users = [],
  keyAreas = [],
  goals = [],
  availableLists = [],
  listNames = null,
  listNamesByKeyArea = null,
  onSave,
  onCancel,
}) {
  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50';
  const selectCls = `${inputCls} appearance-none pr-10`;
  const dateCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-slate-300 focus:ring-0 appearance-none pr-11 no-calendar';
  const notchedInputCls = 'w-full bg-transparent px-0 py-0 text-slate-900 outline-none placeholder-slate-400';
  const notchedSelectCls = 'w-full appearance-none bg-transparent px-0 py-0 pr-6 text-slate-900 outline-none';
  const notchedDateCls = 'w-full appearance-none bg-transparent px-0 py-0 pr-6 text-slate-900 outline-none no-calendar';
  const notchedTimeCls = 'w-full appearance-none bg-transparent px-0 py-0 pr-6 text-slate-900 outline-none no-time-picker';
  const [selectedField, setSelectedField] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [dateAutoFill, setDateAutoFill] = useState({ end_date: true, deadline: true });
  const durationInputRef = useRef(null);
  const startDateInputRef = useRef(null);
  const endDateInputRef = useRef(null);
  const deadlineInputRef = useRef(null);

  const openPicker = (input) => {
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.focus();
      input.click();
    }
  };

  const renderNotchedField = (
    label,
    control,
    icon = null,
    minHeight = '59.5875px',
    iconClassName = 'text-purple-600',
    onIconClick = null,
  ) => (
    <div style={{ minHeight }} className="relative pt-2">
      <fieldset className="relative rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm">
        <legend className="ml-2 px-1 text-sm font-medium text-slate-700 leading-none">
          {label}
        </legend>
        <div>{control}</div>
        {icon ? (
          onIconClick ? (
            <button
              type="button"
              onClick={onIconClick}
              className={`absolute right-3 top-1/2 -translate-y-1/2 appearance-none border-0 bg-transparent p-0 shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${iconClassName}`}
              aria-label={`Open ${label} picker`}
            >
              {icon}
            </button>
          ) : (
            <div className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${iconClassName}`}>
              {icon}
            </div>
          )
        ) : null}
      </fieldset>
    </div>
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedField('');
      setFieldValue('');
      setDateAutoFill({ end_date: true, deadline: true });
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedField === 'date') {
      setFieldValue({ start_date: '', end_date: '', deadline: '' });
      setDateAutoFill({ end_date: true, deadline: true });
      return;
    }
    if (selectedField === 'key_area_bundle') {
      setFieldValue({ key_area_id: '', list_index: '' });
      return;
    }
    setFieldValue('');
  }, [selectedField]);

  const selectedFieldMeta = useMemo(
    () => fields.find((field) => field.value === selectedField) || null,
    [fields, selectedField],
  );

  const resolvedListNames = useMemo(() => {
    if (selectedField !== 'key_area_bundle') return listNames || {};
    const keyAreaId = fieldValue?.key_area_id;
    if (keyAreaId && listNamesByKeyArea && listNamesByKeyArea[String(keyAreaId)]) {
      return listNamesByKeyArea[String(keyAreaId)];
    }
    return listNames || {};
  }, [fieldValue, listNames, listNamesByKeyArea, selectedField]);

  useEffect(() => {
    if (selectedField !== 'date') return;
    const current = fieldValue && typeof fieldValue === 'object'
      ? fieldValue
      : { start_date: '', end_date: '', deadline: '' };
    if (!dateAutoFill.end_date) return;
    if (!current.start_date) return;
    if (current.end_date === current.start_date) return;
    setFieldValue((prev) => ({
      ...(prev && typeof prev === 'object' ? prev : {}),
      start_date: current.start_date,
      end_date: current.start_date,
    }));
  }, [selectedField, fieldValue, dateAutoFill.end_date]);

  useEffect(() => {
    if (selectedField !== 'date') return;
    const current = fieldValue && typeof fieldValue === 'object'
      ? fieldValue
      : { start_date: '', end_date: '', deadline: '' };
    if (!dateAutoFill.deadline) return;
    if (!current.end_date) return;
    if (current.deadline === current.end_date) return;
    setFieldValue((prev) => ({
      ...(prev && typeof prev === 'object' ? prev : {}),
      deadline: current.end_date,
    }));
  }, [selectedField, fieldValue, dateAutoFill.deadline]);

  if (!isOpen) return null;

  const renderValueEditor = () => {
    if (!selectedFieldMeta) {
      return (
        <div style={{ minHeight: '59.5875px' }} className="pt-4">
          <div className="relative flex min-h-[43.5875px] items-center rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm">
            <span className="text-sm text-slate-500">Select a field to edit.</span>
          </div>
        </div>
      );
    }

    if (selectedField === 'assignee') {
      return renderNotchedField(
        'Responsible',
        <select
          value={fieldValue}
          onChange={(e) => setFieldValue(e.target.value)}
          className={notchedSelectCls}
        >
          <option value="">— Unassigned —</option>
          {users.map((user) => {
            const id = user.id || user.member_id;
            const label = `${user.name || user.firstname || ''} ${user.lastname || ''}`.trim();
            return (
              <option key={id} value={id}>
                {label}
              </option>
            );
          })}
        </select>,
        <IconChevron className="h-4 w-4 text-slate-500" />
      );
    }

    if (selectedField === 'priority') {
      return renderNotchedField(
        'Priority',
        <select
          value={fieldValue}
          onChange={(e) => setFieldValue(e.target.value)}
          className={notchedSelectCls}
        >
          <option value="">Select priority</option>
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>,
        <IconChevron className="h-4 w-4 text-slate-500" />
      );
    }

    if (selectedField === 'status') {
      return renderNotchedField(
        'Status',
        <select
          value={fieldValue}
          onChange={(e) => setFieldValue(e.target.value)}
          className={notchedSelectCls}
        >
          <option value="">Select status</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>,
        <IconChevron className="h-4 w-4 text-slate-500" />
      );
    }

    if (selectedField === 'date') {
      const dateValue = fieldValue && typeof fieldValue === 'object'
        ? fieldValue
        : { start_date: '', end_date: '', deadline: '' };
      return (
        <div className="space-y-3">
          {renderNotchedField(
            'Start date',
              <input
                ref={startDateInputRef}
                type="date"
                value={dateValue.start_date || ''}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setFieldValue((prev) => {
                    const current = prev && typeof prev === 'object'
                      ? prev
                      : { start_date: '', end_date: '', deadline: '' };
                    const nextEndDate = (dateAutoFill.end_date || (current.end_date && current.end_date < nextValue))
                      ? nextValue
                      : current.end_date;
                    const nextDeadline = (dateAutoFill.deadline || (current.deadline && current.deadline < nextEndDate))
                      ? nextEndDate
                      : current.deadline;
                    return {
                      ...current,
                      start_date: nextValue,
                      end_date: nextEndDate,
                      deadline: nextDeadline,
                    };
                  });
                }}
                className={notchedDateCls}
              />,
            <span aria-hidden="true">📅</span>,
            '59.5875px',
            'text-purple-600',
            () => openPicker(startDateInputRef.current)
          )}
          {renderNotchedField(
            'End date',
            <input
                ref={endDateInputRef}
                type="date"
                value={dateValue.end_date || ''}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setFieldValue((prev) => {
                    const current = prev && typeof prev === 'object'
                      ? prev
                      : { start_date: '', end_date: '', deadline: '' };
                    if (current.start_date && nextValue && nextValue < current.start_date) {
                      return {
                        ...current,
                        start_date: nextValue,
                        end_date: nextValue,
                        deadline: dateAutoFill.deadline ? nextValue : current.deadline,
                      };
                    }
                    return {
                      ...current,
                      end_date: nextValue,
                    };
                  });
                  setDateAutoFill((prev) => ({
                    ...prev,
                    end_date: false,
                  }));
                }}
                className={notchedDateCls}
              />,
            <span aria-hidden="true">📅</span>,
            '59.5875px',
            'text-purple-600',
            () => openPicker(endDateInputRef.current)
          )}
          {renderNotchedField(
            'Deadline',
            <input
                ref={deadlineInputRef}
                type="date"
                value={dateValue.deadline || ''}
                onChange={(e) => {
                  setDateAutoFill((prev) => ({ ...prev, deadline: false }));
                  setFieldValue((prev) => ({ ...(prev || {}), deadline: e.target.value }));
                }}
                className={notchedDateCls}
              />,
            <span aria-hidden="true">📅</span>,
            '72px'
            ,
            'text-purple-600',
            () => openPicker(deadlineInputRef.current)
          )}
        </div>
      );
    }

    if (selectedField === 'start_date' || selectedField === 'end_date' || selectedField === 'deadline') {
      return renderNotchedField(
        selectedField === 'start_date' ? 'Start date' : selectedField === 'end_date' ? 'End date' : 'Deadline',
        <input
          ref={selectedField === 'start_date' ? startDateInputRef : selectedField === 'end_date' ? endDateInputRef : deadlineInputRef}
          type="date"
          value={fieldValue}
          onChange={(e) => setFieldValue(e.target.value)}
          className={notchedDateCls}
        />,
        <span aria-hidden="true">📅</span>,
        '59.5875px',
        'text-purple-600',
        () => openPicker(
          selectedField === 'start_date'
            ? startDateInputRef.current
            : selectedField === 'end_date'
              ? endDateInputRef.current
              : deadlineInputRef.current
        )
      );
    }

    if (selectedField === 'duration') {
      return renderNotchedField(
        'Duration',
        <input
          ref={durationInputRef}
          type="time"
          step="60"
          value={fieldValue}
          onChange={(e) => setFieldValue(e.target.value)}
          className={notchedTimeCls}
        />,
        <FaRegClock size={18} />,
        '59.5875px',
        'text-slate-900',
        () => openPicker(durationInputRef.current)
      );
    }

    if (selectedField === 'key_area_bundle') {
      const keyAreaValue = fieldValue && typeof fieldValue === 'object'
        ? fieldValue
        : { key_area_id: '', list_index: '' };
      return (
        <div className="space-y-3">
          {renderNotchedField(
            'Key Area',
            <select
              value={keyAreaValue.key_area_id || ''}
              onChange={(e) => setFieldValue((prev) => ({ ...(prev || {}), key_area_id: e.target.value }))}
              className={notchedSelectCls}
            >
                <option value="">— Select Key Area —</option>
                {keyAreas.map((keyArea) => (
                  <option key={keyArea.id} value={keyArea.id}>
                    {keyArea.title || keyArea.name || keyArea.keyArea}
                  </option>
                ))}
              </select>,
            <IconChevron className="h-4 w-4 text-slate-500" />
          )}
          {renderNotchedField(
            'List',
            <select
              value={keyAreaValue.list_index || ''}
              onChange={(e) => setFieldValue((prev) => ({ ...(prev || {}), list_index: e.target.value }))}
              className={notchedSelectCls}
            >
                <option value="">— Select List —</option>
                {availableLists.map((listValue) => (
                  <option key={listValue} value={listValue}>
                    {resolvedListNames?.[listValue] || `List ${listValue}`}
                  </option>
                ))}
              </select>,
            <IconChevron className="h-4 w-4 text-slate-500" />
          )}
        </div>
      );
    }

    if (selectedField === 'key_area_id') {
      return renderNotchedField(
        'Key Area',
        <select
          value={fieldValue}
          onChange={(e) => setFieldValue(e.target.value)}
          className={notchedSelectCls}
        >
          <option value="">— Select Key Area —</option>
          {keyAreas.map((keyArea) => (
            <option key={keyArea.id} value={keyArea.id}>
              {keyArea.title || keyArea.name || keyArea.keyArea}
            </option>
          ))}
        </select>,
        <IconChevron className="h-4 w-4 text-slate-500" />
      );
    }

    if (selectedField === 'goalId') {
      return renderNotchedField(
        'Goal',
        <select
          value={fieldValue}
          onChange={(e) => setFieldValue(e.target.value)}
          className={notchedSelectCls}
        >
          <option value="">— Select Goal —</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.title || goal.name}
            </option>
          ))}
        </select>,
        <IconChevron className="h-4 w-4 text-slate-500" />
      );
    }

    return renderNotchedField(
      selectedFieldMeta?.label || 'Value',
      <input
        type="text"
        value={fieldValue}
        onChange={(e) => setFieldValue(e.target.value)}
        className={notchedInputCls}
      />
    );
  };

  return (
    <Modal open={isOpen} onClose={onCancel}>
      <div
        className="relative z-10 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden"
        style={{ width: '550px', minWidth: '300px' }}
      >
        <style>{`
          .no-calendar::-webkit-calendar-picker-indicator { display: none; -webkit-appearance: none; }
          .no-calendar::-webkit-clear-button, .no-calendar::-webkit-inner-spin-button { display: none; -webkit-appearance: none; }
          .no-calendar::-ms-clear { display: none; }
          .no-time-picker::-webkit-calendar-picker-indicator { display: none; -webkit-appearance: none; }
          .no-time-picker::-webkit-clear-button, .no-time-picker::-webkit-inner-spin-button { display: none; -webkit-appearance: none; }
          .no-time-picker::-ms-clear { display: none; }
        `}</style>
        <div className="px-5 py-3 border-b border-slate-200">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              {renderNotchedField(
                'Field',
                <select
                  autoFocus
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  className={notchedSelectCls}
                >
                  <option value="">Select field</option>
                  {fields.map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>,
                <IconChevron className="h-4 w-4 text-slate-500" />
              )}
            </div>

            <div>
              {renderValueEditor()}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => selectedField && onSave?.(selectedField, fieldValue)}
              disabled={!selectedField}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
