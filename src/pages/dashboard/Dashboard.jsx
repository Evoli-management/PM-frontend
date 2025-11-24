
import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../../components/shared/Sidebar";
import { FaGripVertical, FaBars } from "react-icons/fa";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Reusable dashboard widgets
import EnpsChart from "../../components/dashboard/widgets/EnpsChart.jsx";
import CalendarPreview from "../../components/dashboard/widgets/CalendarPreview.jsx";
import ActivityFeed from "../../components/dashboard/widgets/ActivityFeed.jsx";

import StatsCard from "../../components/dashboard/widgets/StatsCard.jsx";
import TimeUsagePie from "../../components/dashboard/widgets/TimeUsagePie.jsx";
import WeeklyTrendBars from "../../components/dashboard/widgets/WeeklyTrendBars.jsx";

// Real API Services
// goalService will be dynamically imported where needed to allow code-splitting
// Load activityService on demand to keep it out of the main chunk
let _activityService = null;
const getActivityService = async () => {
    if (_activityService) return _activityService;
    const mod = await import("../../services/activityService");
    _activityService = mod?.default || mod;
    return _activityService;
};
import calendarService from "../../services/calendarService";

// Fallback data for when API is unavailable
const fallbackActivity = [
    { desc: "Alice completed task: Design header", time: "2h" },
    { desc: "Bob moved 'Payment' to In Progress", time: "1d" },
    { desc: "New member invited: Carlos", time: "3d" },
];

const fallbackGoals = [
    { title: "Launch MVP", progress: 72 },
    { title: "Improve onboarding", progress: 40 },
];

const fallbackCalendar = [
    { id: 1, title: "Daily Standup", start: "09:00", end: "09:15" },
    { id: 2, title: "Client Call", start: "11:00", end: "11:45" },
    { id: 3, title: "Focus: API integration", start: "14:00", end: "16:00" },
];



function EChart({ data = [], labels = [] }) {
    // responsive SVG chart with axes, grid and tooltip
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);

    const margin = { top: 6, right: 10, bottom: 22, left: 30 };
    const width = 680 - margin.left - margin.right;
    const height = 150 - margin.top - margin.bottom;

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
                className="w-full h-28 rounded-md"
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

