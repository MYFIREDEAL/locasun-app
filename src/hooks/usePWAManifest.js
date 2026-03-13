import { useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

/**
 * 📱 usePWAManifest — Manifest dynamique multi-tenant
 * 
 * Ce hook injecte dynamiquement dans le <head> :
 * - <link rel="manifest"> avec un blob URL contenant le manifest JSON de l'org
 * - <meta name="theme-color"> avec la couleur primaire de l'org
 * - <link rel="apple-touch-icon"> avec le logo de l'org
 * - <meta name="apple-mobile-web-app-title"> avec le nom de l'org
 * 
 * Fallback : valeurs EVATIME par défaut si l'org n'est pas encore chargée
 * 
 * @param {object} options
 * @param {string|null} options.brandName - Nom de l'organisation (display_name)
 * @param {string|null} options.logoUrl - URL du logo de l'org
 * @param {string|null} options.primaryColor - Couleur primaire de l'org (#hex)
 */
export const usePWAManifest = ({ brandName, logoUrl, primaryColor } = {}) => {
  const blobUrlRef = useRef(null);
  const previousManifestRef = useRef(null);

  useEffect(() => {
    const name = brandName || 'EVATIME';
    const shortName = name.length > 12 ? name.substring(0, 12) : name;
    const themeColor = primaryColor || '#3b82f6';
    const bgColor = '#ffffff';

    // Éviter les mises à jour inutiles
    const manifestKey = `${name}-${logoUrl}-${themeColor}`;
    if (previousManifestRef.current === manifestKey) return;
    previousManifestRef.current = manifestKey;

    logger.info('[PWA] Mise à jour manifest dynamique', { name, themeColor, hasLogo: !!logoUrl });

    // === 1. Construire le manifest JSON ===
    const icons = [];

    if (logoUrl) {
      // Si l'org a un logo, l'utiliser comme icône PWA
      // Note : le logo org peut être un SVG, une URL externe, ou du base64
      icons.push(
        { src: logoUrl, sizes: '192x192', type: 'image/png' },
        { src: logoUrl, sizes: '512x512', type: 'image/png' },
        { src: logoUrl, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      );
    } else {
      // Fallback : icônes EVATIME par défaut
      icons.push(
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      );
    }

    const manifest = {
      name: name,
      short_name: shortName,
      description: `Votre espace client ${name}`,
      theme_color: themeColor,
      background_color: bgColor,
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/dashboard',
      icons,
    };

    // === 2. Créer un blob URL pour le manifest ===
    // Révoquer l'ancien blob si nécessaire
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }

    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    blobUrlRef.current = blobUrl;

    // === 3. Injecter/remplacer <link rel="manifest"> ===
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = blobUrl;

    // === 4. Mettre à jour <meta name="theme-color"> ===
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.content = themeColor;

    // === 5. Mettre à jour <link rel="apple-touch-icon"> ===
    if (logoUrl) {
      let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement('link');
        appleTouchIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleTouchIcon);
      }
      appleTouchIcon.href = logoUrl;
    }

    // === 6. Mettre à jour <meta name="apple-mobile-web-app-title"> ===
    let appTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!appTitleMeta) {
      appTitleMeta = document.createElement('meta');
      appTitleMeta.name = 'apple-mobile-web-app-title';
      document.head.appendChild(appTitleMeta);
    }
    appTitleMeta.content = name;

    // === 7. Mettre à jour <meta name="application-name"> ===
    let appNameMeta = document.querySelector('meta[name="application-name"]');
    if (!appNameMeta) {
      appNameMeta = document.createElement('meta');
      appNameMeta.name = 'application-name';
      document.head.appendChild(appNameMeta);
    }
    appNameMeta.content = name;

    // Cleanup : révoquer le blob URL quand le composant unmount
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [brandName, logoUrl, primaryColor]);
};

/**
 * 📱 Utilitaire : détecter si on est en mode PWA standalone
 * Utilisé pour adapter le comportement (magic link, bannière install, etc.)
 */
export const isPWAInstalled = () => {
  // Android Chrome
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari
  if (window.navigator.standalone === true) return true;
  return false;
};

/**
 * 📱 Utilitaire : détecter si on est sur iOS
 */
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

/**
 * 📱 Utilitaire : détecter si on est sur Android
 */
export const isAndroid = () => {
  return /Android/.test(navigator.userAgent);
};

export default usePWAManifest;
