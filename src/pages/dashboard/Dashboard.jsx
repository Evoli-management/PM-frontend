import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../../components/shared/Sidebar";
// Reusable dashboard widgets
import EnpsChart from "../../components/dashboard/widgets/EnpsChart.jsx";
import CalendarPreview from "../../components/dashboard/widgets/CalendarPreview.jsx";
import ActivityFeed from "../../components/dashboard/widgets/ActivityFeed.jsx";
import QuickAddBar from "../../components/dashboard/widgets/QuickAddBar.jsx";
import StrokesPanel from "../../components/dashboard/widgets/StrokesPanel.jsx";
import StatsCard from "../../components/dashboard/widgets/StatsCard.jsx";
import TimeUsagePie from "../../components/dashboard/widgets/TimeUsagePie.jsx";
import WeeklyTrendBars from "../../components/dashboard/widgets/WeeklyTrendBars.jsx";

// Demo data (replace with real services later)
const recentActivity = [
    { desc: "Alice completed task: Design header", time: "2h" },
    { desc: "Bob moved 'Payment' to In Progress", time: "1d" },
    { desc: "New member invited: Carlos", time: "3d" },
];

const initialActiveGoals = [
    { title: "Launch MVP", progress: 72 },
    { title: "Improve onboarding", progress: 40 },
];

const initialCalendarToday = [
    { id: 1, title: "Daily Standup", start: "09:00", end: "09:15" },
    { id: 2, title: "Client Call", start: "11:00", end: "11:45" },
    { id: 3, title: "Focus: API integration", start: "14:00", end: "16:00" },
];

const initialStrokes = {
    received: [{ id: 1, from: "Dana", msg: "Great work on the release!", time: "1d" }],
    given: [{ id: 2, to: "Bob", msg: "Thanks for jumping on the bug fix.", time: "3d" }],
};

