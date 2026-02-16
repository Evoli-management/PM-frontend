import React, { useEffect, useRef, useState } from "react";
import { FixedSizeList } from "react-window";
import AvailabilityBlock from "./AvailabilityBlock";
import { useCalendarPreferences } from "../../hooks/useCalendarPreferences";
import { generateTimeSlots } from "../../utils/timeUtils";
import { FaEdit, FaTrash } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight, FaChevronDown, FaBars } from "react-icons/fa";

function getWeekNumber(date) {
    const firstJan = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - firstJan) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + firstJan.getDay() + 1) / 7);
}

const defaultSlotSize = 30;

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

    // Visual constants for non-working hour styling — keep consistent with MonthView
    const NON_WORK_BG = "#f8fafc";
    const NON_WORK_OPACITY = 0.75;

    const [elephantTask, setElephantTask] = useState("");
    const [showViewMenu, setShowViewMenu] = useState(false);
    // workWeek is controlled by parent (CalendarContainer)
    const [colOverlay, setColOverlay] = useState(null);

    // Fixed time column width; day columns will flex to fill available space
    const TIME_COL_PX = 80; // matches w-20

    const containerRef = useRef(null);
    const tasksScrollRef = useRef(null);
    const [showTasksLeftCue, setShowTasksLeftCue] = useState(false);
    const [showTasksRightCue, setShowTasksRightCue] = useState(false);
    const weekScrollRef = useRef(null);
    const listOuterRef = useRef(null);
    const [columnWidth, setColumnWidth] = useState(null);
    const [keyAreaMap, setKeyAreaMap] = useState({});

    // Track current time as ms so we can compute fractional minutes (minutes + seconds/60)
    const [nowMs, setNowMs] = useState(() => Date.now());
    // measured pixel height of a single slot row (read from DOM)
    const [measuredSlotPx, setMeasuredSlotPx] = useState(() =>
        Math.round((slotSize / 30) * 38)
    );
    const [listScrollTop, setListScrollTop] = useState(0);

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

    // Track FixedSizeList outer scroll so the now-line can be positioned relative to visible scroll
    useEffect(() => {
        const el = listOuterRef.current;
        if (!el) return;
        const onScroll = () => setListScrollTop(el.scrollTop || 0);
        el.addEventListener("scroll", onScroll, { passive: true });
        setListScrollTop(el.scrollTop || 0);

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
            el.removeEventListener("scroll", onScroll);
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

    // Measure column width so we can position event overlays exactly
    useEffect(() => {
        const el = weekScrollRef.current;
        if (!el) return;
        const measure = () => {
            try {
                const w = el.getBoundingClientRect().width || el.clientWidth || 0;
                // number of day columns depends on workWeek preference
                const cols = workWeek ? 5 : 7;
                const cw = Math.max(0, (w - TIME_COL_PX) / cols);
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

    // Calculate week start (Monday) and days (respect workWeek preference)
    const weekStart = new Date(currentDate || new Date());
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const daysCount = workWeek ? 5 : 7;
    const days = Array.from(
        { length: daysCount },
        (_, i) =>
            new Date(
                weekStart.getFullYear(),
                weekStart.getMonth(),
                weekStart.getDate() + i
            )
    );

    // Use dynamic time slots from preferences; fallback to full-day slots if not available
    const slots =
        timeSlots.length > 0
            ? timeSlots
            : generateTimeSlots("00:00", "24:00", slotSize);

    // Visual row height based on configured slotSize (minutes).
    // 30min -> 38px as reference, scaled proportionally.
    const ITEM_SIZE = Math.round((slotSize / 30) * 38);
    const LIST_HEIGHT_PX = 400;
    const weekNum = getWeekNumber(weekStart);

    // Update time slots when slot size changes
    useEffect(() => {
        if (updateSlotSize) {
            updateSlotSize(slotSize);
        }
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

    // Drag-and-drop handler
    const handleDrop = (e, day, slot) => {
        try {
            const [h, m] = slot.split(":");
            const date = new Date(
                day.getFullYear(),
                day.getMonth(),
                day.getDate(),
                Number(h),
                Number(m)
            );
            const eventId = e.dataTransfer.getData("eventId");
            if (eventId) {
                const dur = parseInt(
                    e.dataTransfer.getData("durationMs") || "0",
                    10
                );
                const newEnd = dur > 0 ? new Date(date.getTime() + dur) : null;
                onEventMove && onEventMove(eventId, date, newEnd);
                return;
            }
            const taskId = e.dataTransfer.getData("taskId");
            if (taskId) {
                const dropEffect = e.dataTransfer.dropEffect || e.dataTransfer.effectAllowed || "";
                onTaskDrop && onTaskDrop(taskId, date, dropEffect);
                return;
            }
            const activityId = e.dataTransfer.getData("activityId");
            if (activityId) {
                const dropEffect = e.dataTransfer.dropEffect || e.dataTransfer.effectAllowed || "";
                onActivityDrop && onActivityDrop(activityId, date, dropEffect);
            }
        } catch (err) {
            console.warn("Drop failed", err);
        }
    };

    // Range label for the week
    const endOfWeek = new Date(weekStart);
    endOfWeek.setDate(endOfWeek.getDate() + (daysCount - 1));
    const weekLabel = `${formatDate(weekStart)} — ${formatDate(endOfWeek)}`;

    // Helper: does event start fall within this slot minute range?
    // Previously we rounded to nearest slot; that caused starts at :15 to be
    // rounded up to :30. Instead, include any event whose start time is >=
    // the slot start and < slot end so events at arbitrary minutes render in
    // the correct slot and at the exact offset within that slot.
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

    // Helpers for color contrast (copied from DayView patterns)
    function hexToRgb(hex) {
        if (!hex) return null;
        const h = hex.replace("#", "");
        const bigint = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
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
                `}</style>
                <div className="p-0" style={{ overflow: "hidden", position: 'relative' }}>
                {/* Header with navigation inside the view */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        
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
                                    className={`${
                                        showViewMenu ? "rotate-180" : "rotate-0"
                                    } transition-transform`}
                                />
                            </button>
                            {showViewMenu && (
                                <div
                                    role="menu"
                                    className="absolute z-50 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
                                >
                                    {["day", "week", "month", "quarter"].map(
                                        (v) => (
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
                                                {v.charAt(0).toUpperCase() +
                                                    v.slice(1)}
                                            </button>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                        {/* toggle moved to right side */}
                    </div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {weekLabel}
                        {(loading || prefsLoading) && (
                            <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                                Loading
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
                                    // Left/Down -> 5-day, Right/Up -> 7-day
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
                                } catch (__) {}
                            }}
                        >
                            <button
                                type="button"
                                aria-pressed={workWeek}
                                onClick={() => { try { setWorkWeek(true); } catch(_) {} }}
                                className={`px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${workWeek ? 'text-white bg-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                title="5 day week (Mon-Fri)"
                            >
                                <span className="sr-only">Show 5 day week</span>
                                <span aria-hidden>5d</span>
                            </button>

                            <button
                                type="button"
                                aria-pressed={!workWeek}
                                onClick={() => { try { setWorkWeek(false); } catch(_) {} }}
                                className={`px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${!workWeek ? 'text-white bg-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                title="7 day week (Mon-Sun)"
                            >
                                <span className="sr-only">Show 7 day week</span>
                                <span aria-hidden>7d</span>
                            </button>
                        </div>
                        <button
                            className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                            style={{ minWidth: 36, minHeight: 36 }}
                            aria-label="Today"
                            onClick={() => {
                                try {
                                    if (typeof onSetDate === 'function') onSetDate(new Date());
                                } catch (_) {}
                                // trigger blink overlay for today's column
                                try {
                                    const today = new Date();
                                    const dIdx = days.findIndex(d => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate());
                                    if (dIdx === -1) return;
                                    const container = containerRef.current;
                                    if (!container) return;
                                    // find the header th for the day column
                                    const table = container.querySelector('table');
                                    let th = null;
                                    if (table) {
                                        const ths = table.querySelectorAll('thead th');
                                        // header has one leading 'all day' th, so day ths start at index 1
                                        th = ths[1 + dIdx];
                                    }
                                    let left = TIME_COL_PX + (columnWidth || 0) * dIdx;
                                    let width = columnWidth || (container.getBoundingClientRect().width - TIME_COL_PX) / daysCount;
                                    let top = 0;
                                    let height = container.scrollHeight || container.getBoundingClientRect().height;
                                    if (th) {
                                        const crect = container.getBoundingClientRect();
                                        const r = th.getBoundingClientRect();
                                        left = r.left - crect.left + container.scrollLeft;
                                        width = r.width;
                                        // Start the overlay at the header row (<thead><tr>) so it aligns with
                                        // the column name row exactly (matches the user's requested HTML row).
                                        try {
                                            const theadTr = table.querySelector('thead tr');
                                            if (theadTr) {
                                                    const trRect = theadTr.getBoundingClientRect();
                                                    // start the overlay just below the header row (use its bottom)
                                                    top = trRect.bottom - crect.top + container.scrollTop;
                                                } else {
                                                    top = r.top - crect.top + container.scrollTop;
                                                }
                                        } catch (__) {
                                            top = r.top - crect.top + container.scrollTop;
                                        }
                                        // compute bottom from the last child element of container
                                        // the right-side columns container is the .flex-1 element (grid class may be applied via style)
                                        const last = container.querySelector('.flex-1');
                                        if (last) {
                                            const lr = last.getBoundingClientRect();
                                            const lastBottom = lr.bottom - crect.top + container.scrollTop;
                                            // height should be measured from chosen top down to lastBottom
                                            height = Math.max(0, lastBottom - top);
                                        } else {
                                            height = Math.max(0, container.scrollHeight - top);
                                        }
                                    }
                                    setColOverlay({ left, top, width, height, visible: true });
                                    const totalMs = 450 * 4 + 100;
                                    setTimeout(() => setColOverlay(null), totalMs);
                                } catch (e) { /* swallow */ }
                            }}
                        >
                            Today
                        </button>
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
                <div
                    ref={containerRef}
                    className="no-scrollbar"
                    style={{ overflowX: "hidden", overflowY: "hidden" }}
                >
                    <div style={{ width: "100%" }}>
                        {/* Header + all-day row */}
                        <div className="no-scrollbar">
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
                                            <span className="sr-only">all day</span>
                                        </th>
                                        {days.map((date, dIdx) => (
                                            <th
                                                key={dIdx}
                                                className={`text-center px-2 py-2 text-blue-500 text-base font-semibold ${
                                                    dIdx === days.length - 1
                                                        ? "rounded-tr-lg"
                                                        : ""
                                                }`}
                                            >
                                                {formatDate(date, {
                                                    includeWeekday: true,
                                                    shortWeekday: true,
                                                })}
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
                                            <span className="ml-2 px-2 py-1 rounded bg-emerald-500 text-white text-[11px] font-semibold">All-Day</span>
                                        </td>
                                        {/* single cell spanning the day columns; we will render multi-day task bars inside */}
                                        <td className="border-r border-gray-100 px-2 py-2 align-top" colSpan={daysCount}>
                                            <div style={{ position: 'relative', minHeight: 40 }}>
                                                {(() => {
                                                    try {
                                                        // find todos that overlap this week AND span more than one day
                                                        const dayMs = 24 * 60 * 60 * 1000;
                                                        const weekTasks = (Array.isArray(todos) ? todos : []).filter((t) => {
                                                            try {
                                                                const s = t.startDate || t.start_date || t.date || t.dueDate || t.due_date || null;
                                                                const e = t.endDate || t.end_date || t.date || t.dueDate || t.due_date || s || null;
                                                                const sDt = s ? new Date(s) : null;
                                                                const eDt = e ? new Date(e) : null;
                                                                if (!sDt || !eDt) return false;
                                                                const sStart = new Date(sDt.getFullYear(), sDt.getMonth(), sDt.getDate(), 0, 0, 0, 0);
                                                                const eStartDay = new Date(eDt.getFullYear(), eDt.getMonth(), eDt.getDate(), 0, 0, 0, 0);
                                                                const eEnd = new Date(eDt.getFullYear(), eDt.getMonth(), eDt.getDate(), 23, 59, 59, 999);
                                                                // must overlap the week
                                                                if (!(sStart <= endOfWeek && eEnd >= weekStart)) return false;
                                                                // only include tasks that span more than one calendar day (end day strictly after start day)
                                                                if (eStartDay.getTime() <= sStart.getTime()) return false;
                                                                // also require they cover at least two day columns within this week
                                                                const startIndex = Math.floor((sStart - weekStart) / dayMs);
                                                                const endIndex = Math.floor((eEnd - weekStart) / dayMs);
                                                                return endIndex > startIndex;
                                                            } catch { return false; }
                                                        });

                                                        return weekTasks.map((t, i) => {
                                                            try {
                                                                const s = t.startDate || t.start_date || t.date || t.dueDate || t.due_date || null;
                                                                const e = t.endDate || t.end_date || t.date || t.dueDate || t.due_date || s || null;
                                                                const sDt = s ? new Date(s) : null;
                                                                const eDt = e ? new Date(e) : null;
                                                                if (!sDt || !eDt) return null;

                                                                const dayMs = 24 * 60 * 60 * 1000;
                                                                const sStart = new Date(sDt.getFullYear(), sDt.getMonth(), sDt.getDate(), 0, 0, 0, 0);
                                                                const eEnd = new Date(eDt.getFullYear(), eDt.getMonth(), eDt.getDate(), 23, 59, 59, 999);
                                                                const rawStartIndex = Math.floor((sStart - weekStart) / dayMs);
                                                                const rawEndIndex = Math.floor((eEnd - weekStart) / dayMs);
                                                                const startIndex = Math.max(0, rawStartIndex);
                                                                const endIndex = Math.min(daysCount - 1, rawEndIndex);
                                                                const leftPct = (startIndex / daysCount) * 100;
                                                                const widthPct = ((endIndex - startIndex + 1) / daysCount) * 100;
                                                                const continuesLeft = rawStartIndex < 0;
                                                                const continuesRight = rawEndIndex > (daysCount - 1);

                                                                // resolve color same as below
                                                                const kindKey = t.kind || t.type || t.kindName || null;
                                                                const cat = (kindKey && categories && categories[kindKey]) ? categories[kindKey] : null;
                                                                const bgClass = cat?.color || null;
                                                                const ka = (t.keyAreaId || t.key_area_id) ? keyAreaMap[String(t.keyAreaId || t.key_area_id)] : null;
                                                                const DEFAULT_BAR_COLOR = '#4DC3D8';
                                                                const kaColor = (ka && ka.color) ? ka.color : null;
                                                                const finalBg = bgClass ? null : (kaColor || DEFAULT_BAR_COLOR);
                                                                const textColor = finalBg ? getContrastTextColor(finalBg) : '#ffffff';
                                                                const style = bgClass ? undefined : { backgroundColor: finalBg, borderColor: finalBg, color: textColor };

                                                                const barStyle = { left: `${leftPct}%`, width: `${widthPct}%`, boxSizing: 'border-box', paddingRight: continuesRight ? '18px' : undefined, paddingLeft: continuesLeft ? '18px' : undefined, ...style };

                                                                return (
                                                                    <div
                                                                        key={`allday-${t.id}-${i}`}
                                                                        draggable
                                                                        onDragStart={(e) => {
                                                                            try {
                                                                                e.dataTransfer.setData("taskId", String(t.id));
                                                                                const durMs = eEnd.getTime() - sStart.getTime();
                                                                                e.dataTransfer.setData("durationMs", String(Math.max(0, durMs)));
                                                                                e.dataTransfer.effectAllowed = "move";
                                                                            } catch (_) {}
                                                                        }}
                                                                        onClick={() => onTaskClick && onTaskClick(String(t.id))}
                                                                        className={`absolute left-0 top-2 rounded px-2 py-1 text-xs overflow-hidden cursor-pointer ${bgClass || ''}`}
                                                                        style={barStyle}
                                                                        title={t.title || t.name}
                                                                    >
                                                                        {continuesLeft && (
                                                                            <FaChevronLeft className="w-4 h-4 absolute left-1 top-1 font-semibold" style={{ color: textColor, zIndex: 6, fontWeight: 700 }} />
                                                                        )}
                                                                        <div className="truncate font-medium">{t.title || t.name}</div>
                                                                        {continuesRight && (
                                                                            <FaChevronRight className="w-4 h-4 absolute right-1 top-1 font-semibold" style={{ color: textColor, zIndex: 6, fontWeight: 700 }} />
                                                                        )}
                                                                    </div>
                                                                );
                                                            } catch (__) { return null; }
                                                        });
                                                    } catch (e) {
                                                        return null;
                                                    }
                                                })()}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Time slots – virtualized */}
                            <div
                                ref={weekScrollRef}
                                className="w-full no-scrollbar"
                                style={{ position: "relative", width: "100%" }}
                            >
                                <FixedSizeList
                                    className="no-scrollbar"
                                    height={LIST_HEIGHT_PX}
                                    itemCount={slots.length}
                                    itemSize={ITEM_SIZE}
                                    width={undefined}
                                    outerRef={listOuterRef}
                                    innerElementType={React.forwardRef(function InnerWithOverlays({ children, style }, ref) {
                                        // inner element for react-window; render children (rows) and place overlays inside
                                        // We'll also provide resize handles for appointments so users can drag the top/bottom
                                        // edges to extend/shrink an appointment. This component manages transient
                                        // resize preview state and calls onEventMove when the pointer is released.
                                        try {
                                            const firstSlot = slots[0] || "00:00";
                                            const [fh, fm] = firstSlot.split(":").map(Number);
                                            const startMinutes = fh * 60 + (fm || 0);
                                            const pxPerMinute = (measuredSlotPx || ITEM_SIZE) / slotSize;
                                            const colW = columnWidth || Math.max(0, ((listOuterRef.current && listOuterRef.current.getBoundingClientRect().width) || 0 - TIME_COL_PX) / daysCount);

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
                                                    const durationMs = origEnd ? Math.max(0, origEnd.getTime() - origStart.getTime()) : 60 * 60 * 1000;

                                                    const state = {
                                                        id: evObj.id,
                                                        side, // 'top' or 'bottom'
                                                        origStart,
                                                        origEnd: origEnd || new Date(origStart.getTime() + durationMs),
                                                        startY: ev.clientY,
                                                        pxPerMinute,
                                                        startMinutes,
                                                        colIndex: days.findIndex((d) => d.getFullYear() === (new Date(evObj.start)).getFullYear() && d.getMonth() === (new Date(evObj.start)).getMonth() && d.getDate() === (new Date(evObj.start)).getDate()),
                                                        lastPreview: null,
                                                    };
                                                    setResizing(state);

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
                                                                    // clamp so start is not after end - minDuration
                                                                    const minStartTime = newEnd.getTime() - minDurationMinutes * 60000;
                                                                    if (newStart.getTime() > minStartTime) newStart = new Date(minStartTime);
                                                                } else {
                                                                    newEnd = new Date(curr.origEnd.getTime() + Math.round(deltaMinutes * 60000));
                                                                    const minEndTime = newStart.getTime() + minDurationMinutes * 60000;
                                                                    if (newEnd.getTime() < minEndTime) newEnd = new Date(minEndTime);
                                                                }

                                                                const newStartMins = newStart.getHours() * 60 + newStart.getMinutes() + newStart.getSeconds() / 60;
                                                                const newEndMins = newEnd.getHours() * 60 + newEnd.getMinutes() + newEnd.getSeconds() / 60;
                                                                const topPx = (newStartMins - curr.startMinutes) * curr.pxPerMinute;
                                                                const heightPx = Math.max(18, (newEndMins - newStartMins) * curr.pxPerMinute);

                                                                return { ...curr, previewStart: newStart, previewEnd: newEnd, previewTop: topPx, previewHeight: heightPx };
                                                            });
                                                        } catch (__) {}
                                                    };

                                                    const onPointerUp = (up) => {
                                                        try {
                                                            cleanupPointerListeners.current();
                                                            // finalize
                                                            setResizing((curr) => {
                                                                if (!curr || curr.id !== state.id) return null;
                                                                const finalStart = curr.previewStart || curr.origStart;
                                                                const finalEnd = curr.previewEnd || curr.origEnd;
                                                                // call parent handler to persist
                                                                try {
                                                                    if (typeof onEventMove === "function") {
                                                                        onEventMove && onEventMove(curr.id, finalStart, finalEnd);
                                                                    }
                                                                } catch (__) {}
                                                                return null;
                                                            });
                                                        } catch (__) {}
                                                    };

                                                    // register global listeners
                                                    window.addEventListener("pointermove", onPointerMove);
                                                    window.addEventListener("pointerup", onPointerUp, { once: true });
                                                    cleanupPointerListeners.current = () => {
                                                        try { window.removeEventListener("pointermove", onPointerMove); } catch (__) {}
                                                        try { window.removeEventListener("pointerup", onPointerUp); } catch (__) {}
                                                    };
                                                } catch (__) {}
                                            };

                                            const cancelResize = () => {
                                                try { cleanupPointerListeners.current(); } catch (__) {}
                                                setResizing(null);
                                            };

                                            return (
                                                <div ref={ref} style={{ ...style, position: "relative" }}>
                                                    {children}
                                                    {/* now line placed inside inner element so it scrolls naturally */}
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
                                                            const nowMinutesFloat = nowDate.getHours() * 60 + nowDate.getMinutes() + nowDate.getSeconds() / 60;
                                                            if (nowMinutesFloat < (startMinutes) || nowMinutesFloat > endMinutes) return null;
                                                            const nowTop = (nowMinutesFloat - startMinutes) * pxPerMinute;

                                                            return (
                                                                <div
                                                                    className="absolute flex items-center pointer-events-none"
                                                                    style={{ left: TIME_COL_PX + "px", right: 0, top: nowTop + "px" }}
                                                                >
                                                                    <span className="ml-[-32px] bg-red-500 text-white text-[10px] px-1 rounded-full">
                                                                        {formatTime ? formatTime(`${String(nowDate.getHours()).padStart(2, "0")}:${String(nowDate.getMinutes()).padStart(2, "0")}`) : `${String(nowDate.getHours()).padStart(2, "0")}:${String(nowDate.getMinutes()).padStart(2, "0")}`}
                                                                    </span>
                                                                    <div className="flex-1 border-t border-red-400" />
                                                                </div>
                                                            );
                                                        } catch (e) {
                                                            return null;
                                                        }
                                                    })()}

                                                    {/* overlays */}
                                                    {days.map((date, dIdx) => {
                                                        return (events || [])
                                                            .filter((ev) => {
                                                                try {
                                                                    const s = ev.start ? new Date(ev.start) : null;
                                                                    if (!s) return false;
                                                                    return (
                                                                        s.getFullYear() === date.getFullYear() &&
                                                                        s.getMonth() === date.getMonth() &&
                                                                        s.getDate() === date.getDate() &&
                                                                        !ev.taskId
                                                                    );
                                                                } catch (__) {
                                                                    return false;
                                                                }
                                                            })
                                                            .map((ev, i) => {
                                                                try {
                                                                    const evStart = ev.start ? new Date(ev.start) : null;
                                                                    const evEnd = ev.end ? new Date(ev.end) : null;
                                                                    if (!evStart) return null;

                                                                    const evStartMins = evStart.getHours() * 60 + evStart.getMinutes() + evStart.getSeconds() / 60;
                                                                    const evEndMins = evEnd ? evEnd.getHours() * 60 + evEnd.getMinutes() + evEnd.getSeconds() / 60 : evStartMins + slotSize / 60;

                                                                    const topPx = (evStartMins - startMinutes) * pxPerMinute;
                                                                    const durationMins = Math.max(15, evEndMins - evStartMins);
                                                                    const heightPx = Math.max(18, durationMins * pxPerMinute);

                                                                    const leftPx = TIME_COL_PX + dIdx * colW + 6;
                                                                    const widthPx = Math.max(40, colW - 12);

                                                                    const kindClass = categories[ev.kind]?.color || null;

                                                                    const isResizingThis = resizing && String(resizing.id) === String(ev.id);

                                                                    return (
                                                                        <div
                                                                            key={`ov-${dIdx}-${i}-${ev.id || i}`}
                                                                            style={{
                                                                                position: "absolute",
                                                                                top: topPx + "px",
                                                                                left: leftPx + "px",
                                                                                width: widthPx + "px",
                                                                                height: Math.max(18, heightPx) + "px",
                                                                                zIndex: 20,
                                                                                pointerEvents: "auto",
                                                                            }}
                                                                        >
                                                                            {/* main appointment bar */}
                                                                            <div
                                                                                className={`rounded px-2 py-1 text-xs overflow-hidden flex items-center gap-2 group ${kindClass || "bg-gray-200"}`}
                                                                                style={{ height: "100%", cursor: "pointer" }}
                                                                                draggable
                                                                                onDragStart={(e) => {
                                                                                    try {
                                                                                        e.dataTransfer.setData("eventId", String(ev.id));
                                                                                        const dur = ev.end ? new Date(ev.end).getTime() - new Date(ev.start).getTime() : 60 * 60 * 1000;
                                                                                        e.dataTransfer.setData("durationMs", String(Math.max(dur, 0)));
                                                                                        e.dataTransfer.effectAllowed = "move";
                                                                                    } catch (_) {}
                                                                                }}
                                                                                onClick={(e) => {
                                                                                    try { e.stopPropagation(); } catch (_) {}
                                                                                    onEventClick && onEventClick(ev);
                                                                                }}
                                                                            >
                                                                                <span className="shrink-0">{categories[ev.kind]?.icon || ""}</span>
                                                                                <span className="truncate whitespace-nowrap text-xs min-w-0 flex-1" tabIndex={0} aria-label={ev.title}>{ev.title}</span>
                                                                                <div className="hidden group-hover:flex items-center gap-1 ml-2">
                                                                                    <button
                                                                                        className="p-1 rounded hover:bg-black/10 transition-colors"
                                                                                        onClick={(e) => {
                                                                                            try { e.stopPropagation(); } catch (_) {}
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
                                                                                            try { e.stopPropagation(); } catch (_) {}
                                                                                            if (typeof onDeleteRequest === 'function') return onDeleteRequest(ev, e);
                                                                                            onEventClick && onEventClick(ev, 'delete');
                                                                                        }}
                                                                                        aria-label={`Delete ${ev.title}`}
                                                                                        title="Delete appointment"
                                                                                    >
                                                                                        <FaTrash className="w-3 h-3 text-red-600" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            {/* top resize handle */}
                                                                            <div
                                                                                role="separator"
                                                                                aria-orientation="horizontal"
                                                                                onPointerDown={(e) => startResize(e, ev, 'top')}
                                                                                className="absolute left-0 right-0 h-2 -top-1 cursor-ns-resize"
                                                                                style={{ zIndex: 30 }}
                                                                            />

                                                                            {/* bottom resize handle */}
                                                                            <div
                                                                                role="separator"
                                                                                aria-orientation="horizontal"
                                                                                onPointerDown={(e) => startResize(e, ev, 'bottom')}
                                                                                className="absolute left-0 right-0 h-2 -bottom-1 cursor-ns-resize"
                                                                                style={{ zIndex: 30 }}
                                                                            />

                                                                            {/* live preview while resizing */}
                                                                            {isResizingThis && resizing.previewTop != null && (
                                                                                <div
                                                                                    className="absolute rounded pointer-events-none border-2 border-dashed border-slate-400 bg-slate-200/30"
                                                                                    style={{ top: resizing.previewTop + 'px', left: 0, width: '100%', height: resizing.previewHeight + 'px', zIndex: 40 }}
                                                                                >
                                                                                    <div className="absolute -top-6 left-2 bg-black text-white text-[11px] px-2 py-0.5 rounded">
                                                                                        {resizing.previewStart ? (formatTime ? formatTime(`${String(resizing.previewStart.getHours()).padStart(2,'0')}:${String(resizing.previewStart.getMinutes()).padStart(2,'0')}`) : `${String(resizing.previewStart.getHours()).padStart(2,'0')}:${String(resizing.previewStart.getMinutes()).padStart(2,'0')}`) : ''}
                                                                                        {' — '}
                                                                                        {resizing.previewEnd ? (formatTime ? formatTime(`${String(resizing.previewEnd.getHours()).padStart(2,'0')}:${String(resizing.previewEnd.getMinutes()).padStart(2,'0')}`) : `${String(resizing.previewEnd.getHours()).padStart(2,'0')}:${String(resizing.previewEnd.getMinutes()).padStart(2,'0')}`) : ''}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                } catch (__) {
                                                                    return null;
                                                                }
                                                            });
                                                    })}
                                                    {/* cancel preview if component unmounts */}
                                                    {resizing && <div style={{ display: 'none' }} onMouseDown={() => { }} />}
                                                </div>
                                            );
                                        } catch (e) {
                                            return <div ref={ref} style={{ ...style, position: "relative" }}>{children}</div>;
                                        }
                                    })}
                                >
                                    {({ index, style }) => {
                                        const slot = slots[index];
                                        const [slotHour, slotMinute] = slot
                                            .split(":")
                                            .map((n) => parseInt(n, 10) || 0);

                                        const isHourBoundary = slotMinute === 0;
                                        const isHalfHourBoundary = slotMinute === 30;
                                        const isQuarterHourBoundary =
                                            slotMinute % 15 === 0 && slotMinute % 30 !== 0;

                                        // Hour boundary: full-width prominent line.
                                        // Half-hour boundary: we will NOT draw the top border on the full row
                                        // so it doesn't extend into the hour label column; instead we draw
                                        // a subtle solid top-border on each day cell below.
                                        const rowBorderClass = isHourBoundary
                                            ? "border-t border-slate-300"
                                            : isHalfHourBoundary
                                            ? ""
                                            : "border-t border-slate-100";

                                                        // Determine if this slot is working time (used to gray out non-working areas)
                                                        const slotIsWorking = isWorkingTime ? isWorkingTime(slot) : true;

                                                        // Subtle top-border for half-hour and dotted for quarter-hour cells.
                                                        const cellTopBorderStyle = isHalfHourBoundary
                                                                ? {
                                                                            borderTopStyle: "solid",
                                                                            borderTopWidth: "1px",
                                                                            // subtle color for half-hour
                                                                            borderTopColor: "rgba(148,163,184,0.15)",
                                                                    }
                                                                : isQuarterHourBoundary
                                                                                    ? {
                                                                                                borderTopStyle: "dotted",
                                                                                                borderTopWidth: "1px",
                                                                                                // match opacity/color with half-hour so visibility is the same
                                                                                                borderTopColor: "rgba(148,163,184,0.15)",
                                                                                        }
                                                                : {};

                                        return (
                                            <div
                                                key={index}
                                                data-slot-index={index}
                                                style={{
                                                    ...style,
                                                    overflow: "visible",
                                                    boxSizing: "border-box",
                                                }}
                                                className={`flex w-full bg-white ${rowBorderClass}`}
                                            >
                                                {/* LEFT: hour labels (only on :00) */}
                                                <div
                                                    className="border-r border-gray-100 px-2 text-xs text-gray-500 flex-shrink-0 flex items-center justify-center relative"
                                                    style={{
                                                        width: TIME_COL_PX + "px",
                                                        height: ITEM_SIZE,
                                                        backgroundColor: slotIsWorking ? undefined : NON_WORK_BG,
                                                    }}
                                                >
                                                    {/* non-working hour indicator removed (keep pale background only) */}

                                                    <span className="pl-2">
                                                        {isHourBoundary
                                                            ? formatTime(slot)
                                                            : ""}
                                                    </span>
                                                </div>

                                                {/* RIGHT: grid cells for each day */}
                                                {days.map((date, dIdx) => {
                                                     const slotEvents =
                                                        events.filter(
                                                            (ev) =>
                                                                eventMatchesSlot(
                                                                    ev.start,
                                                                    date,
                                                                    slot,
                                                                    slotSize
                                                                ) && !ev.taskId
                                                        );

                                                    return (
                                                        <div
                                                            key={dIdx}
                                                            className="border-r border-gray-100 px-2 align-top group flex items-center relative overflow-visible"
                                                            style={{
                                                                flex: "1 1 0",
                                                                minWidth: 0,
                                                                height: ITEM_SIZE,
                                                                boxSizing:
                                                                    "border-box",
                                                                cursor: "pointer",
                                                                backgroundColor: slotIsWorking ? undefined : NON_WORK_BG,
                                                                opacity: slotIsWorking ? 1 : NON_WORK_OPACITY,
                                                                ...cellTopBorderStyle,
                                                            }}
                                                            onDragOver={(e) =>
                                                                e.preventDefault()
                                                            }
                                                            onDrop={(e) =>
                                                                handleDrop(
                                                                    e,
                                                                    date,
                                                                    slot
                                                                )
                                                            }
                                                            onClick={(e) => {
                                                                try {
                                                                    e.stopPropagation();
                                                                } catch {}
                                                                const [h, m] =
                                                                    slot.split(
                                                                        ":"
                                                                    );
                                                                const dt =
                                                                    new Date(
                                                                        date.getFullYear(),
                                                                        date.getMonth(),
                                                                        date.getDate(),
                                                                        Number(h),
                                                                        Number(m)
                                                                    );
                                                                onQuickCreate &&
                                                                    onQuickCreate(
                                                                        dt
                                                                    );
                                                            }}
                                                        >
                                                            {/* 15-minute midpoint line for 30-minute slot granularity */}
                                                            {slotSize === 30 && (
                                                                <div
                                                                    aria-hidden="true"
                                                                    style={{
                                                                        position:
                                                                            "absolute",
                                                                        left: 2,
                                                                        right: 2,
                                                                        // place at midpoint of the row
                                                                        top:
                                                                            (measuredSlotPx || ITEM_SIZE) / 2 +
                                                                            "px",
                                                                        height: 1,
                                                                        borderTopStyle:
                                                                            "dotted",
                                                                        borderTopWidth:
                                                                            "1px",
                                                                        borderTopColor:
                                                                            "rgba(148,163,184,0.15)",
                                                                        pointerEvents:
                                                                            "none",
                                                                        zIndex: 1,
                                                                    }}
                                                                />
                                                            )}

                                                            {null}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    }}
                                </FixedSizeList>

                                
                                
                            </div>
                        </div>
                        {/* Column overlay for Today blink */}
                        {colOverlay && colOverlay.visible && (
                            <div
                                className="today-row-overlay"
                                style={{
                                    position: 'absolute',
                                    left: colOverlay.left,
                                    top: colOverlay.top,
                                    width: colOverlay.width,
                                    height: colOverlay.height,
                                    zIndex: 80,
                                    pointerEvents: 'none',
                                    backgroundColor: 'rgba(59,130,246,0.32)'
                                }}
                            />
                        )}

                        {/* Combined Tasks + Activities row: render per-day vertical columns under each date (no separation) */}
                        <div className="flex w-full bg-white border border-gray-100 rounded-b-lg mt-2">
                            {/* LEFT: sticky column with both Add buttons stacked */}
                            <div className="flex flex-col items-start pr-2 pl-1 py-2" style={{ width: TIME_COL_PX + "px", position: 'sticky', left: 0, zIndex: 30, backgroundColor: 'white', minHeight: 56 }}>
                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center px-2 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm whitespace-nowrap mb-2"
                                    style={{ minHeight: 36, width: TIME_COL_PX + "px", alignSelf: 'flex-start' }}
                                    onClick={() =>
                                        onAddTaskOrActivity &&
                                        onAddTaskOrActivity(currentDate || new Date(), { defaultTab: "task" })
                                    }
                                >
                                    <span>Add task</span>
                                </button>

                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center px-2 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm whitespace-nowrap"
                                    style={{ minHeight: 36, width: TIME_COL_PX + "px", alignSelf: 'flex-start' }}
                                    onClick={() =>
                                        onAddTaskOrActivity &&
                                        onAddTaskOrActivity(currentDate || new Date(), { defaultTab: "activity" })
                                    }
                                >
                                    <span>Add activity</span>
                                </button>
                            </div>

                            {/* RIGHT: day columns (5 or 7 depending on workWeek) */}
                            <div className="flex-1" style={{ display: 'grid', gridTemplateColumns: `repeat(${daysCount}, minmax(0, 1fr))`, gap: 0 }}>
                                {days.map((date, dIdx) => {
                                    const startDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
                                    const endDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

                                    // Only include single-day tasks in the per-day columns.
                                    // Multi-day tasks are rendered in the all-day row above.
                                    const dayTodos = (Array.isArray(todos) ? todos : []).filter((t) => {
                                        try {
                                            const s = t.startDate || t.start_date || t.date || t.dueDate || t.due_date || null;
                                            const e = t.endDate || t.end_date || t.date || t.dueDate || t.due_date || s || null;
                                            const sDt = s ? new Date(s) : null;
                                            const eDt = e ? new Date(e) : null;
                                            if (!sDt || !eDt) return false;

                                            // Determine start-of-day for both dates
                                            const sStartDay = new Date(sDt.getFullYear(), sDt.getMonth(), sDt.getDate(), 0, 0, 0, 0);
                                            const eStartDay = new Date(eDt.getFullYear(), eDt.getMonth(), eDt.getDate(), 0, 0, 0, 0);

                                            // If the task spans more than one calendar day, exclude it from per-day columns
                                            if (eStartDay.getTime() > sStartDay.getTime()) return false;

                                            // Finally, include if it overlaps this specific day
                                            const rs = sDt;
                                            const re = eDt;
                                            return rs <= endDay && re >= startDay;
                                        } catch (__) {
                                            return false;
                                        }
                                    }).map((t) => ({...t, __type: 'task'}));

                                    const dayActivities = (Array.isArray(activities) ? activities : []).filter((a) => {
                                        try {
                                            const cand = new Date(a.date || a.startDate || a.start_date || a.dueDate || a.due_date || a.createdAt || a.created_at || null);
                                            if (isNaN(cand.getTime())) return false;
                                            return (
                                                cand.getFullYear() === date.getFullYear() &&
                                                cand.getMonth() === date.getMonth() &&
                                                cand.getDate() === date.getDate()
                                            );
                                        } catch (_) {
                                            return false;
                                        }
                                    }).map((a) => ({...a, __type: 'activity'}));

                                    // combine and optionally sort (by startDate/date/createdAt if present)
                                    const combined = [...dayTodos, ...dayActivities].sort((x, y) => {
                                        const getTime = (it) => {
                                            try {
                                                if (it.__type === 'task') {
                                                    const s = it.startDate || it.start_date || it.date || it.dueDate || it.due_date || null;
                                                    return s ? new Date(s).getTime() : 0;
                                                }
                                                const s2 = it.date || it.startDate || it.start_date || it.dueDate || it.due_date || it.createdAt || it.created_at || null;
                                                return s2 ? new Date(s2).getTime() : 0;
                                            } catch { return 0; }
                                        };
                                        return (getTime(x) || 0) - (getTime(y) || 0);
                                    });

                                    return (
                                        <div key={`col-${dIdx}`} className="border-r border-gray-100 p-2 min-h-[56px] overflow-hidden">
                                            <div className="flex flex-col gap-2">
                                                {combined.map((item) => {
                                                    if (item.__type === 'task') {
                                                        const t = item;
                                                        // Defensive: if a multi-day task somehow made it into the per-day list,
                                                        // skip rendering here so it only appears in the all-day row above.
                                                        try {
                                                            const s = t.startDate || t.start_date || t.date || t.dueDate || t.due_date || null;
                                                            const e = t.endDate || t.end_date || t.date || t.dueDate || t.due_date || s || null;
                                                            const sDt = s ? new Date(s) : null;
                                                            const eDt = e ? new Date(e) : null;
                                                            if (sDt && eDt) {
                                                                const sStartDay = new Date(sDt.getFullYear(), sDt.getMonth(), sDt.getDate(), 0,0,0,0);
                                                                const eStartDay = new Date(eDt.getFullYear(), eDt.getMonth(), eDt.getDate(), 0,0,0,0);
                                                                if (eStartDay.getTime() > sStartDay.getTime()) {
                                                                    // multi-day => don't render in day column
                                                                    return null;
                                                                }
                                                            }
                                                        } catch (__) {}
                                                        const kindKey = t.kind || t.type || t.kindName || null;
                                                        const cat = (kindKey && categories && categories[kindKey]) ? categories[kindKey] : null;
                                                        const bgClass = cat?.color || null;
                                                        const ka = (t.keyAreaId || t.key_area_id) ? keyAreaMap[String(t.keyAreaId || t.key_area_id)] : null;
                                                        const DEFAULT_BAR_COLOR = '#4DC3D8';
                                                        const kaColor = (ka && ka.color) ? ka.color : null;
                                                        const finalBg = bgClass ? null : (kaColor || DEFAULT_BAR_COLOR);
                                                        const textColor = finalBg ? getContrastTextColor(finalBg) : '#ffffff';
                                                        const style = bgClass ? undefined : { backgroundColor: finalBg, borderColor: finalBg, color: textColor };

                                                        return (
                                                            <div
                                                                key={`task-${t.id}`}
                                                                draggable
                                                                onDragStart={(e) => {
                                                                    try {
                                                                        e.dataTransfer.setData("taskId", String(t.id));
                                                                        e.dataTransfer.effectAllowed = "copy";
                                                                    } catch {}
                                                                }}
                                                                onClick={() => onTaskClick && onTaskClick(String(t.id))}
                                                                className={`px-2 py-1 rounded border text-xs cursor-grab active:cursor-grabbing min-w-0 flex items-center gap-2 hover:opacity-90 ${bgClass || ''}`}
                                                                style={style}
                                                                title={t.title || t.name}
                                                            >
                                                                <div className="truncate font-medium">{t.title || t.name}</div>
                                                            </div>
                                                        );
                                                    }

                                                    // activity
                                                    const a = item;
                                                    const kindKey = a.kind || a.type || null;
                                                    const cat = (kindKey && categories && categories[kindKey]) ? categories[kindKey] : null;
                                                    let ka = null;
                                                    if (a.keyAreaId || a.key_area_id) ka = keyAreaMap[String(a.keyAreaId || a.key_area_id)];
                                                    else if (a.taskId || a.task_id) {
                                                        const parent = (Array.isArray(todos) ? todos : []).find((t) => String(t.id) === String(a.taskId || a.task_id));
                                                        if (parent) ka = keyAreaMap[String(parent.keyAreaId || parent.key_area_id)];
                                                    }
                                                    const bgClass = cat?.color || null;
                                                    const DEFAULT_BAR_COLOR = '#4DC3D8';
                                                    const kaColor = (ka && ka.color) ? ka.color : null;
                                                    const finalBg = bgClass ? null : (kaColor || DEFAULT_BAR_COLOR);
                                                    const textColor = finalBg ? getContrastTextColor(finalBg) : '#ffffff';
                                                    const style = bgClass ? undefined : { backgroundColor: finalBg, borderColor: finalBg, color: textColor };

                                                    return (
                                                        <div
                                                            key={`act-${a.id}`}
                                                            draggable
                                                            onDragStart={(e) => {
                                                                try {
                                                                    e.dataTransfer.setData("activityId", String(a.id || ""));
                                                                    e.dataTransfer.setData("activityText", String(a.text || a.title || "Activity"));
                                                                    e.dataTransfer.effectAllowed = "copyMove";
                                                                } catch {}
                                                            }}
                                                            className={`px-2 py-1 rounded border text-xs truncate w-full flex items-center gap-2 ${bgClass || ''}`}
                                                            style={style}
                                                            title={a.text || a.title}
                                                        >
                                                            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="w-4 h-4 text-[#4DC3D8] shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"></path>
                                                            </svg>
                                                            <div className="truncate font-medium">{a.text || a.title}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default WeekView;