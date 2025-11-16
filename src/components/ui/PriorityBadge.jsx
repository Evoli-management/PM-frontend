import React from 'react';

const PriorityBadge = ({ priority = 'med' }) => {
  const p = String(priority).toLowerCase();
  const map = {
    high: { cls: 'text-red-700 bg-red-50 border-red-200', label: 'High' },
    med: { cls: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Normal' },
    low: { cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'Low' },
  };
  const m = map[p] || map.med;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${m.cls}`}>{m.label}</span>;
};

export default PriorityBadge;
