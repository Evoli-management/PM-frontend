import React from "react";
import { Award, Shield, Star } from "lucide-react";

export default function ValuesComponent() {
    const values = [
        {
            icon: <Award/>,
            title: "Customer-first",
            desc: "We build for our users and their success."
        },
        {
            icon: <Star/>,
            title: "Continuous Improvement",
            desc: "We invest in research and development to deliver the best.",
        },
        {
            icon: <Shield/>,
            title: "Privacy-focused",
            desc: "Your data is secure and private with us."
        },
    ];

    return (
        <section id="values" className="py-20">
            <div className="container mx-auto px-4">
                <h2 className="text-center text-3xl md:text-4xl font-bold text-blue-700 mb-16 animate-fade-in-up">
                    Our Core Values
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
                    {values.map((v, i) => (
                        <div
                            key={i}
                            className="group bg-white rounded-3xl p-8 text-center transition-all duration-300 transform group-hover-scale group-hover-shadow flex flex-col items-center animate-fade-in-up shadow-md hover:bg-amber-50"
                            style={{ animationDelay: `${0.2 * i}s` }}
                        >
                            <div className="mb-6 transform group-hover:scale-125 transition-colors duration-300 group-hover:text-amber-600">
                                {v.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-2 transition-colors duration-300 group-hover:text-amber-600">
                                {v.title}
                            </h3>
                            <p className="text-base text-gray-700">{v.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}