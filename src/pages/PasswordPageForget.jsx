import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
                state: { email: email }, // Pass email to reset password page
            });
        }, 1000);
    };
    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-2 py-8">
            <div className="relative w-full max-w-5xl flex flex-col md:flex-row rounded-xl shadow-xl shadow-[0_-6px_20px_rgba(2,6,23,0.06)] overflow-hidden bg-white">
                <div className="absolute top-0 left-0 right-0 h-4 -translate-y-2 bg-gradient-to-b from-black/10 to-transparent pointer-events-none z-10" />
                {/* Left: form pane */}
                <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col justify-center">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-900 text-center">
                        Forgot password?
                    </h2>
                    <p className="text-gray-600 font-medium mb-4 text-base text-center">
                        Enter your email to receive reset password instructions
                    </p>
                    <form onSubmit={handleSubmit} className="w-full">
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
                            {isLoading ? "SENDING..." : "Submit"}
                        </button>
                        <div className="w-full flex flex-col items-center mt-6">
                            <span className="text-gray-500 text-sm mb-2">Remembered your password?</span>
                            <Link
                                to="/login"
                                className="w-full rounded-lg bg-blue-700 text-white font-bold py-3 text-lg transition hover:bg-blue-800 text-center"
                            >
                                Back to Login
                            </Link>
                        </div>
                    </form>
                </div>
                {/* Right: Illustration */}
                <div className="hidden md:flex md:w-1/2 flex-col items-center justify-start" style={{ minHeight: 300 }}>
                    <div className="w-full overflow-hidden flex items-center justify-center">
                        <img
                            src={`${import.meta.env.BASE_URL}forget.png`}
                            alt="Forgot Password Illustration"
                            className="w-[300px] h-[300px] lg:w-[350px] lg:h-[350px] object-contain mx-auto bg-white p-2 rounded-lg"
                        />
                    </div>
                    <p className="mt-1 md:-mt-4 text-black text-sm md:text-base lg:text-lg font-semibold leading-6 mx-auto max-w-[420px] px-3 text-center">
                        Your tasks won’t even notice you left.
                        <br />
                        Secure password, powered by Practical Manager.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
