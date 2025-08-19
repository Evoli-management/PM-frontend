
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faEye, faEyeSlash, faInfoCircle } from "@fortawesome/free-solid-svg-icons";

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

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");
        if (!formData.email || !formData.password) {
            setError("Please fill in all fields.");
            return;
        }
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            if (formData.email !== "demo@pm.com" || formData.password !== "demo123") {
                setError("Invalid email or password.");
                return;
            }
            navigate("/");
        }, 1200);
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
        <div className="min-h-screen bg-white flex items-center justify-center px-2 py-8">
            <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8">
                {/* Login Box */}
                <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md mx-auto flex flex-col items-center">
                    <img
                        src="/PM-frontend/logo.png"
                        alt="Practical Manager Logo"
                        loading="lazy"
                        className="mb-4 w-32 h-20 object-contain"
                    />
                    <h2 className="text-2xl font-bold text-black mb-2 text-center">LOGIN</h2>
                    <p className="text-black font-semibold mb-4 text-base text-center">Login and Take Control of Your Workflow.</p>
                    <form className="space-y-4 w-full" onSubmit={handleSubmit} aria-label="Login form">
                        <div className="relative w-full">
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Enter your Email"
                                className="w-full p-3 pl-10 rounded-lg border border-gray-300 text-base bg-blue-100"
                                required
                                aria-label="Email"
                            />
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black">
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
                                className="w-full p-3 pl-10 pr-10 rounded-lg border border-gray-300 text-base bg-blue-100"
                                required
                                aria-label="Password"
                            />
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black">
                                <FontAwesomeIcon icon={faLock} className="text-lg" />
                            </span>
                            <span
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-black"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                tabIndex={0}
                                role="button"
                            >
                                <FontAwesomeIcon
                                    icon={showPassword ? faEye : faEyeSlash}
                                    className="text-lg"
                                />
                            </span>
                            <span className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400" title="Password must be at least 6 characters">
                                <FontAwesomeIcon icon={faInfoCircle} />
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
                        {error && <div className="w-full text-red-600 text-sm font-semibold text-center" role="alert">{error}</div>}
                        <button
                            type="submit"
                            className={`w-full rounded-lg bg-green-500 text-white font-bold py-3 text-lg transition hover:bg-green-600 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                                className={`flex items-center justify-center border border-gray-300 rounded-lg w-full sm:w-1/2 h-12 bg-white transition hover:bg-gray-50 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                                className={`flex items-center justify-center border border-gray-300 rounded-lg w-full sm:w-1/2 h-12 bg-white transition hover:bg-gray-50 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                {/* Illustration Section */}
                <div className="hidden md:flex flex-1 items-center justify-center">
                    <div className="text-center">
                        <img
                            src="/PM-frontend/image.png"
                            alt="2FA Illustration"
                            loading="lazy"
                            className="w-[300px] h-[350px] lg:w-[400px] lg:h-[470px] xl:w-[515px] xl:h-[600px] object-contain mx-auto"
                        />
                        <p className="mt-4 text-black text-sm font-semibold mx-auto max-w-[439px] px-4">
                            This account is protected with <br />
                            Two factor authentication 2FA
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
