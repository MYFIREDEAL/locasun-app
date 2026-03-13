import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, Share, Plus, Smartphone } from 'lucide-react';
import { isPWAInstalled, isIOS, isAndroid } from '@/hooks/usePWAManifest';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 jours

/**
 * 📱 Bannière d'installation PWA multi-tenant
 * 
 * - Android Chrome : intercepte beforeinstallprompt → bouton "Installer"
 * - iOS Safari : guide l'utilisateur avec les étapes manuelles
 * - Dismiss persisté 7 jours en localStorage
 * - Pas affiché si déjà installé (standalone)
 * - Pas affiché sur desktop
 * 
 * @param {object} props
 * @param {string} props.brandName - Nom de l'org (affiché dans le message)
 * @param {string} props.logoUrl - Logo de l'org (affiché dans la bannière)
 * @param {boolean} props.isMobile - true si on est sur mobile
 */
const InstallPWAPrompt = ({ brandName = 'EVATIME', logoUrl, isMobile }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Vérifier si la bannière a été dismiss récemment
  const isDismissed = useCallback(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (!dismissed) return false;
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < DISMISS_DURATION) return true;
      // Expiré → supprimer
      localStorage.removeItem(DISMISS_KEY);
      return false;
    } catch {
      return false;
    }
  }, []);

  // Dismiss la bannière (persisté 7 jours)
  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch { /* ignore */ }
    setShowPrompt(false);
    setShowIOSGuide(false);
  }, []);

  // Android : intercepter beforeinstallprompt
  useEffect(() => {
    if (!isMobile || isPWAInstalled() || isDismissed()) return;

    const handler = (e) => {
      // Empêcher la bannière Chrome native
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // iOS : pas de beforeinstallprompt, on affiche manuellement après un délai
    if (isIOS()) {
      // Afficher après 3 secondes (laisser le temps de voir l'app d'abord)
      const timeout = setTimeout(() => {
        if (!isPWAInstalled() && !isDismissed()) {
          setShowPrompt(true);
        }
      }, 3000);
      return () => {
        clearTimeout(timeout);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isMobile, isDismissed]);

  // Android : déclencher l'installation
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS()) {
      // Afficher le guide iOS
      setShowIOSGuide(true);
    }
  };

  // Ne rien afficher si pas mobile, déjà installé, ou dismiss
  if (!isMobile || !showPrompt || isPWAInstalled()) return null;

  return (
    <>
      {/* Bannière principale */}
      <div className="fixed bottom-16 left-0 right-0 z-50 px-3 pb-2 animate-in slide-in-from-bottom duration-300">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 max-w-md mx-auto">
          <div className="flex items-start gap-3">
            {/* Logo org ou fallback */}
            <div className="flex-shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName}
                  className="w-12 h-12 rounded-xl object-contain bg-gray-50 p-1.5"
                />
              ) : (
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl font-bold">
                    {brandName.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Texte */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">
                📲 Ajoutez {brandName} sur votre téléphone
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Retrouvez votre espace client comme une vraie application, directement sur votre écran d'accueil
              </p>
            </div>

            {/* Bouton fermer */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 -mr-1 -mt-1 text-gray-400 hover:text-gray-600"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-blue-600 text-white font-medium text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              {isIOS() ? (
                <>
                  <Share className="w-4 h-4" />
                  Voir comment faire
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Installer l'application
                </>
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 text-sm text-gray-500 font-medium hover:text-gray-700 transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>

      {/* Guide iOS (modal overlay) */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl w-full max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-3xl">
              <h3 className="font-bold text-lg text-gray-900">
                📲 Ajouter {brandName} sur votre téléphone
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Étapes */}
            <div className="px-5 py-6 space-y-6">
              {/* Étape 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Appuyez sur le bouton <span className="inline-flex items-center">Partager <Share className="w-4 h-4 mx-1 text-blue-600" /></span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    En bas de l'écran dans Safari (la barre avec les icônes)
                  </p>
                </div>
              </div>

              {/* Étape 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Faites défiler et appuyez sur <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-sm"><Plus className="w-3.5 h-3.5" /> Sur l'écran d'accueil</span>
                  </p>
                </div>
              </div>

              {/* Étape 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Appuyez sur <span className="font-bold text-blue-600">Ajouter</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    L'app apparaîtra sur votre écran d'accueil comme une vraie application !
                  </p>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt={brandName} className="w-12 h-12 rounded-xl object-contain bg-white p-1" />
                ) : (
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-xl font-bold">{brandName.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{brandName}</p>
                  <p className="text-xs text-gray-500">Votre espace client</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-8">
              <button
                onClick={handleDismiss}
                className="w-full bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition-colors"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPWAPrompt;
