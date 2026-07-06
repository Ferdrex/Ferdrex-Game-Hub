import { createRoot } from "react-dom/client";
import { AppProvider } from "./context/AppContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <AppProvider>
    <App />
  </AppProvider>
);

// Register the service worker for offline / installable PWA (production only,
// so it never interferes with the Vite dev server / HMR).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore registration failures */
    });
  });
}
