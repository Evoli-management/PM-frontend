import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";

const ForgotPasswordPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-[1450px] bg-white rounded-xl shadow-[0_0_25px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between px-8 py-10">
        
        {/* Left Section */}
        <div className="flex flex-col items-center w-full md:w-1/2">
          {/* Logo */}
          <img
            src="/logo.png"
            alt="Practical Manager Logo"
            className="mb-4"
            style={{ width: "314.63px", height: "210px" }}
          />

          {/* White Box with Solid Border (Pencil-Style) */}
          <div
            className="flex flex-col items-center py-8 px-6 mb-6"
            style={{
              backgroundColor: "#ffffff",
              border: "2px solid #333",
              borderRadius: "12px",
              width: "720px",
              boxShadow: "2px 2px 0px rgba(0,0,0,0.3)",
            }}
          >
            <h2 className="text-[24px] font-bold text-black text-center mb-2">
              FORGOT PASSWORD?
            </h2>

            <p className="text-black font-medium text-base text-center mb-6 px-4">
              Enter your email to receive reset password instructions
            </p>

            <div
              className="relative mb-6 shadow"
              style={{ width: "613px", height: "57px" }}
            >
              <input
                type="email"
                placeholder="Email"
                className="w-full h-full pl-12 pr-4 text-black placeholder-black border border-gray-300 rounded-[12px] text-sm"
                style={{ backgroundColor: "#AEC1FF" }}
              />
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black">
                <FontAwesomeIcon icon={faEnvelope} className="text-xl" />
              </span>
            </div>

            <div
              className="flex items-center justify-center mb-6 shadow-lg"
              style={{
                width: "613px",
                height: "57px",
                backgroundColor: "#E2EEE0",
                borderRadius: "12px",
              }}
            >
              <button
                type="submit"
                className="text-black font-semibold w-[500px] h-[40px] rounded-[16px] shadow"
                style={{ backgroundColor: "#1BFF23" }}
              >
                Reset Password
              </button>
            </div>

            <button
              type="button"
              className="text-white font-semibold shadow-md"
              style={{
                backgroundColor: "#4285F4",
                width: "613px",
                height: "57px",
                borderRadius: "16px",
              }}
              onClick={() => (window.location.href = "/login")}
            >
              BACK TO LOGIN
            </button>
          </div>
        </div>

        {/* Right Section */}
        <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center">
          {/* Header Text Horizontally with more spacing and lower position */}
          <div className="flex space-x-12 mb-8 mt-10">
            <p className="text-black text-base font-semibold">BENEFIT AND FEATURES</p>
            <p className="text-black text-base font-semibold">PRICING</p>
            <p className="text-black text-base font-semibold">CONTACT AND HELP</p>
          </div>

          {/* Smaller Vector.*/}
          <div className="text-center">
            <img
              src="/forget.png"
              alt="Forgot Password Illustration"
              style={{ width: "400px", height: "470px" }}
            />
            <p
              className="mt-4 text-black text-sm font-semibold mx-auto"
              style={{ width: "439px", height: "57px" }}
            >
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
