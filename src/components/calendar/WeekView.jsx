
import React, { useState } from "react";
import AvailabilityBlock from "./AvailabilityBlock";
import TodoPanel from "./TodoPanel";

function getWeekNumber(date) {
  const firstJan = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - firstJan) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + firstJan.getDay() + 1) / 7);
}

const defaultSlotSize = 30;
const timeSlots = (slotSize) => {
  const slots = [];
  for (let h = 8; h <= 23; h++) {
    for (let m = 0; m < 60; m += slotSize) {
      slots.push(`${h}:${m.toString().padStart(2, "0")}`);
    }
  }
  return slots;
};

const WeekView = ({ events = [], todos = [], categories = {}, onTaskDrop, onEventClick }) => {
  const [slotSize, setSlotSize] = useState(defaultSlotSize);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [elephantTask, setElephantTask] = useState("");

  // Calculate week start (Monday)
  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
  const slots = timeSlots(slotSize);
  const weekNum = getWeekNumber(weekStart);

  // Navigation handlers
  const goPrevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };
  const goNextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };
  const goToday = () => {
    setCurrentDate(new Date());
  };

  // Drag-and-drop handler
  const handleDrop = (e, day, slot) => {
    const taskId = e.dataTransfer.getData("taskId");
    // ...handle drop logic...
  };

  return (
    <div className="p-0 bg-white border border-blue-200 rounded-xl" style={{ boxShadow: 'none' }}>
      {/* Top controls */}
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100 rounded-t-xl">
        <button className="px-2 py-1 rounded bg-blue-100 text-blue-700 font-bold" onClick={goPrevWeek}>{"<"}</button>
        <button className="px-2 py-1 rounded bg-blue-100 text-blue-700 font-bold" onClick={goNextWeek}>{">"}</button>
        <button className="px-2 py-1 rounded bg-blue-500 text-white font-bold" onClick={goToday}>Today</button>
        <span className="ml-4 text-lg font-semibold text-blue-700">{weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - {days[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}, {weekStart.getFullYear()}</span>
        <span className="ml-auto text-blue-700 font-bold">Week: {weekNum}</span>
      </div>
      {/* Elephant Task Input */}
      <div className="w-full flex items-center gap-3 px-4 py-2 bg-blue-50 border-b border-blue-100" style={{ minHeight: 48 }}>
        <span className="text-xl mr-2" title="Your most important task of the day.">🐘</span>
        <input
          type="text"
          value={elephantTask}
          onChange={e => setElephantTask(e.target.value)}
          placeholder="Enter your elephant task..."
          className="flex-1 px-3 py-2 rounded-lg border border-sky-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      {/* Time slot selectors */}
      <div className="flex gap-2 px-4 py-2 bg-white border-b border-blue-100">
        <button className={`px-3 py-1 rounded ${slotSize === 15 ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-700"}`} onClick={()=>setSlotSize(15)}>15 min</button>
        <button className={`px-3 py-1 rounded ${slotSize === 30 ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-700"}`} onClick={()=>setSlotSize(30)}>30 min</button>
      </div>
      {/* Calendar grid */}
      <div className="overflow-x-auto px-4 pb-6">
        <table className="min-w-full border border-blue-100 rounded">
          <thead>
            <tr className="bg-blue-50">
              <th className="text-left px-2 py-2 text-blue-500 text-base font-semibold w-20">all day</th>
              {days.map((date, dIdx) => (
                <th key={dIdx} className="text-center px-2 py-2 text-blue-500 text-base font-semibold">
                  {date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* All day row */}
            <tr>
              <td className="border-r border-blue-100 px-2 py-2 text-xs text-gray-500">all day</td>
              {days.map((date, dIdx) => (
                <td key={dIdx} className="border-r border-blue-100 px-2 py-2 text-center align-top">
                  {/* Remove button from all day row for legacy style */}
                </td>
              ))}
            </tr>
            {/* Time slots */}
            {slots.map((slot, sIdx) => (
              <tr key={sIdx}>
                <td className="border-r border-blue-100 px-2 py-1 text-xs text-gray-500">{slot}</td>
                {days.map((date, dIdx) => {
                  // Find events for this slot
                  const slotEvents = events.filter(ev => {
                    const evDate = new Date(ev.start);
                    return evDate.getDate() === date.getDate() && evDate.getHours() === Number(slot.split(":")[0]) && evDate.getMinutes() === Number(slot.split(":")[1]);
                  });
                  return (
                    <td key={dIdx} className="border-r border-blue-100 px-2 py-1 min-w-[80px] h-8 align-top" onDragOver={e=>e.preventDefault()} onDrop={e=>handleDrop(e, date, slot)}>
                      {slotEvents.map((ev, i) => (
                        <div key={i} className={`px-2 py-1 mb-1 rounded cursor-pointer flex items-center gap-1 ${categories[ev.kind]?.color || "bg-gray-200"}`} onClick={()=>onEventClick(ev)}>
                          <span>{categories[ev.kind]?.icon || ""}</span>
                          <span className="truncate text-xs">{ev.title}</span>
                        </div>
                      ))}
                      {/* Remove button from each cell for legacy style */}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Add task/activity button at the bottom of each day column */}
            <tr>
              <td></td>
              {days.map((date, dIdx) => (
                <td key={dIdx} className="border-r border-blue-100 px-2 py-2 text-center align-top">
                  <button className="bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm" onClick={()=>onEventClick({ day: date, slot: "bottom" })}>Add task/activity</button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {/* To-Do List Panel */}
      <div className="w-72 mx-4">
        <TodoPanel todos={todos} onTaskDrop={onTaskDrop} />
      </div>
    </div>
  );
};

export default WeekView;
