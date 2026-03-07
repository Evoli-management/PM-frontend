import { useTranslation } from "react-i18next";

export default function Modules() {
    const { t } = useTranslation();
    return <>{t("modules.title")}</>;
}
