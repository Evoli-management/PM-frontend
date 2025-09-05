import React from "react";
import { Link } from "react-router-dom";
import { Award, Target, Timer, Smile, Star, Shield, Handshake, Mail } from "lucide-react";

// Background image for the hero can be provided via environment variable:
// - VITE_HERO_BG: URL to a remote image (or a path under /public/)
// - VITE_HERO_BG_OPACITY: overlay opacity (0.0 - 1.0) to keep text readable
const HERO_BG = import.meta.env.VITE_HERO_BG || `${import.meta.env.BASE_URL}bg.png`;
// Slightly lighter overlay by default so the illustration reads through while keeping text legible.
const HERO_BG_OPACITY = import.meta.env.VITE_HERO_BG_OPACITY ? parseFloat(import.meta.env.VITE_HERO_BG_OPACITY) : 0.48;
// Hero illustration can be a remote PNG URL via VITE_HERO_ILLUST or fallback to the project's bg.png
const HERO_ILLUST_URL = import.meta.env.VITE_HERO_ILLUST || `${import.meta.env.BASE_URL}bg.png`;
// Opacity for the illustration overlay (0.0 - 1.0). Lower = image more visible.
const HERO_ILLUST_OPACITY = import.meta.env.VITE_HERO_ILLUST_OPACITY ? parseFloat(import.meta.env.VITE_HERO_ILLUST_OPACITY) : 0.18;
// Tint color and opacity for the hero image overlay to match/echo copy color
const HERO_ILLUST_TINT = import.meta.env.VITE_HERO_ILLUST_TINT || '#F59E0B';
const HERO_ILLUST_TINT_OPACITY = import.meta.env.VITE_HERO_ILLUST_TINT_OPACITY ? parseFloat(import.meta.env.VITE_HERO_ILLUST_TINT_OPACITY) : 0.08;

