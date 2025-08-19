import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Basic email validation
        if (!email) {
            alert("Please enter your email address");
            return;
        }

        if (!email.includes("@") || !email.includes(".")) {
            alert("Please enter a valid email address");
            return;
        }

        setIsLoading(true);

        // Simulate API call for sending reset email
        setTimeout(() => {
            setIsLoading(false);
            // Redirect to reset password page
            navigate("/reset-password", { 
                state: { email: email } // Pass email to reset password page
            });
        }, 1000);
    };
    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-2 py-8">
            <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8">
                {/* Forgot Password Box */}
                <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md mx-auto flex flex-col items-center">
                    <img
                        src="/PM-frontend/logo.png"
                        alt="Practical Manager Logo"
                        className="mb-4 w-32 h-20 object-contain"
                    />
                    <h2 className="text-2xl font-bold text-black mb-2 text-center">FORGOT PASSWORD?</h2>
                    <p className="text-black font-medium mb-4 text-base text-center">Enter your email to receive reset password instructions</p>
                    <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
                        <div className="relative w-full mb-4">
                            <input
                                type="email"
                                value={email}
                                onChange={handleEmailChange}
                                placeholder="Email"
                                className="w-full p-3 pl-10 rounded-lg border border-gray-300 text-base bg-blue-100"
                                required
                            />
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black">
                                <FontAwesomeIcon icon={faEnvelope} className="text-lg" />
                            </span>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-lg bg-green-500 text-white font-bold py-3 text-lg transition hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "SENDING..." : "SUBMIT"}
                        </button>
                    </form>
                </div>
                {/* Illustration Section */}
                <div className="hidden md:flex flex-1 items-center justify-center">
                    <div className="text-center">
                        <img
                            src="/PM-frontend/forget.png"
                            alt="Forgot Password Illustration"
                            className="w-64 h-64 object-contain mx-auto"
                        />
                        <p className="mt-4 text-black text-sm font-semibold mx-auto max-w-xs px-4">
                            Your tasks won’t even notice you left.<br />
                            Secure password, powered by Practical Manager.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
