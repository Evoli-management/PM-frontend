import React from "react";

export default function FilterBar({ filter, setFilter }) {
  return (
    <div className="flex gap-2 mb-2">
      <span className="font-semibold">Show:</span>
      <button className={`px-3 py-1 rounded ${filter==="both"?"bg-blue-500 text-white":"bg-gray-200"}`} onClick={()=>setFilter("both")}>Both</button>
      <button className={`px-3 py-1 rounded ${filter==="task"?"bg-blue-500 text-white":"bg-gray-200"}`} onClick={()=>setFilter("task")}>Tasks</button>
      <button className={`px-3 py-1 rounded ${filter==="activity"?"bg-blue-500 text-white":"bg-gray-200"}`} onClick={()=>setFilter("activity")}>Activities</button>
    </div>
  );
}
