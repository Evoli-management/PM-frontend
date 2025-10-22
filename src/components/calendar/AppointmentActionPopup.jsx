import React, { useEffect, useRef } from "react";

export default function AppointmentActionPopup({
  anchorRect,
  onEdit,
  onDelete,
  onClose,
  isOpen,
  isMobile,
  ariaLabelledBy = "appointment-action-menu",
}) {
  const popupRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose && onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  // Keyboard accessibility: Escape closes
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") {
        onClose && onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Positioning: always as a floating menu near the anchor (fixed relative to viewport)
  // Use a portal to escape any parent stacking context (e.g., transforms from virtualization)
  const VIEWPORT_PADDING = 12;
  const approxWidth = 220; // used to clamp within viewport for desktop
  const desktopTop = Math.min(
    (anchorRect?.bottom ?? 0) + 4,
    (typeof window !== "undefined" ? window.innerHeight : 0) - VIEWPORT_PADDING,
  );
  const desktopLeft = Math.min(
    Math.max(VIEWPORT_PADDING, (anchorRect?.left ?? 0)),
    (typeof window !== "undefined" ? window.innerWidth : 0) - approxWidth - VIEWPORT_PADDING,
  );

  const containerStyle = {
    position: "fixed",
    top: desktopTop,
    left: desktopLeft,
    zIndex: 11000,
    background: "#fff",
    boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
    borderRadius: 8,
    padding: "12px 16px",
    minWidth: 180,
  };

  const popupEl = (
    <>
      <div
        ref={popupRef}
        style={containerStyle}
        role="menu"
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        className="appointment-action-popup"
      >
        <div id={ariaLabelledBy} className="font-semibold text-base mb-2">Appointment Actions</div>
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-50 focus:bg-blue-100 focus:outline-none text-blue-700 font-medium"
          onClick={onEdit}
          aria-label="Edit Appointment"
          tabIndex={0}
        >
          <span role="img" aria-label="Edit">✎</span> Edit Appointment
        </button>
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-red-50 focus:bg-red-100 focus:outline-none text-red-700 font-medium mt-1"
          onClick={onDelete}
          aria-label="Delete Appointment"
          tabIndex={0}
        >
          <span role="img" aria-label="Delete">🗑️</span> Delete Appointment
        </button>
      </div>
    </>
  );

  return popupEl;
}
