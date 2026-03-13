import { logger } from '@/lib/logger';

/**
 * 📱 Enregistrement du Service Worker PWA
 * 
 * Appelé une fois au démarrage de l'app.
 * Le SW est généré par vite-plugin-pwa (injectManifest strategy).
 * 
 * Note : En dev, le SW est activé via devOptions.enabled dans vite.config.js
 */
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    logger.info('[PWA] Service Worker non supporté par ce navigateur');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      type: import.meta.env.DEV ? 'module' : 'classic',
    });

    logger.info('[PWA] Service Worker enregistré', { scope: registration.scope });

    // Auto-update : quand une nouvelle version est dispo → reload
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
          logger.info('[PWA] Nouvelle version détectée → reload');
          window.location.reload();
        }
      });
    });

    // Vérifier les mises à jour toutes les 2 minutes
    setInterval(() => {
      registration.update().catch(() => {});
    }, 2 * 60 * 1000);

    return registration;
  } catch (error) {
    logger.error('[PWA] Erreur enregistrement Service Worker', { error: error.message });
    return null;
  }
};
