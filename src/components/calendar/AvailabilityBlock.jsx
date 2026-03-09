import React from "react";
import { useTranslation } from "react-i18next";

const AvailabilityBlock = ({ type = "available", start, end }) => {
    const { t } = useTranslation();
    const color = type === "available" ? "bg-green-400" : "bg-red-400";
    return (
        <div className={`rounded px-2 py-1 text-xs text-white font-bold ${color} mb-1`}>
            {type === "available" ? t("availabilityBlock.available") : t("availabilityBlock.protected")} {start} - {end}
        </div>
    );
};

export default AvailabilityBlock;
