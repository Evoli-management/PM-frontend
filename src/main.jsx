import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import ToastProvider from "./components/shared/ToastProvider.jsx";
import { preloadTzLib } from "./utils/time";
import reminderManager from './lib/reminderManager';

// Preload the timezone library so synchronous helpers can run immediately in the UI.
// We wait for preload to complete before rendering so callers that expect the
// synchronous wrapper (formatUtcForUserSync) will work without additional changes.
preloadTzLib().finally(() => {
    createRoot(document.getElementById("root")).render(
        <StrictMode>
            <ToastProvider>
                <App />
            </ToastProvider>
        </StrictMode>,
    );
    // Initialize reminder manager (poll /reminders/due)
    try {
        reminderManager.init({ pollMs: 60 * 1000 });
        // also expose for debugging
        window.reminderManager = reminderManager;
    } catch (e) {
        console.warn('Failed to initialize reminder manager', e);
    }
});
