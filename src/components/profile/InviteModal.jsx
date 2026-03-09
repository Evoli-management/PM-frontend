import React, { useState } from "react";
import { useTranslation } from 'react-i18next';

export function InviteModal({ open, onClose, onInvite }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setGeneratedLink("");
    try {
      const res = await onInvite?.(email);
      if (res?.inviteUrl) setGeneratedLink(res.inviteUrl);
      setEmail("");
    } catch (_) {
      // handled by parent toast
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">{t("inviteModal.title")}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">{t("inviteModal.emailLabel")}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t("inviteModal.emailPlaceholder")}
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2"
          >
            {submitting ? t("inviteModal.generating") : t("inviteModal.generateLink")}
          </button>

          {generatedLink && (
            <div className="mt-3">
              <div className="text-sm text-gray-700 mb-1">{t("inviteModal.shareLink")}</div>
              <div className="rounded border bg-gray-50 px-3 py-2 text-sm break-all">{generatedLink}</div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
