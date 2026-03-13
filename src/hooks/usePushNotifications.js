import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * 📱 usePushNotifications — Gère l'abonnement aux push notifications
 * 
 * Responsabilités :
 * - Vérifier si les push notifications sont supportées
 * - Vérifier / demander la permission
 * - S'abonner / se désabonner au push
 * - Sauvegarder la souscription en DB (push_subscriptions)
 * 
 * ⚠️ RGPD : Ne jamais appeler subscribe() sans action explicite de l'utilisateur
 * 
 * @param {object} options
 * @param {string} options.prospectId - UUID du prospect connecté
 * @param {string} options.organizationId - UUID de l'org
 * @returns {object} { isSupported, permission, isSubscribed, subscribe, unsubscribe, loading }
 */
export const usePushNotifications = ({ prospectId, organizationId } = {}) => {
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef(null);

  // Les push notifications sont-elles supportées ?
  const isSupported = 'serviceWorker' in navigator 
    && 'PushManager' in window 
    && 'Notification' in window
    && !!VAPID_PUBLIC_KEY;

  // Convertir la clé VAPID base64url en Uint8Array
  const urlBase64ToUint8Array = useCallback((base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }, []);

  // Vérifier l'état actuel au montage
  useEffect(() => {
    if (!isSupported) {
      setLoading(false);
      return;
    }

    const checkCurrentState = async () => {
      try {
        // Permission actuelle
        setPermission(Notification.permission);

        // Vérifier si déjà abonné via le SW
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          subscriptionRef.current = subscription;
          setIsSubscribed(true);
          logger.info('[Push] Souscription existante détectée');
        } else {
          setIsSubscribed(false);
          logger.info('[Push] Pas de souscription active');
        }
      } catch (err) {
        logger.warn('[Push] Erreur vérification état:', err);
      } finally {
        setLoading(false);
      }
    };

    checkCurrentState();
  }, [isSupported]);

  /**
   * 📲 S'abonner aux push notifications
   * ⚠️ Appeler UNIQUEMENT après action explicite de l'utilisateur (bouton, opt-in)
   */
  const subscribe = useCallback(async () => {
    if (!isSupported || !prospectId || !organizationId) {
      logger.warn('[Push] Impossible de s\'abonner:', { isSupported, prospectId, organizationId });
      return false;
    }

    try {
      setLoading(true);

      // 1. Demander la permission au navigateur
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        logger.info('[Push] Permission refusée par l\'utilisateur');
        setLoading(false);
        return false;
      }

      // 2. S'abonner via le Service Worker
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      subscriptionRef.current = subscription;
      logger.info('[Push] Souscription créée:', subscription.endpoint);

      // 3. Sauvegarder en DB via RPC
      const { data, error } = await supabase.rpc('upsert_push_subscription', {
        p_prospect_id: prospectId,
        p_organization_id: organizationId,
        p_subscription: subscription.toJSON(),
        p_device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          timestamp: new Date().toISOString(),
        },
      });

      if (error) {
        logger.error('[Push] Erreur sauvegarde souscription:', error);
        // Annuler la souscription locale si la DB échoue
        await subscription.unsubscribe();
        subscriptionRef.current = null;
        setIsSubscribed(false);
        setLoading(false);
        return false;
      }

      logger.info('[Push] Souscription sauvegardée en DB, id:', data);
      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (err) {
      logger.error('[Push] Erreur lors de l\'abonnement:', err);
      setLoading(false);
      return false;
    }
  }, [isSupported, prospectId, organizationId, urlBase64ToUint8Array]);

  /**
   * 🔕 Se désabonner des push notifications
   */
  const unsubscribe = useCallback(async () => {
    try {
      setLoading(true);

      const subscription = subscriptionRef.current;
      if (subscription) {
        // 1. Supprimer en DB
        await supabase.rpc('delete_push_subscription', {
          p_endpoint: subscription.endpoint,
        });

        // 2. Désabonner côté navigateur
        await subscription.unsubscribe();
        subscriptionRef.current = null;
      }

      setIsSubscribed(false);
      logger.info('[Push] Désabonné avec succès');
      setLoading(false);
      return true;
    } catch (err) {
      logger.error('[Push] Erreur lors du désabonnement:', err);
      setLoading(false);
      return false;
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    loading,
  };
};

export default usePushNotifications;
