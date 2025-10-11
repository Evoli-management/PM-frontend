import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext({ addToast: () => {} });

export function useToast() {
    return useContext(ToastContext);
}

export default function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const idRef = useRef(0);

    const remove = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback(
        (toast) => {
            const id = ++idRef.current;
            const t = {
                id,
                title: toast.title || "",
                description: toast.description || "",
                variant: toast.variant || "info", // info | success | error | warning
                duration: toast.duration ?? 3000,
            };
            setToasts((prev) => [...prev, t]);
            if (t.duration > 0) {
                setTimeout(() => remove(id), t.duration);
            }
            return id;
        },
        [remove],
    );

    const value = useMemo(() => ({ addToast }), [addToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="fixed top-3 right-3 z-[9999] space-y-2 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto w-80 max-w-[90vw] rounded-md border shadow px-3 py-2 text-sm flex items-start gap-2 transition-all ${
                            t.variant === "success"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : t.variant === "error"
                                  ? "bg-red-50 border-red-200 text-red-800"
                                  : t.variant === "warning"
                                    ? "bg-amber-50 border-amber-200 text-amber-800"
                                    : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                        role="status"
                        aria-live="polite"
                    >
                        <div className="flex-1 min-w-0">
                            {t.title && <div className="font-semibold truncate">{t.title}</div>}
                            {t.description && <div className="text-xs text-slate-600 truncate">{t.description}</div>}
                        </div>
                        <button
                            className="ml-2 text-xs text-slate-500 hover:text-slate-700"
                            onClick={() => remove(t.id)}
                            aria-label="Dismiss"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
