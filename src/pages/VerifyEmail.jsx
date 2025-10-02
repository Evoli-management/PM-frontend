import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import authService from "../services/authService";

export default function VerifyEmail() {
    const { search } = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState("Verifying…");
    const [resendEmail, setResendEmail] = useState("");
    const [resending, setResending] = useState(false);
    const [resendMsg, setResendMsg] = useState("");

    useEffect(() => {
        try {
            const cached = sessionStorage.getItem("recent_registration_email") || "";
            if (cached) setResendEmail(cached);
        } catch {}
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(search);
        const token = params.get("token");
        if (!token) {
            setStatus("Missing token");
            return;
        }
        authService
            .verifyEmail(token)
            .then(() => {
                setStatus("Email verified successfully. Redirecting to login…");
                setTimeout(() => navigate("/login"), 1200);
            })
            .catch((e) => {
                const msg = e?.response?.data?.message || "Verification failed";
                setStatus(typeof msg === "string" ? msg : "Verification failed");
            });
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
            const res = await authService.resendVerification(email);
            setResendMsg(res?.message || "If the account exists, we sent a new email.");
        } catch (err) {
            const msg = err?.response?.data?.message || "Failed to resend email";
            setResendMsg(typeof msg === "string" ? msg : "Failed to resend email");
        } finally {
            setResending(false);
        }
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
                    </label>
                    <button
                        type="submit"
                        disabled={resending}
                        className={`w-full ${resending ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"} text-white rounded px-4 py-2`}
                    >
                        {resending ? "Sending…" : "Resend verification email"}
                    </button>
                    {resendMsg && <p className="text-sm text-gray-700">{resendMsg}</p>}
                </form>
            </div>
        </div>
    );
}
