import React from "react";
import { useTranslation } from "react-i18next";

export default function TestimonialCards() {
    const { t } = useTranslation();
    const testimonials = [
        { quote: t("testimonialCards.quote1"), author: t("testimonialCards.author1") },
        { quote: t("testimonialCards.quote2"), author: t("testimonialCards.author2") },
        { quote: t("testimonialCards.quote2"), author: t("testimonialCards.author2") },
        { quote: t("testimonialCards.quote2"), author: t("testimonialCards.author2") },
    ];
    return (

            <section id="testimonials" className="py-20">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-16 animate-fade-in-up">
                        {t("testimonialCards.title")}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        {testimonials.map((tm, i) => (
                            <blockquote
                                key={i}
                                className="rounded-3xl p-10 text-gray-700 shadow-xl  transition-transform duration-300 hover:scale-105 animate-fade-in-up"
                                style={{ animationDelay: `${0.2 * i}s` }}
                            >
                                <p className="text-lg md:text-xl leading-relaxed mb-6">{tm.quote}</p>
                                <div className="font-bold text-blue-700 text-base">{tm.author}</div>
                            </blockquote>
                        ))}
                    </div>
                </div>
            </section>
    )
}