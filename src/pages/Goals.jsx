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
  FaTimes,
  FaEdit,
  FaTrash,
  FaSave,
  FaArrowUp,
  FaArrowDown,
  FaExclamationTriangle
} from "react-icons/fa";
import Sidebar from "../components/shared/Sidebar";

// Mock data and utilities
const mockGoals = [
  {
    id: "g1",
    title: "Increase Monthly Revenue",
    description: "Grow monthly recurring revenue by 25% through improved sales processes and customer retention strategies.",
    type: "SMART Goal",
    priority: "high",
    status: "active",
    progress: 65,
    owner: "Sarah Johnson",
    startDate: "2025-01-01",
    endDate: "2025-06-30",
    category: "Business Growth",
    linkedTasks: 8,
    milestones: [
      { id: "m1", title: "Implement new CRM system", target: 100, current: 100, unit: "%", progress: 100, type: "milestone" },
      { id: "m2", title: "Train sales team", target: 100, current: 80, unit: "%", progress: 80, type: "milestone" },
      { id: "m3", title: "Launch customer retention program", target: 100, current: 30, unit: "%", progress: 30, type: "milestone" }
    ],
    tags: ["revenue", "sales", "growth"]
  },
  {
    id: "g2",
    title: "Improve Customer Satisfaction",
    description: "Achieve 90% customer satisfaction score through enhanced support processes and product improvements.",
    type: "SMART Goal",
    priority: "medium",
    status: "active",
    progress: 78,
    owner: "Mike Chen",
    startDate: "2025-02-01",
    endDate: "2025-08-31",
    category: "Customer Success",
    linkedTasks: 5,
    milestones: [
      { id: "m4", title: "Implement support ticket system", target: 100, current: 100, unit: "%", progress: 100, type: "milestone" },
      { id: "m5", title: "Conduct customer surveys", target: 100, current: 75, unit: "%", progress: 75, type: "milestone" },
      { id: "m6", title: "Product feature improvements", target: 100, current: 55, unit: "%", progress: 55, type: "milestone" }
    ],
    tags: ["customer", "satisfaction", "support"]
  },
  {
    id: "g3",
    title: "Launch New Product Line",
    description: "Successfully launch our new eco-friendly product line with market penetration of 15% in target segments.",
    type: "SMART Goal",
    priority: "high",
    status: "active",
    progress: 42,
    owner: "Emma Rodriguez",
    startDate: "2025-01-15",
    endDate: "2025-12-31",
    category: "Product Development",
    linkedTasks: 12,
    milestones: [
      { id: "m7", title: "Complete market research", target: 100, current: 100, unit: "%", progress: 100, type: "milestone" },
      { id: "m8", title: "Develop product prototypes", target: 100, current: 85, unit: "%", progress: 85, type: "milestone" },
      { id: "m9", title: "Launch marketing campaign", target: 100, current: 0, unit: "%", progress: 0, type: "milestone" }
    ],
    tags: ["product", "launch", "eco-friendly"]
  },
  {
    id: "g4",
    title: "Reduce Operational Costs",
    description: "Reduce operational costs by 20% while maintaining service quality through process optimization and automation.",
    type: "SMART Goal",
    priority: "medium",
    status: "completed",
    progress: 100,
    owner: "David Kim",
    startDate: "2024-09-01",
    endDate: "2025-03-31",
    category: "Operations",
    linkedTasks: 3,
    milestones: [
      { id: "m10", title: "Automate invoice processing", target: 100, current: 100, unit: "%", progress: 100, type: "milestone" },
      { id: "m11", title: "Optimize supply chain", target: 100, current: 100, unit: "%", progress: 100, type: "milestone" },
      { id: "m12", title: "Implement energy savings", target: 100, current: 100, unit: "%", progress: 100, type: "milestone" }
    ],
    tags: ["costs", "optimization", "automation"]
  }
];

