

import React, { useEffect, useRef } from "react";

const HOURS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});
const WEEKDAYS = ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"];

export default function MonthView({ events, categories, onEventClick }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

  // Map events to day/hour
  const eventsBySlot = {};
  events.forEach(ev => {
    const evDate = new Date(ev.start);
    const key = `${evDate.getDate()}-${evDate.getHours()}:${evDate.getMinutes()}`;
    if (!eventsBySlot[key]) eventsBySlot[key] = [];
    eventsBySlot[key].push(ev);
  });

  // Red line for current time
  const gridRef = useRef(null);
  useEffect(() => {
    const interval = setInterval(() => {
      if (!gridRef.current) return;
      const now = new Date();
      if (now.getMonth() !== month) {
        gridRef.current.style.setProperty('--red-line-top', '-9999px');
        return;
      }
      const hourIdx = HOURS.findIndex(h => {
        const [hr, min] = h.split(":");
        return now.getHours() === Number(hr) && now.getMinutes() >= Number(min);
      });
      if (hourIdx === -1) {
        gridRef.current.style.setProperty('--red-line-top', '-9999px');
        return;
      }
      const slotHeight = 40; // px
      const top = slotHeight + hourIdx * slotHeight + ((now.getMinutes() % 30) / 30) * slotHeight;
      gridRef.current.style.setProperty('--red-line-top', `${top}px`);
    }, 60000);
    return () => clearInterval(interval);
  }, [month]);

  // Build grid rows: one per day
  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-2">Month View</h2>
      <div className="overflow-x-auto" ref={gridRef} style={{ position: 'relative' }}>
  <table className="border border-sky-100 rounded" style={{ minWidth: '3200px', tableLayout: 'fixed' }}>
          <thead>
            <tr className="bg-sky-50">
              <th className="sticky left-0 bg-sky-50 text-left px-2 py-2 text-xs font-semibold text-gray-400 w-32 z-10">&nbsp;</th>
              <th className="sticky left-32 bg-sky-50 text-center px-2 py-2 text-xs font-semibold text-gray-400 w-32 z-10">all day</th>
              {HOURS.map((h, idx) => (
                <th key={idx} className="text-center px-2 py-2 text-xs font-semibold text-gray-400 w-32">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthDays.map((date, idx) => {
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const isToday = date.getDate() === today.getDate();
              return (
                <tr key={idx} className="border-b">
                  <td className={`sticky left-0 bg-white px-2 py-2 text-xs font-semibold w-32 z-10 ${isWeekend ? "text-red-500" : "text-gray-700"} ${isToday ? "text-blue-600" : ""}`}>{date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</td>
                  <td className="sticky left-32 bg-white px-2 py-2 text-center align-top w-32 z-10 cursor-pointer hover:bg-blue-50">{/* all day slot */}</td>
                  {HOURS.map((h, hIdx) => {
                    const [hr, min] = h.split(":");
                    const key = `${date.getDate()}-${hr}:${min}`;
                    const slotEvents = eventsBySlot[key] || [];
                    return (
                      <td key={hIdx} className="px-2 py-2 text-center align-top w-32 cursor-pointer hover:bg-blue-50" onClick={()=>onEventClick({ day: date, hour: h })}>
                        {slotEvents.map((ev, i) => (
                          <span key={i} className={`block px-2 py-1 rounded text-xs mb-1 ${categories[ev.kind]?.color || "bg-gray-200"}`}>{ev.title}</span>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Red line for current time */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 'var(--red-line-top)', height: '2px', background: 'red', zIndex: 10 }}></div>
      </div>
    </div>
  );
}
