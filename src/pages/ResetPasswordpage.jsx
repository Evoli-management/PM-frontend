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
            <div className="w-full max-w-5xl flex flex-col md:flex-row rounded-xl shadow-xl overflow-hidden bg-white">
                {/* Left: form pane */}
                <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col justify-center">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-900 text-center">Reset password</h2>
                    <p className="text-gray-600 font-medium mb-4 text-base text-center">Please enter your new password to reset your account</p>

                    {email && (
                        <div className="w-full mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-[420px] mx-auto text-center">
                            <p className="text-blue-800 font-medium text-sm sm:text-base">
                                <span className="text-xs sm:text-sm text-blue-600">Reset password for:</span>
                                <br />
                                <span className="font-bold">{email}</span>
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="w-full">
                        {passwords.confirmPassword && passwords.newPassword && (
                            <div className={`text-xs sm:text-sm mb-2 ${passwords.newPassword === passwords.confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                                {passwords.newPassword === passwords.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                            </div>
                        )}

                        <div className="relative mb-4 sm:mb-6 w-full">
                            <input
                                type={showPassword.newPassword ? "text" : "password"}
                                name="newPassword"
                                value={passwords.newPassword}
                                onChange={handlePasswordChange}
                                placeholder="Enter your new password"
                                className="w-full pl-10 pr-10 h-10 sm:h-12 box-border border rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400 bg-blue-100 border-gray-300 text-black"
                                required
                            />
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black">
                                <FontAwesomeIcon icon={faLock} className="text-lg sm:text-xl" />
                            </span>
                            <span 
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-black cursor-pointer"
                                onClick={() => togglePasswordVisibility('newPassword')}
                            >
                                <FontAwesomeIcon icon={showPassword.newPassword ? faEye : faEyeSlash} className="text-lg sm:text-xl" />
                            </span>
                        </div>

                        <div className="relative mb-4 sm:mb-6 w-full">
                            <input
                                type={showPassword.confirmPassword ? "text" : "password"}
                                name="confirmPassword"
                                value={passwords.confirmPassword}
                                onChange={handlePasswordChange}
                                placeholder="Confirm new password"
                                className="w-full pl-10 pr-10 h-10 sm:h-12 box-border border rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400 bg-blue-100 border-gray-300 text-black"
                                required
                            />
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black">
                                <FontAwesomeIcon icon={faLock} className="text-lg sm:text-xl" />
                            </span>
                            <span 
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-black cursor-pointer"
                                onClick={() => togglePasswordVisibility('confirmPassword')}
                            >
                                <FontAwesomeIcon icon={showPassword.confirmPassword ? faEye : faEyeSlash} className="text-lg sm:text-xl" />
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-lg bg-green-500 hover:bg-green-600 text-white h-10 sm:h-12 font-semibold"
                        >
                            {isLoading ? "RESETTING..." : "Reset password"}
                        </button>
                    </form>
                </div>

                {/* Right: Illustration */}
                <div className="hidden md:flex md:w-1/2 flex-col items-center justify-start" style={{ minHeight: 300 }}>
                    <div className="w-full overflow-hidden flex items-center justify-center px-4 sm:px-6">
                        <img
                            src={`${import.meta.env.BASE_URL}reset.png`}
                            alt="Reset Password Illustration"
                            className="max-w-[320px] md:max-w-[360px] lg:max-w-[420px] w-full h-auto max-h-[240px] md:max-h-[320px] lg:max-h-[420px] object-contain object-center bg-white p-3 rounded-lg mx-auto"
                        />
                    </div>
                    <p className="mt-4 text-black text-sm sm:text-base font-semibold mx-auto max-w-[439px] px-4 text-center">
                        No worries we’ll get you back in quickly and securely. Reset your password in seconds and regain access to your tasks and projects.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
