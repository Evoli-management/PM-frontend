import React from "react";
import { useTranslation } from "react-i18next";

const Footer = () => {
    const { t } = useTranslation();
    return (
            <footer className="bg-blue-900 text-white py-12 text-center">
                <div className="">
                    <div className="mb-6 flex flex-wrap justify-center gap-6 text-sm">
                        <a href="#" className="hover:text-yellow-400 transition-colors">
                            {t("footer.userGuidelines")}
                        </a>
                        <a href="#" className="hover:text-yellow-400 transition-colors">
                            {t("footer.faq")}
                        </a>
                        <a href="#" className="hover:text-yellow-400 transition-colors">
                            {t("footer.contactUs")}
                        </a>
                        <a href="#" className="hover:text-yellow-400 transition-colors">
                            {t("footer.aboutUs")}
                        </a>
                        <a href="#" className="hover:text-yellow-400 transition-colors">
                            {t("footer.privacyPolicy")}
                        </a>
                        <a href="#" className="hover:text-yellow-400 transition-colors">
                            {t("footer.termsOfService")}
                        </a>
                    </div>
                    <div className="text-gray-400 text-xs mt-4">{t("footer.copyright", { year: new Date().getFullYear() })}</div>
                </div>
            </footer>
    );
};

export default Footer;
