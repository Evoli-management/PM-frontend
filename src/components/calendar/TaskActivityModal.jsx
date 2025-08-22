import React, { useState } from "react";

export default function TaskActivityModal({ item, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(item || { title: "", type: "task", date: "", time: "", status: "pending", description: "" });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <form className="bg-white rounded shadow-lg p-6 w-96" onSubmit={handleSubmit}>
        <h2 className="text-xl font-bold mb-4">{item ? "Edit" : "Add"} Task/Activity</h2>
        <input name="title" value={form.title} onChange={handleChange} placeholder="Title" className="w-full mb-2 px-3 py-2 border rounded" required />
        <select name="type" value={form.type} onChange={handleChange} className="w-full mb-2 px-3 py-2 border rounded">
          <option value="task">Task</option>
          <option value="activity">Activity</option>
        </select>
        <input name="date" type="date" value={form.date} onChange={handleChange} className="w-full mb-2 px-3 py-2 border rounded" required />
        <input name="time" type="time" value={form.time} onChange={handleChange} className="w-full mb-2 px-3 py-2 border rounded" />
        <select name="status" value={form.status} onChange={handleChange} className="w-full mb-2 px-3 py-2 border rounded">
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="missed">Missed</option>
        </select>
        <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description" className="w-full mb-2 px-3 py-2 border rounded" />
        <div className="flex gap-2 mt-4">
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
          {item && <button type="button" className="bg-red-500 text-white px-4 py-2 rounded" onClick={()=>{onDelete(item.id); onClose();}}>Delete</button>}
          <button type="button" className="bg-gray-200 px-4 py-2 rounded" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
