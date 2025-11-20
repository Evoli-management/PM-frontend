import React, { useEffect, useRef, useState } from "react";
import { FixedSizeList } from "react-window";
import AvailabilityBlock from "./AvailabilityBlock";
import { useCalendarPreferences } from "../../hooks/useCalendarPreferences";
import { generateTimeSlots } from "../../utils/timeUtils";
import { FaEdit, FaTrash } from "react-icons/fa";

function getWeekNumber(date) {
    const firstJan = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - firstJan) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + firstJan.getDay() + 1) / 7);
}

const defaultSlotSize = 30;

import { FaChevronLeft, FaChevronRight, FaChevronDown, FaBars } from "react-icons/fa";

const WeekView = ({
    currentDate,
    onShiftDate,
    onSetDate,
    onQuickCreate,
    events = [],
    todos = [],
    categories = {},
    onTaskDrop,
    onEventClick,
    onEventMove,
    onAddTaskOrActivity,
    onTaskClick,
    view,
    onChangeView,
    filterType,
    onChangeFilter,
    loading = false,
    activities = [],
}) => {
    const [slotSize, setSlotSize] = useState(defaultSlotSize);
    const { 
        timeSlots, 
        formattedTimeSlots, 
        workingHours, 
        formatTime,
        formatDate,
        loading: prefsLoading,
        updateSlotSize,
        isWorkingTime,
    } = useCalendarPreferences(slotSize);
    const [elephantTask, setElephantTask] = useState("");
    const [showViewMenu, setShowViewMenu] = useState(false);
    // Fixed time column width; day columns will flex to fill available space
    const TIME_COL_PX = 80; // matches w-20
    const containerRef = useRef(null);
    const tasksScrollRef = useRef(null);
    const [showTasksLeftCue, setShowTasksLeftCue] = useState(false);
    const [showTasksRightCue, setShowTasksRightCue] = useState(false);
    const weekScrollRef = useRef(null);
    const listOuterRef = useRef(null);
    // Track current time as ms so we can compute fractional minutes (minutes + seconds/60)
    const [nowMs, setNowMs] = useState(() => Date.now());
    // measured pixel height of a single slot row (read from DOM) — initialize to the same formula used for ITEM_SIZE
    const [measuredSlotPx, setMeasuredSlotPx] = useState(() => Math.round((slotSize / 30) * 38));
    const [listScrollTop, setListScrollTop] = useState(0);

    React.useEffect(() => {
        // Keep nowMs updated every 5 seconds so the now-line can use fractional minutes
        const update = () => setNowMs(Date.now());
        update();
        // align to next full second
        const msUntilNextSecond = 1000 - (Date.now() % 1000);
        const timeout = setTimeout(() => {
            update();
            const interval = setInterval(update, 5000);
            weekScrollRef.current && (weekScrollRef.current._nowInterval = interval);
        }, msUntilNextSecond);
        return () => {
            clearTimeout(timeout);
            if (weekScrollRef.current && weekScrollRef.current._nowInterval) {
                clearInterval(weekScrollRef.current._nowInterval);
            }
        };
    }, []);

    // Track FixedSizeList outer scroll so the now-line can be positioned relative to visible scroll
    React.useEffect(() => {
        const el = listOuterRef.current;
        if (!el) return;
        const onScroll = () => setListScrollTop(el.scrollTop || 0);
        el.addEventListener('scroll', onScroll, { passive: true });
        // initialize
        setListScrollTop(el.scrollTop || 0);

        // measure a rendered slot's height so px/min calculations match the DOM
        const measure = () => {
            try {
                const item = el.querySelector('[data-slot-index]');
                if (item) {
                    const h = item.getBoundingClientRect().height;
                    if (h && h > 0) setMeasuredSlotPx(h);
                }
            } catch (e) {}
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        window.addEventListener('resize', measure);

        return () => {
            el.removeEventListener('scroll', onScroll);
            ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [listOuterRef.current]);

    // Calculate week start (Monday)
    const weekStart = new Date(currentDate || new Date());
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const days = Array.from(
        { length: 7 },
        (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i),
    );
    
    // Use dynamic time slots from preferences; fallback to full-day slots if not available
    const slots = timeSlots.length > 0 ? timeSlots : generateTimeSlots("00:00", "24:00", slotSize);
    
    // Compute visual row height based on configured slotSize (minutes).
    // Keep 30min -> 38px as the reference and scale proportionally.
    const ITEM_SIZE = Math.round((slotSize / 30) * 38);
    const LIST_HEIGHT_PX = 400; // fixed viewport height for grid scroll
    const weekNum = getWeekNumber(weekStart);

    // No explicit width calculations; columns will flex to fit container

    // Update time slots when slot size changes
    useEffect(() => {
        if (updateSlotSize) {
            updateSlotSize(slotSize);
        }
    }, [slotSize, updateSlotSize]);
    useEffect(() => {
        const el = tasksScrollRef.current;
        if (!el) return;
        const onWheel = (e) => {
            if (e.deltaY !== 0 && !e.shiftKey) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    // Show/hide scroll cues based on overflow and position
    useEffect(() => {
        const el = tasksScrollRef.current;
        if (!el) return;
        const updateCues = () => {
            const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
            setShowTasksLeftCue(el.scrollLeft > 0);
            setShowTasksRightCue(el.scrollLeft < maxScrollLeft - 1);
        };
        updateCues();
        const onScroll = () => updateCues();
        el.addEventListener("scroll", onScroll);
        const ro = new ResizeObserver(updateCues);
        ro.observe(el);
        window.addEventListener("resize", updateCues);
        return () => {
            el.removeEventListener("scroll", onScroll);
            ro.disconnect();
            window.removeEventListener("resize", updateCues);
        };
    }, []);

    // Navigation handlers
    // Navigation is handled by container; keep internal handlers unused or remove if not needed
    // Drag-and-drop handler
    const handleDrop = (e, day, slot) => {
        try {
            const [h, m] = slot.split(":");
            const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(h), Number(m));
            const eventId = e.dataTransfer.getData("eventId");
            if (eventId) {
                const dur = parseInt(e.dataTransfer.getData("durationMs") || "0", 10);
                const newEnd = dur > 0 ? new Date(date.getTime() + dur) : null;
                onEventMove && onEventMove(eventId, date, newEnd);
                return;
            }
            const taskId = e.dataTransfer.getData("taskId");
            if (taskId) {
                onTaskDrop && onTaskDrop(taskId, date);
            }
        } catch (err) {
            console.warn("Drop failed", err);
        }
    };
    // Range label for the week
    const endOfWeek = new Date(weekStart);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    const weekLabel = `${formatDate(weekStart)} — ${formatDate(endOfWeek)}`;

    // Helper: does event start match this slot (rounded to nearest slot size)?
    const eventMatchesSlot = (startIso, day, slot, sizeMin) => {
        try {
            const ev = new Date(startIso);
            if (
                ev.getFullYear() !== day.getFullYear() ||
                ev.getMonth() !== day.getMonth() ||
                ev.getDate() !== day.getDate()
            )
                return false;
            const [sh, smRaw] = slot.split(":");
            const shNum = Number(sh);
            const smNum = Number(smRaw);
            let eh = ev.getHours();
            let em = ev.getMinutes();
            // round to nearest sizeMin (e.g., 30)
            const rounded = Math.round(em / sizeMin) * sizeMin;
            if (rounded === 60) {
                eh = eh + 1;
                em = 0;
            } else {
                em = rounded;
            }
            return eh === shNum && em === smNum;
        } catch {
            return false;
        }
    };

    return (
        <>
        <div className="p-0" style={{ overflow: "hidden" }}>
            {/* Header with navigation inside the view */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {/* Back first, then View dropdown */}
                    <button
                        className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                        style={{ minWidth: 36, minHeight: 36 }}
                        aria-label="Previous week"
                        onClick={() => onShiftDate && onShiftDate(-1)}
                    >
                        <FaChevronLeft />
                    </button>
                    <div className="relative">
                        <button
                            className="px-2 py-1 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center gap-2"
                            style={{ minWidth: 36, minHeight: 28 }}
                            onClick={() => setShowViewMenu((s) => !s)}
                            aria-haspopup="menu"
                            aria-expanded={showViewMenu ? "true" : "false"}
                        >
                            <span>View</span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                {view?.charAt(0).toUpperCase() + view?.slice(1)}
                            </span>
                            <FaChevronDown
                                className={`${showViewMenu ? "rotate-180" : "rotate-0"} transition-transform`}
                            />
                        </button>
                        {showViewMenu && (
                            <div
                                role="menu"
                                className="absolute z-50 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
                            >
                                {["day", "week", "month", "quarter", "list"].map((v) => (
                                    <button
                                        key={v}
                                        role="menuitemradio"
                                        aria-checked={view === v}
                                        className={`w-full text-left px-3 py-2 text-sm ${view === v ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
                                        onClick={() => {
                                            onChangeView && onChangeView(v);
                                            setShowViewMenu(false);
                                        }}
                                    >
                                        {v.charAt(0).toUpperCase() + v.slice(1)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    {weekLabel}
                    {(loading || prefsLoading) && (
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                            Loading
                        </span>
                    )}
                    {/* Working hours indicator removed — calendar now shows full day uniformly */}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                        style={{ minWidth: 36, minHeight: 36 }}
                        aria-label="Today"
                        onClick={() => onSetDate && onSetDate(new Date())}
                    >
                        Today
                    </button>
                    <select
                        className="px-2 py-1 rounded border text-sm font-semibold text-blue-900 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-700"
                        style={{ minHeight: 28 }}
                        value={filterType}
                        onChange={(e) => onChangeFilter && onChangeFilter(e.target.value)}
                        aria-label="Filter event types"
                    >
                        <option value="all">All</option>
                        <option value="meeting">Meeting</option>
                        <option value="focus">Focus</option>
                        <option value="custom">Custom</option>
                        <option value="green">Green</option>
                        <option value="red">Red</option>
                    </select>
                    <button
                        className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                        style={{ minWidth: 36, minHeight: 36 }}
                        aria-label="Next week"
                        onClick={() => onShiftDate && onShiftDate(1)}
                    >
                        <FaChevronRight />
                    </button>
                </div>
            </div>
            {/* Calendar grid */}
            <div ref={containerRef} className="no-scrollbar" style={{ overflowX: "hidden", overflowY: "hidden" }}>
                <div style={{ width: "100%" }}>
                    {/* Header stays fixed; only the grid below is vertically scrollable */}
                    <div className="no-scrollbar">
                        {/* Table for header and all-day row only */}
                        <table
                            className="min-w-full border border-gray-100 rounded-lg"
                            style={{
                                width: "100%",
                                tableLayout: "fixed",
                                borderCollapse: "separate",
                                borderSpacing: 0,
                            }}
                        >
                            <thead>
                                <tr className="bg-blue-50">
                                    <th
                                        className="text-left px-2 py-2 text-blue-500 text-base font-semibold rounded-tl-lg"
                                        style={{ width: TIME_COL_PX + "px" }}
                                    >
                                        all day
                                    </th>
                                    {days.map((date, dIdx) => (
                                        <th
                                            key={dIdx}
                                            className={`text-center px-2 py-2 text-blue-500 text-base font-semibold ${dIdx === days.length - 1 ? "rounded-tr-lg" : ""}`}
                                        >
                                            {formatDate(date, { includeWeekday: true, shortWeekday: true })}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td
                                            className="border-r border-gray-100 px-2 py-2 text-xs text-gray-500"
                                        style={{ width: TIME_COL_PX + "px" }}
                                    >
                                        all day
                                    </td>
                                    {days.map((date, dIdx) => (
                                        <td
                                            key={dIdx}
                                                className="border-r border-gray-100 px-2 py-2 text-center align-top"
                                        >
                                            <span className="text-gray-300">—</span>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                        {/* Time slots - virtualized as flexbox grid below the table */}
                        <div ref={weekScrollRef} className="w-full no-scrollbar" style={{ position: 'relative', width: "100%" }}>
                            <FixedSizeList
                                className="no-scrollbar"
                                height={LIST_HEIGHT_PX}
                                itemCount={slots.length}
                                itemSize={ITEM_SIZE}
                                width={undefined}
                                outerRef={listOuterRef}
                            >
                                {({ index, style }) => {
                                    const slot = slots[index];
                                    return (
                                        <div
                                                    key={index}
                                                    data-slot-index={index}
                                                    style={{ ...style, overflow: "visible", boxSizing: 'border-box' }}
                                                    className={`flex w-full bg-white`}
                                                >
                                            <div
                                                className="border-r border-gray-100 px-2 py-1 text-xs text-gray-500 flex-shrink-0 flex items-center justify-center relative"
                                                style={{ width: TIME_COL_PX + "px" }}
                                            >
                                                {/* Left indicator for non-working hours */}
                                                {isWorkingTime && !isWorkingTime(slot) && (
                                                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300/40 rounded-r-md" aria-hidden="true"></span>
                                                )}
                                                <span className="pl-2">{formatTime(slot)}</span>
                                            </div>
                                            {days.map((date, dIdx) => {
                                                const slotEvents = events.filter((ev) =>
                                                    eventMatchesSlot(ev.start, date, slot, slotSize) && !ev.taskId
                                                );
                                                return (
                                                        <div
                                                        key={dIdx}
                                                        className="border-r border-gray-100 px-2 py-1 align-top group flex items-center relative overflow-visible"
                                                        style={{ flex: "1 1 0", minWidth: 0, height: ITEM_SIZE, boxSizing: 'border-box' }}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={(e) => handleDrop(e, date, slot)}
                                                        onClick={(e) => {
                                                            try { e.stopPropagation(); } catch {}
                                                            const [h, m] = slot.split(":");
                                                            const dt = new Date(
                                                                date.getFullYear(),
                                                                date.getMonth(),
                                                                date.getDate(),
                                                                Number(h),
                                                                Number(m),
                                                            );
                                                            onQuickCreate && onQuickCreate(dt);
                                                        }}
                                                    >
                                                        {slotEvents.length === 0
                                                            ? null
                                                            : slotEvents.map((ev, i) => {
                                                                  const evStart = ev.start ? new Date(ev.start) : null;
                                                                  const evEnd = ev.end ? new Date(ev.end) : null;
                                                                  const startMs = evStart ? evStart.getTime() : 0;
                                                                  const endMs = evEnd ? evEnd.getTime() : 0;
                                                                  const durMs = endMs > startMs ? endMs - startMs : slotSize * 60000;
                                                                  const effectiveRowPx = measuredSlotPx || ITEM_SIZE;
                                                                  const heightPx = Math.max(effectiveRowPx * (durMs / (slotSize * 60000)) - 4, effectiveRowPx - 4);
                                                                  const [sh, sm] = slot.split(":");
                                                                  const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Number(sh), Number(sm));
                                                                  const withinSlotMin = evStart ? Math.max(0, Math.min(slotSize, (evStart.getTime() - slotStart.getTime()) / 60000)) : 0;
                                                                  const withinSlotTop = (withinSlotMin / slotSize) * (measuredSlotPx || ITEM_SIZE);
                                                                return (
                                                                          <div
                                                                              key={i}
                                                                              className={`px-2 py-1 rounded cursor-pointer flex items-center gap-1 overflow-hidden group ${categories[ev.kind]?.color || "bg-gray-200"}`}
                                                                              style={{
                                                                                  position: "absolute",
                                                                                  left: 2,
                                                                                  right: 2,
                                                                                  top: 2 + withinSlotTop,
                                                                                  height: heightPx,
                                                                                  zIndex: 5,
                                                                              }}
                                                                              draggable
                                                                              onDragStart={(e) => {
                                                                                  try {
                                                                                      e.dataTransfer.setData(
                                                                                          "eventId",
                                                                                          String(ev.id),
                                                                                      );
                                                                                      const dur = ev.end
                                                                                          ? new Date(ev.end).getTime() -
                                                                                            new Date(ev.start).getTime()
                                                                                          : 60 * 60 * 1000;
                                                                                      e.dataTransfer.setData(
                                                                                          "durationMs",
                                                                                          String(Math.max(dur, 0)),
                                                                                      );
                                                                                      e.dataTransfer.effectAllowed = "move";
                                                                                  } catch {}
                                                                              }}
                                                                              onClick={(e) => {
                                                                                  try { e.stopPropagation(); } catch {}
                                                                                  onEventClick && onEventClick(ev);
                                                                              }}
                                                                          >
                                                                          <span className="shrink-0">
                                                                              {categories[ev.kind]?.icon || ""}
                                                                          </span>
                                                                          <span
                                                                              className="truncate whitespace-nowrap text-xs min-w-0 flex-1"
                                                                              tabIndex={0}
                                                                              aria-label={ev.title}
                                                                          >
                                                                              {ev.title}
                                                                          </span>
                                                                          
                                                                          {/* Action Icons - shown on hover */}
                                                                          <div className="hidden group-hover:flex items-center gap-1 ml-2">
                                                                              <button
                                                                                  className="p-1 rounded hover:bg-black/10 transition-colors"
                                                                                  onClick={(e) => {
                                                                                      e.stopPropagation();
                                                                                      onEventClick && onEventClick(ev, 'edit');
                                                                                  }}
                                                                                  aria-label={`Edit ${ev.title}`}
                                                                                  title="Edit appointment"
                                                                              >
                                                                                  <FaEdit className="w-3 h-3 text-blue-600" />
                                                                              </button>
                                                                              <button
                                                                                  className="p-1 rounded hover:bg-black/10 transition-colors"
                                                                                  onClick={(e) => {
                                                                                      e.stopPropagation();
                                                                                      onEventClick && onEventClick(ev, 'delete');
                                                                                  }}
                                                                                  aria-label={`Delete ${ev.title}`}
                                                                                  title="Delete appointment"
                                                                              >
                                                                                  <FaTrash className="w-3 h-3 text-red-600" />
                                                                              </button>
                                                                          </div>
                                                                      </div>
                                                                  );
                                                              })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                }}
                            </FixedSizeList>
                            {/* Now line across week view: show only if the week contains today */}
                            {(() => {
                                const todayDate = new Date(nowMs);
                                // only show now-line if today is in the rendered week
                                const found = days.some(d => (
                                    d.getFullYear() === todayDate.getFullYear() &&
                                    d.getMonth() === todayDate.getMonth() &&
                                    d.getDate() === todayDate.getDate()
                                ));
                                if (!found) return null;
                                try {
                                    const firstSlot = slots[0] || '00:00';
                                    const lastSlot = slots[slots.length - 1] || '23:30';
                                    const [fh, fm] = firstSlot.split(':').map(Number);
                                    const [lh, lm] = lastSlot.split(':').map(Number);
                                    const startMinutes = fh * 60 + (fm || 0);
                                    const endMinutes = lh * 60 + (lm || 0) + slotSize;
                                    // compute fractional minutes from nowMs
                                    const nowDate = new Date(nowMs);
                                    const nowMinutesFloat = nowDate.getHours() * 60 + nowDate.getMinutes() + nowDate.getSeconds() / 60;
                                    if (nowMinutesFloat < startMinutes || nowMinutesFloat > endMinutes) return null;
                                    const pxPerMinute = (measuredSlotPx || ITEM_SIZE) / slotSize;
                                    const topPx = (nowMinutesFloat - startMinutes) * pxPerMinute;
                                    // adjust by current scrollTop so the line appears at the correct visible position
                                    const visibleTop = topPx - (listScrollTop || 0);
                                    // only render if within visible list viewport
                                    if (visibleTop < 0 || visibleTop > LIST_HEIGHT_PX - 2) return null;
                                    return (
                                        <div
                                            aria-hidden="true"
                                            style={{
                                                position: 'absolute',
                                                left: 0,
                                                right: 0,
                                                top: 0,
                                                transform: `translateY(${visibleTop}px)`,
                                                height: 2,
                                                background: '#ef4444',
                                                zIndex: 40,
                                                pointerEvents: 'none',
                                                transition: 'transform 4.5s linear',
                                                willChange: 'transform',
                                            }}
                                        />
                                    );
                                } catch (e) { return null; }
                            })()}
                        </div>
                    </div>
                    {/* Two rows: first for Add Task + task list, second for Add Activity + activity list */}
                    <div className="flex flex-col w-full bg-white border border-gray-100 rounded-b-lg mt-2">
                        {/* Row 1: Add Task + Task List */}
                        <div className="flex w-full border-b border-blue-50">
                            <div className="flex items-center p-2" style={{ width: TIME_COL_PX + "px" }}>
                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm whitespace-nowrap"
                                    style={{ minWidth: 110, minHeight: 36 }}
                                    onClick={() => onAddTaskOrActivity && onAddTaskOrActivity(currentDate || new Date(), { defaultTab: "task" })}
                                >
                                    <span style={{ fontWeight: "bold" }}>+</span>
                                    <span>Add task</span>
                                </button>
                            </div>
                            {/* Align task list start with activity list (use same ml-8 offset) */}
                            <div className="p-2 min-w-0 relative flex-1 flex items-center ml-8">
                                <div ref={tasksScrollRef} className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar">
                                    {(Array.isArray(todos) ? todos : []).map((t) => (
                                        <div
                                            key={t.id}
                                            draggable
                                            onDragStart={(e) => {
                                                try {
                                                    e.dataTransfer.setData("taskId", String(t.id));
                                                    e.dataTransfer.effectAllowed = "copy";
                                                } catch {}
                                            }}
                                            className="px-2 py-1 rounded border text-xs cursor-grab active:cursor-grabbing min-w-[160px] flex items-center gap-2 hover:opacity-90"
                                            style={{ backgroundColor: "#7ED4E3", borderColor: "#7ED4E3", color: "#0B4A53" }}
                                            title={t.title}
                                            onClick={() => onTaskClick && onTaskClick(String(t.id))}
                                        >
                                            <div className="truncate font-medium">{t.title}</div>
                                        </div>
                                    ))}
                                </div>
                                {/* Scroll cues and buttons */}
                                {showTasksLeftCue && (
                                    <>
                                        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent" />
                                        <button
                                            type="button"
                                            className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-700 border border-slate-200 rounded-full p-1 shadow pointer-events-auto"
                                            aria-label="Scroll left"
                                            onClick={() =>
                                                tasksScrollRef.current?.scrollBy({ left: -200, behavior: "smooth" })
                                            }
                                        >
                                            <FaChevronLeft />
                                        </button>
                                    </>
                                )}
                                {showTasksRightCue && (
                                    <>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
                                        <button
                                            type="button"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-700 border border-slate-200 rounded-full p-1 shadow pointer-events-auto"
                                            aria-label="Scroll right"
                                            onClick={() =>
                                                tasksScrollRef.current?.scrollBy({ left: 200, behavior: "smooth" })
                                            }
                                        >
                                            <FaChevronRight />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        {/* Row 2: Add Activity + Activity List */}
                        <div className="flex w-full">
                            <div className="flex items-center p-2" style={{ width: TIME_COL_PX + "px" }}>
                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm whitespace-nowrap"
                                    style={{ minWidth: 110, minHeight: 36 }}
                                    onClick={() => onAddTaskOrActivity && onAddTaskOrActivity(currentDate || new Date(), { defaultTab: "activity" })}
                                >
                                    <span style={{ fontWeight: "bold" }}>+</span>
                                    <span>Add activity</span>
                                </button>
                            </div>
                            <div className="p-2 min-w-0 flex-1 flex items-center ml-8">
                                <div className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar">
                                    {(Array.isArray(activities) ? activities : []).map((a) => (
                                        <div
                                            key={a.id}
                                            draggable
                                            onDragStart={(e) => {
                                                try {
                                                    e.dataTransfer.setData("activityId", String(a.id || ""));
                                                    e.dataTransfer.setData("activityText", String(a.text || a.title || "Activity"));
                                                    e.dataTransfer.effectAllowed = "copyMove";
                                                } catch {}
                                            }}
                                            className="px-2 py-1 rounded border text-xs cursor-grab active:cursor-grabbing min-w-[160px] flex items-center gap-2 hover:opacity-90"
                                            style={{ backgroundColor: "#7ED4E3", borderColor: "#7ED4E3", color: "#0B4A53" }}
                                            title={a.text || a.title}
                                        >
                                            <FaBars aria-hidden="true" />
                                            <div className="truncate font-medium">{a.text || a.title}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Removed To-Do List Panel per request */}
        </div>
        </>
    );
};

export default WeekView;
