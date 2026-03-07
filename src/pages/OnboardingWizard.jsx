import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, Check, Clock, Users, X } from "lucide-react";

export default function OnboardingWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSkipping, setIsSkipping] = useState(false);
  const [formData, setFormData] = useState({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    language: localStorage.getItem("language") || "en",
    teamName: "",
    teamDescription: "",
    inviteEmails: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const timezones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Hong_Kong",
    "Australia/Sydney",
  ];

  const languages = [
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
    { code: "fr", label: "Français" },
    { code: "de", label: "Deutsch" },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    if (step === 2) {
      if (!formData.teamName.trim()) {
        newErrors.teamName = t("onboarding.teamNameRequired");
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        // Step 3 - submit
        handleFinish();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      // Save preferences
      localStorage.setItem("timezone", formData.timezone);
      localStorage.setItem("language", formData.language);

      // If team was created, we could make an API call here
      // For now, just redirect to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (err) {
      console.error("Error finishing onboarding:", err);
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setIsSkipping(true);
    setTimeout(() => {
      navigate("/dashboard");
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t("onboarding.welcome")}
          </h1>
          <p className="text-gray-600">
            {t("onboarding.stepOf", { step: currentStep })}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 flex gap-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`flex-1 h-2 rounded-full transition-colors ${
                step <= currentStep ? "bg-blue-600" : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Step 1: Preferences */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-blue-600" />
                  {t("onboarding.step1Title")}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t("onboarding.step1Subtitle")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("onboarding.timezoneLabel")}
                </label>
                <select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {t("onboarding.timezoneHint")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("onboarding.languageLabel")}
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Team Creation */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-600" />
                  {t("onboarding.step2Title")}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t("onboarding.step2Subtitle")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("onboarding.teamNameLabel")}
                </label>
                <input
                  type="text"
                  name="teamName"
                  placeholder={t("onboarding.teamNamePlaceholder")}
                  value={formData.teamName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.teamName
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {errors.teamName && (
                  <p className="text-red-600 text-sm mt-1">{errors.teamName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("onboarding.teamDescLabel")}
                </label>
                <textarea
                  name="teamDescription"
                  placeholder={t("onboarding.teamDescPlaceholder")}
                  value={formData.teamDescription}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  {t("onboarding.teamTip")}
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Invite Team Members */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-600" />
                  {t("onboarding.step3Title")}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t("onboarding.step3Subtitle")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("onboarding.emailAddressesLabel")}
                </label>
                <textarea
                  name="inviteEmails"
                  placeholder="Enter email addresses, one per line&#10;e.g.,&#10;john@example.com&#10;jane@example.com"
                  value={formData.inviteEmails}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {t("onboarding.emailAddressesHint")}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900">
                  {t("onboarding.almostDone")}
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex gap-4 justify-between">
            <div className="flex gap-4">
              {currentStep > 1 && (
                <button
                  onClick={handlePrevious}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                  {t("onboarding.back")}
                </button>
              )}
              <button
                onClick={handleSkip}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 text-gray-700 font-semibold hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
                {t("onboarding.skipForNow")}
              </button>
            </div>

            <button
              onClick={handleNext}
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === 3 ? (
                <>
                  <Check className="w-5 h-5" />
                  {t("onboarding.getStarted")}
                </>
              ) : (
                <>
                  {t("onboarding.next")}
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {(submitting || isSkipping) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-semibold">{t("onboarding.finalizing")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
