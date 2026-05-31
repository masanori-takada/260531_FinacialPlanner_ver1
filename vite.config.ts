import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite + React + Vitest 設定。テストは純粋関数中心のため node 環境で実行する。
export default defineConfig({
  base:
    process.env.GITHUB_REPOSITORY && process.env.GITHUB_ACTIONS
      ? `/${process.env.GITHUB_REPOSITORY.split("/")[1]}/`
      : "/",
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
