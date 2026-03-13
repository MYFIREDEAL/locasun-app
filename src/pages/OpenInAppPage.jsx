import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isPWAInstalled, isIOS, isAndroid } from '@/hooks/usePWAManifest';
import { logger } from '@/lib/logger';

/**
 * 📱 Page interstitielle pour rediriger vers la PWA
 * 
 * Problème : Quand le client clique sur un magic link dans son email,
 * le lien s'ouvre dans le navigateur (Safari/Chrome) au lieu de la PWA installée.
 * 
 * Solution : 
 * - Desktop → redirect DIRECT vers /dashboard (pas de PWA sur ordi)
 * - PWA standalone → redirect direct vers /dashboard
 * - Mobile browser → page interstitielle "Ouvrir dans l'app"
 * 
 * Route : /open-app?redirect=/dashboard (ou tout autre path)
 */
const OpenInAppPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';
  const [showInterstitial, setShowInterstitial] = useState(false);

  useEffect(() => {
    const isMobile = isIOS() || isAndroid();

    // Desktop → redirect immédiat, pas de page interstitielle
    if (!isMobile) {
      logger.info('[OpenInApp] Desktop détecté, redirect direct vers', redirectPath);
      navigate(redirectPath, { replace: true });
      return;
    }

    // Déjà dans la PWA (standalone) → redirect immédiat
    if (isPWAInstalled()) {
      logger.info('[OpenInApp] Déjà en mode standalone, redirect vers', redirectPath);
      navigate(redirectPath, { replace: true });
      return;
    }

    // Mobile + browser → afficher la page interstitielle
    logger.info('[OpenInApp] Mobile browser détecté, affichage page interstitielle');
    setShowInterstitial(true);
  }, []);

  // Redirect en cours (desktop ou standalone) → spinner
  if (!showInterstitial) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Mode browser mobile : page interstitielle adaptée iOS vs Android
  const isiOS = isIOS();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white px-6 text-center">
      <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <span className="text-white text-4xl font-bold">E</span>
      </div>
      
      <h1 className="text-2xl font-bold text-gray-900 mb-3">
        Connexion réussie ✅
      </h1>

      {isiOS ? (
        <>
          {/* iOS : on ne peut PAS lancer la PWA depuis Safari, on guide le client */}
          <p className="text-gray-600 mb-6 max-w-sm">
            Votre compte est activé ! Vous pouvez maintenant fermer cette page et ouvrir l'application depuis votre écran d'accueil.
          </p>

          <div className="w-full max-w-xs bg-white border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-800 mb-3">📱 Pour accéder à votre espace :</p>
            <div className="space-y-2 text-left">
              <p className="text-sm text-gray-600">1️⃣ Revenez sur votre <strong>écran d'accueil</strong></p>
              <p className="text-sm text-gray-600">2️⃣ Appuyez sur l'icône de <strong>l'application</strong></p>
              <p className="text-sm text-gray-600">3️⃣ Vous serez connecté automatiquement ✨</p>
            </div>
          </div>

          {/* Fallback : continuer dans Safari */}
          <button
            onClick={() => navigate(redirectPath, { replace: true })}
            className="w-full max-w-xs bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:bg-blue-700 transition-colors mb-3"
          >
            Continuer ici
          </button>
          
          <p className="text-xs text-gray-400 max-w-xs">
            Si vous n'avez pas encore installé l'application, cliquez sur « Continuer ici » pour accéder à votre espace.
          </p>
        </>
      ) : (
        <>
          {/* Android : le bouton peut relancer la PWA si installée */}
          <p className="text-gray-600 mb-8 max-w-sm">
            Votre session est active. Ouvrez l'application pour continuer.
          </p>

          <button
            onClick={() => {
              window.location.href = window.location.origin + redirectPath;
            }}
            className="w-full max-w-xs bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:bg-blue-700 transition-colors mb-4"
          >
            Ouvrir l'application
          </button>

          <button
            onClick={() => navigate(redirectPath, { replace: true })}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Continuer dans le navigateur
          </button>
        </>
      )}
    </div>
  );
};

export default OpenInAppPage;
