import React from "react";


const EventModal = ({ event, onClose, categories, timezone }) => {
  if (!event) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 w-96 relative">
        <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>✖</button>
        <h2 className="text-xl font-bold mb-2">{event.title}</h2>
        <div className="mb-2 text-sm text-gray-500">{event.type} {event.source && <span>• <span className="font-semibold text-blue-600">{event.source}</span></span>}</div>
        <div className="mb-2 text-xs text-gray-400">{new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}</div>
        <div className="mb-2 text-xs text-gray-400">Timezone: {timezone}</div>
        <div className="mb-4 text-gray-600">{event.desc}</div>
        <div className="flex gap-2">
          {event.source && <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs">View Task</button>}
          <button className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs">Edit</button>
          <button className="bg-red-500 text-white px-3 py-1 rounded text-xs">Delete</button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
