import React from "react";

export default function TestimonialCards() {
    const testimonials = [
        {
            quote: "Practical Manager helped us align our goals and improve team engagement by 15%.",
            author: "Team Lead, TechCorp",
        },
        {
            quote: "The feedback and recognition tools make management easy and effective.",
            author: "HR Manager, InnovateX",
        },
    ];
    return (

            <section id="testimonials" className="bg-white py-20">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-16 animate-fade-in-up">
                        What our users say
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {testimonials.map((t, i) => (
                            <blockquote
                                key={i}
                                className="rounded-3xl p-10 font-serif italic text-gray-700 shadow-xl border-l-4 border-yellow-500 transition-transform duration-300 hover:scale-105 animate-fade-in-up"
                                style={{ animationDelay: `${0.2 * i}s` }}
                            >
                                <p className="text-lg md:text-xl leading-relaxed mb-6">“{t.quote}”</p>
                                <div className="font-bold text-blue-700 text-base">{t.author}</div>
                            </blockquote>
                        ))}
                    </div>
                </div>
            </section>
    )
}