import React from "react";

const ListView = ({ events = [], onEventClick }) => {
  if (!events.length) {
    return (
      <div className="text-center text-gray-400 py-8">No events scheduled. Add tasks or activities to see them here.</div>
    );
  }
  return (
    <div className="space-y-4">
      {events
        .sort((a, b) => new Date(a.start) - new Date(b.start))
        .map((event, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center gap-2 cursor-pointer hover:bg-blue-50" onClick={() => onEventClick(event)}>
            <div className="flex-1">
              <div className="font-bold text-blue-700 text-lg">{event.title}</div>
              <div className="text-sm text-gray-500">{event.type} • {event.source ? `from ${event.source}` : "Custom"}</div>
              <div className="text-xs text-gray-400">{new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}</div>
            </div>
            <div className="flex gap-2 mt-2 md:mt-0">
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs">View</button>
              <button className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs">Edit</button>
              <button className="bg-red-500 text-white px-3 py-1 rounded text-xs">Delete</button>
            </div>
          </div>
        ))}
    </div>
  );
};

export default ListView;
