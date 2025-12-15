import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { FaChevronLeft, FaChevronRight, FaChevronDown } from "react-icons/fa";
import { useCalendarPreferences } from "../../hooks/useCalendarPreferences";

const ListView = ({
    currentDate,
    onShiftDate,
    events = [],
    todos = [],
    onEventClick,
    onTaskClick,
    view,
    onChangeView,
    filterType,
    onChangeFilter,
}) => {
    const { formatDate, formatTime } = useCalendarPreferences();
    const label = formatDate(new Date(currentDate || Date.now()), { longMonth: true });
    const [showViewMenu, setShowViewMenu] = useState(false);
    const [keyAreasMap, setKeyAreasMap] = useState({});
    const navigate = useNavigate();

    // Load key areas once so we can reflect their colors for tasks
    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const mod = await import('../../services/keyAreaService');
                const svc = mod && (mod.default || mod);
                let list = [];
                try {
                    list = svc && typeof svc.list === 'function' ? await svc.list({ includeTaskCount: false }) : [];
                } catch (e) {
                    list = [];
                }
                if (!mounted) return;
                const map = (list || []).reduce((acc, k) => { acc[String(k.id)] = k; return acc; }, {});
                setKeyAreasMap(map);
            } catch (e) {
                // ignore
            }
        })();
        return () => { mounted = false; };
    }, []);

    // Build a combined list: events from BE + tasks (todos) that fall in the current range
    const showTasks = filterType === "all" || filterType === "task";
    const items = [
        // map events to items
        ...events.map((e) => ({
            type: "event",
            id: e.id,
            title: e.title,
            start: new Date(e.start),
            end: e.end ? new Date(e.end) : null,
            kind: e.kind,
            taskId: e.taskId,
            data: e,
        })),
        // map tasks (todos) to items
        ...(showTasks ? todos : []).map((t) => {
            const s = t.startDate ? new Date(t.startDate) : null;
            const d = t.dueDate ? new Date(t.dueDate) : null;
            const e = t.endDate ? new Date(t.endDate) : null;
            // choose a representative date for sorting/display: prefer startDate, then dueDate, then endDate
            const rep = s || d || e || null;
            return {
                type: "task",
                id: t.id,
                title: t.title,
                start: rep,
                end: null,
                data: t,
            };
        }),
    ]
        .filter((it) => it.start instanceof Date && !isNaN(it.start))
        .sort((a, b) => a.start - b.start);

    if (!items.length) {
        return (
            <>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {/* Back first, then View dropdown */}
                        <button
                            className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                            style={{ minWidth: 36, minHeight: 36 }}
                            aria-label="Previous period"
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
                    <h2 className="text-xl font-bold">{label}</h2>
                    <div className="flex items-center gap-2">
                        <button
                            className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                            style={{ minWidth: 36, minHeight: 36 }}
                            aria-label="Next period"
                            onClick={() => onShiftDate && onShiftDate(1)}
                        >
                            <FaChevronRight />
                        </button>
                    </div>
                </div>
                <div className="text-center text-gray-400 py-8">No items in this period.</div>
            </>
        );
    }
    return (
        <>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {/* Back first, then View dropdown */}
                    <button
                        className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                        style={{ minWidth: 36, minHeight: 36 }}
                        aria-label="Previous period"
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
                <h2 className="text-xl font-bold">{label}</h2>
                <div className="flex items-center gap-2">
                    <button
                        className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                        style={{ minWidth: 36, minHeight: 36 }}
                        aria-label="Next period"
                        onClick={() => onShiftDate && onShiftDate(1)}
                    >
                        <FaChevronRight />
                    </button>
                </div>
            </div>
            <div className="space-y-3">
                {items.map((it) => (
                    <div
                        key={`${it.type}-${it.id}`}
                        className="bg-white rounded-lg border border-blue-100 p-3 flex flex-col md:flex-row md:items-center gap-2 cursor-pointer hover:bg-blue-50"
                        onClick={() => {
                            // If this is a task that belongs to a Key Area, navigate to that Key Area view
                            if (it.type === 'task') {
                                const kaId = it.data?.key_area_id || it.data?.keyAreaId || it.data?.key_area || it.data?.keyArea || null;
                                if (kaId) {
                                    try {
                                        navigate({ pathname: '/key-areas', search: `?ka=${kaId}&openKA=1&task=${it.id}` });
                                    } catch (_) {}
                                    return;
                                }
                                // If task has no Key Area, treat it as a Don't Forget item and show the DontForget task list
                                try {
                                    // Navigate to DontForget list view but do NOT open the task full view
                                    navigate(`/tasks?dontforget=1`);
                                } catch (_) {
                                    // Fallback: do not open the full task view here
                                    return;
                                }
                                return;
                            }
                            // Events preserve existing behavior
                            if (it.type === 'event') {
                                if (it.taskId && onTaskClick) return onTaskClick(String(it.taskId));
                                return onEventClick && onEventClick(it.data);
                            }
                        }}
                        title={it.title}
                    >
                        <div className="w-36 text-xs text-blue-700 font-semibold">
                            {formatDate(it.start, { includeWeekday: true })}
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-slate-800 flex items-center gap-2">
                                {it.type === "event" && <span>Event:</span>}
                                {it.type === "task" && (() => {
                                    const kaId = it.data?.key_area_id || it.data?.keyAreaId || it.data?.key_area || it.data?.keyArea || null;
                                    if (kaId) {
                                        const ka = keyAreasMap[String(kaId)];
                                        const color = (ka && ka.color) || '#4DC3D8';
                                        return (
                                            <button
                                                type="button"
                                                aria-label={`Open Key Area ${ka?.title || ''}`}
                                                className="p-0 m-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // navigate to Key Areas page and open the specific KA/task
                                                    try {
                                                        navigate({ pathname: '/key-areas', search: `?ka=${kaId}&openKA=1&task=${it.id}` });
                                                    } catch (err) {}
                                                }}
                                                style={{ lineHeight: 0 }}
                                            >
                                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" style={{ color }}>
                                                    <path d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z"></path>
                                                </svg>
                                            </button>
                                        );
                                    }
                                    return (
                                        <svg
                                            stroke="currentColor"
                                            fill="currentColor"
                                            strokeWidth="0"
                                            viewBox="0 0 448 512"
                                            className="w-4 h-4 text-[#4DC3D8]"
                                            aria-hidden="true"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z"></path>
                                        </svg>
                                    );
                                })()}
                                <span className="text-blue-700">{it.title}</span>
                            </div>
                            {it.type === "event" && (
                                <div className="text-xs text-gray-500">
                                    {formatTime(`${String(it.start.getHours()).padStart(2,'0')}:${String(it.start.getMinutes()).padStart(2,'0')}`)}
                                    {it.end ? ` - ${formatTime(`${String(it.end.getHours()).padStart(2,'0')}:${String(it.end.getMinutes()).padStart(2,'0')}`)}` : ""}
                                </div>
                            )}
                        </div>
                        <div
                            className="text-[10px] px-2 py-1 rounded border"
                            style={
                                it.type === "task"
                                    ? { backgroundColor: "#E6F7FA", color: "#0B4A53", borderColor: "#7ED4E3" }
                                    : { backgroundColor: "#EFF6FF", color: "#1D4ED8", borderColor: "#BFDBFE" }
                            }
                        >
                            {it.type === "task" ? "Task" : it.kind || "Event"}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
};

export default ListView;
