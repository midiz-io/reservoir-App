import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Optional: Show a notification that an update is available
      console.log("New content available, please refresh.");
    },
    onOfflineReady() {
      console.log("App ready to work offline");
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
