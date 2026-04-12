import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const DEFAULT_API_PROXY_TARGET = "http://127.0.0.1:8000";

function normalizeApiProxyTarget(rawValue) {
  if (!rawValue) {
    return DEFAULT_API_PROXY_TARGET;
  }

  try {
    const url = new URL(rawValue);
    if (url.pathname === "/api" || url.pathname === "/api/") {
      url.pathname = "";
    }
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_API_PROXY_TARGET;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = normalizeApiProxyTarget(env.API_PROXY_TARGET || env.VITE_API_BASE_URL);

  return {
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: 5173,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
