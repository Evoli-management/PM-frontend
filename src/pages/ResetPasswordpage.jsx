import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faEyeSlash, faEye } from "@fortawesome/free-solid-svg-icons";

const ResetPasswordPage = () => {
    const [passwords, setPasswords] = useState({
        newPassword: "",
        confirmPassword: ""
    });
    const [showPassword, setShowPassword] = useState({
        newPassword: false,
        confirmPassword: false
    });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get email from navigation state
    const email = location.state?.email || "";

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswords(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const togglePasswordVisibility = (field) => {
        setShowPassword(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validation
        if (!passwords.newPassword || !passwords.confirmPassword) {
            alert("Please fill in all password fields");
            return;
        }

        if (passwords.newPassword.length < 8) {
            alert("Password must be at least 8 characters long");
            return;
        }

        if (passwords.newPassword !== passwords.confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        setIsLoading(true);

        // Simulate API call for password reset
        setTimeout(() => {
            setIsLoading(false);
            alert("Password reset successful! You can now login with your new password.");
            navigate("/login");
        }, 1500);
    };
    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
            <div className="w-full max-w-[1450px] bg-white rounded-xl shadow-[0_0_25px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row items-center justify-between px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
                {/* ───────── Left Section ───────── */}
                <div className="flex flex-col items-center w-full lg:w-1/2">
                    {/* Logo */}
                    <img
                        src="/PM-frontend/logo.png"
                        alt="Practical Manager Logo"
                        className="mb-4 w-[200px] h-[133px] sm:w-[250px] sm:h-[167px] lg:w-[314.63px] lg:h-[210px] object-contain"
                    />

                    {/* Pencil‑style white box */}
                    <div
                        className="flex flex-col items-center py-6 sm:py-8 px-4 sm:px-6 mb-6 w-full max-w-[720px]"
                        style={{
                            backgroundColor: "#ffffff",
                            border: "2px solid #333",
                            borderRadius: "12px",
                            boxShadow: "2px 2px 0px rgba(0,0,0,0.3)",
                        }}
                    >
                        <h2 className="text-[18px] sm:text-[20px] lg:text-[24px] font-bold text-black text-center mb-2">RESET PASSWORD</h2>

                        {/* Display email prominently if provided */}
                        {email && (
                            <div className="w-full max-w-[613px] mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-blue-800 font-medium text-sm sm:text-base text-center">
                                    <span className="text-xs sm:text-sm text-blue-600">Reset password for:</span>
                                    <br />
                                    <span className="font-bold">{email}</span>
                                </p>
                            </div>
                        )}

                        <p className="text-black font-medium text-sm sm:text-base text-center mb-4 sm:mb-6 px-2 sm:px-4">
                            Please enter your new password to reset your account
                        </p>

                        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
                            {/* Password match indicator */}
                            {passwords.confirmPassword && passwords.newPassword && (
                                <div className={`text-xs sm:text-sm mb-2 ${passwords.newPassword === passwords.confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                                    {passwords.newPassword === passwords.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                                </div>
                            )}

                            {/* New Password */}
                            <div className="relative mb-4 sm:mb-6 w-full max-w-[613px] h-[50px] sm:h-[57px]">
                                <input
                                    type={showPassword.newPassword ? "text" : "password"}
                                    name="newPassword"
                                    value={passwords.newPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Enter your new password"
                                    className="w-full h-full pl-10 sm:pl-12 pr-10 sm:pr-12 text-black placeholder-black border border-gray-300 rounded-[12px] text-sm sm:text-base"
                                    style={{ backgroundColor: "#AEC1FF" }}
                                    required
                                />
                                <span className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-black">
                                    <FontAwesomeIcon icon={faLock} className="text-lg sm:text-xl" />
                                </span>
                                <span 
                                    className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-black cursor-pointer"
                                    onClick={() => togglePasswordVisibility('newPassword')}
                                >
                                    <FontAwesomeIcon icon={showPassword.newPassword ? faEye : faEyeSlash} className="text-lg sm:text-xl" />
                                </span>
                            </div>

                            {/* Confirm Password */}
                            <div className="relative mb-4 sm:mb-6 w-full max-w-[613px] h-[50px] sm:h-[57px]">
                                <input
                                    type={showPassword.confirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={passwords.confirmPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Confirm new password"
                                    className="w-full h-full pl-10 sm:pl-12 pr-10 sm:pr-12 text-black placeholder-black border border-gray-300 rounded-[12px] text-sm sm:text-base"
                                    style={{ backgroundColor: "#AEC1FF" }}
                                    required
                                />
                                <span className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-black">
                                    <FontAwesomeIcon icon={faLock} className="text-lg sm:text-xl" />
                                </span>
                                <span 
                                    className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-black cursor-pointer"
                                    onClick={() => togglePasswordVisibility('confirmPassword')}
                                >
                                    <FontAwesomeIcon icon={showPassword.confirmPassword ? faEye : faEyeSlash} className="text-lg sm:text-xl" />
                                </span>
                            </div>

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="text-black font-semibold w-full max-w-[613px] h-[50px] sm:h-[57px] rounded-[12px] shadow text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: "#1BFF23" }}
                            >
                                {isLoading ? "RESETTING..." : "RESET PASSWORD"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ───────── Right Section ───────── */}
                <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center">
                    <div className="flex flex-wrap justify-center gap-4 lg:gap-8 xl:gap-12 mb-6 lg:mb-8 mt-6 lg:mt-10">
                        <p className="text-black text-xs lg:text-sm xl:text-base font-semibold text-center">BENEFIT AND FEATURES</p>
                        <p className="text-black text-xs lg:text-sm xl:text-base font-semibold text-center">PRICING</p>
                        <p className="text-black text-xs lg:text-sm xl:text-base font-semibold text-center">CONTACT AND HELP</p>
                    </div>

                    {/* Vector illustration */}
                    <div className="text-center">
                        <img
                            src="/PM-frontend/reset.png"
                            alt="Reset Password Illustration"
                            className="w-[250px] h-[295px] lg:w-[300px] lg:h-[355px] xl:w-[400px] xl:h-[470px] object-contain"
                        />
                        <p className="mt-4 text-black text-xs sm:text-sm font-semibold mx-auto max-w-[439px] px-4">
                            No worries, Let's Get You Back in
                            <br /> safely.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
