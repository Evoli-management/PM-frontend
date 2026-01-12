import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function VerifyEmail() {
    const { search } = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState("Verifying…");
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
        const invitationToken = params.get("invitationToken");
        if (!token) {
            setStatus("Missing token");
            return;
        }
        (async () => {
            try {
                const auth = await import("../services/authService");
                await auth.default.verifyEmail(token);
                setStatus("Email verified successfully. Redirecting…");
                setTimeout(() => {
                  if (invitationToken) {
                    navigate(`/join?token=${invitationToken}`);
                  } else {
                    navigate("/login");
                  }
                }, 1200);
            } catch (e) {
                const msg = e?.response?.data?.message || "Verification failed";
                setStatus(typeof msg === "string" ? msg : "Verification failed");
            }
        })();
    }, [search, navigate]);

    const handleResend = async (e) => {
        e.preventDefault();
        setResendMsg("");
        const email = resendEmail.trim();
        if (!email) {
            setResendMsg("Enter your email to resend.");
            return;
        }
        setResending(true);
        try {
            const { default: auth } = await import("../services/authService");
            const res = await auth.resendVerification(email);
            setResendMsg(res?.message || "If the account exists, we sent a new email.");
            setCooldown(30); // 30 seconds cooldown
        } catch (err) {
            const msg = err?.response?.data?.message || "Failed to resend email";
            setResendMsg(typeof msg === "string" ? msg : "Failed to resend email");
        } finally {
            setResending(false);
        }
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="p-6 rounded bg-white shadow text-gray-800 w-full max-w-md space-y-4">
                <div>{status}</div>
                <hr />
                <form onSubmit={handleResend} className="space-y-3">
                    <label className="block">
                        <span className="text-sm text-gray-600">Didn’t get the email? Resend verification</span>
                        <input
                            type="email"
                            placeholder="your@email.com"
                            value={resendEmail}
                            onChange={(e) => setResendEmail(e.target.value)}
                            className="mt-1 w-full border rounded px-3 py-2"
                        />
                        <span className="text-xs text-gray-500 block mt-1">You can change your email if you made a typo.</span>
                    </label>
                    <button
                        type="submit"
                        disabled={resending || cooldown > 0}
                        className={`w-full ${(resending || cooldown > 0) ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"} text-white rounded px-4 py-2`}
                    >
                        {resending ? "Sending…" : cooldown > 0 ? `Wait ${cooldown}s` : "Resend verification email"}
                    </button>
                    {resendMsg && <p className="text-sm text-gray-700">{resendMsg}</p>}
                </form>
            </div>
        </div>
    );
}
