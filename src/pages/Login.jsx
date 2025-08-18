
import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faLock,
  faEye,
  faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      {/* Main Box */}
      <div className="w-full max-w-[1450px] bg-white rounded-xl shadow-[0_0_25px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between px-8 py-10">
        
        {/* Left Section. */}
        <div className="w-full md:w-1/2 flex flex-col items-center">
          {/* Logo */}
          <img
            src="/logo.png"
            alt="Practical Manager Logo"
            className="mb-4"
            style={{ width: "314.63px", height: "210px" }}
          />

          <h2 className="text-[28px] font-bold text-black mb-2">LOGIN</h2>
          <p className="text-black font-semibold mb-4 text-base text-center">
            Login and Take Control of Your Workflow.
          </p>

          {/* Form */}
          <form className="space-y-4 flex flex-col items-center">
            {/* Email Input */}
            <div className="relative" style={{ width: "721px", height: "65px" }}>
              <input
                type="email"
                placeholder="Enter your Email"
                className="w-full h-full pl-12 pr-2 border border-gray-300 rounded-none text-black"
                style={{ backgroundColor: "#AEC1FF" }}
              />
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black">
                <FontAwesomeIcon icon={faEnvelope} className="text-2xl" />
              </span>
            </div>

            {/* Password Input */}
            <div className="relative" style={{ width: "721px", height: "65px" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                className="w-full h-full pl-12 pr-10 border border-gray-300 rounded-none text-black"
                style={{ backgroundColor: "#AEC1FF" }}
              />
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black">
                <FontAwesomeIcon icon={faLock} className="text-2xl" />
              </span>
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 cursor-pointer text-black"
              >
                <FontAwesomeIcon
                  icon={showPassword ? faEye : faEyeSlash}
                  className="text-2xl"
                />
              </span>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between w-[721px]">
              <label className="flex items-center text-sm text-black">
                <input type="checkbox" className="mr-2" /> Remember me!
              </label>
              <a href="#" className="text-sm text-black underline font-semibold">
                Forget password?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="text-white font-semibold rounded-[16px]"
              style={{ backgroundColor: "#00e200", width: "724px", height: "57px" }}
            >
              Login
            </button>

            {/* Divider */}
            <div className="w-[724px] flex items-center justify-center gap-4 my-6 text-sm text-black font-semibold">
              <span className="flex-1 h-[1px] bg-black"></span>
              <span>or continue</span>
              <span className="flex-1 h-[1px] bg-black"></span>
            </div>

            {/* Continue Box */}
            <div
              className="border border-gray-300 px-4 py-6 rounded-[24px] flex items-center justify-center"
              style={{ backgroundColor: "#DEE3DD", width: "727px", height: "90px" }}
            >
              <div className="flex justify-between gap-40">
                {/* Google */}
                <button
                  className="flex items-center justify-center border border-gray-300 rounded-[24px]"
                  style={{ backgroundColor: "#FFFFFF", width: "257px", height: "57px" }}
                >
                  <div className="flex items-center gap-2">
                    <img src="/google.svg" alt="Google" className="w-5 h-5" />
                    <span className="text-gray-700 text-sm font-medium">
                      Login with Google
                    </span>
                  </div>
                </button>

                {/* Microsoft */}
                <button
                  className="flex items-center justify-center border border-gray-300 rounded-[24px]"
                  style={{ backgroundColor: "#FFFFFF", width: "257px", height: "57px" }}
                >
                  <div className="flex items-center gap-2">
                    <img src="/microsoft.svg" alt="Microsoft" className="w-5 h-5" />
                    <span className="text-gray-700 text-sm font-medium">
                      Login with Microsoft
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Register Link */}
            <p className="text-sm text-center mt-4 text-black font-semibold">
              Not registered yet?{" "}
              <a href="#" className="text-blue-600 underline">
                Please register here
              </a>
            </p>
          </form>
        </div>

        {/* Right Vector Section */}
        <div className="hidden md:flex md:w-1/2 items-center justify-center">
          <div className="text-center">
            <img
              src="/image.png"
              alt="2FA Illustration"
              style={{ width: "515px", height: "600px" }}
            />
            <p
              className="mt-4 text-black text-sm font-semibold mx-auto"
              style={{ width: "439px", height: "57px" }}
            >
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
