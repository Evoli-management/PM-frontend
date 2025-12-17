import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";
import organizationService from "../services/organizationService";

export default function JoinOrganization() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState("loading"); // loading, pending, accepting, success, error
  const [invitationInfo, setInvitationInfo] = useState(null);
  const [error, setError] = useState(null);

  // Load invitation info on mount
  useEffect(() => {
    if (!token) {
      setError("No invitation token provided");
      setState("error");
      return;
    }

    const loadInvitation = async () => {
      try {
        setState("loading");
        const info = await organizationService.getInvitationInfo(token);
        setInvitationInfo(info);
        setState("pending");
      } catch (err) {
        setError(err?.response?.data?.message || err.message || "Failed to load invitation");
        setState("error");
      }
    };

    loadInvitation();
  }, [token]);

  const handleAcceptInvitation = async () => {
    try {
      setState("accepting");
      const result = await organizationService.acceptInvitation(token);
      setState("success");
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to accept invitation");
      setState("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        {/* Loading State */}
        {state === "loading" && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Loader className="w-16 h-16 text-blue-600 mx-auto animate-spin mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading Invitation</h1>
            <p className="text-gray-600">Please wait while we verify your invitation...</p>
          </div>
        )}

        {/* Pending Acceptance */}
        {state === "pending" && invitationInfo && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎉</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Invited!</h1>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">You've been invited to join</span>
              </p>
              <p className="text-xl font-bold text-blue-600">{invitationInfo.organizationName}</p>
              <p className="text-sm text-gray-600 mt-2">
                Invited by: <span className="font-semibold">{invitationInfo.invitedBy}</span>
              </p>
            </div>

            <button
              onClick={handleAcceptInvitation}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 mb-4"
            >
              Accept Invitation & Join
            </button>

            <button
              onClick={() => navigate("/login")}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-lg transition-colors duration-200"
            >
              Back to Login
            </button>
          </div>
        )}

        {/* Accepting State */}
        {state === "accepting" && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Loader className="w-16 h-16 text-blue-600 mx-auto animate-spin mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Joining Organization</h1>
            <p className="text-gray-600">Setting up your access...</p>
          </div>
        )}

        {/* Success State */}
        {state === "success" && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h1>
            <p className="text-gray-600 mb-4">
              You've successfully joined the organization. Redirecting to dashboard...
            </p>
            <div className="flex justify-center">
              <div className="animate-pulse flex space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {state === "error" && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
            </div>

            <div className="bg-red-50 rounded-lg p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate("/")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                Go to Home
              </button>
              <button
                onClick={() => navigate("/login")}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-lg transition-colors duration-200"
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
