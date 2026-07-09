import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { ErrorBoundary } from "./app/components/ErrorBoundary.tsx";
import { installTranslateDomPatch } from "./app/lib/domTranslatePatch.ts";
import "./styles/index.css";

// Must run before React mounts so every reconciliation goes through the
// translator-tolerant removeChild / insertBefore.
installTranslateDomPatch();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
