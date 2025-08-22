

import React from "react";

function getWeekNumber(date) {
  const firstJan = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - firstJan) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + firstJan.getDay() + 1) / 7);
}

function getQuarterMonths(date) {
  const month = date.getMonth();
  const year = date.getFullYear();
  const startMonth = Math.floor(month / 3) * 3;
  return [0, 1, 2].map(i => new Date(year, startMonth + i, 1));
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

export default function QuarterView({ events, categories, onDayClick }) {
  const today = new Date();
  const months = getQuarterMonths(today);
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
  function getWeekNumber(date) {
    const firstJan = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - firstJan) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + firstJan.getDay() + 1) / 7);
  }

  const rows = getWeeksInQuarter(months);
  // Build week number and row grouping
  // Build week number for each row (continuous, only in left column)
  let weekNums = [];
  for (let i = 0; i < rows.length; i++) {
    const weekDate = rows[i][0];
    let weekNum = '';
    if (weekDate) {
      weekNum = getWeekNumber(weekDate);
    } else {
      // If first month cell is empty, try next month
      for (let m = 1; m < rows[i].length; m++) {
        if (rows[i][m]) {
          weekNum = getWeekNumber(rows[i][m]);
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
      {/* Tab navigation - inside card */}
      <div className="flex gap-2 px-6 py-3 bg-white border-b border-blue-100">
        <button className="px-4 py-2 rounded bg-gray-200">Daily</button>
        <button className="px-4 py-2 rounded bg-gray-200">Weekly</button>
        <button className="px-4 py-2 rounded bg-gray-200">Monthly</button>
        <button className="px-4 py-2 rounded bg-blue-500 text-white border border-blue-600">Quarterly</button>
      </div>
      {/* Calendar grid */}
      <div className="overflow-x-auto px-6 pb-6">
        <table className="min-w-full border border-blue-100 rounded">
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
                <tr className="align-top">
                  {row.map((date, mIdx) => {
                    if (!date) return <td key={mIdx}></td>;
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    // Show week number as small number next to Monday only
                    let weekNumSpan = null;
                    if (date.getDay() === 1) { // Monday
                      const weekNum = getWeekNumber(date);
                      weekNumSpan = <span className="text-xs text-gray-400 align-top mr-1" style={{position:'relative',top:'-2px'}}>{weekNum}</span>;
                    }
                    return (
                      <td key={mIdx} className={`px-2 py-2 text-left align-top cursor-pointer hover:bg-blue-50`} onClick={()=>onDayClick(date)}>
                        <span className={`text-xs font-semibold flex items-center gap-1 ${isWeekend ? "text-red-500" : "text-gray-700"}`}>
                          {weekNumSpan}
                          {date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                {/* Add horizontal line after each week (after Sunday) */}
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
