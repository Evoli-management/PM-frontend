import React, { useState } from "react";
import { useTranslation } from 'react-i18next';
import { FaClock, FaCheckCircle, FaExclamationTriangle, FaRocket } from "react-icons/fa";

/**
 * Trial status banner component
 * Shows trial information and days remaining
 */
export function TrialStatusBanner({ trial, canManage, onStartTrial }) {
  const { t } = useTranslation();
  const [isStarting, setIsStarting] = useState(false);

  if (!trial) return null;

  const handleStartTrial = async () => {
    if (!onStartTrial) return;
    setIsStarting(true);
    try {
      await onStartTrial();
    } finally {
      setIsStarting(false);
    }
  };

  // Show "Start Trial" option for owners/admins/subscription managers on FREE plan
  if (!trial.inTrial && !trial.hasExpired && !trial.trialStartedAt && canManage) {
    return (
      <div className="rounded-lg border bg-green-50 border-green-200 p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FaRocket className="text-green-600" size={20} />
            <div className="flex-1">
              <div className="font-semibold text-green-900">
                {t("trialStatusBanner.tryBusiness")}
              </div>
              <div className="text-sm text-green-700">
                {t("trialStatusBanner.trialDesc")}
              </div>
            </div>
          </div>
          <button
            onClick={handleStartTrial}
            disabled={isStarting}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium whitespace-nowrap"
          >
            {isStarting ? t("trialStatusBanner.starting") : t("trialStatusBanner.startTrial")}
          </button>
        </div>
      </div>
    );
  }

  // If not in trial and never was, don't show anything
  if (!trial.inTrial && !trial.hasExpired && !trial.trialDowngradedAt) {
    return null;
  }

  // Trial active - show days remaining
  if (trial.inTrial) {
    const isWarning = trial.daysRemaining <= 3;
    
    return (
      <div className={`rounded-lg border p-4 mb-4 ${isWarning ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-center gap-3">
          <FaClock className={isWarning ? 'text-amber-600' : 'text-blue-600'} size={20} />
          <div className="flex-1">
            <div className={`font-semibold ${isWarning ? 'text-amber-900' : 'text-blue-900'}`}>
              {t("trialStatusBanner.trialActive")}
            </div>
            <div className={`text-sm ${isWarning ? 'text-amber-700' : 'text-blue-700'}`}>
              {trial.daysRemaining === 0 ? (
                <span>{t("trialStatusBanner.trialEndsToday")}</span>
              ) : trial.daysRemaining === 1 ? (
                <span>{t("trialStatusBanner.trialDay1")}</span>
              ) : (
                <span>{t("trialStatusBanner.trialDays", { days: trial.daysRemaining })}</span>
              )}
              {isWarning && (
                <span className="ml-2">
                  {t("trialStatusBanner.upgradeWarning")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trial expired but not yet downgraded
  if (trial.hasExpired && !trial.trialDowngradedAt) {
    return (
      <div className="rounded-lg border bg-red-50 border-red-200 p-4 mb-4">
        <div className="flex items-center gap-3">
          <FaExclamationTriangle className="text-red-600" size={20} />
          <div className="flex-1">
            <div className="font-semibold text-red-900">
              {t("trialStatusBanner.trialExpired")}
            </div>
            <div className="text-sm text-red-700">
              {t("trialStatusBanner.trialExpiredDesc")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Downgraded after trial
  if (trial.trialDowngradedAt) {
    return (
      <div className="rounded-lg border bg-gray-50 border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-3">
          <FaCheckCircle className="text-gray-600" size={20} />
          <div className="flex-1">
            <div className="font-semibold text-gray-900">
              {t("trialStatusBanner.accountDowngraded")}
            </div>
            <div className="text-sm text-gray-700">
              {t("trialStatusBanner.accountDowngradedDesc")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
