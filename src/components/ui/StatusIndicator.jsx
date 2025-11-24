import React from 'react';

const StatusIndicator = ({ status = 'open' }) => {
  const s = String(status).toLowerCase();
  const color =
    s === 'done' || s === 'closed'
      ? 'bg-emerald-500'
      : s === 'in_progress'
      ? 'bg-blue-500'
      : s === 'blocked'
      ? 'bg-red-500'
      : 'bg-slate-400';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} aria-hidden="true" />;
};

export default StatusIndicator;
