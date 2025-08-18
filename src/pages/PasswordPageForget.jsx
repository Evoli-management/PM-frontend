import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";

const ForgotPasswordPage = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
            <div className="w-full max-w-[1450px] bg-white rounded-xl shadow-[0_0_25px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row items-center justify-between px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
                {/* Left Section */}
                <div className="flex flex-col items-center w-full lg:w-1/2">
                    {/* Logo */}
                    <img
                        src="/PM-frontend/logo.png"
                        alt="Practical Manager Logo"
                        className="mb-4 w-[200px] h-[133px] sm:w-[250px] sm:h-[167px] lg:w-[314.63px] lg:h-[210px] object-contain"
                    />

                    {/* White Box with Solid Border (Pencil-Style) */}
                    <div
                        className="flex flex-col items-center py-6 sm:py-8 px-4 sm:px-6 mb-6 w-full max-w-[720px]"
                        style={{
                            backgroundColor: "#ffffff",
                            border: "2px solid #333",
                            borderRadius: "12px",
                            boxShadow: "2px 2px 0px rgba(0,0,0,0.3)",
                        }}
                    >
                        <h2 className="text-[18px] sm:text-[20px] lg:text-[24px] font-bold text-black text-center mb-2">FORGOT PASSWORD?</h2>

                        <p className="text-black font-medium text-sm sm:text-base text-center mb-4 sm:mb-6 px-2 sm:px-4">
                            Enter your email to receive reset password instructions
                        </p>

                        <div className="relative mb-4 sm:mb-6 shadow w-full max-w-[613px] h-[50px] sm:h-[57px]">
                            <input
                                type="email"
                                placeholder="Email"
                                className="w-full h-full pl-10 sm:pl-12 pr-4 text-black placeholder-black border border-gray-300 rounded-[12px] text-sm sm:text-base"
                                style={{ backgroundColor: "#AEC1FF" }}
                            />
                            <span className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-black">
                                <FontAwesomeIcon icon={faEnvelope} className="text-lg sm:text-xl" />
                            </span>
                        </div>

                        {/* Submit button */}
                        <button
                            type="submit"
                            className="text-black font-semibold w-full max-w-[613px] h-[50px] sm:h-[57px] rounded-[12px] shadow text-sm sm:text-base"
                            style={{ backgroundColor: "#1BFF23" }}
                        >
                            SUBMIT
                        </button>
                    </div>
                </div>

                {/* Right Section */}
                <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center">
                    {/* Header Text Horizontally with more spacing and lower position */}
                    <div className="flex flex-wrap justify-center gap-4 lg:gap-8 xl:gap-12 mb-6 lg:mb-8 mt-6 lg:mt-10">
                        <p className="text-black text-xs lg:text-sm xl:text-base font-semibold text-center">BENEFIT AND FEATURES</p>
                        <p className="text-black text-xs lg:text-sm xl:text-base font-semibold text-center">PRICING</p>
                        <p className="text-black text-xs lg:text-sm xl:text-base font-semibold text-center">CONTACT AND HELP</p>
                    </div>

                    {/* Smaller Vector.*/}
                    <div className="text-center">
                        <img
                            src="/PM-frontend/forget.png"
                            alt="Forgot Password Illustration"
                            className="w-[250px] h-[295px] lg:w-[300px] lg:h-[355px] xl:w-[400px] xl:h-[470px] object-contain"
                        />
                        <p className="mt-4 text-black text-xs sm:text-sm font-semibold mx-auto max-w-[439px] px-4">
                            Your tasks won’t even notice you left.
                            <br />
                            Secure password, powered by Practical Manager.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
