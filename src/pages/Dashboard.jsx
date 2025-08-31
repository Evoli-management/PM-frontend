import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/shared/Sidebar";

const summary = [
  { label: "Projects", value: 5, colorHex: "#059669", icon: "📁", action: "Add Project", tooltip: "Create a new project" },
  { label: "Tasks", value: 24, colorHex: "#2563eb", icon: "✅", action: "Assign Task", tooltip: "Assign a new task" },
  { label: "Team", value: 8, colorHex: "#7c3aed", icon: "👥", action: "Invite Member", tooltip: "Invite a new team member" },
];

const recentActivity = [
  { desc: "Alice completed task: Design header", time: "2h" },
  { desc: "Bob moved 'Payment' to In Progress", time: "1d" },
  { desc: "New member invited: Carlos", time: "3d" },
];

const activeGoals = [
  { title: "Launch MVP", progress: 72 },
  { title: "Improve onboarding", progress: 40 },
];

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

  const areaPath = `M${margin.left},${margin.top + height} L ${coords.map((c) => `${c.x},${c.y}`).join(' L ')} L ${margin.left + width},${margin.top + height} Z`;
  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, t) => Math.round(min + (t / yTicks) * yRange));

  function handleMove(e) {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursor = pt.matrixTransform(svg.getScreenCTM().inverse());
    // find nearest point by x
    const nearest = coords.reduce((best, c) => (Math.abs(c.x - cursor.x) < Math.abs(best.x - cursor.x) ? c : best), coords[0]);
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
              <line x1={margin.left} x2={margin.left + width} y1={y} y2={y} stroke="#e6eefb" strokeWidth={1} />
              <text x={margin.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">{val}</text>
            </g>
          );
        })}

        {/* x-axis ticks */}
        {coords.map((c, i) => (
          <g key={i}>
            <line x1={c.x} x2={c.x} y1={margin.top + height} y2={margin.top + height + 6} stroke="#cde0ff" />
            <text x={c.x} y={margin.top + height + 18} textAnchor="middle" fontSize="11" fill="#6b7280">{labels[i] || i + 1}</text>
          </g>
        ))}

        {/* area */}
        <path d={areaPath} fill="url(#g)" stroke="none" />

        {/* line */}
        <polyline fill="none" stroke="#2563eb" strokeWidth={2.5} points={linePoints} strokeLinejoin="round" strokeLinecap="round" />

        {/* points */}
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={3.5} fill="#2563eb" stroke="#fff" strokeWidth={1} />
        ))}
      </svg>

      {tooltip && (
        <div
          className="absolute bg-white shadow rounded px-3 py-2 text-sm text-gray-700 z-50 pointer-events-none"
          style={{ left: Math.min(Math.max(tooltip.x - 40, 8), (width + margin.left + margin.right) - 120), top: tooltip.y - 56 }}
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
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // small mock dataset for eNPS-like chart
  const enpsData = [10, 12, 8, 15, 18, 20, 22, 20, 19, 21, 23, 22];

  // widget preferences persisted to localStorage
  const defaultPrefs = {
    widgets: {
      summary: true,
      enps: true,
      goals: true,
      activity: true,
      quickAdd: true,
      analytics: false,
      teamOverview: false,
    },
    view: 'employee', // or 'manager'
  };

  const [prefs, setPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem('pm:dashboard:prefs');
      return raw ? JSON.parse(raw) : defaultPrefs;
    } catch (e) {
      return defaultPrefs;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pm:dashboard:prefs', JSON.stringify(prefs));
    } catch (e) {}
  }, [prefs]);

  const toggleWidget = (key) => {
    setPrefs((p) => ({ ...p, widgets: { ...p.widgets, [key]: !p.widgets[key] } }));
  };

  const setView = (v) => setPrefs((p) => ({ ...p, view: v }));

  // Quick Add state (demo inline forms)
  const [quickAddOpen, setQuickAddOpen] = useState(null); // 'task'|'goal'|'stroke'|'note'
  const [message, setMessage] = useState('');

  function doQuickAdd(type) {
    // demo behavior: close form and show a temporary message
    setMessage(`Added ${type} (demo)`);
    setTimeout(() => setMessage(''), 2500);
    setQuickAddOpen(null);
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={{ name: 'Hussein' }} />
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">Dashboard</h1>
            <p className="text-gray-600 text-sm">Overview of projects, tasks and team activity.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-white border rounded p-1">
              <button onClick={() => setView('employee')} className={`px-3 py-1 rounded ${prefs.view === 'employee' ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>Employee</button>
              <button onClick={() => setView('manager')} className={`px-3 py-1 rounded ${prefs.view === 'manager' ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>Manager</button>
            </div>

            {/* Widget toggles dropdown */}
            <div className="relative">
              <details className="relative">
                <summary className="px-3 py-1 bg-white border rounded cursor-pointer">Widgets</summary>
                <div className="absolute right-0 mt-2 w-56 bg-white border rounded shadow p-3 z-40">
                  {Object.keys(prefs.widgets).map((k) => (
                    <label key={k} className="flex items-center justify-between gap-2 mb-2 text-sm">
                      <span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <input type="checkbox" checked={prefs.widgets[k]} onChange={() => toggleWidget(k)} />
                    </label>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* Quick Add bar */}
        {prefs.widgets.quickAdd && (
          <div className="bg-white rounded-lg shadow-sm p-3 mb-6 flex items-center gap-3">
            <div className="flex gap-2">
              {['task', 'goal', 'stroke', 'note'].map((t) => (
                <button key={t} onClick={() => setQuickAddOpen(t)} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">+ {t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
            <div className="flex-1 text-sm text-gray-500">Quick add — create tasks, goals or recognitions in one click.</div>
            {message && <div className="text-sm text-green-600 font-medium">{message}</div>}
          </div>
        )}

        {/* Top summary cards */}
        {prefs.widgets.summary && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {loading
              ? Array(3).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow p-6 animate-pulse h-36" />
                ))
              : summary.map((card) => (
                  <div key={card.label} className="bg-white rounded-2xl shadow p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl">{card.icon}</div>
                        <div className="text-sm text-gray-500">{card.label}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold" style={{ color: card.colorHex }}>{card.value}</div>
                        <div className="text-xs text-gray-400">{card.value === 0 ? 'No items' : `${card.value} total`}</div>
                      </div>
                    </div>
                    <button
                      style={{ background: card.colorHex }}
                      className="mt-4 text-white rounded-lg px-4 py-2 text-sm font-semibold shadow"
                      aria-label={card.action}
                      title={card.tooltip}
                      onClick={() => setMessage(`${card.action} clicked (demo)`)}
                    >
                      {card.action}
                    </button>
                  </div>
                ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {prefs.widgets.enps && (
            <section className="bg-white rounded-2xl shadow p-6">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-bold text-blue-700 mb-2">eNPS Snapshot</h2>
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <span title="eNPS measures employee net promoter score; range -100 to +100">ℹ️</span>
                </div>
              </div>
              <EChart data={enpsData} labels={enpsData.map((_,i)=>`W${i+1}`)} />

              <div className="mt-4 grid grid-cols-4 gap-3 items-center">
                <div className="col-span-1 border rounded p-3 text-center">
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-xs text-gray-400">Score</div>
                </div>
                <div className="col-span-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <div>Detractors</div>
                    <div>Passives</div>
                    <div>Promoters</div>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded overflow-hidden flex">
                    <div className="h-3 bg-red-500" style={{ width: '20%' }} />
                    <div className="h-3 bg-yellow-400" style={{ width: '30%' }} />
                    <div className="h-3 bg-green-500" style={{ width: '50%' }} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {prefs.widgets.goals && (
            <section className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-blue-700 mb-4">Your active goals</h2>
              {activeGoals.length === 0 ? (
                <div className="text-gray-400">No active goals</div>
              ) : (
                <ul className="space-y-4">
                  {activeGoals.map((g, i) => (
                    <li key={i} className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <div className="font-semibold text-gray-700">{g.title}</div>
                        <div className="text-sm text-gray-400">{g.progress}%</div>
                      </div>
                      <div className="mt-2 bg-gray-100 rounded h-2 overflow-hidden">
                        <div className="h-2 bg-blue-500" style={{ width: `${g.progress}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {prefs.widgets.activity && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h2 className="text-lg font-bold text-blue-700 mb-4">What’s New</h2>
            <ul className="space-y-3">
              {recentActivity.map((it, idx) => (
                <li key={idx} className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-700">{it.desc}</div>
                    <div className="text-xs text-gray-400">by system</div>
                  </div>
                  <div className="text-xs text-gray-400">{it.time}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Manager/Analytics area */}
        {prefs.view === 'manager' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {prefs.widgets.teamOverview && (
              <section className="bg-white rounded-2xl shadow p-6">
                <h3 className="text-lg font-bold mb-3">Team Performance</h3>
                <div className="text-sm text-gray-500">Team goals, workload balance and top contributors (demo)</div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded">Team goal completion: 68%</div>
                  <div className="p-3 border rounded">Avg workload: 32h/week</div>
                </div>
              </section>
            )}

            {prefs.widgets.analytics && (
              <section className="bg-white rounded-2xl shadow p-6">
                <h3 className="text-lg font-bold mb-3">Analytics (demo)</h3>
                <div className="text-sm text-gray-500">Time usage, trap vs goal-aligned tasks and trends.</div>
              </section>
            )}
          </div>
        )}

        <div className="text-center text-gray-400 text-xs">All data shown is demo-only. Use the Widgets menu to customize.</div>

        {/* Quick Add inline form area */}
        {quickAddOpen && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-8 z-50 w-96 bg-white border rounded shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Quick Add — {quickAddOpen}</div>
              <button onClick={() => setQuickAddOpen(null)} className="text-xs text-gray-400">Close</button>
            </div>
            <input className="w-full border rounded p-2 mb-2" placeholder={`Enter ${quickAddOpen} title`} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setQuickAddOpen(null)} className="px-3 py-1 border rounded text-sm">Cancel</button>
              <button onClick={() => doQuickAdd(quickAddOpen)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Add</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