function EChart({ data = [], labels = [] }) {
    // responsive SVG chart with axes, grid and tooltip
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);

    const margin = { top: 8, right: 12, bottom: 26, left: 36 };
    const width = 680 - margin.left - margin.right;
    const height = 180 - margin.top - margin.bottom;

    const max = Math.max(...data, 10);
    const min = Math.min(...data, 0);
    const yRange = max - min || 1;

    const coords = data.map((v, i) => {
        const x = (i / Math.max(1, data.length - 1)) * width + margin.left;
        const y = margin.top + (height - ((v - min) / yRange) * height);
        return { x, y, v, i };
    });

    const areaPath = `M${margin.left},${margin.top + height} L ${coords.map((c) => `${c.x},${c.y}`).join(" L ")} L ${margin.left + width},${margin.top + height} Z`;
    const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");

    const yTicks = 4;
    const yTickValues = Array.from({ length: yTicks + 1 }, (_, t) => Math.round(min + (t / yTicks) * yRange));

    function handleMove(e) {
        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const cursor = pt.matrixTransform(svg.getScreenCTM().inverse());
        // find nearest point by x
        const nearest = coords.reduce(
            (best, c) => (Math.abs(c.x - cursor.x) < Math.abs(best.x - cursor.x) ? c : best),
            coords[0],
        );
        setTooltip({ x: nearest.x, y: nearest.y, value: nearest.v, label: labels[nearest.i] || `#${nearest.i + 1}` });
    }

    function handleLeave() {
        setTooltip(null);
    }

    return (
        <div ref={containerRef} className="relative w-full">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`}
                className="w-full h-48 rounded-md"
                onMouseMove={handleMove}
                onMouseLeave={handleLeave}
            >
                <defs>
                    <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* grid lines & y-axis labels */}
                {yTickValues.map((val, idx) => {
                    const y = margin.top + (height - ((val - min) / yRange) * height);
                    return (
                        <g key={idx}>
                            <line
                                x1={margin.left}
                                x2={margin.left + width}
                                y1={y}
                                y2={y}
                                stroke="#e6eefb"
                                strokeWidth={1}
                            />
                            <text x={margin.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                                {val}
                            </text>
                        </g>
                    );
                })}

                {/* x-axis ticks */}
                {coords.map((c, i) => (
                    <g key={i}>
                        <line
                            x1={c.x}
                            x2={c.x}
                            y1={margin.top + height}
                            y2={margin.top + height + 6}
                            stroke="#cde0ff"
                        />
                        <text x={c.x} y={margin.top + height + 18} textAnchor="middle" fontSize="11" fill="#6b7280">
                            {labels[i] || i + 1}
                        </text>
                    </g>
                ))}

                {/* area */}
                <path d={areaPath} fill="url(#g)" stroke="none" />

                {/* line */}
                <polyline
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    points={linePoints}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />

                {/* points */}
                {coords.map((c, i) => (
                    <circle key={i} cx={c.x} cy={c.y} r={3.5} fill="#2563eb" stroke="#fff" strokeWidth={1} />
                ))}
            </svg>

            {tooltip && (
                <div
                    className="absolute bg-[Canvas] shadow rounded px-3 py-2 text-sm text-[CanvasText] z-50 pointer-events-none"
                    style={{
                        left: Math.min(Math.max(tooltip.x - 40, 8), width + margin.left + margin.right - 120),
                        top: tooltip.y - 56,
                    }}
                >
                    <div className="font-semibold">{tooltip.label}</div>
                    <div className="text-xs opacity-70">Value: {tooltip.value}</div>
                </div>
            )}
        </div>
    );
}

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 400);
        return () => clearTimeout(timer);
    }, []);

    const enpsData = [10, 12, 8, 15, 18, 20, 22, 20, 19, 21, 23, 22];

    const defaultPrefs = {
        widgets: {
            quickAdd: true,
            myDay: true,
            goals: true,
            enps: true,
            strokes: true,
            productivity: true,
            calendarPreview: true,
            activity: true,
            suggestions: false,
            teamOverview: false,
            analytics: false,
        },
        theme: "light", // or 'dark'
    };

    const [prefs, setPrefs] = useState(() => {
        try {
            const raw = localStorage.getItem("pm:dashboard:prefs");
            const stored = raw ? JSON.parse(raw) : defaultPrefs;
            // merge to ensure new keys exist
            return {
                ...defaultPrefs,
                ...stored,
                widgets: { ...defaultPrefs.widgets, ...(stored.widgets || {}) },
                // Force light mode regardless of stored value
                theme: "light",
            };
        } catch {
            return defaultPrefs;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem("pm:dashboard:prefs", JSON.stringify(prefs));
        } catch {}
    }, [prefs]);

    // Theme: force light mode (dark disabled)
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("dark");
    }, [prefs.theme]);

    const toggleWidget = (key) => {
        setPrefs((p) => ({ ...p, widgets: { ...p.widgets, [key]: !p.widgets[key] } }));
    };
    // Dark mode disabled; keep theme as light while retaining the button UI
    const toggleTheme = () => setPrefs((p) => (p.theme !== "light" ? { ...p, theme: "light" } : p));

    // Close Widgets dropdown on outside click / Escape
    const widgetsDetailsRef = useRef(null);
    useEffect(() => {
        function handlePointerDown(e) {
            const el = widgetsDetailsRef.current;
            if (el && el.open && !el.contains(e.target)) {
                el.open = false;
            }
        }
        function handleKey(e) {
            if (e.key === "Escape") {
                const el = widgetsDetailsRef.current;
                if (el && el.open) el.open = false;
            }
        }
        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKey);
        };
    }, []);

    // Data state
    const [activeGoals, setActiveGoals] = useState(initialActiveGoals);
    const [calendarToday, setCalendarToday] = useState(() => {
        // restore order if any
        try {
            const orderRaw = localStorage.getItem("pm:calendarPreviewOrder");
            const order = orderRaw ? JSON.parse(orderRaw) : null;
            if (Array.isArray(order) && order.length) {
                const byId = Object.fromEntries(initialCalendarToday.map((e) => [e.id, e]));
                return order.map((id) => byId[id]).filter(Boolean);
            }
        } catch {}
        return initialCalendarToday;
    });
    const [strokes, setStrokes] = useState(initialStrokes);

    // Quick Add state
    const [quickAddOpen, setQuickAddOpen] = useState(null); // 'task'|'goal'|'stroke'|'note'|'appointment'
    const [message, setMessage] = useState("");
    function doQuickAdd(type) {
        setMessage(`Added ${type}`);
        setTimeout(() => setMessage(""), 2500);
        setQuickAddOpen(null);
    }

    // Onboarding tip (simple walkthrough entry)
    const [showTip, setShowTip] = useState(() => {
        try {
            return localStorage.getItem("pm:dashboard:seenTip") !== "1";
        } catch {
            return true;
        }
    });
    const dismissTip = () => {
        setShowTip(false);
        try {
            localStorage.setItem("pm:dashboard:seenTip", "1");
        } catch {}
    };

    // Helpers
    const avgGoal = activeGoals.length
        ? Math.round(activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length)
        : 0;
    const myDayStats = { tasksDueToday: 3, overdue: 1, appointments: calendarToday.length };
    const productivity = { productive: 24, trap: 6 };
    const [prodTrend, setProdTrend] = useState([6, 7, 6, 8, 7, 9, 8]);
    const [analyticsPeriod, setAnalyticsPeriod] = useState("Week"); // Week | Month
    const [analyticsCompare, setAnalyticsCompare] = useState("None"); // None | Previous

    // Activity filter + drill modal
    const [activityFilter, setActivityFilter] = useState("all"); // all|tasks|goals|recognitions
    const [drillItem, setDrillItem] = useState(null);

    // Drag-and-drop for calendar preview
    const dragIdxRef = useRef(null);
    function onDragStart(i) {
        dragIdxRef.current = i;
    }
    function onDragOver(e) {
        e.preventDefault();
    }
    function onDrop(i) {
        const from = dragIdxRef.current;
        if (from == null || from === i) return;
        setCalendarToday((list) => {
            const next = [...list];
            const [moved] = next.splice(from, 1);
            next.splice(i, 0, moved);
            try {
                localStorage.setItem("pm:calendarPreviewOrder", JSON.stringify(next.map((e) => e.id)));
            } catch {}
            return next;
        });
        dragIdxRef.current = null;
    }

    // Calendar countdown badges
    function toTodayDate(hhmm) {
        const [h, m] = String(hhmm)
            .split(":")
            .map((x) => parseInt(x, 10) || 0);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
    }
    function formatDiff(mins) {
        const m = Math.max(0, Math.round(mins));
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        const rm = m % 60;
        return rm ? `${h}h ${rm}m` : `${h}h`;
    }
    function getCountdownBadge(ev) {
        const now = new Date();
        const start = toTodayDate(ev.start);
        const end = toTodayDate(ev.end);
        if (now < start) {
            const mins = (start - now) / 60000;
            const urgent = mins <= 60;
            return {
                text: `in ${formatDiff(mins)}`,
                className: urgent
                    ? "border border-yellow-400/40 text-yellow-700 bg-[Canvas]"
                    : "border border-[CanvasText]/20 text-[CanvasText] bg-[Canvas]",
            };
        }
        if (now >= start && now <= end) {
            return { text: "now", className: "border border-green-500/40 text-green-700 bg-[Canvas]" };
        }
        const minsAgo = (now - end) / 60000;
        return {
            text: `${formatDiff(minsAgo)} ago`,
            className: "border border-[CanvasText]/20 text-[CanvasText] bg-[Canvas]",
        };
    }

    // Simple CSV export helper for client-side downloads
    function exportCsv(filename, rows) {
        try {
            const csv = Array.isArray(rows) ? rows.map((r) => r.join(",")).join("\n") : String(rows);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch {}
    }

    return (
        <div className="flex min-h-screen bg-[Canvas]">
            <Sidebar user={{ name: "Hussein" }} />
            <main className="flex-1 p-4 md:p-8 text-[CanvasText]">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div></div>
                    {/* Widget toggles dropdown on the right */}
                    <div className="relative ml-auto">
                        <details ref={widgetsDetailsRef} className="relative">
                            <summary className="px-3 py-1 bg-[Canvas] border rounded cursor-pointer text-[CanvasText]">
                                Widgets
                            </summary>
                            <div className="absolute right-0 mt-2 w-64 bg-[Canvas] border rounded shadow p-3 z-40 max-h-80 overflow-auto text-[CanvasText]">
                                {Object.keys(prefs.widgets).map((k) => (
                                    <label
                                        key={k}
                                        className="flex items-center justify-between gap-2 mb-2 text-sm text-[CanvasText] opacity-90"
                                    >
                                        <span className="capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                                        <input
                                            type="checkbox"
                                            checked={prefs.widgets[k]}
                                            onChange={() => toggleWidget(k)}
                                        />
                                    </label>
                                ))}
                            </div>
                        </details>
                    </div>
                </div>

                {/* Onboarding tip */}
                {showTip && (
                    <div className="mb-4 p-3 rounded border bg-blue-50 text-blue-900 flex items-center gap-3 dark:bg-blue-900/20 dark:text-blue-200">
                        <span>New here? Take a 30-second tour of your dashboard.</span>
                        <button
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                            onClick={() => setMessage("Tour is coming soon")}
                        >
                            Start Tour
                        </button>
                        <button className="ml-auto text-sm underline" onClick={dismissTip}>
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Top Section: Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
                    {prefs.widgets.myDay && (
                        <StatsCard
                            title="My Day"
                            tooltip="Your daily schedule: appointments and tasks"
                            href="#/calendar"
                        >
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                {myDayStats.tasksDueToday} tasks
                            </div>
                            <div className="text-xs text-[CanvasText] opacity-80">
                                {myDayStats.overdue} overdue • {myDayStats.appointments} appointments
                            </div>
                        </StatsCard>
                    )}

                    {prefs.widgets.goals && (
                        <StatsCard
                            title="Goals Progress"
                            tooltip="Average progress across your active goals"
                            href="#/goals"
                        >
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{avgGoal}%</div>
                            <div className="mt-2 bg-gray-100 dark:bg-neutral-700 rounded h-2 overflow-hidden">
                                <div className="h-2 bg-blue-500" style={{ width: `${avgGoal}%` }} />
                            </div>
                        </StatsCard>
                    )}

                    {prefs.widgets.enps && (
                        <StatsCard title="eNPS" tooltip="Employee Net Promoter Score (−100..+100)" href="#/enps">
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">0</div>
                            <div className="text-xs text-[CanvasText] opacity-80">Survey status: up to date</div>
                        </StatsCard>
                    )}

                    {prefs.widgets.strokes && (
                        <StatsCard title="Strokes" tooltip="Recognition received and given" href="#/recognition">
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                {strokes.received.length}
                            </div>
                            <div className="text-xs text-[CanvasText] opacity-80">
                                received • {strokes.given.length} given
                            </div>
                        </StatsCard>
                    )}

                    {prefs.widgets.productivity && (
                        <StatsCard
                            title="Productivity"
                            tooltip="Hours logged this week: productive vs trap"
                            href="#/analytics"
                        >
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                {productivity.productive}h
                            </div>
                            <div className="text-xs text-[CanvasText] opacity-80">
                                productive • {productivity.trap}h trap
                            </div>
                            <div className="mt-2 w-full h-2 bg-gray-100 dark:bg-neutral-700 rounded overflow-hidden flex">
                                {(() => {
                                    const total = productivity.productive + productivity.trap || 1;
                                    const prodW = (productivity.productive / total) * 100;
                                    const trapW = (productivity.trap / total) * 100;
                                    return (
                                        <>
                                            <div className="h-2 bg-green-500" style={{ width: `${prodW}%` }} />
                                            <div className="h-2 bg-red-500" style={{ width: `${trapW}%` }} />
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="mt-2">
                                {(() => {
                                    const data = prodTrend;
                                    const W = 120;
                                    const H = 28;
                                    const max = 10;
                                    const pts = data
                                        .map((v, i) => {
                                            const x = (i / Math.max(1, data.length - 1)) * W;
                                            const y = H - (Math.min(max, Math.max(0, v)) / max) * H;
                                            return `${x},${y}`;
                                        })
                                        .join(" ");
                                    return (
                                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-7">
                                            <polyline
                                                fill="none"
                                                stroke="#22c55e"
                                                strokeWidth="2"
                                                strokeLinejoin="round"
                                                strokeLinecap="round"
                                                points={pts}
                                            />
                                        </svg>
                                    );
                                })()}
                            </div>
                            <div className="mt-2 flex justify-end gap-2">
                                <button
                                    className="px-2 py-1 border rounded text-xs"
                                    title="Export productivity summary"
                                    onClick={() => {
                                        const total = productivity.productive + productivity.trap;
                                        const pct = total ? (productivity.productive / total) * 100 : 0;
                                        exportCsv("productivity-summary.csv", [
                                            ["Metric", "Value"],
                                            ["Productive (h)", productivity.productive],
                                            ["Trap (h)", productivity.trap],
                                            ["Total (h)", total],
                                            ["Productive (%)", pct.toFixed(1)],
                                        ]);
                                    }}
                                >
                                    Export summary
                                </button>
                                <button
                                    className="px-2 py-1 border rounded text-xs"
                                    title="Export productivity trend"
                                    onClick={() => {
                                        const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                                        const rows = [
                                            ["Label", "Hours"],
                                            ...prodTrend.map((v, i) => [labels[i] || `P${i + 1}`, v]),
                                        ];
                                        exportCsv("productivity-trend.csv", rows);
                                    }}
                                >
                                    Export trend
                                </button>
                            </div>
                        </StatsCard>
                    )}
                </div>

                {/* Middle Section */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* eNPS detailed snapshot */}
                    {prefs.widgets.enps && (
                        <section className="bg-[Canvas] rounded-2xl shadow p-6 border text-[CanvasText]">
                            <div className="flex items-start justify-between">
                                <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-2">
                                    eNPS Snapshot
                                </h2>
                                <div className="text-xs text-[CanvasText] opacity-60 flex items-center gap-2">
                                    <span title="eNPS measures employee net promoter score; range -100 to +100">
                                        ℹ️
                                    </span>
                                    <button
                                        className="px-2 py-1 border rounded text-[CanvasText]"
                                        title="Export eNPS report"
                                        onClick={() =>
                                            exportCsv("enps-report.csv", [
                                                ["Week", "Score"],
                                                ...enpsData.map((v, i) => ["W" + (i + 1), v]),
                                            ])
                                        }
                                    >
                                        Export
                                    </button>
                                </div>
                            </div>
                            <a href="#/enps">
                                <EnpsChart data={enpsData} labels={enpsData.map((_, i) => `W${i + 1}`)} />
                            </a>
                        </section>
                    )}

                    {/* Goals list */}
                    {prefs.widgets.goals && (
                        <section className="bg-[Canvas] rounded-2xl shadow p-6 border text-[CanvasText]">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-4">
                                    Your active goals
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="px-2 py-1 border rounded text-sm"
                                        title="Export goals"
                                        onClick={() => {
                                            const header = ["Title", "Progress (%)", "Status", "Last updated"];
                                            const toStatus = (p) =>
                                                p >= 70 ? "On track" : p >= 40 ? "At risk" : "Behind";
                                            const now = new Date().toISOString();
                                            const rows = [
                                                header,
                                                ...activeGoals.map((g) => [
                                                    g.title,
                                                    g.progress,
                                                    toStatus(g.progress),
                                                    now,
                                                ]),
                                            ];
                                            exportCsv("goals-export.csv", rows);
                                        }}
                                    >
                                        Export
                                    </button>
                                    <a href="#/goals" className="text-sm text-blue-600">
                                        View all
                                    </a>
                                </div>
                            </div>
                            {activeGoals.length === 0 ? (
                                <div className="text-[CanvasText] opacity-70">
                                    No goals yet.{" "}
                                    <a href="#/goals" className="text-blue-600">
                                        Add one
                                    </a>
                                    !
                                </div>
                            ) : (
                                <ul className="space-y-4">
                                    {activeGoals.map((g, i) => (
                                        <li key={i} className="p-3 border rounded">
                                            <div className="flex justify-between items-center">
                                                <div className="font-semibold">{g.title}</div>
                                                <div className="text-sm opacity-70">{g.progress}%</div>
                                            </div>
                                            <div className="mt-2 bg-gray-100 dark:bg-neutral-700 rounded h-2 overflow-hidden">
                                                <div className="h-2 bg-blue-500" style={{ width: `${g.progress}%` }} />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* Calendar Preview with drag-and-drop */}
                    {prefs.widgets.calendarPreview && (
                        <section className="bg-[Canvas] rounded-2xl shadow p-6 border text-[CanvasText]">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400">
                                    Calendar Preview (Today)
                                </h2>
                                <a href="#/calendar" className="text-sm text-blue-600">
                                    Open Calendar
                                </a>
                            </div>
                            {calendarToday.length === 0 ? (
                                <div className="text-[CanvasText] opacity-70">
                                    No appointments today.{" "}
                                    <a href="#/calendar" className="text-blue-600">
                                        Add appointment
                                    </a>
                                    .
                                </div>
                            ) : (
                                <CalendarPreview
                                    events={calendarToday}
                                    onReorder={(next) => {
                                        setCalendarToday(next);
                                        try {
                                            localStorage.setItem(
                                                "pm:calendarPreviewOrder",
                                                JSON.stringify(next.map((e) => e.id)),
                                            );
                                        } catch {}
                                    }}
                                    getCountdownBadge={getCountdownBadge}
                                />
                            )}
                        </section>
                    )}

                    {/* What’s New Feed */}
                    {prefs.widgets.activity && (
                        <section className="bg-[Canvas] rounded-2xl shadow p-6 border text-[CanvasText]">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400">What’s New</h2>
                                <div className="flex items-center gap-2">
                                    <select
                                        className="border rounded text-sm bg-[Canvas]"
                                        value={activityFilter}
                                        onChange={(e) => setActivityFilter(e.target.value)}
                                        title="Filter feed"
                                    >
                                        <option value="all">All</option>
                                        <option value="tasks">Tasks</option>
                                        <option value="goals">Goals</option>
                                        <option value="recognitions">Recognitions</option>
                                    </select>
                                    <a href="#/notifications" className="text-sm text-blue-600">
                                        Open Feed
                                    </a>
                                </div>
                            </div>
                            <ActivityFeed
                                items={recentActivity.filter((it) => {
                                    if (activityFilter === "all") return true;
                                    if (activityFilter === "recognitions") return /stroke|recognition/i.test(it.desc);
                                    if (activityFilter === "goals") return /goal/i.test(it.desc);
                                    if (activityFilter === "tasks") return /task|moved/i.test(it.desc);
                                    return true;
                                })}
                                onItemClick={(it) => setDrillItem(it)}
                            />
                        </section>
                    )}
                </div>

                {/* Quick Add full-width row */}
                {prefs.widgets.quickAdd && <QuickAddBar onOpen={(t) => setQuickAddOpen(t)} message={message} />}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* Strokes detail */}
                    {prefs.widgets.strokes && (
                        <section className="bg-[Canvas] rounded-2xl shadow p-6 border text-[CanvasText]">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400">Strokes</h2>
                            </div>
                            <StrokesPanel strokes={strokes} />
                        </section>
                    )}

                    {/* Suggestions */}
                    {prefs.widgets.suggestions && (
                        <section className="bg-[Canvas] rounded-2xl shadow p-6 border text-[CanvasText]">
                            <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-2">Suggestions</h2>
                            <ul className="list-disc pl-6 text-sm text-[CanvasText] opacity-80">
                                <li>Recommend goal: "Automate weekly reporting" (template)</li>
                                <li>Next best action: Finish API tests before lunch</li>
                                <li>Insight: You’re most productive in the morning (9–12)</li>
                            </ul>
                            {/* Reserved for AI-related guidance */}
                        </section>
                    )}
                </div>

                {/* Manager/Analytics area — always visible */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {prefs.widgets.teamOverview && (
                        <section className="bg-[Canvas] rounded-2xl shadow p-6 border text-[CanvasText]">
                            <h3 className="text-lg font-bold mb-3 text-blue-700 dark:text-blue-400">
                                Team Performance Overview
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="p-3 border rounded">Team goals completion: 68%</div>
                                <div className="p-3 border rounded">Avg workload: 32h/week</div>
                                <div className="p-3 border rounded">eNPS trend: steady ↑</div>
                                <div className="p-3 border rounded">Strokes leaderboard: Dana (5)</div>
                            </div>
                            <div className="mt-3 flex justify-end">
                                <button
                                    className="px-3 py-1 border rounded text-sm"
                                    title="Export team report"
                                    onClick={() =>
                                        exportCsv("team-overview.csv", [
                                            ["Metric", "Value"],
                                            ["Team goals completion", "68%"],
                                            ["Avg workload", "32h/week"],
                                            ["eNPS trend", "steady"],
                                            ["Top recognitions", "Dana (5)"],
                                        ])
                                    }
                                >
                                    Export report
                                </button>
                            </div>
                        </section>
                    )}

                    {prefs.widgets.analytics && (
                        <section className="bg-[Canvas] rounded-2xl shadow p-6 border text-[CanvasText]">
                            <h3 className="text-lg font-bold mb-3 text-blue-700 dark:text-blue-400">Analytics</h3>
                            <div className="mb-3 flex items-center gap-2 text-sm">
                                <span className="opacity-70">Period:</span>
                                <select
                                    className="border rounded bg-[Canvas]"
                                    value={analyticsPeriod}
                                    onChange={(e) => setAnalyticsPeriod(e.target.value)}
                                >
                                    <option value="Week">Week</option>
                                    <option value="Month">Month</option>
                                </select>
                                <span className="opacity-70 ml-3">Compare to:</span>
                                <select
                                    className="border rounded bg-[Canvas]"
                                    value={analyticsCompare}
                                    onChange={(e) => setAnalyticsCompare(e.target.value)}
                                >
                                    <option value="None">None</option>
                                    <option value="Previous">Previous</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Time usage pie (Goals vs Trap) */}
                                <div className="p-3 border rounded">
                                    <div className="font-semibold text-sm mb-2">Time usage</div>
                                    <TimeUsagePie productive={productivity.productive} trap={productivity.trap} />
                                </div>
                                {/* Weekly trend bars */}
                                <div className="p-3 border rounded">
                                    <div className="font-semibold text-sm mb-2">Weekly trend</div>
                                    {(() => {
                                        const values =
                                            analyticsPeriod === "Week" ? [8, 6, 7, 5, 9, 4, 3] : [35, 42, 38, 44];
                                        const compareValues =
                                            analyticsCompare === "Previous"
                                                ? analyticsPeriod === "Week"
                                                    ? [6, 5, 6, 4, 7, 3, 2]
                                                    : [32, 39, 36, 40]
                                                : [];
                                        return <WeeklyTrendBars values={values} compareValues={compareValues} />;
                                    })()}
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                {/* Footer note intentionally left blank */}

                {/* Quick Add inline form area */}
                {quickAddOpen && (
                    <div className="fixed left-1/2 -translate-x-1/2 bottom-8 z-50 w-96 bg-[Canvas] border rounded shadow p-4 text-[CanvasText]">
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold">Quick Add — {quickAddOpen}</div>
                            <button
                                onClick={() => setQuickAddOpen(null)}
                                className="text-xs text-[CanvasText] opacity-60"
                            >
                                Close
                            </button>
                        </div>
                        <input
                            className="w-full border rounded p-2 mb-2 bg-[Canvas]"
                            placeholder={`Enter ${quickAddOpen} title`}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setQuickAddOpen(null)} className="px-3 py-1 border rounded text-sm">
                                Cancel
                            </button>
                            <button
                                onClick={() => doQuickAdd(quickAddOpen)}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                )}

                {/* Drill-in modal for Activity */}
                {drillItem && (
                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                        <div className="bg-[Canvas] text-[CanvasText] border rounded shadow p-4 w-[28rem]">
                            <div className="flex items-center justify-between mb-2">
                                <div className="font-semibold">Activity details</div>
                                <button className="text-sm opacity-60" onClick={() => setDrillItem(null)}>
                                    Close
                                </button>
                            </div>
                            <div className="text-sm">
                                <div className="font-medium mb-1">{drillItem.desc}</div>
                                <div className="opacity-70">When: {drillItem.time} • Source: system</div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
