import React, { useState, useEffect, useRef } from "react";
import { useCalendarPreferences } from "../../hooks/useCalendarPreferences";
import calendarService from "../../services/calendarService";

// Load activityService on demand to keep it out of the main chunk
let _activityService = null;
const getActivityService = async () => {
  if (_activityService) return _activityService;
  const mod = await import("../../services/activityService");
  _activityService = mod?.default || mod;
  return _activityService;
};
// Helper: compute text color (dark or white) for a hex background
function hexToRgb(hex) {
  if (!hex) return null;
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}
function getContrastTextColor(hex) {
  try {
    const c = hexToRgb(hex);
    if (!c) return '#0B4A53';
    const srgb = [c.r, c.g, c.b]
      .map((v) => v / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    const lum = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    return lum > 0.6 ? '#0B4A53' : '#ffffff';
  } catch (e) {
    return '#0B4A53';
  }
}

// Treat an end timestamp of exactly midnight as the inclusive end of that day
// so an end of 2025-10-23T00:00:00 will cover 2025-10-23 as expected.
function adjustEndInclusive(ed) {
  try {
    if (!ed) return ed;
    const d = new Date(ed);
    if (isNaN(d.getTime())) return d;
    if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0) {
      // move to 23:59:59.999 of the same date
      return new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
    }
    return d;
  } catch (e) {
    return ed;
  }
}
import { FaChevronDown, FaEdit, FaTrash } from "react-icons/fa";

