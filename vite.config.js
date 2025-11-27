import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
    base: "/PM-frontend/", // ✅ This is required for GitHub Pages
    plugins: [react(), tailwindcss()],
    // Fix: some dependencies (or older compiled code) import deep paths like
    // 'date-fns/format/index.js' which are not exposed by date-fns' package
    // exports. Add a few aliases to map those deep-import paths to the
    // published entry points so Vite's resolver can find them during build.
    resolve: {
        alias: {
            'date-fns/format/index.js': 'date-fns/format',
            'date-fns/_lib/cloneObject/index.js': 'date-fns/_lib/cloneObject',
        },
    },
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:3000",
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
