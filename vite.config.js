import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => {
  const isDev = command === 'serve';
  return {
    base: isDev ? '/' : '/jws-pickem-league/', // '/' for localhost, repo prefix for GitHub Pages
    plugins: [react()],
  };
});
