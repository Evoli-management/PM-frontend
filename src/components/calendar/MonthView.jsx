import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { useCalendarPreferences } from "../../hooks/useCalendarPreferences";
import { FaChevronLeft, FaChevronRight, FaChevronDown } from "react-icons/fa";
import { FaEdit, FaTrash } from "react-icons/fa";

// Memoized small renderers to avoid re-renders during MonthView updates
const EventOverlayItem = React.memo(function EventOverlayItem({
  o,
  categories,
  keyAreaMap,
  tailwindColorCache,
  getContrastTextColor,
  onEventClick,
}) {
  try {
    const ev = o.ev;
    const ka = keyAreaMap?.[String(ev?.keyAreaId || ev?.key_area_id || "")];
    const color = ka?.color || categories?.[ev.kind]?.color || "#4DC3D8";
    const isTailwind = typeof color === "string" && color.startsWith("bg-");
    const resolvedTailwind = isTailwind ? tailwindColorCache[color] : null;
    const resolved = !isTailwind ? color : resolvedTailwind;
    const styleBg = resolved
      ? {
          backgroundColor: resolved,
          border: `1px solid ${resolved}`,
          color: getContrastTextColor(resolved),
        }
      : {};
    const classForBg = isTailwind ? color : "";

    return (
      <div
        title={ev.title}
        style={{
          position: "absolute",
          left: o.left,
          top: o.top,
          width: o.width,
          height: o.height,
          zIndex: 160,
          pointerEvents: "auto",
          borderRadius: 6,
          paddingLeft: 8,
          paddingRight: 8,
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
          ...styleBg,
        }}
        className={`${classForBg} group text-xs truncate whitespace-nowrap`}
      >
        <span className="shrink-0 text-xs" style={{ pointerEvents: "none" }}>
          {categories?.[ev.kind]?.icon || ""}
        </span>
        <span
          className="truncate whitespace-nowrap text-xs min-w-0 flex-1"
          style={{ pointerEvents: "none" }}
        >
          {ev.title}
        </span>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            className="p-0.5 rounded hover:bg-black/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onEventClick && onEventClick(ev, "edit-month");
            }}
            aria-label={`Edit ${ev.title}`}
            title="Edit appointment"
          >
            <FaEdit className="w-2.5 h-2.5 text-blue-600" />
          </button>
          <button
            type="button"
            className="p-0.5 rounded hover:bg-black/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onEventClick && onEventClick(ev, "delete");
            }}
            aria-label={`Delete ${ev.title}`}
            title="Delete appointment"
          >
            <FaTrash className="w-2.5 h-2.5 text-red-600" />
          </button>
        </div>
      </div>
    );
  } catch (e) {
    return null;
  }
});

const RangeTaskBar = React.memo(function RangeTaskBar({
  r,
  overlayMetrics,
  LANE_WIDTH,
  LANE_GAP,
  LANE_HEIGHT,
  CENTERED_BAR_WIDTH,
  ALL_DAY_COL_WIDTH,
  month,
  categories,
  keyAreaMap,
  tailwindColorCache,
  getContrastTextColor,
  onTaskClick,
  onEventClick,
}) {
  try {
    if (r.lane == null) return null;

    const startIdx = Math.max(
      0,
      r.start.getMonth() === month ? r.start.getDate() - 1 : 0
    );
    const endIdx = Math.min(
      overlayMetrics.rows.length - 1,
      r.end.getMonth() === month
        ? r.end.getDate() - 1
        : overlayMetrics.rows.length - 1
    );
    if (startIdx > endIdx) return null;

    const top = overlayMetrics.rows[startIdx]?.top ?? 0;
    const bottom = overlayMetrics.rows[endIdx]?.bottom ?? top;

    const laneOffset = r.lane * (LANE_HEIGHT + LANE_GAP);
    const topShifted = top + laneOffset;
    const bottomShifted = bottom + laneOffset;
    const height = Math.max(2, bottomShifted - topShifted);

    const barWidth = Math.max(
      20,
      Math.min(overlayMetrics.colWidth - 12, CENTERED_BAR_WIDTH)
    );
    const left = Math.round(
      Math.max(4, (overlayMetrics.colWidth - barWidth) / 2)
    );

    const ka = keyAreaMap?.[String(r.task?.keyAreaId || r.task?.key_area_id)];
    let categoryColor = ka?.color || categories?.[r.task?.kind]?.color;

    const isTailwind =
      typeof categoryColor === "string" && categoryColor.startsWith("bg-");
    const isColorStr = typeof categoryColor === "string" && !isTailwind;

    const classForBg = isTailwind ? categoryColor : "";
    const classForBgFinal = classForBg || "bg-gray-200";

    const resolvedTailwind = isTailwind
      ? tailwindColorCache[categoryColor]
      : null;
    const resolved = isColorStr ? categoryColor : resolvedTailwind;

    const styleBg = resolved
      ? {
          backgroundColor: resolved,
          border: `1px solid ${resolved}`,
          color: getContrastTextColor(resolved),
        }
      : {};

    return (
      <div
        className={classForBgFinal}
        style={{
          position: "absolute",
          top: topShifted,
          left,
          width: barWidth,
          height,
          overflow: "hidden",
          zIndex: 150,
          display: "flex",
          alignItems: "center",
          paddingLeft: 8,
          paddingRight: 8,
          borderRadius: 6,
          pointerEvents: "auto",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
          ...styleBg,
        }}
        title={r.task?.title}
        onClick={(e) => {
          e.stopPropagation();
          if (typeof onEventClick === "function") onEventClick(r.task);
          else if (typeof onTaskClick === "function") onTaskClick(r.task);
        }}
      >
        <span className="shrink-0 text-xs" style={{ pointerEvents: "none" }}>
          {categories?.[r.task?.kind]?.icon || ""}
        </span>
        <span
          className="truncate whitespace-nowrap text-xs min-w-0 flex-1"
          style={{ pointerEvents: "none" }}
        >
          {r.task?.title}
        </span>
      </div>
    );
  } catch (e) {
    return null;
  }
});

