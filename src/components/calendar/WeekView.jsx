import React, { useEffect, useRef, useState } from "react";
import { FixedSizeList } from "react-window";
import { useTranslation } from 'react-i18next';
import AvailabilityBlock from "./AvailabilityBlock";
import { useCalendarPreferences } from "../../hooks/useCalendarPreferences";
import { generateTimeSlots } from "../../utils/timeUtils";
import { FaEdit, FaTrash, FaCheck, FaEllipsisV } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight, FaChevronDown, FaBars } from "react-icons/fa";
import CalendarViewTopSection from "./CalendarViewTopSection";

function getWeekNumber(date) {
  const firstJan = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - firstJan) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + firstJan.getDay() + 1) / 7);
}

const defaultSlotSize = 30;
const MIN_BOTTOM_PANEL_HEIGHT = 104;
const DEFAULT_HOUR_HEIGHT_PX = 60;
const DENSE_HOUR_HEIGHT_PX_15MIN = 96;
// Match the rendered height of a 15-minute timed appointment block in week grid
// (24px slot minus 1px top inset and 1px bottom inset = 22px).
const ALL_DAY_BAR_HEIGHT_PX = Math.max(
  16,
  Math.round((DENSE_HOUR_HEIGHT_PX_15MIN * 15) / 60) - 4
);

const getSlotPixelHeight = (slotSizeMinutes) => {
  const safeMinutes = Math.max(1, Number(slotSizeMinutes) || defaultSlotSize);
  const hourHeight = safeMinutes === 15 ? DENSE_HOUR_HEIGHT_PX_15MIN : DEFAULT_HOUR_HEIGHT_PX;
  return Math.round((hourHeight * safeMinutes) / 60);
};

