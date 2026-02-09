import React, { useState } from "react";
import { FaClock, FaCheckCircle, FaExclamationTriangle, FaRocket } from "react-icons/fa";

/**
 * Trial status banner component
 * Shows trial information and days remaining
 */
export function TrialStatusBanner({ trial, canManage, onStartTrial }) {
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
                Try Business Plan Free for 14 Days
              </div>
              <div className="text-sm text-green-700">
                Unlock 15 members and 3 teams with a free trial. No credit card required.
              </div>
            </div>
          </div>
          <button
            onClick={handleStartTrial}
            disabled={isStarting}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium whitespace-nowrap"
          >
            {isStarting ? 'Starting...' : 'Start Trial'}
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
              Trial Period Active
            </div>
            <div className={`text-sm ${isWarning ? 'text-amber-700' : 'text-blue-700'}`}>
              {trial.daysRemaining === 0 ? (
                <span>Your trial ends today!</span>
              ) : trial.daysRemaining === 1 ? (
                <span>1 day remaining</span>
              ) : (
                <span>{trial.daysRemaining} days remaining</span>
              )}
              {isWarning && (
                <span className="ml-2">
                  - Please upgrade or reduce to FREE plan limits before trial expires.
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
              Trial Period Expired
            </div>
            <div className="text-sm text-red-700">
              Your trial has ended. Please reduce to FREE plan limits (3 members, 1 team) to avoid automatic downgrade.
              Remove excess members or teams before your account is downgraded.
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
              Account Downgraded
            </div>
            <div className="text-sm text-gray-700">
              Your trial period ended and your account was downgraded to the FREE plan.
              Upgrade to BUSINESS plan to access more features.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
