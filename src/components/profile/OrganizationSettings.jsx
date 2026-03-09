import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';

export function OrganizationSettings({ showToast }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  const [enpsInterval, setEnpsInterval] = useState("2 weeks");
  const [subscriptionManager, setSubscriptionManager] = useState("");
  const [plans, setPlans] = useState([]);
  const [usage, setUsage] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [changingPlan, setChangingPlan] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const orgService = await import("../../services/organizationService");
      const [data, currentUsage, planList, manager] = await Promise.all([
        orgService.default.getOrganizationSettings(),
        orgService.default.getCurrentUsage(),
        orgService.default.getPlans(),
        orgService.default.getSubscriptionManager(),
      ]);
      setSettings(data);
      setUsage(currentUsage || null);
      setPlans(Array.isArray(planList) ? planList : []);
      
      // Populate form fields
      setCompanyName(data.name || "");
      setVatNumber(data.vatNumber || "");
      setAddressStreet(data.addressStreet || "");
      setAddressCity(data.addressCity || "");
      setAddressState(data.addressState || "");
      setAddressZip(data.addressZip || "");
      setAddressCountry(data.addressCountry || "");
      setEnpsInterval(data.enpsInterval || "2 weeks");
      if (manager && (manager.firstName || manager.lastName)) {
        setSubscriptionManager(`${manager.firstName || ""} ${manager.lastName || ""}`.trim());
      } else {
        setSubscriptionManager("");
      }
      if (data.subscriptionPlanId) {
        setSelectedPlanId(data.subscriptionPlanId);
      } else if (data.subscriptionPlan && planList?.length) {
        const byName = planList.find((p) => p.name === data.subscriptionPlan);
        if (byName) setSelectedPlanId(byName.id);
      }
    } catch (e) {
      showToast?.(e?.response?.data?.message || t("organizationSettings.loadError"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async () => {
    if (!selectedPlanId || selectedPlanId === settings?.subscriptionPlanId) return;
    setChangingPlan(true);
    try {
      const orgService = await import("../../services/organizationService");
      await orgService.default.updateSubscriptionPlan(selectedPlanId);
      showToast?.(t("organizationSettings.updatePlanSuccess"));
      await loadSettings();
    } catch (e) {
      showToast?.(e?.response?.data?.message || t("organizationSettings.updatePlanError"), "error");
    } finally {
      setChangingPlan(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const orgService = await import("../../services/organizationService");
      await orgService.default.updateOrganizationSettings({
        name: companyName.trim(),
        vatNumber: vatNumber.trim(),
        addressStreet: addressStreet.trim(),
        addressCity: addressCity.trim(),
        addressState: addressState.trim(),
        addressZip: addressZip.trim(),
        addressCountry: addressCountry.trim(),
        enpsInterval,
      });
      showToast?.(t("organizationSettings.saveSuccess"));
      loadSettings();
    } catch (e) {
      showToast?.(e?.response?.data?.message || t("organizationSettings.saveError"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-600">{t("organizationSettings.loading")}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">{t("organizationSettings.title")}</h3>
        <p className="text-sm text-gray-600">{t("organizationSettings.description")}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* eNPS Settings */}
        <div className="border-b pb-4">
          <h4 className="font-medium text-gray-900 mb-3">{t("organizationSettings.enpsTitle")}</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("organizationSettings.enpsInterval")}
            </label>
            <select
              value={enpsInterval}
              onChange={(e) => setEnpsInterval(e.target.value)}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1 week">{t("organizationSettings.week1")}</option>
              <option value="2 weeks">{t("organizationSettings.weeks2")}</option>
              <option value="1 month">{t("organizationSettings.month1")}</option>
              <option value="3 months">{t("organizationSettings.months3")}</option>
            </select>
          </div>
        </div>

        {/* Subscription Settings */}
        <div className="border-b pb-4">
          <h4 className="font-medium text-gray-900 mb-3">{t("organizationSettings.subscriptionTitle")}</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("organizationSettings.subscriptionManager")}
              </label>
              <input
                type="text"
                value={subscriptionManager}
                readOnly
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder=""
              />
            </div>

            {settings?.subscriptionPlan && (
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm">
                  <span className="font-medium">{t("organizationSettings.subscriptionPlan")}</span>{" "}
                  <span className="text-green-600">{settings.subscriptionPlan}</span>
                </p>
                {settings.subscriptionStatus && (
                  <p className="text-sm mt-1">
                    <span className="font-medium">{t("organizationSettings.statusLabel")}</span>{" "}
                    {settings.subscriptionStatus}
                  </p>
                )}
                {usage && (
                  <p className="text-xs mt-2 text-gray-600">
                    {t("organizationSettings.usage", { members: usage.currentMembers, maxMembers: usage.maxMembers, teams: usage.currentTeams, maxTeams: usage.maxTeams })}
                  </p>
                )}
              </div>
            )}

            {plans.length > 0 && (
              <div className="mt-3 space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t("organizationSettings.changePlan")}
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" disabled>{t("organizationSettings.selectPlan")}</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} • {p.maxMembers} members • {p.maxTeams} teams
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePlanChange}
                    disabled={changingPlan || !selectedPlanId || selectedPlanId === settings?.subscriptionPlanId}
                    className="px-3 py-2 text-sm rounded bg-blue-600 text-white disabled:opacity-60"
                  >
                    {changingPlan ? t("organizationSettings.updating") : t("organizationSettings.updatePlan")}
                  </button>
                  <span className="text-xs text-gray-500">
                    {t("organizationSettings.downgradeLimits")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Company Information */}
        <div className="border-b pb-4">
          <h4 className="font-medium text-gray-900 mb-3">{t("organizationSettings.companyInfo")}</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("organizationSettings.companyName")}
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder=""
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("organizationSettings.vatNumber")}
              </label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder=""
              />
            </div>
          </div>
        </div>

        {/* Company Address */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">{t("organizationSettings.companyAddress")}</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("organizationSettings.companyStreet")}
              </label>
              <input
                type="text"
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder=""
              />
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("organizationSettings.companyCity")}
                </label>
                <input
                  type="text"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder=""
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("organizationSettings.companyState")}
                </label>
                <input
                  type="text"
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder=""
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("organizationSettings.companyZip")}
                </label>
                <input
                  type="text"
                  value={addressZip}
                  onChange={(e) => setAddressZip(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder=""
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("organizationSettings.companyCountry")}
                </label>
                <input
                  type="text"
                  value={addressCountry}
                  onChange={(e) => setAddressCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder=""
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg"
          >
            {saving ? t("organizationSettings.saving") : t("organizationSettings.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
