import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { UsersProvider } from "./contexts/UsersContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <OrganizationProvider>
        <UsersProvider>
          <App />
        </UsersProvider>
      </OrganizationProvider>
    </BrowserRouter>
  </React.StrictMode>
);