import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/jws-pickem-league/", // GitHub Pages
  plugins: [react()],
});
