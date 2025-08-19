import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

const LoginPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        rememberMe: false,
    });
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
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Basic validation
        if (!formData.email || !formData.password) {
            alert("Please fill in all fields");
            return;
        }

        // Here you would typically make an API call to authenticate
        // For now, we'll just simulate a successful login
        console.log("Login submitted:", formData);

        // Simulate API call delay
        setTimeout(() => {
            // Redirect to homepage after successful login
            navigate("/");
        }, 500);
    };

    const handleSocialLogin = (provider) => {
        // Handle social login (Google/Microsoft)
        console.log(`${provider} login initiated`);
        // Simulate social login success
        setTimeout(() => {
            navigate("/");
        }, 500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white p-4">
            {/* Main Box */}
            <div className="w-full max-w-[1450px] bg-white rounded-xl shadow-[0_0_25px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row items-center justify-between px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
                {/* Left Section. */}
                <div className="w-full lg:w-1/2 flex flex-col items-center">
                    {/* Logo */}
                    <img
                        src="/PM-frontend/logo.png"
                        alt="Practical Manager Logo"
                        className="mb-4 w-[200px] h-[133px] sm:w-[250px] sm:h-[167px] lg:w-[314.63px] lg:h-[210px] object-contain"
                    />

                    <h2 className="text-[20px] sm:text-[24px] lg:text-[28px] font-bold text-black mb-2">LOGIN</h2>
                    <p className="text-black font-semibold mb-4 text-sm sm:text-base text-center px-4">
                        Login and Take Control of Your Workflow.
                    </p>

                    {/* Form */}
                    <form className="space-y-4 flex flex-col items-center w-full" onSubmit={handleSubmit}>
                        {/* Email Input */}
                        <div className="relative w-full max-w-[721px] h-[55px] sm:h-[65px]">
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Enter your Email"
                                className="w-full h-full pl-10 sm:pl-12 pr-2 border border-gray-300 rounded-lg sm:rounded-none text-black text-sm sm:text-base"
                                style={{ backgroundColor: "#AEC1FF" }}
                                required
                            />
                            <span className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-black">
                                <FontAwesomeIcon icon={faEnvelope} className="text-lg sm:text-2xl" />
                            </span>
                        </div>

                        {/* Password Input */}
                        <div className="relative w-full max-w-[721px] h-[55px] sm:h-[65px]">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="Enter Password"
                                className="w-full h-full pl-10 sm:pl-12 pr-10 border border-gray-300 rounded-lg sm:rounded-none text-black text-sm sm:text-base"
                                style={{ backgroundColor: "#AEC1FF" }}
                                required
                            />
                            <span className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-black">
                                <FontAwesomeIcon icon={faLock} className="text-lg sm:text-2xl" />
                            </span>
                            <span
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 cursor-pointer text-black"
                            >
                                <FontAwesomeIcon
                                    icon={showPassword ? faEye : faEyeSlash}
                                    className="text-lg sm:text-2xl"
                                />
                            </span>
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-[721px] gap-2 sm:gap-0">
                            <label className="flex items-center text-xs sm:text-sm text-black">
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleInputChange}
                                    className="mr-2"
                                />{" "}
                                Remember me!
                            </label>
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="text-xs sm:text-sm text-black underline font-semibold bg-transparent border-none cursor-pointer"
                                style={{ padding: 0 }}
                            >
                                Forget password?
                            </button>
                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            className="text-white font-semibold rounded-[16px] w-full max-w-[724px] h-[50px] sm:h-[57px] text-sm sm:text-base"
                            style={{ backgroundColor: "#00e200" }}
                        >
                            Login
                        </button>

                        {/* Divider */}
                        <div className="w-full max-w-[724px] flex items-center justify-center gap-4 my-6 text-xs sm:text-sm text-black font-semibold">
                            <span className="flex-1 h-[1px] bg-black"></span>
                            <span>or continue</span>
                            <span className="flex-1 h-[1px] bg-black"></span>
                        </div>

                        {/* Continue Box */}
                        <div
                            className="border border-gray-300 px-4 py-6 rounded-[24px] flex items-center justify-center w-full max-w-[727px] min-h-[90px]"
                            style={{ backgroundColor: "#DEE3DD" }}
                        >
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 lg:gap-16 w-full">
                                {/* Google */}
                                <button
                                    type="button"
                                    onClick={() => handleSocialLogin("Google")}
                                    className="flex items-center justify-center border border-gray-300 rounded-[24px] w-full sm:w-[200px] lg:w-[257px] h-[50px] sm:h-[57px]"
                                    style={{ backgroundColor: "#FFFFFF" }}
                                >
                                    <div className="flex items-center gap-2">
                                        <img
                                            src="/PM-frontend/google.svg"
                                            alt="Google"
                                            className="w-4 h-4 sm:w-5 sm:h-5"
                                        />
                                        <span className="text-gray-700 text-xs sm:text-sm font-medium">
                                            Login with Google
                                        </span>
                                    </div>
                                </button>

                                {/* Microsoft */}
                                <button
                                    type="button"
                                    onClick={() => handleSocialLogin("Microsoft")}
                                    className="flex items-center justify-center border border-gray-300 rounded-[24px] w-full sm:w-[200px] lg:w-[257px] h-[50px] sm:h-[57px]"
                                    style={{ backgroundColor: "#FFFFFF" }}
                                >
                                    <div className="flex items-center gap-2">
                                        <img
                                            src="/PM-frontend/microsoft.svg"
                                            alt="Microsoft"
                                            className="w-4 h-4 sm:w-5 sm:h-5"
                                        />
                                        <span className="text-gray-700 text-xs sm:text-sm font-medium">
                                            Login with Microsoft
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Register Link */}
                        <p className="text-xs sm:text-sm text-center mt-4 text-black font-semibold">
                            Not registered yet?{" "}
                            <Link to="/registration" className="text-blue-600 hover:text-blue-800 underline">
                                Please register here
                            </Link>
                        </p>
                    </form>
                </div>

                {/* Right Vector Section */}
                <div className="hidden lg:flex lg:w-1/2 items-center justify-center">
                    <div className="text-center">
                        <img
                            src="/PM-frontend/image.png"
                            alt="2FA Illustration"
                            className="w-[300px] h-[350px] lg:w-[400px] lg:h-[470px] xl:w-[515px] xl:h-[600px] object-contain"
                        />
                        <p className="mt-4 text-black text-xs sm:text-sm font-semibold mx-auto max-w-[439px] px-4">
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
