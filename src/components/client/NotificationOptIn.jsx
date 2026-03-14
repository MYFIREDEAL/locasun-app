import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const OPT_IN_KEY = 'push-optin-dismissed';
const OPT_IN_DISMISS_COUNT_KEY = 'push-optin-dismiss-count';
const VISIT_COUNT_KEY = 'push-optin-visits';
const MIN_VISITS_BEFORE_PROMPT = 1; // Afficher dès la 1ère visite

// Escalade progressive : 3 jours → 7 jours → 30 jours → stop définitif
const DISMISS_DURATIONS = [
  3 * 24 * 60 * 60 * 1000,   // 1er "Plus tard" → reproposer après 3 jours
  7 * 24 * 60 * 60 * 1000,   // 2e "Plus tard" → reproposer après 7 jours
  30 * 24 * 60 * 60 * 1000,  // 3e "Plus tard" → reproposer après 30 jours
];
const MAX_DISMISSALS = 3; // Après 3 dismiss → on arrête définitivement

/**
 * 🔔 NotificationOptIn — Soft prompt pour les push notifications
 * 
 * Règles RGPD et UX :
 * - Affiché dès la 1ère visite (avec 5s de délai)
 * - Escalade progressive si "Plus tard" : 3j → 7j → 30j → stop
 * - Pas affiché si déjà abonné ou si permission refusée
 * - Pas affiché si push non supporté
 * - Pas affiché sur desktop
 * 
 * @param {object} props
 * @param {string} props.prospectId
 * @param {string} props.organizationId
 * @param {string} props.brandName
 * @param {boolean} props.isMobile
 */
const NotificationOptIn = ({ prospectId, organizationId, brandName = 'votre espace', isMobile }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { isSupported, permission, isSubscribed, subscribe, loading } = usePushNotifications({ 
    prospectId, 
    organizationId 
  });

  // Vérifier si le soft prompt a été dismiss (escalade progressive)
  const isDismissed = useCallback(() => {
    try {
      const dismissCount = parseInt(localStorage.getItem(OPT_IN_DISMISS_COUNT_KEY) || '0', 10);
      
      // 3 dismiss → stop définitif
      if (dismissCount >= MAX_DISMISSALS) return true;
      
      const dismissedAt = localStorage.getItem(OPT_IN_KEY);
      if (!dismissedAt) return false;
      
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      const duration = DISMISS_DURATIONS[Math.min(dismissCount - 1, DISMISS_DURATIONS.length - 1)];
      
      // Pas encore expiré → toujours dismiss
      if (elapsed < duration) return true;
      
      // Expiré → on peut reproposer
      localStorage.removeItem(OPT_IN_KEY);
      return false;
    } catch {
      return false;
    }
  }, []);

  // Incrémenter le compteur de visites et vérifier si on doit afficher
  useEffect(() => {
    if (!isMobile || !isSupported || isSubscribed || permission === 'denied' || isDismissed()) return;

    try {
      const visits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10) + 1;
      localStorage.setItem(VISIT_COUNT_KEY, visits.toString());

      if (visits >= MIN_VISITS_BEFORE_PROMPT) {
        // Petit délai pour ne pas surcharger l'arrivée
        const timeout = setTimeout(() => setShowPrompt(true), 5000);
        return () => clearTimeout(timeout);
      }
    } catch { /* ignore localStorage errors */ }
  }, [isMobile, isSupported, isSubscribed, permission, isDismissed]);

  // Dismiss le prompt (escalade : incrémente le compteur)
  const handleDismiss = useCallback(() => {
    try {
      const count = parseInt(localStorage.getItem(OPT_IN_DISMISS_COUNT_KEY) || '0', 10) + 1;
      localStorage.setItem(OPT_IN_DISMISS_COUNT_KEY, count.toString());
      localStorage.setItem(OPT_IN_KEY, Date.now().toString());
    } catch { /* ignore */ }
    setShowPrompt(false);
  }, []);

  // Accepter les notifications
  const handleAccept = async () => {
    const success = await subscribe();
    if (success) {
      setShowPrompt(false);
    }
    // Si refusé (permission denied), on dismiss aussi
    if (!success) {
      handleDismiss();
    }
  };

  // Ne rien afficher dans beaucoup de cas
  if (!isMobile || !isSupported || !showPrompt || isSubscribed || permission === 'denied' || loading) {
    return null;
  }

  return (
    <div className="fixed bottom-[92px] left-0 right-0 z-50 px-3 pb-2 animate-in slide-in-from-bottom duration-300">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 max-w-md mx-auto relative">
        {/* Bouton fermer */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-full"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Contenu centré */}
        <div className="flex flex-col items-center text-center gap-3 pt-1 pb-2">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Bell className="w-7 h-7 text-blue-600" />
          </div>

          <div>
            <p className="font-bold text-gray-900 text-base">
              Restez informé en temps réel
            </p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Sans les notifications, vous ne serez pas averti quand votre conseiller vous envoie un message ou un document à signer. Activez-les pour suivre votre dossier en temps réel.
            </p>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white font-semibold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50"
          >
            <Bell className="w-4 h-4" />
            {loading ? 'Activation...' : 'Activer les notifications'}
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-3 text-sm text-gray-500 font-medium hover:text-gray-700 transition-colors"
          >
            Plus tard
          </button>
        </div>

        {/* Mention RGPD discrète */}
        <p className="text-[10px] text-gray-400 text-center mt-2">
          Vous pourrez les désactiver à tout moment depuis votre profil
        </p>
      </div>
    </div>
  );
};

export default NotificationOptIn;
