import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from './Modal';
import { FaCheck } from 'react-icons/fa';
import { useFormattedDate } from '../../hooks/useFormattedDate';
import DurationPicker from './DurationPicker.jsx';

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

function PopupSelectField({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Select',
  disabled = false,
}) {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });

  const normalizedValue = value == null ? '' : String(value);
  const normalizedOptions = useMemo(
    () =>
      options.map((option) => ({
        ...option,
        normalizedValue: option.value == null ? '' : String(option.value),
      })),
    [options],
  );

  const selectedOption =
    normalizedOptions.find((option) => option.normalizedValue === normalizedValue) || null;

  useEffect(() => {
    if (disabled && isOpen) setIsOpen(false);
  }, [disabled, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, 220);
      const estimatedHeight = Math.min(Math.max(normalizedOptions.length, 1), 7) * 44 + 16;
      const shouldOpenUpward =
        window.innerHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight;
      const top = shouldOpenUpward ? rect.top - estimatedHeight - 8 : rect.bottom + 8;
      const left = Math.min(
        window.innerWidth - width - 8,
        Math.max(8, rect.right - width),
      );
      setMenuPosition({ top: Math.max(8, top), left, width });
    };

    const handlePointerDown = (event) => {
      if (buttonRef.current?.contains(event.target)) return;
      if (menuRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, normalizedOptions.length]);

  return (
    <div style={{ minHeight: '64px' }}>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen((open) => !open);
        }}
        className="inline-flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="menu"
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-label={label}
      >
        <span className={`truncate ${selectedOption ? 'text-slate-900' : 'text-slate-500'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <IconChevron
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[160] rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`,
            }}
          >
            {normalizedOptions.map((option) => {
              const isSelected = option.normalizedValue === normalizedValue;
              return (
                <button
                  key={`${label}-${option.normalizedValue || 'empty'}`}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  onClick={() => {
                    onChange?.(option.normalizedValue);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                    isSelected
                      ? 'bg-slate-100 text-slate-900 shadow-sm'
                      : 'text-slate-800 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {isSelected ? <FaCheck className="h-3.5 w-3.5 shrink-0" /> : null}
                </button>
              );
            })}
          </div>,
          document.body,
        )
        : null}
    </div>
  );
}

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
  const notchedInputCls = 'w-full bg-transparent px-0 py-0 text-slate-900 outline-none placeholder-slate-400';
  const [selectedField, setSelectedField] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [dateAutoFill, setDateAutoFill] = useState({ end_date: true });
  const startDateInputRef = useRef(null);
  const endDateInputRef = useRef(null);
  const deadlineInputRef = useRef(null);
  const saveButtonRef = useRef(null);
  const fieldMenuButtonRef = useRef(null);
  const fieldMenuPopupRef = useRef(null);
  const [showFieldMenu, setShowFieldMenu] = useState(false);
  const [fieldMenuPosition, setFieldMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const { formatDate } = useFormattedDate();

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
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
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

  const renderPopupDropdownField = (label, value, onChange, options, placeholder, disabled = false) => (
    <PopupSelectField
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
  const renderDateField = (label, value, onChange, inputRef, nextRef = null) => {
    const inputValue = typeof value === 'string' ? value : '';

    return (
      <div style={{ minHeight: '64px' }}>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {label}
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            type="date"
            value={inputValue}
            onChange={onChange}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              const nextElement = nextRef?.current;
              if (nextElement) {
                nextElement.focus();
                if (typeof nextElement.showPicker === 'function') {
                  nextElement.showPicker();
                }
              }
            }}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200 no-calendar"
            aria-label={label}
          />
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              const input = inputRef?.current;
              if (!input) return;
              if (typeof input.showPicker === 'function') {
                input.showPicker();
              } else {
                input.focus();
                input.click();
              }
            }}
            className="absolute inset-y-0 right-2 grid place-items-center px-1 text-purple-600 appearance-none border-0 bg-transparent p-0 shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
            aria-label={`Open ${label} picker`}
          >
            <span className="text-base leading-none" aria-hidden="true">📅</span>
          </button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedField('');
      setFieldValue('');
      setDateAutoFill({ end_date: true });
      setShowFieldMenu(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedField === 'date') {
      setFieldValue({ start_date: '', end_date: '', deadline: '' });
      setDateAutoFill({ end_date: true });
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

  const orderedFields = useMemo(() => {
    if (!selectedField) return fields;
    const selected = fields.find((field) => field.value === selectedField);
    if (!selected) return fields;
    return [
      selected,
      ...fields.filter((field) => field.value !== selectedField),
    ];
  }, [fields, selectedField]);

  useEffect(() => {
    if (!showFieldMenu) return undefined;

    const updatePosition = () => {
      if (!fieldMenuButtonRef.current) return;
      const rect = fieldMenuButtonRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, 220);
      const top = rect.bottom + 8;
      const left = Math.min(
        window.innerWidth - width - 8,
        Math.max(8, rect.right - width),
      );
      setFieldMenuPosition({ top: Math.max(8, top), left, width });
    };

    const handlePointerDown = (event) => {
      if (fieldMenuButtonRef.current?.contains(event.target)) return;
      if (fieldMenuPopupRef.current?.contains(event.target)) return;
      setShowFieldMenu(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShowFieldMenu(false);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [orderedFields.length, showFieldMenu]);

  const resolvedListNames = useMemo(() => {
    if (selectedField !== 'key_area_bundle') return listNames || {};
    const keyAreaId = fieldValue?.key_area_id;
    if (keyAreaId && listNamesByKeyArea && listNamesByKeyArea[String(keyAreaId)]) {
      return listNamesByKeyArea[String(keyAreaId)];
    }
    return listNames || {};
  }, [fieldValue, listNames, listNamesByKeyArea, selectedField]);

  const keyAreaBundleListOptions = useMemo(() => {
    if (selectedField !== 'key_area_bundle') return [];
    const keyAreaId = fieldValue?.key_area_id;
    if (!keyAreaId) return [];
    return (availableLists || []).map((listValue) => ({
      value: listValue,
      label: resolvedListNames?.[listValue] || `List ${listValue}`,
    }));
  }, [availableLists, fieldValue, resolvedListNames, selectedField]);

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
      return renderPopupDropdownField(
        'Responsible',
        fieldValue,
        (nextValue) => setFieldValue(nextValue),
        [
          { value: '', label: '— Unassigned —' },
          ...users.map((user) => {
            const id = user.id || user.member_id;
            return {
              value: id,
              label: `${user.name || user.firstname || ''} ${user.lastname || ''}`.trim(),
            };
          }),
        ],
        '— Unassigned —',
      );
    }

    if (selectedField === 'priority') {
      return renderPopupDropdownField(
        'Priority',
        fieldValue,
        (nextValue) => setFieldValue(nextValue),
        [{ value: '', label: 'Select priority' }, ...priorityOptions],
        'Select priority',
      );
    }

    if (selectedField === 'status') {
      return renderPopupDropdownField(
        'Status',
        fieldValue,
        (nextValue) => setFieldValue(nextValue),
        [{ value: '', label: 'Select status' }, ...statusOptions],
        'Select status',
      );
    }

    if (selectedField === 'date') {
      const dateValue = fieldValue && typeof fieldValue === 'object'
        ? fieldValue
        : { start_date: '', end_date: '', deadline: '' };
      return (
        <div className="space-y-3">
          {renderDateField(
            'Start date',
            dateValue.start_date || '',
            (e) => {
              const nextValue = e.target.value;
              setFieldValue((prev) => {
                const current = prev && typeof prev === 'object'
                  ? prev
                  : { start_date: '', end_date: '', deadline: '' };
                const nextEndDate = (dateAutoFill.end_date || (current.end_date && current.end_date < nextValue))
                  ? nextValue
                  : current.end_date;
                return {
                  ...current,
                  start_date: nextValue,
                  end_date: nextEndDate,
                  deadline: current.deadline,
                };
              });
            },
            startDateInputRef,
            endDateInputRef,
          )}
          {renderDateField(
            'End date',
            dateValue.end_date || '',
            (e) => {
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
                    deadline: current.deadline,
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
            },
            endDateInputRef,
            deadlineInputRef,
          )}
          {renderDateField(
            'Deadline',
            dateValue.deadline || '',
            (e) => {
              setFieldValue((prev) => ({ ...(prev || {}), deadline: e.target.value }));
            },
            deadlineInputRef,
            saveButtonRef,
          )}
        </div>
      );
    }

    if (selectedField === 'start_date' || selectedField === 'end_date' || selectedField === 'deadline') {
      return renderDateField(
        selectedField === 'start_date' ? 'Start date' : selectedField === 'end_date' ? 'End date' : 'Deadline',
        fieldValue,
        (e) => setFieldValue(e.target.value),
        selectedField === 'start_date' ? startDateInputRef : selectedField === 'end_date' ? endDateInputRef : deadlineInputRef,
        saveButtonRef,
      );
    }

    if (selectedField === 'duration') {
      return (
        <div style={{ minHeight: '64px' }}>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Duration
          </label>
          <DurationPicker
            value={typeof fieldValue === 'string' ? fieldValue : ''}
            onChange={setFieldValue}
            className="w-full"
            hoursAriaLabel="Bulk edit duration hours"
            minutesAriaLabel="Bulk edit duration minutes"
          />
        </div>
      );
    }

    if (selectedField === 'key_area_bundle') {
      const keyAreaValue = fieldValue && typeof fieldValue === 'object'
        ? fieldValue
        : { key_area_id: '', list_index: '' };
      return (
        <div className="space-y-3">
          {renderPopupDropdownField(
            'Key Area',
            keyAreaValue.key_area_id || '',
            (nextValue) => setFieldValue((prev) => {
              const current = prev && typeof prev === 'object' ? prev : {};
              return {
                ...current,
                key_area_id: nextValue,
                list_index: nextValue ? '' : '',
              };
            }),
            [
              { value: '', label: '— Select Key Area —' },
              ...keyAreas.map((keyArea) => ({
                value: keyArea.id,
                label: keyArea.title || keyArea.name || keyArea.keyArea,
              })),
            ],
            '— Select Key Area —',
          )}
          {renderPopupDropdownField(
            'List',
            keyAreaValue.list_index || '',
            (nextValue) => setFieldValue((prev) => ({ ...(prev || {}), list_index: nextValue })),
            [
              {
                value: '',
                label: keyAreaValue.key_area_id ? '— Select List —' : '— Select Key Area First —',
              },
              ...keyAreaBundleListOptions,
            ],
            keyAreaValue.key_area_id ? '— Select List —' : '— Select Key Area First —',
            !keyAreaValue.key_area_id,
          )}
        </div>
      );
    }

    if (selectedField === 'key_area_id') {
      return renderPopupDropdownField(
        'Key Area',
        fieldValue,
        (nextValue) => setFieldValue(nextValue),
        [
          { value: '', label: '— Select Key Area —' },
          ...keyAreas.map((keyArea) => ({
            value: keyArea.id,
            label: keyArea.title || keyArea.name || keyArea.keyArea,
          })),
        ],
        '— Select Key Area —',
      );
    }

    if (selectedField === 'goalId') {
      return renderPopupDropdownField(
        'Goal',
        fieldValue,
        (nextValue) => setFieldValue(nextValue),
        [
          { value: '', label: '— Select Goal —' },
          ...goals.map((goal) => ({
            value: goal.id,
            label: goal.title || goal.name,
          })),
        ],
        '— Select Goal —',
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
              <div style={{ minHeight: '64px' }}>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Field
                </label>
                <button
                  ref={fieldMenuButtonRef}
                  type="button"
                  autoFocus
                  onClick={() => setShowFieldMenu((open) => !open)}
                  className="inline-flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-haspopup="menu"
                  aria-expanded={showFieldMenu ? 'true' : 'false'}
                  aria-label="Select field"
                >
                  <span className="truncate">{selectedFieldMeta?.label || 'Select field'}</span>
                  <IconChevron
                    className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                      showFieldMenu ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                </button>
                {showFieldMenu && typeof document !== 'undefined'
                  ? createPortal(
                    <div
                      ref={fieldMenuPopupRef}
                      role="menu"
                      className="fixed z-[160] rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                      style={{
                        top: `${fieldMenuPosition.top}px`,
                        left: `${fieldMenuPosition.left}px`,
                        width: `${fieldMenuPosition.width}px`,
                      }}
                    >
                      {orderedFields.map((field) => {
                        const isSelected = field.value === selectedField;
                        return (
                          <button
                            key={field.value}
                            type="button"
                            role="menuitemradio"
                            aria-checked={isSelected}
                            onClick={() => {
                              setSelectedField(field.value);
                              setShowFieldMenu(false);
                            }}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                              isSelected
                                ? 'bg-slate-100 text-slate-900 shadow-sm'
                                : 'text-slate-800 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <span className="min-w-0 flex-1 truncate">{field.label}</span>
                            {isSelected ? <FaCheck className="h-3.5 w-3.5 shrink-0" /> : null}
                          </button>
                        );
                      })}
                    </div>,
                    document.body,
                  )
                  : null}
              </div>
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
              ref={saveButtonRef}
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
