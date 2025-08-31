import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../../components/shared/Sidebar";

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
                    className="absolute bg-white shadow rounded px-3 py-2 text-sm text-gray-700 z-50 pointer-events-none"
                    style={{
                        left: Math.min(Math.max(tooltip.x - 40, 8), width + margin.left + margin.right - 120),
                        top: tooltip.y - 56,
                    }}
                >
                    <div className="font-semibold">{tooltip.label}</div>
                    <div className="text-xs text-gray-500">Value: {tooltip.value}</div>
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
        view: "employee",
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

    // Theme
    useEffect(() => {
        const root = document.documentElement;
        if (prefs.theme === "dark") root.classList.add("dark");
        else root.classList.remove("dark");
    }, [prefs.theme]);

    const toggleWidget = (key) => {
        setPrefs((p) => ({ ...p, widgets: { ...p.widgets, [key]: !p.widgets[key] } }));
    };
    const setView = (v) => setPrefs((p) => ({ ...p, view: v }));
    const toggleTheme = () => setPrefs((p) => ({ ...p, theme: p.theme === "light" ? "dark" : "light" }));

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
        setMessage(`Added ${type} (demo)`);
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
    const productivity = { productive: 24, trap: 6 }; // hours this week (demo)

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
                className: urgent ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700",
            };
        }
        if (now >= start && now <= end) {
            return { text: "now", className: "bg-green-100 text-green-800" };
        }
        const minsAgo = (now - end) / 60000;
        return { text: `${formatDiff(minsAgo)} ago`, className: "bg-gray-100 text-gray-700" };
    }

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-neutral-900">
            <Sidebar user={{ name: "Hussein" }} />
            <main className="flex-1 p-4 md:p-8">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400">Dashboard</h1>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">Your daily habit entry point.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View toggle */}
                        <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 border rounded p-1">
                            <button
                                onClick={() => setView("employee")}
                                className={`px-3 py-1 rounded ${prefs.view === "employee" ? "bg-blue-600 text-white" : "text-slate-700 dark:text-slate-200"}`}
                            >
                                Employee
                            </button>
                            <button
                                onClick={() => setView("manager")}
                                className={`px-3 py-1 rounded ${prefs.view === "manager" ? "bg-blue-600 text-white" : "text-slate-700 dark:text-slate-200"}`}
                            >
                                Manager
                            </button>
                        </div>

                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            className="px-3 py-1 bg-white dark:bg-neutral-800 border rounded"
                            title="Toggle theme"
                        >
                            {prefs.theme === "light" ? "🌞 Light" : "🌙 Dark"}
                        </button>

                        {/* Widget toggles dropdown */}
                        <div className="relative">
                            <details className="relative">
                                <summary className="px-3 py-1 bg-white dark:bg-neutral-800 border rounded cursor-pointer">
                                    Widgets
                                </summary>
                                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-800 border rounded shadow p-3 z-40 max-h-80 overflow-auto">
                                    {Object.keys(prefs.widgets).map((k) => (
                                        <label
                                            key={k}
                                            className="flex items-center justify-between gap-2 mb-2 text-sm text-slate-700 dark:text-slate-200"
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
                </div>

                {/* Onboarding tip */}
                {showTip && (
                    <div className="mb-4 p-3 rounded border bg-blue-50 text-blue-900 flex items-center gap-3 dark:bg-blue-900/20 dark:text-blue-200">
                        <span>New here? Take a 30-second tour of your dashboard.</span>
                        <button
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                            onClick={() => setMessage("Tour is coming soon (demo)")}
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
                        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-4 border">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">My Day</div>
                                <span
                                    className="text-xs text-gray-400"
                                    title="Your daily schedule: appointments and tasks"
                                >
                                    ℹ️
                                </span>
                            </div>
                            <a href="#/calendar" className="block">
                                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                    {myDayStats.tasksDueToday} tasks
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-300">
                                    {myDayStats.overdue} overdue • {myDayStats.appointments} appointments
                                </div>
                            </a>
                        </div>
                    )}

                    {prefs.widgets.goals && (
                        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-4 border">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    Goals Progress
                                </div>
                                <span
                                    className="text-xs text-gray-400"
                                    title="Average progress across your active goals"
                                >
                                    ℹ️
                                </span>
                            </div>
                            <a href="#/goals" className="block">
                                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{avgGoal}%</div>
                                <div className="mt-2 bg-gray-100 dark:bg-neutral-700 rounded h-2 overflow-hidden">
                                    <div className="h-2 bg-blue-500" style={{ width: `${avgGoal}%` }} />
                                </div>
                            </a>
                        </div>
                    )}

                    {prefs.widgets.enps && (
                        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-4 border">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">eNPS</div>
                                <span
                                    className="text-xs text-gray-400"
                                    title="Employee Net Promoter Score (−100..+100)"
                                >
                                    ℹ️
                                </span>
                            </div>
                            <a href="#/enps" className="block">
                                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">0</div>
                                <div className="text-xs text-gray-500 dark:text-gray-300">
                                    Survey status: up to date
                                </div>
                            </a>
                        </div>
                    )}

                    {prefs.widgets.strokes && (
                        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-4 border">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Strokes</div>
                                <span className="text-xs text-gray-400" title="Recognition received and given">
                                    ℹ️
                                </span>
                            </div>
                            <a href="#/recognition" className="block">
                                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                    {strokes.received.length}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-300">
                                    received • {strokes.given.length} given
                                </div>
                            </a>
                        </div>
                    )}

                    {prefs.widgets.productivity && (
                        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-4 border">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    Productivity
                                </div>
                                <span
                                    className="text-xs text-gray-400"
                                    title="Hours logged this week: productive vs trap"
                                >
                                    ℹ️
                                </span>
                            </div>
                            <a href="#/analytics" className="block">
                                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                    {productivity.productive}h
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-300">
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
                            </a>
                        </div>
                    )}
                </div>

                {/* Middle Section */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* eNPS detailed snapshot */}
                    {prefs.widgets.enps && (
                        <section className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6 border">
                            <div className="flex items-start justify-between">
                                <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-2">
                                    eNPS Snapshot
                                </h2>
                                <div className="text-xs text-gray-400 flex items-center gap-2">
                                    <span title="eNPS measures employee net promoter score; range -100 to +100">
                                        ℹ️
                                    </span>
                                </div>
                            </div>
                            <a href="#/enps">
                                <EChart data={enpsData} labels={enpsData.map((_, i) => `W${i + 1}`)} />
                            </a>
                        </section>
                    )}

                    {/* Goals list */}
                    {prefs.widgets.goals && (
                        <section className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6 border">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-4">
                                    Your active goals
                                </h2>
                                <a href="#/goals" className="text-sm text-blue-600">
                                    View all
                                </a>
                            </div>
                            {activeGoals.length === 0 ? (
                                <div className="text-gray-400">
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
                                                <div className="font-semibold text-gray-700 dark:text-slate-200">
                                                    {g.title}
                                                </div>
                                                <div className="text-sm text-gray-400">{g.progress}%</div>
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
                        <section className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6 border">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400">
                                    Calendar Preview (Today)
                                </h2>
                                <a href="#/calendar" className="text-sm text-blue-600">
                                    Open Calendar
                                </a>
                            </div>
                            {calendarToday.length === 0 ? (
                                <div className="text-gray-400">
                                    No appointments today.{" "}
                                    <a href="#/calendar" className="text-blue-600">
                                        Add appointment
                                    </a>
                                    .
                                </div>
                            ) : (
                                <ul className="divide-y">
                                    {calendarToday.map((ev, i) => (
                                        <li
                                            key={ev.id}
                                            className="py-3 flex items-center gap-3"
                                            draggable
                                            onDragStart={() => onDragStart(i)}
                                            onDragOver={onDragOver}
                                            onDrop={() => onDrop(i)}
                                            title={`${ev.title} • ${ev.start}–${ev.end}`}
                                        >
                                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                {ev.start}
                                            </span>
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-800 dark:text-slate-200">
                                                    {ev.title}
                                                </div>
                                                <div className="text-xs text-gray-400">ends {ev.end}</div>
                                            </div>
                                            {(() => {
                                                const b = getCountdownBadge(ev);
                                                return (
                                                    <span
                                                        className={`text-xs px-2 py-1 rounded ${b.className}`}
                                                        title="Time until start/end"
                                                    >
                                                        {b.text}
                                                    </span>
                                                );
                                            })()}
                                            <span className="cursor-grab text-gray-400" title="Drag to reprioritize">
                                                ⋮⋮
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}

                    {/* What's New Feed */}
                    {prefs.widgets.activity && (
                        <section className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6 border">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400">What’s New</h2>
                                <a href="#/notifications" className="text-sm text-blue-600">
                                    Open Feed
                                </a>
                            </div>
                            <ul className="space-y-3">
                                {recentActivity.map((it, idx) => (
                                    <li key={idx} className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium text-gray-700 dark:text-slate-200">
                                                {it.desc}
                                            </div>
                                            <div className="text-xs text-gray-400">by system</div>
                                        </div>
                                        <div className="text-xs text-gray-400">{it.time}</div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>

                {/* Quick Add full-width row */}
                {prefs.widgets.quickAdd && (
                    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-3 mb-6 flex items-center gap-3 border">
                        <div className="flex gap-2">
                            {["task", "goal", "stroke", "note", "appointment"].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setQuickAddOpen(t)}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm"
                                >
                                    + {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 text-sm text-gray-500 dark:text-gray-300">
                            Quick Add: tasks, goals, strokes, notes, and appointments.
                        </div>
                        {message && <div className="text-sm text-green-600 font-medium">{message}</div>}
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* Strokes detail */}
                    {prefs.widgets.strokes && (
                        <section className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6 border">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400">Strokes</h2>
                                <button className="text-sm text-blue-600" onClick={() => setQuickAddOpen("stroke")}>
                                    + Give Stroke
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-200">
                                        Received
                                    </div>
                                    {strokes.received.length === 0 ? (
                                        <div className="text-gray-400 text-sm">No recognitions yet.</div>
                                    ) : (
                                        <ul className="space-y-2">
                                            {strokes.received.map((s) => (
                                                <li key={s.id} className="p-3 border rounded">
                                                    <div className="text-sm">
                                                        <span className="font-medium">{s.from}</span>: {s.msg}
                                                    </div>
                                                    <div className="text-xs text-gray-400">{s.time} ago</div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div>
                                    <div className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-200">
                                        Given
                                    </div>
                                    {strokes.given.length === 0 ? (
                                        <div className="text-gray-400 text-sm">Haven’t given any recognitions yet.</div>
                                    ) : (
                                        <ul className="space-y-2">
                                            {strokes.given.map((s) => (
                                                <li key={s.id} className="p-3 border rounded">
                                                    <div className="text-sm">
                                                        To <span className="font-medium">{s.to}</span>: {s.msg}
                                                    </div>
                                                    <div className="text-xs text-gray-400">{s.time} ago</div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Suggestions (AI placeholder) */}
                    {prefs.widgets.suggestions && (
                        <section className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6 border">
                            <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-2">Suggestions</h2>
                            <ul className="list-disc pl-6 text-sm text-slate-700 dark:text-slate-200">
                                <li>Recommend goal: "Automate weekly reporting" (template)</li>
                                <li>Next best action: Finish API tests before lunch</li>
                                <li>Insight: You’re most productive in the morning (9–12)</li>
                            </ul>
                            <div className="mt-3 text-xs text-gray-400">
                                AI features are placeholders; wire to backend later.
                            </div>
                        </section>
                    )}
                </div>

                {/* Manager/Analytics area */}
                {prefs.view === "manager" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {prefs.widgets.teamOverview && (
                            <section className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6 border">
                                <h3 className="text-lg font-bold mb-3 text-blue-700 dark:text-blue-400">
                                    Team Performance Overview
                                </h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="p-3 border rounded">Team goals completion: 68%</div>
                                    <div className="p-3 border rounded">Avg workload: 32h/week</div>
                                    <div className="p-3 border rounded">eNPS trend: steady ↑</div>
                                    <div className="p-3 border rounded">Strokes leaderboard: Dana (5)</div>
                                </div>
                            </section>
                        )}

                        {prefs.widgets.analytics && (
                            <section className="bg-white dark:bg-neutral-800 rounded-2xl shadow p-6 border">
                                <h3 className="text-lg font-bold mb-3 text-blue-700 dark:text-blue-400">Analytics</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Time usage pie (Goals vs Trap) */}
                                    <div className="p-3 border rounded">
                                        <div className="font-semibold text-sm mb-2">Time usage</div>
                                        <div className="flex items-center gap-4">
                                            <svg viewBox="0 0 32 32" className="w-24 h-24">
                                                <circle r="16" cx="16" cy="16" fill="#e5e7eb" />
                                                {/* green arc for goals */}
                                                <circle
                                                    r="16"
                                                    cx="16"
                                                    cy="16"
                                                    fill="transparent"
                                                    stroke="#22c55e"
                                                    strokeWidth="32"
                                                    strokeDasharray={`${(productivity.productive / (productivity.productive + productivity.trap)) * 100} 100`}
                                                    transform="rotate(-90 16 16)"
                                                />
                                            </svg>
                                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                                <div>
                                                    <span className="inline-block w-3 h-3 bg-green-500 mr-2" />
                                                    Goal-aligned
                                                </div>
                                                <div>
                                                    <span className="inline-block w-3 h-3 bg-red-500 mr-2" />
                                                    Trap
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Weekly trend bars */}
                                    <div className="p-3 border rounded">
                                        <div className="font-semibold text-sm mb-2">Weekly trend</div>
                                        <div className="flex items-end gap-2 h-32">
                                            {[8, 6, 7, 5, 9, 4, 3].map((v, i) => (
                                                <div
                                                    key={i}
                                                    className="w-6 bg-blue-500"
                                                    style={{ height: `${v * 10}%` }}
                                                    title={`Day ${i + 1}: ${v}h`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )}

                <div className="text-center text-gray-400 dark:text-gray-300 text-xs">
                    All data shown is demo-only. Use the Widgets menu to customize.
                </div>

                {/* Quick Add inline form area */}
                {quickAddOpen && (
                    <div className="fixed left-1/2 -translate-x-1/2 bottom-8 z-50 w-96 bg-white dark:bg-neutral-800 border rounded shadow p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold">Quick Add — {quickAddOpen}</div>
                            <button onClick={() => setQuickAddOpen(null)} className="text-xs text-gray-400">
                                Close
                            </button>
                        </div>
                        <input
                            className="w-full border rounded p-2 mb-2 bg-white dark:bg-neutral-900"
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
            </main>
        </div>
    );
}
