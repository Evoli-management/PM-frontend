import React from "react";
import { useTranslation } from "react-i18next";

export default function Pricing() {
    const { t } = useTranslation();
    return <>{t("pricing.title")}</>;
}
