import React, { useState, useEffect } from "react";


const CalendarView = () => {
  const [view, setView] = useState("monthly");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [items, setItems] = useState(dummyItems);
  const [filter, setFilter] = useState("both");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [popupDate, setPopupDate] = useState(null);

  // Elephant Task state (mock)
  const [elephantTasks, setElephantTasks] = useState({}); // { '2025-08-22': '...' }
  const dateKey = selectedDate.toISOString().slice(0,10);
  const [elephantInput, setElephantInput] = useState("");
  useEffect(() => {
    setElephantInput(elephantTasks[dateKey] || "");
  }, [dateKey, elephantTasks]);

  function handleSaveElephant() {
    setElephantTasks({ ...elephantTasks, [dateKey]: elephantInput });
  }
  function handleDeleteElephant() {
    const copy = { ...elephantTasks };
    delete copy[dateKey];
    setElephantTasks(copy);
    setElephantInput("");
  }

  return (
    <div className="w-full">
      {/* Elephant Task Input - Screenshot Style */}
      <div className="w-full flex items-center gap-3 mb-4 bg-gradient-to-r from-sky-100 to-blue-50 border border-sky-200 px-6 py-4 rounded-xl shadow-sm" style={{ minHeight: 56 }}>
        <span className="text-3xl mr-2" title="Your most important task of the day.">🐘</span>
        <input
          type="text"
          value={elephantInput}
          onChange={e => setElephantInput(e.target.value)}
          placeholder="Enter your elephant task..."
          className="flex-1 px-4 py-3 rounded-lg border border-sky-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        {elephantInput && (
          <button className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-3 rounded-lg font-semibold transition-all duration-150 ml-2 shadow" onClick={handleSaveElephant}>
            {elephantTasks[dateKey] ? "Update" : "Save"}
          </button>
        )}
        {elephantTasks[dateKey] && (
          <button className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded-lg ml-2" onClick={handleDeleteElephant} title="Delete Elephant Task">✕</button>
        )}
      </div>
      <FilterBar filter={filter} setFilter={setFilter} />
      {/* Tab navigation */}
      <div className="flex gap-2 mb-4">
        {VIEWS.map(v => (
          <button key={v} className={`px-4 py-2 rounded ${view===v?"bg-blue-600 text-white":"bg-gray-200"}`} onClick={()=>setView(v)}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
        ))}
      </div>
      {/* Render views */}
      {view === "daily" && <KeyAreaSidebar 
        items={items.filter(i=>i.date===selectedDate.toISOString().slice(0,10) && (filter==="both"||i.type===filter))}
        onAdd={type => {
          setModalOpen(true);
          setModalItem({ title: "", type, date: selectedDate.toISOString().slice(0,10), time: "", status: "pending", description: "" });
        }}
        onEdit={item=>{setModalOpen(true); setModalItem(item);}} 
      />}
      {/* TODO: Render weekly, monthly, quarterly views with markers and popups */}
      {modalOpen && <TaskActivityModal item={modalItem} onClose={()=>setModalOpen(false)} onSave={item=>{/* TODO: API */}} onDelete={id=>{/* TODO: API */}} />}
      {popupDate && <DayPopup date={popupDate} items={items.filter(i=>i.date===popupDate)} onClose={()=>setPopupDate(null)} />}
    </div>
  );
};

export default CalendarView;
