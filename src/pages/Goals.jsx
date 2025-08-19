import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBullseye,
  FaPlus,
  FaSearch,
  FaFilter,
  FaListUl,
  FaThLarge,
  FaStream,
  FaFlagCheckered,
  FaCalendarAlt,
  FaLink,
  FaUser,
  FaTags,
  FaCheck,
  FaClock,
  FaTasks,
} from "react-icons/fa";

// -----------------------------------------------------------------------------
// Data: use shared mock + utilities provided by ../utils/goalsData.js
// -----------------------------------------------------------------------------
import {
  mockGoals,
  getGoalStatistics,
  getProgressColor,
  getPriorityColor,
  getStatusColor,
} from "../utils/goalsData.js";

// -----------------------------------------------------------------------------
// Components (JSX version — no TypeScript)
// -----------------------------------------------------------------------------
const Chip = ({ label, toneClass = "", className = "", ...rest }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
      toneClass || "border-blue-200 text-blue-700"
    } ${className}`}
    {...rest}
  >
    {label}
  </span>
);

const ProgressBar = ({ value }) => (
  <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden" aria-label="Progress">
    <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);

const MilestoneList = ({ milestones }) => (
  <ul className="space-y-2">
    {(milestones || []).map((m) => (
      <li key={m.id} className="flex items-center gap-3">
        <div className="w-5 h-5 rounded flex items-center justify-center border bg-white">
          {Number(m.progress) >= 100 && <FaCheck className="text-xs text-green-700" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-900 truncate" title={m.title}>{m.title}</span>
            <Chip label={`${m.current}/${m.target} ${m.unit}`} />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <ProgressBar value={Number(m.progress) || 0} />
            <span className="text-xs font-semibold text-blue-700 w-10 text-right">{Number(m.progress) || 0}%</span>
          </div>
        </div>
      </li>
    ))}
  </ul>
);

const GoalCard = ({ goal, onOpen }) => {
  const progressTone = getProgressColor(goal.progress);
  const priorityTone = getPriorityColor(goal.priority || "");
  const statusTone = getStatusColor(goal.status);

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 hover:shadow-md transition">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-blue-50 text-blue-700"><FaBullseye /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="font-bold text-blue-900 truncate" title={goal.title}>{goal.title}</h3>
            {goal.category ? <Chip label={goal.category} /> : null}
          </div>

          {goal.description ? (
            <p className="text-sm text-gray-700 mt-1 line-clamp-2">{goal.description}</p>
          ) : null}

          <div className="mt-3 flex items-center gap-3">
            <ProgressBar value={Number(goal.progress) || 0} />
            {/* keep the numeric color via text class only to avoid TS-y class transforms */}
            <span className={`text-xs font-semibold w-10 text-right ${progressTone.split(" ").find((c) => c.startsWith("text-")) || "text-blue-700"}`}>
              {Number(goal.progress) || 0}%
            </span>
          </div>

          <div className="mt-2 text-xs text-gray-600 flex items-center gap-2 flex-wrap">
            {goal.owner ? (
              <span className="inline-flex items-center gap-1"><FaUser /> {goal.owner}</span>
            ) : null}
            {goal.endDate ? (
              <span className="inline-flex items-center gap-1"><FaClock /> Due {new Date(goal.endDate).toLocaleDateString()}</span>
            ) : null}
            {typeof goal.linkedTasks === "number" ? (
              <span className="inline-flex items-center gap-1"><FaTasks /> {goal.linkedTasks} linked tasks</span>
            ) : null}
            {goal.priority ? (
              <Chip label={`Priority: ${goal.priority}`} toneClass={`${priorityTone} border`} />
            ) : null}
            {goal.status ? (
              <Chip label={`Status: ${goal.status}`} toneClass={`${statusTone} border`} />
            ) : null}
          </div>

          {Array.isArray(goal.milestones) && goal.milestones.length ? (
            <div className="mt-3">
              <MilestoneList milestones={goal.milestones} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          className="text-sm font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
          onClick={() => onOpen(goal)}
        >
          <FaLink /> Open details
        </button>
        <Link
          to="/tasks?view=activity-trap"
          className="text-xs text-amber-700 font-semibold hover:underline"
          title="Link unassigned tasks from Activity Trap"
        >
          Link tasks from Activity Trap
        </Link>
      </div>
    </div>
  );
};

// Simple SMART Goal form (JS). Produces an object shaped like items in mockGoals.
const GoalForm = ({ initial = {}, onCancel, onSave }) => {
  const [title, setTitle] = useState(initial.title || "");
  const [category, setCategory] = useState(initial.category || "");
  const [priority, setPriority] = useState(initial.priority || "medium");
  const [owner, setOwner] = useState(initial.owner || "You");
  const [startDate, setStartDate] = useState(initial.startDate || "");
  const [endDate, setEndDate] = useState(initial.endDate || "");
  const [description, setDescription] = useState(initial.description || "");
  const [milestones, setMilestones] = useState(
    initial.milestones || [
      { id: crypto.randomUUID(), title: "Define success metric", target: 100, current: 0, unit: "%", progress: 0, type: "milestone" },
    ]
  );

  const addMilestone = () =>
    setMilestones((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "", target: 100, current: 0, unit: "%", progress: 0, type: "milestone" },
    ]);
  const updateMilestone = (id, patch) =>
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const removeMilestone = (id) => setMilestones((prev) => prev.filter((m) => m.id !== id));

  const recomputeOverall = (list) => {
    if (!list.length) return 0;
    return Math.round(list.reduce((a, b) => a + (Number(b.progress) || 0), 0) / list.length);
  };

  const handleSave = () => {
    if (!title.trim()) return alert("Title is required");
    const overall = recomputeOverall(milestones);
    const goal = {
      id: initial.id || crypto.randomUUID(),
      title: title.trim(),
      description,
      type: "SMART Goal",
      priority,
      status: "active",
      progress: overall,
      owner,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      milestones,
      linkedTasks: 0,
      category: category || undefined,
      tags: [],
    };
    onSave(goal);
  };

  return (
    <div className="bg-white rounded-2xl p-4 border shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <FaBullseye className="text-blue-700" />
        <h3 className="font-bold text-blue-900">Set SMART Goal</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-sm font-semibold">Title
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="e.g., Increase revenue by 25%"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">Category
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="e.g., Business Growth"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">Owner
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">Priority
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold">Start Date
            <input
              type="date"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="text-sm font-semibold">End Date
            <input
              type="date"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>
        <label className="md:col-span-2 text-sm font-semibold">Description (SMART)
          <textarea
            className="mt-1 w-full rounded-lg border px-3 py-2 min-h-[80px]"
            placeholder="Specific, Measurable, Achievable, Relevant, Time-bound"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>

      {/* Milestones */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <FaFlagCheckered className="text-blue-700" />
          <h4 className="font-semibold text-blue-900">Milestones</h4>
        </div>
        <div className="space-y-2">
          {milestones.map((m) => (
            <div key={m.id} className="grid grid-cols-12 gap-2">
              <input
                className="col-span-4 rounded-lg border px-3 py-2"
                placeholder="Milestone title"
                value={m.title}
                onChange={(e) => updateMilestone(m.id, { title: e.target.value })}
              />
              <input
                className="col-span-2 rounded-lg border px-3 py-2"
                placeholder="Target"
                type="number"
                value={m.target}
                onChange={(e) => updateMilestone(m.id, { target: Number(e.target.value) })}
              />
              <input
                className="col-span-2 rounded-lg border px-3 py-2"
                placeholder="Current"
                type="number"
                value={m.current}
                onChange={(e) => updateMilestone(m.id, { current: Number(e.target.value) })}
              />
              <input
                className="col-span-2 rounded-lg border px-3 py-2"
                placeholder="Unit (%, USD)"
                value={m.unit}
                onChange={(e) => updateMilestone(m.id, { unit: e.target.value })}
              />
              <input
                className="col-span-1 rounded-lg border px-3 py-2"
                placeholder="%"
                type="number"
                value={m.progress}
                onChange={(e) => updateMilestone(m.id, { progress: Number(e.target.value) })}
              />
              <button
                className="col-span-1 text-sm text-red-600 font-semibold"
                onClick={() => removeMilestone(m.id)}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={addMilestone}
            className="mt-1 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-blue-700"
          >
            <FaPlus /> Add milestone
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg border px-4 py-2 font-semibold">Cancel</button>
        <button onClick={handleSave} className="rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold">Save Goal</button>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Main Page (JSX)
// -----------------------------------------------------------------------------
const GoalsTrackingPage = () => {
  const [goals, setGoals] = useState(Array.isArray(mockGoals) ? mockGoals : []);

  const [view, setView] = useState("list"); // "list" | "kanban" | "timeline"
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [activeGoal, setActiveGoal] = useState(null);

  const allCategories = useMemo(() => {
    const setCat = new Set((goals || []).map((g) => g.category).filter(Boolean));
    return Array.from(setCat);
  }, [goals]);

  const filtered = useMemo(() => {
    return (goals || []).filter((g) => {
      const matchesQuery = [g.title, g.description, g.category, Array.isArray(g.tags) ? g.tags.join(" ") : ""]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesCategory = category === "all" ? true : g.category === category;
      const matchesPriority = priority === "all" ? true : (g.priority || "") === priority;
      const matchesStatus = status === "all" ? true : g.status === status;
      return matchesQuery && matchesCategory && matchesPriority && matchesStatus;
    });
  }, [goals, query, category, priority, status]);

  const stats = useMemo(() => getGoalStatistics(goals), [goals]);

  const upsertGoal = (goal) => {
    setGoals((prev) => {
      const exists = prev.some((g) => g.id === goal.id);
      if (exists) return prev.map((g) => (g.id === goal.id ? goal : g));
      return [goal, ...prev];
    });
    setShowForm(false);
  };

  const openDetails = (g) => setActiveGoal(g);
  const closeDetails = () => setActiveGoal(null);

  const ListView = (
    <div className="grid lg:grid-cols-2 gap-4">
      {filtered.map((g) => (
        <GoalCard key={g.id} goal={g} onOpen={openDetails} />
      ))}
      {!filtered.length && (
        <div className="rounded-2xl border p-8 text-center text-gray-600">
          No goals match your filters.
        </div>
      )}
    </div>
  );

  const KanbanView = (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
      {["active", "paused", "cancelled", "completed"].map((col) => (
        <div key={col} className="bg-white rounded-2xl border p-4">
          <div className="flex items-center gap-2 mb-3">
            <FaThLarge className="text-blue-700" />
            <h4 className="font-bold text-blue-900 capitalize">{col}</h4>
          </div>
          <div className="space-y-3 min-h-[120px]">
            {filtered.filter((g) => g.status === col).map((g) => (
              <GoalCard key={g.id} goal={g} onOpen={openDetails} />
            ))}
            {filtered.filter((g) => g.status === col).length === 0 && (
              <div className="text-sm text-gray-500">No items</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const TimelineView = (
    <div className="bg-white rounded-2xl border p-4">
      <div className="flex items-center gap-2 mb-3">
        <FaStream className="text-blue-700" />
        <h4 className="font-bold text-blue-900">Timeline</h4>
      </div>
      <ol className="relative border-s">
        {filtered
          .slice()
          .sort((a, b) => (a.endDate || "").localeCompare(b.endDate || ""))
          .map((g) => (
            <li key={g.id} className="ms-4 mb-6">
              <div className="absolute w-2 h-2 bg-blue-600 rounded-full -left-1 mt-2" />
              <div className="flex items-center gap-2">
                <h5 className="font-semibold text-blue-900">{g.title}</h5>
                {g.endDate ? <Chip label={`Due ${new Date(g.endDate).toLocaleDateString()}`} /> : null}
                {g.category ? <Chip label={g.category} /> : null}
              </div>
              <p className="text-sm text-gray-700 mt-1">{g.description}</p>
            </li>
          ))}
      </ol>
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-700"><FaBullseye /></div>
          <div>
            <h1 className="text-xl lg:text-2xl font-extrabold text-blue-900">Goals & Tracking</h1>
            <p className="text-sm text-gray-700">Create SMART goals, track milestones, link tasks from Activity Trap, and visualize progress.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-2 font-bold shadow">
            <FaPlus /> New Goal
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.totalGoals} />
        <StatCard label="Active" value={stats.activeGoals} />
        <StatCard label="Completed" value={stats.completedGoals} />
        <StatCard label="On Track (>=70%)" value={stats.onTrackGoals} tone="success" />
        <StatCard label="At Risk (<50%)" value={stats.atRiskGoals} tone="danger" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-blue-50 rounded-xl px-3 py-2">
            <FaSearch className="text-blue-700 mr-2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search goals, tags, owner"
              className="bg-transparent outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <FaFilter className="text-blue-700" />
            <select className="rounded-lg border px-2 py-1 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select className="rounded-lg border px-2 py-1 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select className="rounded-lg border px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setView("list")} className={`rounded-lg px-3 py-2 text-sm font-semibold border ${view === "list" ? "bg-blue-600 text-white" : ""}`} title="List view">
              <FaListUl />
            </button>
            <button onClick={() => setView("kanban")} className={`rounded-lg px-3 py-2 text-sm font-semibold border ${view === "kanban" ? "bg-blue-600 text-white" : ""}`} title="Kanban view">
              <FaThLarge />
            </button>
            <button onClick={() => setView("timeline")} className={`rounded-lg px-3 py-2 text-sm font-semibold border ${view === "timeline" ? "bg-blue-600 text-white" : ""}`} title="Timeline">
              <FaStream />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === "list" && ListView}
      {view === "kanban" && KanbanView}
      {view === "timeline" && TimelineView}

      {/* Drawer / Modal area */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50" role="dialog" aria-modal>
          <div className="w-[min(980px,96vw)]">
            <GoalForm onCancel={() => setShowForm(false)} onSave={upsertGoal} />
          </div>
        </div>
      )}

      {activeGoal && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50" role="dialog" aria-modal>
          <div className="w-[min(900px,96vw)] bg-white rounded-2xl p-4 border shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <FaBullseye className="text-blue-700" />
              <h3 className="font-bold text-blue-900">{activeGoal.title}</h3>
              <span className="ml-auto" />
              <button onClick={closeDetails} className="rounded-lg border px-3 py-1 text-sm">Close</button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-3">
                <div className="rounded-xl border p-3">
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><FaTags /> Details</h4>
                  <div className="text-sm text-gray-800 whitespace-pre-line">{activeGoal.description}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><FaFlagCheckered /> Milestones</h4>
                  <MilestoneList milestones={activeGoal.milestones} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border p-3">
                  <h4 className="font-semibold mb-1 flex items-center gap-2"><FaCalendarAlt /> Dates</h4>
                  <p className="text-sm text-gray-700">Start: {activeGoal.startDate ? new Date(activeGoal.startDate).toLocaleDateString() : "—"}</p>
                  <p className="text-sm text-gray-700">End: {activeGoal.endDate ? new Date(activeGoal.endDate).toLocaleDateString() : "—"}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <h4 className="font-semibold mb-1 flex items-center gap-2"><FaLink /> Linked</h4>
                  <p className="text-sm text-gray-700">{(activeGoal.linkedTasks || 0)} tasks linked. <Link to="/tasks?view=activity-trap" className="text-blue-700 font-semibold hover:underline">Activity Trap</Link></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsTrackingPage;

// -----------------------------------------------------------------------------
// Small stat card
// -----------------------------------------------------------------------------
const StatCard = ({ label, value, tone = "default" }) => {
  const toneMap = {
    success: "bg-green-50 text-green-800 border-green-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-red-50 text-red-800 border-red-200",
    default: "bg-blue-50 text-blue-800 border-blue-200",
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone] || toneMap.default}`}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-2xl font-extrabold">{value}</div>
    </div>
  );
};