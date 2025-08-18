import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">Welcome to Practical Manager</h1>
                <p className="text-lg text-gray-600 mb-8">Take Control of Your Workflow</p>

                {/* Login Link Button */}
                <Link
                    to="/login"
                    className="inline-block bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                    Go to Login
                </Link>

                {/* Alternative text link */}
                <p className="mt-6 text-gray-600">
                    Need to sign in?{" "}
                    <Link to="/login" className="text-blue-600 hover:text-blue-800 underline font-semibold">
                        Click here to login
                    </Link>
                </p>
            </div>
        </div>
    );
}