function hexToRgb(hex) {
    const raw = hex.replace('#', '');
    const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
    const num = parseInt(full, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `${r}, ${g}, ${b}`;
}

// Lucide React is an icon library that provides clean, modern icons.
// The icons are imported here and used directly in the components below.

const modules = [
    { icon: Target, color: '#EF4444', title: "Goals & Alignment", desc: "Set and track goals, align your team, and drive results." },
    { icon: Timer, color: '#F59E0B', title: "Time Management", desc: "Manage tasks, deadlines, and priorities for maximum productivity." },
    { icon: Handshake, color: '#8B4513', title: "Recognition", desc: "Share recognition and feedback to foster a positive culture." },
    { icon: Smile, color: '#7C3AED', title: "Engagement", desc: "Assess and improve team engagement and well-being." },
];

const values = [
    { icon: <Award size={48} />, title: "Customer-first", desc: "We build for our users and their success." },
    { icon: <Star size={48} />, title: "Continuous Improvement", desc: "We invest in research and development to deliver the best." },
    { icon: <Shield size={48} />, title: "Privacy-focused", desc: "Your data is secure and private with us." },
];

const testimonials = [
    { quote: "Practical Manager helped us align our goals and improve team engagement by 15%.", author: "Team Lead, TechCorp" },
    { quote: "The feedback and recognition tools make management easy and effective.", author: "HR Manager, InnovateX" },
];

const Home = () => {
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

            {/* Top CTA removed as requested */}

            {/* Navigation Bar */}
            <nav className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-white shadow-lg sticky top-0 z-20 transition-shadow duration-300">
                <div className="font-bold text-2xl text-blue-700">Practical Manager</div>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-base">
                    <a href="#modules" className="text-blue-900 hover:text-blue-700 font-medium transition-colors duration-200">Modules</a>
                    <a href="#values" className="text-blue-900 hover:text-blue-700 font-medium transition-colors duration-200">Values</a>
                    <a href="/pricing" className="text-blue-900 hover:text-blue-700 font-medium transition-colors duration-200">Pricing</a>
                    <a href="/testimonials" className="text-blue-900 hover:text-blue-700 font-medium transition-colors duration-200">Testimonials</a>
                </div>
                <div className="flex gap-2 mt-4 sm:mt-0">
                    <Link to="/login" className="bg-blue-700 text-white rounded-full px-6 py-2 font-semibold hover:bg-blue-800 transition-transform transform hover:scale-105 shadow-md">Login</Link>
                    <Link to="/registration" className="ml-2 bg-yellow-600 text-white rounded-full px-6 py-2 font-semibold hover:bg-yellow-700 transition-transform transform hover:scale-105 shadow-md">Register</Link>
                </div>
            </nav>

            {/* Page links removed to avoid repetition in the top bar */}

            {/* Hero Section (clean, professional two-column variant) */}
            <section className="relative bg-white pt-20 pb-20 px-4 text-gray-900">
                <div className="container mx-auto">
                    <div className="flex flex-col-reverse md:flex-row items-center gap-10 md:gap-20">
                        {/* Left column: headline, copy, CTAs, stats */}
                        <div className="md:w-6/12 text-center md:text-left">
                            <h1 className="text-5xl sm:text-5xl md:text-6xl lg:text-6xl font-extrabold leading-tight mb-2">
                                <span className="heading-gradient">Lead with clarity.</span>
                                <span className="heading-subtle">Deliver with confidence.</span>
                            </h1>

                            <p className="text-lg text-slate-600 mb-6 max-w-xl mx-auto md:mx-0">
                                Practical Manager helps teams set clear outcomes, celebrate progress, and manage work with simple, repeatable rituals — so leaders can focus on what matters.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start mt-2">
                                <Link to="/registration" className="inline-flex items-center justify-center btn-gradient btn-glow text-white rounded-full px-8 py-4 text-lg font-semibold shadow-xl" aria-label="Get started - it's free">Get started — it's free</Link>
                                <a href="#contact" className="inline-flex items-center justify-center border border-slate-200 text-slate-700 rounded-full px-6 py-3 text-lg font-medium hover:bg-slate-50" aria-label="Request a demo">Request a demo</a>
                            </div>

                            <div className="mt-6 flex items-center gap-4 flex-wrap justify-center md:justify-start">
                                <div className="stat-chip px-4 py-2 rounded-full text-sm font-medium">Trusted by 2,300+ managers</div>
                                <div className="stat-chip px-4 py-2 rounded-full text-sm font-medium">Avg. 15% time saved</div>
                                <div className="stat-chip px-4 py-2 rounded-full text-sm font-medium">4.8/5 avg rating</div>
                            </div>

                            <div className="mt-4 text-sm text-slate-600 md:text-left text-center">
                                Our Core Values also here — <a href="#values" className="text-blue-700 font-semibold underline">see them</a>
                            </div>
                        </div>

                        {/* Right column: polished illustration card */}
                        <div className="md:w-6/12 flex justify-center md:justify-end">
                            <div className="w-full relative" style={{ minHeight: 420 }}>
                                <div
                                    aria-hidden="true"
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        backgroundImage: `url('${HERO_ILLUST_URL}')`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat',
                                        width: '100%',
                                        height: '100%',
                                        filter: 'saturate(1.02) contrast(1.03)'
                                    }}
                                />
                                <div aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundColor: `rgba(${hexToRgb(HERO_ILLUST_TINT)}, ${HERO_ILLUST_TINT_OPACITY})` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            {/* New Section: Join Practical Manager with a visual element */}
            <section className="bg-white py-20 flex flex-col md:flex-row items-center justify-center gap-16 px-4 shadow-inner">
                <div className="md:w-1/2 flex justify-center animate-fade-in-up">
                    <div className="bg-white p-4 rounded-xl shadow-md">
                        <img
                            src={`${import.meta.env.BASE_URL}home.png`}
                            alt="Practical illustration"
                            className="w-64 md:w-80 h-auto rounded-lg object-cover"
                        />
                    </div>
                </div>
                <div className="md:w-1/2 text-center md:text-left animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                    <h2 className="text-3xl md:text-4xl font-bold text-blue-700 mb-4">Start your journey to better team management today</h2>
                    <p className="text-lg text-gray-700 mb-6 max-w-lg mx-auto md:mx-0">
                        Join thousands of teams who are simplifying their workflows and boosting productivity with our all-in-one platform.
                    </p>
                    <Link to="/registration" className="rounded-full bg-blue-700 text-white font-bold py-4 px-10 text-lg transition-transform hover:bg-blue-800 transform hover:scale-110 shadow-lg">
                        Sign up for a Free Account
                    </Link>
                </div>
            </section>

            {/* Featured Modules Section */}
            <section id="modules" className="bg-gray-100 py-20">
                <div className="container mx-auto px-4">
                    <h2 className="text-center text-3xl md:text-4xl font-bold text-blue-700 mb-16 animate-fade-in-up">Featured Modules</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
                        {modules.map((m, i) => (
                            <div
                                key={i}
                                className="group bg-white rounded-3xl p-8 text-center transition-transform duration-300 transform hover:scale-[1.02] hover:shadow-2xl flex flex-col items-center animate-fade-in-up shadow-md hover:bg-amber-50"
                                style={{ animationDelay: `${0.2 * i}s` }}
                            >
                                <div className="mb-6 transition-all duration-300 transform group-hover:scale-110">
                                    <div className="relative" style={{ width: 72, height: 72 }}>
                                        <div style={{ width: 72, height: 72, borderRadius: 9999, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="transition-shadow duration-300 group-hover:shadow-lg">
                                            {React.createElement(m.icon, { size: 36, color: '#ffffff' })}
                                        </div>
                                        <span className="absolute inset-0 rounded-full ring-0 group-hover:ring-4" style={{ boxShadow: '0 6px 18px rgba(0,0,0,0.08)', borderColor: m.color }} />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-blue-900 mb-2 transition-colors duration-200 group-hover:text-amber-600">{m.title}</h3>
                                <div className="mb-3" style={{ width: 28, height: 8, borderRadius: 4, background: m.color }} />
                                <p className="text-base text-gray-700">{m.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="bg-white py-20">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-yellow-600 mb-16 animate-fade-in-up">What our users say</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {testimonials.map((t, i) => (
                            <blockquote key={i} className="bg-yellow-50 rounded-3xl p-10 font-serif italic text-gray-700 shadow-xl border-l-4 border-yellow-500 transition-transform duration-300 hover:scale-105 animate-fade-in-up" style={{ animationDelay: `${0.2 * i}s` }}>
                                <p className="text-lg md:text-xl leading-relaxed mb-6">“{t.quote}”</p>
                                <div className="font-bold text-blue-700 text-base">{t.author}</div>
                            </blockquote>
                        ))}
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section id="values" className="bg-gray-100 py-20">
                <div className="container mx-auto px-4">
                    <h2 className="text-center text-3xl md:text-4xl font-bold text-blue-700 mb-16 animate-fade-in-up">Our Core Values</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
                        {values.map((v, i) => (
                            <div key={i} className="group bg-white rounded-3xl p-8 text-center transition-all duration-300 transform group-hover-scale group-hover-shadow flex flex-col items-center animate-fade-in-up shadow-md" style={{ animationDelay: `${0.2 * i}s` }}>
                                <div className="text-yellow-600 mb-6 transition-transform duration-300 transform group-hover:scale-125">{v.icon}</div>
                                <h3 className="text-xl font-bold text-blue-900 mb-2">{v.title}</h3>
                                <p className="text-base text-gray-700">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            
            {/* CTA Section for demo */}
            <section className="bg-blue-50 py-20 text-center">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-blue-700 mb-6">Ready to transform your team?</h2>
                    <p className="text-lg text-gray-700 mb-10 max-w-2xl mx-auto">
                        Get a live demo from one of our specialists and see how Practical Manager can work for you.
                    </p>
                    <a href="#contact" className="inline-block bg-yellow-600 text-white rounded-full px-10 py-4 font-bold text-lg hover:bg-yellow-700 transition-transform transform hover:scale-110 shadow-xl">
                        Request a Demo
                    </a>
                </div>
            </section>

            {/* Contact Form Section */}
            <section id="contact" className="bg-white py-20 flex flex-col items-center justify-center">
                <div className="bg-gray-100 rounded-3xl shadow-2xl p-6 md:p-10 w-full max-w-4xl mx-auto flex flex-col md:flex-row items-start gap-6">
                    <div className="w-full md:w-2/3">
                        <div className="text-blue-700 mb-6 md:mb-8"><Mail size={80} /></div>
                        <h2 className="text-3xl font-bold text-blue-700 mb-6 md:mb-8">Contact us for a DEMO</h2>
                        <form className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="First Name" className="p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
                            <input type="text" placeholder="Last Name*" className="p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" required />
                            <input type="text" placeholder="Phone" className="p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
                            <input type="email" placeholder="Email*" className="p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" required />
                            <input type="text" placeholder="Company*" className="p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow col-span-1 md:col-span-2" required />
                            <input type="number" placeholder="No. of Employees" className="p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow col-span-1 md:col-span-2" />
                            
                            <div className="w-full text-left col-span-1 md:col-span-2">
                                <label className="text-sm text-gray-600 flex items-center">
                                    <input type="checkbox" required className="mr-2 h-4 w-4 text-blue-600 rounded" /> I agree with <a href="#" className="text-blue-700 underline ml-1">terms and conditions</a> and <a href="#" className="text-blue-700 underline ml-1">privacy policy</a>.
                                </label>
                            </div>
                            <div className="col-span-1 md:col-span-2 flex flex-col items-center">
                                <input type="text" placeholder="Enter the Captcha" className="w-full p-4 mb-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" required />
                                <div className="mb-4 text-blue-700 font-bold">m5yg32 <button type="button" className="ml-2 text-blue-700 underline">Reload</button></div>
                            </div>

                            <div className="flex w-full gap-4 col-span-1 md:col-span-2">
                                <button type="submit" className="w-1/2 rounded-full bg-blue-700 text-white font-bold py-4 text-lg transition-transform hover:bg-blue-800 transform hover:scale-105 shadow-lg">Submit</button>
                                <button type="reset" className="w-1/2 rounded-full bg-yellow-600 text-white font-bold py-4 text-lg transition-transform hover:bg-yellow-700 transform hover:scale-105 shadow-lg">Reset</button>
                            </div>
                        </form>
                    </div>

                    {/* Aside image - keeps compact padding and prevents large empty gaps */}
                    <aside className="w-full md:w-1/3 flex justify-center md:justify-end items-start">
                        <div className="max-w-xs w-full flex items-center justify-center p-4 bg-white rounded-2xl shadow-sm">
                            <img
                                src={`${import.meta.env.BASE_URL}contact-demo.png`}
                                alt="Contact demo"
                                className="w-36 h-36 rounded-full object-cover"
                                style={{ padding: 4 }}
                            />
                        </div>
                    </aside>
                </div>
            </section>

            {/* Footer Section */}
            <footer className="bg-blue-900 text-white py-12 text-center">
                <div className="container mx-auto px-4">
                    <div className="mb-6 flex flex-wrap justify-center gap-6 text-sm">
                        <a href="#" className="hover:text-yellow-400 transition-colors">User guidelines</a>
                        <a href="#" className="hover:text-yellow-400 transition-colors">FAQ</a>
                        <a href="#" className="hover:text-yellow-400 transition-colors">Contact us</a>
                        <a href="#" className="hover:text-yellow-400 transition-colors">About us</a>
                        <a href="#" className="hover:text-yellow-400 transition-colors">Privacy policy</a>
                        <a href="#" className="hover:text-yellow-400 transition-colors">Terms of service</a>
                    </div>
                    <div className="text-gray-400 text-xs mt-4">Copyright © 2025 Evoli management d.o.o.</div>
                </div>
            </footer>
        </main>
    );
};

export default Home;
