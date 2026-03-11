import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaChevronDown, FaEdit, FaTrash } from 'react-icons/fa';

const DEFAULT_OPTIONS = [
    { value: 'edit', label: 'Select field' },
    { value: 'delete', label: 'Delete', variant: 'danger' },
];

export default function MassActionMenu({
    label = 'Mass Edit',
    ariaLabel = 'Mass action',
    disabled = false,
    onSelect,
    options = DEFAULT_OPTIONS,
    title,
}) {
    const buttonRef = useRef(null);
    const menuRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 196 });
    const safeOptions = useMemo(
        () => (Array.isArray(options) && options.length > 0 ? options : DEFAULT_OPTIONS),
        [options],
    );
    const isEnabled = !disabled;

    useEffect(() => {
        if (disabled && isOpen) setIsOpen(false);
    }, [disabled, isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const updatePosition = () => {
            if (!buttonRef.current) return;
            const rect = buttonRef.current.getBoundingClientRect();
            const width = Math.max(rect.width, 196);
            const estimatedHeight = safeOptions.length * 44 + 16;
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
    }, [isOpen, safeOptions]);

    const handleSelect = async (value) => {
        setIsOpen(false);
        if (typeof onSelect === 'function') await onSelect(value);
    };

    return (
        <div className="relative inline-block">
            <button
                ref={buttonRef}
                type="button"
                disabled={disabled}
                aria-label={ariaLabel}
                aria-haspopup="menu"
                aria-expanded={isOpen ? 'true' : 'false'}
                title={title}
                onClick={() => {
                    if (disabled) return;
                    setIsOpen((current) => !current);
                }}
                className={`inline-flex h-[30px] min-w-[140px] items-center justify-between gap-2.5 rounded-md border border-emerald-500 px-2.5 text-sm font-semibold text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:border-emerald-500 disabled:text-slate-900 disabled:shadow-sm ${
                    isEnabled
                        ? 'bg-emerald-100 hover:bg-emerald-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 disabled:bg-emerald-50'
                }`}
            >
                <span className="truncate">{label}</span>
                <FaChevronDown
                    className={`h-3 w-3 shrink-0 text-emerald-500 transition-transform ${
                        isOpen ? 'rotate-180' : 'rotate-0'
                    }`}
                />
            </button>

            {isOpen && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          ref={menuRef}
                          role="menu"
                          className="fixed z-[140] rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                          style={{
                              top: `${menuPosition.top}px`,
                              left: `${menuPosition.left}px`,
                              width: `${menuPosition.width}px`,
                          }}
                      >
                          {safeOptions.map((option) => {
                              const isDanger = option.variant === 'danger';
                              const Icon = option.value === 'delete' ? FaTrash : FaEdit;

                              return (
                                  <button
                                      key={option.value}
                                      type="button"
                                      role="menuitem"
                                      onClick={() => handleSelect(option.value)}
                                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                                          isDanger
                                              ? 'text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                                              : 'text-slate-800 hover:bg-slate-50 hover:text-slate-900'
                                      }`}
                                  >
                                      <span
                                      className={`inline-flex h-5 w-5 items-center justify-center rounded-md border ${
                                              isDanger
                                                  ? 'border-rose-200 text-rose-500'
                                                  : 'border-slate-200 text-slate-500'
                                          }`}
                                      >
                                          <Icon className="h-3 w-3" />
                                      </span>
                                      <span>{option.label}</span>
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
