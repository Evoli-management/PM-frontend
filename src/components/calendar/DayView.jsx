
import React from "react";
import AvailabilityBlock from "./AvailabilityBlock";

// 13:00–18:00, half-hour increments
const hours = Array.from({ length: 11 }, (_, i) => {
  const h = 13 + Math.floor(i/2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
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
        <div className="flex flex-col gap-1">
          {/* All day row */}
          <div className="border rounded px-2 py-1 min-h-[40px] flex items-center gap-1 bg-gray-50">
            <span className="text-xs w-10 inline-block">all day</span>
            {/* Render all-day events here if needed */}
          </div>
          {hours.map((h, idx) => {
            const slotEvents = events.filter(ev => {
              const evDate = ev.start;
              return evDate.getDate() === today.getDate() && evDate.getHours() === Number(h.split(":")[0]) && evDate.getMinutes() === Number(h.split(":")[1]);
            });
            return (
              <div key={idx} className="border rounded px-2 py-1 min-h-[40px] flex items-center gap-1" onDragOver={e=>e.preventDefault()} onDrop={e=>handleDrop(e,h)}>
                <span className="text-xs w-10 inline-block">{h}</span>
                {slotEvents.map((ev, i) => (
                  <div key={i} className={`px-2 py-1 rounded cursor-pointer flex items-center gap-1 ${categories[ev.kind]?.color || "bg-gray-200"}`} onClick={()=>onEventClick(ev)}>
                    <span>{categories[ev.kind]?.icon || ""}</span>
                    <span className="truncate text-xs">{ev.title}</span>
                  </div>
                ))}
              </div>
            );
          })}
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
