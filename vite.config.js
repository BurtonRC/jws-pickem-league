import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ Root on localhost, correct subpath on GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === "production" ? "/jws-pickem-league/" : "/"     // <-- this is critical for GitHub Pages
});
