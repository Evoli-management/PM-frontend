import React from "react";

// Background image for the hero can be provided via environment variable:
// - VITE_HERO_BG: URL to a remote image (or a path under /public/)
// - VITE_HERO_BG_OPACITY: overlay opacity (0.0 - 1.0) to keep text readable
const HERO_BG = import.meta.env.VITE_HERO_BG || `${import.meta.env.BASE_URL}bg.png`;
// Slightly lighter overlay by default so the illustration reads through while keeping text legible.
const HERO_BG_OPACITY = import.meta.env.VITE_HERO_BG_OPACITY ? parseFloat(import.meta.env.VITE_HERO_BG_OPACITY) : 0.48;
// Hero illustration can be a remote PNG URL via VITE_HERO_ILLUST or fallback to the project's bg.png
const HERO_ILLUST_URL = import.meta.env.VITE_HERO_ILLUST || `${import.meta.env.BASE_URL}bg.png`;
// Opacity for the illustration overlay (0.0 - 1.0). Lower = image more visible.
const HERO_ILLUST_OPACITY = import.meta.env.VITE_HERO_ILLUST_OPACITY
    ? parseFloat(import.meta.env.VITE_HERO_ILLUST_OPACITY)
    : 0.18;
// Tint color and opacity for the hero image overlay to match/echo copy color
const HERO_ILLUST_TINT = import.meta.env.VITE_HERO_ILLUST_TINT || "#F59E0B";
const HERO_ILLUST_TINT_OPACITY = import.meta.env.VITE_HERO_ILLUST_TINT_OPACITY
    ? parseFloat(import.meta.env.VITE_HERO_ILLUST_TINT_OPACITY)
    : 0.08;

function hexToRgb(hex) {
    const raw = hex.replace("#", "");
    const full =
        raw.length === 3
            ? raw
                .split("")
                .map((c) => c + c)
                .join("")
            : raw;
    const num = parseInt(full, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `${r}, ${g}, ${b}`;
}

export default function Hero() {
    return (
        <section className="relative py-16 w-full max-w-6xl mx-auto">
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
            <div className="container">
                <div className="flex flex-col-reverse md:flex-row items-center gap-10 md:gap-20">
                    {/* Left column: headline, copy, CTAs, stats */}
                    <div className="text-center md:text-left">
                        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-2">
                            <span className="heading-gradient">Lead with clarity.</span>
                            <span className="heading-subtle">Deliver with confidence.</span>
                        </h1>

                        <p className="text-slate-600 mb-4">
                            Practical Manager is a productivity and leadership tool for your team to excel.
                        </p>

                        {/* <div className="text-base text-slate-700 mb-4 max-w-xl mx-auto md:mx-0">
                            <div className="font-semibold mb-2">A different tool that helps your team:</div>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Goal-setting and alignment</li>
                                <li>Share recognition and practice 1-minute management</li>
                                <li>Manage your time and achieve results</li>
                                <li>Develop managerial behavior and leadership excellence</li>
                            </ul>
                        </div> */}

                        <div className="flex justify-center md:justify-start gap-4 items-center mt-2">
                            <a
                                href="#registration"
                                onClick={(e) => handleNavigate(e, "/registration")}
                                className="inline-flex items-center justify-center btn-gradient btn-glow text-white rounded-lg px-8 py-4 text-lg font-semibold shadow-xl"
                                aria-label="Get started - it's free"
                            >
                                Get started — it's free
                            </a>
                            <a
                                href="#contacts"
                                onClick={(e) => handleNavigate(e, "/contacts")}
                                className="inline-flex items-center justify-center border border-slate-200 text-slate-700 rounded-lg px-8 py-4 text-lg font-medium hover:bg-slate-50"
                                aria-label="Request a demo"
                            >
                                Request a demo
                            </a>
                        </div>
                    </div>

                    {/* Right column: polished illustration card */}
                    <div className="flex justify-center">
                        <div className="w-full relative rounded-2xl" style={{ minHeight: 420 }}>
                            <div
                                aria-hidden="true"
                                className="rounded-2xl"
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    backgroundImage: `url('${HERO_ILLUST_URL}')`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    backgroundRepeat: "no-repeat",
                                    width: "100%",
                                    height: "100%",
                                    filter: "saturate(1.02) contrast(1.03)",
                                }}
                            />
                            <div
                                aria-hidden="true"
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    backgroundColor: `rgba(${hexToRgb(HERO_ILLUST_TINT)}, ${HERO_ILLUST_TINT_OPACITY})`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}