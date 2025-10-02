// import React from "react";
//
// export default function ContactForm() {
//     return (
//         <section id="contact" className="py-20 flex items-center justify-center">
//             <div className="bg-gray-100 rounded-3xl shadow-xl p-6 md:p-10 w-full max-w-3xl mx-auto">
//                 <div className="w-full">
//                     <h2 className="text-3xl font-bold mb-2 md:mb-4">
//                         Contact us for a Demo
//                     </h2>
//                     <form className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
//                         <input
//                             type="text"
//                             placeholder="First Name"
//                             className="p-3 rounded-xl border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
//                         />
//                         <input
//                             type="text"
//                             placeholder="Last Name"
//                             className="p-3 rounded-xl border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
//                             required
//                         />
//                         <input
//                             type="text"
//                             placeholder="Phone"
//                             className="p-3 rounded-xl border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
//                         />
//                         <input
//                             type="email"
//                             placeholder="Email"
//                             className="p-3 rounded-xl border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
//                             required
//                         />
//                         <input
//                             type="text"
//                             placeholder="Company"
//                             className="p-3 rounded-xl border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow col-span-1 md:col-span-2"
//                             required
//                         />
//                         <input
//                             type="number"
//                             placeholder="No. of Employees"
//                             className="p-3 rounded-xl border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow col-span-1 md:col-span-2"
//                         />
//
//                         <div className="flex items-center gap-2 col-span-2">
//                             <input type="checkbox" required className="h-4 w-4 rounded" placeholder="Hello"/><p className="">I agree with <a href="#" className="underline">terms and conditions</a> and <a href="#" className="underline">privacy policy</a></p>.
//                         </div>
//                         <div className="col-span-1 md:col-span-2 flex flex-col items-center">
//                             <input
//                                 type="text"
//                                 placeholder="Enter the Captcha"
//                                 className="w-full p-3 mb-4 rounded-xl border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
//                                 required
//                             />
//                             <div className="mb-4 text-blue-700 font-bold">
//                                 m5yg32{" "}
//                                 <button type="button" className="ml-2 text-blue-700 underline">
//                                     Reload
//                                 </button>
//                             </div>
//                         </div>
//
//                         <div className="flex w-full gap-4 col-span-1 md:col-span-2">
//                             <button
//                                 type="submit"
//                                 className="w-full rounded-full btn-gradient btn-glow text-white font-semibold py-4 text-lg shadow-xl"
//                             >
//                                 Submit
//                             </button>
//                         </div>
//                     </form>
//                 </div>
//             </div>
//         </section>
//     )
// }

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

