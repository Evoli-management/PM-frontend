import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { getFriendlyErrorMessage } from "../utils/errorMessages";
import { useTranslation } from "react-i18next";

export default function RequestRegistrationLink() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  // Validate email format
  const isValidEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    // Client-side validation
    if (!trimmedEmail) {
      setMessage(t("requestLink.emailRequired"));
      setStatus("error");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setMessage(t("requestLink.emailInvalid"));
      setStatus("error");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const authService = await import("../services/authService").then(
        (m) => m.default
      );
      await authService.sendRegistrationLink(trimmedEmail);
      
      // Always show success message (don't reveal if email exists)
      setStatus("success");
      setMessage(trimmedEmail);
      setEmail("");
      
      // Start cooldown for resend
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setStatus("error");
      const errorMsg =
        err?.response?.data?.message ||
        t("requestLink.failedFallback");
      setMessage(getFriendlyErrorMessage(errorMsg));
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t("requestLink.checkEmail")}
            </h1>
            <p className="text-gray-600 mb-6">
              {t("requestLink.sentTo")} <span className="font-semibold">{message}</span>
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-700">
                <strong>{t("requestLink.didntSee")}</strong>
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                <li>{t("requestLink.checkSpam")}</li>
                <li>{t("requestLink.verifyEmail")}</li>
                <li>{t("requestLink.linkExpires")}</li>
              </ul>
            </div>
            <button
              onClick={() => setStatus("idle")}
              disabled={cooldown > 0}
              className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                cooldown > 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {cooldown > 0 ? t("requestLink.resendIn", { seconds: cooldown }) : t("requestLink.sendAnother")}
            </button>
            <div className="mt-4">
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
              >
                {t("requestLink.alreadyAccountLink")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <Mail className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            {t("requestLink.title")}
          </h1>
          <p className="text-center text-gray-600 mb-8">
            {t("requestLink.subtitle")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                {t("requestLink.emailLabel")}
              </label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading"}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  status === "error"
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
              />
            </div>

            {message && status === "error" && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                status === "loading"
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {status === "loading" ? t("requestLink.sending") : t("requestLink.submit")}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="text-sm text-gray-500">{t("requestLink.or")}</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>

          <p className="text-center text-sm text-gray-600 mt-6">
            {t("requestLink.alreadyHave")}{" "}
            <Link
              to="/login"
              className="font-semibold text-blue-600 hover:text-blue-800"
            >
              {t("requestLink.signIn")}
            </Link>
          </p>

          <p className="text-xs text-gray-500 text-center mt-4">
            {t("requestLink.agreeText")}{" "}
            <Link to="/terms-of-service" target="_blank" className="text-blue-600 hover:text-blue-800">
              {t("requestLink.termsOfService")}
            </Link>{" "}
            {t("requestLink.and")}{" "}
            <Link to="/privacy-policy" target="_blank" className="text-blue-600 hover:text-blue-800">
              {t("requestLink.privacyPolicy")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