export default function MonthView({
  currentDate,
  onShiftDate,
  events,
  todos = [],
  categories,
  onEventClick,
  onTaskClick,
  view,
  onChangeView,
  filterType,
  onChangeFilter,
  onQuickCreate,
  enableQuickCreate = true,
  onTaskDrop,
}) {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const {
    timeSlots,
    workingHours,
    formatTime,
    loading: prefsLoading,
    isWorkingTime,
  } = useCalendarPreferences(30);

  const NON_WORK_BG = "#f8fafc";
  const NON_WORK_OPACITY = 0.75;

  const ALL_HOURS = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => {
        const h = Math.floor(i / 2);
        const m = i % 2 === 0 ? "00" : "30";
        return `${h.toString().padStart(2, "0")}:${m}`;
      }),
    []
  );

  const rawSlots = timeSlots && timeSlots.length > 0 ? timeSlots : ALL_HOURS;
  const SLOTS = useMemo(
    () => rawSlots.filter((s) => String(s) !== "24:00"),
    [rawSlots]
  );
  const HOUR_SLOTS = useMemo(
    () => SLOTS.filter((s) => String(s).endsWith(":00")),
    [SLOTS]
  );

  const ALL_DAY_COL_WIDTH = 120;
  const HOUR_COL_WIDTH = 180;
  const rightTableMinWidth = Math.max(800, HOUR_SLOTS.length * HOUR_COL_WIDTH);

  const BOTTOM_RADAR_HEIGHT = 26;
  const BOTTOM_HSCROLL_HEIGHT = 14;
  // ✅ increased to avoid overlap with the sticky bottom scrollbar + radar
  const BOTTOM_SCROLL_SAFE_GAP = BOTTOM_RADAR_HEIGHT + BOTTOM_HSCROLL_HEIGHT + 24 + 16;

  const LANE_WIDTH = 72;
  const LANE_GAP = 6;
  const LANE_HEIGHT = 18;
  const CENTERED_BAR_WIDTH = 60;
  const ALL_DAY_ACTION_GUTTER = 16;

  let DEBUG = false;
  try {
    DEBUG = !!(import.meta && import.meta.env && import.meta.env.DEV);
  } catch (_) {
    DEBUG = false;
  }

  let PUBLIC_URL = "";
  try {
    PUBLIC_URL = (process && process.env && process.env.PUBLIC_URL) || "";
  } catch (e) {}
  try {
    if (!PUBLIC_URL && import.meta && import.meta.env && import.meta.env.BASE_URL) {
      PUBLIC_URL = import.meta.env.BASE_URL || "";
    }
  } catch (e) {}

  const calendarSrc = (() => {
    try {
      const base = String(PUBLIC_URL || "").replace(/\/+$/g, "");
      return base ? `${base}/calendar.png` : "/calendar.png";
    } catch (e) {
      return "/calendar.png";
    }
  })();

  const WORK_START = workingHours?.startTime
    ? parseInt(String(workingHours.startTime).split(":")[0], 10)
    : 0;
  const WORK_END = workingHours?.endTime
    ? parseInt(String(workingHours.endTime).split(":")[0], 10)
    : 24;

  const today = new Date();
  const baseDate = new Date(
    (currentDate || today).getFullYear(),
    (currentDate || today).getMonth(),
    1
  );
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthDays = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
    [year, month, daysInMonth]
  );

  const isoWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - day + 3);
    const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const diff = d - firstThursday;
    const week = 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
    return week;
  };

  const weekCells = useMemo(() => {
    const out = {};
    for (let i = 0; i < monthDays.length; i++) {
      const d = monthDays[i];
      if (d.getDay() !== 1) continue;
      let span = 1;
      for (let j = i + 1; j < monthDays.length; j++) {
        if (monthDays[j].getDay() === 1) break;
        span += 1;
      }
      out[i] = { weekNumber: isoWeekNumber(d), rowSpan: span };
    }
    return out;
  }, [monthDays]);

  const toLocal = (dateStr) => new Date(dateStr);

  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(baseDate.getFullYear());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const canQuickCreate = enableQuickCreate && typeof onQuickCreate === "function";

  function parseColorToRgb(input) {
    if (!input || typeof input !== "string") return null;
    try {
      const s = input.trim();
      if (s.startsWith("#")) {
        const h = s.replace("#", "");
        const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
        const bigint = parseInt(full, 16);
        return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
      }
      if (s.startsWith("rgb")) {
        const m = s.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const parts = m[1].split(",").map((p) => p.trim());
        const r = parseInt(parts[0], 10);
        const g = parseInt(parts[1], 10);
        const b = parseInt(parts[2], 10);
        if ([r, g, b].some((n) => Number.isNaN(n))) return null;
        return { r, g, b };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function getContrastTextColor(colorStr) {
    try {
      const c = parseColorToRgb(colorStr);
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

  // key area color map
  const [keyAreaMap, setKeyAreaMap] = useState({});
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const mod = await import("../../services/keyAreaService");
        const svc = mod?.default || mod;
        const areas = await svc.list().catch(() => []);
        const map = {};
        (areas || []).forEach((a) => {
          if (a && a.id) map[String(a.id)] = a;
        });
        if (!ignore) setKeyAreaMap(map);
      } catch (e) {
        if (!ignore) setKeyAreaMap({});
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Tailwind bg cache
  const [tailwindColorCache, setTailwindColorCache] = useState({});
  useEffect(() => {
    const classes = new Set();
    try {
      if (categories && typeof categories === "object") {
        Object.values(categories).forEach((c) => {
          if (c && typeof c.color === "string" && c.color.startsWith("bg-")) classes.add(c.color);
        });
      }
      if (keyAreaMap && typeof keyAreaMap === "object") {
        Object.values(keyAreaMap).forEach((a) => {
          if (a && typeof a.color === "string" && a.color.startsWith("bg-")) classes.add(a.color);
        });
      }
    } catch (_) {}

    const missing = Array.from(classes).filter((cl) => !(cl in tailwindColorCache));
    if (missing.length === 0) return;

    const newMap = { ...tailwindColorCache };
    missing.forEach((cl) => {
      try {
        const el = document.createElement("div");
        el.style.position = "absolute";
        el.style.left = "-9999px";
        el.className = cl;
        document.body.appendChild(el);
        const bg = window.getComputedStyle(el).backgroundColor;
        document.body.removeChild(el);
        if (bg) newMap[cl] = bg;
      } catch (e) {}
    });

    setTailwindColorCache(newMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, keyAreaMap]);

  // appointmentsByDaySlot
  const appointmentsByDaySlot = useMemo(() => {
    const map = {};
    const src = Array.isArray(events) ? events : [];
    for (let ei = 0; ei < src.length; ei++) {
      const ev = src[ei];
      if (ev.taskId || !ev.start) continue;
      try {
        if (ev?.allDay) continue;
        const startLocal = toLocal(ev.start);
        const endLocal = ev.end ? toLocal(ev.end) : new Date(startLocal.getTime() + 30 * 60000);
        if (!endLocal || endLocal <= startLocal) continue;

        const startDay = new Date(startLocal.getFullYear(), startLocal.getMonth(), startLocal.getDate(), 0, 0, 0, 0);
        const endDay = new Date(endLocal.getFullYear(), endLocal.getMonth(), endLocal.getDate(), 0, 0, 0, 0);
        const dayDiff = Math.floor((endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000));
        if (dayDiff >= 1) continue;

        let cur = new Date(startLocal);
        cur.setMinutes(Math.floor(cur.getMinutes() / 30) * 30, 0, 0);

        while (cur < endLocal) {
          const dayKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(
            cur.getDate()
          ).padStart(2, "0")}`;
          if (!map[dayKey]) map[dayKey] = {};
          const slotKey = `${cur.getHours().toString().padStart(2, "0")}:${cur
            .getMinutes()
            .toString()
            .padStart(2, "0")}`;
          if (!map[dayKey][slotKey]) map[dayKey][slotKey] = [];
          map[dayKey][slotKey].push(ev);
          cur = new Date(cur.getTime() + 30 * 60000);
        }
      } catch (e) {}
    }
    return map;
  }, [events]);

  // Range task build
  const parseDateOnly = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const parseEndDateInclusive = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const hasTimeComponent = String(iso).includes("T");
    const isMidnight = d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
    if (hasTimeComponent && isMidnight) {
      const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      prev.setDate(prev.getDate() - 1);
      return prev;
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const buildRangeTasks = useMemo(() => {
    const ranges = [];
    (Array.isArray(events) ? events : []).forEach((t) => {
      if (String(t?.kind || "").toLowerCase() === "appointment") return;
      const sIso = t.start || t.startAt || t.start_at || t.startDate || t.start_date || null;
      const eIso = t.end || t.endAt || t.end_at || t.endDate || t.end_date || null;
      let s = parseDateOnly(sIso);
      let e = parseEndDateInclusive(eIso);
      if (!s && !e) return;
      if (s && e && s > e) {
        const tmp = s;
        s = e;
        e = tmp;
      }
      if (!s) s = e;
      if (!e) e = s;

      const spanDays = Math.max(1, Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1);
      if (spanDays < 2) return;
      const startKey = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(
        s.getDate()
      ).padStart(2, "0")}`;
      ranges.push({ task: t, start: s, end: e, spanDays, startKey });
    });

    const groupsMap = new Map();
    for (const r of ranges) {
      if (!groupsMap.has(r.startKey)) groupsMap.set(r.startKey, []);
      groupsMap.get(r.startKey).push(r);
    }

    const groups = Array.from(groupsMap.values()).map((items) => {
      const maxSpan = items.reduce((m, it) => Math.max(m, it.spanDays), 1);
      const startDate = items[0].start;
      items.sort((a, b) => {
        if (b.spanDays !== a.spanDays) return b.spanDays - a.spanDays;
        return String(a.task.title || "").localeCompare(String(b.task.title || ""));
      });
      return { items, maxSpan, startDate };
    });

    groups.sort((ga, gb) => {
      if (gb.maxSpan !== ga.maxSpan) return gb.maxSpan - ga.maxSpan;
      return ga.startDate - gb.startDate;
    });

    const out = [];
    let lane = 0;
    for (const g of groups) {
      for (const it of g.items) {
        out.push({ ...it, lane });
        lane += 1;
      }
    }
    return out;
  }, [events, month, year]);

  const rangeTasks = buildRangeTasks;
  const lanesCount = useMemo(() => Math.min(rangeTasks.length, 20), [rangeTasks.length]);

  const [allDayOverflow, setAllDayOverflow] = useState(null);
  const allDayPopupRef = useRef(null);

  useEffect(() => {
    if (!allDayOverflow) return;
    const onDocClick = (ev) => {
      if (!allDayPopupRef.current) return;
      if (allDayPopupRef.current.contains(ev.target)) return;
      if (ev.target?.closest?.("[data-month-all-day-overflow-trigger='true']")) return;
      setAllDayOverflow(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [allDayOverflow]);

  const MAX_VISIBLE_MULTI_DAY_LANES = 2;

  const allDayByDay = useMemo(() => {
    const out = Array.from({ length: daysInMonth }, () => ({
      visible: [],
      hidden: [],
      all: [],
    }));
    if (!rangeTasks || rangeTasks.length === 0) return out;

    for (let i = 0; i < daysInMonth; i++) {
      const dayDate = new Date(year, month, i + 1);
      const overlaps = rangeTasks.filter((r) => r.start <= dayDate && r.end >= dayDate);
      if (overlaps.length === 0) continue;
      overlaps.sort((a, b) => {
        if (b.spanDays !== a.spanDays) return b.spanDays - a.spanDays;
        const at = String(a.task?.title || "");
        const bt = String(b.task?.title || "");
        return at.localeCompare(bt);
      });
      out[i] = {
        visible: overlaps.slice(0, MAX_VISIBLE_MULTI_DAY_LANES),
        hidden: overlaps.slice(MAX_VISIBLE_MULTI_DAY_LANES),
        all: overlaps,
      };
    }
    return out;
  }, [rangeTasks, daysInMonth, year, month]);

  const visibleRuns = useMemo(() => {
    const byKey = new Map();
    allDayByDay.forEach((info, idx) => {
      const visible = Array.isArray(info.visible) ? info.visible : [];
      if (visible.length === 0) return;
      visible.forEach((r, lane) => {
        const itemKey = String(
          r.task?.id ||
            `${r.start?.toISOString?.() || ""}|${r.end?.toISOString?.() || ""}|${r.task?.title || ""}`
        );
        const key = `${itemKey}::${lane}`;
        if (!byKey.has(key)) byKey.set(key, { key, item: r, lane, days: [] });
        byKey.get(key).days.push(idx);
      });
    });

    const runs = [];
    for (const entry of byKey.values()) {
      const days = entry.days.sort((a, b) => a - b);
      let runStart = days[0];
      let prev = days[0];
      for (let i = 1; i < days.length; i++) {
        const cur = days[i];
        if (cur === prev + 1) {
          prev = cur;
          continue;
        }
        runs.push({
          item: entry.item,
          lane: entry.lane,
          startIdx: runStart,
          endIdx: prev,
        });
        runStart = cur;
        prev = cur;
      }
      runs.push({
        item: entry.item,
        lane: entry.lane,
        startIdx: runStart,
        endIdx: prev,
      });
    }
    return runs.sort((a, b) => {
      if (a.lane !== b.lane) return a.lane - b.lane;
      return a.startIdx - b.startIdx;
    });
  }, [allDayByDay]);

  const getAllDayStyle = (r) => {
    const ka = keyAreaMap?.[String(r?.task?.keyAreaId || r?.task?.key_area_id)];
    let categoryColor = ka?.color || categories?.[r?.task?.kind]?.color || "#4DC3D8";

    const isTailwind = typeof categoryColor === "string" && categoryColor.startsWith("bg-");
    const isColorStr = typeof categoryColor === "string" && !isTailwind;

    const classForBg = isTailwind ? categoryColor : "";
    const classForBgFinal = classForBg;

    const resolvedTailwind = isTailwind ? tailwindColorCache[categoryColor] : null;
    const resolved = isColorStr ? categoryColor : resolvedTailwind;

    const styleBg = resolved
      ? {
          backgroundColor: resolved,
          border: `1px solid ${resolved}`,
          color: getContrastTextColor(resolved),
        }
      : {};

    return { classForBgFinal, styleBg };
  };

  // Refs
  const gridRef = useRef(null);
  const tableRef = useRef(null);
  const rightHeaderTableRef = useRef(null);

  const rightVScrollRef = useRef(null);
  const rightHeaderScrollRef = useRef(null);
  const rightBodyScrollRef = useRef(null);

  // ✅ NEW: sticky bottom scrollbar ref
  const bottomHScrollRef = useRef(null);

  const dayRowRefs = useRef([]);
  const allDayRefs = useRef([]);

  const redLineRef = useRef(null);

  const [overlayMetrics, setOverlayMetrics] = useState({ colLeft: 0, colWidth: 0, rows: [] });
  const [eventOverlays, setEventOverlays] = useState([]);
  const [highlightTodayPulse, setHighlightTodayPulse] = useState(0);
  const [rowOverlay, setRowOverlay] = useState(null);
  const hSyncLockRef = useRef(false);
  const headerTrackRef = useRef(null);

  const heightSyncTimerRef = useRef(null);
  const cachedThRef = useRef(null);
  const lastTableWidthRef = useRef(0);
  const chunkTimerRef = useRef(null);
  const initialNowFocusDoneRef = useRef(false);
  const focusTodayAfterMonthJumpRef = useRef(false);

  const focusNowInMonthGrid = () => {
    try {
      const now = new Date();
      const vScroll = rightVScrollRef.current;
      const hScroll = rightBodyScrollRef.current;
      const headerThs = rightHeaderTableRef.current?.querySelectorAll("thead th");
      const rows = dayRowRefs.current.filter(Boolean);
      if (!vScroll || !hScroll || !headerThs?.length || !rows.length) return false;

      const todayIdx = now.getDate() - 1;
      const todayRow = rows[todayIdx];
      if (todayRow) {
        const nextTop = todayRow.offsetTop + todayRow.offsetHeight / 2 - vScroll.clientHeight / 2;
        vScroll.scrollTop = Math.max(0, nextTop);
      }

      const hourIdx = Math.max(0, Math.min(headerThs.length - 1, now.getHours()));
      const th = headerThs[hourIdx];
      if (th) {
        const fraction = (now.getMinutes() + now.getSeconds() / 60) / 60;
        const nextLeft =
          th.offsetLeft +
          fraction * (th.offsetWidth || HOUR_COL_WIDTH) -
          hScroll.clientWidth / 2;
        hScroll.scrollLeft = Math.max(0, nextLeft);
      }

      // ✅ keep bottom scrollbar in sync too
      if (bottomHScrollRef.current) bottomHScrollRef.current.scrollLeft = hScroll.scrollLeft;

      return true;
    } catch (_) {
      return false;
    }
  };

  const triggerTodayHighlight = () => {
    setHighlightTodayPulse((v) => v + 1);
  };

  const syncHorizontalPosition = (left) => {
    try {
      const safeLeft = Math.max(0, left || 0);
      if (headerTrackRef.current) {
        headerTrackRef.current.style.transform = `translateX(-${safeLeft}px)`;
      }
      if (bottomHScrollRef.current && Math.abs((bottomHScrollRef.current.scrollLeft || 0) - safeLeft) > 0.5) {
        bottomHScrollRef.current.scrollLeft = safeLeft;
      }
      if (rightBodyScrollRef.current && Math.abs((rightBodyScrollRef.current.scrollLeft || 0) - safeLeft) > 0.5) {
        rightBodyScrollRef.current.scrollLeft = safeLeft;
      }
    } catch (_) {}
  };

  // All-day overlay metrics (left side)
  useLayoutEffect(() => {
    const container = gridRef.current;
    if (!container) return;
    const crect = container.getBoundingClientRect();
    const rows = allDayRefs.current
      .filter(Boolean)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          top: r.top - crect.top + container.scrollTop,
          bottom: r.bottom - crect.top + container.scrollTop,
          height: r.height,
        };
      });

    const first = allDayRefs.current.find(Boolean);
    if (!first) {
      setOverlayMetrics({ colLeft: 0, colWidth: 0, rows });
      return;
    }
    const fr = first.getBoundingClientRect();
    const colLeft = fr.left - crect.left + container.scrollLeft;
    const colWidth = fr.width;
    setOverlayMetrics({ colLeft, colWidth, rows });
  }, [year, month, daysInMonth, events]);

  // --- ENSURE LEFT + RIGHT ROW HEIGHTS MATCH ---
  const syncRowHeights = () => {
    const leftRows = document.querySelectorAll(".mv-left-row");
    const rightRows = document.querySelectorAll(".mv-right-row");
    if (!leftRows.length || !rightRows.length) return;

    leftRows.forEach((leftRow, idx) => {
      const rightRow = rightRows[idx];
      if (!rightRow) return;

      try {
        leftRow.style.height = "";
        rightRow.style.height = "";
        leftRow.querySelectorAll("td,th").forEach((c) => (c.style.height = ""));
        rightRow.querySelectorAll("td,th").forEach((c) => (c.style.height = ""));
      } catch (e) {}

      const leftRect = leftRow.getBoundingClientRect();
      const rightRect = rightRow.getBoundingClientRect();
      const finalH = Math.max(leftRect.height, rightRect.height, 25);

      try {
        leftRow.style.height = finalH + "px";
        rightRow.style.height = finalH + "px";
        leftRow.querySelectorAll("td,th").forEach((c) => {
          c.style.height = finalH + "px";
          c.style.boxSizing = "border-box";
        });
        rightRow.querySelectorAll("td,th").forEach((c) => {
          c.style.height = finalH + "px";
          c.style.boxSizing = "border-box";
        });
      } catch (e) {}
    });
  };

  const ensureRowCountMatches = () => {
    try {
      document.querySelectorAll('[data-generated="mv-placeholder"]').forEach((n) => n.remove());

      const leftRows = Array.from(document.querySelectorAll(".mv-left-row"));
      const rightRows = Array.from(document.querySelectorAll(".mv-right-row"));
      const leftCount = leftRows.length;
      const rightCount = rightRows.length;
      if (leftCount === 0 && rightCount === 0) return;
      if (leftCount === rightCount) return;

      const rightTbody = tableRef.current?.querySelector("tbody");
      let leftTbody = null;
      if (leftRows[0]) {
        const leftTable = leftRows[0].closest("table");
        leftTbody = leftTable?.querySelector("tbody");
      }

      if (!rightTbody && !leftTbody) return;

      const createRightPlaceholder = () => {
        const tr = document.createElement("tr");
        tr.setAttribute("data-generated", "mv-placeholder");
        tr.className = "bg-white mv-right-row";
        tr.style.visibility = "hidden";
        tr.style.pointerEvents = "none";
        for (let i = 0; i < Math.max(1, HOUR_SLOTS.length); i++) {
          const td = document.createElement("td");
          td.className = "relative px-1 py-2 text-center align-top w-16";
          td.style.minWidth = "40px";
          tr.appendChild(td);
        }
        return tr;
      };

      const createLeftPlaceholder = () => {
        const tr = document.createElement("tr");
        tr.setAttribute("data-generated", "mv-placeholder");
        tr.className = "bg-white mv-left-row";
        tr.style.visibility = "hidden";
        tr.style.pointerEvents = "none";
        const tdDate = document.createElement("td");
        tdDate.className = "px-2 py-2 text-sm font-semibold";
        tdDate.style.width = "96px";
        const tdAllDay = document.createElement("td");
        tdAllDay.className = "px-1 py-0 text-left align-top";
        tdAllDay.style.width = `${ALL_DAY_COL_WIDTH}px`;
        tr.appendChild(tdDate);
        tr.appendChild(tdAllDay);
        return tr;
      };

      if (rightCount < leftCount && rightTbody) {
        const missing = leftCount - rightCount;
        for (let i = 0; i < missing; i++) rightTbody.appendChild(createRightPlaceholder());
      } else if (leftCount < rightCount && leftTbody) {
        const missing = rightCount - leftCount;
        for (let i = 0; i < missing; i++) leftTbody.appendChild(createLeftPlaceholder());
      }
    } catch (e) {}
  };

  const scheduleSyncHeights = (delay = 120) => {
    try {
      if (heightSyncTimerRef.current) clearTimeout(heightSyncTimerRef.current);
    } catch (_) {}
    heightSyncTimerRef.current = setTimeout(() => {
      try {
        ensureRowCountMatches();
        syncRowHeights();
      } finally {
        heightSyncTimerRef.current = null;
      }
    }, delay);
  };

  useEffect(() => {
    ensureRowCountMatches();
    syncRowHeights();
  }, [monthDays.length]);

  useEffect(() => {
    const left = rightBodyScrollRef.current?.scrollLeft || 0;
    syncHorizontalPosition(left);
  }, [month, year, rightTableMinWidth]);

  // Focus current time on initial open (current month only)
  useEffect(() => {
    if (initialNowFocusDoneRef.current) return;

    const now = new Date();
    if (year !== now.getFullYear() || month !== now.getMonth()) return;

    let rafId = null;
    const timer = setTimeout(() => {
      const vScroll = rightVScrollRef.current;
      const hScroll = rightBodyScrollRef.current;
      const headerThs = rightHeaderTableRef.current?.querySelectorAll("thead th");
      const rows = dayRowRefs.current.filter(Boolean);

      if (!vScroll || !hScroll || !headerThs?.length || !rows.length) return;

      const todayIdx = now.getDate() - 1;
      const todayRow = rows[todayIdx];
      if (todayRow) {
        const nextTop = todayRow.offsetTop + todayRow.offsetHeight / 2 - vScroll.clientHeight / 2;
        vScroll.scrollTop = Math.max(0, nextTop);
      }

      const hourIdx = Math.max(0, Math.min(headerThs.length - 1, now.getHours()));
      const th = headerThs[hourIdx];
      if (th) {
        const fraction = (now.getMinutes() + now.getSeconds() / 60) / 60;
        const nextLeft =
          th.offsetLeft +
          fraction * (th.offsetWidth || HOUR_COL_WIDTH) -
          hScroll.clientWidth / 2;
        hScroll.scrollLeft = Math.max(0, nextLeft);
      }

      if (bottomHScrollRef.current) bottomHScrollRef.current.scrollLeft = hScroll.scrollLeft;

      initialNowFocusDoneRef.current = true;
      triggerTodayHighlight();
    }, 0);

    rafId = requestAnimationFrame(() => {
      ensureRowCountMatches();
      syncRowHeights();
    });

    return () => {
      clearTimeout(timer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [month, year, HOUR_COL_WIDTH]);

  useEffect(() => {
    if (!focusTodayAfterMonthJumpRef.current) return;

    const now = new Date();
    if (year !== now.getFullYear() || month !== now.getMonth()) return;

    const timer = setTimeout(() => {
      focusNowInMonthGrid();
      triggerTodayHighlight();
      focusTodayAfterMonthJumpRef.current = false;
    }, 0);

    return () => clearTimeout(timer);
  }, [month, year, HOUR_COL_WIDTH]);

  // ✅ Build timed event overlays (anchored to BODY wrapper)
  useEffect(() => {
    const bodyWrap = rightBodyScrollRef.current;
    const table = tableRef.current;
    if (!bodyWrap || !table) {
      setEventOverlays([]);
      return;
    }

    const visibleEvents = (Array.isArray(events) ? events : []).filter((ev) => {
      try {
        if (ev.taskId || !ev.start) return false;
        const s = toLocal(ev.start);
        const e = ev.end ? toLocal(ev.end) : null;
        if (ev?.allDay) return false;
        if (e) {
          const sDay = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
          const eDay = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0, 0);
          const dayDiff = Math.floor((eDay.getTime() - sDay.getTime()) / (24 * 60 * 60 * 1000));
          if (dayDiff >= 1) return false;
        }
        return s.getFullYear() === year && s.getMonth() === month;
      } catch (_) {
        return false;
      }
    });

    const computeThOffsets = () => {
      const thSource = rightHeaderTableRef.current;
      const ths = Array.from(thSource.querySelectorAll("thead th"));
      const off = ths.map((th) => ({ left: th.offsetLeft, width: th.offsetWidth }));
      cachedThRef.current = off;
      lastTableWidthRef.current = thSource.offsetWidth || 0;
      return off;
    };

    const getThOffsets = () => {
      const thSource = rightHeaderTableRef.current;
      const curW = thSource?.offsetWidth || 0;
      if (!cachedThRef.current || lastTableWidthRef.current !== curW) return computeThOffsets();
      return cachedThRef.current;
    };

    const chunkSize = 30;
    let cancelled = false;
    const overlaysOut = [];
    const overlaysSeen = new Set();

    const processBatch = (startIndex) => {
      if (cancelled) return;
      const thOffsets = getThOffsets();
      const wrapRect = bodyWrap.getBoundingClientRect();
      const rowRects = (dayRowRefs.current || []).map((el) => (el ? el.getBoundingClientRect() : null));
      const tableWidth = table.offsetWidth || Math.max(800, HOUR_SLOTS.length * HOUR_COL_WIDTH);

      const end = Math.min(visibleEvents.length, startIndex + chunkSize);

      for (let i = startIndex; i < end; i++) {
        const ev = visibleEvents[i];
        try {
          const startLocal = toLocal(ev.start);
          const endLocal = ev.end ? toLocal(ev.end) : new Date(startLocal.getTime() + 30 * 60000);
          if (!endLocal || endLocal <= startLocal) continue;

          const dayIdx = startLocal.getDate() - 1;
          const rect = rowRects[dayIdx];
          if (!rect) continue;

          const rowTop = rect.top - wrapRect.top + (bodyWrap.scrollTop || 0);
          const rowHeight = rect.height;

          const startHour = String(startLocal.getHours()).padStart(2, "0") + ":00";
          const endHour = String(endLocal.getHours()).padStart(2, "0") + ":00";
          const startIdx2 = HOUR_SLOTS.findIndex((h) => h.startsWith(startHour.slice(0, 2)) || h === startHour);
          const endIdx2 = HOUR_SLOTS.findIndex((h) => h.startsWith(endHour.slice(0, 2)) || h === endHour);

          const sIdx = Math.max(0, startIdx2 === -1 ? 0 : startIdx2);
          const eIdx = Math.min(Math.max(0, thOffsets.length - 1), endIdx2 === -1 ? sIdx : endIdx2);

          const startTh = thOffsets[sIdx] || { left: 0, width: HOUR_COL_WIDTH };
          const endTh =
            thOffsets[eIdx] || thOffsets[thOffsets.length - 1] || { left: 0, width: HOUR_COL_WIDTH };

          const startFraction = (startLocal.getMinutes() + startLocal.getSeconds() / 60) / 60;
          const endFraction = (endLocal.getMinutes() + endLocal.getSeconds() / 60) / 60;

          const startLeft = startTh.left + startFraction * startTh.width;
          const endLeft = endTh.left + endFraction * endTh.width;

          const leftClamped = Math.max(0, Math.min(tableWidth, startLeft));
          const rightClamped = Math.max(0, Math.min(tableWidth, endLeft));
          const width = Math.max(6, rightClamped - leftClamped);

          const uniqKey = `${String(ev.id || "")}_${Math.round(leftClamped)}_${Math.round(rowTop)}_${Math.round(width)}`;
          if (!overlaysSeen.has(uniqKey)) {
            overlaysSeen.add(uniqKey);
            overlaysOut.push({
              ev,
              left: leftClamped,
              top: rowTop + 4,
              width,
              height: Math.max(18, rowHeight - 8),
            });
          }
        } catch (e) {}
      }

      if (end < visibleEvents.length) {
        chunkTimerRef.current = setTimeout(() => processBatch(end), 0);
      } else {
        setEventOverlays(overlaysOut);
        scheduleSyncHeights(50);
      }
    };

    processBatch(0);

    const onResize = () => {
      cachedThRef.current = null;
      lastTableWidthRef.current = 0;
      scheduleSyncHeights(60);
      setTimeout(() => processBatch(0), 0);
    };

    window.addEventListener("resize", onResize);
    const onBodyScroll = () => {
      scheduleSyncHeights(80);
      setTimeout(() => processBatch(0), 0);
    };
    bodyWrap.addEventListener("scroll", onBodyScroll, { passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      bodyWrap.removeEventListener("scroll", onBodyScroll);
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
    };
  }, [events, HOUR_SLOTS, year, month, daysInMonth, WORK_START, WORK_END, tailwindColorCache]);

  // ✅ Red line for current time (position relative to BODY wrapper)
  useEffect(() => {
    const bodyWrap = rightBodyScrollRef.current;
    const table = tableRef.current;
    if (!bodyWrap || !table) return;

    let rafId = null;

    const computeAndSetLeft = (now = new Date()) => {
      try {
        if (now.getMonth() !== month || now.getFullYear() !== year) {
          if (redLineRef.current) {
            redLineRef.current.style.left = "-9999px";
            redLineRef.current.style.top = "0px";
            redLineRef.current.style.height = "0px";
          }
          return;
        }

        const hourIdx = HOUR_SLOTS.findIndex((h) => {
          const [hr] = String(h).split(":");
          return now.getHours() === Number(hr);
        });
        if (hourIdx === -1) {
          if (redLineRef.current) redLineRef.current.style.left = "-9999px";
          return;
        }

        const headerThs = rightHeaderTableRef.current?.querySelectorAll("thead th");
        const targetTh = headerThs?.[hourIdx];
        if (!targetTh) return;

        const colWidth = targetTh.offsetWidth || HOUR_COL_WIDTH;
        const fraction = (now.getMinutes() + now.getSeconds() / 60) / 60;
        const leftWithinTable = (targetTh.offsetLeft || 0) + fraction * colWidth;

        const rows = dayRowRefs.current.filter(Boolean);
        if (!rows.length) return;

        const firstRow = rows[0];
        const lastRow = rows[rows.length - 1];
        const topInTable = firstRow.offsetTop;
        const bottomInTable = lastRow.offsetTop + lastRow.offsetHeight;
        const height = Math.max(0, bottomInTable - topInTable);

        const el = redLineRef.current;
        if (!el) return;
        el.style.left = `${leftWithinTable}px`;
        el.style.top = `${Math.max(0, topInTable)}px`;
        el.style.height = `${height}px`;
        el.style.transform = "translateX(-50%)";
      } catch (_) {}
    };

    const scheduleCompute = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        computeAndSetLeft();
        rafId = null;
      });
    };

    computeAndSetLeft();

    let running = true;
    let timeoutId = null;
    const tick = () => {
      if (!running) return;
      requestAnimationFrame(() => computeAndSetLeft(new Date()));
      timeoutId = setTimeout(tick, 1000);
    };
    tick();

    window.addEventListener("resize", scheduleCompute);
    bodyWrap.addEventListener("scroll", scheduleCompute, { passive: true });

    return () => {
      running = false;
      clearTimeout(timeoutId);
      window.removeEventListener("resize", scheduleCompute);
      bodyWrap.removeEventListener("scroll", scheduleCompute);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [month, year, HOUR_SLOTS]);

  // today blink overlay
  useEffect(() => {
    if (!highlightTodayPulse) return;
    if (year !== today.getFullYear() || month !== today.getMonth()) return;

    const idx = today.getDate() - 1;
    const el = dayRowRefs.current[idx];
    const bodyWrap = rightBodyScrollRef.current;
    const table = tableRef.current;

    if (!el || !bodyWrap || !table) return;

    const wrapRect = bodyWrap.getBoundingClientRect();
    const rowRect = el.getBoundingClientRect();
    const inset = 2;

    setRowOverlay({
      left: 0,
      top: rowRect.top - wrapRect.top + bodyWrap.scrollTop + inset,
      width: table.offsetWidth,
      height: Math.max(0, rowRect.height - inset * 2),
      visible: true,
    });

    const t = setTimeout(() => setRowOverlay(null), 450 * 4 + 100);
    return () => clearTimeout(t);
  }, [highlightTodayPulse, year, month]);

  const [showViewMenu, setShowViewMenu] = useState(false);

  const shiftMonthFromNav = (delta) => {
    if (!onShiftDate) return;

    const vScroll = rightVScrollRef.current;
    if (vScroll) vScroll.scrollTop = 0;

    onShiftDate(delta);

    requestAnimationFrame(() => {
      const nextVScroll = rightVScrollRef.current;
      if (nextVScroll) nextVScroll.scrollTop = 0;
    });
  };

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
        .mv-hide-scrollbar::-webkit-scrollbar { height: 0px; }
        .mv-hide-scrollbar { scrollbar-width: none; }

        /* ✅ hide internal horizontal scrollbar (body + header) */
        .mv-hide-xscrollbar::-webkit-scrollbar { height: 0px; }
        .mv-hide-xscrollbar { scrollbar-width: none; }

        /* ✅ hover to show ONLY the bottom scrollbar */
        .mv-bottom-hscroll {
          opacity: 0;
          transition: opacity 120ms ease;
          pointer-events: none;
        }
        .mv-shell:hover .mv-bottom-hscroll {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>

      {/* Header */}
      <div className="relative z-[400] flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
            style={{ minWidth: 36, minHeight: 36 }}
            aria-label="Previous month"
            onClick={() => shiftMonthFromNav(-1)}
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
                {view && view.charAt(0).toUpperCase() + view.slice(1)}
              </span>
              <FaChevronDown
                className={`${showViewMenu ? "rotate-180" : "rotate-0"} transition-transform`}
              />
            </button>

            {showViewMenu && (
              <div
                role="menu"
                className="absolute z-[450] mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
              >
                {["day", "week", "month", "quarter"].map((v) => (
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
          <img src={calendarSrc} alt="Calendar" style={{ width: 18, height: 18 }} />
          {new Intl.DateTimeFormat(undefined, {
            month: "long",
            year: "numeric",
            timeZone: userTimeZone,
          }).format(baseDate)}
          {prefsLoading && (
            <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
              Loading
            </span>
          )}
        </h2>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50"
            style={{ minHeight: 36 }}
            aria-label="Today"
            onClick={() => {
              const now = new Date();
              const monthDelta = (now.getFullYear() - year) * 12 + (now.getMonth() - month);

              if (monthDelta !== 0 && onShiftDate) {
                focusTodayAfterMonthJumpRef.current = true;
                onShiftDate({ months: monthDelta });
                return;
              }

              focusNowInMonthGrid();
              triggerTodayHighlight();
            }}
          >
            Today
          </button>
          <button
            className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
            style={{ minWidth: 36, minHeight: 36 }}
            aria-label="Next month"
            onClick={() => shiftMonthFromNav(1)}
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      <div className="relative mv-shell">
        {/* Fixed header row (outside vertical scroll) */}
        <div className="flex" style={{ position: "relative" }}>
          <div
            className="relative"
            style={{
              width: 96 + ALL_DAY_COL_WIDTH,
              minWidth: 96 + ALL_DAY_COL_WIDTH,
              flexShrink: 0,
              zIndex: 302,
            }}
          >
            <table
              className="border border-gray-200 rounded-l-lg"
              style={{
                borderCollapse: "separate",
                borderSpacing: 0,
                width: 96 + ALL_DAY_COL_WIDTH,
                tableLayout: "fixed",
                backgroundColor: "white",
              }}
            >
              <thead>
                <tr className="bg-white">
                  <th
                    className="text-left px-2 py-2 text-xs font-semibold text-gray-400"
                    style={{
                      width: "96px",
                      height: "44px",
                      borderRight: "2px solid rgba(226,232,240,1)",
                      backgroundColor: "white",
                    }}
                  >
                    Date
                  </th>
                  <th
                    className="text-center px-2 py-2 text-xs font-semibold text-gray-400"
                    style={{
                      width: `${ALL_DAY_COL_WIDTH}px`,
                      height: "44px",
                      borderLeft: "2px solid rgba(226,232,240,1)",
                      borderRight: "2px solid rgba(226,232,240,1)",
                      backgroundColor: "white",
                    }}
                  >
                    <span className="ml-2 px-2 py-1 rounded bg-emerald-500 text-white text-[11px] font-semibold">
                      All-Day
                    </span>
                  </th>
                </tr>
              </thead>
            </table>
          </div>

          <div className="flex-1" style={{ position: "relative", minWidth: 0 }}>
            <div
              ref={rightHeaderScrollRef}
              className="mv-hide-scrollbar mv-hide-xscrollbar"
              style={{
                background: "white",
                overflowX: "hidden",
                overflowY: "hidden",
                width: "100%",
                minWidth: 0,
              }}
            >
              <div
                ref={headerTrackRef}
                style={{
                  width: rightTableMinWidth,
                  transform: "translateX(0px)",
                  willChange: "transform",
                }}
              >
                <table
                  ref={rightHeaderTableRef}
                  className="border border-gray-200 rounded-r-lg"
                  style={{
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    minWidth: rightTableMinWidth,
                    tableLayout: "fixed",
                  }}
                >
                  <thead>
                    <tr className="bg-white">
                      {HOUR_SLOTS.map((h, idx) => {
                        let slotIsWorking = true;
                        try {
                          if (isWorkingTime) slotIsWorking = isWorkingTime(h);
                        } catch {
                          slotIsWorking = true;
                        }
                        const [_, mm] = (h || "").split(":");
                        const showLabel = String(mm || "00") === "00";

                        return (
                          <th
                            key={`hour-header-${idx}`}
                            className="text-center px-1 py-2 text-xs font-semibold text-gray-400 w-16"
                            style={{
                              minWidth: 40,
                              height: "44px",
                              backgroundColor: slotIsWorking ? "white" : NON_WORK_BG,
                              opacity: slotIsWorking ? 1 : NON_WORK_OPACITY,
                              borderLeft: "1px solid rgba(226,232,240,0.4)",
                              borderRight: "1px solid rgba(226,232,240,0.4)",
                            }}
                          >
                            {showLabel ? (formatTime ? formatTime(h) : h) : ""}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* BODY: vertical scroll container */}
        <div
          ref={rightVScrollRef}
          className="relative mv-vscroll"
          style={{
            height: "calc(100vh - 260px)",
            maxHeight: "calc(100vh - 260px)",
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            paddingBottom: BOTTOM_SCROLL_SAFE_GAP,
            maxWidth: "100vw",
            position: "relative",
            scrollBehavior: "smooth",
          }}
        >
          <div
            className="flex"
            style={{
              position: "relative",
              paddingBottom: BOTTOM_RADAR_HEIGHT,
            }}
          >
          {/* LEFT TABLE: Date + All-Day (sticky) */}
          <div
            ref={gridRef}
            className="relative"
            style={{
              width: 96 + ALL_DAY_COL_WIDTH,
              minWidth: 96 + ALL_DAY_COL_WIDTH,
              flexShrink: 0,
              position: "sticky",
              left: 0,
              zIndex: 102,
            }}
          >
            <table
              className="border border-gray-200 rounded-l-lg"
              style={{
                borderCollapse: "separate",
                borderSpacing: 0,
                width: 96 + ALL_DAY_COL_WIDTH,
                tableLayout: "fixed",
              }}
            >
              <thead style={{ display: "none" }}>
                <tr className="bg-white">
                  <th
                    className="text-left px-2 py-2 text-xs font-semibold text-gray-400"
                    style={{
                      width: "96px",
                      height: "44px",
                      borderRight: "2px solid rgba(226,232,240,1)",
                      backgroundColor: "white",
                    }}
                  >
                    Date
                  </th>
                  <th
                    className="text-center px-2 py-2 text-xs font-semibold text-gray-400"
                    style={{
                      width: `${ALL_DAY_COL_WIDTH}px`,
                      height: "44px",
                      borderLeft: "2px solid rgba(226,232,240,1)",
                      borderRight: "2px solid rgba(226,232,240,1)",
                      backgroundColor: "white",
                    }}
                  >
                    <span className="ml-2 px-2 py-1 rounded bg-emerald-500 text-white text-[11px] font-semibold">
                      All-Day
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthDays.map((date, idx) => {
                  const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
                    date.getDate()
                  ).padStart(2, "0")}`;
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isToday =
                    date.getDate() === (currentDate || today).getDate() &&
                    date.getMonth() === (currentDate || today).getMonth() &&
                    date.getFullYear() === (currentDate || today).getFullYear();

                  return (
                    <tr key={idx} className="bg-white mv-left-row" style={{ height: "25px" }}>
                      <td
                        className={`px-2 py-0 text-sm font-semibold ${
                          isWeekend ? "text-red-500" : "text-gray-700"
                        } ${isToday ? "text-blue-600" : ""}`}
                        style={{
                          width: "96px",
                          height: "25px",
                          borderTop: "1px solid rgba(226,232,240,0.35)",
                          borderBottom: "1px solid rgba(226,232,240,0.35)",
                          borderRight: "2px solid rgba(226,232,240,1)",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <div className="flex items-center justify-between text-xs w-full">
                          <div>
                            {new Intl.DateTimeFormat(undefined, {
                              weekday: "short",
                              day: "numeric",
                              timeZone: userTimeZone,
                            }).format(date)}
                          </div>
                          {weekCells[idx] && weekCells[idx].weekNumber ? (
                            <div className="text-[10px] text-slate-500 ml-1">
                              {weekCells[idx].weekNumber}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td
                        ref={(el) => (allDayRefs.current[idx] = el)}
                        className="px-1 py-0 text-left align-top"
                        style={{
                          width: `${ALL_DAY_COL_WIDTH}px`,
                          height: "25px",
                          borderTop: "1px solid rgba(226,232,240,0.35)",
                          borderBottom: "1px solid rgba(226,232,240,0.35)",
                          borderLeft: "2px solid rgba(226,232,240,1)",
                          borderRight: "2px solid rgba(226,232,240,1)",
                          backgroundColor:
                            selectedSlot &&
                            selectedSlot.type === "allDay" &&
                            selectedSlot.dayKey === dayKey
                              ? "rgba(59, 130, 246, 0.12)"
                              : undefined,
                        }}
                        onClick={(e) => {
                          try {
                            e.stopPropagation();
                          } catch {}
                          setSelectedSlot({ type: "allDay", dayKey });
                        }}
                        onDoubleClick={(e) => {
                          try {
                            e.stopPropagation();
                          } catch {}
                          if (!canQuickCreate) return;
                          const dt = new Date(
                            date.getFullYear(),
                            date.getMonth(),
                            date.getDate(),
                            0,
                            0,
                            0,
                            0
                          );
                          onQuickCreate(dt, { allDay: true });
                        }}
                        title={canQuickCreate ? "Double-click to create all-day event" : undefined}
                      >
                        <span className="sr-only">all day</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* All-day range overlay */}
            {overlayMetrics.rows.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: 96,
                  width: overlayMetrics.colWidth,
                  top: 0,
                  height: "100%",
                  zIndex: 500,
                  pointerEvents: "none",
                }}
              >
                {visibleRuns.map((run, idx) => {
                  const startRow = overlayMetrics.rows[run.startIdx];
                  const endRow = overlayMetrics.rows[run.endIdx];
                  if (!startRow || !endRow) return null;

                  const laneCount = Math.max(1, MAX_VISIBLE_MULTI_DAY_LANES);
                  const laneGap = 4;
                  const horizontalPadding = 4;
                  const barsAvailableWidth = Math.max(
                    20,
                    overlayMetrics.colWidth - ALL_DAY_ACTION_GUTTER - horizontalPadding * 2
                  );
                  const usableWidth = Math.max(
                    20,
                    barsAvailableWidth - laneGap * (laneCount - 1)
                  );
                  const barWidth = Math.max(
                    20,
                    Math.floor(usableWidth / laneCount)
                  );
                  const laneIndex = Math.max(
                    0,
                    Math.min(laneCount - 1, Number(run.lane) || 0)
                  );
                  const left = Math.round(
                    horizontalPadding + laneIndex * (barWidth + laneGap)
                  );

                  const top = startRow.top + 2;
                  const bottom = endRow.bottom - 2;
                  const height = Math.max(16, bottom - top);
                  const { classForBgFinal, styleBg } = getAllDayStyle(run.item);

                  return (
                    <div
                      key={`md-run-${idx}-${run.item?.task?.id || ""}`}
                      className={`${classForBgFinal} group`}
                      style={{
                        position: "absolute",
                        top,
                        left,
                        width: barWidth,
                        height,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: 8,
                        paddingRight: 8,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                        pointerEvents: "auto",
                        ...styleBg,
                      }}
                      title={run.item?.task?.title}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof onEventClick === "function") onEventClick(run.item.task);
                        else if (typeof onTaskClick === "function") onTaskClick(run.item.task);
                      }}
                    >
                      <span className="truncate text-xs min-w-0 flex-1" style={{ pointerEvents: "none" }}>
                        {run.item?.task?.title}
                      </span>
                      <span className="inline-flex items-center gap-1 shrink-0 overflow-hidden max-w-0 group-hover:max-w-12 transition-all duration-150">
                        <button
                          type="button"
                          className="p-0.5 rounded hover:bg-black/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof onEventClick === "function") onEventClick(run.item.task, "edit-month");
                          }}
                          aria-label={`Edit ${run.item?.task?.title || "event"}`}
                          title="Edit event"
                        >
                          <FaEdit className="w-2.5 h-2.5 text-blue-600" />
                        </button>
                        <button
                          type="button"
                          className="p-0.5 rounded hover:bg-black/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof onEventClick === "function") onEventClick(run.item.task, "delete");
                          }}
                          aria-label={`Delete ${run.item?.task?.title || "event"}`}
                          title="Delete event"
                        >
                          <FaTrash className="w-2.5 h-2.5 text-red-600" />
                        </button>
                      </span>
                    </div>
                  );
                })}

                {allDayByDay.map((dayInfo, dayIdx) => {
                  const row = overlayMetrics.rows[dayIdx];
                  if (!row) return null;
                  const all = Array.isArray(dayInfo.all) ? dayInfo.all : [];
                  const hidden = dayInfo.hidden || [];
                  if (all.length === 0) return null;
                  const rowDate = new Date(year, month, dayIdx + 1, 0, 0, 0, 0);
                  return (
                    <div key={`ad-${dayIdx}`} style={{ position: "absolute", top: row.top, height: row.height, left: 0, right: 0 }}>
                      <div
                        className="absolute top-1 flex items-center justify-center"
                        style={{
                          pointerEvents: "auto",
                          right: 0,
                          width: `${ALL_DAY_ACTION_GUTTER}px`,
                        }}
                      >
                        <button
                          type="button"
                          data-month-all-day-overflow-trigger="true"
                          className="inline-flex items-center justify-center px-1 text-base leading-none text-sky-600 hover:text-sky-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hidden.length > 0) {
                              setAllDayOverflow((curr) =>
                                curr && curr.dayIdx === dayIdx
                                  ? null
                                  : { dayIdx, items: all }
                              );
                              return;
                            }
                            if (typeof onQuickCreate === "function") {
                              try {
                                onQuickCreate(rowDate, { allDay: true });
                              } catch (_) {}
                            }
                          }}
                          title={hidden.length > 0 ? "Show all-day items" : "Create all-day event"}
                          aria-label={hidden.length > 0 ? "Show all-day items" : "Create all-day event"}
                        >
                          +
                        </button>
                      </div>

                      {allDayOverflow && allDayOverflow.dayIdx === dayIdx && (
                        <div
                          ref={allDayPopupRef}
                          className="absolute left-full ml-2 top-0 w-64 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg z-[1000]"
                          style={{ pointerEvents: "auto" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-3 py-2 border-b border-slate-100 text-xs text-slate-700 flex items-center justify-between">
                            <span className="font-semibold">Events</span>
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
                            {(allDayOverflow.items || []).map((it, idx) => {
                              const title = it?.task?.title || "Untitled";
                              return (
                                <div
                                  key={`md-overflow-${idx}-${it?.task?.id || ""}`}
                                  className="group w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  <button
                                    type="button"
                                    className="flex-1 text-left truncate"
                                    onClick={() => {
                                      setAllDayOverflow(null);
                                      if (typeof onEventClick === "function") onEventClick(it.task);
                                      else if (typeof onTaskClick === "function") onTaskClick(it.task);
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
                                        if (typeof onEventClick === "function") onEventClick(it.task, "edit-month");
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
                                        if (typeof onEventClick === "function") onEventClick(it.task, "delete");
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
              </div>
            )}
          </div>

          {/* RIGHT SIDE: sticky header + body scroller */}
          <div
            className="flex-1"
            style={{
              flex: 1,
              position: "relative",
              minWidth: 0,
            }}
          >
            {/* Body horizontal scroller */}
            <div
              ref={rightBodyScrollRef}
              className="mv-hide-xscrollbar"
              style={{
                overflowX: "auto",
                overflowY: "hidden",
                marginBottom: 8,
                width: "100%",
                minWidth: 0,
              }}
              onScroll={(e) => {
                try {
                  if (hSyncLockRef.current) return;
                  hSyncLockRef.current = true;
                  const left = e.currentTarget.scrollLeft || 0;
                  syncHorizontalPosition(left);
                } finally {
                  hSyncLockRef.current = false;
                }
              }}
            >
              {/* wrapper makes overlays scroll with horizontal scroll */}
              <div style={{ position: "relative", minWidth: rightTableMinWidth }}>
                <table
                  ref={tableRef}
                  className="border border-gray-200 rounded-r-lg"
                  style={{
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    minWidth: rightTableMinWidth,
                    tableLayout: "fixed",
                  }}
                >
                  <tbody>
                    {monthDays.map((date, idx) => {
                      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
                        date.getDate()
                      ).padStart(2, "0")}`;

                      return (
                        <tr
                          key={idx}
                          ref={(el) => (dayRowRefs.current[idx] = el)}
                          className="bg-white mv-right-row"
                          style={{ position: "relative", height: "25px" }}
                          tabIndex={-1}
                        >
                          {HOUR_SLOTS.map((h, hIdx) => {
                            let isWorking = true;
                            try {
                              if (isWorkingTime) isWorking = isWorkingTime(h);
                            } catch {
                              isWorking = true;
                            }

                            return (
                              <td
                                key={hIdx}
                                className={`vpc-monthly-area-cell vpc-monthly-cell relative px-1 py-0 text-center align-top ${
                                  canQuickCreate ? "cursor-pointer" : ""
                                }`}
                                style={{
                                  height: "25px",
                                  width: `${HOUR_COL_WIDTH}px`,
                                  boxSizing: "border-box",
                                  borderLeft: "1px solid rgba(226,232,240,0.4)",
                                  borderRight: "1px solid rgba(226,232,240,0.4)",
                                  borderTop: "1px solid rgba(226,232,240,0.35)",
                                  borderBottom: "1px solid rgba(226,232,240,0.35)",
                                  backgroundColor: isWorking ? undefined : NON_WORK_BG,
                                  opacity: isWorking ? 1 : NON_WORK_OPACITY,
                                  boxShadow:
                                    selectedSlot &&
                                    selectedSlot.type === "timed" &&
                                    selectedSlot.dayKey === dayKey &&
                                    selectedSlot.slot === h
                                      ? "inset 0 0 0 2px rgba(59, 130, 246, 0.35)"
                                      : undefined,
                                }}
                                onClick={(e) => {
                                  try {
                                    e.stopPropagation();
                                  } catch {}
                                  setSelectedSlot({ type: "timed", dayKey, slot: h });
                                }}
                                onDoubleClick={(e) => {
                                  try {
                                    e.stopPropagation();
                                  } catch {}
                                  if (!canQuickCreate) return;
                                  const [hr, min] = h.split(":");
                                  const dt = new Date(
                                    date.getFullYear(),
                                    date.getMonth(),
                                    date.getDate(),
                                    parseInt(hr, 10) || 0,
                                    parseInt(min, 10) || 0,
                                    0,
                                    0
                                  );
                                  onQuickCreate(dt);
                                }}
                                onDrop={(e) => {
                                  try {
                                    const taskId = e.dataTransfer.getData("taskId");
                                    if (!taskId || typeof onTaskDrop !== "function") return;
                                    const [hr, min] = h.split(":");
                                    const dt = new Date(
                                      date.getFullYear(),
                                      date.getMonth(),
                                      date.getDate(),
                                      parseInt(hr, 10) || 0,
                                      parseInt(min, 10) || 0,
                                      0,
                                      0
                                    );
                                    const task = (todos || []).find((t) => String(t.id) === String(taskId));
                                    const dropEffect = e.dataTransfer.dropEffect || e.dataTransfer.effectAllowed || "";
                                    if (task) onTaskDrop(task, dt, dropEffect);
                                  } catch {}
                                }}
                                title={canQuickCreate ? "Double-click to create appointment" : undefined}
                              >
                                {/* timed events are rendered as overlays */}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Red line */}
                <div
                  ref={redLineRef}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    top: 0,
                    height: "0px",
                    width: "2px",
                    background: "red",
                    willChange: "left, top, height, transform",
                    transform: "translateX(-50%)",
                    zIndex: 80,
                    pointerEvents: "none",
                  }}
                />

                {/* Timed event overlays */}
                {eventOverlays.length > 0 && (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      right: 0,
                      bottom: 0,
                      pointerEvents: "none",
                      zIndex: 150,
                    }}
                  >
                    {eventOverlays.map((o, idx) => (
                      <EventOverlayItem
                        key={`evov-${idx}-${String(o.ev?.id || "")}`}
                        o={o}
                        categories={categories}
                        keyAreaMap={keyAreaMap}
                        tailwindColorCache={tailwindColorCache}
                        getContrastTextColor={getContrastTextColor}
                        onEventClick={onEventClick}
                      />
                    ))}
                  </div>
                )}
                {/* Today row overlay */}
                {rowOverlay && rowOverlay.visible && (
                  <div
                    className="today-row-overlay"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: rowOverlay.top,
                      width: rowOverlay.width,
                      height: rowOverlay.height,
                      zIndex: 120,
                      pointerEvents: "none",
                      backgroundColor: "rgba(59,130,246,0.32)",
                      borderRadius: 4,
                      animation: "blinkRow 0.45s linear 4",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* ✅ Bottom REAL scrollbar (visible on hover) */}
        <div
          className="mv-bottom-hscroll"
          style={{
            position: "relative",
            zIndex: 330,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(2px)",
            borderTop: "1px solid rgba(226,232,240,0.8)",
            height: BOTTOM_HSCROLL_HEIGHT,
          }}
        >
          <div
            ref={bottomHScrollRef}
            style={{
              overflowX: "auto",
              overflowY: "hidden",
              width: "100%",
              height: BOTTOM_HSCROLL_HEIGHT,
            }}
            onScroll={(e) => {
              try {
                if (hSyncLockRef.current) return;
                hSyncLockRef.current = true;
                const left = e.currentTarget.scrollLeft || 0;
                syncHorizontalPosition(left);
              } finally {
                hSyncLockRef.current = false;
              }
            }}
          >
            <div style={{ width: rightTableMinWidth, height: 1 }} />
          </div>
        </div>

      </div>
    </>
  );
}
