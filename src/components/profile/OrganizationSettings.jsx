import React, { useEffect, useState } from "react";

export function OrganizationSettings({ showToast }) {
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
      const [data, currentUsage, planList] = await Promise.all([
        orgService.default.getOrganizationSettings(),
        orgService.default.getCurrentUsage(),
        orgService.default.getPlans(),
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
      setSubscriptionManager(data.subscriptionManager || "");
      if (data.subscriptionPlanId) {
        setSelectedPlanId(data.subscriptionPlanId);
      } else if (data.subscriptionPlan && planList?.length) {
        const byName = planList.find((p) => p.name === data.subscriptionPlan);
        if (byName) setSelectedPlanId(byName.id);
      }
    } catch (e) {
      showToast?.(e?.response?.data?.message || "Failed to load settings", "error");
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
      showToast?.("Subscription plan updated successfully");
      await loadSettings();
    } catch (e) {
      showToast?.(e?.response?.data?.message || "Failed to update subscription plan", "error");
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
        subscriptionManager: subscriptionManager.trim(),
      });
      showToast?.("Settings saved successfully");
      loadSettings();
    } catch (e) {
      showToast?.(e?.response?.data?.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Account Settings</h3>
        <p className="text-sm text-gray-600">Manage organization-wide settings</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* eNPS Settings */}
        <div className="border-b pb-4">
          <h4 className="font-medium text-gray-900 mb-3">eNPS Settings</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              eNPS Interval
            </label>
            <select
              value={enpsInterval}
              onChange={(e) => setEnpsInterval(e.target.value)}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1 week">1 week</option>
              <option value="2 weeks">2 weeks</option>
              <option value="1 month">1 month</option>
              <option value="3 months">3 months</option>
            </select>
          </div>
        </div>

        {/* Subscription Settings */}
        <div className="border-b pb-4">
          <h4 className="font-medium text-gray-900 mb-3">Subscription Settings</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Manager
              </label>
              <input
                type="text"
                value={subscriptionManager}
                onChange={(e) => setSubscriptionManager(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Alef Tunik"
              />
            </div>

            {settings?.subscriptionPlan && (
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm">
                  <span className="font-medium">Subscription Plan:</span>{" "}
                  <span className="text-green-600">{settings.subscriptionPlan}</span>
                </p>
                {settings.subscriptionStatus && (
                  <p className="text-sm mt-1">
                    <span className="font-medium">Status:</span>{" "}
                    {settings.subscriptionStatus}
                  </p>
                )}
                {usage && (
                  <p className="text-xs mt-2 text-gray-600">
                    Usage: {usage.currentMembers}/{usage.maxMembers} members • {usage.currentTeams}/{usage.maxTeams} teams
                  </p>
                )}
              </div>
            )}

            {plans.length > 0 && (
              <div className="mt-3 space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Change Plan
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" disabled>Select a plan</option>
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
                    {changingPlan ? "Updating..." : "Update Plan"}
                  </button>
                  <span className="text-xs text-gray-500">
                    Downgrade allowed only after member/team limits are met.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Company Information */}
        <div className="border-b pb-4">
          <h4 className="font-medium text-gray-900 mb-3">Company Information</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Claus Meller Consulting"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VAT Number
              </label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="VAT number"
              />
            </div>
          </div>
        </div>

        {/* Company Address */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Company Address</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Street
              </label>
              <input
                type="text"
                value={addressStreet}
                onChange={(e) => setAddressStreet(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Smičiklasova cesta 140, 4000 Kranj"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company City
                </label>
                <input
                  type="text"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Kranj"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company State
                </label>
                <input
                  type="text"
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Gorenjska"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company ZIP
                </label>
                <input
                  type="text"
                  value={addressZip}
                  onChange={(e) => setAddressZip(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="4000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Country
                </label>
                <input
                  type="text"
                  value={addressCountry}
                  onChange={(e) => setAddressCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Slovenia"
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
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
