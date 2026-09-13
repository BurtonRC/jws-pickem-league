import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const originalPushState = window.history.pushState;
window.history.pushState = function (...args) {
  console.trace("[NAVIGATION] pushState:", args);
  return originalPushState.apply(this, args);
};

const originalReplaceState = window.history.replaceState;
window.history.replaceState = function (...args) {
  console.trace("[NAVIGATION] replaceState:", args);
  return originalReplaceState.apply(this, args);
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
