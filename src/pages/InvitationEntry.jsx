import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader, AlertCircle } from "lucide-react";
import organizationService from "../services/organizationService";
import authService from "../services/authService";
import { getFriendlyErrorMessage } from "../utils/errorMessages";

export default function InvitationEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState("loading"); // loading, error
  const [error, setError] = useState(null);
  const [invitationInfo, setInvitationInfo] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided");
      setState("error");
      return;
    }

    const handleInvitation = async () => {
      try {
        setState("loading");

        // First, check if user is already authenticated
        let authenticated = false;
        try {
          await authService.verify();
          authenticated = true;
        } catch {
          authenticated = false;
        }

        // Get invitation info (includes organization name, invited email)
        const info = await organizationService.getInvitationInfo(token);
        setInvitationInfo(info);

        if (authenticated) {
          // User is already logged in - show accept page
          navigate(`/join?token=${token}`);
        } else {
          // User is not logged in
          const invitedEmail = info?.invitedEmail;
          if (!invitedEmail) {
            setError("Invalid invitation - no email found");
            setState("error");
            return;
          }

          // Redirect to registration with invitation token pre-filled
          // The registration page will handle email verification and auto-join the org
          navigate(`/registration?token=${token}&email=${encodeURIComponent(invitedEmail)}`);
        }
      } catch (err) {
        setError(getFriendlyErrorMessage(err?.response?.data?.message || err.message || "Failed to process invitation"));
        setState("error");
      }
    };

    handleInvitation();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        {/* Loading State */}
        {state === "loading" && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Loader className="w-16 h-16 text-blue-600 mx-auto animate-spin mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing Invitation</h1>
            <p className="text-gray-600">Please wait while we verify your invitation...</p>
          </div>
        )}

        {/* Error State */}
        {state === "error" && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => navigate("/login")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
