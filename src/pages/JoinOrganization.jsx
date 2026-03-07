import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";
import organizationService from "../services/organizationService";
import authService from "../services/authService";
import { getFriendlyErrorMessage } from "../utils/errorMessages";
import { useTranslation } from "react-i18next";

export default function JoinOrganization() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState("loading"); // loading, pending, unauthenticated, accepting, success, error
  const [invitationInfo, setInvitationInfo] = useState(null);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [emailMismatch, setEmailMismatch] = useState(false);

  // Load invitation info on mount
  useEffect(() => {
    if (!token) {
      console.log("[JoinOrganization] No token provided");
      setError(t("joinOrg.noToken"));
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
        let userEmail = null;
        try {
          const userData = await authService.verify();
          setIsAuthenticated(true);
          authenticated = true;
          userEmail = userData?.user?.email || null;
          setCurrentUserEmail(userEmail);
          console.log("[JoinOrganization] User is authenticated with email:", userEmail);
        } catch (authErr) {
          console.log("[JoinOrganization] User is NOT authenticated:", authErr.message);
          setIsAuthenticated(false);
        }

        // Load invitation info
        console.log("[JoinOrganization] Loading invitation info for token:", token);
        const info = await organizationService.getInvitationInfo(token);
        console.log("[JoinOrganization] Invitation info loaded:", info);
        setInvitationInfo(info);
        
        // Check for email mismatch
        if (authenticated && userEmail && info?.invitedEmail) {
          const mismatch = userEmail.toLowerCase() !== info.invitedEmail.toLowerCase();
          setEmailMismatch(mismatch);
          if (mismatch) {
            console.warn("[JoinOrganization] Email mismatch detected:", userEmail, "vs", info.invitedEmail);
          }
        }
        
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
            setError(getFriendlyErrorMessage(acceptErr?.response?.data?.message || acceptErr.message || t("joinOrg.acceptFailed")));
            setState("pending"); // Fall back to pending state if acceptance fails
          }
        } else {
          console.log("[JoinOrganization] User not authenticated, redirecting to /invite");
          // Not authenticated - redirect to InvitationEntry for proper flow
          navigate(`/invite?token=${token}`);
        }
      } catch (err) {
        console.error("[JoinOrganization] Error in loadInvitation:", err);
        setError(getFriendlyErrorMessage(err?.response?.data?.message || err.message || t("joinOrg.loadFailed")));
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
      setError(getFriendlyErrorMessage(err?.response?.data?.message || err.message || t("joinOrg.acceptFailed")));
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("joinOrg.loadingTitle")}</h1>
            <p className="text-gray-600">{t("joinOrg.loadingText")}</p>
          </div>
        )}

        {/* Pending Acceptance (Authenticated) */}
        {state === "pending" && invitationInfo && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎉</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("joinOrg.youreInvited")}</h1>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">{t("joinOrg.invitedToJoin")}</span>
              </p>
              <p className="text-xl font-bold text-blue-600">{invitationInfo.organizationName}</p>
              <p className="text-sm text-gray-600 mt-2">
                {t("joinOrg.invitedBy")} <span className="font-semibold">{invitationInfo.invitedBy}</span>
              </p>
            </div>

            {emailMismatch && invitationInfo?.invitedEmail && currentUserEmail && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 mb-1">{t("joinOrg.emailMismatchTitle")}</p>
                  <p className="text-sm text-amber-800 mb-2">
                    {t("joinOrg.emailMismatchDesc", { currentEmail: currentUserEmail, invitedEmail: invitationInfo.invitedEmail })}
                  </p>
                  <p className="text-xs text-amber-700">
                    {t("joinOrg.emailMismatchHint")}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleAcceptInvitation}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 mb-4"
            >
              {t("joinOrg.acceptBtn")}
            </button>

            <button
              onClick={() => navigate("/login")}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-lg transition-colors duration-200"
            >
              {t("joinOrg.backToLogin")}
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("joinOrg.invitationReceived")}</h1>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">{t("joinOrg.invitedToJoin")}</span>
              </p>
              <p className="text-xl font-bold text-blue-600">{invitationInfo.organizationName}</p>
              <p className="text-sm text-gray-600 mt-2">
                {t("joinOrg.invitedBy")} <span className="font-semibold">{invitationInfo.invitedBy}</span>
              </p>
            </div>

            <p className="text-gray-600 mb-6 text-center">
              {t("joinOrg.loginOrCreate")}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => navigate(`/login?invitationToken=${token}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                {t("joinOrg.signInToAccept")}
              </button>

              <button
                onClick={() => navigate(`/registration?token=${token}`)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                {t("joinOrg.createAccountBtn")}
              </button>

              <button
                onClick={() => navigate("/")}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                {t("joinOrg.backToHome")}
              </button>
            </div>
          </div>
        )}

        {/* Accepting State */}
        {state === "accepting" && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Loader className="w-16 h-16 text-blue-600 mx-auto animate-spin mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("joinOrg.joiningTitle")}</h1>
            <p className="text-gray-600">{t("joinOrg.joiningText")}</p>
          </div>
        )}

        {/* Success State */}
        {state === "success" && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("joinOrg.welcomeTitle")}</h1>
            <p className="text-gray-600 mb-4">
              {t("joinOrg.welcomeText")}
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("joinOrg.invalidTitle")}</h1>
            </div>

            <div className="bg-red-50 rounded-lg p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate("/")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                {t("joinOrg.goToHome")}
              </button>
              <button
                onClick={() => navigate("/login")}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-lg transition-colors duration-200"
              >
                {t("joinOrg.backToLogin")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
