import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

const ResetPasswordPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-[1450px] bg-white rounded-xl shadow-[0_0_25px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between px-8 py-10">
        {/* ───────── Left Section ───────── */}
        <div className="flex flex-col items-center w-full md:w-1/2">
          {/* Logo */}
          <img
            src="/logo.png"
            alt="Practical Manager Logo"
            className="mb-4"
            style={{ width: "314.63px", height: "210px" }}
          />

          {/* Pencil‑style white box */}
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
              RESET PASSWORD
            </h2>

            <p className="text-black font-medium text-base text-center mb-6 px-4">
              
              Please enter your new password to Reset your account
            </p>

            {/* New Password */}
            <div
              className="relative mb-6"
              style={{ width: "613px", height: "57px" }}
            >
              <input
                type="password"
                placeholder="Enter your new password"
                className="w-full h-full pl-12 pr-12 text-black placeholder-black border border-gray-300 rounded-[12px] text-sm"
                style={{ backgroundColor: "#AEC1FF" }}
              />
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black">
                <FontAwesomeIcon icon={faLock} className="text-xl" />
              </span>
              <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-black cursor-pointer">
                <FontAwesomeIcon icon={faEyeSlash} className="text-xl" />
              </span>
            </div>

            {/* Confirm Password */}
            <div
              className="relative mb-6"
              style={{ width: "613px", height: "57px" }}
            >
              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full h-full pl-12 pr-12 text-black placeholder-black border border-gray-300 rounded-[12px] text-sm"
                style={{ backgroundColor: "#AEC1FF" }}
              />
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black">
                <FontAwesomeIcon icon={faLock} className="text-xl" />
              </span>
              <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-black cursor-pointer">
                <FontAwesomeIcon icon={faEyeSlash} className="text-xl" />
              </span>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="text-black font-semibold w-[613px] h-[57px] rounded-[12px] shadow"
              style={{ backgroundColor: "#1BFF23" }}
            >
              SUBMIT
            </button>
          </div>
        </div>

        {/* ───────── Right Section ───────── */}
        <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center">
          <div className="flex space-x-12 mb-8 mt-10">
            <p className="text-black text-base font-semibold">
              BENEFIT AND FEATURES
            </p>
            <p className="text-black text-base font-semibold">PRICING</p>
            <p className="text-black text-base font-semibold">
              CONTACT AND HELP
            </p>
          </div>

          {/* Vector illustration */}
          <div className="text-center">
            <img
              src="/reset.png"
              alt="Reset Password Illustration"
              style={{ width: "400px", height: "470px" }}
            />
            <p
              className="mt-4 text-black text-sm font-semibold mx-auto"
              style={{ width: "439px", height: "57px" }}
            >
              No worries,Lets Get You Back in<br/> safely.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
