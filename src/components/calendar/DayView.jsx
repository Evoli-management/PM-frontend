import React from "react";
import { FaChevronLeft, FaChevronRight, FaChevronDown, FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { FixedSizeList } from "react-window";
import AvailabilityBlock from "./AvailabilityBlock";
import { useCalendarPreferences } from "../../hooks/useCalendarPreferences";

export default function DayView({
    currentDate,
    view,
    onChangeView,
    filterType,
    onChangeFilter,
    events,
    todos,
    activitiesByTask = {},
    categories,
    onTaskDrop,
    onEventMove,
    onActivityDrop,
    onEventClick,
    onTaskClick,
    onActivityClick,
    onPlanTomorrow,
    onShiftDate,
    onSetDate,
    onQuickCreate,
    onAddTaskOrActivity,
    loading = false,
}) {
    const { 
        timeSlots, 
        formattedTimeSlots, 
        workingHours, 
        formatTime,
        formatDate,
        loading: prefsLoading 
    } = useCalendarPreferences(30);
    const [showViewMenu, setShowViewMenu] = React.useState(false);
    
    // Use dynamic hours from working preferences, fallback to default if still loading
    const hours = timeSlots.length > 0 ? timeSlots : [
        "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
        "16:00", "16:30", "17:00"
    ];

    // Create a formatted hours array for display
    const formattedHours = hours.map(hour => ({
        value: hour,
        display: formatTime(hour)
    }));
    
    const today = currentDate || new Date();
    const slotSizeMin = 30;
    const SLOT_ROW_PX = 38; // visual height per 30-min slot, aligns with WeekView
    const overlapsSlot = (ev, refDate, slot) => {
        try {
            if (!ev?.start || !ev?.end) return matchesSlot(ev?.start, refDate, slot); // fallback to start-only
            const [sh, sm] = slot.split(":");
            const slotStart = new Date(
                refDate.getFullYear(),
                refDate.getMonth(),
                refDate.getDate(),
                Number(sh),
                Number(sm),
            );
            const slotEnd = new Date(slotStart.getTime() + slotSizeMin * 60000);
            const start = new Date(ev.start);
            const end = new Date(ev.end);
            if (
                start.getFullYear() !== refDate.getFullYear() ||
                start.getMonth() !== refDate.getMonth() ||
                start.getDate() !== refDate.getDate()
            )
                return false;
            return start < slotEnd && end > slotStart; // overlap
        } catch {
            return false;
        }
    };
    // Build date-only value for comparisons and filter todos to those spanning today
    const toDateOnly = (iso) => {
        if (!iso) return null;
        const d = new Date(iso);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isInRangeToday = (t) => {
        let start = toDateOnly(t.startDate) || toDateOnly(t.dueDate) || toDateOnly(t.endDate);
        let end = toDateOnly(t.endDate) || toDateOnly(t.dueDate) || toDateOnly(t.startDate);
        if (!start && !end) return false;
        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }
        if (!start) start = end;
        if (!end) end = start;
        return start <= todayOnly && todayOnly <= end;
    };
    const dayTodos = Array.isArray(todos) ? todos.filter(isInRangeToday) : [];
    const dayActivities = React.useMemo(
        () =>
            (dayTodos || []).flatMap((t) =>
                Array.isArray(activitiesByTask?.[String(t.id)]) ? activitiesByTask[String(t.id)] : [],
            ),
        [dayTodos, activitiesByTask],
    );
    const matchesSlot = (startIso, refDate, slot) => {
        try {
            const ev = new Date(startIso);
            if (
                ev.getFullYear() !== refDate.getFullYear() ||
                ev.getMonth() !== refDate.getMonth() ||
                ev.getDate() !== refDate.getDate()
            )
                return false;
            const [sh, smRaw] = slot.split(":");
            const shNum = Number(sh);
            const smNum = Number(smRaw);
            let eh = ev.getHours();
            let em = ev.getMinutes();
            const rounded = Math.round(em / slotSizeMin) * slotSizeMin;
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
    // Drag-and-drop handler
    const handleDrop = (e, hour) => {
        try {
            const [hh, mm] = hour.split(":");
            const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), Number(hh), Number(mm));
            const eventId = e.dataTransfer.getData("eventId");
            if (eventId) {
                const dur = parseInt(e.dataTransfer.getData("durationMs") || "0", 10);
                const newEnd = dur > 0 ? new Date(date.getTime() + dur) : null;
                onEventMove && onEventMove(eventId, date, newEnd);
                return;
            }
            const taskId = e.dataTransfer.getData("taskId");
            if (taskId) {
                const task = todos.find((t) => String(t.id) === String(taskId));
                if (task) onTaskDrop && onTaskDrop(task, date);
                return;
            }
            const activityText = e.dataTransfer.getData("activityText");
            const activityId = e.dataTransfer.getData("activityId");
            if (activityText || activityId) {
                const a = activityId
                    ? dayActivities.find((x) => String(x.id) === String(activityId)) || { id: activityId, text: activityText }
                    : { text: activityText };
                onActivityDrop && onActivityDrop(a, date);
            }
        } catch {}
    };
    return (
        <div className="p-0 flex gap-4 w-full max-w-none">
            {/* Left: Calendar day view */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {/* Back first, then View dropdown */}
                        <button
                            className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                            style={{ minWidth: 36, minHeight: 36 }}
                            aria-label="Previous day"
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
                        {formatDate(today, { includeWeekday: true, longMonth: true })}
                        {(loading || prefsLoading) && (
                            <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                                Loading
                            </span>
                        )}
                        {workingHours.startTime && workingHours.endTime && (
                            <span className="text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded px-2 py-0.5">
                                {formatTime(workingHours.startTime)} - {formatTime(workingHours.endTime)}
                            </span>
                        )}
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
                            aria-label="Next day"
                            onClick={() => onShiftDate && onShiftDate(1)}
                        >
                            <FaChevronRight />
                        </button>
                    </div>
                </div>
                <div
                    className="flex flex-col gap-1"
                    style={{ maxWidth: "100%", maxHeight: "60vh", overflowX: "auto", overflowY: "auto" }}
                >
                    {/* Keep clean: no empty-state banner when there are no events */}
                    <table
                        className="min-w-full border border-blue-100 rounded-lg"
                        style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}
                    >
                        <thead>
                            <tr className="bg-sky-50">
                                <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400 w-24">Time</th>
                                <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400">Events</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hours.map((h, idx) => {
                                // Calculate slot start/end
                                const [hh, mm] = h.split(":");
                                const slotStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), Number(hh), Number(mm));
                                const nextSlot = hours[idx + 1];
                                const slotEnd = nextSlot
                                    ? new Date(today.getFullYear(), today.getMonth(), today.getDate(), ...nextSlot.split(":").map(Number))
                                    : new Date(today.getFullYear(), today.getMonth(), today.getDate(), Number(hh), Number(mm) + 30);
                                // Only render bars in the slot where the event starts
                                const renderEvents = events.filter((ev) => {
                                    const evStart = new Date(ev.start);
                                    return evStart.getHours() === slotStart.getHours() && evStart.getMinutes() === slotStart.getMinutes();
                                });
                                const isBoundary = h === workingHours.endTime; // non-interactive row
                                const formattedHour = formattedHours.find(fh => fh.value === h);
                                return (
                                    <tr key={idx} className={idx % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                                        <td className="border-t border-r border-blue-100 px-2 py-1 text-xs w-24 align-top">
                                            <span>{formattedHour ? formattedHour.display : h}</span>
                                        </td>
                                        <td
                                            className={`border-t border-blue-100 px-2 py-1 align-top relative ${isBoundary ? "pointer-events-none opacity-60" : ""}`}
                                            style={{ width: "100%", minHeight: 32 }}
                                            {...(!isBoundary && {
                                                onDoubleClick: () => {
                                                    const [hh, mm] = h.split(":");
                                                    const date = new Date(
                                                        today.getFullYear(),
                                                        today.getMonth(),
                                                        today.getDate(),
                                                        Number(hh),
                                                        Number(mm),
                                                    );
                                                    onQuickCreate && onQuickCreate(date);
                                                },
                                                onDragOver: (e) => {
                                                    try {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = "copy";
                                                    } catch {}
                                                },
                                                onDrop: (e) => handleDrop(e, h),
                                            })}
                                        >
                                            <div style={{ position: "relative", minHeight: 32 }}>
                                                {renderEvents.map((ev, i) => {
                                                    const isTaskBox = !!ev.taskId;
                                                    // Calculate bar height to span all overlapping slots
                                                    const evStart = new Date(ev.start);
                                                    const evEnd = ev.end ? new Date(ev.end) : new Date(evStart.getTime() + 30 * 60000);
                                                    const slotIdx = idx;
                                                    // Find which slot index the event ends in
                                                    let endIdx = slotIdx;
                                                    for (let j = slotIdx + 1; j < hours.length; j++) {
                                                        const [ehh, emm] = hours[j].split(":");
                                                        const slotEndTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), Number(ehh), Number(emm));
                                                        if (slotEndTime > evEnd) break;
                                                        endIdx = j;
                                                    }
                                                    const barHeight = (endIdx - slotIdx + 1) * 32 - 4; // 32px per slot, minus small gap
                                                    // Check if next event starts at the end of this event
                                                    let showBoundary = false;
                                                    if (i < renderEvents.length - 1) {
                                                        const nextEv = renderEvents[i + 1];
                                                        const evEndTime = ev.end ? new Date(ev.end) : new Date(evStart.getTime() + 30 * 60000);
                                                        const nextEvStartTime = new Date(nextEv.start);
                                                        if (evEndTime.getTime() === nextEvStartTime.getTime()) {
                                                            showBoundary = true;
                                                        }
                                                    }
                                                    return (
                                                        <>
                                                            <div
                                                                key={i}
                                                                className={`px-2 py-1 rounded cursor-pointer flex items-center gap-1 w-full max-w-full overflow-hidden group ${
                                                                    isTaskBox
                                                                        ? ""
                                                                        : categories[ev.kind]?.color || "bg-gray-200"
                                                                }`}
                                                                style={{
                                                                    position: "absolute",
                                                                    left: 0,
                                                                    right: 0,
                                                                    top: 0,
                                                                    height: barHeight,
                                                                    backgroundColor: isTaskBox ? "#7ED4E3" : undefined,
                                                                    zIndex: 2,
                                                                    boxShadow: "0 2px 8px -2px rgba(0,0,0,0.08)",
                                                                    border: "1.5px solid #2563eb",
                                                                }}
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
                                                                onClick={() => onEventClick(ev)}
                                                            >
                                                                {!isTaskBox && (
                                                                    <span className="shrink-0">
                                                                        {categories[ev.kind]?.icon || ""}
                                                                    </span>
                                                                )}
                                                                <span className="truncate whitespace-nowrap text-xs min-w-0 flex-1">
                                                                    {ev.title}
                                                                </span>
                                                                {!isTaskBox && (
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
                                                                )}
                                                            </div>
                                                            {showBoundary && (
                                                                <div style={{
                                                                    position: "absolute",
                                                                    left: 0,
                                                                    right: 0,
                                                                    top: barHeight - 2,
                                                                    height: 4,
                                                                    background: "#fff",
                                                                    zIndex: 3,
                                                                }} />
                                                            )}
                                                        </>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {/* Removed 'Plan tomorrow' button as requested */}
            </div>

            {/* Right: Actions column */}
            <div className="w-[26rem] md:w-[30rem] shrink-0">
                <div className="sticky top-2">
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 mb-3">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick actions</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {/* Row 1: Category buttons (Tasks left, Activities right) */}
                            <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-medium">
                                <svg
                                    stroke="currentColor"
                                    fill="currentColor"
                                    strokeWidth="0"
                                    viewBox="0 0 448 512"
                                    className="w-4 h-4 text-[#4DC3D8] shrink-0"
                                    aria-hidden="true"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z"></path>
                                </svg>
                                <span>Tasks</span>
                            </button>
                            <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-medium">
                                <svg
                                    stroke="currentColor"
                                    fill="currentColor"
                                    strokeWidth="0"
                                    viewBox="0 0 448 512"
                                    className="w-4 h-4 text-[#4DC3D8] shrink-0"
                                    aria-hidden="true"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"></path>
                                </svg>
                                <span>Activities</span>
                            </button>
                            {/* Row 2: Lists (Tasks list left, Activities list right) */}
                            <div className="w-full max-h-32 overflow-auto rounded border border-slate-200 bg-slate-50 p-2">
                                {dayTodos.length === 0 ? (
                                    <div className="text-[11px] text-slate-500 text-center">No tasks</div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        {dayTodos.map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                className="w-full px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center gap-2 text-left"
                                                title={t.title}
                                                onClick={() => onTaskClick && onTaskClick(String(t.id))}
                                                draggable
                                                onDragStart={(e) => {
                                                    try {
                                                        e.dataTransfer.setData("taskId", String(t.id));
                                                        e.dataTransfer.setData("title", t.title || "");
                                                        e.dataTransfer.setData("description", t.description || "");
                                                        e.dataTransfer.effectAllowed = "copyMove";
                                                    } catch {}
                                                }}
                                            >
                                                <svg
                                                    stroke="currentColor"
                                                    fill="currentColor"
                                                    strokeWidth="0"
                                                    viewBox="0 0 448 512"
                                                    className="w-3.5 h-3.5 text-[#4DC3D8] shrink-0"
                                                    aria-hidden="true"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <path d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z"></path>
                                                </svg>
                                                <span className="truncate">{t.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="w-full max-h-32 overflow-auto rounded border border-slate-200 bg-slate-50 p-2">
                                {dayActivities.length === 0 ? (
                                    <div className="text-[11px] text-slate-500 text-center">No activities</div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        {dayActivities.map((a) => (
                                            <button
                                                key={a.id}
                                                type="button"
                                                className="w-full px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center gap-2 text-left cursor-pointer transition-colors"
                                                title={a.text || a.title}
                                                onClick={() => onActivityClick && onActivityClick(a)}
                                                draggable
                                                onDragStart={(e) => {
                                                    try {
                                                        e.dataTransfer.setData("activityId", String(a.id || ""));
                                                        e.dataTransfer.setData("activityText", String(a.text || a.title || "Activity"));
                                                        e.dataTransfer.effectAllowed = "copyMove";
                                                    } catch {}
                                                }}
                                            >
                                                <svg
                                                    stroke="currentColor"
                                                    fill="currentColor"
                                                    strokeWidth="0"
                                                    viewBox="0 0 448 512"
                                                    className="w-3.5 h-3.5 text-[#4DC3D8] shrink-0"
                                                    aria-hidden="true"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <path d="M432 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zm0-128H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16z"></path>
                                                </svg>
                                                <span className="truncate">{a.text || a.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Row 2: Add buttons (Add task left, Add activity right) */}
                            <button
                                type="button"
                                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm whitespace-nowrap"
                                onClick={() =>
                                    onAddTaskOrActivity &&
                                    onAddTaskOrActivity(currentDate || new Date(), { defaultTab: "task" })
                                }
                            >
                                <FaPlus />
                                <span>Add task</span>
                            </button>
                            <button
                                type="button"
                                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm whitespace-nowrap"
                                onClick={() =>
                                    onAddTaskOrActivity &&
                                    onAddTaskOrActivity(currentDate || new Date(), { defaultTab: "activity" })
                                }
                            >
                                <FaPlus />
                                <span>Add activity</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
