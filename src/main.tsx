import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/page";
import { registerServiceWorker } from "./pwa/register-service-worker";
import "./app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Gia Phả could not find its application root.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
