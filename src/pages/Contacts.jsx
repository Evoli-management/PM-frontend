import ContactForm from "../components/ContactForm.jsx";

export default function Contacts() {
    return (
        <div className="min-h-screen flex items-center justify-center">
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
            <div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-800">Contact Page</h1>

            {/* Contact Form Section */}
            <ContactForm />
            </div>
        </div>
    );
}