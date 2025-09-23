import React from "react";
import { Handshake, Smile, Target, Timer } from "lucide-react";

export default function FeaturedModulesComponent() {
    const modules = [
        {
            icon: Target,
            color: "#EF4444",
            title: "Goals & Alignment",
            desc: "Set and track goals, align your team, and drive results.",
        },
        {
            icon: Timer,
            color: "#F59E0B",
            title: "Time Management",
            desc: "Manage tasks, deadlines, and priorities for maximum productivity.",
        },
        {
            icon: Handshake,
            color: "#8B4513",
            title: "Recognition",
            desc: "Share recognition and feedback to foster a positive culture.",
        },
        {
            icon: Smile,
            color: "#7C3AED",
            title: "Engagement",
            desc: "Assess and improve team engagement and well-being."
        },
    ];

    return(
        <section id="modules" className="bg-gray-100 py-20">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-center gap-6 mb-16 animate-fade-in-up">
                    <h2 className="text-center text-3xl md:text-4xl font-bold">Featured Modules</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
                    {modules.map((m, i) => (
                        <div
                            key={i}
                            className="group bg-white rounded-3xl p-8 text-center transition-transform duration-300 transform hover:scale-[1.02] hover:shadow-2xl flex flex-col items-center animate-fade-in-up shadow-md hover:bg-amber-50"
                            style={{ animationDelay: `${0.2 * i}s` }}
                        >
                            <div className="mb-6 transition-all duration-300 transform group-hover:scale-110">
                                <div className="relative w-18 h-18"
                                >
                                    <div
                                        style={{
                                            background: m.color,
                                        }}
                                        className="w-18 h-18 flex rounded-2xl items-center justify-center transition-shadow duration-300 group-hover:shadow-lg"
                                    >
                                        {React.createElement(m.icon, { size: 36, color: "#ffffff" })}
                                    </div>
                                    <span
                                        className="absolute inset-0 rounded-full ring-0 group-hover:ring-4"
                                        style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.08)", borderColor: m.color }}
                                    />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-blue-900 mb-2 transition-colors duration-200 group-hover:text-amber-600">
                                {m.title}
                            </h3>
                            <div
                                className="mb-3"
                                style={{ width: 28, height: 8, borderRadius: 4, background: m.color }}
                            />
                            <p className="text-base text-gray-700">{m.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )

}