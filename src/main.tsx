import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { ViewProvider } from "@/contexts/ViewContext";
import App from "./App";
import "./index.css";
import "./styles/pdf-viewer.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ViewProvider>
        <App />
      </ViewProvider>
    </ThemeProvider>
  </StrictMode>
);
