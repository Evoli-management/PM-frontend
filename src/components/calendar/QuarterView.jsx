

import React, { useState } from "react";

function getWeekNumber(date) {
  const firstJan = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - firstJan) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + firstJan.getDay() + 1) / 7);
}

function getQuarterMonths(date, quarterOffset = 0) {
  const month = date.getMonth();
  const year = date.getFullYear();
  const currentQuarter = Math.floor(month / 3);
  const targetQuarter = currentQuarter + quarterOffset;
  const targetYear = year + Math.floor(targetQuarter / 4);
  const startMonth = (targetQuarter % 4) * 3;
  return [0, 1, 2].map(i => new Date(targetYear, startMonth + i, 1));
}

function getWeeksInQuarter(months) {
  // Build a matrix: each row is a day (by day number), columns are months
  const monthDays = months.map(monthDate => {
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => new Date(monthDate.getFullYear(), monthDate.getMonth(), i + 1));
  });
  // Find the max number of days in the quarter
  const maxDays = Math.max(...monthDays.map(arr => arr.length));
  // Build rows: each row is a day index (0-based), columns are months
  const rows = Array.from({ length: maxDays }, (_, dayIdx) => monthDays.map(monthArr => monthArr[dayIdx]));
  return rows;
}

  // ...existing code...
export default function QuarterView({ events, categories, onDayClick }) {
  const today = new Date();
  const [quarterOffset, setQuarterOffset] = useState(0);
  const months = getQuarterMonths(today, quarterOffset);
  const monthNames = months.map(m => m.toLocaleString('default', { month: 'long', year: 'numeric' }));
  const weeks = getWeeksInQuarter(months);

  // Map events to days
  const eventsByDay = {};
  events.forEach(ev => {
    const key = new Date(ev.start).toLocaleDateString();
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(ev);
  });

  // Helper to get week number for a given date
  function getWeekNumberLocal(date) {
    const firstJan = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - firstJan) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + firstJan.getDay() + 1) / 7);
  }

  const rows = getWeeksInQuarter(months);
  let weekNums = [];
  for (let i = 0; i < rows.length; i++) {
    const weekDate = rows[i][0];
    let weekNum = '';
    if (weekDate) {
      weekNum = getWeekNumberLocal(weekDate);
    } else {
      for (let m = 1; m < rows[i].length; m++) {
        if (rows[i][m]) {
          weekNum = getWeekNumberLocal(rows[i][m]);
          break;
        }
      }
    }
    weekNums.push(weekNum);
  }

  return (
    <div className="p-0 bg-white border border-blue-200 rounded-xl" style={{ boxShadow: 'none' }}>
      {/* Elephant Task Input - inside card */}
      <div className="w-full flex items-center gap-3 px-6 py-4 bg-blue-50 border-b border-blue-100 rounded-t-xl" style={{ minHeight: 56 }}>
        <span className="text-2xl mr-2" title="Your most important task of the day.">🐘</span>
        <input
          type="text"
          value={''}
          placeholder="Enter your elephant task..."
          className="flex-1 px-4 py-3 rounded-lg border border-sky-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
          disabled
        />
      </div>
      {/* Quarter navigation */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-blue-100">
        <button className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={() => setQuarterOffset(quarterOffset - 1)}>
          &lt; Previous Quarter
        </button>
        <span className="text-lg font-semibold text-blue-700">{monthNames.join(" / ")}</span>
        <button className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={() => setQuarterOffset(quarterOffset + 1)}>
          Next Quarter &gt;
        </button>
      </div>
      {/* Calendar grid */}
      <div className="overflow-x-auto px-6 pb-6" style={{ maxWidth: '100vw', maxHeight: '60vh', overflowY: 'auto' }}>
        <table className="w-full border border-blue-100 rounded" style={{ tableLayout: 'auto', width: '100%' }}>
          <thead>
            <tr className="bg-blue-50">
              {months.map((m, mIdx) => (
                <th key={mIdx} className="text-center px-2 py-2 text-blue-500 text-base font-semibold">{m.toLocaleString('default', { month: 'long', year: 'numeric' })}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <React.Fragment key={rIdx}>
                <tr className={rIdx % 2 === 0 ? "bg-blue-50" : "bg-white"}>
                  {row.map((date, mIdx) => {
                    if (!date) return <td key={mIdx} className="px-2 py-2 text-center align-top text-gray-300">—</td>;
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    let weekNumSpan = null;
                    if (date.getDay() === 1) {
                      const weekNum = getWeekNumber(date);
                      weekNumSpan = <span className="text-xs text-gray-400 align-top mr-1" style={{position:'relative',top:'-2px'}}>{weekNum}</span>;
                    }
                    return (
                      <td key={mIdx} className={`px-3 py-3 text-center align-top cursor-pointer border border-blue-100 hover:bg-blue-100`} style={{ minWidth: 80 }} onClick={()=>onDayClick(date)}>
                        <span className={`text-sm font-semibold flex items-center justify-center gap-1 ${isWeekend ? "text-red-500" : "text-gray-700"}`}>
                          {weekNumSpan}
                          {date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                        </span>
                        {/* Placeholder for empty cell */}
                        {(!eventsByDay[date.toLocaleDateString()] || eventsByDay[date.toLocaleDateString()].length === 0) && (
                          <span className="block text-xs text-gray-400 mt-1">No events</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                {(rIdx+1)%7 === 0 && (
                  <tr>
                    <td colSpan={months.length}><hr className="border-t border-blue-200 my-0" /></td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
