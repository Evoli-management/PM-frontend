import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { FaEdit, FaTrash, FaPlus, FaTimes, FaImage } from "react-icons/fa";

export function CultureAndValues({ showToast }) {
  const { t } = useTranslation();
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
    if (!confirm(t("cultureAndValues.confirmDelete"))) return;

    try {
      const cultureService = await import("../../services/cultureService");
      await cultureService.default.deleteValue(valueId);
      showToast?.(t("cultureAndValues.deleteSuccess"));
      loadValues();
    } catch (e) {
      showToast?.(e?.response?.data?.message || t("cultureAndValues.deleteValue"), "error");
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("cultureAndValues.title")}</h3>
          <p className="text-sm text-gray-600">
            {t("cultureAndValues.description")}
          </p>
        </div>
        <button
          onClick={handleCreateValue}
          disabled={values.length >= 12}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm"
          title={values.length >= 12 ? t("cultureAndValues.maxBehaviorsTitle") : t("cultureAndValues.addBehaviorTitle")}
        >
          {t("cultureAndValues.addNew")}
        </button>
      </div>

      {loading ? (
        <div className="p-4 text-sm text-gray-600">{t("cultureAndValues.loading")}</div>
      ) : values.length === 0 ? (
        <div className="p-4 text-sm text-gray-600">
          {t("cultureAndValues.noValues")}
        </div>
      ) : (
        <div>
          {values.length >= 12 && (
            <div className="p-3 m-4 mb-0 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                {t("cultureAndValues.maxReached")}
              </p>
            </div>
          )}
          <div className="divide-y">
            {values.map((value) => (
              <div key={value.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 flex gap-4">
                    {value.imageUrl && (
                      <div className="w-24 h-24 flex-shrink-0">
                        <img
                          src={value.imageUrl}
                          alt={value.heading}
                          className="w-full h-full object-cover rounded-lg"
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
                            {t("cultureAndValues.describeBehaviors")}
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
                      title={t("cultureAndValues.modalTitleEdit")}
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteValue(value.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title={t("cultureAndValues.deleteValue")}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
  const { t } = useTranslation();
  const isEdit = !!value;
  const [heading, setHeading] = useState(value?.heading || "");
  const [tooltip, setTooltip] = useState(value?.tooltip || "");
  const [imageUrl, setImageUrl] = useState(value?.imageUrl || "");
  const [behaviors, setBehaviors] = useState(value?.behaviors || [{ description: "" }]);
  const [saving, setSaving] = useState(false);

  const handleAddBehavior = () => {
    if (behaviors.length >= 4) {
      showToast?.(t("cultureAndValues.maxBehaviors"), "error");
      return;
    }
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
      showToast?.(t("cultureAndValues.headingRequired"), "error");
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
        showToast?.(t("cultureAndValues.updateSuccess"));
      } else {
        await cultureService.default.createValue(data);
        showToast?.(t("cultureAndValues.createSuccess"));
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
    // Center the value modal with a subtle backdrop and click-to-close behavior.
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-2xl max-w-3xl w-[min(1100px,90%)] overflow-visible flex flex-col z-10 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{isEdit ? t("cultureAndValues.modalTitleEdit") : t("cultureAndValues.modalTitleAdd")}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("cultureAndValues.valueHeading")}
            </label>
            <input
              type="text"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t("cultureAndValues.headingPlaceholder")}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("cultureAndValues.tooltipLabel")}
            </label>
            <input
              type="text"
              value={tooltip}
              onChange={(e) => setTooltip(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t("cultureAndValues.tooltipPlaceholder")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("cultureAndValues.imageUrl")} <FaImage className="inline ml-1" />
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
                  className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("cultureAndValues.describeBehaviorsLabel")}
            </label>
            <div className="space-y-2">
              {behaviors.map((behavior, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={behavior.description}
                    onChange={(e) => handleBehaviorChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t("cultureAndValues.behaviorPlaceholder")}
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
              disabled={behaviors.length >= 4}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={behaviors.length >= 4 ? t("cultureAndValues.maxBehaviorsTitle") : t("cultureAndValues.addBehaviorTitle")}
            >
              {behaviors.length >= 4 ? t("cultureAndValues.addBehaviorMax") : t("cultureAndValues.addBehavior")}
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              {t("cultureAndValues.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg"
            >
              {saving ? t("cultureAndValues.saving") : isEdit ? t("cultureAndValues.saveChanges") : t("cultureAndValues.addValue")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
