import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { UsersProvider } from "./contexts/UsersContext";
import { PublicOrganizationProvider } from "./contexts/PublicOrganizationContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { registerServiceWorker } from "./lib/registerSW";

// 📱 Enregistrer le Service Worker PWA (une seule fois au boot)
registerServiceWorker();

/**
 * 🔥 ISOLATION LANDING PUBLIQUE
 * 
 * Les routes publiques (`/` et `/landing`) sont rendues avec un provider LÉGER
 * (PublicOrganizationProvider) qui résout l'org et le branding SANS :
 * - auth (getSession, onAuthStateChange)
 * - chargement users/prospects
 * - real-time subscriptions
 * - boot CRM complet
 * 
 * Cela garantit un rendu quasi instantané de la landing personnalisée.
 */
const isPublicLandingRoute = () => {
  const path = window.location.pathname;
  return path === "/" || path === "/landing";
};

/**
 * Composant racine conditionnel :
 * - Routes publiques → Landing avec PublicOrganizationProvider (léger)
 * - Autres routes → App complète avec providers CRM
 */
const Root = () => {
  // 🔥 Détection AVANT le montage des providers
  if (isPublicLandingRoute()) {
    // Import dynamique pour éviter de charger le bundle Landing si non nécessaire
    const Landing = React.lazy(() => import("./pages/landing.jsx"));
    
    return (
      <React.Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          </div>
        </div>
      }>
        <BrowserRouter>
          <PublicOrganizationProvider>
            <Landing />
          </PublicOrganizationProvider>
        </BrowserRouter>
      </React.Suspense>
    );
  }

  // 🔥 Boot applicatif complet pour toutes les autres routes
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <OrganizationProvider>
          <UsersProvider>
            <App />
          </UsersProvider>
        </OrganizationProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);