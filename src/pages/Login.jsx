import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
// authService is imported dynamically at call sites to allow code-splitting

const LoginPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        rememberMe: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleForgotPassword = () => {
        navigate("/PasswordPageForget");
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const { email, password } = formData;
            const authService = await import("../services/authService").then((m) => m.default);
            const res = await authService.login({ email, password });

            // Try to get token from response
            let token = res.token || (res.user && res.user.token);
            if (token) {
                console.log("Storing token in localStorage");
                localStorage.setItem("access_token", token);

                // Notify other parts of the app that auth state changed
                try {
                    window.dispatchEvent(new Event('authChanged'));
                } catch (e) {}

                // Verify the token works by testing an authenticated endpoint
                try {
                    const testRes = await authService.verifyToken();
                    console.log("Token verification successful:", testRes);
                    navigate("/dashboard");
                } catch (verifyError) {
                    console.error("Token verification failed:", verifyError);
                    setError("Authentication failed. Please try again.");
                }
            } else {
                console.error("No token in response:", res);
                setError("Login failed: No token received. Please contact support.");
            }
        } catch (err) {
            console.error("Login error:", err);
            const msg = err.response?.data?.message || "Login failed";
            // Detect unverified user error (customize if backend uses a different message)
            if (typeof msg === "string" && msg.toLowerCase().includes("verify your email")) {
                setError(
                    <span>
                        Your email is not verified. <br />
                        <button
                            type="button"
                            className="underline text-blue-700 font-semibold bg-transparent border-none cursor-pointer"
                            onClick={async () => {
                                try {
                                    const authService = await import("../services/authService").then((m) => m.default);
                                    await authService.resendVerification(formData.email);
                                    alert("Verification email resent! Please check your inbox.");
                                } catch {
                                    alert("Failed to resend verification email. Try again later.");
                                }
                            }}
                        >
                            Resend verification email
                        </button>
                    </span>,
                );
            } else {
                setError(Array.isArray(msg) ? msg.join(", ") : msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider) => {
        setLoading(true);
        setError("");
        setTimeout(() => {
            setLoading(false);
            if (provider === "Google" || provider === "Microsoft") {
                navigate("/");
            } else {
                setError("Social login failed. Try again.");
            }
        }, 1200);
    };

    return (
        <div className="min-h-screen flex items-center justify-center w-full max-w-6xl mx-auto">
            <div className="grid grid-cols-2 rounded-xl shadow-[0_-6px_20px_rgba(2,6,23,0.06)]">
                {/* <div className="absolute top-0 left-0 right-0 h-4 -translate-y-2 bg-gradient-to-b from-black/10 to-transparent pointer-events-none z-10" /> */}
                {/* Left: form pane */}
                <div className="p-8 flex flex-col justify-center">
                    <div className="py-2">
                        <h2 className="text-2xl font-bold mb-2 text-center">Login</h2>
                        <p className=" mb-4 text-center">Login and Take Control of Your Workflow.</p>
                    </div>
                    {/* Debug info for troubleshooting (opt-in via VITE_SHOW_DEBUG=true) */}
                    {import.meta.env.VITE_SHOW_DEBUG === "true" && (
                        <div className="text-xs text-gray-500 mb-2">API: {import.meta.env.VITE_API_BASE_URL}</div>
                    )}
                    <form className="space-y-4 w-full" onSubmit={handleSubmit} aria-label="Login form">
                        <div className="relative w-full">
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Enter your Email"
                                className="w-full p-3 pl-10 rounded-lg border border-gray-300 text-base"
                                required
                                aria-label="Email"
                                autoComplete="email"
                            />
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                <FontAwesomeIcon icon={faEnvelope} className="text-lg" />
                            </span>
                        </div>
                        <div className="relative w-full">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="Enter Password"
                                className="w-full p-3 pl-10 pr-10 rounded-lg border border-gray-300 text-base"
                                required
                                aria-label="Password"
                                autoComplete="current-password"
                            />
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                <FontAwesomeIcon icon={faLock} className="text-lg" />
                            </span>
                            <span
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-400"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                tabIndex={0}
                                role="button"
                            >
                                <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} className="text-lg" />
                            </span>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-2">
                            <label className="flex items-center text-sm text-black">
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleInputChange}
                                    className="mr-2"
                                    aria-label="Remember me"
                                />
                                Remember me!
                            </label>
                            <Link
                                to="/PasswordPageForget"
                                className="text-sm text-blue-700 underline font-semibold bg-transparent border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
                                aria-label="Forgot password"
                            >
                                Forget password?
                            </Link>
                        </div>
                        {error && (
                            <div className="w-full text-red-600 text-sm font-semibold text-center" role="alert">
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            className={`w-full rounded-lg bg-green-500 text-white font-bold py-3 text-lg transition hover:bg-green-600 ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
                            disabled={loading}
                            aria-busy={loading}
                        >
                            {loading ? "Logging in..." : "Login"}
                        </button>
                        <div className="w-full flex items-center justify-center gap-4 my-6 text-sm text-black font-semibold">
                            <span className="flex-1 h-[1px] bg-black"></span>
                            <span>or continue</span>
                            <span className="flex-1 h-[1px] bg-black"></span>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full">
                            <button
                                type="button"
                                onClick={() => handleSocialLogin("Google")}
                                className={`flex items-center justify-center border border-gray-300 rounded-lg w-full sm:w-1/2 h-12 bg-gray-100 transition hover:bg-gray-200 ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
                                disabled={loading}
                                aria-label="Login with Google"
                            >
                                <img
                                    src="/PM-frontend/google.svg"
                                    alt="Google"
                                    loading="lazy"
                                    className="w-5 h-5 mr-2"
                                />
                                <span className="text-gray-700 font-medium">Login with Google</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSocialLogin("Microsoft")}
                                className={`flex items-center justify-center border border-gray-300 rounded-lg w-full sm:w-1/2 h-12 bg-gray-100 transition hover:bg-gray-200 ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
                                disabled={loading}
                                aria-label="Login with Microsoft"
                            >
                                <img
                                    src="/PM-frontend/microsoft.svg"
                                    alt="Microsoft"
                                    loading="lazy"
                                    className="w-5 h-5 mr-2"
                                />
                                <span className="text-gray-700 font-medium">Login with Microsoft</span>
                            </button>
                        </div>
                        <p className="text-sm text-center mt-4 text-black font-semibold">
                            Not registered yet?{" "}
                            <Link to="/registration" className="text-blue-600 hover:text-blue-800 underline">
                                Please register here
                            </Link>
                        </p>
                    </form>
                </div>
                {/* Right: Illustration */}
                <div className="hidden p-8 md:flex flex-col items-center">
                    <div className="flex items-center justify-center">
                        <img
                            src={`${import.meta.env.BASE_URL}login.png`}
                            alt="Login Illustration"
                            loading="lazy"
                            className="object-contain object-center"
                        />
                    </div>
                    <p className="text-sm text-gray-600 font-semibold leading-6 mx-auto text-center">
                        This account is protected with Two factor authentication (2FA)
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