// DayView props: startHour, endHour, slotMinutes, hourHeight
export default function DayView({
  startHour = 0,
  endHour = 24,
  slotMinutes = 15,
  hourHeight = 64,
  currentDate: propDate,
  onSetDate,
  onShiftDate,
  view: propView,
  onChangeView,
  onQuickCreate,
  onAddTaskOrActivity,
  categories = {},
  events = [],
  todos = [],
  activitiesByTask = {},
  unattachedActivities = [],
  loading = false,
  onEventClick,
  onEventMove,
  onTaskDrop,
  onActivityDrop,
  onTaskClick,
  onActivityClick,
}) {

  // Always render the full 24-hour grid; non-working slots will be greyed
  // Always render the full 24-hour grid; non-working slots will be greyed
  const {
    timeSlots,
    formattedTimeSlots,
    workingHours,
    formatTime,
    formatDate,
    loading: prefsLoading,
    updateSlotSize,
    isWorkingTime,
  } = useCalendarPreferences(slotMinutes);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const HOUR_HEIGHT = hourHeight;

  // current time position
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  // For full-day display, start at 00:00 and show 24 hours
  const startMinutes = 0;
  const totalMinutes = 24 * 60;
  const minutesFromStart = Math.max(0, Math.min(nowMinutes - startMinutes, totalMinutes));
  const nowTop = (minutesFromStart / 60) * HOUR_HEIGHT;

  // header + view state
  const [currentDate, setCurrentDate] = useState(propDate || new Date());
  const [view, setView] = useState(propView || "day");
  const [showViewMenu, setShowViewMenu] = useState(false);
  const viewMenuRef = useRef(null);

  // Sidebar data: todos, appointments and activities for selected day
  const [sideTodos, setSideTodos] = useState([]);
  const [sideAppointments, setSideAppointments] = useState([]);
  const [sideActivities, setSideActivities] = useState([]);
  const [loadingSidebar, setLoadingSidebar] = useState(false);
  const [keyAreaMap, setKeyAreaMap] = useState({});

  // transient resizing state for pointer-based resize (top/bottom handles)
  const [resizing, setResizing] = useState(null);
  // flag to suppress click immediately after a resize operation
  const justResizedRef = useRef(false);

  const isToday = (() => {
    const d = currentDate || new Date();
    const t = new Date();
    return (
      d.getFullYear() === t.getFullYear() &&
      d.getMonth() === t.getMonth() &&
      d.getDate() === t.getDate()
    );
  })();

  useEffect(() => {
    function onDocClick(e) {
      if (!viewMenuRef.current) return;
      if (!viewMenuRef.current.contains(e.target)) setShowViewMenu(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setShowViewMenu(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (typeof onChangeView === "function") onChangeView(view);
  }, [view, onChangeView]);

  useEffect(() => {
    if (propDate && propDate.getTime && propDate.getTime() !== currentDate.getTime()) {
      setCurrentDate(propDate);
    }
  }, [propDate]);

  useEffect(() => {
    if (propView && propView !== view) {
      setView(propView);
    }
  }, [propView]);

  // Pointer-based resize helper (top/bottom handles) — mirrors WeekView behavior in a simpler form.
  const startResize = (ev, apptObj, side) => {
    try {
      ev.stopPropagation();
      ev.preventDefault();
      const pointerId = ev.pointerId;
      ev.target.setPointerCapture && ev.target.setPointerCapture(pointerId);

      const parseDate = (s) => {
        try {
          const d = new Date(s);
          return isNaN(d.getTime()) ? null : d;
        } catch (_) {
          return null;
        }
      };

      const origStart = parseDate(apptObj.startDate || apptObj.start || apptObj.from || apptObj.begin || apptObj.date) || new Date();
      const origEnd = parseDate(apptObj.endDate || apptObj.end || apptObj.to || apptObj.finish || apptObj.date) || new Date(origStart.getTime() + 60 * 60 * 1000);

      const state = {
        id: apptObj.id || apptObj._id || apptObj.eventId || apptObj.uid || String(Math.random()),
        side, // 'top' or 'bottom'
        origStart,
        origEnd,
        startY: ev.clientY,
        pxPerMinute: HOUR_HEIGHT / 60,
        previewStart: null,
        previewEnd: null,
        previewTop: null,
        previewHeight: null,
      };
      setResizing(state);

      const minDurationMinutes = 15;

      const onPointerMove = (mv) => {
        try {
          setResizing((curr) => {
            if (!curr || curr.id !== state.id) return curr;
            const deltaY = mv.clientY - curr.startY;
            const deltaMinutes = deltaY / Math.max(0.0001, curr.pxPerMinute);

            let newStart = new Date(curr.origStart.getTime());
            let newEnd = new Date(curr.origEnd.getTime());
            if (curr.side === "top") {
              newStart = new Date(curr.origStart.getTime() + Math.round(deltaMinutes * 60000));
              const minStartTime = newEnd.getTime() - minDurationMinutes * 60000;
              if (newStart.getTime() > minStartTime) newStart = new Date(minStartTime);
            } else {
              newEnd = new Date(curr.origEnd.getTime() + Math.round(deltaMinutes * 60000));
              const minEndTime = newStart.getTime() + minDurationMinutes * 60000;
              if (newEnd.getTime() < minEndTime) newEnd = new Date(minEndTime);
            }

            const newStartMins = newStart.getHours() * 60 + newStart.getMinutes() + newStart.getSeconds() / 60;
            const newEndMins = newEnd.getHours() * 60 + newEnd.getMinutes() + newEnd.getSeconds() / 60;
            const topPx = (newStartMins - startMinutes) / 60 * HOUR_HEIGHT;
            const heightPx = Math.max(18, (newEndMins - newStartMins) / 60 * HOUR_HEIGHT);

            return { ...curr, previewStart: newStart, previewEnd: newEnd, previewTop: topPx, previewHeight: heightPx };
          });
        } catch (__) {}
      };

      const onPointerUp = (up) => {
        try {
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          setResizing((curr) => {
            if (!curr || curr.id !== state.id) return null;
            const finalStart = curr.previewStart || curr.origStart;
            const finalEnd = curr.previewEnd || curr.origEnd;
            try {
              if (typeof onEventMove === "function") {
                onEventMove && onEventMove(curr.id, finalStart, finalEnd);
              }
            } catch (__) {}
            // mark that a resize just happened to suppress the following click event
            try {
              justResizedRef.current = true;
              setTimeout(() => { justResizedRef.current = false; }, 300);
            } catch (__){ }
            return null;
          });
        } catch (__) {}
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp, { once: true });
    } catch (__) {}
  };

  // navigation
  const goPrevDay = () => {
    if (typeof onShiftDate === "function") return onShiftDate(-1);
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    onSetDate?.(d);
    setCurrentDate(d);
  };
  const goNextDay = () => {
    if (typeof onShiftDate === "function") return onShiftDate(1);
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    onSetDate?.(d);
    setCurrentDate(d);
  };
  const goToday = () => {
    const d = new Date();
    onSetDate?.(d);
    setCurrentDate(d);
  };

  const headerWeekday =
    currentDate && currentDate.toLocaleDateString
      ? currentDate.toLocaleDateString(undefined, { weekday: "long" })
      : "";
  const headerDate =
    currentDate && currentDate.toLocaleDateString
      ? currentDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : "";

  // Load sidebar items (todos/appointments/activities) for the selected day
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        setLoadingSidebar(true);
        const start = new Date(currentDate);
        const end = new Date(currentDate);
        // day range: 00:00 -> 23:59:59 for the selected day
        const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0);
        const dayEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);

        // To ensure multi-day tasks (tasks that started earlier or end later) are
        // visible on every day in their range, ask for a slightly wider window
        // and then filter client-side for items that overlap the selected day.
        // This avoids depending on backend semantics about whether `listTodos`
        // returns items that merely overlap vs. those that start inside the range.
        const padDays = 7; // fetch +/- 7 days to give a reasonable buffer
        const fetchFrom = new Date(dayStart.getTime() - padDays * 24 * 60 * 60 * 1000).toISOString();
        const fetchTo = new Date(dayEnd.getTime() + padDays * 24 * 60 * 60 * 1000).toISOString();

        const [rawTodos, apps] = await Promise.all([
          calendarService.listTodos({ from: fetchFrom, to: fetchTo }).catch(() => []),
          calendarService.listAppointments({ from: dayStart.toISOString(), to: dayEnd.toISOString() }).catch(() => []),
        ]);

        // client-side filter to only keep todos that overlap the selected day
        const tds = (Array.isArray(rawTodos) ? rawTodos : []).filter((t) => {
          try {
            const s = t.startDate || t.start_date || t.date || t.dueDate || t.due_date || null;
            const e = t.endDate || t.end_date || t.date || t.dueDate || t.due_date || null;
            if (!s || !e) return false;
            const sd = new Date(s);
            const ed = new Date(e);
            if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return false;
            const edAdjusted = adjustEndInclusive(ed);
            // overlap test: task overlaps the selected day
            return sd <= dayEnd && edAdjusted >= dayStart;
          } catch (_) {
            return false;
          }
        });

        if (ignore) return;
        setSideTodos(Array.isArray(tds) ? tds : []);
        setSideAppointments(Array.isArray(apps) ? apps : []);

        // Load key areas to map colors for tasks when categories mapping is not present
        try {
          const kaMod = await import("../../services/keyAreaService");
          const kaSvc = kaMod?.default || kaMod;
          const areas = await kaSvc.list().catch(() => []);
          const map = {};
          (areas || []).forEach((a) => {
            if (a && a.id) map[String(a.id)] = a;
          });
          if (!ignore) setKeyAreaMap(map);
        } catch (__) {
          if (!ignore) setKeyAreaMap({});
        }

        // Fetch activities for todos on this day
        try {
          const todosForDay = (Array.isArray(tds) ? tds : []).filter((t) => {
            try {
              const todayOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
              let start = new Date(t.startDate || t.start_date || t.date || t.dueDate || t.due_date || null);
              let end = new Date(t.endDate || t.end_date || t.date || t.dueDate || t.due_date || null);
              if (isNaN(start.getTime())) start = todayOnly;
              if (isNaN(end.getTime())) end = todayOnly;
              return start <= todayOnly && todayOnly <= end;
            } catch (_) {
              return false;
            }
          });
          const uniqueIds = Array.from(new Set(todosForDay.map((t) => String(t.id))));
          const pairs = await Promise.all(
            uniqueIds.map(async (id) => {
              try {
                const svc = await getActivityService();
                const list = await svc.list({ taskId: id }).catch(() => []);
                return Array.isArray(list) ? list : [];
              } catch (_) {
                return [];
              }
            }),
          );
          const flat = ([]).concat(...pairs).filter(Boolean);
          if (!ignore) setSideActivities(flat);
        } catch (e) {
          if (!ignore) setSideActivities([]);
        }
      } catch (e) {
        if (!ignore) {
          setSideTodos([]);
          setSideAppointments([]);
          setSideActivities([]);
        }
      } finally {
        if (!ignore) setLoadingSidebar(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [currentDate]);
  // Sidebar subcomponents to simplify JSX and avoid nested ternary/fragment parsing issues
  const TasksBox = () => (
    <div className="flex flex-col h-full">
      <div className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-slate-300 bg-white text-slate-800 font-medium mb-2">
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="w-4 h-4 text-[#4DC3D8] shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <path d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z"></path>
        </svg>
        <span>Tasks</span>
      </div>

  <div className="w-full rounded border border-slate-200 bg-slate-50 p-2 overflow-visible flex-1">
        {loadingSidebar ? (
          <div className="text-[11px] text-slate-500 text-center">Loading…</div>
        ) : (((Array.isArray(todos) && todos.length) || (sideTodos && sideTodos.length)) ? (
          <div className="flex flex-col gap-2">
            {(Array.isArray(todos) && todos.length ? todos : sideTodos).slice(0,12).map((t) => {
              const kindKey = t.kind || t.type || t.kindName || null;
              const cat = (kindKey && categories && categories[kindKey]) ? categories[kindKey] : null;
              const ka = (t.keyAreaId || t.key_area_id) ? keyAreaMap[String(t.keyAreaId || t.key_area_id)] : null;
              const DEFAULT_BAR_COLOR = '#4DC3D8';
              const bgClass = cat?.color || null; // tailwind class e.g. 'bg-blue-500'
              const kaColor = (ka && ka.color) ? ka.color : null;
              const finalBg = bgClass ? null : (kaColor || DEFAULT_BAR_COLOR);
              const textColor = finalBg ? getContrastTextColor(finalBg) : '#ffffff';
              const style = bgClass ? undefined : { backgroundColor: finalBg, borderColor: finalBg, color: textColor };
              return (
                <div
                  key={t.id}
                  draggable={true}
                  onDragStart={(e) => {
                    try {
                      e.dataTransfer.setData("taskId", String(t.id));
                      e.dataTransfer.effectAllowed = "copy";
                    } catch (_) {}
                  }}
                  className={`px-2 py-1 rounded border text-xs cursor-grab active:cursor-grabbing w-full flex items-center gap-2 hover:opacity-90 ${bgClass || ''}`}
                  style={style}
                  title={t.title || t.name || 'Untitled'}
                >
                  <div className="truncate font-medium">{t.title || t.name || 'Untitled'}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 text-center">No tasks</div>
        ))}
      </div>
      <div className="mt-2">
        <button
          type="button"
          onClick={() => onAddTaskOrActivity && onAddTaskOrActivity(currentDate || new Date(), { defaultTab: 'task' })}
          className="w-full inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
        >
          Add task
        </button>
      </div>
    </div>
  );

  const ActivitiesBox = () => (
    <>
    <div className="flex flex-col h-full">
      <div className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-slate-300 bg-white text-slate-800 font-medium mb-2">
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="w-4 h-4 text-[#4DC3D8] shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z" />
        </svg>
        <span>Activities</span>
      </div>

      <div className="w-full rounded border border-slate-200 bg-slate-50 p-2 overflow-visible flex-1">
      {loadingSidebar ? (
        <div className="text-[11px] text-slate-500 text-center">Loading…</div>
      ) : (
        <>
          {((Array.isArray(unattachedActivities) && unattachedActivities.length) || (sideActivities && sideActivities.length)) ? (
            <div className="flex flex-col gap-2">
                {(Array.isArray(unattachedActivities) && unattachedActivities.length ? unattachedActivities : sideActivities).slice(0,12).map((a, i) => {
                const kindKey = a.kind || a.type || null;
                const cat = (kindKey && categories && categories[kindKey]) ? categories[kindKey] : null;
                let ka = null;
                if (a.keyAreaId || a.key_area_id) {
                  ka = keyAreaMap[String(a.keyAreaId || a.key_area_id)];
                } else if (a.taskId || a.task_id) {
                  const parent = sideTodos.find((t) => String(t.id) === String(a.taskId || a.task_id));
                  if (parent) {
                    ka = keyAreaMap[String(parent.keyAreaId || parent.key_area_id)];
                  }
                }
                const DEFAULT_BAR_COLOR = '#4DC3D8';
                const bgClass = cat?.color || null;
                const kaColor = (ka && ka.color) ? ka.color : null;
                const finalBg = bgClass ? null : (kaColor || DEFAULT_BAR_COLOR);
                const textColor = finalBg ? getContrastTextColor(finalBg) : '#ffffff';
                const style = bgClass ? undefined : { backgroundColor: finalBg, borderColor: finalBg, color: textColor };
                const svgColor = textColor || '#ffffff';
                return (
                  <div
                    key={a.id || i}
                    draggable={true}
                    onDragStart={(e) => {
                      try {
                        e.dataTransfer.setData("activityId", String(a.id || ""));
                        e.dataTransfer.setData("activityText", String(a.text || a.title || "Activity"));
                        e.dataTransfer.effectAllowed = "copyMove";
                      } catch (_) {}
                    }}
                    className={`px-2 py-1 rounded border text-xs w-full flex items-center gap-2 ${bgClass || ''}`}
                    style={style}
                    title={a.text || a.desc || a.note || 'Activity'}
                  >
                    <svg
                      stroke="currentColor"
                      fill="currentColor"
                      strokeWidth="0"
                      viewBox="0 0 448 512"
                      className="w-4 h-4 shrink-0"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ color: svgColor }}
                    >
                      <path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z" />
                    </svg>

                    <div className="truncate">{a.text || a.desc || a.note || 'Activity'}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 text-center">No activities</div>
          )}
        </>
      )}
    </div>

    <div className="mt-2">
      <button
        type="button"
        onClick={() => onAddTaskOrActivity && onAddTaskOrActivity(currentDate || new Date(), { defaultTab: 'activity' })}
        className="w-full inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
      >
        Add activity
      </button>
    </div>
    </div>
    </>
  );

  return (
    <div className="px-4 md:px-8">
  <div className="flex items-start gap-1">
        <div className="flex-1">
          {/* compact header */}
          <div className="w-full mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={goPrevDay}
                  className="px-2 py-2 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                  aria-label="Previous day"
                  style={{ minWidth: 36, minHeight: 36 }}
                >
                  {/* left chevron */}
                  <svg
                    stroke="currentColor"
                    fill="currentColor"
                    strokeWidth="0"
                    viewBox="0 0 320 512"
                    height="1em"
                    width="1em"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M34.52 239.03L228.87 44.69c9.37-9.37 24.57-9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z"></path>
                  </svg>
                </button>

                <div className="relative" ref={viewMenuRef}>
                  <button
                    onClick={() => setShowViewMenu((s) => !s)}
                    className="px-2 py-1 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center gap-2"
                    aria-haspopup="menu"
                    aria-expanded={showViewMenu ? "true" : "false"}
                    style={{ minWidth: 36, minHeight: 28 }}
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
                          className={`w-full text-left px-3 py-2 text-sm ${
                            view === v
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                          onClick={() => {
                            onChangeView?.(v);
                            setView(v);
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
                {headerWeekday}, {headerDate}
              </h2>

              <div className="flex items-center gap-2">
                <button
                  onClick={goToday}
                  className="px-2 py-2 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                  aria-label="Today"
                  style={{ minWidth: 36, minHeight: 36 }}
                >
                  Today
                </button>

                <button
                  onClick={goNextDay}
                  className="px-2 py-2 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                  aria-label="Next day"
                  style={{ minWidth: 36, minHeight: 36 }}
                >
                  {/* right chevron */}
                  <svg
                    stroke="currentColor"
                    fill="currentColor"
                    strokeWidth="0"
                    viewBox="0 0 320 512"
                    height="1em"
                    width="1em"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569-9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* CALENDAR CARD */}
          <div
            className="bg-white border border-blue-50 rounded-lg shadow-sm p-3 pr-2 overflow-hidden"
            style={{ height: 500 }}
          >
            <div className="w-full bg-white flex flex-col text-sm text-gray-700" style={{ height: "100%" }}>
              {/* all-day strip: show tasks that span multiple days with continuation indicators */}
              <div className="flex">
                <div className="w-20 bg-white text-xs text-gray-500">
                  <div className="h-10 flex items-center">
                    <span className="ml-2 px-2 py-1 rounded bg-emerald-500 text-white text-[11px] font-semibold">
                      All-Day
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  {/* make all-day area able to stack full-width bars for multi-day tasks */}
                  <div className="border-b border-gray-200 px-2 py-1">
                    <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
                      {(() => {
                        try {
                          const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0, 0);
                          const dayEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59, 999);
                          // combine side-loaded todos and events passed from container so multi-day tasks/events
                          // (appointments) show in the all-day strip as they do in WeekView
                          const combinedSource = [];
                          // Prefer parent `todos` for up-to-date edits, but also include
                          // `sideTodos` fetched locally (overlapping multi-day tasks).
                          // Merge them and de-duplicate by id so tasks found by the
                          // local overlap query are still visible even if the parent
                          // passed a narrower set.
                          const parentTodos = Array.isArray(todos) ? todos : [];
                          const localTodos = Array.isArray(sideTodos) ? sideTodos : [];
                          const mergedTodos = [
                            ...parentTodos,
                            ...localTodos.filter((lt) => !parentTodos.some((pt) => String(pt.id || pt._id) === String(lt.id || lt._id)))
                          ];
                          mergedTodos.forEach((t) => combinedSource.push({ ...t, __src: 'todo' }));
                          const todoIds = new Set(mergedTodos.map((t) => String(t.id || t._id || t.taskId || t.task_id || "")));
                          (Array.isArray(events) ? events : []).forEach((e) => {
                            try {
                              const linkedTaskId = String(e.taskId || e.task_id || "");
                              if (linkedTaskId && todoIds.has(linkedTaskId)) return; // skip event; todo covers it
                            } catch (_) {}
                            combinedSource.push({ ...e, __src: 'event' });
                          });
                          // de-duplicate by id/title when both sources overlap
                          const seen = new Set();
                          const multiDay = combinedSource.filter((t) => {
                            try {
                              // simple dedupe key
                              const dedupeId = String(t.id || t._id || t.eventId || (t.title || t.name || t.summary) || JSON.stringify(t)).slice(0, 128);
                              if (seen.has(dedupeId)) return false;
                              seen.add(dedupeId);

                              const s = t.startDate || t.start || t.start_date || t.from || t.begin || t.date || t.dueDate || t.due_date || null;
                              const e = t.endDate || t.end || t.end_date || t.to || t.finish || t.date || t.dueDate || t.due_date || null;
                              if (!s || !e) return false;
                              const sd = new Date(s);
                              const ed = new Date(e);
                              if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return false;
                              // Normalize end dates: treat a midnight end as the inclusive end-of-day so
                              // an End Date of 2025-10-23 covers 2025-10-23 as expected.
                              const edAdjusted = adjustEndInclusive(ed);
                              // include items that span more than a single calendar day (compare date-only using adjusted end)
                              const sameDay = (sd.getFullYear() === edAdjusted.getFullYear() && sd.getMonth() === edAdjusted.getMonth() && sd.getDate() === edAdjusted.getDate());
                              if (sameDay) return false;
                              // include only those that overlap this day using the adjusted end
                              return sd <= dayEnd && edAdjusted >= dayStart;
                            } catch (_) { return false; }
                          });

                          if (!multiDay || multiDay.length === 0) return null;

                          return multiDay.map((t) => {
                            try {
                              const s = t.startDate || t.start_date || t.date || t.dueDate || t.due_date || null;
                              const e = t.endDate || t.end_date || t.date || t.dueDate || t.due_date || null;
                              const sd = new Date(s);
                              const ed = new Date(e);
                              const edAdjusted = adjustEndInclusive(ed);
                              const startedBefore = sd < dayStart;
                              const endsAfter = edAdjusted > dayEnd;
                              const title = t.title || t.name || t.summary || 'Task';
                              // color resolution for all-day multi-day task bar (match WeekView/Day appointments)
                              const kindKey = t.kind || t.type || t.kindName || null;
                              const cat = (kindKey && categories && categories[kindKey]) ? categories[kindKey] : null;
                              const bgClass = cat?.color || null;
                              let ka = null;
                              if (t.keyAreaId || t.key_area_id) ka = keyAreaMap[String(t.keyAreaId || t.key_area_id)];
                              else if (t.taskId || t.task_id) ka = keyAreaMap[String(t.taskId || t.task_id)];
                              const kaColor = ka && ka.color ? ka.color : null;
                              const DEFAULT_BAR_COLOR = '#4DC3D8';
                              const finalBg = bgClass ? null : (kaColor || DEFAULT_BAR_COLOR);
                              const textColor = finalBg ? getContrastTextColor(finalBg) : '#ffffff';
                              const styleBar = bgClass ? undefined : { backgroundColor: finalBg, borderColor: finalBg, color: textColor };

                              return (
                                <div key={`allday-${t.id || title}`} className="w-full">
                                  <button
                                    type="button"
                                    onClick={() => onTaskClick && onTaskClick(t)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded text-xs truncate ${bgClass || ''}`}
                                    style={{ ...(styleBar || {}), width: '100%' }}
                                    title={title}
                                  >
                                    <span className="shrink-0 text-sm" style={{ color: textColor || ((styleBar && styleBar.color) || undefined) }}>
                                        {startedBefore ? (
                                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 320 512" className="w-4 h-4 inline-block flex-shrink-0" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" style={{ color: textColor || ((styleBar && styleBar.color) || undefined) }}>
                                            <path d="M34.52 239.03L228.87 44.69c9.37-9.37 24.57-9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z"></path>
                                          </svg>
                                        ) : ''}
                                    </span>
                                    <span className="flex-1 truncate">{title}</span>
                                    <span className="shrink-0 text-sm" style={{ color: textColor || ((styleBar && styleBar.color) || undefined) }}>
                                      {endsAfter ? (
                                        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 320 512" className="w-4 h-4 inline-block flex-shrink-0" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" style={{ color: textColor || ((styleBar && styleBar.color) || undefined) }}>
                                          <path d="M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569-9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z"></path>
                                        </svg>
                                      ) : ''}
                                    </span>
                                  </button>
                                </div>
                              );
                            } catch (_) { return null; }
                          });
                        } catch (e) { return null; }
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* MAIN SCROLL AREA */}
              <div className="flex-1 flex min-h-0" style={{ overflowX: "hidden", overflowY: "auto" }}>
                {/* LEFT TIME COLUMN – clearer hourly rows */}
                <div className="w-20 bg-white text-xs text-gray-500 min-h-0">
                  <div
                    className="relative border-r border-gray-200"
                    style={{ height: HOUR_HEIGHT * hours.length }}
                  >
                    {hours.map((h) => {
                      const hourIso = `${String(h).padStart(2,'0')}:00`;
                      const hourLabel = formatTime ? formatTime(hourIso) : hourIso;
                      const hourIsWorking = isWorkingTime ? isWorkingTime(hourIso) : (h >= sH && h < eH);
                      return (
                        <div
                          key={h}
                          className="relative flex items-start border-b border-gray-100"
                          style={{ height: HOUR_HEIGHT, backgroundColor: hourIsWorking ? undefined : '#f8fafc' }}
                        >
                          <span className={`absolute top-1 right-1 text-[11px] ${hourIsWorking ? 'text-gray-500' : 'text-gray-400'}`}>
                            {hourLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT GRID */}
                <div className="flex-1 bg-white min-h-0">
                  <div
                    className="relative"
                    style={{ height: HOUR_HEIGHT * hours.length }}
                  >
                    {/* clearer grid slots */}
                    {(() => {
                      const segmentsPerHour = Math.floor(60 / slotMinutes);
                      const segmentHeight = (HOUR_HEIGHT * slotMinutes) / 60;

                      const rows = [];

                      hours.forEach((h) => {
                        for (let i = 0; i < segmentsPerHour; i++) {
                          const minute = i * slotMinutes;
                          // solid at 0 and 30 minutes, dotted at 15 and 45 (when slotMinutes is 15)
                          const isSolid = minute % 30 === 0;
                          const isDotted = !isSolid && minute % 15 === 0;

                          let borderClasses = "";
                          if (isSolid) {
                            borderClasses = "border-t border-slate-300"; // solid at 0 and 30
                          } else if (isDotted) {
                            borderClasses = "border-t border-dotted border-slate-200"; // dotted at 15 and 45
                          }

                          const slotTimeStr = `${String(h).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
                          const slotIsWorking = isWorkingTime ? isWorkingTime(slotTimeStr) : true;

                          rows.push(
                            <div
                              key={`${h}-${minute}`}
                              role="button"
                              tabIndex={0}
                              className={`w-full ${borderClasses}`}
                              style={{ height: segmentHeight, cursor: "pointer", backgroundColor: slotIsWorking ? undefined : '#f8fafc' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (typeof onQuickCreate === "function") {
                                  const base = currentDate || new Date();
                                  const dt = new Date(
                                    base.getFullYear(),
                                    base.getMonth(),
                                    base.getDate(),
                                    h,
                                    minute,
                                    0,
                                    0
                                  );
                                  onQuickCreate(dt);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (typeof onQuickCreate === "function") {
                                    const base = currentDate || new Date();
                                    const dt = new Date(
                                      base.getFullYear(),
                                      base.getMonth(),
                                      base.getDate(),
                                      h,
                                      minute,
                                      0,
                                      0
                                    );
                                    onQuickCreate(dt);
                                  }
                                }
                              }}
                              onDragOver={(e) => {
                                try { e.preventDefault(); } catch (_) {}
                              }}
                              onDrop={(e) => {
                                try {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const data = e.dataTransfer;
                                  const eventId = data.getData("eventId");
                                  const taskId = data.getData("taskId");
                                  const activityId = data.getData("activityId");
                                  const durationMs = parseInt(data.getData("durationMs") || "0", 10);
                                  const base = currentDate || new Date();
                                  const dt = new Date(
                                    base.getFullYear(),
                                    base.getMonth(),
                                    base.getDate(),
                                    h,
                                    minute,
                                    0,
                                    0
                                  );
                                  if (eventId && typeof onEventMove === "function") {
                                    const newEnd = durationMs > 0 ? new Date(dt.getTime() + durationMs) : null;
                                    onEventMove(eventId, dt, newEnd);
                                    return;
                                  }
                                  if (taskId && typeof onTaskDrop === "function") {
                                    const dropEffect = data.dropEffect || data.effectAllowed || "";
                                    onTaskDrop(taskId, dt, dropEffect);
                                    return;
                                  }
                                  if (activityId && typeof onActivityDrop === "function") {
                                    const dropEffect = data.dropEffect || data.effectAllowed || "";
                                    onActivityDrop(activityId, dt, dropEffect);
                                    return;
                                  }
                                } catch (__) {}
                              }}
                            />
                          );
                        }
                      });

                      return rows;
                      })()}

                      {/* appointments positioned in the grid */}
                      {/* prefer events passed in from parent (CalendarContainer) when available
                          so moves performed in the parent immediately reflect in Day view
                          (CalendarContainer updates `events` after calling the backend). */}
                      {(() => {
                        // Use events prop (merged events+appointments from container) when present,
                        // otherwise fall back to locally loaded `sideAppointments`.
                        const source = (Array.isArray(events) && events.length) ? events : sideAppointments;
                        return (Array.isArray(source) ? source : []).map((appt, idx) => {
                        // robust date parsing
                        const parseDate = (s) => {
                          if (!s) return null;
                          try {
                            const d = new Date(s);
                            return isNaN(d.getTime()) ? null : d;
                          } catch (_) {
                            return null;
                          }
                        };

                        const start = parseDate(appt.startDate || appt.start_date || appt.start || appt.from || appt.begin || appt.date);
                        const end = parseDate(appt.endDate || appt.end_date || appt.end || appt.to || appt.finish || appt.date);
                        if (!start || !end) return null;

                        // skip appointments outside visible hours
                        const apptStartMins = start.getHours() * 60 + start.getMinutes() + start.getSeconds() / 60;
                        const apptEndMins = end.getHours() * 60 + end.getMinutes() + end.getSeconds() / 60;
                        if (apptEndMins <= startMinutes || apptStartMins >= startMinutes + totalMinutes) return null;

                        const topPx = Math.max(0, ((apptStartMins - startMinutes) / 60) * HOUR_HEIGHT);
                        const durationMins = Math.max(15, (apptEndMins - apptStartMins));
                        const heightPx = Math.max(18, (durationMins / 60) * HOUR_HEIGHT);

                        // color resolution: category -> keyArea -> default
                        const kindKey = appt.kind || appt.type || appt.kindName || null;
                        const cat = (kindKey && categories && categories[kindKey]) ? categories[kindKey] : null;
                        const bgClass = cat?.color || null;
                        // try key area from appointment or (if present) parent task
                        let ka = null;
                        if (appt.keyAreaId || appt.key_area_id) ka = keyAreaMap[String(appt.keyAreaId || appt.key_area_id)];
                        else if (appt.taskId || appt.task_id) ka = keyAreaMap[String(appt.taskId || appt.task_id)];
                        const kaColor = ka && ka.color ? ka.color : null;
                        const DEFAULT_BAR_COLOR = '#4DC3D8';
                        const finalBg = bgClass ? null : (kaColor || DEFAULT_BAR_COLOR);
                        const textColor = finalBg ? getContrastTextColor(finalBg) : '#ffffff';
                        const style = bgClass ? undefined : { top: topPx + 'px', height: heightPx + 'px', left: '6px', right: '8px', backgroundColor: finalBg, borderColor: finalBg, color: textColor };

                        const title = appt.title || appt.name || appt.summary || appt.text || 'Appointment';

                        return (
                          <div
                            key={`appt-${idx}-${title}`}
                            className={`absolute rounded px-2 py-1 text-xs overflow-hidden flex items-center gap-2 group ${bgClass || ''}`}
                            style={bgClass ? { top: topPx + 'px', height: heightPx + 'px', left: '6px', right: '8px', zIndex: 5 } : { ...style, zIndex: 5 }}
                            draggable
                            onDragStart={(e) => {
                              try {
                                e.dataTransfer.setData("eventId", String(appt.id || appt._id || appt.eventId || appt.uid || title));
                                const dur = end.getTime() - start.getTime();
                                e.dataTransfer.setData("durationMs", String(Math.max(dur, 0)));
                                e.dataTransfer.effectAllowed = "move";
                              } catch (__) {}
                            }}
                            onClick={(e) => {
                              try {
                                e.stopPropagation();
                                // suppress click immediately after a pointer resize to avoid opening the edit modal
                                if (justResizedRef && justResizedRef.current) return;
                              } catch (__) {}
                              onEventClick && onEventClick(appt);
                            }}
                            title={title}
                          >
                            <span className="shrink-0">{categories[appt.kind]?.icon || ""}</span>
                            <span className="truncate whitespace-nowrap text-xs min-w-0 flex-1 cursor-grab active:cursor-grabbing" tabIndex={0} aria-label={title}>{title}</span>

                            {/* top resize handle */}
                            <div
                              role="separator"
                              aria-orientation="horizontal"
                              onPointerDown={(e) => startResize(e, appt, 'top')}
                              className="absolute left-0 right-0 h-2 -top-1 cursor-ns-resize"
                              style={{ zIndex: 10 }}
                            />

                            {/* bottom resize handle */}
                            <div
                              role="separator"
                              aria-orientation="horizontal"
                              onPointerDown={(e) => startResize(e, appt, 'bottom')}
                              className="absolute left-0 right-0 h-2 -bottom-1 cursor-ns-resize"
                              style={{ zIndex: 10 }}
                            />

                            {/* Action Icons - shown on hover */}
                            <div className="hidden group-hover:flex items-center gap-1 ml-2">
                              <button
                                className="p-1 rounded hover:bg-black/10 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventClick && onEventClick(appt, 'edit');
                                }}
                                aria-label={`Edit ${title}`}
                                title="Edit appointment"
                              >
                                <FaEdit className="w-3 h-3 text-blue-600" />
                              </button>
                              <button
                                className="p-1 rounded hover:bg-black/10 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // prefer explicit delete handler so parent can show a popover anchored to the click
                                  if (typeof onDeleteRequest === 'function') return onDeleteRequest(appt, e);
                                  onEventClick && onEventClick(appt, 'delete');
                                }}
                                aria-label={`Delete ${title}`}
                                title="Delete appointment"
                              >
                                <FaTrash className="w-3 h-3 text-red-600" />
                              </button>
                            </div>

                            {/* live preview will be rendered after the mapping (global) */}
                          </div>
                        );
                        });
                      })()}

                      {/* live preview while resizing */}
                      {resizing && resizing.previewTop != null && (
                        <div
                          className="absolute rounded pointer-events-none border-2 border-dashed border-slate-400 bg-slate-200/30"
                          style={{ top: resizing.previewTop + 'px', left: '6px', right: '8px', height: resizing.previewHeight + 'px', zIndex: 20 }}
                        >
                          <div className="absolute -top-6 left-2 bg-black text-white text-[11px] px-2 py-0.5 rounded">
                            {resizing.previewStart ? (formatTime ? formatTime(`${String(resizing.previewStart.getHours()).padStart(2,'0')}:${String(resizing.previewStart.getMinutes()).padStart(2,'0')}`) : `${String(resizing.previewStart.getHours()).padStart(2,'0')}:${String(resizing.previewStart.getMinutes()).padStart(2,'0')}`) : ''}
                            {' — '}
                            {resizing.previewEnd ? (formatTime ? formatTime(`${String(resizing.previewEnd.getHours()).padStart(2,'0')}:${String(resizing.previewEnd.getMinutes()).padStart(2,'0')}`) : `${String(resizing.previewEnd.getHours()).padStart(2,'0')}:${String(resizing.previewEnd.getMinutes()).padStart(2,'0')}`) : ''}
                          </div>
                        </div>
                      )}

                      {/* current time line */}
                    {isToday && (
                      <div
                        className="absolute left-0 right-0 flex items-center pointer-events-none"
                        style={{ top: nowTop }}
                      >
                        <span className="ml-[-32px] bg-red-500 text-white text-[10px] px-1 rounded-full">
                          {formatTime ? formatTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`) : `${String(now.getHours()).padStart(2, "0")}:
                          ${String(now.getMinutes()).padStart(2, "0")}`}
                        </span>
                        <div className="flex-1 border-t border-red-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* END SCROLL AREA */}
            </div>
          </div>
        </div>

  {/* Sidebar: Quick actions panel */}
  <div className="w-80 md:w-96 flex-shrink-0 -mr-4 md:-mr-8">
          <div className="sticky top-2">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-2 mb-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-stretch">
                <div className="h-full">
                  <TasksBox />
                </div>
                <div className="h-full">
                  <ActivitiesBox />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}