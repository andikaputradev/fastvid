import React from "react";
import ReactDOM, { hydrateRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles/globals.css";

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
