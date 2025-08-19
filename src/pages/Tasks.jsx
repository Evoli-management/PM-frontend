import Sidebar from "../components/shared/Sidebar.jsx";
import React, { useState } from "react";
export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [tag, setTag] = useState("");
  const [priority, setPriority] = useState("normal");
  const [recurring, setRecurring] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editValue, setEditValue] = useState("");

  const teamMembers = ["Hussein", "Sara", "Ali", "Fatima"];
  const tags = ["urgent", "review", "meeting", "normal"];
  const priorities = ["high", "normal", "low"];

  const handleAddTask = () => {
    if (newTask.trim()) {
      setTasks([
        ...tasks,
        {
          name: newTask,
          completed: false,
          tag,
          priority,
          recurring,
          assignee,
        },
      ]);
      setNewTask("");
      setTag("");
      setPriority("normal");
      setRecurring(false);
      setAssignee("");
    }
  };

  const handleToggleTask = idx => {
    setTasks(tasks.map((task, i) => i === idx ? { ...task, completed: !task.completed } : task));
  };

  const handleDeleteTask = idx => {
    setTasks(tasks.filter((_, i) => i !== idx));
  };

  const handleEditTask = idx => {
    setEditIdx(idx);
    setEditValue(tasks[idx].name);
  };

  const handleSaveEdit = idx => {
    setTasks(tasks.map((task, i) => i === idx ? { ...task, name: editValue } : task));
    setEditIdx(null);
    setEditValue("");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={{ name: "Hussein" }} />
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-blue-700">Tasks & Activities</h1>
          <p className="text-gray-500 text-sm">Create, manage, and track your tasks and activities. Tag, prioritize, assign, and set recurring tasks.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-xl mx-auto">
          <div className="flex flex-col md:flex-row gap-2 mb-4">
            <input
              type="text"
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              placeholder="Add a new task or activity..."
              className="flex-1 px-3 py-2 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <select value={tag} onChange={e => setTag(e.target.value)} className="px-2 py-2 border rounded text-sm">
              <option value="">Tag</option>
              {tags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="px-2 py-2 border rounded text-sm">
              {priorities.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <select value={assignee} onChange={e => setAssignee(e.target.value)} className="px-2 py-2 border rounded text-sm">
              <option value="">Assign to</option>
              {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <label className="flex items-center gap-1 text-sm">
              <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} /> Recurring
            </label>
            <button
              onClick={handleAddTask}
              className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700"
            >Add</button>
          </div>
          <ul>
            {tasks.length === 0 ? (
              <li className="text-gray-400 text-center py-4">No tasks or activities yet.</li>
            ) : (
              tasks.map((task, idx) => (
                <li key={idx} className="flex flex-col md:flex-row md:items-center justify-between py-2 border-b last:border-b-0 gap-2">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 flex-1">
                    {editIdx === idx ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="px-2 py-1 border rounded"
                      />
                    ) : (
                      <span className={task.completed ? "line-through text-gray-400" : "text-gray-700 font-semibold"}>{task.name}</span>
                    )}
                    {task.tag && <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-bold">{task.tag}</span>}
                    <span className={`px-2 py-1 rounded text-xs font-bold ${task.priority === "high" ? "bg-red-100 text-red-700" : task.priority === "low" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>{task.priority}</span>
                    {task.recurring && <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs font-bold">Recurring</span>}
                    {task.assignee && <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs font-bold">{task.assignee}</span>}
                  </div>
                  <div className="flex gap-2">
                    {editIdx === idx ? (
                      <button onClick={() => handleSaveEdit(idx)} className="bg-green-600 text-white px-3 py-1 rounded">Save</button>
                    ) : (
                      <>
                        <button onClick={() => handleEditTask(idx)} className="bg-blue-200 text-blue-700 px-3 py-1 rounded">Edit</button>
                        <button onClick={() => handleToggleTask(idx)} className={`px-3 py-1 rounded ${task.completed ? "bg-green-200 text-green-700" : "bg-blue-200 text-blue-700"}`}>{task.completed ? "Done" : "Mark Done"}</button>
                        <button onClick={() => handleDeleteTask(idx)} className="bg-red-200 text-red-700 px-3 py-1 rounded">Delete</button>
                      </>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}
