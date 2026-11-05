
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import PwaStatus from "./PwaStatus";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PwaStatus />
    <App />
  </StrictMode>
);
