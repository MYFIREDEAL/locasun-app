/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// 🔥 Auto-update : prendre le contrôle immédiatement
self.skipWaiting();
clientsClaim();

// 🔥 Precache les assets générés par Vite
precacheAndRoute(self.__WB_MANIFEST);

// 🔥 Nettoyer les anciens caches
cleanupOutdatedCaches();

// =====================================================
// 🔔 PUSH NOTIFICATIONS (Phase 3 — prêt mais pas encore actif)
// =====================================================

// 🔇 Track si l'app est au premier plan (message du frontend)
let appIsActive = false;
let appActiveTimeout = null;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'APP_ACTIVE') {
    appIsActive = true;
    // Reset après 5s sans nouveau heartbeat → considérer comme inactive
    clearTimeout(appActiveTimeout);
    appActiveTimeout = setTimeout(() => { appIsActive = false; }, 5000);
  }
  if (event.data && event.data.type === 'APP_INACTIVE') {
    appIsActive = false;
    clearTimeout(appActiveTimeout);
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const title = data.title || 'Nouvelle notification';
    const options = {
      body: data.body || '',
      icon: data.icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag || 'default',
      // ⚡ Garder la notification visible jusqu'au clic (ne pas disparaître)
      requireInteraction: true,
      // Données pour le clic (quelle page ouvrir)
      data: {
        url: data.url || '/dashboard',
        prospectId: data.prospectId,
        projectType: data.projectType,
      },
      // Vibration sur Android
      vibrate: [200, 100, 200],
      // Actions rapides
      actions: data.actions || [],
    };

    // 🔇 Si l'app est active (heartbeat récent), ne pas afficher la notif
    if (appIsActive) {
      console.log('[SW] App active (heartbeat), skip push notification');
      return;
    }

    event.waitUntil(
      self.registration.showNotification(title, options).then(() => {
        // 🔴 Pastille rouge sur l'icône PWA
        if (self.navigator && self.navigator.setAppBadge) {
          return self.navigator.setAppBadge(1);
        }
      })
    );
  } catch (err) {
    console.error('[SW] Erreur push:', err);
  }
});

// 🔔 Clic sur notification → ouvrir la PWA sur la bonne page + enlever pastille
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // 🔴 Enlever la pastille rouge
  if (self.navigator && self.navigator.clearAppBadge) {
    self.navigator.clearAppBadge();
  }

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    // Chercher si la PWA est déjà ouverte
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si une fenêtre existe déjà, la focus et naviguer
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Sinon, ouvrir une nouvelle fenêtre
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// =====================================================
// 📱 MAGIC LINK → PWA REDIRECT
// =====================================================
// Quand le SW intercepte une navigation vers /dashboard avec un token,
// il s'assure que ça ouvre dans la PWA (pas dans le browser)

self.addEventListener('fetch', (event) => {
  // Ne pas interférer avec les requêtes non-navigation
  if (event.request.mode !== 'navigate') return;
  
  // Laisser workbox gérer le reste par défaut
});
