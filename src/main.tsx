import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ViewProvider } from "@/contexts/ViewContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ViewProvider>
      <App />
    </ViewProvider>
  </StrictMode>
);
