// This is a temporary debug helper to verify if the EventModal is being rendered
import React from "react";

export default function DebugEventModal({ open, event }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, background: "red", color: "white", zIndex: 9999 }}>
      <h2>DEBUG: EventModal Open</h2>
      <pre>{JSON.stringify(event, null, 2)}</pre>
    </div>
  );
}
