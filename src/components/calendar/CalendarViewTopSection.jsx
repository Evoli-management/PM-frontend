import React from "react";

export default function CalendarViewTopSection({
  left,
  center,
  right,
  children,
  elephantTaskRow = null,
  containerClassName = "w-full flex-shrink-0",
  controlsClassName = "day-header-controls flex items-center justify-between min-h-[34px]",
  elephantTopGapClass = "mt-1",
  showElephantSeparator = false,
}) {
  const headerNode = children ? children : (
    <div className={controlsClassName}>
      {left}
      {center}
      {right}
    </div>
  );

  return (
    <div className={containerClassName}>
      {headerNode}

      {elephantTaskRow ? (
        <div className={elephantTopGapClass}>
          {showElephantSeparator ? <div className="w-full border-t border-slate-300" /> : null}
          <div>{elephantTaskRow}</div>
        </div>
      ) : null}
    </div>
  );
}
