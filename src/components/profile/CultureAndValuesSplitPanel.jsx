import React, { useEffect, useState, useRef } from "react";
import { FaTrash, FaPlus, FaTimes, FaImage, FaUpload } from "react-icons/fa";
import { useTranslation } from 'react-i18next';

export function CultureAndValues({ showToast }) {
  const { t } = useTranslation();
  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedValueId, setSelectedValueId] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadValues();
  }, []);

  useEffect(() => {
    // Auto-select first value when values load
    if (values.length > 0 && !selectedValueId) {
      setSelectedValueId(values[0].id);
    }
  }, [values, selectedValueId]);

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

  const selectedValue = values.find((v) => v.id === selectedValueId);

  const handleCreateValue = () => {
    // Add new empty value to the list
    const newValue = {
      id: "new",
      heading: "",
      tooltip: "",
      imageUrl: "/strokes/no-image.png",
      behaviors: [{ name: "", tooltip: "" }],
      displayOrder: String(values.length + 1),
    };
    setValues([...values, newValue]);
    setSelectedValueId("new");
  };

  const handleDeleteValue = async (valueId) => {
    if (valueId === "new") {
      setValues(values.filter((v) => v.id !== "new"));
      setSelectedValueId(values.length > 1 ? values[0].id : null);
      return;
    }

    if (!confirm(t("cultureAndValuesSplitPanel.confirmDelete"))) return;

    try {
      const cultureService = await import("../../services/cultureService");
      await cultureService.default.deleteValue(valueId);
      showToast?.(t("cultureAndValuesSplitPanel.deleteSuccess"));
      await loadValues();
      setSelectedValueId(values.length > 1 ? values[0].id : null);
    } catch (e) {
      showToast?.(e?.response?.data?.message || t("cultureAndValuesSplitPanel.deleteError"), "error");
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center text-gray-600">{t("cultureAndValuesSplitPanel.loadingValues")}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">{t("cultureAndValuesSplitPanel.editCulture")}</h3>
        <p className="text-sm text-gray-600 mt-1">
          {t("cultureAndValuesSplitPanel.editDescription")}
        </p>
      </div>

      <div className="flex h-[calc(100vh-350px)] min-h-[500px]">
        {/* Left Sidebar - Values List */}
        <div className="w-80 border-r overflow-y-auto flex-shrink-0">
          <div className="p-2">
            {values.map((value) => (
              <ValueListItem
                key={value.id}
                value={value}
                isSelected={value.id === selectedValueId}
                onClick={() => setSelectedValueId(value.id)}
                onDelete={() => handleDeleteValue(value.id)}
              />
            ))}
            {values.length < 12 && (
              <button
                onClick={handleCreateValue}
                className="w-full mt-2 p-3 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg text-center text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                <FaPlus className="inline mr-2" />
                {t("cultureAndValuesSplitPanel.addNew")}
              </button>
            )}
          </div>
        </div>

        {/* Right Panel - Edit Form */}
        <div className="flex-1 overflow-y-auto">
          {selectedValue ? (
            <ValueEditForm
              value={selectedValue}
              onSave={async (data) => {
                setSaving(true);
                try {
                  const cultureService = await import("../../services/cultureService");
                  if (selectedValue.id === "new") {
                    await cultureService.default.createValue(data);
                    showToast?.(t("cultureAndValuesSplitPanel.createSuccess"));
                  } else {
                    await cultureService.default.updateValue(selectedValue.id, data);
                    showToast?.(t("cultureAndValuesSplitPanel.updateSuccess"));
                  }
                  await loadValues();
                } catch (e) {
                  showToast?.(e?.response?.data?.message || t("cultureAndValuesSplitPanel.saveError"), "error");
                } finally {
                  setSaving(false);
                }
              }}
              saving={saving}
              showToast={showToast}
              fileInputRef={fileInputRef}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              {t("cultureAndValuesSplitPanel.selectOrCreate")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ValueListItem({ value, isSelected, onClick, onDelete }) {
  const { t } = useTranslation();
  return (
    <div
      className={`relative group p-3 rounded-lg cursor-pointer transition-all mb-1 ${
        isSelected
          ? "bg-blue-50 border-2 border-blue-500 shadow-sm"
          : "border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className={`font-medium ${isSelected ? "text-blue-700" : "text-gray-900"}`}>
          {value.heading || t("cultureAndValuesSplitPanel.newValue")}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded transition-opacity"
          title="Delete"
        >
          <FaTimes size={14} />
        </button>
      </div>
    </div>
  );
}

function ValueEditForm({ value, onSave, saving, showToast, fileInputRef }) {
  const { t } = useTranslation();
  const [heading, setHeading] = useState(value?.heading || "");
  const [tooltip, setTooltip] = useState(value?.tooltip || "");
  const [imageUrl, setImageUrl] = useState(value?.imageUrl || "/strokes/no-image.png");
  const [behaviors, setBehaviors] = useState(
    value?.behaviors?.length > 0
      ? value.behaviors.map((b) => ({
          name: b.name || b.description?.split(" - ")[0] || "",
          tooltip: b.tooltip || b.description?.split(" - ")[1] || "",
        }))
      : [{ name: "", tooltip: "" }]
  );
  const [uploading, setUploading] = useState(false);

  // Update form when selected value changes
  useEffect(() => {
    setHeading(value?.heading || "");
    setTooltip(value?.tooltip || "");
    setImageUrl(value?.imageUrl || "/strokes/no-image.png");
    setBehaviors(
      value?.behaviors?.length > 0
        ? value.behaviors.map((b) => ({
            name: b.name || b.description?.split(" - ")[0] || "",
            tooltip: b.tooltip || b.description?.split(" - ")[1] || "",
          }))
        : [{ name: "", tooltip: "" }]
    );
  }, [value?.id]);

  const handleAddBehavior = () => {
    if (behaviors.length >= 4) {
      showToast?.(t("cultureAndValuesSplitPanel.maxBehaviors"), "error");
      return;
    }
    setBehaviors([...behaviors, { name: "", tooltip: "" }]);
  };

  const handleRemoveBehavior = (index) => {
    if (behaviors.length === 1) {
      showToast?.(t("cultureAndValuesSplitPanel.minBehaviors"), "error");
      return;
    }
    setBehaviors(behaviors.filter((_, i) => i !== index));
  };

  const handleBehaviorChange = (index, field, value) => {
    const updated = [...behaviors];
    updated[index] = { ...updated[index], [field]: value };
    setBehaviors(updated);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/culture/upload-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      const data = await response.json();
      setImageUrl(data.imageUrl);
      showToast?.(t("cultureAndValuesSplitPanel.imageUploadSuccess"));
    } catch (error) {
      showToast?.(error.message || t("cultureAndValuesSplitPanel.imageUploadError"), "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!heading.trim()) {
      showToast?.(t("cultureAndValuesSplitPanel.cultureRequired"), "error");
      return;
    }

    const hasEmptyBehaviorName = behaviors.some((b) => !b.name.trim());
    if (hasEmptyBehaviorName) {
      showToast?.(t("cultureAndValuesSplitPanel.behaviorNamesRequired"), "error");
      return;
    }

    const hasEmptyBehaviorTooltip = behaviors.some((b) => !b.tooltip.trim());
    if (hasEmptyBehaviorTooltip) {
      showToast?.(t("cultureAndValuesSplitPanel.behaviorTooltipsRequired"), "error");
      return;
    }

    const data = {
      heading: heading.trim(),
      tooltip: tooltip.trim() || null,
      imageUrl: imageUrl,
      behaviors: behaviors.filter((b) => b.name.trim() && b.tooltip.trim()),
    };

    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Image Section */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <img
            src={imageUrl}
            alt="Culture value"
            className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onError={(e) => {
              e.target.src = "/strokes/no-image.png";
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("cultureAndValuesSplitPanel.valueHeading")}
          </label>
          <input
            type="text"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t("cultureAndValuesSplitPanel.valuePlaceholder")}
            required
          />
        </div>
      </div>

      {/* Image Upload Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm"
        >
          <FaUpload />
          {uploading ? t("cultureAndValuesSplitPanel.uploading") : t("cultureAndValuesSplitPanel.uploadImage")}
        </button>
        <span className="text-xs text-gray-500 flex items-center">
          {t("cultureAndValuesSplitPanel.imageSizeHint")}
        </span>
      </div>

      {/* Tooltip/Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("cultureAndValuesSplitPanel.tooltipLabel")}
        </label>
        <input
          type="text"
          value={tooltip}
          onChange={(e) => setTooltip(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={t("cultureAndValuesSplitPanel.tooltipPlaceholder")}
        />
      </div>

      {/* Behaviors */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("cultureAndValuesSplitPanel.describeBehaviors")}
        </label>
        <div className="space-y-4">
          {behaviors.map((behavior, index) => (
            <div key={index} className="relative border border-gray-200 rounded-lg p-4">
              <button
                type="button"
                onClick={() => handleRemoveBehavior(index)}
                className="absolute top-2 right-2 p-1 text-red-600 hover:bg-red-50 rounded"
                title="Remove behavior"
              >
                <FaTimes size={14} />
              </button>

              <div className="space-y-3 pr-8">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t("cultureAndValuesSplitPanel.behaviorName")}
                  </label>
                  <input
                    type="text"
                    value={behavior.name}
                    onChange={(e) => handleBehaviorChange(index, "name", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder={t("cultureAndValuesSplitPanel.behaviorNamePlaceholder")}
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t("cultureAndValuesSplitPanel.behaviorTooltip")}
                  </label>
                  <textarea
                    value={behavior.tooltip}
                    onChange={(e) => handleBehaviorChange(index, "tooltip", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                    placeholder={t("cultureAndValuesSplitPanel.behaviorTooltipPlaceholder")}
                    rows={2}
                    maxLength={255}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {behaviors.length < 4 && (
          <button
            type="button"
            onClick={handleAddBehavior}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {t("cultureAndValuesSplitPanel.addBehavior")}
          </button>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium"
        >
          {saving ? t("cultureAndValuesSplitPanel.saving") : t("cultureAndValuesSplitPanel.save")}
        </button>
      </div>
    </form>
  );
}
