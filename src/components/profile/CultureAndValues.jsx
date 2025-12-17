import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash, FaPlus, FaTimes, FaImage } from "react-icons/fa";

export function CultureAndValues({ showToast }) {
  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedValue, setSelectedValue] = useState(null);

  useEffect(() => {
    loadValues();
  }, []);

  const loadValues = async () => {
    try {
      const cultureService = await import("../../services/cultureService");
      const data = await cultureService.default.getValues();
      setValues(data);
    } catch (e) {
      console.error("Failed to load values:", e);
      setValues([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateValue = () => {
    setSelectedValue(null);
    setShowCreateModal(true);
  };

  const handleEditValue = (value) => {
    setSelectedValue(value);
    setShowEditModal(true);
  };

  const handleDeleteValue = async (valueId) => {
    if (!confirm("Are you sure you want to delete this value?")) return;

    try {
      const cultureService = await import("../../services/cultureService");
      await cultureService.default.deleteValue(valueId);
      showToast?.("Value deleted successfully");
      loadValues();
    } catch (e) {
      showToast?.(e?.response?.data?.message || "Failed to delete value", "error");
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Culture and Values</h3>
          <p className="text-sm text-gray-600">
            These values and behaviors are used in Recognition Cards
          </p>
        </div>
        <button
          onClick={handleCreateValue}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
        >
          <FaPlus /> Add new
        </button>
      </div>

      {loading ? (
        <div className="p-4 text-sm text-gray-600">Loading values...</div>
      ) : values.length === 0 ? (
        <div className="p-4 text-sm text-gray-600">
          No values defined yet. Add your company's core values to get started.
        </div>
      ) : (
        <div className="divide-y">
          {values.map((value) => (
            <div key={value.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1 flex gap-4">
                  {value.imageUrl && (
                    <div className="w-16 h-16 flex-shrink-0">
                      <img
                        src={value.imageUrl}
                        alt={value.heading}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{value.heading}</h4>
                    {value.tooltip && (
                      <p className="text-sm text-gray-600 italic mt-1">"{value.tooltip}"</p>
                    )}
                    {value.behaviors && value.behaviors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          Describe behaviors:
                        </p>
                        <ul className="space-y-1">
                          {value.behaviors.map((behavior, idx) => (
                            <li key={idx} className="text-sm text-gray-600">
                              • {behavior.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEditValue(value)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit value"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDeleteValue(value.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete value"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <ValueModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadValues();
          }}
          showToast={showToast}
        />
      )}

      {showEditModal && selectedValue && (
        <ValueModal
          value={selectedValue}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadValues();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function ValueModal({ value, onClose, onSuccess, showToast }) {
  const isEdit = !!value;
  const [heading, setHeading] = useState(value?.heading || "");
  const [tooltip, setTooltip] = useState(value?.tooltip || "");
  const [imageUrl, setImageUrl] = useState(value?.imageUrl || "");
  const [behaviors, setBehaviors] = useState(value?.behaviors || [{ description: "" }]);
  const [saving, setSaving] = useState(false);

  const handleAddBehavior = () => {
    setBehaviors([...behaviors, { description: "" }]);
  };

  const handleRemoveBehavior = (index) => {
    setBehaviors(behaviors.filter((_, i) => i !== index));
  };

  const handleBehaviorChange = (index, description) => {
    const updated = [...behaviors];
    updated[index] = { description };
    setBehaviors(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!heading.trim()) {
      showToast?.("Value heading is required", "error");
      return;
    }

    setSaving(true);
    try {
      const cultureService = await import("../../services/cultureService");
      const data = {
        heading: heading.trim(),
        tooltip: tooltip.trim(),
        imageUrl: imageUrl.trim(),
        behaviors: behaviors.filter((b) => b.description.trim()),
      };

      if (isEdit) {
        await cultureService.default.updateValue(value.id, data);
        showToast?.("Value updated successfully");
      } else {
        await cultureService.default.createValue(data);
        showToast?.("Value created successfully");
      }
      onSuccess();
    } catch (e) {
      showToast?.(
        e?.response?.data?.message || `Failed to ${isEdit ? "update" : "create"} value`,
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{isEdit ? "Edit Value" : "Add New Value"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value Heading *
            </label>
            <input
              type="text"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Commitment, Responsibility, Loyalty"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Screen Tooltip / Description
            </label>
            <input
              type="text"
              value={tooltip}
              onChange={(e) => setTooltip(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Short description shown as tooltip"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL <FaImage className="inline ml-1" />
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://..."
            />
            {imageUrl && (
              <div className="mt-2">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded border"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe Behaviors
            </label>
            <div className="space-y-2">
              {behaviors.map((behavior, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={behavior.description}
                    onChange={(e) => handleBehaviorChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Committed to work, Putting your heart and mind on it"
                  />
                  {behaviors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBehavior(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddBehavior}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              + Add another behavior
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg"
            >
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Value"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
