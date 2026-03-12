import React, { useEffect } from 'react';
import { useDraggable } from '../../hooks/useDraggable';
import { useResizable } from '../../hooks/useResizable';

const CALENDAR_PICKER_CSS = `
  .no-calendar::-webkit-calendar-picker-indicator { display: none; -webkit-appearance: none; }
  .no-calendar::-webkit-clear-button, .no-calendar::-webkit-inner-spin-button { display: none; -webkit-appearance: none; }
  .no-calendar::-ms-clear { display: none; }
`;

export default function TaskFormModalShell({
  isOpen,
  title,
  onClose,
  onSubmit,
  formId,
  children,
  footerStart = null,
  footerEnd = null,
  closeOnOverlayClick = true,
  formClassName = 'pm-notched-form flex-1 overflow-y-auto px-10 py-8',
  initialWidth = 600,
  initialHeight = 600,
  minWidth = 520,
  minHeight = 480,
}) {
  const { position, isDragging, handleMouseDown, handleMouseMove, handleMouseUp, resetPosition } = useDraggable();
  const { size, isDraggingResize, handleResizeMouseDown } = useResizable(initialWidth, initialHeight, minWidth, minHeight);

  useEffect(() => {
    if (!isDragging) return undefined;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isOpen) resetPosition();
  }, [isOpen, resetPosition]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-50 flex items-center justify-center overflow-hidden p-6 md:top-20 md:p-8">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" onClick={closeOnOverlayClick ? onClose : undefined} />
      <style>{CALENDAR_PICKER_CSS}</style>
      <div
        className="relative z-10 flex flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : isDraggingResize ? 'se-resize' : 'default',
          width: `${Math.max(size.width, minWidth)}px`,
          height: `min(${size.height}px, calc(100vh - 6rem))`,
          maxHeight: 'calc(100vh - 6rem)',
          minWidth: `${minWidth}px`,
          minHeight: `${minHeight}px`,
        }}
      >
        <div
          className="relative border-b border-slate-200 px-5 py-2 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
        >
          <h3 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-semibold text-slate-900">
            {title}
          </h3>
          <div className="flex items-center justify-end">
            <button
              type="button"
              data-draggable-cancel
              className="rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <form id={formId} className={formClassName} onSubmit={onSubmit}>
          {children}
        </form>

        {(footerStart || footerEnd) ? (
          <div className={`flex items-center gap-3 border-t border-slate-200/80 bg-white px-10 py-3 ${footerStart ? 'justify-between' : 'justify-end'}`}>
            {footerStart ? <div>{footerStart}</div> : null}
            {footerEnd ? <div className="flex items-center gap-3">{footerEnd}</div> : null}
          </div>
        ) : null}

        <div
          className="absolute top-0 right-0 h-full w-1 cursor-e-resize hover:bg-blue-500/20 transition-colors"
          style={{ zIndex: 40 }}
          onMouseDown={(event) => handleResizeMouseDown(event, 'right')}
        />
        <div
          className="absolute bottom-0 left-0 h-1 w-full cursor-s-resize hover:bg-blue-500/20 transition-colors"
          style={{ zIndex: 40 }}
          onMouseDown={(event) => handleResizeMouseDown(event, 'bottom')}
        />
        <div
          className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize rounded-tl hover:bg-blue-500/30 transition-colors"
          title="Drag to resize"
          style={{ zIndex: 41 }}
          onMouseDown={(event) => handleResizeMouseDown(event, 'se')}
        />
      </div>
    </div>
  );
}
