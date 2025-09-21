import React from "react";
import { useNavigate } from "react-router-dom";
import ContactForm from "../components/ContactForm.jsx";
import TestimonialCards from "../components/TestimonialCards.jsx";
import Hero from "../components/Hero.jsx";
import ValuesComponent from "../components/ValuesComponent.jsx";
import FeaturedModulesComponent from "../components/FeaturedModulesComponent.jsx";

const Home = () => {
    const navigate = useNavigate();
    const handleNavigate = (e, to) => {
        e && e.preventDefault();
        if (!to) return;
        navigate(to);
    };

    return (
        <main className="font-sans bg-gray-50 text-gray-900 min-h-screen">
            {/* Tailwind CSS `style` block for custom animations and hero polish */}
            <style>
                {`
                @keyframes float {
                    0% {
                        transform: translateY(0px) rotate(0deg);
                        opacity: 1;
                    }
                    50% {
                        transform: translateY(-18px) rotate(2deg);
                        opacity: 0.9;
                    }
                    100% {
                        transform: translateY(0px) rotate(0deg);
                        opacity: 1;
                    }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s ease-out forwards;
                }
                .group:hover .group-hover-scale {
                    transform: scale(1.05);
                }
                .group:hover .group-hover-shadow {
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }

                /* Animated gradient headline */
                .heading-gradient {
                    background: linear-gradient(90deg,#0ea5e9 0%, #7c3aed 45%, #f59e0b 100%);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    animation: gradientShift 6s linear infinite;
                    display: inline-block;
                }
                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .heading-subtle {
                    color: rgba(15,23,42,0.85);
                    display: block;
                    margin-top: 0.35rem;
                    font-weight: 600;
                }

                /* Animated gradient button */
                .btn-gradient {
                    background: linear-gradient(90deg, #F59E0B 0%, #F97316 50%, #F59E0B 100%);
                    background-size: 200% 100%;
                    transition: background-position 0.6s ease, transform 0.12s ease, box-shadow 0.12s ease;
                }
                .btn-gradient:hover { background-position: 100% 0; transform: translateY(-2px) scale(1.02); }
                .btn-glow { box-shadow: 0 8px 30px rgba(245,158,11,0.18); }

                /* Glass-like stat chips under CTA */
                .stat-chip { backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); background: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.5); }

                /* Floating decorative blobs */
                .blob { position: absolute; border-radius: 9999px; filter: blur(28px); opacity: 0.9; transform: translate3d(0,0,0); }
                .blob-1 { width: 360px; height: 360px; left: -60px; top: -40px; background: linear-gradient(135deg,#60A5FA,#7C3AED); mix-blend-mode: screen; }
                .blob-2 { width: 420px; height: 420px; right: -80px; bottom: -80px; background: linear-gradient(135deg,#FDE68A,#FB923C); mix-blend-mode: screen; }

                `}
            </style>

            {/* Slim top strip with quick links (matches site header) */}
            <div className="bg-teal-50 border-b border-teal-100 text-sm">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-6">
                            <a href="/why" className="text-teal-800 font-semibold hover:underline">
                                WHY PRACTICAL MANAGER?
                            </a>
                            <a href="/how-it-works" className="text-teal-800 hover:underline">
                                HOW IT WORKS?
                            </a>

                            <div className="relative group">
                                <button className="flex items-center gap-2 text-teal-800 hover:underline focus:outline-none font-medium tracking-wide">
                                    ABOUT EMPLOYEESHIP
                                    <span className="text-xs text-teal-700">▾</span>
                                </button>
                                <div className="absolute left-0 mt-2 w-48 bg-white shadow-sm border-t-2 border-black z-50 opacity-0 group-hover:opacity-100 transform scale-95 group-hover:scale-100 transition-all duration-150 pointer-events-none group-hover:pointer-events-auto">
                                    <ul className="py-3">
                                        <li>
                                            <a
                                                href="/employeeship"
                                                className="block text-center px-6 py-3 text-sm text-gray-800 uppercase tracking-wider font-semibold hover:bg-gray-50"
                                            >
                                                EMPLOYEESHIP
                                            </a>
                                        </li>
                                        <li>
                                            <a
                                                href="/leadership"
                                                className="block text-center px-6 py-3 text-sm text-gray-800 uppercase tracking-wider font-semibold hover:bg-gray-50"
                                            >
                                                LEADERSHIP
                                            </a>
                                        </li>
                                        <li>
                                            <a
                                                href="/excellence"
                                                className="block text-center px-6 py-3 text-sm text-gray-800 uppercase tracking-wider font-semibold hover:bg-gray-50"
                                            >
                                                EXCELLENCE
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <a href="/knowledge-base" className="text-teal-800 hover:underline">
                                KNOWLEDGE BASE
                            </a>
                            <a href="/pricing" className="text-teal-800 hover:underline">
                                PRICING
                            </a>
                            <a href="/contact" className="text-teal-800 hover:underline">
                                CONTACT US
                            </a>
                            <a href="/blog" className="text-teal-800 hover:underline">
                                BLOG
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Bar */}
            <nav className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-white shadow-lg sticky top-0 z-20 transition-shadow duration-300">
                <div className="font-bold text-2xl text-blue-700">Practical Manager</div>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-base">
                    <a
                        href="#modules"
                        className="text-blue-900 hover:text-blue-700 font-medium transition-colors duration-200"
                    >
                        Modules
                    </a>
                    <a
                        href="#values"
                        className="text-blue-900 hover:text-blue-700 font-medium transition-colors duration-200"
                    >
                        Values
                    </a>
                    <a
                        href="/testimonials"
                        className="text-blue-900 hover:text-blue-700 font-medium transition-colors duration-200"
                    >
                        Testimonials
                    </a>
                </div>
                <div className="flex gap-2 mt-4 sm:mt-0">
                    <a
                        href="/login"
                        onClick={(e) => handleNavigate(e, "/login")}
                        className="bg-blue-700 text-white rounded-full px-6 py-2 font-semibold hover:bg-blue-800 transition-transform transform hover:scale-105 shadow-md"
                    >
                        Login
                    </a>
                    <a
                        href="/registration"
                        onClick={(e) => handleNavigate(e, "/registration")}
                        className="ml-2 bg-yellow-600 text-white rounded-full px-6 py-2 font-semibold hover:bg-yellow-700 transition-transform transform hover:scale-105 shadow-md"
                    >
                        Register
                    </a>
                </div>
            </nav>

            {/* Page links removed to avoid repetition in the top bar */}

            {/* Hero Section (clean, professional two-column variant) */}
            <Hero />

            {/* New Section: Join Practical Manager with a visual element */}
            <section className="bg-white py-16 flex flex-col md:flex-row items-center justify-center gap-12 px-4 shadow-inner">
                <div className="md:w-1/2 flex justify-center animate-fade-in-up">
                    <div className="relative bg-white p-2 rounded-xl shadow-md overflow-hidden">
                        {/* Main illustration (original home.png as requested) */}
                        <img
                            src={`${import.meta.env.BASE_URL}home.png`}
                            alt="Practical illustration"
                            className="w-64 md:w-80 h-auto rounded-lg object-cover shadow-lg"
                        />
                        {/* Decorative SVG background - subtle, non-interactive */}
                        <img
                            src={`${import.meta.env.BASE_URL}home-bg.svg`}
                            alt=""
                            aria-hidden="true"
                            className="hidden md:block pointer-events-none absolute -top-6 -left-8 w-36 opacity-25 transform rotate-6"
                        />
                    </div>
                </div>
                <div
                    className="md:w-1/2 text-center md:text-left animate-fade-in-up"
                    style={{ animationDelay: "0.6s" }}
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-blue-700 mb-4">
                        Start your journey to better team management today
                    </h2>
                    <p className="text-lg text-gray-700 mb-6 max-w-lg mx-auto md:mx-0">
                        Join thousands of teams who are simplifying their workflows and boosting productivity with our
                        all-in-one platform.
                    </p>
                    <a
                        href="/registration"
                        onClick={(e) => handleNavigate(e, "/registration")}
                        className="rounded-full bg-blue-700 text-white font-bold py-4 px-10 text-lg transition-transform hover:bg-blue-800 transform hover:scale-110 shadow-lg"
                    >
                        Sign up for a Free Account
                    </a>
                </div>
            </section>

            {/* Featured Modules Section */}
            <FeaturedModulesComponent />

            {/* Testimonials Section */}
            <TestimonialCards />

            {/* Values Section */}
            <ValuesComponent />

            {/* CTA Section for demo */}
            <section className="bg-blue-50 py-20 text-center relative">
                {/* Decorative translucent background text acting like a transparent image */}
                <div
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                    <span
                        className="text-[48px] md:text-[96px] lg:text-[140px] font-extrabold text-white opacity-8 select-none"
                        style={{ transform: "translateY(-10px)", mixBlendMode: "overlay" }}
                    >
                        Ready to transform your team?
                    </span>
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-6">
                        <img
                            src={`${import.meta.env.BASE_URL}graph.png`}
                            alt="Graph"
                            className="w-48 md:w-80 lg:w-96 h-auto rounded-md shadow-md"
                        />
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-blue-700">
                                Ready to transform your team?
                            </h2>
                            <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto md:mx-0">
                                Get a live demo from one of our specialists and see how Practical Manager can work for
                                you.
                            </p>
                            <a
                                href="#contact"
                                className="inline-block bg-yellow-600 text-white rounded-full px-10 py-4 font-bold text-lg hover:bg-yellow-700 transition-transform transform hover:scale-110 shadow-xl"
                            >
                                Request a Demo
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Form Section */}
            <ContactForm />
        </main>
    );
};

export default Home;
