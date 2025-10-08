import React from "react";
import { FaChevronLeft, FaChevronRight, FaChevronDown, FaPlus } from "react-icons/fa";
import { FixedSizeList } from "react-window";
import AvailabilityBlock from "./AvailabilityBlock";

// Business hours display 08:00–17:00
// 17:00 acts as an end-of-day boundary label (non-interactive). Last start slot is 16:30.
const hours = (() => {
    const arr = [];
    for (let h = 8; h <= 16; h++) {
        arr.push(`${h.toString().padStart(2, "0")}:00`);
        arr.push(`${h.toString().padStart(2, "0")}:30`); // includes 16:30
    }
    arr.push("17:00"); // boundary label only
    return arr;
})();

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
    onEventClick,
    onTaskClick,
    onPlanTomorrow,
    onShiftDate,
    onSetDate,
    onQuickCreate,
    onAddTaskOrActivity,
    loading = false,
}) {
    const [showViewMenu, setShowViewMenu] = React.useState(false);
    const today = currentDate || new Date();
    const slotSizeMin = 30;
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
                        {today.toLocaleDateString(undefined, {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                        })}
                        {loading && (
                            <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                                Loading
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
                                const slotEvents = events.filter((ev) => matchesSlot(ev.start, today, h));
                                const isBoundary = h === "17:00"; // non-interactive row
                                return (
                                    <tr key={idx} className={idx % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                                        <td className="border-t border-r border-blue-100 px-2 py-1 text-xs w-24 align-top">
                                            <span>{h}</span>
                                        </td>
                                        <td
                                            className={`border-t border-blue-100 px-2 py-1 align-top ${isBoundary ? "pointer-events-none opacity-60" : ""}`}
                                            style={{ width: "100%" }}
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
                                            })}
                                        >
                                            {slotEvents.length === 0
                                                ? null
                                                : slotEvents.map((ev, i) => {
                                                      const isTaskBox = !!ev.taskId;
                                                      return (
                                                          <div
                                                              key={i}
                                                              className={`px-2 py-1 rounded cursor-pointer flex items-center gap-1 w-full max-w-full overflow-hidden ${
                                                                  isTaskBox
                                                                      ? ""
                                                                      : categories[ev.kind]?.color || "bg-gray-200"
                                                              }`}
                                                              style={
                                                                  isTaskBox ? { backgroundColor: "#7ED4E3" } : undefined
                                                              }
                                                              draggable
                                                              onDragStart={(e) => {
                                                                  try {
                                                                      e.dataTransfer.setData("eventId", String(ev.id));
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
                                                              onClick={() => onEventClick(ev)}
                                                          >
                                                              {!isTaskBox && (
                                                                  <span className="shrink-0">
                                                                      {categories[ev.kind]?.icon || ""}
                                                                  </span>
                                                              )}
                                                              <span className="truncate whitespace-nowrap text-xs min-w-0">
                                                                  {ev.title}
                                                              </span>
                                                          </div>
                                                      );
                                                  })}
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
                                            <div
                                                key={a.id}
                                                className="w-full px-2 py-1 rounded bg-white border border-slate-200 text-xs text-slate-700 flex items-center gap-2"
                                                title={a.text || a.title}
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
                                            </div>
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
