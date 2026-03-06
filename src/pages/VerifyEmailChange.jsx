import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function VerifyEmailChange() {
    const { t } = useTranslation();
    const { search } = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState(() => t("verifyEmailChange.verifying"));
    const [verifyState, setVerifyState] = useState("verifying"); // "verifying" | "success" | "failed"

    useEffect(() => {
        const params = new URLSearchParams(search);
        const token = params.get("token");
        if (!token) {
            setStatus(t("verifyEmailChange.missingToken"));
            setVerifyState("failed");
            return;
        }

        (async () => {
            try {
                const { default: auth } = await import("../services/authService");
                await auth.confirmEmailChange(token);
                setStatus(t("verifyEmailChange.success"));
                setVerifyState("success");
                setTimeout(() => navigate("/login"), 3000);
            } catch (e) {
                const msg = e?.response?.data?.message || t("verifyEmailChange.failed");
                setStatus(typeof msg === "string" ? msg : t("verifyEmailChange.failed"));
                setVerifyState("failed");
            }
        })();
    }, [search, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="p-6 rounded bg-white shadow text-gray-800 w-full max-w-md space-y-4">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-4">{t("verifyEmailChange.title")}</h2>
                    <div className="p-4 rounded-md bg-blue-50 border border-blue-200">
                        {status}
                    </div>
                </div>

                {verifyState === "failed" && (
                    <div className="mt-4 text-center">
                        <p className="text-sm text-gray-600 mb-3">
                            {t("verifyEmailChange.expiredHint")}
                        </p>
                        <button
                            onClick={() => navigate("/profile")}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2"
                        >
                            {t("verifyEmailChange.goToProfile")}
                        </button>
                    </div>
                )}

                {verifyState === "success" && (
                    <div className="mt-4 text-center">
                        <p className="text-sm text-gray-600 mb-3">
                            {t("verifyEmailChange.successHint")}
                        </p>
                        <button
                            onClick={() => navigate("/login")}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2"
                        >
                            {t("verifyEmailChange.goToLogin")}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
