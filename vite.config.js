import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/jws-pickem-league/", // repo name  use "/" later for a custom domain
  plugins: [react()],
});
