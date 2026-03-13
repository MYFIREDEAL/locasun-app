import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isPWAInstalled } from '@/hooks/usePWAManifest';
import { logger } from '@/lib/logger';

/**
 * 📱 Page interstitielle pour rediriger vers la PWA
 * 
 * Problème : Quand le client clique sur un magic link dans son email,
 * le lien s'ouvre dans le navigateur (Safari/Chrome) au lieu de la PWA installée.
 * 
 * Solution : 
 * - Si on est DÉJÀ dans la PWA (standalone) → redirect direct vers /dashboard
 * - Si on est dans le browser → afficher un bouton "Ouvrir dans l'app"
 *   qui utilise un custom URL scheme ou une page qui guide l'utilisateur
 * 
 * Route : /open-app?redirect=/dashboard (ou tout autre path)
 */
const OpenInAppPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Si on est déjà dans la PWA → redirect immédiat
    if (isPWAInstalled()) {
      setIsStandalone(true);
      logger.info('[OpenInApp] Déjà en mode standalone, redirect vers', redirectPath);
      navigate(redirectPath, { replace: true });
      return;
    }

    // Si on est dans le browser, on attend que le magic link soit traité
    // (Supabase auth via detectSessionInUrl) puis on propose d'ouvrir la PWA
    logger.info('[OpenInApp] Mode browser détecté, affichage page interstitielle');
  }, []);

  // Si on est en standalone, on ne montre rien (redirect en cours)
  if (isStandalone) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Mode browser : page interstitielle
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white px-6 text-center">
      <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <span className="text-white text-4xl font-bold">E</span>
      </div>
      
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Connexion réussie ✅
      </h1>
      
      <p className="text-gray-600 mb-8 max-w-sm">
        Votre session est active. Ouvrez l'application pour continuer.
      </p>

      {/* Bouton principal : ouvrir dans la PWA */}
      <button
        onClick={() => {
          // Tenter d'ouvrir la PWA via le même URL (Android le redirige vers standalone si installé)
          window.location.href = window.location.origin + redirectPath;
        }}
        className="w-full max-w-xs bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:bg-blue-700 transition-colors mb-4"
      >
        Ouvrir l'application
      </button>

      {/* Fallback : continuer dans le browser */}
      <button
        onClick={() => navigate(redirectPath, { replace: true })}
        className="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Continuer dans le navigateur
      </button>

      {/* Instructions iOS */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl max-w-sm">
        <p className="text-xs text-gray-500">
          💡 <strong>Astuce iPhone</strong> : Si l'app ne s'ouvre pas, allez sur votre écran d'accueil et appuyez sur l'icône de l'app.
        </p>
      </div>
    </div>
  );
};

export default OpenInAppPage;
