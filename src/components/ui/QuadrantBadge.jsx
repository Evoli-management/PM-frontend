import React from 'react';

const QuadrantBadge = ({ q = 4 }) => {
  const n = Number(q) || 4;
  const map = {
    1: { cls: 'text-white bg-red-600', label: 'Q1' },
    2: { cls: 'text-white bg-amber-600', label: 'Q2' },
    3: { cls: 'text-white bg-blue-600', label: 'Q3' },
    4: { cls: 'text-white bg-emerald-600', label: 'Q4' },
  };
  const m = map[n] || map[4];
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${m.cls}`}>{m.label}</span>;
};

export default QuadrantBadge;
