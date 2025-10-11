import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import authService from "../services/authService";

export default function VerifyPasswordChange() {
    const { search } = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState("Verifying password change…");

    useEffect(() => {
        const params = new URLSearchParams(search);
        const token = params.get("token");
        if (!token) {
            setStatus("Missing verification token");
            return;
        }
        
        authService
            .confirmPasswordChange(token)
            .then(() => {
                setStatus("Password changed successfully! Redirecting to login…");
                setTimeout(() => navigate("/login"), 2000);
            })
            .catch((e) => {
                const msg = e?.response?.data?.message || "Password change verification failed";
                setStatus(typeof msg === "string" ? msg : "Password change verification failed");
            });
    }, [search, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="p-6 rounded bg-white shadow text-gray-800 w-full max-w-md space-y-4">
                <div className="text-center">
                    <h2 className="text-xl font-semibold mb-4">Password Change Verification</h2>
                    <div className="p-4 rounded-md bg-blue-50 border border-blue-200">
                        {status}
                    </div>
                </div>
                
                {status.includes("failed") && (
                    <div className="mt-4 text-center">
                        <p className="text-sm text-gray-600 mb-3">
                            The verification link may have expired or already been used.
                        </p>
                        <button
                            onClick={() => navigate("/settings/security")}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2"
                        >
                            Go to Security Settings
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}