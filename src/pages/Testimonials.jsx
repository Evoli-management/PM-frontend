import React from "react";
import { useTranslation } from "react-i18next";
export default function Testimonials() {
    const { t } = useTranslation();
    return <>{t("testimonials.title")}</>;
}
