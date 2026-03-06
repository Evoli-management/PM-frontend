import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function VerifyPasswordChange() {
    const { t } = useTranslation();
    const { search } = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState(() => t("verifyPasswordChange.verifying"));
    const [verifyState, setVerifyState] = useState("verifying"); // "verifying" | "success" | "failed"

    useEffect(() => {
        const params = new URLSearchParams(search);
        const token = params.get("token");
        if (!token) {
            setStatus(t("verifyPasswordChange.missingToken"));
            setVerifyState("failed");
            return;
        }

        (async () => {
            try {
                const { default: auth } = await import("../services/authService");
                await auth.confirmPasswordChange(token);
                setStatus(t("verifyPasswordChange.success"));
                setVerifyState("success");
                setTimeout(() => navigate("/login"), 2000);
            } catch (e) {
                const msg = e?.response?.data?.message || t("verifyPasswordChange.failed");
                setStatus(typeof msg === "string" ? msg : t("verifyPasswordChange.failed"));
                setVerifyState("failed");
            }
        })();
    }, [search, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="p-6 rounded bg-white shadow text-gray-800 w-full max-w-md space-y-4">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-4">{t("verifyPasswordChange.title")}</h2>
                    <div className="p-4 rounded-md bg-blue-50 border border-blue-200">
                        {status}
                    </div>
                </div>

                {verifyState === "failed" && (
                    <div className="mt-4 text-center">
                        <p className="text-sm text-gray-600 mb-3">
                            {t("verifyPasswordChange.expiredHint")}
                        </p>
                        <button
                            onClick={() => navigate("/profile")}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2"
                        >
                            {t("verifyPasswordChange.goToProfile")}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
