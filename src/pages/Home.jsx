
import React from "react";
import { Link } from "react-router-dom";

const navLink = {
    color: '#234',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'color 0.2s',
};

const ctaBtn = {
    background: '#217c8c',
    color: '#fff',
    border: 'none',
    borderRadius: 24,
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px #217c8c22',
    marginBottom: '0.5rem',
};

const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1rem',
    borderRadius: 8,
    border: '1px solid #ccc',
    fontSize: '1rem',
};

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

// Remove placeholder brands; use empty array or your real partners if available
const partners = [];

const Home = () => {
    return (
        <main style={{ fontFamily: 'Inter, Arial, sans-serif', background: '#f8f9fa', color: '#234', minHeight: '100vh' }}>
            {/* Navigation Bar */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', background: '#fff', boxShadow: '0 2px 8px #217c8c11', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ fontWeight: 700, fontSize: '1.5rem', color: '#217c8c' }}>Practical Manager</div>
                <div style={{ display: 'flex', gap: '2rem', fontSize: '1rem' }}>
                    <a href="#modules" style={navLink}>Modules</a>
                    <a href="#values" style={navLink}>Values</a>
                    <a href="#testimonials" style={navLink}>Testimonials</a>
                    <a href="#contact" style={navLink}>Contact</a>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link to="/login" style={{ background: '#217c8c', color: '#fff', borderRadius: 20, padding: '0.5rem 1.5rem', fontWeight: 600, textDecoration: 'none' }}>Login</Link>
                    <Link to="/registration" style={{ background: '#c87d2a', color: '#fff', borderRadius: 20, padding: '0.5rem 1.5rem', fontWeight: 600, textDecoration: 'none' }}>Register</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section style={{ padding: '4rem 0 2rem', background: '#fff', textAlign: 'center', boxShadow: '0 2px 8px #217c8c11' }}>
                <h1 style={{ fontSize: '2.7rem', fontWeight: 700, marginBottom: '1rem', color: '#217c8c' }}>
                    Your team's success, powered by Practical Manager
                </h1>
                <p style={{ fontSize: '1.25rem', marginBottom: '2rem', color: '#234' }}>
                    A unique platform to transform the way you work. Built for teams of all sizes, focused on productivity, engagement, and leadership.
                </p>
                <Link to="/registration" style={{ ...ctaBtn, display: 'inline-block', textAlign: 'center', textDecoration: 'none', fontSize: '1.1rem', fontWeight: 700 }}>Get Started Free</Link>
                <div style={{ marginTop: '2rem' }}>
                    <img src="/public/icon.png" alt="Practical Manager" style={{ width: 120, borderRadius: '50%', boxShadow: '0 2px 12px #217c8c22' }} />
                </div>
            </section>

            {/* Featured Modules Section */}
            <section id="modules" style={{ background: '#f8f9fa', padding: '3rem 0' }}>
                <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, color: '#217c8c', marginBottom: '2rem' }}>Featured Modules</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2rem' }}>
                    {modules.map((m, i) => (
                        <div key={i} style={{ background: '#fff', borderRadius: 24, boxShadow: '0 2px 12px #217c8c22', padding: '2rem', maxWidth: 260, flex: '1 1 200px', textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{m.icon}</div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#217c8c' }}>{m.title}</h3>
                            <p style={{ fontSize: '1rem', color: '#234' }}>{m.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Story/Brand Section */}
            <section style={{ background: '#fff', padding: '3rem 0', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#c87d2a', marginBottom: '1rem' }}>It takes time to build something that lasts</h2>
                <p style={{ fontSize: '1.15rem', color: '#234', marginBottom: '1.5rem' }}>We believe in long-term commitment, continuous improvement, and putting our users first.</p>
                <Link to="/about" style={{ ...ctaBtn, background: '#c87d2a', display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>Read Our Story</Link>
            </section>

            {/* Platform Highlight Section */}
            <section style={{ background: '#ffe600', padding: '3rem 0', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#234', marginBottom: '1rem' }}>All-in-one suite for your business</h2>
                <p style={{ fontSize: '1.15rem', color: '#234', marginBottom: '1.5rem' }}>Break down silos, increase efficiency, and empower your team with Practical Manager.</p>
                <Link to="/registration" style={{ ...ctaBtn, background: '#e53935', display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>Try Now</Link>
            </section>

                    {/* Trust Signals Section - removed brands, upgraded for clean UI */}
                    <section style={{ background: '#f8f9fa', padding: '2rem 0', textAlign: 'center', borderTop: '1px solid #e0e0e0' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#217c8c', marginBottom: '1rem' }}>Trusted by teams who value results</h3>
                        <div style={{ color: '#888', fontSize: '1.05rem', marginBottom: '1rem' }}>
                            Practical Manager is used by organizations focused on growth, engagement, and leadership.
                        </div>
                    </section>

            {/* Testimonials Section */}
            <section id="testimonials" style={{ background: '#fff', padding: '2rem 0', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#217c8c', marginBottom: '1rem' }}>What our users say</h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                    {testimonials.map((t, i) => (
                        <blockquote key={i} style={{ background: '#eaf6f6', borderRadius: 16, padding: '1.5rem', maxWidth: 320, fontStyle: 'italic', color: '#234', boxShadow: '0 2px 8px #217c8c22', margin: 0 }}>
                            “{t.quote}”
                            <div style={{ fontWeight: 600, color: '#217c8c', marginTop: '0.5rem', fontSize: '0.95rem' }}>{t.author}</div>
                        </blockquote>
                    ))}
                </div>
            </section>

            {/* Values Section */}
            <section id="values" style={{ background: '#fff', padding: '3rem 0', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#c87d2a', marginBottom: '2rem' }}>Our Core Values</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '2rem' }}>
                    {values.map((v, i) => (
                        <div key={i} style={{ background: '#f8f9fa', borderRadius: 24, boxShadow: '0 2px 12px #c87d2a22', padding: '2rem', maxWidth: 260, flex: '1 1 200px', textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{v.icon}</div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#c87d2a' }}>{v.title}</h3>
                            <p style={{ fontSize: '1rem', color: '#234' }}>{v.desc}</p>
                        </div>
                    ))}
                </div>
                <Link to="/about" style={{ ...ctaBtn, background: '#c87d2a', display: 'inline-block', textAlign: 'center', textDecoration: 'none', marginTop: '2rem' }}>Read Our Story</Link>
            </section>

            {/* Contact Form Section */}
            <section id="contact" style={{ background: '#eaf6f6', padding: '2rem 0', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#217c8c', marginBottom: '1rem' }}>Contact us for DEMO</h2>
                <form style={{ display: 'inline-block', background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px #217c8c22', padding: '2rem', maxWidth: 400, width: '100%' }}>
                    <input type="text" placeholder="First Name" style={inputStyle} />
                    <input type="text" placeholder="Last Name*" style={inputStyle} required />
                    <input type="text" placeholder="Phone" style={inputStyle} />
                    <input type="email" placeholder="Email*" style={inputStyle} required />
                    <input type="text" placeholder="Company*" style={inputStyle} required />
                    <input type="number" placeholder="No. of Employees" style={inputStyle} />
                    <div style={{ textAlign: 'left', margin: '1rem 0' }}>
                        <label style={{ fontSize: '0.95rem' }}>
                            <input type="checkbox" required /> I agree with <a href="#" style={{ color: '#217c8c' }}>terms and conditions</a> and <a href="#" style={{ color: '#217c8c' }}>privacy policy</a>.
                        </label>
                    </div>
                    <input type="text" placeholder="Enter the Captcha" style={inputStyle} required />
                    <div style={{ marginBottom: '1rem', color: '#217c8c', fontWeight: 600 }}>m5yg32 <button type="button" style={{ marginLeft: 8, background: 'none', border: 'none', color: '#217c8c', cursor: 'pointer' }}>Reload</button></div>
                    <button type="submit" style={{ background: '#217c8c', color: '#fff', border: 'none', borderRadius: 24, padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginRight: 8 }}>Submit</button>
                    <button type="reset" style={{ background: '#c87d2a', color: '#fff', border: 'none', borderRadius: 24, padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>Reset</button>
                </form>
            </section>

                    {/* Footer Section - upgraded for best UI/UX */}
                    <footer style={{ background: '#fff', padding: '2.5rem 0 1.5rem', textAlign: 'center', color: '#234', fontSize: '1rem', marginTop: '2rem', boxShadow: '0 -2px 8px #217c8c11', borderTop: '1px solid #e0e0e0' }}>
                        <div style={{ marginBottom: '1.2rem', display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                            <a href="#" style={{ color: '#217c8c', textDecoration: 'none', fontWeight: 500 }}>User guidelines</a>
                            <a href="#" style={{ color: '#217c8c', textDecoration: 'none', fontWeight: 500 }}>FAQ</a>
                            <a href="#" style={{ color: '#217c8c', textDecoration: 'none', fontWeight: 500 }}>Contact us</a>
                            <a href="#" style={{ color: '#217c8c', textDecoration: 'none', fontWeight: 500 }}>About us</a>
                        </div>
                        <div style={{ marginBottom: '0.7rem', color: '#888' }}>
                            <a href="#" style={{ color: '#217c8c', marginRight: 8 }}>Privacy policy</a> | <a href="#" style={{ color: '#217c8c', marginLeft: 8 }}>Terms of service</a>
                        </div>
                        <div style={{ color: '#888', fontSize: '0.95rem' }}>Copyright © 2025 Evoli management d.o.o.</div>
                    </footer>
        </main>
    );
};

export default Home;
