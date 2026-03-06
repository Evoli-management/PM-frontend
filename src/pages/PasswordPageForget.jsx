import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { getFriendlyErrorMessage } from "../utils/errorMessages";
import { useTranslation } from "react-i18next";

const ForgotPasswordPage = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [cooldown, setCooldown] = useState(0);

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");
        setSuccessMsg("");
        if (!email) {
            setError(t("forgotPassword.emailRequired"));
            return;
        }
        if (!email.includes("@") || !email.includes(".")) {
            setError(t("forgotPassword.emailInvalid"));
            return;
        }
        if (cooldown > 0) return;
        setIsLoading(true);
        import("../services/authService").then(({ default: authService }) => {
            authService.forgotPassword(email)
                .then((res) => {
                    setSubmitted(true);
                    setSuccessMsg(res?.message || t("forgotPassword.successFallback", { email }));
                    setCooldown(30); // 30s cooldown
                })
                .catch((err) => {
                    const msg = err?.response?.data?.message || t("forgotPassword.sendFailed");
                    setError(getFriendlyErrorMessage(msg));
                })
                .finally(() => setIsLoading(false));
        });
    };

    // Cooldown timer effect
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    return (
        <div className="min-h-screen flex items-center justify-center w-full max-w-6xl mx-auto">
            <div className="relative grid grid-cols-1 md:grid-cols-2 rounded-xl shadow-xl">
                {/* <div className="absolute top-0 left-0 right-0 h-4 -translate-y-2 bg-gradient-to-b from-black/10 to-transparent pointer-events-none z-10" /> */}
                {/* Left: form pane */}
                <div className="p-8 flex flex-col justify-center">
                    {!submitted ? (
                        <>
                            <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-900 text-center">
                                {t("forgotPassword.title")}
                            </h2>
                            <p className="text-gray-600 font-medium mb-4 text-base text-center">
                                {t("forgotPassword.subtitle")}
                            </p>
                            <form onSubmit={handleSubmit} className="w-full">
                                <div className="relative w-full mb-4">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={handleEmailChange}
                                        placeholder={t("forgotPassword.emailPlaceholder")}
                                        className="w-full p-3 pl-10 rounded-lg border border-gray-300 text-base"
                                        required
                                    />
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                        <FontAwesomeIcon icon={faEnvelope} className="text-lg" />
                                    </span>
                                </div>
                                {error && <div className="text-red-600 text-sm mb-2 text-center">{error}</div>}
                                <button
                                    type="submit"
                                    disabled={isLoading || cooldown > 0}
                                    className="w-full rounded-lg bg-green-500 text-white font-bold py-3 text-lg transition hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? t("forgotPassword.sending") : cooldown > 0 ? t("forgotPassword.waitSeconds", { seconds: cooldown }) : t("forgotPassword.submit")}
                                </button>
                                <div className="w-full flex flex-col items-center mt-6 gap-2">
                                    <span className="text-gray-500 text-sm mb-2">{t("forgotPassword.rememberedPassword")}</span>
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center justify-center border border-slate-200 text-slate-700 rounded-lg px-8 py-2 text-lg font-medium hover:bg-slate-50 w-full"
                                    >
                                        {t("forgotPassword.backToLogin")}
                                    </Link>
                                    {/* <Link
                                        to="/register"
                                        className="w-full rounded-lg bg-green-600 text-white font-bold py-3 text-lg transition hover:bg-green-700 text-center"
                                    >
                                        Go to Registration
                                    </Link>
                                    <Link
                                        to="/verify-email"
                                        className="w-full rounded-lg bg-blue-500 text-white font-bold py-3 text-lg transition hover:bg-blue-600 text-center"
                                    >
                                        Go to Email Verification
                                    </Link> */}
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                            <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-green-700 text-center">
                                {t("forgotPassword.checkEmail")}
                            </h2>
                            <p className="text-gray-600 font-medium mb-4 text-base text-center">
                                {successMsg || t("forgotPassword.successFallback", { email })}
                                <br />
                                <span className="text-sm text-gray-500">{t("forgotPassword.spamHint")}</span>
                            </p>
                            <div className="w-full flex flex-col items-center gap-2">
                                <Link
                                    to="/login"
                                    className="w-full rounded-lg bg-blue-700 text-white font-bold py-3 text-lg transition hover:bg-blue-800 text-center"
                                >
                                    {t("forgotPassword.backToLogin")}
                                </Link>
                                <Link
                                    to="/register"
                                    className="w-full rounded-lg bg-green-600 text-white font-bold py-3 text-lg transition hover:bg-green-700 text-center"
                                >
                                    {t("forgotPassword.goToRegistration")}
                                </Link>
                                <Link
                                    to="/verify-email"
                                    className="w-full rounded-lg bg-blue-500 text-white font-bold py-3 text-lg transition hover:bg-blue-600 text-center"
                                >
                                    {t("forgotPassword.goToEmailVerification")}
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
                {/* Right: Illustration */}
                <div className="hidden p-8 md:flex flex-col items-center justify-start">
                    <div className="w-full overflow-hidden flex items-center justify-center">
                        <img
                            src={`${import.meta.env.BASE_URL}forget.png`}
                            alt="Forgot Password Illustration"
                            className="w-[300px] h-[300px] lg:w-[350px] lg:h-[350px] object-contain mx-auto p-2"
                        />
                    </div>
                    <p className="text-sm font-semibold leading-6 text-center">
                        {t("forgotPassword.illustration").split("\n").map((line, i) => (
                            <span key={i}>{line}{i === 0 && <br />}</span>
                        ))}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
