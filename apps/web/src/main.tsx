import React from "react";
import ReactDOM, { hydrateRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles/globals.css";

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", () => {
    const reloadKey = "fastvid_preload_reload";
    const lastReload = sessionStorage.getItem(reloadKey);
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem(reloadKey, String(now));
      window.location.reload();
    }
  });
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found.");
}

const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (root.hasChildNodes()) {
  hydrateRoot(root, app);
} else {
  ReactDOM.createRoot(root).render(app);
}
