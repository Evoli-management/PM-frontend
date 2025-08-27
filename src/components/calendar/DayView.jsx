
import React from "react";
import { FixedSizeList } from "react-window";
import AvailabilityBlock from "./AvailabilityBlock";

// 00:00–23:30, half-hour increments
const hours = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${h.toString().padStart(2, "0")}:${m}`;
});

export default function DayView({ events, todos, categories, onTaskDrop, onEventClick, onPlanTomorrow }) {
  const today = new Date();
  // Drag-and-drop handler
  const handleDrop = (e, hour) => {
    const taskId = e.dataTransfer.getData("taskId");
    const task = todos.find(t => t.id === taskId);
    if (task) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), ...hour.split(":"));
      onTaskDrop(task, date);
    }
  };
  return (
    <div className="p-4 bg-white rounded shadow flex gap-4">
      <div className="flex-1">
        <h2 className="text-xl font-bold mb-2">Day View</h2>
        <div className="flex flex-col gap-1" style={{ maxWidth: '100vw', maxHeight: '60vh', overflowX: 'auto', overflowY: 'auto' }}>
          <table className="min-w-full border border-sky-100 rounded-lg" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr className="bg-sky-50">
                <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400 w-24">Time</th>
                <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400">Events</th>
              </tr>
            </thead>
            <tbody>
              {hours.map((h, idx) => {
                const slotEvents = events.filter(ev => {
                  const evDate = ev.start;
                  return evDate.getDate() === today.getDate() && evDate.getHours() === Number(h.split(":")[0]) && evDate.getMinutes() === Number(h.split(":")[1]);
                });
                return (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-blue-50/40"}>
                    <td className="border px-2 py-1 text-xs w-24 align-top">
                      <span>{h}</span>
                    </td>
                    <td className="border px-2 py-1 align-top" style={{ width: '100%' }}>
                      {slotEvents.length === 0 ? (
                        <span className="text-gray-400 text-xs">No events</span>
                      ) : (
                        slotEvents.map((ev, i) => (
                          <div key={i} className={`px-2 py-1 rounded cursor-pointer flex items-center gap-1 ${categories[ev.kind]?.color || "bg-gray-200"}`} onClick={()=>onEventClick(ev)}>
                            <span>{categories[ev.kind]?.icon || ""}</span>
                            <span className="truncate text-xs">{ev.title}</span>
                          </div>
                        ))
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Tasks & Activities section */}
        <div className="grid grid-cols-2 gap-8 mt-8">
          <div className="flex flex-col items-center">
            <h3 className="text-2xl text-sky-400 font-bold mb-4">Tasks</h3>
            <button className="bg-sky-200 text-sky-700 font-semibold px-8 py-2 rounded mb-2 w-full max-w-xs">Add task</button>
            {/* Render tasks here */}
          </div>
          <div className="flex flex-col items-center">
            <h3 className="text-2xl text-sky-400 font-bold mb-4">Activities</h3>
            <button className="bg-sky-200 text-sky-700 font-semibold px-8 py-2 rounded mb-2 w-full max-w-xs">Add activity</button>
            {/* Render activities here */}
          </div>
        </div>
        <button className="mt-8 px-4 py-2 bg-blue-100 rounded">Plan tomorrow</button>
      </div>
    </div>
  );
}
