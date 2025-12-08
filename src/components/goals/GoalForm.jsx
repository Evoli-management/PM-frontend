import React, { useState, useRef } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

const GoalForm = ({ onClose, onGoalCreated, keyAreas = [], goal, isEditing = false }) => {
  const [formData, setFormData] = useState({
    title: goal?.title || "",
    description: goal?.description || "",
    startDate: goal?.startDate
      ? new Date(goal.startDate).toISOString().split("T")[0]
      : "",
    dueDate: goal?.dueDate
      ? new Date(goal.dueDate).toISOString().split("T")[0]
      : "",
    keyAreaId: goal?.keyAreaId || "",
    status: goal?.status || "active",
    visibility: goal?.visibility || "public",
  });

  const [milestones, setMilestones] = useState(
    goal?.milestones?.length > 0
      ? goal.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          weight: m.weight || 1.0,
          dueDate: m.dueDate || "",
        }))
      : [{ title: "", weight: 1.0, dueDate: "" }]
  );

  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // date input refs so we can open native picker when clicking the calendar icon
  const startRef = useRef(null);
  const dueRef = useRef(null);
  const rightStartRef = useRef(null);
  const milestoneDueRef = useRef(null);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleMilestoneChange = (field, value) => {
    const updated = [...milestones];
    updated[activeMilestoneIndex] = {
      ...updated[activeMilestoneIndex],
      [field]: value,
    };
    setMilestones(updated);
  };

  const addMilestone = () => {
    if (milestones.length >= 10) return;
    const updated = [
      ...milestones,
      { title: "", weight: 1.0, dueDate: "" },
    ];
    setMilestones(updated);
    setActiveMilestoneIndex(updated.length - 1);
  };

  const removeCurrentMilestone = () => {
    if (milestones.length === 1) return;
    const updated = milestones.filter(
      (_, idx) => idx !== activeMilestoneIndex
    );
    let nextIndex = activeMilestoneIndex;
    if (nextIndex >= updated.length) {
      nextIndex = updated.length - 1;
    }
    setMilestones(updated);
    setActiveMilestoneIndex(nextIndex);
  };

  const goPrevMilestone = () => {
    if (activeMilestoneIndex === 0) return;
    setActiveMilestoneIndex((i) => i - 1);
  };

  const goNextMilestone = () => {
    if (activeMilestoneIndex >= milestones.length - 1) return;
    setActiveMilestoneIndex((i) => i + 1);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    }

    if (!formData.dueDate) {
      newErrors.dueDate = "Deadline is required";
    } else {
      const dueDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDate <= today && !isEditing) {
        newErrors.dueDate = "Deadline must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    const goalData = {
      title: formData.title.trim(),
      description: formData.description ? formData.description.trim() : null,
      startDate: formData.startDate || null,
      dueDate: formData.dueDate,
      keyAreaId: formData.keyAreaId || null,
      visibility: formData.visibility,
      status: formData.status,
      milestones: milestones
        .filter((m) => m.title.trim())
        .map((m) => ({
          ...(m.id && { id: m.id }),
          title: m.title.trim(),
          weight: parseFloat(m.weight) || 1.0,
          dueDate: m.dueDate || null,
        })),
    };

    try {
      await onGoalCreated(goalData);
      onClose();
    } catch (err) {
      setErrors({
        general: err.message || "Failed to save goal. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentMilestone = milestones[activeMilestoneIndex] || {
    title: "",
    weight: 1,
    dueDate: "",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={() => onClose()}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        /* Hide native inline date-picker indicator for inputs using .no-calendar
           Keep the separate 📅 button visible and functional. */
        input.no-calendar::-webkit-calendar-picker-indicator {
          opacity: 0;
          pointer-events: none;
          display: block;
          width: 0;
          height: 0;
        }
        /* Also hide clear/spinner controls in WebKit browsers */
        input.no-calendar::-webkit-clear-button,
        input.no-calendar::-webkit-inner-spin-button {
          display: none;
        }
        /* Ensure appearance none for consistent look */
        input.no-calendar { -webkit-appearance: none; appearance: none; }
        /* Firefox - hide calendar picker appearance */
        input.no-calendar::-moz-focus-inner { border: 0; }
      `}</style>

      <div
        className="relative bg-white rounded-xl w-full max-w-3xl shadow-2xl flex flex-col animate-slideUp max-h-[90vh] overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-gray-200">
          {/* left spacer so justify-between places close button on the right */}
          <div className="w-10" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-gray-900 absolute left-1/2 transform -translate-x-1/2">
            {isEditing ? "Edit Goal" : "Add Goal"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-x w-5 h-5"
              aria-hidden="true"
            >
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-r text-red-700 text-sm">
              <strong className="font-medium">Error:</strong> {errors.general}
            </div>
          )}

          {/* Goal name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent ${
                errors.title ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
              placeholder=""
            />
            {errors.title && (
              <p className="text-red-600 text-xs mt-1">{errors.title}</p>
            )}
          </div>

          {/* Two columns with center separator */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-y-6 md:gap-x-0.5">
            {/* Left column */}
            <div className="space-y-3 md:col-span-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Add a short description (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start date
                </label>
                <div className="relative mt-0">
                  <input
                    name="start_date"
                    ref={startRef}
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange("startDate", e.target.value)}
                    className="left-focus w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                    aria-label="Open date picker"
                    onClick={() => { try { startRef.current?.showPicker?.(); startRef.current?.focus(); } catch (__) {} }}
                  >📅</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Deadline <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-0">
                  <input
                    name="due_date"
                    required
                    ref={dueRef}
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange("dueDate", e.target.value)}
                    className={`left-focus w-full rounded-lg px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 appearance-none pr-11 no-calendar focus:border-green-500 focus:ring-2 focus:ring-green-50 ${
                      errors.dueDate ? "border-red-300 bg-red-50" : "border-slate-300 bg-white"
                    }`}
                    min={new Date().toISOString().split("T")[0]}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                    aria-label="Open date picker"
                    onClick={() => { try { dueRef.current?.showPicker?.(); dueRef.current?.focus(); } catch (__) {} }}
                  >📅</button>
                </div>
                {errors.dueDate && (
                  <p className="text-red-600 text-xs mt-1">{errors.dueDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Area
                </label>
                <select
                  value={formData.keyAreaId}
                  onChange={(e) =>
                    handleInputChange("keyAreaId", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  <option value="">Select key area</option>
                  {keyAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visibility
                </label>
                <select
                  value={formData.visibility}
                  onChange={(e) =>
                    handleInputChange("visibility", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            {/* separator column centered between left and right on md+ */}
            <div className="hidden md:flex md:items-stretch md:justify-center md:col-span-1">
              <div className="w-px bg-slate-400 my-2" />
            </div>

            {/* Right column – Milestones */}
            <div className="space-y-3 md:col-span-1">
              {/* Header with arrows + label + Add */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goPrevMilestone}
                    disabled={activeMilestoneIndex === 0}
                    className="p-1 rounded-md border border-gray-300 text-gray-600 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-medium text-gray-800">
                    Milestones ({activeMilestoneIndex + 1}/10)
                  </span>
                  <button
                    type="button"
                    onClick={goNextMilestone}
                    disabled={activeMilestoneIndex >= milestones.length - 1}
                    className="p-1 rounded-md border border-gray-300 text-gray-600 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={addMilestone}
                  disabled={milestones.length >= 10}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>



              {/* Name of milestone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name of milestone
                </label>
                <input
                  type="text"
                  value={currentMilestone.title}
                  onChange={(e) => handleMilestoneChange("title", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>

              {/* Start date (also available on the right for convenience) - moved below milestone name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start date
                </label>
                <div className="relative mt-0">
                  <input
                    name="start_date"
                    ref={rightStartRef}
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange("startDate", e.target.value)}
                    className="left-focus w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                    aria-label="Open date picker"
                    onClick={() => { try { rightStartRef.current?.showPicker?.(); rightStartRef.current?.focus(); } catch (__) {} }}
                  >📅</button>
                </div>
              </div>

              {/* Due date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Deadline
                </label>
                <div className="relative mt-0">
                  <input
                    name={`milestone_due_${activeMilestoneIndex}`}
                    ref={milestoneDueRef}
                    type="date"
                    value={currentMilestone.dueDate}
                    onChange={(e) => handleMilestoneChange("dueDate", e.target.value)}
                    className="left-focus w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-50 appearance-none pr-11 no-calendar"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                    aria-label="Open date picker"
                    onClick={() => { try { milestoneDueRef.current?.showPicker?.(); milestoneDueRef.current?.focus(); } catch (__) {} }}
                  >📅</button>
                </div>
              </div>

              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={currentMilestone.weight}
                  onChange={(e) =>
                    handleMilestoneChange(
                      "weight",
                      e.target.value === "" ? "" : parseFloat(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>

              {/* Delete milestone */}
              <button
                type="button"
                onClick={removeCurrentMilestone}
                disabled={milestones.length === 1}
                className="inline-flex ml-auto block items-center gap-1 text-xs text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3 h-3" />
                Delete milestone
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-4 py-2 text-sm"
            >
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM224 416c-35.346 0-64-28.654-64-64 0-35.346 28.654-64 64-64s64 28.654 64 64c0 35.346-28.654 64-64 64zm96-304.52V212c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h228.52c3.183 0 6.235 1.264 8.485 3.515l3.48 3.48A11.996 11.996 0 0 1 320 111.48z"></path></svg>
              {isSubmitting ? "Saving..." : isEditing ? "Update" : "Save"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              disabled
            >
              Help
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalForm;
