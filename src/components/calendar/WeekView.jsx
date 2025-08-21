import React from "react";
import AvailabilityBlock from "./AvailabilityBlock";
import TodoPanel from "./TodoPanel";

const slotSize = 30; // 30-min slots
const hours = Array.from({ length: (20-8)*2 }, (_, i) => {
  const h = 8 + Math.floor(i/2);
  const m = i%2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

const WeekView = ({ events, todos, categories, onTaskDrop, onEventClick }) => {
  const today = new Date();
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));

  // Drag-and-drop handler
  const handleDrop = (e, day, hour) => {
    const taskId = e.dataTransfer.getData("taskId");
  const hours = Array.from({ length: 9 }, (_, i) => 13 + i);
  };

  return (
    <div className="p-4 bg-white rounded shadow flex gap-4">
      <div className="flex-1 overflow-x-auto">
        <h2 className="text-xl font-bold mb-2">Week View</h2>
        <div className="grid grid-cols-7 gap-2">
          {days.map((date, dIdx) => (
            <div key={dIdx} className="border rounded min-h-[600px] flex flex-col">
              <div className="text-xs font-bold mb-1 text-center">{date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</div>
              <div className="flex-1">
                {hours.map((h, hIdx) => {
                  const slotEvents = events.filter(ev => {
                    const evDate = ev.start;
                    return evDate.getDate() === date.getDate() && evDate.getHours() === Number(h.split(":")[0]) && evDate.getMinutes() === Number(h.split(":")[1]);
                  });
                  return (
                    <div key={hIdx} className="border-b px-1 py-0.5 min-h-[24px] flex items-center gap-1" onDragOver={e=>e.preventDefault()} onDrop={e=>handleDrop(e, date, h)}>
                      <span className="text-xs w-12 inline-block">{h}</span>
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
              {/* Red/Green blocks */}
              <div className="flex gap-1 mt-1">
                {events.filter(ev=>ev.kind==="green"||ev.kind==="red").map((ev,i)=>(
                  <AvailabilityBlock key={i} type={ev.kind} />
                ))}
              </div>
              <button className="w-full bg-blue-100 mt-2 py-1 rounded" onClick={()=>onEventClick({ day: date })}>Add task/activity</button>
            </div>
          ))}
        </div>
      </div>
      <div className="w-72">
        <TodoPanel todos={todos} onTaskDrop={onTaskDrop} />
      </div>
    </div>
  );
};

export default WeekView;
