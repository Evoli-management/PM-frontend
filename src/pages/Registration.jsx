import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CheckCircle2, User, Mail, Lock, Eye, EyeOff, Info } from "lucide-react";
import authService from "../services/authService";

export default function Registration() {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        agreedToTerms: false,
    });
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const validateForm = () => {
        const errors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.firstName.trim()) errors.firstName = "First name is required.";
        if (!formData.lastName.trim()) errors.lastName = "Last name is required.";
        if (!formData.email.trim()) {
            errors.email = "Email is required.";
        } else if (!emailRegex.test(formData.email)) {
            errors.email = "Please enter a valid email address.";
        }
        if (!formData.password) {
            errors.password = "Password is required.";
        } else if (formData.password.length < 8) {
            errors.password = "Password must be at least 8 characters.";
        } else if (!/[A-Z]/.test(formData.password)) {
            errors.password = "Password must contain at least one uppercase letter.";
        } else if (!/\d/.test(formData.password)) {
            errors.password = "Password must contain at least one number.";
        }
        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = "Passwords do not match.";
        }
        if (!formData.agreedToTerms) {
            errors.agreedToTerms = "You must agree to the terms.";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            setIsSubmitted(false);
            return;
        }
        setSubmitting(true);
        try {
            const { firstName, lastName, email, password } = formData;
            const res = await authService.register({ firstName, lastName, email, password });
            // Save email temporarily for the verify page (resend convenience)
            try {
                sessionStorage.setItem("recent_registration_email", email);
            } catch {}
            setIsSubmitted(true);
            // Give users more time to read the success message before redirecting
            setTimeout(() => navigate("/verify-email"), 4000);
        } catch (err) {
            const status = err?.response?.status;
            const msg = err?.response?.data?.message;
            const errors = {};
            if (status === 409) {
                errors.email = "Email already in use.";
            } else if (Array.isArray(msg)) {
                const text = msg.join(" \n ").toLowerCase();
                if (text.includes("email")) errors.email = "Please enter a valid email address.";
                if (text.includes("least 8")) errors.password = "Password must be at least 8 characters.";
                if (text.includes("uppercase"))
                    errors.password = "Password must contain at least one uppercase letter.";
                if (text.includes("number")) errors.password = "Password must contain at least one number.";
            } else if (typeof msg === "string") {
                errors.general = msg;
            } else {
                errors.general = "Registration failed. Please try again.";
            }
            setFormErrors(errors);
            setIsSubmitted(false);
        } finally {
            setSubmitting(false);
        }
    };

    // Password strength helper
    const password = formData.password || "";
    const getPasswordStrength = (pw) => {
        if (!pw) return "";
        let score = 0;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        if (pw.length >= 8) score++;
        if (score >= 4) return "Strong";
        if (score >= 3) return "Medium";
        return "Weak";
    };
    const strength = getPasswordStrength(password);

    return (
        <div className="min-h-screen flex items-center w-full max-w-6xl mx-auto">
                <div className="relative grid md:grid-cols-2 items-center rounded-xl shadow-[0_-6px_20px_rgba(2,6,23,0.06)]">
                    {/* Left pane: fixed image + text (horizontal to avoid wrapping) */}
                    <div
                        className="p-8 flex flex-col items-center justify-center"
                    >
                        <div className="">
                            <img
                                src={`${import.meta.env.BASE_URL}register.png`}
                                alt="Illustration"
                                className="w-full h-40 sm:h-56 md:h-64 object-contain"
                            />
                        </div>
                        <div className="text-center">
                            <p className="mt-1 mb-0 leading-5 text-gray-700 font-semibold">
                                    Simplify your workflow and accomplish more with Practical Manager.
                                Your data is safe with us.
                            </p>
                        </div>
                    </div>

                    {/* Right Form Section */}
                    <div className="p-8 flex flex-col justify-center items-center w-full h-full">
                        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
                            Sign Up
                        </h2>
                        {isSubmitted ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center bg-green-50 rounded-lg shadow-inner">
                                <CheckCircle2 size={48} className="text-green-500 mb-4" />
                                <h3 className="text-2xl font-bold text-green-700">Registration Successful!</h3>
                                <p className="mt-2 text-gray-600">
                                    A verification email has been sent to your address.<br />
                                    Please check your inbox and verify your email to continue.<br />
                                    <span className="text-sm text-gray-500">If you don't see the email, please look in your spam or junk folder.</span>
                                </p>
                                <button
                                    type="button"
                                    className="mt-4 px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                                    onClick={async () => {
                                        try {
                                            await authService.resendVerification({ email: formData.email });
                                            alert("Verification email resent! Please check your inbox.");
                                        } catch (err) {
                                            alert("Failed to resend verification email. Please try again later.");
                                        }
                                    }}
                                >
                                    Resend verification email
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className="relative">
                                        <span className="sr-only">First name</span>
                                        <div className="absolute left-3 top-4 text-slate-400">
                                            <User size={16} />
                                        </div>
                                        <input
                                            id="firstName"
                                            type="text"
                                            name="firstName"
                                            placeholder="First name"
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                            className={`w-full pl-10 pr-4 h-10 sm:h-12 box-border border rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400 ${
                                                formErrors.firstName ? "border-red-500" : "border-gray-200"
                                            }`}
                                        />
                                        {formErrors.firstName && (
                                            <p className="text-red-500 text-sm mt-1">{formErrors.firstName}</p>
                                        )}
                                    </label>

                                    <label className="relative">
                                        <span className="sr-only">Last name</span>
                                        <div className="absolute left-3 top-4 text-slate-400">
                                            <User size={16} />
                                        </div>
                                        <input
                                            id="lastName"
                                            type="text"
                                            name="lastName"
                                            placeholder="Last name"
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                            className={`w-full pl-10 pr-4 h-10 sm:h-12 box-border border rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400 ${
                                                formErrors.lastName ? "border-red-500" : "border-gray-200"
                                            }`}
                                        />
                                        {formErrors.lastName && (
                                            <p className="text-red-500 text-sm mt-1">{formErrors.lastName}</p>
                                        )}
                                    </label>
                                </div>

                                <label className="relative block">
                                    <div className="absolute left-3 top-4 text-slate-400">
                                        <Mail size={16} />
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        autoComplete="username email"
                                        placeholder="Enter your email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className={`w-full pl-10 pr-4 h-10 sm:h-12 box-border border rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400 ${
                                            formErrors.email ? "border-red-500" : "border-gray-200"
                                        }`}
                                    />
                                    {formErrors.email && (
                                        <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                                    )}
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className="relative mb-0">
                                        <div className="absolute left-3 top-4 text-slate-400">
                                            <Lock size={16} />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            autoComplete="new-password"
                                            placeholder="Enter password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className={`w-full pl-10 pr-10 h-10 sm:h-12 box-border border rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400 ${
                                                formErrors.password ? "border-red-500" : "border-gray-200"
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((s) => !s)}
                                            className="absolute right-3 top-4 text-slate-500"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                        {formErrors.password && (
                                            <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>
                                        )}
                                    </label>

                                    <label className="relative">
                                        <div className="absolute left-3 top-4 text-slate-400">
                                            <Lock size={16} />
                                        </div>
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            name="confirmPassword"
                                            autoComplete="new-password"
                                            placeholder="Confirm password"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className={`w-full pl-10 pr-10 h-10 sm:h-12 box-border border rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400 ${
                                                formErrors.confirmPassword ? "border-red-500" : "border-gray-200"
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm((s) => !s)}
                                            className="absolute right-3 top-4 text-slate-500"
                                        >
                                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                        {formErrors.confirmPassword && (
                                            <p className="text-red-500 text-sm mt-1">{formErrors.confirmPassword}</p>
                                        )}
                                    </label>
                                </div>

                                {password && (
                                    <div className="mb-4">
                                        <p
                                            className={`text-sm font-semibold ${
                                                strength === "Strong" ? "text-green-400" : "text-yellow-400"
                                            }`}
                                        >
                                            Password Strength: {strength}
                                        </p>
                                        {strength === "Weak" && (
                                            <div className="text-xs text-gray-400 mt-1 space-y-1">
                                                <p className={/[A-Z]/.test(password) ? "text-green-400" : ""}>
                                                    • At least one uppercase letter
                                                </p>
                                                <p className={/[0-9]/.test(password) ? "text-green-400" : ""}>
                                                    • At least one number
                                                </p>
                                                <p className={/[^A-Za-z0-9]/.test(password) ? "text-green-400" : ""}>
                                                    • At least one special character
                                                </p>
                                                <p className={password.length >= 6 ? "text-green-400" : ""}>
                                                    • Minimum 6 characters
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-start gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        id="terms"
                                        name="agreedToTerms"
                                        checked={formData.agreedToTerms}
                                        onChange={handleInputChange}
                                        className="cursor-pointer mt-1 rounded-sm text-green-600 focus:ring-green-500"
                                    />
                                    <label htmlFor="terms" className="text-gray-600 leading-tight">
                                        I agree to the{" "}
                                        <a href="#" className="text-blue-600 underline">
                                            Terms of Service
                                        </a>{" "}
                                        and{" "}
                                        <a href="#" className="text-blue-600 underline">
                                            privacy policy
                                        </a>
                                    </label>
                                </div>
                                {formErrors.agreedToTerms && (
                                    <p className="text-red-500 text-sm mt-1">{formErrors.agreedToTerms}</p>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`w-full ${submitting ? "bg-green-300" : "bg-green-500 hover:bg-green-600"} text-white h-10 sm:h-12 rounded-lg font-semibold transition-colors flex items-center justify-center`}
                                >
                                    {submitting ? "Registering…" : "Register"}
                                </button> 

                                <button
                                    type="button"
                                    onClick={() => setFormData((f) => ({ ...f }))}
                                    className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white h-10 sm:h-12 rounded-lg font-semibold transition-colors flex items-center justify-center"
                                >
                                    SIGN UP FOR FREE
                                </button>

                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        aria-label="Continue with Google"
                                        className="w-full inline-flex items-center justify-center gap-3 border rounded h-10 sm:h-12 bg-gray-100 hover:bg-gray-200"
                                    >
                                        <img
                                            src={`${import.meta.env.BASE_URL}google.svg`}
                                            alt="Google"
                                            width={20}
                                            height={20}
                                            loading="eager"
                                            className="object-contain"
                                            onError={(e) => {
                                                e.currentTarget.style.display = "none";
                                            }}
                                        />
                                        <span className="text-sm">Continue with Google</span>
                                    </button>
                                    <button
                                        aria-label="Continue with Microsoft"
                                        className="w-full inline-flex items-center justify-center gap-3 border rounded h-10 sm:h-12 bg-gray-100 hover:bg-gray-200"
                                    >
                                        <img
                                            src={`${import.meta.env.BASE_URL}microsoft.svg`}
                                            alt="Microsoft"
                                            width={20}
                                            height={20}
                                            loading="eager"
                                            className="object-contain"
                                            onError={(e) => {
                                                e.currentTarget.style.display = "none";
                                            }}
                                        />
                                        <span className="text-sm">Continue with Microsoft</span>
                                    </button>
                                </div>

                                {formErrors.general && (
                                    <p className="text-red-600 text-sm text-center mt-2">{formErrors.general}</p>
                                )}
                                <div className="text-center mt-4">
                                    <div className="flex items-center justify-center">
                                        <Link
                                            to="/login"
                                            className="transition-colors"
                                        >
                                            Already have an account? <span className="underline font-semibold text-blue-600 hover:text-blue-800">Sign in here</span>
                                        </Link>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
    );
}
