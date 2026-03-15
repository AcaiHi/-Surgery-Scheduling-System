import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: "./postcss.config.js",
  },
  server: {
    watch: {
      // 防止 Vite 監聽 SERVER/ 下的 CSV 輸出檔案而觸發整頁 reload
      ignored: ["**/SERVER/**"],
    },
  },
});