const getGoalStatistics = (goals) => {
  const totalGoals = goals.length;
  const activeGoals = goals.filter(g => g.status === "active").length;
  const completedGoals = goals.filter(g => g.status === "completed").length;
  const onTrackGoals = goals.filter(g => g.progress >= 70).length;
  const atRiskGoals = goals.filter(g => g.progress < 50 && g.status === "active").length;
  
  return { totalGoals, activeGoals, completedGoals, onTrackGoals, atRiskGoals };
};

const getProgressColor = (progress) => {
  if (progress >= 80) return "bg-green-50 text-green-700 border-green-200";
  if (progress >= 60) return "bg-blue-50 text-blue-700 border-blue-200";
  if (progress >= 40) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-red-50 text-red-700 border-red-200";
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case "high": return "bg-red-50 text-red-700 border-red-200";
    case "medium": return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "low": return "bg-green-50 text-green-700 border-green-200";
    default: return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "active": return "bg-blue-50 text-blue-700 border-blue-200";
    case "completed": return "bg-green-50 text-green-700 border-green-200";
    case "paused": return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "cancelled": return "bg-gray-50 text-gray-700 border-gray-200";
    default: return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

// Components
const Chip = ({ label, toneClass = "", className = "", ...rest }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
      toneClass || "border-blue-200 bg-blue-50 text-blue-700"
    } ${className}`}
    {...rest}
  >
    {label}
  </span>
);

const ProgressBar = ({ value }) => (
  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden" aria-label="Progress">
    <div 
      className={`h-full transition-all duration-300 ${
        value >= 80 ? 'bg-green-600' : 
        value >= 60 ? 'bg-blue-600' : 
        value >= 40 ? 'bg-yellow-600' : 'bg-red-600'
      }`} 
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }} 
    />
  </div>
);

const MilestoneList = ({ milestones, onUpdate, readOnly = false }) => (
  <ul className="space-y-3">
    {(milestones || []).map((m) => (
      <li key={m.id} className="flex items-center gap-3">
        <div className={`w-5 h-5 rounded flex items-center justify-center border ${
          Number(m.progress) >= 100 ? 'bg-green-100 border-green-300' : 'bg-white border-slate-300'
        }`}>
          {Number(m.progress) >= 100 && <FaCheck className="text-xs text-green-700" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-900 truncate" title={m.title}>{m.title}</span>
            <Chip label={`${m.current}/${m.target} ${m.unit}`} />
          </div>
          <div className="flex items-center gap-2">
            <ProgressBar value={Number(m.progress) || 0} />
            <span className="text-xs font-semibold text-slate-700 w-10 text-right">{Number(m.progress) || 0}%</span>
          </div>
          {!readOnly && (
            <div className="mt-1 flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={Number(m.progress) || 0}
                onChange={(e) => onUpdate && onUpdate(m.id, { progress: Number(e.target.value) })}
                className="w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-slate-600">Update progress</span>
            </div>
          )}
        </div>
      </li>
    ))}
  </ul>
);

const GoalCard = ({ goal, onOpen, onEdit, onDelete }) => {
  const progressTone = getProgressColor(goal.progress);
  const priorityTone = getPriorityColor(goal.priority || "");
  const statusTone = getStatusColor(goal.status);

  const isOverdue = goal.endDate && new Date(goal.endDate) < new Date() && goal.status === 'active';
  const daysUntilDue = goal.endDate ? Math.ceil((new Date(goal.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border hover:shadow-md transition-shadow p-4 ${
      isOverdue ? 'border-red-200 bg-red-50/30' : ''
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-xl ${
            goal.status === 'completed' ? 'bg-green-50 text-green-700' :
            goal.status === 'paused' ? 'bg-yellow-50 text-yellow-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            <FaBullseye />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <h3 className="font-bold text-slate-900 truncate" title={goal.title}>{goal.title}</h3>
              {isOverdue && <FaExclamationTriangle className="text-red-600 mt-1 flex-shrink-0" />}
            </div>
            {goal.category && <Chip label={goal.category} className="mb-2" />}
            {goal.description && (
              <p className="text-sm text-slate-700 mb-3 line-clamp-2">{goal.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(goal)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            title="Edit goal"
          >
            <FaEdit className="text-xs" />
          </button>
          <button
            onClick={() => onDelete(goal)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600"
            title="Delete goal"
          >
            <FaTrash className="text-xs" />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-slate-700">Progress</span>
          <span className="text-xs font-semibold text-slate-900">{Number(goal.progress) || 0}%</span>
        </div>
        <ProgressBar value={Number(goal.progress) || 0} />
      </div>

      <div className="text-xs text-slate-600 flex items-center gap-4 flex-wrap mb-3">
        {goal.owner && (
          <span className="inline-flex items-center gap-1"><FaUser /> {goal.owner}</span>
        )}
        {goal.endDate && (
          <span className={`inline-flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
            <FaClock /> 
            {isOverdue ? 'Overdue' : daysUntilDue > 0 ? `${daysUntilDue}d left` : 'Due today'}
          </span>
        )}
        {typeof goal.linkedTasks === "number" && (
          <span className="inline-flex items-center gap-1"><FaTasks /> {goal.linkedTasks} tasks</span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        {goal.priority && (
          <Chip label={goal.priority} toneClass={`${priorityTone} border`} />
        )}
        {goal.status && (
          <Chip label={goal.status} toneClass={`${statusTone} border`} />
        )}
      </div>

      {Array.isArray(goal.milestones) && goal.milestones.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-slate-700 mb-2">Key Milestones</div>
          <MilestoneList milestones={goal.milestones.slice(0, 2)} readOnly />
          {goal.milestones.length > 2 && (
            <div className="text-xs text-slate-500 mt-1">+{goal.milestones.length - 2} more milestones</div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          className="text-sm font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
          onClick={() => onOpen(goal)}
        >
          <FaLink /> View Details
        </button>
        <Link
          to="/tasks?view=activity-trap"
          className="text-xs text-amber-700 font-semibold hover:underline"
          title="Link unassigned tasks from Activity Trap"
        >
          Link Tasks
        </Link>
      </div>
    </div>
  );
};

const GoalForm = ({ initial = {}, onCancel, onSave }) => {
  const [title, setTitle] = useState(initial.title || "");
  const [category, setCategory] = useState(initial.category || "");
  const [priority, setPriority] = useState(initial.priority || "medium");
  const [status, setStatus] = useState(initial.status || "active");
  const [owner, setOwner] = useState(initial.owner || "");
  const [startDate, setStartDate] = useState(initial.startDate || "");
  const [endDate, setEndDate] = useState(initial.endDate || "");
  const [description, setDescription] = useState(initial.description || "");
  const [tags, setTags] = useState(Array.isArray(initial.tags) ? initial.tags.join(", ") : "");
  const [milestones, setMilestones] = useState(
    initial.milestones || [
      { id: crypto.randomUUID(), title: "Define success metrics", target: 100, current: 0, unit: "%", progress: 0, type: "milestone" },
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
      status,
      progress: overall,
      owner: owner.trim() || "Unassigned",
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      milestones,
      linkedTasks: initial.linkedTasks || 0,
      category: category.trim() || undefined,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    };
    onSave(goal);
  };

  return (
    <div className="bg-white rounded-2xl p-6 border shadow-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FaBullseye className="text-blue-700 text-xl" />
          <h3 className="text-xl font-bold text-slate-900">
            {initial.id ? "Edit Goal" : "Create New SMART Goal"}
          </h3>
        </div>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-100">
          <FaTimes />
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Title *</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Increase revenue by 25%"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Category</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Business Growth"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Owner</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Who's responsible?"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Priority</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Status</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Start Date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">End Date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Tags</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., revenue, sales, growth (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Description (SMART)</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
              placeholder="Specific, Measurable, Achievable, Relevant, Time-bound description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FaFlagCheckered className="text-blue-700" />
                <h4 className="font-semibold text-slate-900">Milestones</h4>
              </div>
              <button
                onClick={addMilestone}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 px-3 py-1 text-sm font-semibold hover:bg-blue-100"
              >
                <FaPlus className="text-xs" /> Add
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {milestones.map((m, index) => (
                <div key={m.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="space-y-2">
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Milestone title"
                      value={m.title}
                      onChange={(e) => updateMilestone(m.id, { title: e.target.value })}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Target"
                        type="number"
                        value={m.target}
                        onChange={(e) => updateMilestone(m.id, { target: Number(e.target.value) })}
                      />
                      <input
                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Current"
                        type="number"
                        value={m.current}
                        onChange={(e) => updateMilestone(m.id, { current: Number(e.target.value) })}
                      />
                      <input
                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Unit"
                        value={m.unit}
                        onChange={(e) => updateMilestone(m.id, { unit: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        type="range"
                        min="0"
                        max="100"
                        value={m.progress}
                        onChange={(e) => updateMilestone(m.id, { progress: Number(e.target.value) })}
                      />
                      <span className="text-sm font-semibold text-slate-700 w-12">{m.progress}%</span>
                      <button
                        onClick={() => removeMilestone(m.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Remove milestone"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t">
        <button 
          onClick={onCancel} 
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
        >
          Cancel
        </button>
        <button 
          onClick={handleSave} 
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center gap-2"
        >
          <FaSave /> {initial.id ? "Update" : "Create"} Goal
        </button>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, tone = "default", icon }) => {
  const toneMap = {
    success: "bg-green-50 text-green-800 border-green-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-red-50 text-red-800 border-red-200",
    default: "bg-blue-50 text-blue-800 border-blue-200",
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone] || toneMap.default}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <div className="text-sm font-semibold">{label}</div>
      </div>
      <div className="text-2xl font-extrabold">{value}</div>
    </div>
  );
};

// Main Component
const GoalsTrackingPage = () => {
  const [goals, setGoals] = useState(mockGoals);
  const [view, setView] = useState("list");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
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
    setEditingGoal(null);
  };

  const deleteGoal = (goalToDelete) => {
    if (confirm(`Are you sure you want to delete "${goalToDelete.title}"?`)) {
      setGoals(prev => prev.filter(g => g.id !== goalToDelete.id));
    }
  };

  const updateMilestoneProgress = (goalId, milestoneId, updates) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      
      const updatedMilestones = goal.milestones.map(m => 
        m.id === milestoneId ? { ...m, ...updates } : m
      );
      
      const newProgress = Math.round(
        updatedMilestones.reduce((sum, m) => sum + (Number(m.progress) || 0), 0) / updatedMilestones.length
      );
      
      return { ...goal, milestones: updatedMilestones, progress: newProgress };
    }));
  };

  const openDetails = (g) => setActiveGoal(g);
  const closeDetails = () => setActiveGoal(null);

  const ListView = (
    <div className="grid lg:grid-cols-2 gap-6">
      {filtered.map((g) => (
        <GoalCard 
          key={g.id} 
          goal={g} 
          onOpen={openDetails} 
          onEdit={(goal) => {
            setEditingGoal(goal);
            setShowForm(true);
          }}
          onDelete={deleteGoal}
        />
      ))}
      {!filtered.length && (
        <div className="lg:col-span-2 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
          <FaBullseye className="mx-auto text-4xl text-slate-400 mb-3" />
          <div className="text-lg font-semibold text-slate-900 mb-1">No goals found</div>
          <div className="text-sm text-slate-600">
            {query || category !== "all" || priority !== "all" || status !== "all" 
              ? "Try adjusting your filters or search terms"
              : "Create your first SMART goal to get started"
            }
          </div>
        </div>
      )}
    </div>
  );

  const KanbanView = (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
      {["active", "paused", "completed", "cancelled"].map((col) => {
        const columnGoals = filtered.filter((g) => g.status === col);
        return (
          <div key={col} className="bg-slate-50 rounded-2xl border p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  col === 'active' ? 'bg-blue-500' :
                  col === 'completed' ? 'bg-green-500' :
                  col === 'paused' ? 'bg-yellow-500' : 'bg-gray-500'
                }`} />
                <h4 className="font-bold text-slate-900 capitalize">{col}</h4>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-1 rounded-full">
                {columnGoals.length}
              </span>
            </div>
            <div className="space-y-3 min-h-[200px]">
              {columnGoals.map((g) => (
                <div key={g.id} className="bg-white rounded-xl border p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h5 className="font-semibold text-slate-900 text-sm line-clamp-2">{g.title}</h5>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingGoal(g);
                          setShowForm(true);
                        }}
                        className="p-1 text-slate-500 hover:text-blue-600"
                      >
                        <FaEdit className="text-xs" />
                      </button>
                    </div>
                  </div>
                  {g.category && <Chip label={g.category} className="mb-2" />}
                  <div className="mb-2">
                    <ProgressBar value={Number(g.progress) || 0} />
                  </div>
                  <div className="text-xs text-slate-600 flex items-center justify-between">
                    <span>{g.progress || 0}% complete</span>
                    <button
                      onClick={() => openDetails(g)}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
              {columnGoals.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-8">No goals</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const TimelineView = (
    <div className="bg-white rounded-2xl border p-6">
      <div className="flex items-center gap-2 mb-6">
        <FaStream className="text-blue-700" />
        <h4 className="font-bold text-slate-900">Goals Timeline</h4>
      </div>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
        <div className="space-y-6">
          {filtered
            .slice()
            .sort((a, b) => (a.endDate || "9999-12-31").localeCompare(b.endDate || "9999-12-31"))
            .map((g, index) => {
              const isOverdue = g.endDate && new Date(g.endDate) < new Date() && g.status === 'active';
              return (
                <div key={g.id} className="relative flex items-start gap-4">
                  <div className={`absolute left-0 w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                    g.status === 'completed' ? 'bg-green-500' :
                    isOverdue ? 'bg-red-500' :
                    g.status === 'active' ? 'bg-blue-500' :
                    'bg-gray-400'
                  }`}>
                    {g.status === 'completed' && <FaCheck className="text-white text-xs" />}
                    {isOverdue && <FaExclamationTriangle className="text-white text-xs" />}
                  </div>
                  <div className="ml-12 flex-1 bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h5 className="font-semibold text-slate-900">{g.title}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          {g.endDate && (
                            <Chip label={`Due ${new Date(g.endDate).toLocaleDateString()}`} 
                                  toneClass={isOverdue ? "bg-red-50 text-red-700 border-red-200" : ""} />
                          )}
                          {g.category && <Chip label={g.category} />}
                          <Chip label={`${g.progress || 0}% complete`} />
                        </div>
                      </div>
                      <button
                        onClick={() => openDetails(g)}
                        className="text-blue-600 hover:underline text-sm font-semibold"
                      >
                        View Details
                      </button>
                    </div>
                    {g.description && (
                      <p className="text-sm text-slate-700 mb-2 line-clamp-2">{g.description}</p>
                    )}
                    <ProgressBar value={Number(g.progress) || 0} />
                  </div>
                </div>
              );
            })}
          {filtered.length === 0 && (
            <div className="text-center text-slate-500 py-8">No goals to display in timeline</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-700">
              <FaBullseye className="text-xl" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900">Goals & Tracking</h1>
              <p className="text-sm text-slate-700 mt-1">
                Create SMART goals, track milestones, and visualize your progress toward success.
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setEditingGoal(null);
              setShowForm(true);
            }} 
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-3 font-bold shadow-lg hover:bg-blue-700 transition-colors"
          >
            <FaPlus /> New Goal
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Goals" value={stats.totalGoals} icon={<FaBullseye />} />
          <StatCard label="Active" value={stats.activeGoals} icon={<FaArrowUp />} />
          <StatCard label="Completed" value={stats.completedGoals} tone="success" icon={<FaCheck />} />
          <StatCard label="On Track (≥70%)" value={stats.onTrackGoals} tone="success" icon={<FaArrowUp />} />
          <StatCard label="At Risk (<50%)" value={stats.atRiskGoals} tone="danger" icon={<FaExclamationTriangle />} />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-slate-50 rounded-xl px-3 py-2 border">
              <FaSearch className="text-slate-600 mr-2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search goals, descriptions, tags..."
                className="bg-transparent outline-none text-sm w-64"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <FaFilter className="text-slate-600" />
              <select 
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {allCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              
              <select 
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
              
              <select 
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button 
                onClick={() => setView("list")} 
                className={`rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                  view === "list" ? "bg-blue-600 text-white border-blue-600" : "text-slate-700 border-slate-300 hover:bg-slate-50"
                }`} 
                title="List view"
              >
                <FaListUl />
              </button>
              <button 
                onClick={() => setView("kanban")} 
                className={`rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                  view === "kanban" ? "bg-blue-600 text-white border-blue-600" : "text-slate-700 border-slate-300 hover:bg-slate-50"
                }`} 
                title="Kanban view"
              >
                <FaThLarge />
              </button>
              <button 
                onClick={() => setView("timeline")} 
                className={`rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                  view === "timeline" ? "bg-blue-600 text-white border-blue-600" : "text-slate-700 border-slate-300 hover:bg-slate-50"
                }`} 
                title="Timeline view"
              >
                <FaStream />
              </button>
            </div>
          </div>
        </div>

        {/* Content Views */}
        {view === "list" && ListView}
        {view === "kanban" && KanbanView}
        {view === "timeline" && TimelineView}

        {/* Goal Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForm(false);
              setEditingGoal(null);
            }
          }}>
            <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
              <GoalForm 
                initial={editingGoal || {}} 
                onCancel={() => {
                  setShowForm(false);
                  setEditingGoal(null);
                }} 
                onSave={upsertGoal} 
              />
            </div>
          </div>
        )}

        {/* Goal Details Modal */}
        {activeGoal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => {
            if (e.target === e.currentTarget) closeDetails();
          }}>
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      activeGoal.status === 'completed' ? 'bg-green-50 text-green-700' :
                      activeGoal.status === 'paused' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      <FaBullseye />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{activeGoal.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {activeGoal.category && <Chip label={activeGoal.category} />}
                        <Chip label={`${activeGoal.progress || 0}% Complete`} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingGoal(activeGoal);
                        setShowForm(true);
                        closeDetails();
                      }}
                      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                      title="Edit goal"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      onClick={closeDetails} 
                      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-6">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <FaTags className="text-blue-700" /> Description & Details
                      </h4>
                      <div className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                        {activeGoal.description || "No description provided."}
                      </div>
                      {activeGoal.tags && activeGoal.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {activeGoal.tags.map((tag, i) => (
                            <Chip key={i} label={tag} className="text-xs" />
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <FaFlagCheckered className="text-blue-700" /> Milestones & Progress
                      </h4>
                      <MilestoneList 
                        milestones={activeGoal.milestones} 
                        onUpdate={(milestoneId, updates) => 
                          updateMilestoneProgress(activeGoal.id, milestoneId, updates)
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <FaUser className="text-blue-700" /> Assignment & Priority
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Owner:</span>
                          <span className="font-semibold">{activeGoal.owner || "Unassigned"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Priority:</span>
                          <Chip 
                            label={activeGoal.priority || "medium"} 
                            toneClass={getPriorityColor(activeGoal.priority)} 
                          />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Status:</span>
                          <Chip 
                            label={activeGoal.status || "active"} 
                            toneClass={getStatusColor(activeGoal.status)} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <FaCalendarAlt className="text-blue-700" /> Timeline
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Start:</span>
                          <span className="font-semibold">
                            {activeGoal.startDate ? new Date(activeGoal.startDate).toLocaleDateString() : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">End:</span>
                          <span className={`font-semibold ${
                            activeGoal.endDate && new Date(activeGoal.endDate) < new Date() && activeGoal.status === 'active'
                              ? 'text-red-600' : ''
                          }`}>
                            {activeGoal.endDate ? new Date(activeGoal.endDate).toLocaleDateString() : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <FaLink className="text-blue-700" /> Linked Tasks
                      </h4>
                      <div className="text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-600">Connected tasks:</span>
                          <span className="font-bold text-lg">{activeGoal.linkedTasks || 0}</span>
                        </div>
                        <Link 
                          to="/tasks?view=activity-trap" 
                          className="text-amber-700 font-semibold hover:underline text-sm block"
                        >
                          → Link tasks from Activity Trap
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GoalsTrackingPage;