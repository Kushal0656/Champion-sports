import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { startKeepAlive } from "./utils/keepAlive";

// Keep Render backend warm — prevents 30-60s cold start delays
startKeepAlive();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);