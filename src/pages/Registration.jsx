import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, User, Mail, Lock, Eye, EyeOff, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getFriendlyErrorMessage, getErrorSuggestion } from "../utils/errorMessages";
import TermsOfServiceModal from "../components/modals/TermsOfServiceModal";
import PrivacyPolicyModal from "../components/modals/PrivacyPolicyModal";
// authService is imported dynamically at call sites to allow code-splitting

export default function Registration() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const invitationToken = searchParams.get("token");
    const registrationToken = searchParams.get("regToken");
    const emailFromUrl = searchParams.get("email");
    
    const [invitedEmail, setInvitedEmail] = useState(null);
    const [loadingInvitation, setLoadingInvitation] = useState(invitationToken ? true : false);
    const [invitationError, setInvitationError] = useState(null);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: emailFromUrl || "", // Pre-fill email from registration link
        password: "",
        confirmPassword: "",
        agreedToTerms: false,
    });
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const navigate = useNavigate();

    // Load invitation info if token is present
    useEffect(() => {
        if (!invitationToken) return;

        const loadInvitation = async () => {
            try {
                const orgService = await import("../services/organizationService").then((m) => m.default);
                const info = await orgService.getInvitationInfo(invitationToken);
                if (info?.invitedEmail) {
                    setInvitedEmail(info.invitedEmail);
                    setFormData((prev) => ({ ...prev, email: info.invitedEmail }));
                } else {
                    setInvitationError("Invalid invitation - no email found");
                }
            } catch (err) {
                setInvitationError("Failed to load invitation details");
            } finally {
                setLoadingInvitation(false);
            }
        };

        loadInvitation();
    }, [invitationToken]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
        
        // TC027: Clear field-specific error on input
        if (formErrors[name]) {
            setFormErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };
    
    // TC027: Validate individual field on blur
    const handleFieldBlur = (e) => {
        const { name, value } = e.target;
        const errors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        switch (name) {
            case 'firstName':
                if (!value.trim()) errors.firstName = t('registration.errors.firstNameRequired');
                break;
            case 'lastName':
                if (!value.trim()) errors.lastName = t('registration.errors.lastNameRequired');
                break;
            case 'email':
                if (!value.trim()) {
                    errors.email = t('registration.errors.emailRequired');
                } else if (!emailRegex.test(value)) {
                    errors.email = t('registration.errors.emailInvalid');
                } else if (value.length > 255) {
                    errors.email = t('registration.errors.emailTooLong');
                } else if (invitedEmail && value.toLowerCase() !== invitedEmail.toLowerCase()) {
                    errors.email = t('registration.errors.emailMustMatchInvite', { email: invitedEmail });
                }
                break;
            case 'password':
                if (!value) {
                    errors.password = t('registration.errors.passwordRequired');
                } else if (value.length < 8) {
                    errors.password = t('registration.errors.passwordTooShort');
                } else if (!/[A-Z]/.test(value)) {
                    errors.password = t('registration.errors.passwordNeedsUppercase');
                } else if (!/\d/.test(value)) {
                    errors.password = t('registration.errors.passwordNeedsNumber');
                }
                break;
            case 'confirmPassword':
                if (value !== formData.password) {
                    errors.confirmPassword = t('registration.errors.passwordsNoMatch');
                }
                break;
            default:
                break;
        }
        
        setFormErrors((prev) => ({ ...prev, ...errors }));
    };

    const validateForm = () => {
        const errors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.firstName.trim()) errors.firstName = t('registration.errors.firstNameRequired');
        if (!formData.lastName.trim()) errors.lastName = t('registration.errors.lastNameRequired');
        if (!formData.email.trim()) {
            errors.email = t('registration.errors.emailRequired');
        } else if (!emailRegex.test(formData.email)) {
            errors.email = t('registration.errors.emailInvalid');
        } else if (invitedEmail && formData.email.toLowerCase() !== invitedEmail.toLowerCase()) {
            errors.email = t('registration.errors.emailMustMatchInvite', { email: invitedEmail });
        }
        if (!formData.password) {
            errors.password = t('registration.errors.passwordRequired');
        } else if (formData.password.length < 8) {
            errors.password = t('registration.errors.passwordTooShort');
        } else if (!/[A-Z]/.test(formData.password)) {
            errors.password = t('registration.errors.passwordNeedsUppercase');
        } else if (!/\d/.test(formData.password)) {
            errors.password = t('registration.errors.passwordNeedsNumber');
        }
        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = t('registration.errors.passwordsNoMatch');
        }
        if (!formData.agreedToTerms) {
            errors.agreedToTerms = t('registration.errors.mustAgreeTerms');
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
            const authService = await import("../services/authService").then((m) => m.default);
            console.log("[Registration] Registering with email:", email, "Invitation token:", invitationToken);
            const res = await authService.register({ firstName, lastName, email, password });
            console.log("[Registration] Register response:", res);
            // Save email temporarily for the verify page (resend convenience)
            try {
                sessionStorage.setItem("recent_registration_email", email);
                if (invitationToken) {
                    console.log("[Registration] Storing invitation token in localStorage:", invitationToken);
                    localStorage.setItem("pending_invitation_token", invitationToken);
                }
            } catch {}
            setIsSubmitted(true);
            // Give users more time to read the success message before redirecting
            setTimeout(() => {
              if (invitationToken) {
                // If coming from an invite, redirect to verify email with both tokens
                navigate(`/verify-email?token=${res.verificationToken || ''}&invitationToken=${invitationToken}`);
              } else {
                navigate("/verify-email");
              }
            }, 4000);
        } catch (err) {
            const status = err?.response?.status;
            const msg = err?.response?.data?.message;
            const errors = {};
            
            if (status === 409) {
                errors.email = t('registration.errors.emailExists');
            } else if (Array.isArray(msg)) {
                const text = msg.join(" \n ").toLowerCase();
                if (text.includes("email")) errors.email = t('registration.errors.emailInvalidDetailed');
                if (text.includes("least 8")) errors.password = t('registration.errors.passwordTooShort');
                if (text.includes("uppercase")) errors.password = t('registration.errors.passwordNeedsUppercase');
                if (text.includes("number")) errors.password = t('registration.errors.passwordNeedsNumber');
            } else if (typeof msg === "string") {
                errors.general = getFriendlyErrorMessage(msg);
            } else {
                errors.general = t('registration.errors.registrationFailed');
            }
            setFormErrors(errors);
            setIsSubmitted(false);
        } finally {
            setSubmitting(false);
        }
    };

    // Password strength helper
    const password = formData.password || "";
    const getPasswordStrengthKey = (pw) => {
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
    const strengthKey = getPasswordStrengthKey(password);
    const strength = strengthKey ? t(`registration.strength${strengthKey}`) : "";

    return (
        <>
            <div className="min-h-screen flex items-center justify-center w-full max-w-6xl mx-auto px-4">
                <div className="relative grid md:grid-cols-2 w-full items-center rounded-xl shadow-[0_-6px_20px_rgba(2,6,23,0.06)]">
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
                            {t('registration.tagline')}
                            </p>
                        </div>
                    </div>

                    {/* Right Form Section */}
                    <div className="p-8 flex flex-col justify-center items-center w-full h-full">
                        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
                            {t('registration.signUp')}
                        </h2>

                        {invitationError && (
                            <div className="w-full mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                {invitationError}
                            </div>
                        )}

                        {loadingInvitation && (
                            <div className="w-full mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
                                {t('registration.loadingInvitation')}
                            </div>
                        )}

                        {registrationToken && emailFromUrl && !invitationToken && (
                            <div className="w-full mb-4 p-3 bg-green-50 border border-green-300 text-green-800 rounded flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold">{t('registration.inviteLinkVerified')}</p>
                                    <p className="text-sm">{t('registration.inviteLinkSubtext')}</p>
                                </div>
                            </div>
                        )}
                        {isSubmitted ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center bg-green-50 rounded-lg shadow-inner">
                                <CheckCircle2 size={48} className="text-green-500 mb-4" />
                                <h3 className="text-2xl font-bold text-green-700">{t('registration.successTitle')}</h3>
                                <p className="mt-2 text-gray-600">
                                    {t('registration.successMsg')}<br />
                                    {t('registration.successMsg2')}<br />
                                    <span className="text-sm text-gray-500">{t('registration.successMsg3')}</span>
                                </p>
                                <button
                                    type="button"
                                    className="mt-4 px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                                    onClick={async () => {
                                            try {
                                                const authService = await import("../services/authService").then((m) => m.default);
                                                await authService.resendVerification({ email: formData.email });
                                                alert(t('registration.emailResentSuccess'));
                                            } catch (err) {
                                                alert(t('registration.emailResentFail'));
                                            }
                                        }}
                                >
                                    {t('registration.resendEmail')}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className="relative">
                                        <span className="sr-only">{t('registration.firstName')}</span>
                                        <div className="absolute left-3 top-4 text-slate-400">
                                            <User size={16} />
                                        </div>
                                        <input
                                            id="firstName"
                                            type="text"
                                            name="firstName"
                                            placeholder={t('registration.firstName')}
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                            onBlur={handleFieldBlur}
                                            className={`w-full pl-10 pr-4 h-10 sm:h-12 box-border border rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400 ${
                                                formErrors.firstName ? "border-red-500" : "border-gray-200"
                                            }`}
                                        />
                                        {formErrors.firstName && (
                                            <p className="text-red-500 text-sm mt-1">{formErrors.firstName}</p>
                                        )}
                                    </label>

                                    <label className="relative">
                                        <span className="sr-only">{t('registration.lastName')}</span>
                                        <div className="absolute left-3 top-4 text-slate-400">
                                            <User size={16} />
                                        </div>
                                        <input
                                            id="lastName"
                                            type="text"
                                            name="lastName"
                                            placeholder={t('registration.lastName')}
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                            onBlur={handleFieldBlur}
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
                                        placeholder={t('registration.emailPlaceholder')}
                                        value={formData.email}
                                        onChange={invitedEmail ? undefined : handleInputChange}
                                        onBlur={invitedEmail ? undefined : handleFieldBlur}
                                        disabled={!!invitedEmail}
                                        className={`w-full pl-10 pr-4 h-10 sm:h-12 box-border border rounded-lg focus:outline-none ${
                                            invitedEmail ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-1 focus:ring-green-400'
                                        } ${
                                            formErrors.email ? "border-red-500" : "border-gray-200"
                                        }`}
                                    />
                                    {invitedEmail && (
                                        <p className="text-blue-600 text-xs mt-1">{t('registration.emailLocked')}</p>
                                    )}
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
                                            placeholder={t('registration.passwordPlaceholder')}
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            onBlur={handleFieldBlur}
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
                                            placeholder={t('registration.confirmPasswordPlaceholder')}
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            onBlur={handleFieldBlur}
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
                                                strengthKey === "Strong" ? "text-green-400" : "text-yellow-400"
                                            }`}
                                        >
                                            {t('registration.passwordStrength', { strength })}
                                        </p>
                                        {strengthKey === "Weak" && (
                                            <div className="text-xs text-gray-400 mt-1 space-y-1">
                                                <p className={/[A-Z]/.test(password) ? "text-green-400" : ""}>
                                                    {t('registration.hintUppercase')}
                                                </p>
                                                <p className={/[0-9]/.test(password) ? "text-green-400" : ""}>
                                                    {t('registration.hintNumber')}
                                                </p>
                                                <p className={/[^A-Za-z0-9]/.test(password) ? "text-green-400" : ""}>
                                                    {t('registration.hintSpecial')}
                                                </p>
                                                <p className={password.length >= 8 ? "text-green-400" : ""}>
                                                    {t('registration.hintMinChars')}
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
                                        {t('registration.iAgreeTo')}{" "}
                                        <button
                                            type="button"
                                            onClick={() => setShowTermsModal(true)}
                                            className="text-blue-600 underline hover:text-blue-800"
                                        >
                                            {t('registration.termsOfService')}
                                        </button>{" "}
                                        {t('registration.and')}{" "}
                                        <button
                                            type="button"
                                            onClick={() => setShowPrivacyModal(true)}
                                            className="text-blue-600 underline hover:text-blue-800"
                                        >
                                            {t('registration.privacyPolicy')}
                                        </button>
                                    </label>
                                </div>
                                {formErrors.agreedToTerms && (
                                    <p className="text-red-500 text-sm mt-1">{formErrors.agreedToTerms}</p>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`w-full ${submitting ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"} text-white h-10 sm:h-12 rounded-lg font-semibold transition-colors flex items-center justify-center`}
                                >
                                    {submitting ? t('registration.signingUp') : t('registration.signUpBtn')}
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
                                        <span className="text-sm">{t('registration.continueGoogle')}</span>
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
                                        <span className="text-sm">{t('registration.continueMicrosoft')}</span>
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
                                            {t('registration.alreadyAccount')} <span className="underline font-semibold text-blue-600 hover:text-blue-800">{t('registration.signInHere')}</span>
                                        </Link>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Modals */}
            <TermsOfServiceModal 
                isOpen={showTermsModal} 
                onClose={() => setShowTermsModal(false)} 
            />
            <PrivacyPolicyModal 
                isOpen={showPrivacyModal} 
                onClose={() => setShowPrivacyModal(false)} 
            />
        </>
    );
}
