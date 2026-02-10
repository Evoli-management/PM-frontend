// Shared goal card styling utilities
import { FaClock, FaFlag, FaCheckCircle } from "react-icons/fa";

export const getStatusConfig = (status) => {
    switch (status) {
        case "active":
            return {
                bg: "bg-blue-50",
                border: "border-blue-200",
                text: "text-blue-800",
                icon: FaClock,
                label: "Active",
            };
        case "completed":
            return {
                bg: "bg-green-50",
                border: "border-green-200",
                text: "text-green-800",
                icon: FaCheckCircle,
                label: "Completed",
            };
        case "archived":
            return {
                bg: "bg-slate-50",
                border: "border-slate-200",
                text: "text-slate-800",
                icon: FaFlag,
                label: "Archived",
            };
        default:
            return {
                bg: "bg-slate-50",
                border: "border-slate-200",
                text: "text-slate-800",
                icon: FaFlag,
                label: status,
            };
    }
};

export const getStatusStyle = (status) => {
    switch (status) {
        case "completed":
            return "bg-green-100 text-green-700";
        case "active":
            return "bg-blue-100 text-blue-700";
        case "archived":
            return "bg-gray-100 text-gray-700";
        default:
            return "bg-gray-100 text-gray-700";
    }
};

export const getProgressColor = (percent) => {
    if (percent >= 90) return "from-green-500 to-emerald-500";
    if (percent >= 70) return "from-blue-500 to-cyan-500";
    if (percent >= 40) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
};

export const getProgressColorCard = (percent) => {
    if (percent >= 80) return "bg-green-500";
    if (percent >= 60) return "bg-blue-500";
    if (percent >= 40) return "bg-yellow-500";
    return "bg-gray-400";
};