function toDisplayIndex(value) {
  if (value === null || typeof value === "undefined" || value === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const i = Math.trunc(n);
  if (i === 0) return 1;
  return i > 0 ? i : 0;
}

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
  onActivityDrop,
  view,
  onChangeView,
  filterType,
  onChangeFilter,
  loading = false,
  activities = [],
  workWeek = false,
  setWorkWeek = () => {},
  onTaskComplete = null,
  onTaskEdit = null,
  onTaskDelete = null,
  onActivityComplete = null,
  onActivityEdit = null,
  onActivityDelete = null,
  // ✅ was referenced but not provided in your snippet; keep safe
  onDeleteRequest = null,
  slotSizeMinutes = 30,
  onToggleSlotSize = null,
  elephantTaskRow = null,
}) => {
  const { t } = useTranslation();
  const [slotSize, setSlotSize] = useState(slotSizeMinutes || defaultSlotSize);
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

  // Visual constants for non-working hour styling — keep consistent with MonthView
  const NON_WORK_BG = "#f1f5f9";
  const NON_WORK_OPACITY = 1;

  const [elephantTask, setElephantTask] = useState("");
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showSlotMenu, setShowSlotMenu] = useState(false);
  const [colOverlay, setColOverlay] = useState(null);
  const [allDayOverflow, setAllDayOverflow] = useState(null);
  const [hoveredQuickCreateCell, setHoveredQuickCreateCell] = useState(null);
  const [dragOverTimeSlot, setDragOverTimeSlot] = useState(null);
  const [dragOverBottomDayKey, setDragOverBottomDayKey] = useState(null);
  const [mobileDragItem, setMobileDragItem] = useState(null);
  const [mobileDragPending, setMobileDragPending] = useState(null);
  const mobileDragItemRef = useRef(null);
  const mobileDragPendingRef = useRef(null);
  const mobileDropHandledRef = useRef(false);
  const dragOverTimeSlotRef = useRef(null);
  const dragOverBottomDayKeyRef = useRef(null);
  const lastMobileDragStartRef = useRef(0);

  // Fixed time column width; day columns will flex to fill available space
  const TIME_COL_PX = 48;

  const containerRef = useRef(null);
  const headerBlockRef = useRef(null);
  const bottomSplitterRef = useRef(null);
  const tasksScrollRef = useRef(null);
  const [showTasksLeftCue, setShowTasksLeftCue] = useState(false);
  const [showTasksRightCue, setShowTasksRightCue] = useState(false);
  const weekScrollRef = useRef(null);
  const listOuterRef = useRef(null);
  const menuOpenTimerRef = useRef(null);
  const allDayPopupRef = useRef(null);
  const viewMenuRef = useRef(null);
  const slotMenuRef = useRef(null);
  const quickAddMenuRef = useRef(null);
  const LEFT_QUICK_ADD_MENU_KEY = "__left_quick_add__";
  const [columnWidth, setColumnWidth] = useState(null);
  const allDayTrackRef = useRef(null);
  const [allDayTrackWidth, setAllDayTrackWidth] = useState(0);
  const [allDayColumnEdges, setAllDayColumnEdges] = useState([]);
  const [keyAreaMap, setKeyAreaMap] = useState({});
  const [keyAreaOrderMap, setKeyAreaOrderMap] = useState({});
  const [taskMetaMap, setTaskMetaMap] = useState({});
  const [calculatedListHeight, setCalculatedListHeight] = useState(400);
  const hasAutoScrolledRef = useRef(null);
  const [hoveredQuickAddDayKey, setHoveredQuickAddDayKey] = useState(null);
  const [quickAddMenu, setQuickAddMenu] = useState({ open: false, x: 0, y: 0, dayKey: null, date: null });

  // ✅ bottom panel resize state
  const [bottomPanelHeight, setBottomPanelHeight] = useState(MIN_BOTTOM_PANEL_HEIGHT);
  const [isBottomPanelResizing, setIsBottomPanelResizing] = useState(false);
  const isResizingRef = useRef(false);
  const bottomResizeStartRef = useRef({ startY: 0, startHeight: 220 });

  // Track current time as ms
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [measuredSlotPx, setMeasuredSlotPx] = useState(() =>
    getSlotPixelHeight(slotSize)
  );

  useEffect(() => {
    if (slotSizeMinutes && slotSizeMinutes !== slotSize) {
      setSlotSize(slotSizeMinutes);
    }
  }, [slotSizeMinutes, slotSize]);

  useEffect(() => {
    setMeasuredSlotPx(getSlotPixelHeight(slotSize));
  }, [slotSize]);

  // keep "now" updated
  useEffect(() => {
    const update = () => setNowMs(Date.now());
    update();
    const msUntilNextSecond = 1000 - (Date.now() % 1000);
    const timeout = setTimeout(() => {
      update();
      const interval = setInterval(update, 5000);
      if (weekScrollRef.current) {
        weekScrollRef.current._nowInterval = interval;
      }
    }, msUntilNextSecond);
    return () => {
      clearTimeout(timeout);
      if (weekScrollRef.current && weekScrollRef.current._nowInterval) {
        clearInterval(weekScrollRef.current._nowInterval);
      }
    };
  }, []);

  const handleRowMenuSummaryClick = (event) => {
    try {
      event.preventDefault();
      event.stopPropagation();

      if (menuOpenTimerRef.current) {
        window.clearTimeout(menuOpenTimerRef.current);
        menuOpenTimerRef.current = null;
      }

      const summaryEl = event.currentTarget;
      const detailsEl = summaryEl?.closest?.("details");
      const rowEl = event.currentTarget?.closest?.('[data-week-item-row="true"]');
      const scrollEl = event.currentTarget?.closest?.('.week-bottom-list-scroll');
      if (!rowEl || !scrollEl || !detailsEl) return;

      // Second click on the same dots closes the popup.
      if (detailsEl.hasAttribute("open")) {
        detailsEl.removeAttribute("open");
        return;
      }

      // Close other open menus in the same scroll area.
      try {
        const openMenus = scrollEl.querySelectorAll("details[open]");
        openMenus.forEach((menu) => {
          if (menu !== detailsEl) menu.removeAttribute("open");
        });
      } catch (_) {}

      const targetTop = Math.max(0, rowEl.offsetTop - 6);
      scrollEl.scrollTo({ top: targetTop, behavior: "smooth" });

      const openAndFocus = () => {
        try {
          const rect = summaryEl.getBoundingClientRect();
          const menuWidth = 112;
          const menuHeight = 96;
          const left = Math.max(8, Math.min(Math.round(rect.right - menuWidth), window.innerWidth - menuWidth - 8));
          const top = Math.max(8, Math.min(Math.round(rect.bottom + 4), window.innerHeight - menuHeight - 8));
          detailsEl.style.setProperty("--week-actions-menu-left", `${left}px`);
          detailsEl.style.setProperty("--week-actions-menu-top", `${top}px`);
          detailsEl.setAttribute("open", "");
        } catch (_) {}
      };

      // Give smooth scrolling a moment so the row lands at the top first.
      menuOpenTimerRef.current = window.setTimeout(() => {
        openAndFocus();
        menuOpenTimerRef.current = null;
      }, 220);
    } catch (_) {}
  };

  useEffect(() => {
    const handleDocMouseDown = (event) => {
      try {
        const insideMenu = event.target?.closest?.('details[data-week-actions-menu="true"]');
        if (insideMenu) return;
        const openMenus = document.querySelectorAll('details[data-week-actions-menu="true"][open]');
        openMenus.forEach((menu) => menu.removeAttribute("open"));
      } catch (_) {}
    };

    document.addEventListener("mousedown", handleDocMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocMouseDown);
      if (menuOpenTimerRef.current) {
        window.clearTimeout(menuOpenTimerRef.current);
        menuOpenTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const onDocMouseDown = (event) => {
      try {
        if (!quickAddMenu.open) return;
        const insideQuickAdd = event.target?.closest?.('[data-week-quick-add-menu="true"]');
        if (insideQuickAdd) return;
        setQuickAddMenu({ open: false, x: 0, y: 0, dayKey: null, date: null });
      } catch (_) {}
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [quickAddMenu.open]);

  useEffect(() => {
    const clearDragHighlight = () => {
      setDragOverTimeSlot(null);
      setDragOverBottomDayKey(null);
    };
    window.addEventListener("dragend", clearDragHighlight);
    window.addEventListener("drop", clearDragHighlight);
    return () => {
      window.removeEventListener("dragend", clearDragHighlight);
      window.removeEventListener("drop", clearDragHighlight);
    };
  }, []);

  // Keep the time grid sized to the remaining space after header + splitter + bottom panel.
  useEffect(() => {
    const calculateHeight = () => {
      const slotsPerHour = Math.max(1, Math.round(60 / Math.max(1, slotSize)));
      const desiredSlots = slotsPerHour * 3;
      const defaultSlotPx = getSlotPixelHeight(slotSize);
      const slotPx = measuredSlotPx || defaultSlotPx;
      const desiredHeight = Math.max(1, Math.round(desiredSlots * slotPx));

      if (!containerRef.current) {
        setCalculatedListHeight(desiredHeight);
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerHeight = containerRect.height || 0;
      const headerHeight =
        headerBlockRef.current?.getBoundingClientRect().height || 0;
      const splitterHeight =
        bottomSplitterRef.current?.getBoundingClientRect().height || 0;
      const safetyGap = 0;
      const availableHeight =
        containerHeight - headerHeight - splitterHeight - bottomPanelHeight - safetyGap;

      if (availableHeight > 0) {
        setCalculatedListHeight(Math.max(120, Math.round(availableHeight)));
      } else {
        setCalculatedListHeight(desiredHeight);
      }
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);

    let ro = null;
    if (containerRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(calculateHeight);
      ro.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", calculateHeight);
      if (ro) ro.disconnect();
    };
  }, [slotSize, measuredSlotPx, bottomPanelHeight]);

  // Measure FixedSizeList slot height for precise overlay alignment
  useEffect(() => {
    const el = listOuterRef.current;
    if (!el) return;

    const measure = () => {
      try {
        const item = el.querySelector("[data-slot-index]");
        if (item) {
          const h = item.getBoundingClientRect().height;
          if (h && h > 0) setMeasuredSlotPx(h);
        }
      } catch (e) {}
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [listOuterRef.current]);

  // Load key areas map for coloring tasks/activities (fallback when categories mapping not present)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const mod = await import("../../services/keyAreaService");
        const svc = mod?.default || mod;
        const areas = await svc.list().catch(() => []);
        const map = {};
        const orderMap = {};
        (areas || []).forEach((a, idx) => {
          if (a && a.id) {
            map[String(a.id)] = a;
            orderMap[String(a.id)] = idx + 1;
          }
        });
        if (!ignore) {
          setKeyAreaMap(map);
          setKeyAreaOrderMap(orderMap);
        }
      } catch (e) {
        if (!ignore) {
          setKeyAreaMap({});
          setKeyAreaOrderMap({});
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const tMod = await import("../../services/taskService");
        const taskSvc = tMod?.default || tMod;
        const allTasks = await taskSvc.list().catch(() => []);
        const map = {};
        (allTasks || []).forEach((task) => {
          if (!task || !task.id) return;
          map[String(task.id)] = {
            keyAreaId: task.keyAreaId ?? task.key_area_id ?? null,
            listIndex: task.listIndex ?? task.list_index ?? task.list ?? null,
          };
        });
        if (!ignore) setTaskMetaMap(map);
      } catch (_) {
        if (!ignore) setTaskMetaMap({});
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  // Measure column width so we can position event overlays exactly
  useEffect(() => {
    const el = weekScrollRef.current;
    if (!el) return;
    const measure = () => {
      try {
        const headerDayCell = headerBlockRef.current?.querySelector?.("thead th:nth-child(2)");
        const headerCellWidth = headerDayCell?.getBoundingClientRect?.().width || 0;
        const cols = workWeek ? 5 : 7;
        const w = el.getBoundingClientRect().width || el.clientWidth || 0;
        const fallbackWidth = Math.max(0, (w - TIME_COL_PX) / cols);
        const cw = headerCellWidth > 0 ? headerCellWidth : fallbackWidth;
        setColumnWidth(cw);
      } catch (e) {}
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [weekScrollRef.current, workWeek]);

  // Measure all-day track width and exact day column edges from header cells
  // so bars align to real rendered columns.
  useEffect(() => {
    const trackEl = allDayTrackRef.current;
    const headerEl = headerBlockRef.current;
    if (!trackEl) return;
    const measure = () => {
      try {
        const trackRect = trackEl.getBoundingClientRect();
        const trackWidth = Math.max(0, trackRect.width || trackEl.clientWidth || 0);
        setAllDayTrackWidth(trackWidth);

        const dayHeaders = Array.from(headerEl?.querySelectorAll?.("thead tr th") || []).slice(
          1,
          1 + daysCount
        );
        if (dayHeaders.length !== daysCount) {
          setAllDayColumnEdges([]);
          return;
        }

        const starts = dayHeaders.map((th) => {
          const r = th.getBoundingClientRect();
          return r.left - trackRect.left;
        });
        const lastRect = dayHeaders[dayHeaders.length - 1].getBoundingClientRect();
        const rawEdges = [...starts, lastRect.right - trackRect.left];

        // Clamp and enforce monotonic edges within track bounds.
        const normalized = [];
        let prev = 0;
        for (let i = 0; i < rawEdges.length; i += 1) {
          const v = Math.max(0, Math.min(trackWidth, Number(rawEdges[i]) || 0));
          const next = i === 0 ? v : Math.max(prev, v);
          normalized.push(next);
          prev = next;
        }
        setAllDayColumnEdges(normalized);
      } catch (_) {}
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(trackEl);
    if (headerEl) ro.observe(headerEl);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [workWeek]);

  // Calculate week start (Monday) and days (respect workWeek preference)
  const weekStart = new Date(currentDate || new Date());
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const daysCount = workWeek ? 5 : 7;
  const days = Array.from({ length: daysCount }, (_, i) => {
    return new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + i
    );
  });
  const todayStart = (() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  })();
  const isTodayColumn = (date) =>
    date.getFullYear() === todayStart.getFullYear() &&
    date.getMonth() === todayStart.getMonth() &&
    date.getDate() === todayStart.getDate();
  const todayColumnIndex = days.findIndex((d) => isTodayColumn(d));
  const todayGridColWidth = Math.max(0, columnWidth || 0);

  // Use dynamic time slots from preferences; fallback to full-day slots if not available
  const slots = timeSlots.length > 0 ? timeSlots : generateTimeSlots("00:00", "24:00", slotSize);

  // Visual row height based on configured slotSize (minutes).
  const ITEM_SIZE = getSlotPixelHeight(slotSize);
  const weekNum = getWeekNumber(weekStart);

  // Update time slots when slot size changes
  useEffect(() => {
    if (updateSlotSize) updateSlotSize(slotSize);
  }, [slotSize, updateSlotSize]);

  // horizontal scroll for tasks with mouse wheel
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

  // Auto-scroll to current time when viewing a week that includes today
  useEffect(() => {
    if (!listOuterRef.current || !slots.length) return;

    const weekKey = `${currentDate?.toISOString().split("T")[0]}_${workWeek}`;
    if (hasAutoScrolledRef.current === weekKey) return;

    const today = new Date();
    const isThisWeek = days.some(
      (d) =>
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
    );

    if (isThisWeek) {
      const firstSlot = slots[0] || "00:00";
      const [fh, fm] = firstSlot.split(":").map(Number);
      const startMinutes = fh * 60 + (fm || 0);
      const nowMinutes = today.getHours() * 60 + today.getMinutes();
      const pixelsPerMinute = (measuredSlotPx || ITEM_SIZE) / slotSize;

      const scrollOffset = Math.max(0, (nowMinutes - startMinutes) * pixelsPerMinute - 100);

      setTimeout(() => {
        if (listOuterRef.current) {
          listOuterRef.current.scrollTop = scrollOffset;
          hasAutoScrolledRef.current = weekKey;
        }
      }, 100);
    } else {
      hasAutoScrolledRef.current = weekKey;
    }
  }, [currentDate, workWeek, days]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setAllDayOverflow(null);
  }, [currentDate, workWeek]);

  useEffect(() => {
    const onDocMouseDown = (ev) => {
      if (!allDayOverflow) return;
      if (allDayPopupRef.current && allDayPopupRef.current.contains(ev.target)) return;
      if (ev.target?.closest?.("[data-all-day-overflow-trigger='true']")) return;
      setAllDayOverflow(null);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [allDayOverflow]);

  useEffect(() => {
    const onDocClick = (ev) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(ev.target)) {
        setShowViewMenu(false);
      }
      if (slotMenuRef.current && !slotMenuRef.current.contains(ev.target)) {
        setShowSlotMenu(false);
      }
    };
    const onKeyDown = (ev) => {
      if (ev.key === "Escape") {
        setShowViewMenu(false);
        setShowSlotMenu(false);
      }
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Drag-and-drop handler
  const resolveDropDateForDay = (targetDay, sourceIso) => {
    const nextDate = new Date(
      targetDay.getFullYear(),
      targetDay.getMonth(),
      targetDay.getDate(),
      0,
      0,
      0,
      0
    );
    try {
      if (sourceIso) {
        const sourceDate = new Date(sourceIso);
        if (!Number.isNaN(sourceDate.getTime())) {
          nextDate.setHours(sourceDate.getHours(), sourceDate.getMinutes(), 0, 0);
        }
      }
    } catch (_) {}
    return nextDate;
  };

  const handleDrop = (e, day, slot) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      setDragOverTimeSlot(null);
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
        const taskText = e.dataTransfer.getData("taskText") || e.dataTransfer.getData("text/plain");
        onTaskDrop && onTaskDrop(taskId, date, "copy", taskText);
        return;
      }
      const activityId = e.dataTransfer.getData("activityId");
      if (activityId) {
        const activityText = e.dataTransfer.getData("activityText") || e.dataTransfer.getData("text/plain");
        onActivityDrop && onActivityDrop(activityId, date, "copy", activityText);
      }
    } catch (err) {
      console.warn("Drop failed", err);
    }
  };

  const hasCoarsePointer = () => {
    try {
      if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
        return window.matchMedia("(any-pointer: coarse)").matches;
      }
    } catch (_) {}
    return false;
  };

  const isCompactViewport = () => {
    try {
      return typeof window !== "undefined" && window.innerWidth <= 1024;
    } catch (_) {
      return false;
    }
  };

  const isMobileLikeInputEvent = (e) => {
    if (e?.touches || e?.changedTouches) return true;
    const pt = String(e?.pointerType || "").toLowerCase();
    if (pt === "touch" || pt === "pen") return true;
    if (pt === "mouse" && isCompactViewport()) return true;
    if ((typeof navigator !== "undefined" && (navigator.maxTouchPoints || 0) > 0) || hasCoarsePointer()) {
      return true;
    }
    return false;
  };

  const isNestedInteractiveTarget = (e) => {
    try {
      const target = e?.target;
      const currentTarget = e?.currentTarget;
      if (!target || !currentTarget || typeof target.closest !== "function") return false;
      const interactive = target.closest("button, a, input, textarea, select, summary, details, [role='button']");
      return Boolean(interactive && interactive !== currentTarget && currentTarget.contains(interactive));
    } catch (_) {
      return false;
    }
  };

  const getPointFromInputEvent = (e) => {
    try {
      if (e?.touches?.[0]) {
        return { x: Number(e.touches[0].clientX), y: Number(e.touches[0].clientY) };
      }
      if (e?.changedTouches?.[0]) {
        return { x: Number(e.changedTouches[0].clientX), y: Number(e.changedTouches[0].clientY) };
      }
      if (Number.isFinite(e?.clientX) && Number.isFinite(e?.clientY)) {
        return { x: Number(e.clientX), y: Number(e.clientY) };
      }
    } catch (_) {}
    return null;
  };

  const beginMobileDrag = (e, payload) => {
    if (!isMobileLikeInputEvent(e)) return;
    if (isNestedInteractiveTarget(e)) return;
    const point = getPointFromInputEvent(e);
    if (!point) return;
    const now = Date.now();
    if (now - lastMobileDragStartRef.current < 80) return;
    lastMobileDragStartRef.current = now;
    mobileDropHandledRef.current = false;
    const pending = {
      payload,
      startX: point.x,
      startY: point.y,
    };
    mobileDragPendingRef.current = pending;
    setMobileDragPending(pending);
  };

  const activateMobileDrag = (payload) => {
    mobileDropHandledRef.current = false;
    mobileDragPendingRef.current = null;
    mobileDragItemRef.current = payload;
    setMobileDragItem(payload);
    setMobileDragPending(null);
  };

  const applyMobileDropToSlot = (day, slot) => {
    const dragItem = mobileDragItemRef.current || mobileDragItem;
    if (!dragItem) return;
    const [h, m] = String(slot || "00:00").split(":");
    const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(h), Number(m));
    if (dragItem.kind === "task" && typeof onTaskDrop === "function") {
      onTaskDrop(dragItem.id, date, "copy", dragItem.text || "Task");
    } else if (dragItem.kind === "activity" && typeof onActivityDrop === "function") {
      onActivityDrop(dragItem.id, date, "copy", dragItem.text || "Activity");
    }
    setDragOverTimeSlot(null);
    mobileDragItemRef.current = null;
    setMobileDragItem(null);
  };

  const applyMobileDropToBottomDay = (day) => {
    const dragItem = mobileDragItemRef.current || mobileDragItem;
    if (!dragItem) return;
    const date = resolveDropDateForDay(day, dragItem.sourceIso || null);
    if (dragItem.kind === "task" && typeof onTaskDrop === "function") {
      onTaskDrop(dragItem.id, date, dragItem.dropEffect || "move", dragItem.text || "Task");
    } else if (dragItem.kind === "activity" && typeof onActivityDrop === "function") {
      onActivityDrop(dragItem.id, date, dragItem.dropEffect || "move", dragItem.text || "Activity");
    }
    setDragOverBottomDayKey(null);
    mobileDragItemRef.current = null;
    setMobileDragItem(null);
  };

  const parseDayKeyToDate = (dayKey) => {
    try {
      const [y, m, d] = String(dayKey || "").split("-").map((v) => Number(v));
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
      return new Date(y, m, d, 0, 0, 0, 0);
    } catch (_) {
      return null;
    }
  };

  const resolveWeekSlotFromKey = (slotKey) => {
    try {
      if (!slotKey) return null;
      const [dayKey, slot] = String(slotKey).split("|");
      if (!dayKey || !slot) return null;
      return { type: "slot", dayKey, slot, slotKey: String(slotKey) };
    } catch (_) {
      return null;
    }
  };

  useEffect(() => {
    dragOverTimeSlotRef.current = dragOverTimeSlot;
  }, [dragOverTimeSlot]);

  useEffect(() => {
    dragOverBottomDayKeyRef.current = dragOverBottomDayKey;
  }, [dragOverBottomDayKey]);

  useEffect(() => {
    mobileDragItemRef.current = mobileDragItem;
  }, [mobileDragItem]);

  useEffect(() => {
    mobileDragPendingRef.current = mobileDragPending;
  }, [mobileDragPending]);

  const resolveWeekDropTargetAtPoint = (x, y) => {
    try {
      const stack =
        typeof document.elementsFromPoint === "function"
          ? document.elementsFromPoint(x, y)
          : [document.elementFromPoint(x, y)].filter(Boolean);
      const slotEl = stack.find((node) =>
        node?.closest?.("[data-week-slot-day][data-week-slot-time][data-week-slot-key]")
      )?.closest?.("[data-week-slot-day][data-week-slot-time][data-week-slot-key]");
      if (slotEl) {
        const dayKey = String(slotEl.getAttribute("data-week-slot-day") || "");
        const slot = String(slotEl.getAttribute("data-week-slot-time") || "");
        const slotKey = String(slotEl.getAttribute("data-week-slot-key") || "");
        if (dayKey && slot && slotKey) return { type: "slot", dayKey, slot, slotKey };
      }
      return null;
    } catch (_) {
      return null;
    }
  };

  useEffect(() => {
    if (!mobileDragItemRef.current && !mobileDragPendingRef.current) return;
    const pointFromTouchLike = (ev) => {
      return getPointFromInputEvent(ev);
    };
    const DRAG_THRESHOLD_PX = 8;
    const updateHoverFromPoint = (x, y) => {
      const hit = resolveWeekDropTargetAtPoint(x, y);
      if (!hit) {
        setDragOverTimeSlot(null);
        setDragOverBottomDayKey(null);
        return null;
      }
      if (hit.type === "slot") {
        setDragOverTimeSlot(hit.slotKey);
        setDragOverBottomDayKey(null);
        return hit;
      }
      setDragOverTimeSlot(null);
      setDragOverBottomDayKey(hit.dayKey);
      return hit;
    };
    const onPointerMove = (ev) => {
      const pending = mobileDragPendingRef.current;
      if (pending) {
        const dx = ev.clientX - pending.startX;
        const dy = ev.clientY - pending.startY;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        try {
          ev.preventDefault();
          ev.stopPropagation();
        } catch (_) {}
        activateMobileDrag(pending.payload);
      }
      if (mobileDragItemRef.current || mobileDragPendingRef.current) updateHoverFromPoint(ev.clientX, ev.clientY);
    };
    const onTouchMove = (ev) => {
      const pt = pointFromTouchLike(ev);
      if (!pt) return;
      const pending = mobileDragPendingRef.current;
      if (pending) {
        const dx = pt.x - pending.startX;
        const dy = pt.y - pending.startY;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        try {
          ev.preventDefault();
          ev.stopPropagation();
        } catch (_) {}
        activateMobileDrag(pending.payload);
      }
      if (mobileDragItemRef.current || mobileDragPendingRef.current) updateHoverFromPoint(pt.x, pt.y);
    };
    const onPointerUp = (ev) => {
      if (!mobileDragItemRef.current && mobileDragPendingRef.current) {
        mobileDragPendingRef.current = null;
        setMobileDragPending(null);
        setDragOverTimeSlot(null);
        setDragOverBottomDayKey(null);
        return;
      }
      if (mobileDropHandledRef.current) return;
      mobileDropHandledRef.current = true;
      const hit =
        resolveWeekDropTargetAtPoint(ev.clientX, ev.clientY) ||
        resolveWeekSlotFromKey(dragOverTimeSlotRef.current);
      if (hit?.type === "slot") {
        const day = parseDayKeyToDate(hit.dayKey);
        if (day) {
          applyMobileDropToSlot(day, hit.slot);
          return;
        }
      }
      setDragOverTimeSlot(null);
      setDragOverBottomDayKey(null);
      mobileDragItemRef.current = null;
      setMobileDragItem(null);
    };
    const onTouchEnd = (ev) => {
      if (!mobileDragItemRef.current && mobileDragPendingRef.current) {
        mobileDragPendingRef.current = null;
        setMobileDragPending(null);
        setDragOverTimeSlot(null);
        setDragOverBottomDayKey(null);
        return;
      }
      if (mobileDropHandledRef.current) return;
      mobileDropHandledRef.current = true;
      const pt = pointFromTouchLike(ev);
      const hit =
        (pt ? resolveWeekDropTargetAtPoint(pt.x, pt.y) : null) ||
        resolveWeekSlotFromKey(dragOverTimeSlotRef.current);
      if (hit?.type === "slot") {
        const day = parseDayKeyToDate(hit.dayKey);
        if (day) {
          applyMobileDropToSlot(day, hit.slot);
          return;
        }
      }
      setDragOverTimeSlot(null);
      setDragOverBottomDayKey(null);
      mobileDragItemRef.current = null;
      setMobileDragItem(null);
    };
    const onPointerCancel = () => {
      mobileDragPendingRef.current = null;
      setMobileDragPending(null);
      if (mobileDropHandledRef.current) return;
      mobileDropHandledRef.current = true;
      setDragOverTimeSlot(null);
      setDragOverBottomDayKey(null);
      mobileDragItemRef.current = null;
      setMobileDragItem(null);
    };
    const onTouchCancel = () => {
      mobileDragPendingRef.current = null;
      setMobileDragPending(null);
      if (mobileDropHandledRef.current) return;
      mobileDropHandledRef.current = true;
      setDragOverTimeSlot(null);
      setDragOverBottomDayKey(null);
      mobileDragItemRef.current = null;
      setMobileDragItem(null);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    window.addEventListener("pointercancel", onPointerCancel, { once: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { once: true });
    window.addEventListener("touchcancel", onTouchCancel, { once: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [mobileDragItem, mobileDragPending]);

  const handleBottomColumnDrop = (e, day) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      setDragOverBottomDayKey(null);

      const dragEffect = e.dataTransfer.getData("dragEffect");
      const sourceIso = e.dataTransfer.getData("dragSourceStart") || null;
      const date = resolveDropDateForDay(day, sourceIso);

      const taskId = e.dataTransfer.getData("taskId");
      if (taskId) {
        const dropEffect = (dragEffect && dragEffect !== "none")
          ? dragEffect
          : (e.dataTransfer.dropEffect && e.dataTransfer.dropEffect !== "none")
            ? e.dataTransfer.dropEffect
          : (e.dataTransfer.effectAllowed || "move");
        const taskText = e.dataTransfer.getData("taskText") || e.dataTransfer.getData("text/plain");
        onTaskDrop && onTaskDrop(taskId, date, dropEffect, taskText);
        return;
      }

      const activityId = e.dataTransfer.getData("activityId");
      if (activityId) {
        const dropEffect = (dragEffect && dragEffect !== "none")
          ? dragEffect
          : (e.dataTransfer.dropEffect && e.dataTransfer.dropEffect !== "none")
            ? e.dataTransfer.dropEffect
          : (e.dataTransfer.effectAllowed || "move");
        const activityText = e.dataTransfer.getData("activityText") || e.dataTransfer.getData("text/plain");
        onActivityDrop && onActivityDrop(activityId, date, dropEffect, activityText);
      }
    } catch (err) {
      console.warn("Bottom-column drop failed", err);
    }
  };

  // ✅ FIXED: Bottom panel resize - reliable hit-area + pointer/mouse/touch fallback
  const startBottomPanelResize = (e) => {
    try {
      e.preventDefault();
      e.stopPropagation();

      const y = e.clientY ?? (e.touches?.[0]?.clientY ?? 0);

      isResizingRef.current = true;

      bottomResizeStartRef.current = {
        startY: y,
        startHeight: bottomPanelHeight,
      };

      setIsBottomPanelResizing(true);

      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    } catch (_) {}
  };

  useEffect(() => {
    const MIN_BOTTOM_HEIGHT = MIN_BOTTOM_PANEL_HEIGHT;
    const MIN_LIST_HEIGHT = 120;
    const FALLBACK_MAX_BOTTOM_HEIGHT = 640;

    const onMove = (ev) => {
      if (!isResizingRef.current) {
        return;
      }

      const y = ev.clientY ?? (ev.touches?.[0]?.clientY ?? 0);
      const deltaY = y - bottomResizeStartRef.current.startY;

      const containerHeight = containerRef.current?.getBoundingClientRect().height || 0;
      const headerHeight = headerBlockRef.current?.getBoundingClientRect().height || 0;
      const splitterHeight = bottomSplitterRef.current?.getBoundingClientRect().height || 0;

      const maxFromCurrentGeometry =
        containerHeight > 0
          ? containerHeight - headerHeight - splitterHeight - MIN_LIST_HEIGHT
          : FALLBACK_MAX_BOTTOM_HEIGHT;

      const maxBottomHeight = Math.max(MIN_BOTTOM_HEIGHT, maxFromCurrentGeometry);

      const nextBottomHeight = Math.min(
        maxBottomHeight,
        Math.max(
          MIN_BOTTOM_HEIGHT,
          bottomResizeStartRef.current.startHeight - deltaY
        )
      );

      setBottomPanelHeight(nextBottomHeight);
    };

    const onUp = () => {
      if (!isResizingRef.current) {
        return;
      }
      isResizingRef.current = false;

      setIsBottomPanelResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp, { passive: true });

    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp, { passive: true });
    window.addEventListener("touchcancel", onUp, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);

      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("touchcancel", onUp);
    };
  }, []);

  // Range label for the week
  const endOfWeek = new Date(weekStart);
  endOfWeek.setDate(endOfWeek.getDate() + (daysCount - 1));
  const weekLabel = `${formatDate(weekStart)} — ${formatDate(endOfWeek)}`;

  // Helper: does event start fall within this slot minute range?
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
      const slotStart = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        Number(sh),
        Number(smRaw || 0)
      );
      const slotStartMs = slotStart.getTime();
      const slotEndMs = slotStartMs + sizeMin * 60000;
      const evMs = ev.getTime();

      return evMs >= slotStartMs && evMs < slotEndMs;
    } catch {
      return false;
    }
  };

  // Helpers for color contrast
  function hexToRgb(hex) {
    if (!hex) return null;
    const h = hex.replace("#", "");
    const bigint = parseInt(
      h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
      16
    );
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  }
  function getContrastTextColor(hex) {
    try {
      const c = hexToRgb(hex);
      if (!c) return "#0B4A53";
      const srgb = [c.r, c.g, c.b]
        .map((v) => v / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      const lum = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
      return lum > 0.6 ? "#0B4A53" : "#ffffff";
    } catch (e) {
      return "#0B4A53";
    }
  }

  const ColGroup = () => (
    <colgroup>
      <col style={{ width: `${TIME_COL_PX}px` }} />
      {Array.from({ length: daysCount }).map((_, i) => (
        <col key={i} />
      ))}
    </colgroup>
  );

  return (
    <>
      <style>{`
        @keyframes blinkRow {
          0% { background-color: rgba(59,130,246,0.12) !important; box-shadow: none !important; }
          25% { background-color: rgba(59,130,246,0.6) !important; box-shadow: 0 0 0 10px rgba(59,130,246,0.18) !important; }
          50% { background-color: rgba(59,130,246,0.12) !important; box-shadow: none !important; }
          75% { background-color: rgba(59,130,246,0.6) !important; box-shadow: 0 0 0 10px rgba(59,130,246,0.18) !important; }
          100% { background-color: rgba(59,130,246,0.12) !important; box-shadow: none !important; }
        }
        .today-row-overlay { animation: blinkRow 0.45s linear 4; background-clip: padding-box; border-radius: 4px; }

        .week-time-grid-scroll {
          scrollbar-width: none;
          overflow-y: overlay;
          overflow-x: hidden;
          width: 100%;
        }
        .week-time-grid-scroll::-webkit-scrollbar { width: 0; height: 0; }
        .week-time-grid-wrap:hover .week-time-grid-scroll {
          scrollbar-width: thin;
          width: calc(100% + 8px);
          margin-right: -8px;
        }
        .week-time-grid-wrap:hover .week-time-grid-scroll::-webkit-scrollbar { width: 8px; }
        .week-time-grid-wrap:hover .week-time-grid-scroll::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.45);
          border-radius: 8px;
        }
        .week-time-grid-wrap:hover .week-time-grid-scroll::-webkit-scrollbar-track { background: transparent; }

        .week-bottom-list-scroll {
          scrollbar-width: none;
          scrollbar-color: rgba(100, 116, 139, 0.45) transparent;
          overflow-y: overlay;
          overflow-x: hidden;
          width: 100%;
        }
        .week-bottom-list-scroll::-webkit-scrollbar { width: 0; }
        .week-bottom-list-scroll::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.45); border-radius: 8px; }
        .week-bottom-list-scroll::-webkit-scrollbar-track { background: transparent; }

        .day-header-controls .day-header-btn {
          margin-inline: 2px;
          transition: background-color 120ms ease, border-color 120ms ease;
        }
        .day-header-controls .day-header-btn:hover {
          background-color: #e0f2fe !important;
          border-color: #7dd3fc !important;
        }
        .day-header-controls button.day-header-btn:focus,
        .day-header-controls button.day-header-btn:focus-visible {
          outline: none !important;
          box-shadow: none !important;
          ring: 0 !important;
        }
      `}</style>

      <div className="p-0 flex flex-col h-full min-h-0" style={{ overflow: "hidden", position: "relative" }}>
        {/* Header */}
        <CalendarViewTopSection elephantTaskRow={elephantTaskRow} elephantTopGapClass="mt-1" showElephantSeparator={false}>
        <div className="day-header-controls flex items-center justify-between min-h-[34px]">
          <div className="flex items-center gap-2">
            <button
              className="day-header-btn px-2 py-0.5 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
              style={{ minWidth: 34, minHeight: 34 }}
              aria-label="Previous week"
              onClick={() => {
                hasAutoScrolledRef.current = null;
                onShiftDate && onShiftDate(-1);
              }}
            >
              <FaChevronLeft />
            </button>

            <button
              className="day-header-btn px-2 py-0.5 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
              style={{ minWidth: 34, minHeight: 34 }}
              aria-label="Next week"
              onClick={() => {
                hasAutoScrolledRef.current = null;
                onShiftDate && onShiftDate(1);
              }}
            >
              <FaChevronRight />
            </button>
            <button
              className="day-header-btn px-2 py-0.5 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
              style={{ minWidth: 34, minHeight: 34 }}
              aria-label="Today"
              onClick={() => {
                try {
                  hasAutoScrolledRef.current = null;
                  if (typeof onSetDate === "function") onSetDate(new Date());
                } catch {}
                try {
                  const today = new Date();
                  const dIdx = days.findIndex(
                    (d) =>
                      d.getFullYear() === today.getFullYear() &&
                      d.getMonth() === today.getMonth() &&
                      d.getDate() === today.getDate()
                  );
                  if (dIdx === -1) return;
                  const container = containerRef.current;
                  if (!container) return;

                  const table = container.querySelector("table");
                  let th = null;
                  if (table) {
                    const ths = table.querySelectorAll("thead th");
                    th = ths[1 + dIdx];
                  }

                  let left = TIME_COL_PX + (columnWidth || 0) * dIdx;
                  let width =
                    columnWidth ||
                    (container.getBoundingClientRect().width - TIME_COL_PX) / daysCount;
                  let top = 0;
                  let height = container.clientHeight || container.getBoundingClientRect().height;

                  if (th) {
                    const crect = container.getBoundingClientRect();
                    const r = th.getBoundingClientRect();
                    left = r.left - crect.left + container.scrollLeft;
                    width = r.width;
                    top = 0;
                    height = container.clientHeight || crect.height;
                  }

                  setColOverlay({ left, top, width, height, visible: true });
                  const totalMs = 450 * 4 + 100;
                  setTimeout(() => setColOverlay(null), totalMs);
                } catch {}
              }}
            >
              {t("weekView.today")}
            </button>
          </div>

          <h2 className="text-xl font-bold flex items-center gap-2">
            {weekLabel}
            {(loading || prefsLoading) && (
              <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                {t("weekView.loading")}
              </span>
            )}
          </h2>

          <div className="flex items-center gap-2">
            <div
              role="group"
              aria-label="Week length"
              tabIndex={0}
              className="inline-flex items-center rounded bg-white border border-slate-200 shadow-sm mr-2"
              onKeyDown={(e) => {
                try {
                  if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                    e.preventDefault();
                    setWorkWeek(true);
                  } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                    e.preventDefault();
                    setWorkWeek(false);
                  } else if (e.key === "Home") {
                    e.preventDefault();
                    setWorkWeek(true);
                  } else if (e.key === "End") {
                    e.preventDefault();
                    setWorkWeek(false);
                  }
                } catch {}
              }}
            >
              <button
                type="button"
                aria-pressed={workWeek}
                onClick={() => setWorkWeek(true)}
                className={`px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  workWeek ? "text-white bg-blue-600" : "text-slate-700 hover:bg-slate-50"
                }`}
                title="5 day week (Mon-Fri)"
              >
                <span className="sr-only">{t("weekView.show5Day")}</span>
                <span aria-hidden>5d</span>
              </button>

              <button
                type="button"
                aria-pressed={!workWeek}
                onClick={() => setWorkWeek(false)}
                className={`px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !workWeek ? "text-white bg-blue-600" : "text-slate-700 hover:bg-slate-50"
                }`}
                title="7 day week (Mon-Sun)"
              >
                <span className="sr-only">{t("weekView.show7Day")}</span>
                <span aria-hidden>7d</span>
              </button>
            </div>

            <div className="relative" ref={slotMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowSlotMenu((s) => !s);
                  setShowViewMenu(false);
                }}
                className="day-header-btn px-2 py-0.5 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center gap-2"
                style={{ minWidth: 48, minHeight: 34 }}
                aria-haspopup="menu"
                aria-expanded={showSlotMenu ? "true" : "false"}
                aria-label="Time label interval"
                title={`Time labels: ${slotSize}m`}
              >
                <span>{t("weekView.time")}</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                  {slotSize}m
                </span>
                <FaChevronDown className={`${showSlotMenu ? "rotate-180" : "rotate-0"} transition-transform`} />
              </button>
              {showSlotMenu && (
                <div role="menu" className="absolute left-0 z-50 mt-2 w-28 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                  {[15, 30].map((size) => (
                    <button
                      key={size}
                      role="menuitemradio"
                      aria-checked={slotSize === size}
                      className={`w-full text-left px-3 py-2 text-sm ${
                        slotSize === size ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        if (slotSize !== size && typeof onToggleSlotSize === "function") {
                          onToggleSlotSize();
                        }
                        setShowSlotMenu(false);
                      }}
                    >
                      {size}m
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="relative" ref={viewMenuRef}>
              <button
                className="day-header-btn px-2 py-0.5 rounded-md text-sm font-semibold bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center gap-2"
                style={{ minWidth: 34, minHeight: 34 }}
                onClick={() => {
                  setShowViewMenu((s) => !s);
                  setShowSlotMenu(false);
                }}
                aria-haspopup="menu"
                aria-expanded={showViewMenu ? "true" : "false"}
              >
                <span>{t("weekView.view")}</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                  {view?.charAt(0).toUpperCase() + view?.slice(1)}
                </span>
                <FaChevronDown className={`${showViewMenu ? "rotate-180" : "rotate-0"} transition-transform`} />
              </button>

              {showViewMenu && (
                <div role="menu" className="absolute right-0 z-50 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                  {["day", "week", "month", "quarter"].map((v) => (
                    <button
                      key={v}
                      role="menuitemradio"
                      aria-checked={view === v}
                      className={`w-full text-left px-3 py-2 text-sm ${
                        view === v ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700 hover:bg-slate-50"
                      }`}
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
        </div>
        </CalendarViewTopSection>

        {/* Calendar grid */}
        <div className="overflow-hidden bg-white flex-1 min-h-0 mt-1">
        <div
          ref={containerRef}
          className="day-timeslots-wrap relative bg-white border border-blue-50 rounded-lg shadow-sm p-0 overflow-visible h-full min-h-0 flex flex-col"
          style={{ overflow: "hidden" }}
        >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-lg z-20"
              style={{
                borderTop: "1px solid rgb(148, 163, 184)",
                borderLeft: "1px solid rgb(148, 163, 184)",
                borderRight: "1px solid rgb(148, 163, 184)",
                borderBottom: "1px solid rgb(148, 163, 184)",
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 bottom-0 z-20"
              style={{
                left: `${TIME_COL_PX}px`,
                borderLeft: "1px solid rgb(203, 213, 225)",
              }}
            />
            {Array.from({ length: Math.max(0, daysCount - 1) }).map((_, idx) => (
              <div
                key={`week-col-sep-${idx}`}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 bottom-0 z-20"
                style={{
                  left: columnWidth
                    ? `${TIME_COL_PX + columnWidth * (idx + 1)}px`
                    : `calc(${TIME_COL_PX}px + ((100% - ${TIME_COL_PX}px) * ${((idx + 1) / daysCount).toFixed(6)}))`,
                  borderLeft: "1px solid rgb(203, 213, 225)",
                }}
              />
            ))}
            {/* Header + all-day row */}
            <div ref={headerBlockRef} className="flex-shrink-0">
              <table
                className="min-w-full border border-gray-100 rounded-lg"
                style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}
              >
                <ColGroup />
                <thead>
                  <tr className="bg-blue-50">
                    <th
                      className="text-left px-2 py-1 text-xs text-blue-500 font-semibold rounded-tl-lg"
                      style={{
                        width: TIME_COL_PX + "px",
                        minWidth: TIME_COL_PX + "px",
                        maxWidth: TIME_COL_PX + "px",
                        boxSizing: "border-box",
                        borderBottomWidth: "1px",
                        borderBottomStyle: "solid",
                        borderBottomColor: "rgb(203, 213, 225)",
                      }}
                    >
                      <span className="sr-only">all day</span>
                    </th>

                    {days.map((date, dIdx) => (
                      <th
                        key={dIdx}
                        className={`text-center px-2 py-1 text-xs text-blue-500 font-semibold ${
                          dIdx === days.length - 1 ? "rounded-tr-lg" : ""
                        }`}
                        style={{
                          backgroundColor: isTodayColumn(date) ? "rgba(59,130,246,0.14)" : undefined,
                          borderBottomWidth: "1px",
                          borderBottomStyle: "solid",
                          borderBottomColor: "rgb(203, 213, 225)",
                        }}
                      >
                        {`${date
                          .toLocaleDateString(undefined, { weekday: "short" })
                          .replace(".", "")
                        } ${String(date.getDate()).padStart(2, "0")}`}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td
                      className="px-2 py-1 text-xs text-gray-500 text-center"
                      style={{
                        width: TIME_COL_PX + "px",
                        minWidth: TIME_COL_PX + "px",
                        maxWidth: TIME_COL_PX + "px",
                        boxSizing: "border-box",
                        borderBottomWidth: "1px",
                        borderBottomStyle: "solid",
                        borderBottomColor: "rgba(100, 116, 139, 0.65)",
                      }}
                    >
                      <span className="inline-flex flex-col items-center justify-center rounded bg-emerald-500 text-white text-[9px] leading-none font-semibold px-1 py-0.5">
                        <span>All</span>
                        <span>Day</span>
                      </span>
                    </td>

                    <td
                      className="px-2 py-1 align-top"
                      style={{
                        borderBottomWidth: "1px",
                        borderBottomStyle: "solid",
                        borderBottomColor: "rgba(100, 116, 139, 0.65)",
                      }}
                      colSpan={daysCount}
                    >
                      {/* keep as you had (multi-day bars renderer) */}
                      <div ref={allDayTrackRef} style={{ position: "relative", minHeight: 32 }}>
                        {todayColumnIndex >= 0 ? (
                          <div
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              top: 0,
                              bottom: 0,
                              left: `${(todayColumnIndex / Math.max(1, daysCount)) * 100}%`,
                              width: `${100 / Math.max(1, daysCount)}%`,
                              backgroundColor: "rgba(59,130,246,0.10)",
                              pointerEvents: "none",
                              zIndex: 0,
                            }}
                          />
                        ) : null}
                        {(() => {
                          try {
                            const dayMs = 24 * 60 * 60 * 1000;
                            const BAR_TOP = 1;
                            const BAR_HEIGHT = ALL_DAY_BAR_HEIGHT_PX;
                            const BAR_GAP = 4;
                            const toUtcDaySerial = (d) =>
                              Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / dayMs;
                            const dayDiff = (a, b) => toUtcDaySerial(a) - toUtcDaySerial(b);
                            const resolveStartRaw = (t) =>
                              t.startDate ||
                              t.start_date ||
                              t.start ||
                              t.startAt ||
                              t.start_at ||
                              t.date ||
                              t.dueDate ||
                              t.due_date ||
                              null;
                            const resolveEndRaw = (t) =>
                              t.endDate ||
                              t.end_date ||
                              t.end ||
                              t.endAt ||
                              t.end_at ||
                              t.date ||
                              t.dueDate ||
                              t.due_date ||
                              resolveStartRaw(t);
                            const isDateOnlyLike = (raw) => {
                              if (typeof raw !== "string") return false;
                              return /^(\d{4})-(\d{2})-(\d{2})(?:[T\s]00:00(?::00(?:\.000)?)?(?:Z)?)?$/.test(
                                raw.trim()
                              );
                            };
                            const isPureDateString = (raw) => {
                              if (typeof raw !== "string") return false;
                              return /^(\d{4})-(\d{2})-(\d{2})$/.test(raw.trim());
                            };
                            const toDayStart = (raw, treatAsDateOnly = false) => {
                              try {
                                if (!raw) return null;
                                if (typeof raw === "string" && isPureDateString(raw)) {
                                  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
                                  if (m) {
                                    return new Date(
                                      Number(m[1]),
                                      Number(m[2]) - 1,
                                      Number(m[3]),
                                      0,
                                      0,
                                      0,
                                      0
                                    );
                                  }
                                }
                                if (raw instanceof Date && treatAsDateOnly) {
                                  const isUtcMidnight =
                                    raw.getUTCHours() === 0 &&
                                    raw.getUTCMinutes() === 0 &&
                                    raw.getUTCSeconds() === 0 &&
                                    raw.getUTCMilliseconds() === 0;
                                  if (isUtcMidnight) {
                                    return new Date(
                                      raw.getUTCFullYear(),
                                      raw.getUTCMonth(),
                                      raw.getUTCDate(),
                                      0,
                                      0,
                                      0,
                                      0
                                    );
                                  }
                                }
                                const d = new Date(raw);
                                if (Number.isNaN(d.getTime())) return null;
                                return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
                              } catch {
                                return null;
                              }
                            };
                            const toDayEnd = (raw, treatAsDateOnly = false) => {
                              const s = toDayStart(raw, treatAsDateOnly);
                              if (!s) return null;
                              return new Date(s.getFullYear(), s.getMonth(), s.getDate(), 23, 59, 59, 999);
                            };

                            const weekTasks = (Array.isArray(events) ? events : []).filter((t) => {
                              try {
                                if (String(t?.kind || "").toLowerCase() === "appointment") return false;
                                const s = resolveStartRaw(t);
                                const e = resolveEndRaw(t);
                                const isAllDayLike = Boolean(t?.allDay || t?.all_day);
                                const treatAsDateOnly = Boolean(
                                  isAllDayLike || isDateOnlyLike(s) || isDateOnlyLike(e)
                                );
                                const sStart = toDayStart(s, treatAsDateOnly);
                                const eEnd = toDayEnd(e, treatAsDateOnly);
                                if (!sStart || !eEnd) return false;
                                if (!(sStart <= endOfWeek && eEnd >= weekStart)) return false;
                                if (eEnd.getTime() < sStart.getTime()) return false;
                                const startIndex = dayDiff(sStart, weekStart);
                                const endIndex = dayDiff(eEnd, weekStart);
                                return isAllDayLike ? endIndex >= startIndex : endIndex > startIndex;
                              } catch {
                                return false;
                              }
                            });

                            const normalized = weekTasks
                              .map((t) => {
                                const s = resolveStartRaw(t);
                                const e = resolveEndRaw(t);
                                const treatAsDateOnly = Boolean(
                                  t?.allDay || t?.all_day || isDateOnlyLike(s) || isDateOnlyLike(e)
                                );
                                const sStart = toDayStart(s, treatAsDateOnly);
                                const eEnd = toDayEnd(e, treatAsDateOnly);
                                if (!sStart || !eEnd) return null;
                                const rawStartIndex = dayDiff(sStart, weekStart);
                                const rawEndIndex = dayDiff(eEnd, weekStart);
                                const startIndex = Math.max(0, rawStartIndex);
                                const endIndex = Math.min(daysCount - 1, rawEndIndex);
                                if (endIndex < startIndex) return null;

                                return { task: t, sStart, eEnd, rawStartIndex, rawEndIndex, startIndex, endIndex };
                              })
                              .filter(Boolean)
                              .sort((a, b) => {
                                if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
                                if (a.endIndex !== b.endIndex) return b.endIndex - a.endIndex;
                                return String(a.task?.title || a.task?.name || "").localeCompare(
                                  String(b.task?.title || b.task?.name || "")
                                );
                              });

                            const laneEndByIndex = [];
                            const placed = normalized.map((entry) => {
                              let lane = laneEndByIndex.findIndex((laneEnd) => entry.startIndex > laneEnd);
                              if (lane === -1) {
                                lane = laneEndByIndex.length;
                                laneEndByIndex.push(entry.endIndex);
                              } else {
                                laneEndByIndex[lane] = entry.endIndex;
                              }
                              return { ...entry, lane };
                            });

                            const laneCount = Math.max(1, laneEndByIndex.length);
                            const visibleLaneCount = Math.max(1, Math.min(2, laneCount));
                            const hasOverflowLanes = laneCount > 2;
                            const overflowRowSpace = hasOverflowLanes ? 18 : 0;
                            const minHeight =
                              BAR_TOP +
                              visibleLaneCount * BAR_HEIGHT +
                              Math.max(0, visibleLaneCount - 1) * BAR_GAP +
                              2 +
                              overflowRowSpace;
                            const overflowTopPx =
                              BAR_TOP +
                              visibleLaneCount * BAR_HEIGHT +
                              Math.max(0, visibleLaneCount - 1) * BAR_GAP +
                              2;

                            const overflowByDay = Array.from({ length: daysCount }, (_, dayIndex) => {
                              const dayItems = placed.filter(
                                (entry) => entry.startIndex <= dayIndex && entry.endIndex >= dayIndex
                              );
                              const hiddenCount = dayItems.filter((entry) => entry.lane >= 2).length;
                              return {
                                dayIndex,
                                dayItems,
                                hiddenCount,
                              };
                            });

                            return (
                              <>
                                {/* Background day hit-areas for all-day quick-create */}
                                <div
                                  style={{
                                    position: "absolute",
                                    left: 0,
                                    right: 0,
                                    top: 0,
                                    bottom: 0,
                                    display: "flex",
                                    zIndex: 1,
                                  }}
                                >
                                  {days.map((date, idx) => (
                                    <button
                                      key={`all-day-create-${idx}`}
                                      type="button"
                                      className="flex-1 h-full min-h-[40px] hover:bg-slate-50/70 transition-colors"
                                      style={{
                                        border: "none",
                                        background: "transparent",
                                        outlineOffset: "-2px",
                                      }}
                                      aria-label="Click to create all-day event"
                                      title="Click to create all-day event"
                                      onClick={(e) => {
                                        try {
                                          e.stopPropagation();
                                        } catch {}
                                        const dt = new Date(
                                          date.getFullYear(),
                                          date.getMonth(),
                                          date.getDate(),
                                          0,
                                          0,
                                          0,
                                          0
                                        );
                                        onQuickCreate && onQuickCreate(dt, { allDay: true });
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          try {
                                            e.stopPropagation();
                                          } catch {}
                                          const dt = new Date(
                                            date.getFullYear(),
                                            date.getMonth(),
                                            date.getDate(),
                                            0,
                                            0,
                                            0,
                                            0
                                          );
                                          onQuickCreate && onQuickCreate(dt, { allDay: true });
                                        }
                                      }}
                                    />
                                  ))}
                                </div>

                                <div style={{ minHeight }} />
                                {placed
                                  .filter((entry) => entry.lane < 2)
                                  .map((entry, i) => {
                                  try {
                                    const t = entry.task;
                                    const leftPct = (entry.startIndex / daysCount) * 100;
                                    const widthPct = ((entry.endIndex - entry.startIndex + 1) / daysCount) * 100;
                                    const isSingleDay = entry.startIndex === entry.endIndex;
                                    const continuesLeft = entry.rawStartIndex < 0;
                                    const continuesRight = entry.rawEndIndex > daysCount - 1;

                                    const kindKey = t.kind || t.type || t.kindName || null;
                                    const cat = kindKey && categories && categories[kindKey] ? categories[kindKey] : null;
                                    const categoryColor = cat?.color || null;
                                    const categoryIsTailwind = typeof categoryColor === "string" && categoryColor.startsWith("bg-");
                                    const ka = t.keyAreaId || t.key_area_id ? keyAreaMap[String(t.keyAreaId || t.key_area_id)] : null;
                                    const DEFAULT_BAR_COLOR = "#4DC3D8";
                                    const kaColor = ka && ka.color ? ka.color : null;
                                    const useTailwindClass = !kaColor && categoryIsTailwind;
                                    const finalBg = useTailwindClass
                                      ? null
                                      : (kaColor || (!categoryIsTailwind ? categoryColor : null) || DEFAULT_BAR_COLOR);
                                    const textColor = finalBg ? getContrastTextColor(finalBg) : "#ffffff";
                                    const style = useTailwindClass ? undefined : { backgroundColor: finalBg, borderColor: finalBg, color: textColor };

                                    const topPx = BAR_TOP + entry.lane * (BAR_HEIGHT + BAR_GAP);
                                    const barEdgeInsetPx = 6;
                                    const hasColumnEdges =
                                      Array.isArray(allDayColumnEdges) && allDayColumnEdges.length === daysCount + 1;
                                    const effectiveColWidth =
                                      Number.isFinite(allDayTrackWidth) && allDayTrackWidth > 0
                                        ? allDayTrackWidth / Math.max(1, daysCount)
                                        : columnWidth;
                                    const hasMeasuredColumnWidth = Number.isFinite(effectiveColWidth) && effectiveColWidth > 0;
                                    const spanCols = entry.endIndex - entry.startIndex + 1;
                                    const trackWidthPx =
                                      Number.isFinite(allDayTrackWidth) && allDayTrackWidth > 0
                                        ? allDayTrackWidth
                                        : hasMeasuredColumnWidth
                                          ? effectiveColWidth * Math.max(1, daysCount)
                                          : 0;
                                    let barLeft = `calc(${leftPct}% + ${barEdgeInsetPx}px)`;
                                    let barWidth = `calc(${widthPct}% - ${barEdgeInsetPx * 2}px)`;
                                    if (hasMeasuredColumnWidth) {
                                      const baseLeftPx = hasColumnEdges
                                        ? Number(allDayColumnEdges[entry.startIndex]) || 0
                                        : entry.startIndex * effectiveColWidth;
                                      const baseRightPx = hasColumnEdges
                                        ? Number(allDayColumnEdges[entry.endIndex + 1]) || baseLeftPx
                                        : (entry.endIndex + 1) * effectiveColWidth;
                                      const baseWidthPx = Math.max(0, baseRightPx - baseLeftPx);
                                      const rawLeftPx = baseLeftPx + barEdgeInsetPx;
                                      const rawWidthPx = Math.max(0, baseWidthPx - barEdgeInsetPx * 2);
                                      const clampedLeftPx =
                                        trackWidthPx > 0
                                          ? Math.max(0, Math.min(rawLeftPx, Math.max(0, trackWidthPx - 1)))
                                          : Math.max(0, rawLeftPx);
                                      const maxWidthFromLeft =
                                        trackWidthPx > 0 ? Math.max(0, trackWidthPx - clampedLeftPx) : Math.max(0, rawWidthPx);
                                      const clampedWidthPx = Math.max(0, Math.min(rawWidthPx, maxWidthFromLeft));
                                      barLeft = `${clampedLeftPx}px`;
                                      barWidth = `${clampedWidthPx}px`;
                                    }
                                    const barStyle = {
                                      left: barLeft,
                                      top: `${topPx}px`,
                                      width: barWidth,
                                      height: `${BAR_HEIGHT}px`,
                                      zIndex: 30,
                                      boxSizing: "border-box",
                                      paddingRight: continuesRight ? "56px" : "32px",
                                      paddingLeft: continuesLeft ? "18px" : undefined,
                                      ...style,
                                    };

                                    return (
                                      <div
                                        key={`allday-${t.id}-${i}`}
                                        onClick={() => {
                                          if (onEventClick) onEventClick(t);
                                        }}
                                        className={`group absolute left-0 rounded px-2 pr-3 text-xs overflow-visible cursor-pointer ${useTailwindClass ? categoryColor : ""}`}
                                        style={barStyle}
                                        title={t.title || t.name}
                                      >
                                        {continuesLeft && (
                                          <FaChevronLeft
                                            className="w-4 h-4 absolute left-1 top-1 font-semibold"
                                            style={{ color: textColor, zIndex: 6, fontWeight: 700 }}
                                          />
                                        )}
                                      <div className="truncate font-medium h-full flex items-center text-[11px] leading-none">{t.title || t.name}</div>
                                        <div
                                          className="flex items-center gap-1 absolute top-1/2 -translate-y-1/2 z-20"
                                          style={{ right: continuesRight ? "18px" : "4px" }}
                                        >
                                          <button
                                            type="button"
                                            className="p-0.5 rounded hover:bg-black/10"
                                            onClick={(e) => {
                                              try { e.stopPropagation(); } catch {}
                                              onEventClick && onEventClick(t, "edit");
                                            }}
                                            aria-label={`Edit ${t.title || t.name || "event"}`}
                                            title="Edit event"
                                          >
                                            <FaEdit className="w-2.5 h-2.5 text-blue-600" />
                                          </button>
                                          <button
                                            type="button"
                                            className="p-0.5 rounded hover:bg-black/10"
                                            onClick={(e) => {
                                              try { e.stopPropagation(); } catch {}
                                              if (typeof onDeleteRequest === "function") return onDeleteRequest(t, e);
                                              onEventClick && onEventClick(t, "delete");
                                            }}
                                            aria-label={`Delete ${t.title || t.name || "event"}`}
                                            title="Delete event"
                                          >
                                            <FaTrash className="w-2.5 h-2.5 text-red-600" />
                                          </button>
                                        </div>
                                        {continuesRight && (
                                          <FaChevronRight
                                            className="w-4 h-4 absolute right-1 top-1 font-semibold"
                                            style={{ color: textColor, zIndex: 6, fontWeight: 700 }}
                                          />
                                        )}
                                      </div>
                                    );
                                  } catch {
                                    return null;
                                  }
                                })}

                                {overflowByDay
                                  .filter((d) => d.hiddenCount > 0)
                                  .map((d) => {
                                    const leftPct = (d.dayIndex / daysCount) * 100;
                                    const widthPct = (1 / daysCount) * 100;
                                    const isOpen = allDayOverflow && allDayOverflow.dayIndex === d.dayIndex;

                                    return (
                                      <div
                                        key={`overflow-${d.dayIndex}`}
                                        style={{
                                          position: "absolute",
                                          left: `${leftPct}%`,
                                          width: `${widthPct}%`,
                                          top: `${overflowTopPx}px`,
                                          display: "flex",
                                          justifyContent: "center",
                                          pointerEvents: "none",
                                          zIndex: 30,
                                        }}
                                      >
                                        <button
                                          type="button"
                                          data-all-day-overflow-trigger="true"
                                          className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200"
                                          style={{ pointerEvents: "auto" }}
                                          onClick={(e) => {
                                            try {
                                              e.stopPropagation();
                                            } catch {}
                                            const nextItems = d.dayItems.map((entry) => entry.task).filter(Boolean);
                                            setAllDayOverflow((curr) =>
                                              curr && curr.dayIndex === d.dayIndex
                                                ? null
                                                : { dayIndex: d.dayIndex, items: nextItems }
                                            );
                                          }}
                                          title={`Show all-day items (${d.dayItems.length})`}
                                        >
                                          {t("weekView.showMore")}
                                        </button>

                                        {isOpen && (
                                          <div
                                            ref={allDayPopupRef}
                                            className="absolute top-6 w-64 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg"
                                            style={{ pointerEvents: "auto" }}
                                          >
                                            <div className="px-3 py-2 border-b border-slate-100 text-xs text-slate-700 flex items-center justify-between">
                                              <span className="font-semibold">{t("weekView.events")}</span>
                                              <button
                                                type="button"
                                                className="text-gray-500 hover:text-gray-700"
                                                onClick={() => setAllDayOverflow(null)}
                                                aria-label="Close"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                            <div className="py-1">
                                              {(allDayOverflow?.items || []).map((it, idx) => {
                                                const title = it.title || it.name || "Untitled";
                                                return (
                                                  <div
                                                    key={`overflow-item-${it.id || idx}`}
                                                    className="group w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                                                  >
                                                    <button
                                                      type="button"
                                                      className="flex-1 text-left truncate"
                                                      onClick={() => {
                                                        setAllDayOverflow(null);
                                                        if (onEventClick) onEventClick(it);
                                                      }}
                                                      title={title}
                                                    >
                                                      {title}
                                                    </button>
                                                    <span className="inline-flex items-center gap-1 shrink-0 overflow-hidden max-w-0 group-hover:max-w-12 transition-all duration-150">
                                                      <button
                                                        type="button"
                                                        className="p-0.5 rounded hover:bg-black/10"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setAllDayOverflow(null);
                                                          onEventClick && onEventClick(it, "edit");
                                                        }}
                                                        aria-label={`Edit ${title}`}
                                                        title="Edit event"
                                                      >
                                                        <FaEdit className="w-2.5 h-2.5 text-blue-600" />
                                                      </button>
                                                      <button
                                                        type="button"
                                                        className="p-0.5 rounded hover:bg-black/10"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setAllDayOverflow(null);
                                                          if (typeof onDeleteRequest === "function") return onDeleteRequest(it, e);
                                                          onEventClick && onEventClick(it, "delete");
                                                        }}
                                                        aria-label={`Delete ${title}`}
                                                        title="Delete event"
                                                      >
                                                        <FaTrash className="w-2.5 h-2.5 text-red-600" />
                                                      </button>
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </>
                            );
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Time slots – virtualized */}
            <div
              ref={weekScrollRef}
              className="week-time-grid-wrap flex-1 min-h-0"
              style={{ position: "relative", overflow: "hidden" }}
            >
              <FixedSizeList
                className="week-time-grid-scroll"
                height={calculatedListHeight}
                itemCount={slots.length}
                itemSize={ITEM_SIZE}
                width={undefined}
                outerRef={listOuterRef}
                innerElementType={React.forwardRef(function InnerWithOverlays({ children, style }, ref) {
                    try {
                      const firstSlot = slots[0] || "00:00";
                      const [fh, fm] = firstSlot.split(":").map(Number);
                      const startMinutes = fh * 60 + (fm || 0);
                      const pxPerMinute = (measuredSlotPx || ITEM_SIZE) / slotSize;
                      const colW =
                        columnWidth ||
                        Math.max(
                          0,
                          (((listOuterRef.current && listOuterRef.current.getBoundingClientRect().width) || 0) - TIME_COL_PX) /
                            daysCount
                        );

                      const [resizing, setResizing] = React.useState(null);
                      const cleanupPointerListeners = React.useRef(() => {});
                      const minDurationMinutes = 15;

                      const startResize = (ev, evObj, side) => {
                        try {
                          ev.stopPropagation();
                          ev.preventDefault();
                          const pointerId = ev.pointerId;
                          ev.target.setPointerCapture && ev.target.setPointerCapture(pointerId);

                          const origStart = evObj.start ? new Date(evObj.start) : null;
                          const origEnd = evObj.end ? new Date(evObj.end) : null;
                          if (!origStart) return;
                          const durationMs = origEnd
                            ? Math.max(0, origEnd.getTime() - origStart.getTime())
                            : 60 * 60 * 1000;

                          const state = {
                            id: evObj.id,
                            side,
                            origStart,
                            origEnd: origEnd || new Date(origStart.getTime() + durationMs),
                            startY: ev.clientY,
                            startScrollTop: (listOuterRef.current && listOuterRef.current.scrollTop) || 0,
                            pxPerMinute,
                            startMinutes,
                            colIndex: days.findIndex((d) => {
                              const s = new Date(evObj.start);
                              return d.getFullYear() === s.getFullYear() && d.getMonth() === s.getMonth() && d.getDate() === s.getDate();
                            }),
                          };
                          setResizing(state);

                          const computeResizePreview = (curr, clientY) => {
                            const currentScrollTop = (listOuterRef.current && listOuterRef.current.scrollTop) || curr.startScrollTop || 0;
                            const scrollDelta = currentScrollTop - (curr.startScrollTop || 0);
                            const deltaY = (clientY - curr.startY) + scrollDelta;
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

                            const minDurationMs = minDurationMinutes * 60000;
                            if ((newEnd.getTime() - newStart.getTime()) < minDurationMs) {
                              if (curr.side === "top") {
                                newStart = new Date(newEnd.getTime() - minDurationMs);
                              } else {
                                newEnd = new Date(newStart.getTime() + minDurationMs);
                              }
                            }

                            const newStartMins =
                              newStart.getHours() * 60 + newStart.getMinutes() + newStart.getSeconds() / 60;
                            const newEndMins =
                              newEnd.getHours() * 60 + newEnd.getMinutes() + newEnd.getSeconds() / 60;

                            const topPx = (newStartMins - curr.startMinutes) * curr.pxPerMinute;
                            const heightPx = Math.max(18, (newEndMins - newStartMins) * curr.pxPerMinute);

                            return { newStart, newEnd, topPx, heightPx };
                          };

                          let rafId = null;
                          let latestClientY = ev.clientY;

                          const applyPreviewAt = (clientY) => {
                            try {
                              const scroller = listOuterRef.current;
                              if (scroller && scroller.getBoundingClientRect) {
                                const rect = scroller.getBoundingClientRect();
                                const edgePx = 28;
                                let scrollStep = 0;
                                if (clientY < rect.top + edgePx) {
                                  scrollStep = -Math.max(4, Math.round((rect.top + edgePx - clientY) / 2));
                                } else if (clientY > rect.bottom - edgePx) {
                                  scrollStep = Math.max(4, Math.round((clientY - (rect.bottom - edgePx)) / 2));
                                }
                                if (scrollStep !== 0) {
                                  scroller.scrollTop = Math.max(0, scroller.scrollTop + scrollStep);
                                }
                              }

                              setResizing((curr) => {
                                if (!curr || curr.id !== state.id) return curr;
                                const preview = computeResizePreview(curr, clientY);
                                return {
                                  ...curr,
                                  previewStart: preview.newStart,
                                  previewEnd: preview.newEnd,
                                  previewTop: preview.topPx,
                                  previewHeight: preview.heightPx,
                                };
                              });
                            } catch {}
                          };

                          const onPointerMove = (mv) => {
                            try {
                              latestClientY = mv.clientY;
                              if (rafId != null) return;
                              rafId = window.requestAnimationFrame(() => {
                                rafId = null;
                                applyPreviewAt(latestClientY);
                              });
                            } catch {}
                          };

                          const onPointerUp = (up) => {
                            try {
                              cleanupPointerListeners.current();
                              setResizing((curr) => {
                                if (!curr || curr.id !== state.id) return null;
                                const preview = computeResizePreview(curr, up?.clientY ?? latestClientY);
                                let finalStart = preview.newStart || curr.origStart;
                                let finalEnd = preview.newEnd || curr.origEnd;
                                const minDurationMs = minDurationMinutes * 60000;
                                if ((finalEnd.getTime() - finalStart.getTime()) < minDurationMs) {
                                  if (curr.side === "top") {
                                    finalStart = new Date(finalEnd.getTime() - minDurationMs);
                                  } else {
                                    finalEnd = new Date(finalStart.getTime() + minDurationMs);
                                  }
                                }
                                try {
                                  if (typeof onEventMove === "function") onEventMove(curr.id, finalStart, finalEnd);
                                } catch {}
                                return null;
                              });
                            } catch {}
                          };

                          window.addEventListener("pointermove", onPointerMove);
                          window.addEventListener("pointerup", onPointerUp, { once: true });
                          cleanupPointerListeners.current = () => {
                            if (rafId != null) {
                              try {
                                window.cancelAnimationFrame(rafId);
                              } catch {}
                              rafId = null;
                            }
                            try {
                              window.removeEventListener("pointermove", onPointerMove);
                            } catch {}
                            try {
                              window.removeEventListener("pointerup", onPointerUp);
                            } catch {}
                          };
                        } catch {}
                      };

                      return (
                        <div ref={ref} style={{ ...style, position: "relative" }}>
                          {children}

                          {/* now line */}
                          {(() => {
                            try {
                              const lastSlot = slots[slots.length - 1] || "23:30";
                              const [lh, lm] = lastSlot.split(":").map(Number);
                              const endMinutes = lh * 60 + (lm || 0) + slotSize;

                              const todayDate = new Date(nowMs);
                              const found = days.some(
                                (d) =>
                                  d.getFullYear() === todayDate.getFullYear() &&
                                  d.getMonth() === todayDate.getMonth() &&
                                  d.getDate() === todayDate.getDate()
                              );
                              if (!found) return null;

                              const nowDate = new Date(nowMs);
                              const nowMinutesFloat =
                                nowDate.getHours() * 60 + nowDate.getMinutes() + nowDate.getSeconds() / 60;
                              if (nowMinutesFloat < startMinutes || nowMinutesFloat > endMinutes) return null;

                              const nowTop = (nowMinutesFloat - startMinutes) * pxPerMinute;
                              const nowTimeValue = `${String(nowDate.getHours()).padStart(2, "0")}:${String(nowDate.getMinutes()).padStart(2, "0")}`;
                              const nowTimeLabel = formatTime ? formatTime(nowTimeValue) : nowTimeValue;

                              return (
                                <div
                                  className="absolute pointer-events-none z-30"
                                  style={{ left: TIME_COL_PX + "px", right: 0, top: nowTop + "px" }}
                                >
                                  <div className="absolute left-0 right-0 border-t border-red-400" />
                                  <span className="absolute top-0 left-1 -translate-y-1/2 bg-red-500 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                    {nowTimeLabel}
                                  </span>
                                </div>
                              );
                            } catch {
                              return null;
                            }
                          })()}

                          {/* overlays (appointments) */}
                          {days.map((date, dIdx) => {
                            const parseDate = (value) => {
                              try {
                                if (!value) return null;
                                const dt = new Date(value);
                                return isNaN(dt.getTime()) ? null : dt;
                              } catch {
                                return null;
                              }
                            };

                            const compareForLane = (a, b) => {
                              const byStart = a.start.getTime() - b.start.getTime();
                              if (byStart !== 0) return byStart;
                              const aCreated = a.createdAt ? a.createdAt.getTime() : Number.POSITIVE_INFINITY;
                              const bCreated = b.createdAt ? b.createdAt.getTime() : Number.POSITIVE_INFINITY;
                              const byCreated = aCreated - bCreated;
                              if (byCreated !== 0) return byCreated;
                              return a.originalIndex - b.originalIndex;
                            };

                            const isOverlapping = (a, b) => {
                              return a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime();
                            };

                            const dayEvents = (events || [])
                              .map((ev, i) => {
                                try {
                                  const evStart = parseDate(ev.start);
                                  const evEnd = parseDate(ev.end);
                                  if (!evStart) return null;
                                  if (ev?.allDay) return null;

                                  const endForSpan = evEnd || evStart;
                                  const startDay = new Date(evStart.getFullYear(), evStart.getMonth(), evStart.getDate(), 0, 0, 0, 0);
                                  const endDay = new Date(endForSpan.getFullYear(), endForSpan.getMonth(), endForSpan.getDate(), 0, 0, 0, 0);
                                  const dayDiff = Math.floor((endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000));
                                  if (dayDiff >= 1) return null;

                                  const kindLower = String(ev?.kind || "").toLowerCase();
                                  const sourceTypeLower = String(ev?.sourceType || ev?.source_type || "").toLowerCase();
                                  const hasTaskLink = Boolean(ev?.taskId || ev?.task_id || ev?.sourceTaskId || ev?.source_task_id);
                                  const hasActivityLink = Boolean(
                                    ev?.activityId || ev?.activity_id || ev?.sourceActivityId || ev?.source_activity_id
                                  );
                                  const isAppointmentLike =
                                    kindLower === "appointment" ||
                                    kindLower === "appointment_exception" ||
                                    sourceTypeLower === "task" ||
                                    sourceTypeLower === "activity" ||
                                    hasActivityLink;

                                  if (
                                    evStart.getFullYear() !== date.getFullYear() ||
                                    evStart.getMonth() !== date.getMonth() ||
                                    evStart.getDate() !== date.getDate() ||
                                    (hasTaskLink && !isAppointmentLike)
                                  ) {
                                    return null;
                                  }

                                  const evStartMins =
                                    evStart.getHours() * 60 + evStart.getMinutes() + evStart.getSeconds() / 60;
                                  const evEndMins = evEnd
                                    ? evEnd.getHours() * 60 + evEnd.getMinutes() + evEnd.getSeconds() / 60
                                    : evStartMins + slotSize / 60;

                                  return {
                                    ev,
                                    start: evStart,
                                    end: evEnd || new Date(evStart.getTime() + Math.max(slotSize, 15) * 60000),
                                    startMins: evStartMins,
                                    endMins: evEndMins,
                                    createdAt: parseDate(ev.createdAt || ev.created_at),
                                    originalIndex: i,
                                  };
                                } catch {
                                  return null;
                                }
                              })
                              .filter(Boolean)
                              .sort(compareForLane);

                            return dayEvents.map((entry, i) => {
                                try {
                                  const { ev, start: evStart, end: evEnd, startMins: evStartMins, endMins: evEndMins } = entry;

                                  const topPx = (evStartMins - startMinutes) * pxPerMinute;
                                  const durationMins = Math.max(15, evEndMins - evStartMins);
                                  const heightPx = Math.max(18, durationMins * pxPerMinute);
                                  // Keep slot boundary lines visible between back-to-back appointments.
                                  const startsOnSlotBoundary = evStartMins % Math.max(1, slotSize) === 0;
                                  const topInsetPx = (evStartMins > startMinutes && startsOnSlotBoundary) ? 1 : 0;
                                  const bottomInsetPx = 1;
                                  const renderedTopPx = topPx + topInsetPx;
                                  const renderedHeightPx = Math.max(16, heightPx - topInsetPx - bottomInsetPx);

                                  const concurrent = dayEvents.filter((other) => isOverlapping(entry, other));
                                  const visualColumns = Math.min(3, Math.max(1, concurrent.length));
                                  const laneIndex = Math.max(0, concurrent.findIndex((other) => other === entry));
                                  const visualLane = visualColumns <= 1 ? 0 : laneIndex % visualColumns;

                                  const dayInnerLeft = TIME_COL_PX + dIdx * colW + 6;
                                  const dayInnerWidth = Math.max(40, colW - 12);
                                  const colWidth = dayInnerWidth / visualColumns;
                                  const leftPx = visualColumns <= 1
                                    ? dayInnerLeft
                                    : dayInnerLeft + visualLane * colWidth + 2;
                                  const widthPx = visualColumns <= 1
                                    ? dayInnerWidth
                                    : Math.max(24, colWidth - 4);

                                  const kindColor = (() => {
                                    const kindLower = String(ev?.kind || "").toLowerCase();
                                    const explicitKeyAreaId = ev.keyAreaId || ev.key_area_id || ev.sourceKeyAreaId || ev.source_key_area_id;
                                    let ka = explicitKeyAreaId ? keyAreaMap[String(explicitKeyAreaId)] : null;
                                    if (!ka && (ev.taskId || ev.task_id || ev.sourceTaskId || ev.source_task_id)) {
                                      const linkedTaskId = ev.taskId || ev.task_id || ev.sourceTaskId || ev.source_task_id;
                                      const parent = (Array.isArray(todos) ? todos : []).find(
                                        (t) => String(t.id) === String(linkedTaskId)
                                      );
                                      if (parent) ka = keyAreaMap[String(parent.keyAreaId || parent.key_area_id)];
                                    }
                                    const keyAreaColor = ka?.color || null;
                                    const categoryColor = categories?.[ev.kind]?.color || (kindLower === "appointment" ? categories?.appointment?.color : null);
                                    const fallbackColor = kindLower === "appointment" ? "#3b82f6" : "#4DC3D8";
                                    return keyAreaColor || categoryColor || fallbackColor;
                                  })();
                                  const sourceTypeLower = String(ev?.sourceType || ev?.source_type || "").toLowerCase();
                                  const isActivityCopy =
                                    Boolean(ev.activityId || ev.activity_id || ev.sourceActivityId || ev.source_activity_id) ||
                                    sourceTypeLower === "activity";
                                  const isTaskCopy =
                                    !isActivityCopy &&
                                    (Boolean(ev.taskId || ev.task_id || ev.sourceTaskId || ev.source_task_id) || sourceTypeLower === "task");
                                  const copyIconColor = (() => {
                                    if (!isTaskCopy && !isActivityCopy) return null;
                                    let ka = null;
                                    const linkedTaskId = ev.taskId || ev.task_id || ev.sourceTaskId || ev.source_task_id;
                                    if (linkedTaskId) {
                                      const parent = (Array.isArray(todos) ? todos : []).find(
                                        (t) => String(t.id) === String(linkedTaskId)
                                      );
                                      if (parent) ka = keyAreaMap[String(parent.keyAreaId || parent.key_area_id)];
                                    }
                                    const linkedKeyAreaId = ev.keyAreaId || ev.key_area_id || ev.sourceKeyAreaId || ev.source_key_area_id;
                                    if (!ka && linkedKeyAreaId) {
                                      ka = keyAreaMap[String(linkedKeyAreaId)];
                                    }
                                    return ka?.color || "#4DC3D8";
                                  })();
                                  const isKindTailwind =
                                    typeof kindColor === "string" && kindColor.startsWith("bg-");
                                  const kindClass = isKindTailwind ? kindColor : "";
                                  const timedStyle = isKindTailwind
                                    ? undefined
                                    : {
                                        backgroundColor: kindColor,
                                        border: `1px solid ${kindColor}`,
                                        color: getContrastTextColor(kindColor),
                                      };
                                  const isResizingThis = resizing && String(resizing.id) === String(ev.id);

                                  return (
                                    <div
                                      key={`ov-${dIdx}-${i}-${ev.id || i}`}
                                      style={{
                                        position: "absolute",
                                        top: renderedTopPx + "px",
                                        left: leftPx + "px",
                                        width: widthPx + "px",
                                        height: renderedHeightPx + "px",
                                        zIndex: 20,
                                        pointerEvents: "auto",
                                      }}
                                    >
                                      <div
                                        className={`rounded px-1.5 py-1 pr-2 text-xs overflow-visible group ${kindClass || ""}`}
                                        style={{ height: "100%", cursor: "pointer", ...(timedStyle || {}) }}
                                        title={ev.title || "Appointment"}
                                        draggable
                                        onDragStart={(e) => {
                                          try {
                                            e.dataTransfer.setData("eventId", String(ev.id));
                                            const dur = ev.end
                                              ? new Date(ev.end).getTime() - new Date(ev.start).getTime()
                                              : 60 * 60 * 1000;
                                            e.dataTransfer.setData("durationMs", String(Math.max(dur, 0)));
                                            e.dataTransfer.effectAllowed = "move";
                                          } catch {}
                                        }}
                                        onClick={(e) => {
                                          try {
                                            e.stopPropagation();
                                          } catch {}
                                          onEventClick && onEventClick(ev);
                                        }}
                                        onDragOver={(e) => {
                                          try {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            e.dataTransfer.dropEffect = "copy";
                                          } catch (err) {
                                            console.error("[WeekView] Drag-over error", err);
                                          }
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
                                            
                                            const dt = new Date(
                                              date.getFullYear(),
                                              date.getMonth(),
                                              date.getDate(),
                                              evStart.getHours(),
                                              evStart.getMinutes(),
                                              0,
                                              0
                                            );

                                            if (eventId && typeof onEventMove === "function") {
                                              const newEnd = durationMs > 0 ? new Date(dt.getTime() + durationMs) : null;
                                              onEventMove(eventId, dt, newEnd);
                                              return;
                                            }
                                            if (taskId && typeof onTaskDrop === "function") {
                                              const taskText = data.getData("taskText");
                                              onTaskDrop(taskId, dt, "copy", taskText);
                                              return;
                                            }
                                            if (activityId && typeof onActivityDrop === "function") {
                                              const activityText = data.getData("activityText");
                                              onActivityDrop(activityId, dt, "copy", activityText);
                                            }
                                          } catch (err) {
                                            console.error("[WeekView] Drop handler error", err);
                                          }
                                        }}
                                      >
                                        {concurrent.length > 1 && heightPx < 40 ? (
                                          // Concurrent small bar: truncated text with icons below
                                          <div className="h-full flex flex-col items-start justify-between gap-0.5 w-full">
                                            <div className="flex items-center gap-1.5 min-w-0 w-full">
                                              <span className="shrink-0 inline-flex items-center leading-none text-[9px]">
                                                {isActivityCopy ? (
                                                  <FaBars className="w-2.5 h-2.5" style={{ color: copyIconColor || undefined }} />
                                                ) : isTaskCopy ? (
                                                  <span
                                                    className="inline-block w-2.5 h-2.5 rounded-[3px]"
                                                    style={{ backgroundColor: copyIconColor || "#22c55e" }}
                                                  />
                                                ) : (
                                                  <span
                                                    className="inline-block w-2.5 h-2.5 rounded-[3px]"
                                                    style={{
                                                      backgroundColor:
                                                        copyIconColor ||
                                                        (typeof kindColor === "string" && !kindColor.startsWith("bg-")
                                                          ? kindColor
                                                          : "#4DC3D8"),
                                                    }}
                                                  />
                                                )}
                                              </span>
                                              <span className="text-[9px] font-medium leading-tight truncate" tabIndex={0} aria-label={ev.title}>
                                                {ev.title}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-0.5 shrink-0">
                                              <button
                                                className="p-0 rounded hover:bg-black/10 transition-colors flex-shrink-0"
                                                onClick={(e) => {
                                                  try {
                                                    e.stopPropagation();
                                                  } catch {}
                                                  onEventClick && onEventClick(ev, "edit");
                                                }}
                                                aria-label={`Edit ${ev.title}`}
                                                title="Edit appointment"
                                              >
                                                <FaEdit className="w-2 h-2 text-blue-600" />
                                              </button>
                                              <button
                                                className="p-0 rounded hover:bg-black/10 transition-colors flex-shrink-0"
                                                onClick={(e) => {
                                                  try {
                                                    e.stopPropagation();
                                                  } catch {}
                                                  if (typeof onDeleteRequest === "function") return onDeleteRequest(ev, e);
                                                  onEventClick && onEventClick(ev, "delete");
                                                }}
                                                aria-label={`Delete ${ev.title}`}
                                                title="Delete appointment"
                                              >
                                                <FaTrash className="w-2 h-2 text-red-600" />
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          // Non-concurrent or larger bar: inline icons
                                          <div className="h-full flex items-center gap-1.5 w-full min-w-0">
                                            <span className="shrink-0 inline-flex items-center leading-none">
                                              {isActivityCopy ? (
                                                <FaBars className="w-3 h-3" style={{ color: copyIconColor || undefined }} />
                                              ) : isTaskCopy ? (
                                                <span
                                                  className="inline-block w-3 h-3 rounded-[3px]"
                                                  style={{ backgroundColor: copyIconColor || "#22c55e" }}
                                                />
                                              ) : (
                                                <span
                                                  className="inline-block w-3 h-3 rounded-[3px]"
                                                  style={{
                                                    backgroundColor:
                                                      copyIconColor ||
                                                      (typeof kindColor === "string" && !kindColor.startsWith("bg-")
                                                        ? kindColor
                                                        : "#4DC3D8"),
                                                  }}
                                                />
                                              )}
                                            </span>
                                            <span className="truncate whitespace-nowrap text-[11px] min-w-0 flex-1 leading-4 font-medium" tabIndex={0} aria-label={ev.title}>
                                              {ev.title}
                                            </span>
                                            <div className="flex items-center gap-0.5 shrink-0">
                                              <button
                                                className="p-0.5 rounded hover:bg-black/10 transition-colors"
                                                onClick={(e) => {
                                                  try {
                                                    e.stopPropagation();
                                                  } catch {}
                                                  onEventClick && onEventClick(ev, "edit");
                                                }}
                                                aria-label={`Edit ${ev.title}`}
                                                title="Edit appointment"
                                              >
                                                <FaEdit className="w-2.5 h-2.5 text-blue-600" />
                                              </button>
                                              <button
                                                className="p-0.5 rounded hover:bg-black/10 transition-colors"
                                                onClick={(e) => {
                                                  try {
                                                    e.stopPropagation();
                                                  } catch {}
                                                  if (typeof onDeleteRequest === "function") return onDeleteRequest(ev, e);
                                                  onEventClick && onEventClick(ev, "delete");
                                                }}
                                                aria-label={`Delete ${ev.title}`}
                                                title="Delete appointment"
                                              >
                                                <FaTrash className="w-2.5 h-2.5 text-red-600" />
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <div
                                        role="separator"
                                        aria-orientation="horizontal"
                                        onPointerDown={(e) => startResize(e, ev, "top")}
                                        className="absolute left-0 right-0 h-2 -top-1 cursor-ns-resize"
                                        style={{ zIndex: 30 }}
                                      />
                                      <div
                                        role="separator"
                                        aria-orientation="horizontal"
                                        onPointerDown={(e) => startResize(e, ev, "bottom")}
                                        className="absolute left-0 right-0 h-2 -bottom-1 cursor-ns-resize"
                                        style={{ zIndex: 30 }}
                                      />
                                    </div>
                                  );
                                } catch {
                                  return null;
                                }
                              });
                          })}

                          {resizing && resizing.previewTop != null && resizing.colIndex >= 0 && (
                            <div
                              className="absolute rounded pointer-events-none border-2 border-dashed border-slate-400 bg-slate-200/30"
                              style={{
                                top: resizing.previewTop + "px",
                                left: `${TIME_COL_PX + (resizing.colIndex * colW) + 6}px`,
                                width: `${Math.max(24, colW - 12)}px`,
                                height: resizing.previewHeight + "px",
                                zIndex: 40,
                              }}
                            >
                              <div className="absolute -top-6 left-2 bg-black text-white text-[11px] px-2 py-0.5 rounded">
                                {resizing.previewStart
                                  ? (formatTime
                                      ? formatTime(`${String(resizing.previewStart.getHours()).padStart(2, "0")}:${String(resizing.previewStart.getMinutes()).padStart(2, "0")}`)
                                      : `${String(resizing.previewStart.getHours()).padStart(2, "0")}:${String(resizing.previewStart.getMinutes()).padStart(2, "0")}`)
                                  : ""}
                                {" — "}
                                {resizing.previewEnd
                                  ? (formatTime
                                      ? formatTime(`${String(resizing.previewEnd.getHours()).padStart(2, "0")}:${String(resizing.previewEnd.getMinutes()).padStart(2, "0")}`)
                                      : `${String(resizing.previewEnd.getHours()).padStart(2, "0")}:${String(resizing.previewEnd.getMinutes()).padStart(2, "0")}`)
                                  : ""}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    } catch (e) {
                      return (
                        <div ref={ref} style={{ ...style, position: "relative" }}>
                          {children}
                        </div>
                      );
                    }
                })}
              >
                {({ index, style }) => {
                    const slot = slots[index];
                    const [slotHour, slotMinute] = slot.split(":").map((n) => parseInt(n, 10) || 0);

                    const isHourBoundary = slotMinute === 0;
                    const isHalfHourBoundary = slotMinute === 30;
                    const isQuarterHourBoundary = slotMinute % 15 === 0 && slotMinute % 30 !== 0;
                    const shouldShowSlotLabel = slotSize === 15 ? slotMinute % 15 === 0 : slotMinute % 30 === 0;

                    const slotIsWorking = isWorkingTime ? isWorkingTime(slot) : true;

                    const hourLabelClass = isHourBoundary
                      ? (slotIsWorking ? "text-[12px] font-semibold text-slate-700" : "text-[12px] font-semibold text-slate-500")
                      : (slotIsWorking ? "text-[11px] text-gray-500" : "text-[11px] text-gray-400");

                    const rowBorderClass = isHourBoundary ? "border-t border-slate-400" : "";

                    return (
                      <div
                        key={index}
                        data-slot-index={index}
                        style={{ ...style, overflow: "visible", boxSizing: "border-box" }}
                        className={`relative flex w-full bg-white ${rowBorderClass}`}
                      >
                        {/* LEFT: hour labels */}
                        <div
                          className="px-2 text-xs text-gray-500 flex-shrink-0 flex items-center justify-center relative"
                          style={{
                            width: TIME_COL_PX + "px",
                            minWidth: TIME_COL_PX + "px",
                            maxWidth: TIME_COL_PX + "px",
                            boxSizing: "border-box",
                            height: ITEM_SIZE,
                            backgroundColor: slotIsWorking ? "#ffffff" : NON_WORK_BG,
                            borderTopStyle: !isHourBoundary && (isHalfHourBoundary || isQuarterHourBoundary)
                              ? (isHalfHourBoundary ? "solid" : "dotted")
                              : undefined,
                            borderTopWidth: !isHourBoundary && (isHalfHourBoundary || isQuarterHourBoundary)
                              ? "1px"
                              : undefined,
                            borderTopColor: !isHourBoundary && (isHalfHourBoundary || isQuarterHourBoundary)
                              ? (isHalfHourBoundary ? "rgba(148,163,184,0.3)" : "rgba(148,163,184,0.2)")
                              : undefined,
                          }}
                        >
                          <span className={`pl-2 ${hourLabelClass}`}>{shouldShowSlotLabel ? (formatTime ? formatTime(slot) : slot) : ""}</span>
                        </div>

                        {/* RIGHT: grid cells */}
                        {days.map((date, dIdx) => {
                          const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                          const previewSlotCount = Math.max(1, Math.ceil(30 / Math.max(1, slotSize)));
                          const isHoverPreview =
                            hoveredQuickCreateCell &&
                            hoveredQuickCreateCell.dayKey === dayKey &&
                            index >= hoveredQuickCreateCell.slotIndex &&
                            index < hoveredQuickCreateCell.slotIndex + previewSlotCount;
                          const slotDragKey = `${dayKey}|${slot}`;
                          const isDragOverSlot = dragOverTimeSlot === slotDragKey;
                          return (
                              <div
                                key={dIdx}
                                data-week-slot-key={slotDragKey}
                                data-week-slot-day={dayKey}
                                data-week-slot-time={slot}
                              className="px-2 align-top group flex items-center relative overflow-visible"
                              style={{
                                flex: "1 1 0",
                                minWidth: 0,
                                height: ITEM_SIZE,
                                boxSizing: "border-box",
                                cursor: "pointer",
                                backgroundColor: isDragOverSlot
                                  ? "rgba(191, 219, 254, 0.65)"
                                  : isHoverPreview
                                    ? "rgba(191, 219, 254, 0.65)"
                                    : (slotIsWorking ? "#ffffff" : NON_WORK_BG),
                                opacity: slotIsWorking ? 1 : NON_WORK_OPACITY,
                                touchAction: (mobileDragItem || mobileDragPending) ? "none" : "auto",
                                borderTopStyle: !isHourBoundary && (isHalfHourBoundary || isQuarterHourBoundary)
                                  ? (isHalfHourBoundary ? "solid" : "dotted")
                                  : undefined,
                                borderTopWidth: !isHourBoundary && (isHalfHourBoundary || isQuarterHourBoundary)
                                  ? "1px"
                                  : undefined,
                                borderTopColor: !isHourBoundary && (isHalfHourBoundary || isQuarterHourBoundary)
                                  ? (isHalfHourBoundary ? "rgba(148,163,184,0.3)" : "rgba(148,163,184,0.2)")
                                  : undefined,
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try { e.dataTransfer.dropEffect = "copy"; } catch {}
                                setDragOverTimeSlot(slotDragKey);
                              }}
                              onDragLeave={(e) => {
                                e.preventDefault();
                                if (!e.currentTarget.contains(e.relatedTarget)) {
                                  setDragOverTimeSlot((prev) => (prev === slotDragKey ? null : prev));
                                }
                              }}
                              onDrop={(e) => handleDrop(e, date, slot)}
                              onPointerEnter={() => {
                                if (mobileDragItem) setDragOverTimeSlot(slotDragKey);
                              }}
                              onPointerUp={(e) => {
                                if (!mobileDragItem) return;
                                try {
                                  e.preventDefault();
                                  e.stopPropagation();
                                } catch (_) {}
                                applyMobileDropToSlot(date, slot);
                              }}
                              onClick={(e) => {
                                try { e.stopPropagation(); } catch {}
                                const [h, m] = slot.split(":");
                                const dt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Number(h), Number(m));
                                onQuickCreate && onQuickCreate(dt);
                              }}
                              onMouseEnter={() => {
                                setHoveredQuickCreateCell({ dayKey, slotIndex: index });
                              }}
                              onMouseLeave={() => {
                                setHoveredQuickCreateCell((prev) =>
                                  prev && prev.dayKey === dayKey && prev.slotIndex === index ? null : prev
                                );
                              }}
                            >
                            </div>
                          );
                        })}
                      </div>
                    );
                }}
              </FixedSizeList>

              {/* Persistent today column highlight (continuous, independent of row scrolling) */}
              {todayColumnIndex >= 0 && todayGridColWidth > 0 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute"
                  style={{
                    left: `${TIME_COL_PX + todayColumnIndex * todayGridColWidth}px`,
                    width: `${Math.max(0, todayGridColWidth)}px`,
                    top: 0,
                    bottom: 0,
                    backgroundColor: "rgba(59,130,246,0.10)",
                    zIndex: 1,
                  }}
                />
              )}

              {/* Column overlay for Today blink */}
              {colOverlay && colOverlay.visible && (
                <div
                  className="today-row-overlay"
                  style={{
                    position: "absolute",
                    left: colOverlay.left,
                    top: colOverlay.top,
                    width: colOverlay.width,
                    height: colOverlay.height,
                    zIndex: 8,
                    pointerEvents: "none",
                    backgroundColor: "rgba(59,130,246,0.32)",
                  }}
                />
              )}
            </div>

            {/* ✅ FIXED splitter: bigger hit area + fallback handlers */}
            <div
              ref={bottomSplitterRef}
              role="separator"
              aria-label="Resize tasks and activities panel"
              className="w-full relative"
              style={{
                height: 10,
                cursor: "row-resize",
                touchAction: "none",
                zIndex: 2,
                pointerEvents: "auto",
                flex: "0 0 auto",
              }}
              onMouseDown={startBottomPanelResize}
              onTouchStart={startBottomPanelResize}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "50%",
                  height: 1,
                  transform: "translateY(-50%)",
                  background: isBottomPanelResizing ? "rgba(37,99,235,0.75)" : "rgba(51,65,85,0.92)",
                }}
              />
              <div
                style={{
                  width: 52,
                  height: 5,
                  borderRadius: 999,
                  margin: "2.5px auto",
                  background: isBottomPanelResizing ? "rgba(37,99,235,0.9)" : "rgba(30,41,59,0.96)",
                  position: "relative",
                }}
              />
            </div>

            {/* Bottom panel (separate table with no header) */}
            <div
              className="border-x border-b border-gray-100 rounded-b-lg overflow-hidden flex-shrink-0"
              style={{
                height: bottomPanelHeight,
                minHeight: MIN_BOTTOM_PANEL_HEIGHT,
                overflow: "hidden",
              }}
            >
              <table
                className="min-w-full h-full bg-white"
                style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}
              >
                <ColGroup />
                <tbody>
                  <tr style={{ height: "100%" }}>
                    <td
                      className="relative align-top"
                      style={{
                        width: TIME_COL_PX + "px",
                        minWidth: TIME_COL_PX + "px",
                        maxWidth: TIME_COL_PX + "px",
                        boxSizing: "border-box",
                        padding: "8px 8px 8px 4px",
                        backgroundColor: "white",
                        verticalAlign: "top",
                      }}
                    >
                      <div className="flex flex-col items-start">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold shadow-sm"
                          aria-label="Create task or activity"
                          title="Create task or activity"
                          onClick={(e) => {
                            if (!onAddTaskOrActivity) return;
                            try {
                              const cell = e.currentTarget?.closest?.("td");
                              const cellRect = cell?.getBoundingClientRect?.();
                              const btnRect = e.currentTarget?.getBoundingClientRect?.();
                              const menuHeight = 82;
                              const baseX = cellRect && btnRect ? (btnRect.right - cellRect.left + 10) : 44;
                              const baseY = cellRect && btnRect
                                ? (btnRect.top - cellRect.top + Math.max(0, (btnRect.height - menuHeight) / 2))
                                : 8;
                              const x = Math.max(6, baseX);
                              const y = cellRect
                                ? Math.max(6, Math.min(baseY, cellRect.height - menuHeight - 6))
                                : Math.max(6, baseY);
                              setQuickAddMenu({
                                open: true,
                                x,
                                y,
                                dayKey: LEFT_QUICK_ADD_MENU_KEY,
                                date: currentDate || new Date(),
                              });
                            } catch (_) {
                              setQuickAddMenu({
                                open: true,
                                x: 40,
                                y: 8,
                                dayKey: LEFT_QUICK_ADD_MENU_KEY,
                                date: currentDate || new Date(),
                              });
                            }
                          }}
                        >
                          +
                        </button>
                      </div>
                      {quickAddMenu.open && quickAddMenu.dayKey === LEFT_QUICK_ADD_MENU_KEY ? (
                        <div
                          ref={quickAddMenuRef}
                          data-week-quick-add-menu="true"
                          className="absolute z-20 w-36 rounded-md border border-slate-200 bg-white shadow-lg p-1"
                          style={{ left: quickAddMenu.x, top: quickAddMenu.y }}
                        >
                          <button
                            type="button"
                            className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-50"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              onAddTaskOrActivity && onAddTaskOrActivity(quickAddMenu.date || (currentDate || new Date()), { defaultTab: "task" });
                              setQuickAddMenu({ open: false, x: 0, y: 0, dayKey: null, date: null });
                            }}
                          >
                            Create task
                          </button>
                          <button
                            type="button"
                            className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-50"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              onAddTaskOrActivity && onAddTaskOrActivity(quickAddMenu.date || (currentDate || new Date()), { defaultTab: "activity" });
                              setQuickAddMenu({ open: false, x: 0, y: 0, dayKey: null, date: null });
                            }}
                          >
                            Create activity
                          </button>
                        </div>
                      ) : null}
                    </td>

                    {days.map((date, dIdx) => {
                  const isTodayCol = isTodayColumn(date);
                  const startDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
                  const endDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

                  const dayTodos = (Array.isArray(todos) ? todos : [])
                    .filter((t) => {
                      try {
                        const s = t.startDate || t.start_date || t.date || t.dueDate || t.due_date || null;
                        const e = t.endDate || t.end_date || t.date || t.dueDate || t.due_date || s || null;
                        const sDt = s ? new Date(s) : null;
                        const eDt = e ? new Date(e) : null;
                        if (!sDt || !eDt) return false;
                        return sDt <= endDay && eDt >= startDay;
                      } catch {
                        return false;
                      }
                    })
                    .map((t) => ({ ...t, __type: "task" }));

                  const dayActivities = (Array.isArray(activities) ? activities : [])
                    .filter((a) => {
                      try {
                        const cand = new Date(
                          a.date ||
                            a.startDate ||
                            a.start_date ||
                            a.dueDate ||
                            a.due_date ||
                            a.createdAt ||
                            a.created_at ||
                            null
                        );
                        if (isNaN(cand.getTime())) return false;
                        return (
                          cand.getFullYear() === date.getFullYear() &&
                          cand.getMonth() === date.getMonth() &&
                          cand.getDate() === date.getDate()
                        );
                      } catch {
                        return false;
                      }
                    })
                    .map((a) => ({ ...a, __type: "activity" }));

                  const combined = [...dayTodos, ...dayActivities].sort((x, y) => {
                    const getTime = (it) => {
                      try {
                        if (it.__type === "task") {
                          const s = it.startDate || it.start_date || it.date || it.dueDate || it.due_date || null;
                          return s ? new Date(s).getTime() : 0;
                        }
                        const s2 =
                          it.date ||
                          it.startDate ||
                          it.start_date ||
                          it.dueDate ||
                          it.due_date ||
                          it.createdAt ||
                          it.created_at ||
                          null;
                        return s2 ? new Date(s2).getTime() : 0;
                      } catch {
                        return 0;
                      }
                    };
                    return (getTime(x) || 0) - (getTime(y) || 0);
                  });

                  return (
                    <td
                      key={`col-${dIdx}`}
                      data-week-bottom-day={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
                      className="week-bottom-list-cell relative align-top p-2 h-full overflow-visible cursor-pointer"
                      title="Double-click to create task or activity"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try { e.dataTransfer.dropEffect = "move"; } catch {}
                        setDragOverBottomDayKey(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          setDragOverBottomDayKey((prev) => (prev === dayKey ? null : prev));
                        }
                      }}
                      onDrop={(e) => handleBottomColumnDrop(e, date)}
                      onMouseMove={(e) => {
                        const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                        try {
                          const inRow = e.target?.closest?.('[data-week-item-row="true"]');
                          const inActions = e.target?.closest?.('details[data-week-actions-menu="true"]');
                          const inQuickAdd = e.target?.closest?.('[data-week-quick-add-menu="true"]');
                          if (inRow || inActions || inQuickAdd) {
                            setHoveredQuickAddDayKey((prev) => (prev === dayKey ? null : prev));
                            return;
                          }
                        } catch (_) {}
                        setHoveredQuickAddDayKey(dayKey);
                      }}
                      onMouseLeave={() => setHoveredQuickAddDayKey((prev) => (prev === `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` ? null : prev))}
                      onDoubleClick={(e) => {
                        if (!onAddTaskOrActivity) return;
                        try {
                          const inRow = e.target?.closest?.('[data-week-item-row="true"]');
                          const inActions = e.target?.closest?.('details[data-week-actions-menu="true"]');
                          if (inRow || inActions) return;
                        } catch (_) {}
                        const rect = e.currentTarget.getBoundingClientRect();
                        const menuWidth = 148;
                        const menuHeight = 82;
                        const nextX = Math.max(6, Math.min((e.clientX - rect.left) + 6, rect.width - menuWidth - 6));
                        const nextY = Math.max(6, Math.min((e.clientY - rect.top) + 6, rect.height - menuHeight - 6));
                        setQuickAddMenu({
                          open: true,
                          x: nextX,
                          y: nextY,
                          dayKey: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
                          date: new Date(date),
                        });
                      }}
                      style={{
                        backgroundColor:
                          dragOverBottomDayKey === `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
                            ? "rgba(191, 219, 254, 0.65)"
                            :
                          hoveredQuickAddDayKey === `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
                            ? "rgba(239, 246, 255, 0.45)"
                            : (isTodayCol ? "rgba(59,130,246,0.10)" : undefined),
                        verticalAlign: "top",
                      }}
                    >
                      <div className="week-bottom-list-scroll relative h-full min-h-0 flex flex-col gap-0 overflow-y-auto overflow-x-hidden">
                        {combined.map((item) => {
                          if (item.__type === "task") {
                            const t = item;
                            const taskMeta = t?.id ? taskMetaMap[String(t.id)] : null;
                            const taskKeyAreaId =
                              t?.keyAreaId ??
                              t?.key_area_id ??
                              t?.keyArea?.id ??
                              t?.key_area?.id ??
                              taskMeta?.keyAreaId ??
                              null;
                            const ka =
                              taskKeyAreaId ? keyAreaMap[String(taskKeyAreaId)] : null;
                            const DEFAULT_ACCENT_COLOR = "#4DC3D8";
                            const kaColor = ka && ka.color ? ka.color : null;
                            const accentColor = kaColor || DEFAULT_ACCENT_COLOR;
                            const isIdeasKeyArea = String(ka?.title || "")
                              .trim()
                              .toLowerCase() === "ideas";
                            const keyAreaNumber = toDisplayIndex(
                              isIdeasKeyArea
                                ? 10
                                : (
                                  keyAreaOrderMap[String(taskKeyAreaId)] ??
                                  ka?.position ??
                                  t?.keyAreaPosition ??
                                  t?.keyArea?.position ??
                                  t?.key_area?.position ??
                                  null
                                )
                            );
                            const listNumber = toDisplayIndex(
                              t?.list_index ?? t?.listIndex ?? t?.list ?? taskMeta?.listIndex
                            );
                            const keyAreaListLabel =
                              keyAreaNumber > 0 && listNumber > 0
                                ? `${keyAreaNumber}.${listNumber}`
                                : null;

                            return (
                              <div
                                key={`task-${t.id}`}
                                data-week-item-row="true"
                                draggable={!isCompactViewport()}
                                onTouchStart={(e) => {
                                  beginMobileDrag(e, {
                                    kind: "task",
                                    id: String(t.id),
                                    text: String(t.title || t.name || "Task"),
                                    sourceIso:
                                      t.startDate ||
                                      t.start_date ||
                                      t.date ||
                                      t.dueDate ||
                                      t.due_date ||
                                      null,
                                    dropEffect: "move",
                                  });
                                }}
                                onPointerDown={(e) => {
                                  beginMobileDrag(e, {
                                    kind: "task",
                                    id: String(t.id),
                                    text: String(t.title || t.name || "Task"),
                                    sourceIso:
                                      t.startDate ||
                                      t.start_date ||
                                      t.date ||
                                      t.dueDate ||
                                      t.due_date ||
                                      null,
                                    dropEffect: "move",
                                  });
                                }}
                                onDragStart={(e) => {
                                  try {
                                    const taskStart =
                                      t.startDate ||
                                      t.start_date ||
                                      t.date ||
                                      t.dueDate ||
                                      t.due_date ||
                                      null;
                                    e.dataTransfer.setData("taskId", String(t.id));
                                    e.dataTransfer.setData("text/plain", String(t.title || t.name || "Task"));
                                    e.dataTransfer.setData("taskText", String(t.title || t.name || "Task"));
                                    if (taskStart) e.dataTransfer.setData("dragSourceStart", String(taskStart));
                                    e.dataTransfer.setData("dragEffect", "move");
                                    e.dataTransfer.effectAllowed = "copyMove";
                                  } catch (err) {
                                    console.error("[WeekView] Task drag start error", err);
                                  }
                                }}
                                className="group px-1.5 py-1 text-xs cursor-grab active:cursor-grabbing min-w-0 flex items-center gap-0.5 border-b border-sky-200 transition-colors hover:bg-sky-50 shrink-0 min-h-[28px]"
                                style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
                                title={t.title || t.name}
                              >
                                <span
                                  className="w-3 h-3 rounded-[3px] shrink-0"
                                  style={{ backgroundColor: accentColor }}
                                  aria-hidden="true"
                                />
                                <div className="truncate flex-1 text-xs text-[#4DC3D8]">{t.title || t.name}</div>
                                {keyAreaListLabel ? (
                                  <span className="shrink-0 text-[11px] font-semibold text-[#4DC3D8] mr-0.5">
                                    {keyAreaListLabel}
                                  </span>
                                ) : null}
                                <details data-week-actions-menu="true" className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <summary
                                    onClick={handleRowMenuSummaryClick}
                                    className="list-none p-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Task actions"
                                  >
                                    <FaEllipsisV className="w-3 h-3 text-slate-600" />
                                  </summary>
                                  <div
                                    className="fixed z-[3000] w-28 rounded-md border border-slate-200 bg-white shadow-lg py-0.5"
                                    style={{
                                      left: "var(--week-actions-menu-left, 0px)",
                                      top: "var(--week-actions-menu-top, 0px)",
                                    }}
                                  >
                                    {onTaskComplete && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onTaskComplete(t);
                                          const detailsEl = e.currentTarget.closest("details");
                                          if (detailsEl) detailsEl.removeAttribute("open");
                                        }}
                                        className="w-full px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-green-50 inline-flex items-center gap-1.5 whitespace-nowrap"
                                      >
                                        <FaCheck className="w-2.5 h-2.5 text-green-600" />
                                        <span>Mark complete</span>
                                      </button>
                                    )}
                                    {onTaskEdit && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onTaskEdit(t);
                                          const detailsEl = e.currentTarget.closest("details");
                                          if (detailsEl) detailsEl.removeAttribute("open");
                                        }}
                                        className="w-full px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap"
                                      >
                                        <FaEdit className="w-2.5 h-2.5 text-slate-600" />
                                        <span>Edit</span>
                                      </button>
                                    )}
                                    {onTaskDelete && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onTaskDelete(t);
                                          const detailsEl = e.currentTarget.closest("details");
                                          if (detailsEl) detailsEl.removeAttribute("open");
                                        }}
                                        className="w-full px-2 py-1 text-left text-[11px] text-red-700 hover:bg-red-50 inline-flex items-center gap-1.5 whitespace-nowrap"
                                      >
                                        <FaTrash className="w-2.5 h-2.5 text-red-600" />
                                        <span>Delete</span>
                                      </button>
                                    )}
                                  </div>
                                </details>
                              </div>
                            );
                          }

                          // activity
                          const a = item;
                          let ka = null;
                          if (a.taskId || a.task_id) {
                            const parent = (Array.isArray(todos) ? todos : []).find(
                              (t) => String(t.id) === String(a.taskId || a.task_id)
                            );
                            if (parent) ka = keyAreaMap[String(parent.keyAreaId || parent.key_area_id)];
                          }
                          if (!ka && (a.keyAreaId || a.key_area_id)) {
                            ka = keyAreaMap[String(a.keyAreaId || a.key_area_id)];
                          }

                          const DEFAULT_ACCENT_COLOR = "#4DC3D8";
                          const kaColor = ka && ka.color ? ka.color : null;
                          const accentColor = kaColor || DEFAULT_ACCENT_COLOR;

                          return (
                            <div
                              key={`act-${a.id}`}
                              data-week-item-row="true"
                              draggable={!isCompactViewport()}
                              onTouchStart={(e) => {
                                beginMobileDrag(e, {
                                  kind: "activity",
                                  id: String(a.id || ""),
                                  text: String(a.text || a.title || "Activity"),
                                  sourceIso:
                                    a.date ||
                                    a.startDate ||
                                    a.start_date ||
                                    a.dueDate ||
                                    a.due_date ||
                                    a.createdAt ||
                                    a.created_at ||
                                    null,
                                  dropEffect: "move",
                                });
                              }}
                              onPointerDown={(e) => {
                                beginMobileDrag(e, {
                                  kind: "activity",
                                  id: String(a.id || ""),
                                  text: String(a.text || a.title || "Activity"),
                                  sourceIso:
                                    a.date ||
                                    a.startDate ||
                                    a.start_date ||
                                    a.dueDate ||
                                    a.due_date ||
                                    a.createdAt ||
                                    a.created_at ||
                                    null,
                                  dropEffect: "move",
                                });
                              }}
                              onDragStart={(e) => {
                                try {
                                  const activityStart =
                                    a.date ||
                                    a.startDate ||
                                    a.start_date ||
                                    a.dueDate ||
                                    a.due_date ||
                                    a.createdAt ||
                                    a.created_at ||
                                    null;
                                  e.dataTransfer.setData("activityId", String(a.id || ""));
                                  e.dataTransfer.setData("activityText", String(a.text || a.title || "Activity"));
                                  e.dataTransfer.setData("text/plain", String(a.text || a.title || "Activity"));
                                  if (activityStart) e.dataTransfer.setData("dragSourceStart", String(activityStart));
                                  e.dataTransfer.setData("dragEffect", "move");
                                  e.dataTransfer.effectAllowed = "copyMove";
                                } catch (err) {
                                  console.error("[WeekView] Activity drag start error", err);
                                }
                              }}
                              className="group px-1.5 py-1 text-xs w-full flex items-center gap-2 border-b border-sky-200 transition-colors hover:bg-sky-50 shrink-0 min-h-[28px]"
                              style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
                              title={a.text || a.title}
                            >
                              <FaBars className="w-3 h-3 shrink-0" style={{ color: accentColor }} aria-hidden="true" />
                              <div className="truncate flex-1 text-xs text-[#4DC3D8]">{a.text || a.title}</div>
                              <details data-week-actions-menu="true" className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                                <summary
                                  onClick={handleRowMenuSummaryClick}
                                  className="list-none p-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Activity actions"
                                >
                                  <FaEllipsisV className="w-3 h-3 text-slate-600" />
                                </summary>
                                <div
                                  className="fixed z-[3000] w-28 rounded-md border border-slate-200 bg-white shadow-lg py-0.5"
                                  style={{
                                    left: "var(--week-actions-menu-left, 0px)",
                                    top: "var(--week-actions-menu-top, 0px)",
                                  }}
                                >
                                  {onActivityComplete && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onActivityComplete(a);
                                        const detailsEl = e.currentTarget.closest("details");
                                        if (detailsEl) detailsEl.removeAttribute("open");
                                      }}
                                      className="w-full px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-green-50 inline-flex items-center gap-1.5 whitespace-nowrap"
                                    >
                                      <FaCheck className="w-2.5 h-2.5 text-green-600" />
                                      <span>Mark complete</span>
                                    </button>
                                  )}
                                  {onActivityEdit && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onActivityEdit(a);
                                        const detailsEl = e.currentTarget.closest("details");
                                        if (detailsEl) detailsEl.removeAttribute("open");
                                      }}
                                      className="w-full px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap"
                                    >
                                      <FaEdit className="w-2.5 h-2.5 text-slate-600" />
                                      <span>Edit</span>
                                    </button>
                                  )}
                                  {onActivityDelete && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onActivityDelete(a);
                                        const detailsEl = e.currentTarget.closest("details");
                                        if (detailsEl) detailsEl.removeAttribute("open");
                                      }}
                                      className="w-full px-2 py-1 text-left text-[11px] text-red-700 hover:bg-red-50 inline-flex items-center gap-1.5 whitespace-nowrap"
                                    >
                                      <FaTrash className="w-2.5 h-2.5 text-red-600" />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              </details>
                            </div>
                          );
                        })}
                      </div>
                      {quickAddMenu.open && quickAddMenu.dayKey === `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` ? (
                        <div
                          ref={quickAddMenuRef}
                          data-week-quick-add-menu="true"
                          className="absolute z-20 w-36 rounded-md border border-slate-200 bg-white shadow-lg p-1"
                          style={{ left: quickAddMenu.x, top: quickAddMenu.y }}
                        >
                          <button
                            type="button"
                            className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-50"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              onAddTaskOrActivity && onAddTaskOrActivity(quickAddMenu.date || date, { defaultTab: "task" });
                              setQuickAddMenu({ open: false, x: 0, y: 0, dayKey: null, date: null });
                            }}
                          >
                            Create task
                          </button>
                          <button
                            type="button"
                            className="w-full rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-50"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              onAddTaskOrActivity && onAddTaskOrActivity(quickAddMenu.date || date, { defaultTab: "activity" });
                              setQuickAddMenu({ open: false, x: 0, y: 0, dayKey: null, date: null });
                            }}
                          >
                            Create activity
                          </button>
                        </div>
                      ) : null}
                    </td>
                  );
                })}
                  </tr>
                </tbody>
              </table>
            </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default WeekView;
