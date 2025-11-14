import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar.jsx";
import { useToast } from "../components/shared/ToastProvider.jsx";
import { FiAlertTriangle, FiClock } from "react-icons/fi";
import { FaCheck, FaExclamation, FaLongArrowAltDown, FaTimes, FaTrash, FaBars } from "react-icons/fa";
const DontForgetComposer = React.lazy(() => import("../components/tasks/DontForgetComposer.jsx"));

// Lazy getters for services to allow code-splitting
let _taskService = null;
const getTaskService = async () => {
    if (_taskService) return _taskService;
    const mod = await import("../services/taskService");
    _taskService = mod.default || mod;
    return _taskService;
};

let _keyAreaService = null;
export { default } from "./DontForget.jsx";
    if (_keyAreaService) return _keyAreaService;
