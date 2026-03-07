import React from "react";
import { useTranslation } from "react-i18next";
import { Award, Shield, Star } from "lucide-react";

export default function ValuesComponent() {
    const { t } = useTranslation();
    const values = [
        {
            icon: <Award/>,
            title: t("values.customerFirstTitle"),
            desc: t("values.customerFirstDesc"),
        },
        {
            icon: <Star/>,
            title: t("values.continuousImprovementTitle"),
            desc: t("values.continuousImprovementDesc"),
        },
        {
            icon: <Shield/>,
            title: t("values.privacyFocusedTitle"),
            desc: t("values.privacyFocusedDesc"),
        },
    ];

    return (
        <section id="values" className="py-20">
            <div className="container mx-auto px-4">
                <h2 className="text-center text-3xl md:text-4xl font-bold text-blue-700 mb-16 animate-fade-in-up">
                    {t("values.title")}
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