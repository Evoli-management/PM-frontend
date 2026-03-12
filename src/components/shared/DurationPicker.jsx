import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { durationToTimeInputValue } from '../../utils/duration';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
const WHEEL_ROW_HEIGHT = 38;
const WHEEL_VIEWPORT_HEIGHT = 152;
const WHEEL_SIDE_PADDING = (WHEEL_VIEWPORT_HEIGHT - WHEEL_ROW_HEIGHT) / 2;

const getDurationParts = (value) => {
  const normalized = durationToTimeInputValue(value);
  const match = String(normalized || '').match(/^(\d{2}):([0-5]\d)$/);
  if (!match) return { hours: '', minutes: '' };
  return { hours: match[1], minutes: match[2] };
};

const getDraftState = (value) => {
  const parts = getDurationParts(value);
  return {
    hours: parts.hours || '00',
    minutes: parts.minutes || '00',
    cleared: !parts.hours || !parts.minutes,
  };
};

export default function DurationPicker({
  value = '',
  onChange,
  disabled = false,
  className = '',
  triggerClassName = '',
  selectClassName = '',
  compact = false,
  allowClear = true,
  hoursAriaLabel = 'Duration hours',
  minutesAriaLabel = 'Duration minutes',
  clearAriaLabel = 'Clear duration',
  autoFocus = false,
  onClose,
}) {
  const parts = useMemo(() => getDurationParts(value), [value]);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const hoursWheelRef = useRef(null);
  const minutesWheelRef = useRef(null);
  const wheelSyncRef = useRef({ hours: false, minutes: false });
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0, width: 0 });
  const [draft, setDraft] = useState(() => getDraftState(value));

  const triggerClass = compact
    ? 'h-8 min-h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-900'
    : 'rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm';

  const triggerVisualClass = compact
    ? `${triggerClass} ${triggerClassName}`.trim()
    : (triggerClassName || triggerClass);

  const baseSelectClass = compact
    ? 'h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900'
    : 'h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm';

  const updatePanelPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, compact ? 200 : 244);
    const estimatedHeight = 208;
    const shouldOpenUpward =
      window.innerHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight;
    const top = shouldOpenUpward ? rect.top - estimatedHeight - 8 : rect.bottom + 8;
    const left = Math.min(
      window.innerWidth - width - 8,
      Math.max(8, rect.right - width),
    );
    setPanelPosition({ top: Math.max(8, top), left, width });
  };

  const getCommittedValue = () => (draft.cleared ? '' : `${draft.hours}:${draft.minutes}`);

  const closePicker = (reason = 'dismiss', nextValue = null) => {
    setIsOpen(false);
    onClose?.(reason, nextValue);
  };

  const syncWheel = (wheelRef, options, selectedValue, key) => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    const optionIndex = Math.max(0, options.indexOf(selectedValue));
    const nextScrollTop = optionIndex * WHEEL_ROW_HEIGHT;
    wheelSyncRef.current[key] = true;
    wheel.scrollTo({ top: nextScrollTop, behavior: 'auto' });
    window.requestAnimationFrame(() => {
      wheelSyncRef.current[key] = false;
    });
  };

  const handleWheelScroll = (event, options, key) => {
    if (wheelSyncRef.current[key]) return;
    const optionIndex = Math.max(
      0,
      Math.min(options.length - 1, Math.round(event.currentTarget.scrollTop / WHEEL_ROW_HEIGHT)),
    );
    const nextValue = options[optionIndex];
    setDraft((current) => ({ ...current, [key]: nextValue, cleared: false }));
  };

  const handleWheelSelect = (key, nextValue) => {
    setDraft((current) => ({ ...current, [key]: nextValue, cleared: false }));
  };

  useEffect(() => {
    if (!autoFocus || disabled) return;
    setIsOpen(true);
  }, [autoFocus, disabled]);

  useEffect(() => {
    if (!isOpen) return undefined;

    updatePanelPosition();
    setDraft(getDraftState(value));

    const handlePointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      if (panelRef.current?.contains(event.target)) return;
      closePicker('dismiss', value || '');
    };

    const handleFocusIn = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      if (panelRef.current?.contains(event.target)) return;
      closePicker('dismiss', value || '');
    };

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closePicker('escape', value || '');
    };

    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    syncWheel(hoursWheelRef, HOUR_OPTIONS, draft.hours, 'hours');
    syncWheel(minutesWheelRef, MINUTE_OPTIONS, draft.minutes, 'minutes');
    const target = panelRef.current?.querySelector('[data-wheel="hours"]') || triggerRef.current;
    target?.focus?.();
  }, [draft.hours, draft.minutes, isOpen]);

  const displayValue = parts.hours && parts.minutes ? `${parts.hours}:${parts.minutes}` : 'HH:MM';
  const hasValue = Boolean(parts.hours && parts.minutes);
  const draftValue = draft.cleared ? 'HH:MM' : `${draft.hours}:${draft.minutes}`;

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        autoFocus={autoFocus}
        onClick={() => {
          if (disabled) return;
          if (isOpen) {
            closePicker('dismiss');
            return;
          }
          updatePanelPosition();
          setIsOpen(true);
        }}
        className={`relative flex w-full items-center text-left ${triggerVisualClass}`.trim()}
        style={{ borderStyle: 'solid', borderWidth: 1, borderColor: '#cbd5e1' }}
        aria-haspopup="dialog"
        aria-expanded={isOpen ? 'true' : 'false'}
      >
        <span className={`block min-w-0 flex-1 truncate ${hasValue ? 'text-slate-900' : 'text-slate-500'}`}>
          {displayValue}
        </span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 transition-transform ${
            compact
              ? 'right-2 h-4 w-4 text-slate-500'
              : 'right-4 h-5 w-5 text-blue-500'
          } ${isOpen ? 'rotate-180' : ''}`}
        >
          <path
            fill="currentColor"
            d="M6.7 8.7a1 1 0 0 1 1.4 0L12 12.6l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.1a1 1 0 0 1 0-1.4Z"
          />
        </svg>
      </button>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[180] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
            style={{
              top: `${panelPosition.top}px`,
              left: `${panelPosition.left}px`,
              width: `${panelPosition.width}px`,
            }}
            role="dialog"
            aria-label="Duration picker"
          >
            <div className="border-b border-slate-200 px-2.5 py-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">HH:MM</div>
                  <div className="text-xs font-semibold text-slate-900">{draftValue}</div>
                </div>
                {allowClear && (
                  <button
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, cleared: true }))}
                    disabled={draft.cleared}
                    aria-label={clearAriaLabel}
                    className="rounded-lg border border-slate-300 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="relative px-2.5 py-1.5">
              <div className="pointer-events-none absolute left-2.5 right-2.5 top-1/2 z-0 h-[38px] -translate-y-1/2 rounded-lg bg-slate-100 ring-1 ring-slate-200" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-xl font-semibold text-slate-500">:</div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                <div
                  ref={hoursWheelRef}
                  data-wheel="hours"
                  tabIndex={0}
                  aria-label={hoursAriaLabel}
                  onScroll={(event) => handleWheelScroll(event, HOUR_OPTIONS, 'hours')}
                  className="relative z-10 h-[152px] overflow-y-auto rounded-lg focus:outline-none"
                  style={{ scrollbarWidth: 'none' }}
                >
                  <div style={{ paddingTop: `${WHEEL_SIDE_PADDING}px`, paddingBottom: `${WHEEL_SIDE_PADDING}px` }}>
                    {HOUR_OPTIONS.map((hour) => {
                      const isSelected = !draft.cleared && draft.hours === hour;
                      return (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => handleWheelSelect('hours', hour)}
                          className={`block w-full text-center text-[20px] transition-colors ${
                            isSelected ? 'font-semibold text-slate-950' : 'font-medium text-slate-400'
                          }`}
                          style={{ height: `${WHEEL_ROW_HEIGHT}px`, lineHeight: `${WHEEL_ROW_HEIGHT}px` }}
                        >
                          {hour}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="w-3" />

                <div
                  ref={minutesWheelRef}
                  aria-label={minutesAriaLabel}
                  onScroll={(event) => handleWheelScroll(event, MINUTE_OPTIONS, 'minutes')}
                  className="relative z-10 h-[152px] overflow-y-auto rounded-lg focus:outline-none"
                  style={{ scrollbarWidth: 'none' }}
                >
                  <div style={{ paddingTop: `${WHEEL_SIDE_PADDING}px`, paddingBottom: `${WHEEL_SIDE_PADDING}px` }}>
                    {MINUTE_OPTIONS.map((minute) => {
                      const isSelected = !draft.cleared && draft.minutes === minute;
                      return (
                        <button
                          key={minute}
                          type="button"
                          onClick={() => handleWheelSelect('minutes', minute)}
                          className={`block w-full text-center text-[20px] transition-colors ${
                            isSelected ? 'font-semibold text-slate-950' : 'font-medium text-slate-400'
                          }`}
                          style={{ height: `${WHEEL_ROW_HEIGHT}px`, lineHeight: `${WHEEL_ROW_HEIGHT}px` }}
                        >
                          {minute}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => closePicker('cancel', value || '')}
                className="px-1.5 py-0.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const committedValue = getCommittedValue();
                  onChange?.(committedValue);
                  closePicker('done', committedValue);
                }}
                className="px-1.5 py-0.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                OK
              </button>
            </div>
          </div>,
          document.body,
        )
        : null}
    </div>
  );
}
