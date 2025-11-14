import React, { useState, useEffect, Suspense } from "react";
const CreateTaskModal = React.lazy(() => import("../modals/CreateTaskModal.jsx"));
const CreateActivityModal = React.lazy(() => import("../modals/CreateActivityFormModal.jsx"));

const CalendarView = () => {
    const [view, setView] = useState("monthly");
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [items, setItems] = useState(dummyItems);
    const [filter, setFilter] = useState("both");
    const [modalOpen, setModalOpen] = useState(false);
    const [popupDate, setPopupDate] = useState(null);

    // Elephant Task state (mock)
    const [elephantTasks, setElephantTasks] = useState({}); // { '2025-08-22': '...' }
    const dateKey = selectedDate.toISOString().slice(0, 10);
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

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [defaultType, setDefaultType] = useState("task");
    const [modalItem, setModalItem] = useState(null);

    return (
        <div className="w-full">
            {/* Elephant Task Input - Screenshot Style */}
            <div
                className="w-full flex items-center gap-3 mb-4 bg-gradient-to-r from-sky-100 to-blue-50 border border-sky-200 px-6 py-4 rounded-xl shadow-sm"
                style={{ minHeight: 56 }}
            >
                <span className="text-3xl mr-2" title="Your most important task of the day.">
                    🐘
                </span>
                <input
                    type="text"
                    value={elephantInput}
                    onChange={(e) => setElephantInput(e.target.value)}
                    placeholder="Enter your elephant task..."
                    className="flex-1 px-4 py-3 rounded-lg border border-sky-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                {elephantInput && (
                    <button
                        className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-3 rounded-lg font-semibold transition-all duration-150 ml-2 shadow"
                        onClick={handleSaveElephant}
                    >
                        {elephantTasks[dateKey] ? "Update" : "Save"}
                    </button>
                )}
                {elephantTasks[dateKey] && (
                    <button
                        className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded-lg ml-2"
                        onClick={handleDeleteElephant}
                        title="Delete Elephant Task"
                    >
                        ✕
                    </button>
                )}
            </div>
            <FilterBar filter={filter} setFilter={setFilter} />
            {/* Tab navigation */}
            <div className="flex gap-2 mb-4">
                {VIEWS.map((v) => (
                    <button
                        key={v}
                        className={`px-4 py-2 rounded ${view === v ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                        onClick={() => setView(v)}
                    >
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                ))}
            </div>
            {/* Render views */}
            {view === "daily" && (
                <KeyAreaSidebar
                    items={items.filter(
                        (i) =>
                            i.date === selectedDate.toISOString().slice(0, 10) &&
                            (filter === "both" || i.type === filter),
                    )}
                    onAdd={(type) => {
                        if (type === "task") {
                            setShowCreateModal(true);
                            setDefaultType("task");
                            setModalItem(null);
                        } else if (type === "activity") {
                            setShowCreateModal(true);
                            setDefaultType("activity");
                            setModalItem({ attachedTaskId: "10aa745e-e823-45e0-b432-b0e03b6bee6e" });
                        }
                    }}
                />
            )}

            {/* Add Task and Add Activity buttons below task list */}
            <div className="flex gap-3 mt-6 justify-end">
                <button
                    className="px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700"
                    onClick={() => {
                        setShowCreateModal(true);
                        setDefaultType("task");
                        setModalItem(null);
                    }}
                >
                    Add Task
                </button>
                <button
                    className="px-4 py-2 rounded-md bg-green-600 text-white font-semibold hover:bg-green-700"
                    onClick={() => {
                        setShowCreateModal(true);
                        setDefaultType("activity");
                        setModalItem({ attachedTaskId: "10aa745e-e823-45e0-b432-b0e03b6bee6e" });
                    }}
                >
                    Add Activity
                </button>
            </div>

            {/* Modals for Add Task and Add Activity */}
            {showCreateModal && defaultType === "task" && (
                <Suspense fallback={<div role="status" aria-live="polite" className="p-4">Loading…</div>}>
                    <CreateTaskModal
                        isOpen={showCreateModal}
                        onClose={() => setShowCreateModal(false)}
                        initialData={{}}
                    />
                </Suspense>
            )}
            {showCreateModal && defaultType === "activity" && (
                <Suspense fallback={<div role="status" aria-live="polite" className="p-4">Loading…</div>}>
                    <CreateActivityModal
                        isOpen={showCreateModal}
                        onClose={() => setShowCreateModal(false)}
                        initialData={{ attachedTaskId: modalItem?.attachedTaskId || "" }}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default CalendarView;
