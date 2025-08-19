
import React from "react";
import { Link } from "react-router-dom";

const modules = [
    { icon: "🎯", title: "Goals & Alignment", desc: "Set and track goals, align your team, and drive results." },
    { icon: "⏱️", title: "Time Management", desc: "Manage tasks, deadlines, and priorities for maximum productivity." },
    { icon: "🤝", title: "Recognition", desc: "Share recognition and feedback to foster a positive culture." },
    { icon: "📊", title: "Engagement", desc: "Assess and improve team engagement and well-being." },
];

const values = [
    { icon: "🤲", title: "Customer-first", desc: "We build for our users and their success." },
    { icon: "�", title: "Continuous Improvement", desc: "We invest in research and development to deliver the best." },
    { icon: "🔒", title: "Privacy-focused", desc: "Your data is secure and private with us." },
];

const testimonials = [
    { quote: "Practical Manager helped us align our goals and improve team engagement by 15%.", author: "Team Lead, TechCorp" },
    { quote: "The feedback and recognition tools make management easy and effective.", author: "HR Manager, InnovateX" },
];

const partners = [];

const Home = () => {
    return (
        <main className="font-sans bg-gray-50 text-gray-900 min-h-screen">
            {/* Navigation Bar */}
            <nav className="flex flex-col sm:flex-row justify-between items-center px-4 py-4 bg-white shadow sticky top-0 z-10">
                <div className="font-bold text-xl text-blue-700 mb-2 sm:mb-0">Practical Manager</div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-8 text-base mb-2 sm:mb-0">
                    <a href="#modules" className="text-blue-900 hover:text-blue-700 font-medium">Modules</a>
                    <a href="#values" className="text-blue-900 hover:text-blue-700 font-medium">Values</a>
                    <a href="#testimonials" className="text-blue-900 hover:text-blue-700 font-medium">Testimonials</a>
                    <a href="#contact" className="text-blue-900 hover:text-blue-700 font-medium">Contact</a>
                </div>
                <div className="flex gap-2">
                    <Link to="/login" className="bg-blue-700 text-white rounded-lg px-4 py-2 font-semibold hover:bg-blue-800 transition">Login</Link>
                    <Link to="/registration" className="bg-yellow-600 text-white rounded-lg px-4 py-2 font-semibold hover:bg-yellow-700 transition">Register</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="px-4 py-10 text-center bg-white shadow">
                <h1 className="text-2xl sm:text-4xl font-bold mb-4 text-blue-700">Your team's success, powered by Practical Manager</h1>
                <p className="text-base sm:text-xl mb-6 text-gray-700">A unique platform to transform the way you work. Built for teams of all sizes, focused on productivity, engagement, and leadership.</p>
                <Link to="/registration" className="inline-block bg-blue-700 text-white rounded-full px-6 py-3 font-bold text-lg hover:bg-blue-800 transition mb-4">Get Started Free</Link>
                <div className="mt-6 flex justify-center">
                    <img src="/public/icon.png" alt="Practical Manager" className="w-24 h-24 rounded-full shadow-lg" />
                </div>
            </section>

            {/* Featured Modules Section */}
            <section id="modules" className="bg-gray-50 py-10">
                <h2 className="text-center text-2xl sm:text-3xl font-bold text-blue-700 mb-8">Featured Modules</h2>
                <div className="flex flex-wrap justify-center gap-6">
                    {modules.map((m, i) => (
                        <div key={i} className="bg-white rounded-2xl shadow-lg p-6 max-w-xs w-full text-center transition hover:scale-105">
                            <div className="text-4xl mb-3">{m.icon}</div>
                            <h3 className="text-lg font-bold text-blue-700 mb-2">{m.title}</h3>
                            <p className="text-base text-gray-700">{m.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Story/Brand Section */}
            <section className="bg-white py-10 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-yellow-600 mb-4">It takes time to build something that lasts</h2>
                <p className="text-base sm:text-lg text-gray-700 mb-6">We believe in long-term commitment, continuous improvement, and putting our users first.</p>
                <Link to="/about" className="inline-block bg-yellow-600 text-white rounded-full px-6 py-3 font-bold text-lg hover:bg-yellow-700 transition">Read Our Story</Link>
            </section>

            {/* Platform Highlight Section */}
            <section className="bg-yellow-200 py-10 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-blue-900 mb-4">All-in-one suite for your business</h2>
                <p className="text-base sm:text-lg text-gray-700 mb-6">Break down silos, increase efficiency, and empower your team with Practical Manager.</p>
                <Link to="/registration" className="inline-block bg-red-600 text-white rounded-full px-6 py-3 font-bold text-lg hover:bg-red-700 transition">Try Now</Link>
            </section>

            {/* Trust Signals Section */}
            <section className="bg-gray-50 py-8 text-center border-t border-gray-200">
                <h3 className="text-lg font-bold text-blue-700 mb-2">Trusted by teams who value results</h3>
                <div className="text-gray-500 text-base mb-2">Practical Manager is used by organizations focused on growth, engagement, and leadership.</div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="bg-white py-10 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-8">What our users say</h2>
                <div className="flex flex-wrap justify-center gap-6">
                    {testimonials.map((t, i) => (
                        <blockquote key={i} className="bg-blue-50 rounded-xl p-6 max-w-xs w-full font-serif italic text-gray-700 shadow mb-4">
                            “{t.quote}”
                            <div className="font-bold text-blue-700 mt-2 text-base">{t.author}</div>
                        </blockquote>
                    ))}
                </div>
            </section>

            {/* Values Section */}
            <section id="values" className="bg-white py-10 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-yellow-600 mb-8">Our Core Values</h2>
                <div className="flex flex-wrap justify-center gap-6">
                    {values.map((v, i) => (
                        <div key={i} className="bg-gray-50 rounded-2xl shadow-lg p-6 max-w-xs w-full text-center transition hover:scale-105">
                            <div className="text-4xl mb-3">{v.icon}</div>
                            <h3 className="text-lg font-bold text-yellow-600 mb-2">{v.title}</h3>
                            <p className="text-base text-gray-700">{v.desc}</p>
                        </div>
                    ))}
                </div>
                <Link to="/about" className="inline-block bg-yellow-600 text-white rounded-full px-6 py-3 font-bold text-lg hover:bg-yellow-700 transition mt-6">Read Our Story</Link>
            </section>

            {/* Contact Form Section */}
            <section id="contact" className="bg-blue-50 py-10 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-6">Contact us for DEMO</h2>
                <form className="mx-auto bg-white rounded-2xl shadow-lg p-6 max-w-md w-full">
                    <input type="text" placeholder="First Name" className="w-full p-3 mb-4 rounded-lg border border-gray-300 text-base" />
                    <input type="text" placeholder="Last Name*" className="w-full p-3 mb-4 rounded-lg border border-gray-300 text-base" required />
                    <input type="text" placeholder="Phone" className="w-full p-3 mb-4 rounded-lg border border-gray-300 text-base" />
                    <input type="email" placeholder="Email*" className="w-full p-3 mb-4 rounded-lg border border-gray-300 text-base" required />
                    <input type="text" placeholder="Company*" className="w-full p-3 mb-4 rounded-lg border border-gray-300 text-base" required />
                    <input type="number" placeholder="No. of Employees" className="w-full p-3 mb-4 rounded-lg border border-gray-300 text-base" />
                    <div className="text-left mb-4">
                        <label className="text-sm">
                            <input type="checkbox" required className="mr-2" /> I agree with <a href="#" className="text-blue-700 underline">terms and conditions</a> and <a href="#" className="text-blue-700 underline">privacy policy</a>.
                        </label>
                    </div>
                    <input type="text" placeholder="Enter the Captcha" className="w-full p-3 mb-4 rounded-lg border border-gray-300 text-base" required />
                    <div className="mb-4 text-blue-700 font-bold">m5yg32 <button type="button" className="ml-2 text-blue-700 underline">Reload</button></div>
                    <button type="submit" className="bg-blue-700 text-white rounded-full px-6 py-3 font-bold text-lg hover:bg-blue-800 transition mr-2">Submit</button>
                    <button type="reset" className="bg-yellow-600 text-white rounded-full px-6 py-3 font-bold text-lg hover:bg-yellow-700 transition">Reset</button>
                </form>
            </section>

            {/* Footer Section */}
            <footer className="bg-white py-8 text-center text-gray-700 mt-8 shadow border-t border-gray-200">
                <div className="mb-4 flex flex-wrap justify-center gap-6">
                    <a href="#" className="text-blue-700 font-medium hover:underline">User guidelines</a>
                    <a href="#" className="text-blue-700 font-medium hover:underline">FAQ</a>
                    <a href="#" className="text-blue-700 font-medium hover:underline">Contact us</a>
                    <a href="#" className="text-blue-700 font-medium hover:underline">About us</a>
                </div>
                <div className="mb-2 text-gray-500">
                    <a href="#" className="text-blue-700 mr-2 hover:underline">Privacy policy</a> | <a href="#" className="text-blue-700 ml-2 hover:underline">Terms of service</a>
                </div>
                <div className="text-gray-400 text-sm">Copyright © 2025 Evoli management d.o.o.</div>
            </footer>
        </main>
    );
};

export default Home;
