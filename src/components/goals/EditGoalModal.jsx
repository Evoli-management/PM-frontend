// src/components/goals/EditGoalModal.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { updateGoal } from "../../services/goalService";
import { FaTimes, FaSave } from "react-icons/fa";

const EditGoalModal = ({ goal, onClose, onUpdate }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        title: goal.title || "",
        description: goal.description || "",
        dueDate: goal.dueDate || "",
        startDate: goal.startDate || "",
        status: goal.status || "active",
        visibility: goal.visibility || "public",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await updateGoal(goal.id, formData);
            onUpdate();
        } catch (err) {
            setError(err.message || t("editGoalModal.errUpdate"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">{t("editGoalModal.title")}</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                        <FaTimes className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">{t("editGoalModal.titleLabel")} *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">{t("editGoalModal.descLabel")}</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows="3"
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">{t("editGoalModal.startDateLabel")}</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">{t("editGoalModal.dueDateLabel")} *</label>
                            <input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">{t("editGoalModal.statusLabel")}</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="active">{t("editGoalModal.activeOpt")}</option>
                                <option value="completed">{t("editGoalModal.completedOpt")}</option>
                                <option value="archived">{t("editGoalModal.archivedOpt")}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-2">{t("editGoalModal.visibilityLabel")}</label>
                            <select
                                value={formData.visibility}
                                onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="public">{t("editGoalModal.publicOpt")}</option>
                                <option value="private">{t("editGoalModal.privateOpt")}</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            {t("editGoalModal.cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <FaSave className="w-4 h-4" />
                            {isSubmitting ? t("editGoalModal.saving") : t("editGoalModal.saveChanges")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditGoalModal;
