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
        <section className="relative bg-white pt-16 pb-16 px-4 text-gray-900">
            <div className="container mx-auto">
                <div className="flex flex-col-reverse md:flex-row items-center gap-10 md:gap-20">
                    {/* Left column: headline, copy, CTAs, stats */}
                    <div className="md:w-6/12 text-center md:text-left">
                        <h1 className="text-5xl sm:text-5xl md:text-6xl lg:text-6xl font-extrabold leading-tight mb-2">
                            <span className="heading-gradient">Lead with clarity.</span>
                            <span className="heading-subtle">Deliver with confidence.</span>
                        </h1>

                        <p className="text-lg text-slate-600 mb-4 max-w-xl mx-auto md:mx-0">
                            Practical Manager is a productivity and leadership tool for your team to excel.
                        </p>

                        <div className="text-base text-slate-700 mb-4 max-w-xl mx-auto md:mx-0">
                            <div className="font-semibold mb-2">A different tool that helps your team:</div>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Goal-setting and alignment</li>
                                <li>Share recognition and practice 1-minute management</li>
                                <li>Manage your time and achieve results</li>
                                <li>Develop managerial behaviour and leadership excellence</li>
                            </ul>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start mt-2">
                            <a
                                href="/registration"
                                onClick={(e) => handleNavigate(e, "/registration")}
                                className="inline-flex items-center justify-center btn-gradient btn-glow text-white rounded-full px-8 py-4 text-lg font-semibold shadow-xl"
                                aria-label="Get started - it's free"
                            >
                                Get started — it's free
                            </a>
                            <a
                                href="#contact"
                                className="inline-flex items-center justify-center border border-slate-200 text-slate-700 rounded-full px-8 py-4 text-lg font-medium hover:bg-slate-50"
                                aria-label="Request a demo"
                            >
                                Request a demo
                            </a>
                        </div>
                    </div>

                    {/* Right column: polished illustration card */}
                    <div className="md:w-6/12 flex justify-center md:justify-end">
                        <div className="w-full relative" style={{ minHeight: 420 }}>
                            <div
                                aria-hidden="true"
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