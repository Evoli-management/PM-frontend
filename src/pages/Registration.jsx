
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaUser, FaEnvelope, FaLock, FaRegEye, FaRegEyeSlash, FaInfoCircle } from "react-icons/fa";

export default function Registration() {
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirm: "",
        agree: true,
    });
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
        setErrors({});
        setSuccess("");
    };

    // --- Password rules & strength (Weak / Moderate / Strong) ---
    const pwdRules = useMemo(() => {
        const p = form.password || "";
        return {
            length: p.length >= 6,
            upper: /[A-Z]/.test(p),
            lower: /[a-z]/.test(p),
            digit: /\d/.test(p),
        };
    }, [form.password]);

    const strength = useMemo(() => {
        const passed = Object.values(pwdRules).filter(Boolean).length;
        if (!form.password) return { label: "", pct: 0 };
        if (passed <= 2) return { label: "Weak", pct: 33 };
        if (passed === 3) return { label: "Moderate", pct: 66 };
        return { label: "Strong", pct: 100 };
    }, [pwdRules, form.password]);

    const validate = () => {
        const e = {};
        if (!form.firstName.trim()) e.firstName = "First name is required";
        if (!form.lastName.trim()) e.lastName = "Last name is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email address";
        if (!form.password || form.password.length < 6) e.password = "Password must be at least 6 characters";
        if (form.confirm !== form.password) e.confirm = "Passwords do not match";
        if (!form.agree) e.agree = "Please accept Terms & Privacy Policy";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const onSubmit = (e) => {
        e.preventDefault();
        setSuccess("");
        if (!validate()) return;
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            setSuccess("Registered successfully! Please check your email to verify your account.");
        }, 1200);
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="mx-auto max-w-6xl px-4 py-10">
                <h1 className="text-center text-2xl font-extrabold tracking-wide text-gray-900">REGISTRATION</h1>
                <div className="mt-8 grid gap-10 md:grid-cols-2">
                    {/* LEFT: FORM */}
                    <form
                        onSubmit={onSubmit}
                        className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                        aria-label="Registration form"
                    >
                        {/* First Name */}
                        <div>
                            <div className="flex items-center gap-3 rounded-lg bg-slate-100/70 px-4">
                                <FaUser className="text-gray-500" />
                                <input
                                    name="firstName"
                                    placeholder="Enter first name"
                                    value={form.firstName}
                                    onChange={onChange}
                                    autoComplete="off"
                                    className="h-12 w-full bg-transparent outline-none placeholder:text-gray-500"
                                    aria-label="First name"
                                />
                            </div>
                            {errors.firstName && <p className="mt-1 text-sm text-red-600" role="alert">{errors.firstName}</p>}
                        </div>
                        {/* Last Name */}
                        <div>
                            <div className="flex items-center gap-3 rounded-lg bg-slate-100/70 px-4">
                                <FaUser className="text-gray-500" />
                                <input
                                    name="lastName"
                                    placeholder="Enter last name"
                                    value={form.lastName}
                                    onChange={onChange}
                                    autoComplete="off"
                                    className="h-12 w-full bg-transparent outline-none placeholder:text-gray-500"
                                    aria-label="Last name"
                                />
                            </div>
                            {errors.lastName && <p className="mt-1 text-sm text-red-600" role="alert">{errors.lastName}</p>}
                        </div>
                        {/* Email */}
                        <div>
                            <div className="flex items-center gap-3 rounded-lg bg-slate-100/70 px-4">
                                <FaEnvelope className="text-gray-500" />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter your email"
                                    value={form.email}
                                    onChange={onChange}
                                    autoComplete="off"
                                    className="h-12 w-full bg-transparent outline-none placeholder:text-gray-500"
                                    aria-label="Email"
                                />
                            </div>
                            {errors.email && <p className="mt-1 text-sm text-red-600" role="alert">{errors.email}</p>}
                        </div>
                        {/* Password */}
                        <div>
                            <div className="flex items-center gap-3 rounded-lg bg-slate-100/70 px-4">
                                <FaLock className="text-gray-500" />
                                <input
                                    type={showPwd ? "text" : "password"}
                                    name="password"
                                    placeholder="Enter password"
                                    value={form.password}
                                    onChange={onChange}
                                    autoComplete="off"
                                    className="h-12 w-full bg-transparent outline-none placeholder:text-gray-500"
                                    aria-label="Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd((s) => !s)}
                                    className="p-2"
                                    aria-label={showPwd ? "Hide password" : "Show password"}
                                >
                                    {showPwd ? <FaRegEyeSlash /> : <FaRegEye />}
                                </button>
                                <span className="text-gray-400 ml-2" title="Password must be at least 6 characters">
                                    <FaInfoCircle />
                                </span>
                            </div>
                            {/* Strength meter */}
                            {form.password && (
                                <div className="mt-2">
                                    <div className="h-2 w-full rounded bg-gray-200">
                                        <div
                                            className={`h-2 rounded ${strength.pct < 50 ? "bg-red-500" : strength.pct < 100 ? "bg-yellow-500" : "bg-green-500"}`}
                                            style={{ width: `${strength.pct}%` }}
                                        />
                                    </div>
                                    <div className="mt-1 text-sm text-gray-600">
                                        Strength: <span className="font-medium">{strength.label}</span>
                                    </div>
                                    <ul className="mt-1 space-y-1 text-xs text-gray-600">
                                        <li className={pwdRules.length ? "text-green-600" : ""}>
                                            • At least 6 characters
                                        </li>
                                        <li className={pwdRules.upper ? "text-green-600" : ""}>
                                            • Contains uppercase letter
                                        </li>
                                        <li className={pwdRules.lower ? "text-green-600" : ""}>
                                            • Contains lowercase letter
                                        </li>
                                        <li className={pwdRules.digit ? "text-green-600" : ""}>• Contains a number</li>
                                    </ul>
                                </div>
                            )}
                            {errors.password && <p className="mt-1 text-sm text-red-600" role="alert">{errors.password}</p>}
                        </div>
                        {/* Confirm password */}
                        <div>
                            <div className="flex items-center gap-3 rounded-lg bg-slate-100/70 px-4">
                                <FaLock className="text-gray-500" />
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    name="confirm"
                                    placeholder="Confirm password"
                                    value={form.confirm}
                                    onChange={onChange}
                                    autoComplete="off"
                                    className="h-12 w-full bg-transparent outline-none placeholder:text-gray-500"
                                    aria-label="Confirm password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm((s) => !s)}
                                    className="p-2"
                                    aria-label={showConfirm ? "Hide password" : "Show password"}
                                >
                                    {showConfirm ? <FaRegEyeSlash /> : <FaRegEye />}
                                </button>
                            </div>
                            {errors.confirm && <p className="mt-1 text-sm text-red-600" role="alert">{errors.confirm}</p>}
                        </div>
                        {/* Terms checkbox */}
                        <div className="flex items-start gap-2">
                            <input
                                id="agree"
                                type="checkbox"
                                name="agree"
                                checked={form.agree}
                                onChange={onChange}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                aria-label="Agree to terms"
                            />
                            <label htmlFor="agree" className="text-sm text-gray-700">
                                I agree to the{" "}
                                <a className="text-blue-600 underline" href="#">
                                    Terms of Service
                                </a>{" "}
                                and{" "}
                                <a className="text-blue-600 underline" href="#">
                                    privacy policy
                                </a>
                            </label>
                        </div>
                        {errors.agree && <p className="mt-1 text-sm text-red-600" role="alert">{errors.agree}</p>}
                        {success && <div className="w-full text-green-600 text-sm font-semibold text-center mt-2" role="status">{success}</div>}
                        <div className="space-y-3 pt-2">
                            <button
                                type="submit"
                                className={`h-12 w-full rounded-lg bg-green-500 font-semibold text-white transition hover:bg-green-600 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                                disabled={loading}
                                aria-busy={loading}
                            >
                                {loading ? "Registering..." : "Register"}
                            </button>
                            <button
                                type="button"
                                className="h-12 w-full rounded-lg bg-blue-600 font-semibold text-white transition hover:bg-blue-700"
                                aria-label="Sign up for free"
                            >
                                SIGN UP FOR FREE
                            </button>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white font-medium hover:bg-gray-50"
                                aria-label="Continue with Google"
                                disabled={loading}
                            >
                                <img src="/PM-frontend/google.svg" alt="Google" loading="lazy" className="w-5 h-5" /> Continue with
                                Google
                            </button>
                            <button
                                type="button"
                                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white font-medium hover:bg-gray-50"
                                aria-label="Continue with Microsoft"
                                disabled={loading}
                            >
                                <img src="/PM-frontend/microsoft.svg" alt="Microsoft" loading="lazy" className="w-5 h-5" /> Continue
                                with Microsoft
                            </button>
                        </div>
                        <p className="text-sm text-center mt-4 text-black font-semibold">
                            Already have an account?{" "}
                            <Link to="/login" className="text-blue-600 hover:text-blue-800 underline">
                                Sign in here
                            </Link>
                        </p>
                    </form>
                    <div className="flex flex-col items-center justify-center">
                        <div className="relative w-full max-w-md">
                            <img
                                src="/PM-frontend/image.png"
                                alt="2FA Illustration"
                                loading="lazy"
                                className="w-full h-auto rounded-2xl"
                                style={{ maxWidth: "400px", height: "auto" }}
                            />
                        </div>
                        <div className="mt-6 max-w-md text-sm leading-6 text-gray-700">
                            <p className="mb-2">
                                Welcome! Simplify your workflow and accomplish more with{" "}
                                <span className="font-semibold">Practical Manager</span>. Your data is safe with us.
                            </p>
                            <p className="text-center font-semibold">
                                This account is protected with <br />
                                Two factor authentication 2FA
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
