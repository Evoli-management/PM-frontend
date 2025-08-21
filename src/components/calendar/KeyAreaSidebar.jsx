import React from "react";

const STATUS_ICONS = {
  pending: "⏳",
  completed: "✅",
  missed: "❌"
};

export default function KeyAreaSidebar({ items, onAdd, onEdit }) {
  return (
    <div className="w-80 bg-gray-50 p-4 rounded shadow">
      <h3 className="text-xl font-bold mb-4">Tasks</h3>
      <ul className="mb-6">
        {items.filter(i=>i.type==="task").map(item => (
          <li key={item.id} className="flex items-center gap-2 mb-2">
            <span>{STATUS_ICONS[item.status]}</span>
            <span className="flex-1">{item.title}</span>
            <button className="text-xs px-2 py-1 bg-blue-100 rounded" onClick={()=>onEdit(item)}>Edit</button>
          </li>
        ))}
      </ul>
      <button className="w-full bg-blue-500 text-white py-2 rounded mb-4" onClick={onAdd}>+ Add Task</button>
      <h3 className="text-xl font-bold mb-4">Activities</h3>
      <ul>
        {items.filter(i=>i.type==="activity").map(item => (
          <li key={item.id} className="flex items-center gap-2 mb-2">
            <span>{STATUS_ICONS[item.status]}</span>
            <span className="flex-1">{item.title}</span>
            <button className="text-xs px-2 py-1 bg-blue-100 rounded" onClick={()=>onEdit(item)}>Edit</button>
          </li>
        ))}
      </ul>
      <button className="w-full bg-blue-500 text-white py-2 rounded" onClick={onAdd}>+ Add Activity</button>
    </div>
  );
}
