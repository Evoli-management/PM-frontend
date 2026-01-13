import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";
import organizationService from "../services/organizationService";
import authService from "../services/authService";

export default function JoinOrganization() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState("loading"); // loading, pending, unauthenticated, accepting, success, error
  const [invitationInfo, setInvitationInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load invitation info on mount
  useEffect(() => {
    if (!token) {
      console.log("[JoinOrganization] No token provided");
      setError("No invitation token provided");
      setState("error");
      return;
    }

    console.log("[JoinOrganization] Token from URL:", token);

    const loadInvitation = async () => {
      try {
        setState("loading");
        console.log("[JoinOrganization] Loading invitation with token:", token);
        
        // Check if user is authenticated
        let authenticated = false;
        try {
          await authService.verify();
          setIsAuthenticated(true);
          authenticated = true;
          console.log("[JoinOrganization] User is authenticated");
        } catch (authErr) {
          console.log("[JoinOrganization] User is NOT authenticated:", authErr.message);
          setIsAuthenticated(false);
        }

        // Load invitation info
        console.log("[JoinOrganization] Loading invitation info for token:", token);
        const info = await organizationService.getInvitationInfo(token);
        console.log("[JoinOrganization] Invitation info loaded:", info);
        setInvitationInfo(info);
        
        // If authenticated, immediately try to accept the invitation
        if (authenticated) {
          console.log("[JoinOrganization] User authenticated, attempting to accept invitation");
          setState("accepting");
          try {
            const result = await organizationService.acceptInvitation(token);
            console.log("[JoinOrganization] Invitation accepted successfully:", result);
            setState("success");
            // Give user a moment to see success message before redirecting
            setTimeout(() => {
              navigate("/dashboard");
            }, 2000);
          } catch (acceptErr) {
            console.error("[JoinOrganization] Failed to accept invitation:", acceptErr);
            setError(acceptErr?.response?.data?.message || acceptErr.message || "Failed to accept invitation");
            setState("pending"); // Fall back to pending state if acceptance fails
          }
        } else {
          console.log("[JoinOrganization] User not authenticated, redirecting to /invite");
          // Not authenticated - redirect to InvitationEntry for proper flow
          navigate(`/invite?token=${token}`);
        }
      } catch (err) {
        console.error("[JoinOrganization] Error in loadInvitation:", err);
        setError(err?.response?.data?.message || err.message || "Failed to load invitation");
        setState("error");
      }
    };

    loadInvitation();
  }, [token, navigate]);

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

        {/* Pending Acceptance (Authenticated) */}
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

        {/* Unauthenticated State */}
        {state === "unauthenticated" && invitationInfo && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📧</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Received</h1>
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

            <p className="text-gray-600 mb-6 text-center">
              To accept this invitation, please log in or create a new account.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => navigate(`/login?invitationToken=${token}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                Sign In to Accept
              </button>

              <button
                onClick={() => navigate(`/registration?token=${token}`)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                Create New Account & Accept
              </button>

              <button
                onClick={() => navigate("/")}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                Back to Home
              </button>
            </div>
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
