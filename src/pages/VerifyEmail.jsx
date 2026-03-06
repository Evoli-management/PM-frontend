import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getFriendlyErrorMessage } from "../utils/errorMessages";

export default function VerifyEmail() {
    const { t } = useTranslation();
    const { search } = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState(() => t("verifyEmail.verifying"));
    const [resendEmail, setResendEmail] = useState("");
    const [resending, setResending] = useState(false);
    const [resendMsg, setResendMsg] = useState("");
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        // Pre-fill email from sessionStorage if available
        try {
            const cached = sessionStorage.getItem("recent_registration_email") || "";
            if (cached && !resendEmail) setResendEmail(cached);
        } catch {}
    }, [resendEmail]);

    useEffect(() => {
        const params = new URLSearchParams(search);
        const token = params.get("token");
        let invitationToken = params.get("invitationToken");
        if (!invitationToken) {
            try {
                invitationToken = localStorage.getItem("pending_invitation_token") || "";
            } catch {}
        }
        console.log("[VerifyEmail] Token:", token, "InvitationToken:", invitationToken);
        if (!token) {
            setStatus(t("verifyEmail.missingToken"));
            return;
        }
        (async () => {
            try {
                console.log("[VerifyEmail] Verifying email with token:", token);
                const auth = await import("../services/authService");
                const verifyResponse = await auth.default.verifyEmail(token);
                console.log("[VerifyEmail] Email verified. Response:", verifyResponse);
                setStatus(t("verifyEmail.verifiedRedirecting"));
                
                // If there's an invitation token and we got auth tokens back, use them
                if (invitationToken) {
                    console.log("[VerifyEmail] Invitation token found, will redirect to /join");
                    // The backend returns accessToken and refreshToken on verification
                    if (verifyResponse?.accessToken) {
                        console.log("[VerifyEmail] Storing tokens from verification response");
                        // Store tokens using the same keys the rest of the app expects
                        try {
                            localStorage.setItem('access_token', verifyResponse.accessToken);
                            if (verifyResponse.refreshToken) {
                                localStorage.setItem('refresh_token', verifyResponse.refreshToken);
                            }
                        } catch {}
                    }
                    try {
                        localStorage.removeItem("pending_invitation_token");
                    } catch {}
                    console.log("[VerifyEmail] Redirecting to /join with token:", invitationToken);
                    setTimeout(() => {
                        navigate(`/join?token=${invitationToken}`);
                    }, 1200);
                } else {
                    console.log("[VerifyEmail] No invitation token, redirecting to /login");
                    setTimeout(() => {
                        navigate("/login");
                    }, 1200);
                }
            } catch (e) {
                console.error("[VerifyEmail] Verification error:", e);
                const msg = e?.response?.data?.message || "Verification failed";
                const friendlyMsg = getFriendlyErrorMessage(msg);
                setStatus(friendlyMsg);
            }
        })();
    }, [search, navigate]);

    const handleResend = async (e) => {
        e.preventDefault();
        setResendMsg("");
        const email = resendEmail.trim();
        if (!email) {
            setResendMsg(t("verifyEmail.emailRequired"));
            return;
        }
        setResending(true);
        try {
            const { default: auth } = await import("../services/authService");
            const res = await auth.resendVerification(email);
            setResendMsg(res?.message || t("verifyEmail.resentSuccess"));
            setCooldown(30); // 30 seconds cooldown
        } catch (err) {
            const msg = err?.response?.data?.message || t("verifyEmail.resentFailed");
            const friendlyMsg = getFriendlyErrorMessage(msg);
            setResendMsg(friendlyMsg);
        } finally {
            setResending(false);
        }
    };

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="p-6 rounded bg-white shadow text-gray-800 w-full max-w-md space-y-4">
                <div>{status}</div>
                <hr />
                <form onSubmit={handleResend} className="space-y-3">
                    <label className="block">
                        <span className="text-sm text-gray-600">{t("verifyEmail.resendLabel")}</span>
                        <input
                            type="email"
                            placeholder="your@email.com"
                            value={resendEmail}
                            onChange={(e) => setResendEmail(e.target.value)}
                            className="mt-1 w-full border rounded px-3 py-2"
                        />
                        <span className="text-xs text-gray-500 block mt-1">{t("verifyEmail.typoCorrectionHint")}</span>
                    </label>
                    <button
                        type="submit"
                        disabled={resending || cooldown > 0}
                        className={`w-full ${(resending || cooldown > 0) ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"} text-white rounded px-4 py-2`}
                    >
                        {resending ? t("verifyEmail.sending") : cooldown > 0 ? t("verifyEmail.waitSeconds", { seconds: cooldown }) : t("verifyEmail.resendBtn")}
                    </button>
                    {resendMsg && <p className="text-sm text-gray-700">{resendMsg}</p>}
                </form>
            </div>
        </div>
    );
}
