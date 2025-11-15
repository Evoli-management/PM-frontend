import React, { useEffect, useRef } from "react";

// Lightweight modal with basic focus-trap, ESC-to-close and focus restore.
export default function Modal({ open, onClose, children }) {
    const containerRef = useRef(null);
    const lastActiveRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        // Save last focused element so we can restore on close
        lastActiveRef.current = document.activeElement;

        const container = containerRef.current;
        // Focus the first focusable element inside the modal or the container itself
        const focusFirst = () => {
            try {
                const selector = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
                const el = container?.querySelector(selector);
                if (el && typeof el.focus === 'function') {
                    el.focus();
                } else if (container && typeof container.focus === 'function') {
                    container.focus();
                }
            } catch (e) {
                // ignore
            }
        };

        // small delay to let the modal DOM render
        const t = window.setTimeout(focusFirst, 50);

        const onKey = (e) => {
            if (e.key === "Escape") {
                onClose && onClose();
                return;
            }
            if (e.key === "Tab") {
                // Basic tab trap: cycle focus within modal
                try {
                    const selector = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
                    const nodes = Array.from(container.querySelectorAll(selector)).filter((n) => n.offsetParent !== null);
                    if (nodes.length === 0) return;
                    const idx = nodes.indexOf(document.activeElement);
                    let next = 0;
                    if (e.shiftKey) {
                        next = idx <= 0 ? nodes.length - 1 : idx - 1;
                    } else {
                        next = idx === -1 || idx === nodes.length - 1 ? 0 : idx + 1;
                    }
                    nodes[next].focus();
                    e.preventDefault();
                } catch (err) {
                    // ignore
                }
            }
        };

        document.addEventListener("keydown", onKey);

        return () => {
            window.clearTimeout(t);
            document.removeEventListener("keydown", onKey);
            // restore focus
            try {
                const prev = lastActiveRef.current;
                if (prev && typeof prev.focus === 'function') prev.focus();
            } catch (e) {}
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div ref={containerRef} className="relative" tabIndex={-1} aria-modal="true" role="dialog">
                {children}
            </div>
        </div>
    );
}
