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
  tailwindColorCache,
  getContrastTextColor,
  onEventClick,
}) {
  try {
    const ev = o.ev;
    const color = categories?.[ev.kind]?.color || "bg-gray-200";
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
        onClick={(e) => {
          e.stopPropagation();
          onEventClick && onEventClick(ev, "edit-month");
        }}
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
        className={`${classForBg} text-xs truncate whitespace-nowrap`}
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
          if (typeof onTaskClick === "function") onTaskClick(r.task);
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

  const BOTTOM_RADAR_HEIGHT = 26;
  // ✅ increased to avoid overlap with the sticky bottom scrollbar + radar
  const BOTTOM_SCROLL_SAFE_GAP = BOTTOM_RADAR_HEIGHT + 24 + 16;

  const LANE_WIDTH = 72;
  const LANE_GAP = 6;
  const LANE_HEIGHT = 18;
  const CENTERED_BAR_WIDTH = 60;

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
        const startLocal = toLocal(ev.start);
        const endLocal = ev.end ? toLocal(ev.end) : new Date(startLocal.getTime() + 30 * 60000);
        if (!endLocal || endLocal <= startLocal) continue;

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
    (Array.isArray(todos) ? todos : []).forEach((t) => {
      const sIso = t.startDate || t.dueDate || t.endDate || null;
      const eIso = t.endDate || t.dueDate || t.startDate || null;
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

      const isSingleDay = s.getTime() === e.getTime();
      const hasStartTime = !!t.startDate;
      if (isSingleDay && hasStartTime) return;

      const spanDays = Math.max(1, Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1);
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
  }, [todos, month, year]);

  const rangeTasks = buildRangeTasks;
  const lanesCount = useMemo(() => Math.min(rangeTasks.length, 20), [rangeTasks.length]);

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

  // ✅ FULL SYNC: body <-> header + body <-> sticky bottom scrollbar
  useEffect(() => {
    const body = rightBodyScrollRef.current;
    const head = rightHeaderScrollRef.current;
    const bottom = bottomHScrollRef.current;
    if (!body || !head || !bottom) return;

    let lock = false;

    const syncAllTo = (left) => {
      head.scrollLeft = left;
      body.scrollLeft = left;
      bottom.scrollLeft = left;
    };

    const onBodyScroll = () => {
      if (lock) return;
      lock = true;
      head.scrollLeft = body.scrollLeft;
      bottom.scrollLeft = body.scrollLeft;
      lock = false;
    };

    const onBottomScroll = () => {
      if (lock) return;
      lock = true;
      body.scrollLeft = bottom.scrollLeft;
      head.scrollLeft = bottom.scrollLeft;
      lock = false;
    };

    // if user drags header (trackpad), keep others in sync too
    const onHeadScroll = () => {
      if (lock) return;
      lock = true;
      body.scrollLeft = head.scrollLeft;
      bottom.scrollLeft = head.scrollLeft;
      lock = false;
    };

    body.addEventListener("scroll", onBodyScroll, { passive: true });
    bottom.addEventListener("scroll", onBottomScroll, { passive: true });
    head.addEventListener("scroll", onHeadScroll, { passive: true });

    // initial sync
    syncAllTo(body.scrollLeft || 0);

    return () => {
      body.removeEventListener("scroll", onBodyScroll);
      bottom.removeEventListener("scroll", onBottomScroll);
      head.removeEventListener("scroll", onHeadScroll);
    };
  }, []);

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
  }, [year, month, daysInMonth, todos]);

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

  const rightTableMinWidth = Math.max(800, HOUR_SLOTS.length * HOUR_COL_WIDTH);

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

        /* ✅ hover to show ONLY the sticky bottom scrollbar */
        .mv-bottom-hscroll {
          opacity: 0;
          transition: opacity 120ms ease;
          pointer-events: none;
        }
        .mv-vscroll:hover .mv-bottom-hscroll {
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

      {/* BODY: vertical scroll container */}
      <div
        ref={rightVScrollRef}
        className="relative mv-vscroll"
        style={{
          height: 600,
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
              <thead style={{ position: "sticky", top: 0, zIndex: 302, backgroundColor: "white" }}>
                <tr className="bg-white">
                  <th
                    className="text-left px-2 py-2 text-xs font-semibold text-gray-400"
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 302,
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
                      position: "sticky",
                      top: 0,
                      zIndex: 302,
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
                        }}
                      >
                        <span className="sr-only">all day</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* All-day range overlay */}
            {overlayMetrics.rows.length > 0 && lanesCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: 96,
                  width: overlayMetrics.colWidth,
                  top: 0,
                  height: "100%",
                  zIndex: 140,
                  pointerEvents: "none",
                }}
              >
                {rangeTasks.map((r) => (
                  <RangeTaskBar
                    key={`ov-${r.task?.id || String(Math.random())}`}
                    r={r}
                    overlayMetrics={overlayMetrics}
                    LANE_WIDTH={LANE_WIDTH}
                    LANE_GAP={LANE_GAP}
                    LANE_HEIGHT={LANE_HEIGHT}
                    CENTERED_BAR_WIDTH={CENTERED_BAR_WIDTH}
                    ALL_DAY_COL_WIDTH={ALL_DAY_COL_WIDTH}
                    month={month}
                    categories={categories}
                    keyAreaMap={keyAreaMap}
                    tailwindColorCache={tailwindColorCache}
                    getContrastTextColor={getContrastTextColor}
                    onTaskClick={onTaskClick}
                  />
                ))}
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
            {/* Sticky header (scrolls horizontally, stays sticky vertically) */}
            <div
              ref={rightHeaderScrollRef}
              className="mv-hide-scrollbar mv-hide-xscrollbar"
              style={{
                position: "sticky",
                top: 0,
                zIndex: 302,
                background: "white",
                overflowX: "auto",
                overflowY: "hidden",
                width: "100%",
                minWidth: 0,
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
                                  enableQuickCreate ? "cursor-pointer" : ""
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
                                }}
                                onClick={(e) => {
                                  try {
                                    e.stopPropagation();
                                  } catch {}
                                  if (enableQuickCreate && onEventClick) onEventClick({ day: date, hour: h });
                                  if (enableQuickCreate && typeof onQuickCreate === "function") {
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
                                    try {
                                      onQuickCreate(dt);
                                    } catch (_) {}
                                  }
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
                                title={enableQuickCreate ? "Click to add appointment" : undefined}
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
                    zIndex: 160,
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

        {/* ✅ Sticky bottom REAL scrollbar (visible on hover) */}
        <div
          className="mv-bottom-hscroll"
          style={{
            position: "sticky",
            bottom: BOTTOM_RADAR_HEIGHT, // sits just above radar
            left: 0,
            right: 0,
            zIndex: 330,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(2px)",
            borderTop: "1px solid rgba(226,232,240,0.8)",
          }}
        >
          <div
            ref={bottomHScrollRef}
            style={{
              overflowX: "auto",
              overflowY: "hidden",
              width: "100%",
              height: 14,
            }}
          >
            <div style={{ width: rightTableMinWidth, height: 1 }} />
          </div>
        </div>

        {/* Bottom horizontal scroll radar */}
        <div
          className="pointer-events-none"
          style={{
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 320,
          }}
        >
          <div
            style={{
              height: BOTTOM_RADAR_HEIGHT,
              background:
                "linear-gradient(to right, rgba(59,130,246,0.15), rgba(59,130,246,0.05) 20%, rgba(59,130,246,0.05) 80%, rgba(59,130,246,0.15))",
              borderTop: "1px solid rgba(226,232,240,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "#1e3a8a",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <FaChevronLeft />
            <span>Scroll horizontally</span>
            <FaChevronRight />
          </div>
        </div>
      </div>
    </>
  );
}