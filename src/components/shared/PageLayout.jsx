import React, { useState } from "react";
import Sidebar from "./Sidebar";

/**
 * Shared page layout with consistent styling and sidebar
 * Ensures all pages have the same background and structure
 */
export default function PageLayout({ children, className = "" }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar collapsed={sidebarCollapsed} onCollapseToggle={setSidebarCollapsed} />
            <main className={`flex-1 overflow-auto ${className}`}>
                {children}
            </main>
        </div>
    );
}
