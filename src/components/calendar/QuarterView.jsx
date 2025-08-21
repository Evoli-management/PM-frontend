

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
  // Get all dates in the quarter
  let allDates = [];
  months.forEach(monthDate => {
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      allDates.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), i));
    }
  });
  // Group by week number
  const weeks = {};
  allDates.forEach(date => {
    const weekNum = getWeekNumber(date);
    if (!weeks[weekNum]) weeks[weekNum] = {};
    weeks[weekNum][date.getMonth()] = date;
  });
  return weeks;
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

  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-sky-400">{monthNames.join(' - ')}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-sky-100 rounded">
          <thead>
            <tr className="bg-sky-50">
              <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400 w-16">Week</th>
              {months.map((m, idx) => (
                <th key={idx} className="text-center px-2 py-2 text-sky-400 text-base font-semibold">{m.toLocaleString('default', { month: 'long', year: 'numeric' })}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(weeks).map(([weekNum, weekDates], wIdx) => (
              <tr key={wIdx} className="border-b">
                <td className="px-2 py-2 text-xs text-gray-400 font-bold align-top">{weekNum}</td>
                {months.map((m, mIdx) => {
                  const date = weekDates[m.getMonth()];
                  if (!date) return <td key={mIdx}></td>;
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <td key={mIdx} className={`px-2 py-2 text-center align-top cursor-pointer hover:bg-blue-50`} onClick={()=>onDayClick(date)}>
                      <span className={`text-xs font-semibold ${isWeekend ? "text-red-500" : "text-gray-700"}`}>{date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