function makeCaptcha(len = 6) {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // avoid confusing chars
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const buildSchema = (captchaCode) =>
    z.object({
        firstName: z.string().trim().min(1, "First name is required"),
        lastName: z.string().trim().min(1, "Last name is required"),
        phone: z
            .string()
            .trim()
            .optional()
            .or(z.literal(""))
            .refine((v) => !v || /^[+()\d\s-]{7,20}$/.test(v), "Enter a valid phone number"),
        email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
        company: z.string().trim().min(2, "Company is required"),
        employees: z
            .union([
                z
                    .number({ invalid_type_error: "Enter a number" })
                    .int("Must be a whole number")
                    .positive("Must be greater than 0")
                    .max(1_000_000, "That seems too large"),
                z.nan().transform(() => undefined), // allow empty -> undefined when valueAsNumber is used
            ])
            .optional(),
        terms: z.literal(true, { errorMap: () => ({ message: "You must agree to continue" }) }),
        captcha: z
            .string()
            .trim()
            .min(1, "Enter the captcha")
            .refine((v) => v.toLowerCase() === String(captchaCode || "").toLowerCase(), "Captcha does not match"),
    });

export default function ContactForm() {
    const [captchaCode, setCaptchaCode] = React.useState(() => makeCaptcha());

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isSubmitSuccessful },
        setValue,
    } = useForm({
        resolver: zodResolver(buildSchema(captchaCode)),
        mode: "onTouched",
        defaultValues: {
            firstName: "",
            lastName: "",
            phone: "",
            email: "",
            company: "",
            employees: undefined,
            terms: false,
            captcha: "",
        },
    });

    const onReloadCaptcha = () => {
        const next = makeCaptcha();
        setCaptchaCode(next);
        setValue("captcha", ""); // clear user input
    };

    const onSubmit = async (data) => {
        // TODO: replace with your API call
        // await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        console.log("Submit payload:", data);
        reset({ ...data, terms: false, captcha: "" }); // keep text fields but clear checkbox & captcha
        onReloadCaptcha();
        alert("Thanks! We'll be in touch soon.");
    };

    return (
        <section id="contact" className="py-20 flex items-center justify-center">
            <div className="bg-gray-100 rounded-3xl shadow-xl p-6 md:p-10 w-full max-w-3xl mx-auto">
                <div className="w-full">
                    <h2 className="text-3xl font-bold mb-2 md:mb-4">Contact us for a Demo</h2>

                    <form
                        className="w-full grid grid-cols-1 md:grid-cols-2 gap-4"
                        onSubmit={handleSubmit(onSubmit)}
                        noValidate
                    >
                        {/* First Name */}
                        <div className="flex flex-col">
                            <label htmlFor="firstName" className="sr-only">First Name</label>
                            <input
                                id="firstName"
                                type="text"
                                placeholder="First Name"
                                className={`p-3 rounded-xl border ${errors.firstName ? "border-red-500" : "border-gray-400"} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow`}
                                aria-invalid={!!errors.firstName}
                                aria-describedby={errors.firstName ? "firstName-error" : undefined}
                                {...register("firstName")}
                            />
                            {errors.firstName && (
                                <p id="firstName-error" className="text-red-600 text-sm mt-1">{errors.firstName.message}</p>
                            )}
                        </div>

                        {/* Last Name */}
                        <div className="flex flex-col">
                            <label htmlFor="lastName" className="sr-only">Last Name</label>
                            <input
                                id="lastName"
                                type="text"
                                placeholder="Last Name"
                                className={`p-3 rounded-xl border ${errors.lastName ? "border-red-500" : "border-gray-400"} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow`}
                                aria-invalid={!!errors.lastName}
                                aria-describedby={errors.lastName ? "lastName-error" : undefined}
                                {...register("lastName")}
                            />
                            {errors.lastName && (
                                <p id="lastName-error" className="text-red-600 text-sm mt-1">{errors.lastName.message}</p>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="flex flex-col">
                            <label htmlFor="phone" className="sr-only">Phone</label>
                            <input
                                id="phone"
                                type="tel"
                                inputMode="tel"
                                placeholder="Phone"
                                className={`p-3 rounded-xl border ${errors.phone ? "border-red-500" : "border-gray-400"} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow`}
                                aria-invalid={!!errors.phone}
                                aria-describedby={errors.phone ? "phone-error" : undefined}
                                {...register("phone")}
                            />
                            {errors.phone && (
                                <p id="phone-error" className="text-red-600 text-sm mt-1">{errors.phone.message}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div className="flex flex-col">
                            <label htmlFor="email" className="sr-only">Email</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="Email"
                                className={`p-3 rounded-xl border ${errors.email ? "border-red-500" : "border-gray-400"} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow`}
                                aria-invalid={!!errors.email}
                                aria-describedby={errors.email ? "email-error" : undefined}
                                {...register("email")}
                            />
                            {errors.email && (
                                <p id="email-error" className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Company */}
                        <div className="flex flex-col col-span-1 md:col-span-2">
                            <label htmlFor="company" className="sr-only">Company</label>
                            <input
                                id="company"
                                type="text"
                                placeholder="Company"
                                className={`p-3 rounded-xl border ${errors.company ? "border-red-500" : "border-gray-400"} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow`}
                                aria-invalid={!!errors.company}
                                aria-describedby={errors.company ? "company-error" : undefined}
                                {...register("company")}
                            />
                            {errors.company && (
                                <p id="company-error" className="text-red-600 text-sm mt-1">{errors.company.message}</p>
                            )}
                        </div>

                        {/* Employees */}
                        <div className="flex flex-col col-span-1 md:col-span-2">
                            <label htmlFor="employees" className="sr-only">No. of Employees</label>
                            <input
                                id="employees"
                                type="number"
                                placeholder="No. of Employees"
                                className={`p-3 rounded-xl border ${errors.employees ? "border-red-500" : "border-gray-400"} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow`}
                                aria-invalid={!!errors.employees}
                                aria-describedby={errors.employees ? "employees-error" : "employees-help"}
                                step={1}
                                min={1}
                                {...register("employees", { valueAsNumber: true })}
                            />
                            {!errors.employees && (
                                <p id="employees-help" className="text-gray-500 text-xs mt-1">Optional</p>
                            )}
                            {errors.employees && (
                                <p id="employees-error" className="text-red-600 text-sm mt-1">{errors.employees.message}</p>
                            )}
                        </div>

                        {/* Terms */}
                        <div className="flex items-start gap-2 col-span-1 md:col-span-2">
                            <input
                                id="terms"
                                type="checkbox"
                                className="h-4 w-4 rounded mt-1"
                                aria-invalid={!!errors.terms}
                                aria-describedby={errors.terms ? "terms-error" : undefined}
                                {...register("terms")}
                            />
                            <label htmlFor="terms" className="text-sm">
                                I agree with <a href="#" className="underline">terms and conditions</a> and{" "}
                                <a href="#" className="underline">privacy policy</a>.
                            </label>
                        </div>
                        {errors.terms && (
                            <p id="terms-error" className="text-red-600 text-sm -mt-2 mb-2 col-span-1 md:col-span-2">
                                {errors.terms.message}
                            </p>
                        )}

                        {/* Captcha */}
                        <div className="col-span-1 md:col-span-2">
                            <label htmlFor="captcha" className="sr-only">Enter the Captcha</label>
                            <input
                                id="captcha"
                                type="text"
                                placeholder="Enter the Captcha"
                                className={`w-full p-3 mb-2 rounded-xl border ${errors.captcha ? "border-red-500" : "border-gray-400"} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow`}
                                aria-invalid={!!errors.captcha}
                                aria-describedby={errors.captcha ? "captcha-error" : "captcha-help"}
                                {...register("captcha")}
                            />
                            <div className="mb-2 font-bold tracking-widest select-none">
                                <span className="px-2 py-1 inline-block bg-blue-50 rounded">{captchaCode}</span>
                                <button
                                    type="button"
                                    onClick={onReloadCaptcha}
                                    className="ml-3 underline"
                                    aria-label="Reload captcha"
                                >
                                    Reload
                                </button>
                            </div>
                            {!errors.captcha && (
                                <p id="captcha-help" className="text-gray-500 text-xs">
                                    Type the characters above (not case sensitive)
                                </p>
                            )}
                            {errors.captcha && (
                                <p id="captcha-error" className="text-red-600 text-sm">{errors.captcha.message}</p>
                            )}
                        </div>

                        {/* Submit */}
                        <div className="flex w-full gap-4 col-span-1 md:col-span-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full rounded-full btn-gradient btn-glow text-white font-semibold py-4 text-lg shadow-xl disabled:opacity-60"
                            >
                                {isSubmitting ? "Submitting…" : "Submit"}
                            </button>
                        </div>

                        {isSubmitSuccessful && (
                            <p className="col-span-1 md:col-span-2 text-green-700 text-sm mt-2">
                                Form submitted successfully.
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </section>
    );
}
