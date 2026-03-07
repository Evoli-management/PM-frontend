import { useTranslation } from "react-i18next";

export default function ErrorPage() {
    const { t } = useTranslation();
    return <>{t("error.title")}</>;
}
