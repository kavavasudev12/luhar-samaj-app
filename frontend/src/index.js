import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Make sure the "root" div exists in index.html
const container = document.getElementById("root");

if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("❌ Root container not found. Check your index.html file.");
}
