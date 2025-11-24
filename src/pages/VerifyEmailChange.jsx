import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function VerifyEmailChange() {
    const { search } = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState("Verifying email change…");

    useEffect(() => {
        const params = new URLSearchParams(search);
        const token = params.get("token");
        if (!token) {
            setStatus("Missing verification token");
            return;
        }
        
        (async () => {
            try {
                const { default: auth } = await import("../services/authService");
                await auth.confirmEmailChange(token);
                setStatus("Email address changed successfully! Please log in with your new email address.");
                setTimeout(() => navigate("/login"), 3000);
            } catch (e) {
                const msg = e?.response?.data?.message || "Email change verification failed";
                setStatus(typeof msg === "string" ? msg : "Email change verification failed");
            }
        })();
    }, [search, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="p-6 rounded bg-white shadow text-gray-800 w-full max-w-md space-y-4">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-4">Email Change Verification</h2>
                    <div className="p-4 rounded-md bg-blue-50 border border-blue-200">
                        {status}
                    </div>
                </div>
                
                {status.includes("failed") && (
                    <div className="mt-4 text-center">
                        <p className="text-sm text-gray-600 mb-3">
                            The verification link may have expired, already been used, or the email address is no longer available.
                        </p>
                        <button
                            onClick={() => navigate("/profile")}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2"
                        >
                            Go to Profile Settings
                        </button>
                    </div>
                )}

                {status.includes("successfully") && (
                    <div className="mt-4 text-center">
                        <p className="text-sm text-gray-600 mb-3">
                            Your email address has been updated. You'll need to log in again with your new email.
                        </p>
                        <button
                            onClick={() => navigate("/login")}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2"
                        >
                            Go to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}