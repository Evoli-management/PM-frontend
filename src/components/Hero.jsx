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
                                href="/registration"
                                onClick={(e) => handleNavigate(e, "/registration")}
                                className="inline-flex items-center justify-center btn-gradient btn-glow text-white rounded-lg px-8 py-4 text-lg font-semibold shadow-xl"
                                aria-label="Get started - it's free"
                            >
                                Get started — it's free
                            </a>
                            <a
                                href="#contact"
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