// SortableWidget wrapper component for drag functionality
function SortableWidget({ id, children }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="group relative">
            {/* Drag handle */}
            <div 
                {...attributes} 
                {...listeners}
                className="absolute left-3 top-3 opacity-0 group-hover:opacity-60 transition-opacity duration-200 z-10 cursor-grab active:cursor-grabbing"
            >
                <FaGripVertical className="text-gray-400 text-sm" title="Drag to reorder" />
            </div>
            {children}
        </div>
    );
}

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    
    // Enhanced drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 400);
        return () => clearTimeout(timer);
    }, []);

    const enpsData = [10, 12, 8, 15, 18, 20, 22, 20, 19, 21, 23, 22];

    const defaultPrefs = {
        widgets: {
            myDay: true,
            goals: true,
            enps: true,
            calendarPreview: true,
            activity: true,
        },
        // explicit order for all widgets — will be kept in localStorage (quickAdd removed to avoid duplication with navbar)
        widgetOrder: ["myDay", "goals", "enps", "calendarPreview", "activity"],
        theme: "light", // or 'dark'
    };

    const [prefs, setPrefs] = useState(() => {
        try {
            const raw = localStorage.getItem("pm:dashboard:prefs");
            const stored = raw ? JSON.parse(raw) : {};

            // merge widgets
            const widgets = { ...defaultPrefs.widgets, ...(stored.widgets || {}) };

            // normalize widgetOrder: prefer stored.widgetOrder; else use stored.lastSelected ordering; else fall back to defaults
            const knownKeys = Object.keys(defaultPrefs.widgets);
            const storedLast = (stored && stored.lastSelected) || {};
            let widgetOrder = [];
            if (Array.isArray(stored.widgetOrder) && stored.widgetOrder.length) {
                widgetOrder = stored.widgetOrder.slice();
            } else if (storedLast && Object.keys(storedLast).length) {
                // sort keys by their stored timestamp (oldest first = first selected)
                widgetOrder = Object.keys(storedLast)
                    .filter((k) => knownKeys.includes(k))
                    .sort((a, b) => (storedLast[a] || 0) - (storedLast[b] || 0));
            } else {
                widgetOrder = defaultPrefs.widgetOrder.slice();
            }
            // keep only known keys and ensure uniqueness, add missing keys at end
            const presentKeys = widgetOrder.filter((k, i, arr) => knownKeys.includes(k) && arr.indexOf(k) === i);
            const missingKeys = knownKeys.filter(k => !presentKeys.includes(k));
            widgetOrder = [...presentKeys, ...missingKeys];

            return {
                ...defaultPrefs,
                ...stored,
                widgets,
                widgetOrder,
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
        setPrefs((p) => {
            const enabled = !p.widgets[key];
            const widgets = { ...p.widgets, [key]: enabled };
            let widgetOrder = Array.isArray(p.widgetOrder) ? p.widgetOrder.slice() : [];

            const lastSelected = { ...(p.lastSelected || {}) };
            if (enabled) {
                // append to end if not present and record timestamp
                if (!widgetOrder.includes(key)) widgetOrder.push(key);
                lastSelected[key] = Date.now();
            } else {
                // remove if present and erase timestamp
                widgetOrder = widgetOrder.filter((k) => k !== key);
                delete lastSelected[key];
            }

            return { ...p, widgets, widgetOrder, lastSelected };
        });
    };

    // Move a widget to the top (front) of the order — useful for explicit placing
    const moveWidgetToTop = (key) => {
        setPrefs((p) => {
            const widgetOrder = Array.isArray(p.widgetOrder) ? p.widgetOrder.slice() : [];
            const next = [key, ...widgetOrder.filter((k) => k !== key)];
            return { ...p, widgetOrder: next };
        });
    };


    // Dark mode disabled; keep theme as light while retaining the button UI
    const toggleTheme = () => setPrefs((p) => (p.theme !== "light" ? { ...p, theme: "light" } : p));

    // Dashboard will listen for prefs updates dispatched by Navbar widget control
    useEffect(() => {
        const handler = (e) => {
            try {
                const widgets = e?.detail?.widgets;
                if (widgets) {
                    setPrefs((p) => ({ ...p, widgets: { ...p.widgets, ...widgets } }));
                }
            } catch (err) {
                console.warn('dashboard prefs handler error', err);
            }
        };
        window.addEventListener('dashboard-prefs-updated', handler);
        return () => window.removeEventListener('dashboard-prefs-updated', handler);
    }, []);

    // (top summary layout handled below nearer the JSX so it has current prefs)

    // Data state - Real data from APIs
    const [activeGoals, setActiveGoals] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [calendarToday, setCalendarToday] = useState([]);
    
    // Loading and error states
    const [dataLoading, setDataLoading] = useState({
        goals: true,
        activity: true,
        calendar: true,
    });
    const [dataErrors, setDataErrors] = useState({});

    // Load real data from APIs
    useEffect(() => {
        const loadDashboardData = async () => {
            // Load Goals
            try {
                console.log("Loading goals...");
                const mod = await import("../../services/goalService");
                const goalsData = await mod.getGoals();
                console.log("Goals loaded:", goalsData);
                
                // Transform goals data for dashboard display
                const activeGoalsData = goalsData
                    .filter(goal => goal.status !== 'archived' && goal.visibility !== 'archived')
                    .map(goal => ({
                        id: goal.id,
                        title: goal.title,
                        progress: goal.progressPercent || 0,
                        status: goal.status,
                        dueDate: goal.dueDate,
                    }))
                    .slice(0, 5); // Show only first 5 goals on dashboard
                
                setActiveGoals(activeGoalsData);
                setDataLoading(prev => ({ ...prev, goals: false }));
            } catch (error) {
                console.error("Failed to load goals:", error);
                setActiveGoals(fallbackGoals);
                setDataErrors(prev => ({ ...prev, goals: error.message }));
                setDataLoading(prev => ({ ...prev, goals: false }));
            }

            // Load Activity Feed
            try {
                console.log("Loading activities...");
                const activitySvc = await getActivityService();
                const activitiesData = await activitySvc.list();
                console.log("Activities loaded:", activitiesData);
                
                // Transform activity data for dashboard display
                const recentActivityData = activitiesData
                    .slice(0, 10) // Show only recent 10 activities
                    .map(activity => ({
                        id: activity.id,
                        desc: activity.text || activity.description || "Activity update",
                        time: formatTimeAgo(activity.createdAt || activity.timestamp),
                        type: activity.type || "general",
                    }));
                
                setRecentActivity(recentActivityData);
                setDataLoading(prev => ({ ...prev, activity: false }));
            } catch (error) {
                console.error("Failed to load activities:", error);
                setRecentActivity(fallbackActivity);
                setDataErrors(prev => ({ ...prev, activity: error.message }));
                setDataLoading(prev => ({ ...prev, activity: false }));
            }

            // Load Today's Calendar Events
            try {
                console.log("Loading calendar events...");
                const today = new Date();
                const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
                const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();
                
                const eventsData = await calendarService.listEvents({
                    from: todayStart,
                    to: todayEnd,
                    view: 'day'
                });
                console.log("Calendar events loaded:", eventsData);
                
                // Transform calendar data for dashboard display
                const calendarTodayData = eventsData
                    .slice(0, 8) // Show max 8 events for today
                    .map(event => ({
                        id: event.id,
                        title: event.title || event.summary || "Untitled Event",
                        start: formatTimeOnly(event.startTime || event.start),
                        end: formatTimeOnly(event.endTime || event.end),
                        type: event.type || "event",
                    }));
                
                setCalendarToday(calendarTodayData);
                setDataLoading(prev => ({ ...prev, calendar: false }));
            } catch (error) {
                console.error("Failed to load calendar:", error);
                setCalendarToday(fallbackCalendar);
                setDataErrors(prev => ({ ...prev, calendar: error.message }));
                setDataLoading(prev => ({ ...prev, calendar: false }));
            }


        };

        loadDashboardData();
    }, []); // Load once on component mount

    // Helper functions for data formatting
    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return "recently";
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffMins < 60) return `${diffMins}m`;
            if (diffHours < 24) return `${diffHours}h`;
            return `${diffDays}d`;
        } catch {
            return "recently";
        }
    };

    const formatTimeOnly = (timeString) => {
        if (!timeString) return "00:00";
        try {
            const date = new Date(timeString);
            return date.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch {
            return "00:00";
        }
    };




    
    // Handle drag end event - Simple swap between two widgets
    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over?.id && over) {
            const draggedWidgetId = active.id;
            const targetWidgetId = over.id;
            
            // Get the complete widget order (including hidden widgets)
            const currentOrder = [...(prefs.widgetOrder || [])];
            
            // Find positions of both widgets in the complete order
            const draggedIndex = currentOrder.indexOf(draggedWidgetId);
            const targetIndex = currentOrder.indexOf(targetWidgetId);
            
            // Ensure both widgets exist in the order
            if (draggedIndex === -1 || targetIndex === -1) {
                console.warn('Invalid drag operation: one or both widgets not found in order');
                return;
            }
            
            // Simple swap: exchange positions of the two widgets
            const newOrder = [...currentOrder];
            newOrder[draggedIndex] = targetWidgetId;
            newOrder[targetIndex] = draggedWidgetId;
            
            // Update preferences state
            const newPrefs = { 
                ...prefs,
                widgetOrder: newOrder
            };
            setPrefs(newPrefs);
            
            // Save to localStorage
            try {
                localStorage.setItem('pm:dashboard:prefs', JSON.stringify(newPrefs));
            } catch (error) {
                console.warn('Failed to save dashboard preferences:', error);
            }
        }
    };
    
    // Refresh dashboard data
    const refreshDashboardData = async () => {
        setDataLoading({
            goals: true,
            activity: true,
            calendar: true,
            strokes: true,
        });
        
        // Trigger data reload
        window.location.reload(); // Simple approach - could be optimized
    };
    


    // Onboarding tip removed per user preference

    // Helpers - Updated to use real data
    const avgGoal = activeGoals.length
        ? Math.round(activeGoals.reduce((s, g) => s + (g.progress || 0), 0) / activeGoals.length)
        : 0;
    
    // Calculate real My Day stats
    const myDayStats = {
        tasksDueToday: activeGoals.filter(goal => {
            if (!goal.dueDate) return false;
            const today = new Date().toDateString();
            const dueDate = new Date(goal.dueDate).toDateString();
            return dueDate === today;
        }).length,
        overdue: activeGoals.filter(goal => {
            if (!goal.dueDate) return false;
            const today = new Date();
            const dueDate = new Date(goal.dueDate);
            return dueDate < today && goal.status !== 'completed';
        }).length,
        appointments: calendarToday.length
    };
    



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

    // Determine which widgets are visible and keep their selection order
    // All widgets are now draggable (quickAdd removed to avoid duplication with navbar)
    const visibleWidgetKeys = (prefs.widgetOrder || []).filter((k) => prefs.widgets[k]);

    // Create a unified widget renderer
    const renderWidget = (key, index) => {
        // Make all widgets the same size with proper content accommodation
        // Flexible height to fit content but maintain consistency
        const widgetClass = 'w-full h-96 min-h-96';



        if (key === "myDay") {
            return (
                <SortableWidget key={key} id={key}>
                    <div className={widgetClass}>
                        <div className="bg-white border border-blue-200 rounded-lg shadow-sm p-3 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-blue-700">My Day</h3>
                                <span className="text-xs text-[CanvasText] opacity-60" title="Your daily schedule: appointments and tasks">ℹ️</span>
                            </div>
                            <div className="flex-1 flex flex-col justify-center items-center">
                                <div className="text-lg font-extrabold text-blue-700 dark:text-blue-400">{myDayStats.tasksDueToday}</div>
                                <div className="text-xs font-medium opacity-80">tasks</div>
                                <div className="text-[10px] text-[CanvasText] opacity-70 mt-1">{myDayStats.overdue} overdue • {myDayStats.appointments} appointments</div>
                            </div>
                            <div className="mt-3">
                                <a href="#/calendar" className="text-sm text-blue-600 hover:text-blue-800">View Calendar</a>
                            </div>
                        </div>
                    </div>
                </SortableWidget>
            );
        }

        if (key === "goals") {
            return (
                <SortableWidget key={key} id={key}>
                    <div className={widgetClass}>
                    <div className="bg-white border border-blue-200 rounded-lg shadow-sm p-3 h-full flex flex-col">
                        <h3 className="font-semibold text-blue-700 mb-3">Your active goals</h3>
                        <div className="flex items-center justify-between mb-2">
                            <div />
                            <div className="flex items-center gap-2">
                                <button 
                                    className="px-2 py-1 border rounded text-sm" 
                                    title="Export goals"
                                    onClick={() => {
                                        const header = ["Title", "Progress (%)", "Status", "Due Date"];
                                        const rows = [
                                            header,
                                            ...activeGoals.map((g) => [
                                                g.title,
                                                g.progress || 0,
                                                g.status || "active",
                                                g.dueDate ? new Date(g.dueDate).toLocaleDateString() : "No due date",
                                            ]),
                                        ];
                                        exportCsv("dashboard-goals.csv", rows);
                                    }}
                                >
                                    Export
                                </button>
                                <a href="#/goals" className="text-sm text-blue-600">View all</a>
                            </div>
                        </div>

                        {dataLoading.goals ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-sm text-[CanvasText] opacity-70">Loading goals...</div>
                            </div>
                        ) : dataErrors.goals ? (
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded border">
                                Failed to load goals: {dataErrors.goals}
                                <div className="mt-2 text-xs">Using fallback data</div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto">
                                {activeGoals.length === 0 ? (
                                    <div className="text-[CanvasText] opacity-70">
                                        No active goals yet. <a href="#/goals" className="text-blue-600">Create your first goal</a>!
                                    </div>
                                ) : (
                                    <ul className="space-y-4">
                                        {activeGoals.map((g, i) => (
                                            <li key={g.id || i} className="p-3 border rounded">
                                                <div className="flex justify-between items-center">
                                                    <div className="font-semibold">{g.title}</div>
                                                    <div className="text-sm opacity-70">{g.progress || 0}%</div>
                                                </div>
                                                <div className="mt-2 bg-gray-100 dark:bg-neutral-700 rounded h-2 overflow-hidden">
                                                    <div 
                                                        className="h-2 bg-blue-500 transition-all duration-300" 
                                                        style={{ width: `${g.progress || 0}%` }} 
                                                    />
                                                </div>
                                                {g.dueDate && (
                                                    <div className="text-xs text-[CanvasText] opacity-60 mt-1">
                                                        Due: {new Date(g.dueDate).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                </SortableWidget>
            );
        }

        if (key === "enps") {
            return (
                <SortableWidget key={key} id={key}>
                    <div className={widgetClass}>
                    <div className="bg-white border border-blue-200 rounded-lg shadow-sm p-3 h-full flex flex-col">
                        <h3 className="font-semibold text-blue-700 mb-3">eNPS Snapshot</h3>
                        <div className="flex items-start justify-between">
                            <div />
                            <div className="text-xs text-[CanvasText] opacity-60 flex items-center gap-2">
                                <span title="eNPS measures employee net promoter score; range -100 to +100">ℹ️</span>
                                <button className="px-2 py-1 border rounded text-[CanvasText]" title="Export eNPS report">Export</button>
                            </div>
                        </div>
                        <a href="#/enps">
                            <EnpsChart data={enpsData} labels={enpsData.map((_, i) => `W${i + 1}`)} />
                        </a>
                    </div>
                </div>
                </SortableWidget>
            );
        }





        if (key === "calendarPreview") {
            return (
                <SortableWidget key={key} id={key}>
                    <div className={widgetClass}>
                    <div className="bg-white border border-blue-200 rounded-lg shadow-sm p-3 h-full flex flex-col">
                        <h3 className="font-semibold text-blue-700 mb-3">Calendar Preview (Today)</h3>
                        <div className="flex items-center justify-between mb-2">
                            <div />
                            <a href="#/calendar" className="text-sm text-blue-600">Open Calendar</a>
                        </div>

                        {dataLoading.calendar ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-sm text-[CanvasText] opacity-70">Loading calendar...</div>
                            </div>
                        ) : dataErrors.calendar ? (
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded border mb-3">
                                Failed to load calendar: {dataErrors.calendar}
                                <div className="text-xs mt-1">Using fallback data</div>
                            </div>
                        ) : calendarToday.length === 0 ? (
                            <div className="text-[CanvasText] opacity-70">
                                No appointments today. <a href="#/calendar" className="text-blue-600">Add appointment</a>.
                            </div>
                        ) : (
                            <CalendarPreview 
                                events={calendarToday} 
                                onReorder={(next) => { 
                                    setCalendarToday(next); 
                                    try { 
                                        localStorage.setItem("pm:calendarPreviewOrder", JSON.stringify(next.map((e) => e.id))); 
                                    } catch {} 
                                }} 
                                getCountdownBadge={getCountdownBadge} 
                            />
                        )}
                    </div>
                </div>
                </SortableWidget>
            );
        }

        if (key === "activity") {
            return (
                <SortableWidget key={key} id={key}>
                    <div className={widgetClass}>
                    <div className="bg-white border border-blue-200 rounded-lg shadow-sm p-3 h-full flex flex-col">
                        <h3 className="font-semibold text-blue-700 mb-3">What's New</h3>
                        <div className="flex items-center justify-between mb-2">
                            <div />
                            <div className="flex items-center gap-2">
                                <select className="border rounded text-sm bg-[Canvas]" value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} title="Filter feed">
                                    <option value="all">All</option>
                                    <option value="tasks">Tasks</option>
                                    <option value="goals">Goals</option>
                                    <option value="recognitions">Recognitions</option>
                                </select>
                                <a href="#/notifications" className="text-sm text-blue-600">Open Feed</a>
                            </div>
                        </div>

                        {dataLoading.activity ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-sm text-[CanvasText] opacity-70">Loading activities...</div>
                            </div>
                        ) : dataErrors.activity ? (
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded border mb-3">
                                Failed to load activities: {dataErrors.activity}
                                <div className="text-xs mt-1">Using fallback data</div>
                            </div>
                        ) : null}
                        
                        <div className="flex-1 overflow-y-auto">
                            <ActivityFeed 
                                items={recentActivity.filter((it) => {
                                    if (activityFilter === "all") return true;
                                    if (activityFilter === "recognitions") return /stroke|recognition|praise/i.test(it.desc);
                                    if (activityFilter === "goals") return /goal|objective|milestone/i.test(it.desc);
                                    if (activityFilter === "tasks") return /task|todo|complete|moved/i.test(it.desc);
                                    return true;
                                })} 
                                onItemClick={(it) => setDrillItem(it)} 
                            />

                            {!dataLoading.activity && recentActivity.length === 0 && (
                                <div className="text-[CanvasText] opacity-70 text-center py-4">
                                    No recent activity. Start working on your goals to see updates here!
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                </SortableWidget>
            );
        }





        return null;
    };

    // Flexible flow styles so widgets wrap and fill space without fixed columns
    // Use CSS Grid with auto-fit so cards expand to fill the row (avoids trailing empty space)
    // Responsive grid for top summary: preserves selection order (iteration order) and packs items across the screen
    const topColsStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.15rem',
        marginBottom: '0.25rem',
        width: '100%',
        alignItems: 'stretch',
        gridAutoRows: '1fr',
    };

    // Use a dense CSS Grid so sections can sit side-by-side and reduce vertical stacking
    const dynamicGrid = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.18rem',
        marginBottom: '0.2rem',
        alignItems: 'stretch',
        gridAutoRows: '1fr',
        width: '100%',
    };

    const dynamicGridSmall = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '0.18rem',
        alignItems: 'stretch',
        gridAutoRows: '1fr',
    };



    return (
        <div className="min-h-screen bg-[#EDEDED]">
            <div className="flex w-full min-h-screen">
                <Sidebar 
                    user={{ name: "Hussein" }} 
                    mobileOpen={mobileSidebarOpen}
                    onMobileClose={() => setMobileSidebarOpen(false)}
                />
                {mobileSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/40 z-30 md:hidden"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                )}
                <main className="flex-1 min-w-0 w-full min-h-screen transition-all md:ml-[1mm] overflow-y-auto">
                    <div className="max-w-full overflow-x-hidden pb-8 min-h-full">
                        <div className="flex items-center justify-between gap-2 mb-2 p-2 md:p-3 pb-0 md:pb-0">
                            <div className="flex items-center gap-3">
                                <button
                                    className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                                    onClick={() => setMobileSidebarOpen(true)}
                                    aria-label="Open sidebar"
                                >
                                    <FaBars />
                                </button>
                            </div>
                        </div>
                        <div className="px-2 md:px-4">



                            {/* Unified Widget Grid - All widgets in draggable layout */}
                            {visibleWidgetKeys.length > 0 && (
                                <div className="w-full">
                                    <DndContext 
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext 
                                            items={visibleWidgetKeys} 
                                            strategy={rectSortingStrategy}
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 md:gap-2">
                                                {visibleWidgetKeys.map((key, index) => renderWidget(key, index))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            )}

                        </div>
                    </div>
                </main>
            </div>



                {/* Drill-in modal for Activity */}


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
        </div>
    );
}
