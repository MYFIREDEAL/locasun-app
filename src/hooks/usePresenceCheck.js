/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: usePresenceCheck
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Système de détection de silence client pour envoyer le message :
 * "👋 Vous êtes toujours là ?"
 * 
 * MÉCANISME :
 * 1. Surveille les messages chat en real-time (Supabase channel)
 * 2. Quand un client envoie un message → démarre un timer (30-60 min)
 * 3. Si le client ne répond pas pendant ce délai → envoie le message système
 * 4. Message envoyé UNE SEULE FOIS par panel (flag presence_message_sent)
 * 
 * ISOLATION TOTALE :
 * - N'interagit PAS avec le système de relance cron
 * - N'incrémente PAS reminder_count
 * - Ne crée PAS de tâche
 * - N'utilise PAS d'IA (message texte fixe)
 * 
 * DÉCLENCHEMENT :
 * - Via timer applicatif (setTimeout)
 * - Pas de cron
 * - Pas d'Edge Function
 * 
 * Date: 1 février 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Délai avant envoi du message "Vous êtes toujours là ?"
 * Configurable; mis à 1 minute pour tests (attention: production doit rester plus long)
 */
const PRESENCE_CHECK_DELAY_MS = 1 * 60 * 1000; // 1 minute (test)

/**
 * Message système envoyé (texte fixe, pas d'IA)
 */
const PRESENCE_MESSAGE = "👋 Vous êtes toujours là ? N'hésitez pas si vous avez des questions, je suis là pour vous aider.";

/**
 * Fenêtre horaire autorisée
 * Format: Europe/Paris
 * Note: Presence check actif 24h/24, 7j/7 
 * (le client est déjà actif sur l'app, on lui répond peu importe l'heure)
 * Contrairement au cron de relances qui respecte les horaires de bureau.
 */
const ALLOWED_HOURS = { start: 0, end: 24 }; // 24h/24
const ALLOWED_DAYS = [0, 1, 2, 3, 4, 5, 6]; // 7j/7

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si on est dans la fenêtre horaire autorisée (08:00-20:00, lun-ven)
 */
function isInAllowedTimeWindow() {
  const now = new Date();
  const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  
  const hour = parisTime.getHours();
  const day = parisTime.getDay();
  
  return (
    ALLOWED_DAYS.includes(day) &&
    hour >= ALLOWED_HOURS.start &&
    hour < ALLOWED_HOURS.end
  );
}

/**
 * Calcule le délai restant jusqu'à la prochaine fenêtre autorisée
 * (pour reporter l'envoi si on est hors fenêtre)
 */
function getDelayUntilNextAllowedWindow() {
  const now = new Date();
  const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  
  const hour = parisTime.getHours();
  const day = parisTime.getDay();
  
  // Si avant 08:00 aujourd'hui (jour ouvré)
  if (ALLOWED_DAYS.includes(day) && hour < ALLOWED_HOURS.start) {
    const nextStart = new Date(parisTime);
    nextStart.setHours(ALLOWED_HOURS.start, 0, 0, 0);
    return nextStart.getTime() - parisTime.getTime();
  }
  
  // Si après 20:00 ou weekend → attendre lundi 08:00
  let daysToAdd = 1;
  let targetDay = (day + 1) % 7;
  
  while (!ALLOWED_DAYS.includes(targetDay)) {
    daysToAdd++;
    targetDay = (targetDay + 1) % 7;
  }
  
  const nextStart = new Date(parisTime);
  nextStart.setDate(nextStart.getDate() + daysToAdd);
  nextStart.setHours(ALLOWED_HOURS.start, 0, 0, 0);
  
  return nextStart.getTime() - parisTime.getTime();
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook pour surveiller l'activité client et envoyer "Vous êtes toujours là ?"
 * 
 * @param {string} organizationId - ID de l'organisation pour filtrage multi-tenant
 * @param {boolean} enabled - Activer/désactiver le hook
 * @returns {void}
 * 
 * @example
 * // Dans App.jsx
 * usePresenceCheck(organizationId, true);
 */
export function usePresenceCheck(organizationId, enabled = false) {
  // Map des timers actifs par panel_id
  const timersRef = useRef(new Map());
  
  // Set des panels déjà traités (évite re-traitement après reconnexion)
  const processedPanelsRef = useRef(new Set());
  
  /**
   * Envoie le message système "Vous êtes toujours là ?"
   */
  const sendPresenceMessage = useCallback(async (prospectId, projectType, panelId) => {
    try {
      logger.info('👋 [PresenceCheck] Envoi message présence', { prospectId, projectType, panelId });
      
      // 1. Vérifier que le panel existe toujours et est pending
      const { data: panel, error: panelError } = await supabase
        .from('client_form_panels')
        .select('panel_id, status, presence_message_sent')
        .eq('panel_id', panelId)
        .single();
      
      if (panelError || !panel) {
        logger.warn('[PresenceCheck] Panel introuvable', { panelId, error: panelError });
        return;
      }
      
      // 2. Vérifier les conditions
      if (panel.status !== 'pending') {
        logger.debug('[PresenceCheck] Panel non pending, skip', { panelId, status: panel.status });
        return;
      }
      
      if (panel.presence_message_sent === true) {
        logger.debug('[PresenceCheck] Message déjà envoyé, skip', { panelId });
        return;
      }
      
      // 3. Vérifier fenêtre horaire
      if (!isInAllowedTimeWindow()) {
        logger.debug('[PresenceCheck] Hors fenêtre horaire, report', { panelId });
        // Reporter à la prochaine fenêtre
        const delay = getDelayUntilNextAllowedWindow();
        const timerId = setTimeout(() => {
          sendPresenceMessage(prospectId, projectType, panelId);
        }, delay);
        timersRef.current.set(panelId, timerId);
        return;
      }
      
      // 4. Envoyer le message système
      // Colonnes valides: prospect_id, project_type, sender, text, organization_id
      // Contrainte sender: only 'client', 'admin', 'pro'
      // Astuce: on reste sur sender='admin' pour respecter la contrainte, mais on marque
      // clairement le message comme "presence_check" pour l'ignorer dans les relances.
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          prospect_id: prospectId,
          project_type: projectType,
          sender: 'admin',
          text: PRESENCE_MESSAGE,
          metadata: {
            type: 'presence_check',
            automated: true,
            panel_id: panelId,
          },
        });
      
      if (messageError) {
        logger.error('[PresenceCheck] Erreur envoi message', { panelId, error: messageError });
        return;
      }
      
      // 5. Marquer le flag presence_message_sent = true
      const { error: updateError } = await supabase
        .from('client_form_panels')
        .update({ presence_message_sent: true })
        .eq('panel_id', panelId);
      
      if (updateError) {
        logger.error('[PresenceCheck] Erreur update flag', { panelId, error: updateError });
        return;
      }
      
      logger.info('✅ [PresenceCheck] Message envoyé avec succès', { panelId });
      processedPanelsRef.current.add(panelId);
      
    } catch (error) {
      logger.error('[PresenceCheck] Erreur inattendue', { panelId, error });
    }
  }, []);
  
  /**
   * Démarre un timer pour un panel donné
   */
  const startTimer = useCallback((prospectId, projectType, panelId, delayMs = PRESENCE_CHECK_DELAY_MS) => {
    // Annuler timer existant si présent
    if (timersRef.current.has(panelId)) {
      clearTimeout(timersRef.current.get(panelId));
    }
    
    // Ignorer si déjà traité
    if (processedPanelsRef.current.has(panelId)) {
      return;
    }
    
  logger.debug('[PresenceCheck] Timer démarré', { panelId, delayMs });
    
    const timerId = setTimeout(() => {
      sendPresenceMessage(prospectId, projectType, panelId);
      timersRef.current.delete(panelId);
    }, delayMs);
    
    timersRef.current.set(panelId, timerId);
  }, [sendPresenceMessage]);
  
  /**
   * Annule un timer pour un panel donné (client a répondu)
   */
  const cancelTimer = useCallback((panelId) => {
    if (timersRef.current.has(panelId)) {
      clearTimeout(timersRef.current.get(panelId));
      timersRef.current.delete(panelId);
      logger.debug('[PresenceCheck] Timer annulé (client actif)', { panelId });
    }
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // EFFET PRINCIPAL : Surveillance real-time
  // ─────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (!enabled || !organizationId) {
      logger.debug('[PresenceCheck] Hook désactivé');
      return;
    }
    
    logger.info('👀 [PresenceCheck] Activation surveillance activité client');
    
    // ───────────────────────────────────────────────────────────────────────
    // CANAL 1 : Écoute des messages chat
    // - Message ADMIN → démarrer timer (attente réponse client)
    // - Message CLIENT → reset timer (client actif)
    // ───────────────────────────────────────────────────────────────────────
    
    const chatChannel = supabase
      .channel(`presence-check-chat-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `organization_id=eq.${organizationId}`
        },
        async (payload) => {
          const message = payload.new;
          
          // ─────────────────────────────────────────────────────────────────
          // CAS 1 : Message ADMIN/PRO → Démarrer timer SI client a déjà interagi
          // ⚠️ Ignorer les messages de présence automatiques pour éviter les boucles
          // ─────────────────────────────────────────────────────────────────
          if (message.sender === 'admin' || message.sender === 'pro') {
            if (message.metadata?.type === 'presence_check' || message.text === PRESENCE_MESSAGE) {
              logger.debug('[PresenceCheck] Ignore message présence auto', {
                prospectId: message.prospect_id,
                projectType: message.project_type,
              });
              return;
            }
            // Vérifier si le client a déjà envoyé au moins 1 message
            const { data: clientMessages, error: clientError } = await supabase
              .from('chat_messages')
              .select('id')
              .eq('prospect_id', message.prospect_id)
              .eq('project_type', message.project_type)
              .eq('sender', 'client')
              .limit(1);
            
            if (clientError || !clientMessages || clientMessages.length === 0) {
              // Client n'a JAMAIS répondu → pas de timer, relances cron uniquement
              logger.debug('[PresenceCheck] Client jamais interagi, pas de timer', {
                prospectId: message.prospect_id,
                projectType: message.project_type,
              });
              return;
            }
            
            logger.debug('[PresenceCheck] Message admin/pro détecté, client a déjà interagi, démarrage timer', {
              prospectId: message.prospect_id,
              projectType: message.project_type,
              sender: message.sender,
            });
            
            // Trouver les panels pending pour ce prospect/projectType
            const { data: panels, error } = await supabase
              .from('client_form_panels')
              .select('panel_id, prospect_id, project_type, presence_message_sent')
              .eq('prospect_id', message.prospect_id)
              .eq('project_type', message.project_type)
              .eq('status', 'pending');
            
            if (error || !panels || panels.length === 0) {
              return;
            }
            
            // Pour chaque panel : démarrer/redémarrer timer
            for (const panel of panels) {
              // Ne pas relancer si un message présence a déjà été envoyé pour ce panel
              if (panel.presence_message_sent) {
                logger.debug('[PresenceCheck] Panel déjà notifié, pas de nouveau timer', { panelId: panel.panel_id });
                continue;
              }
              // Démarrer timer
              startTimer(
                panel.prospect_id,
                panel.project_type,
                panel.panel_id
              );
            }
            return;
          }
          
          // ─────────────────────────────────────────────────────────────────
          // CAS 2 : Message CLIENT → Annuler timer (client actif)
          // ─────────────────────────────────────────────────────────────────
          if (message.sender !== 'client') {
            return;
          }
          
          logger.debug('[PresenceCheck] Message client détecté', {
            prospectId: message.prospect_id,
            projectType: message.project_type,
          });
          
          // Trouver les panels pending pour ce prospect/projectType
          // Note: On cherche TOUS les panels (pas seulement presence_message_sent=false)
          // car on veut reset le flag quand le client répond
          const { data: panels, error } = await supabase
            .from('client_form_panels')
            .select('panel_id, prospect_id, project_type, presence_message_sent')
            .eq('prospect_id', message.prospect_id)
            .eq('project_type', message.project_type)
            .eq('status', 'pending');
          
          if (error || !panels || panels.length === 0) {
            return;
          }
          
          // Pour chaque panel : annuler timer + reset flag (le prochain message admin relancera)
          for (const panel of panels) {
            // Annuler le timer existant (client a répondu)
            cancelTimer(panel.panel_id);
            
            // Retirer du set local pour permettre nouveau message
            processedPanelsRef.current.delete(panel.panel_id);
            
            // Reset le flag en DB pour permettre un nouveau message après silence
            await supabase
              .from('client_form_panels')
              .update({ presence_message_sent: false })
              .eq('panel_id', panel.panel_id);
            
            logger.debug('[PresenceCheck] Timer reset après réponse client', { panelId: panel.panel_id });
          }
        }
      )
      .subscribe();
    
    // ───────────────────────────────────────────────────────────────────────
    // CANAL 2 : Écoute des panels (nouveaux panels = démarrer timer)
    // ───────────────────────────────────────────────────────────────────────
    
    const panelChannel = supabase
      .channel(`presence-check-panels-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_form_panels',
          filter: `organization_id=eq.${organizationId}`
        },
        async (payload) => {
          const panel = payload.new;
          
          // Ignorer si pas pending
          if (panel.status !== 'pending') {
            return;
          }
          
          logger.debug('[PresenceCheck] Nouveau panel détecté', { panelId: panel.panel_id });
          
          // Récupérer le dernier message pour savoir qui doit répondre
          const { data: lastMessages, error: lastError } = await supabase
            .from('chat_messages')
            .select('sender, created_at')
            .eq('prospect_id', panel.prospect_id)
            .eq('project_type', panel.project_type)
            .order('created_at', { ascending: false })
            .limit(1);

          if (lastError || !lastMessages || lastMessages.length === 0) {
            logger.debug('[PresenceCheck] Panel créé sans historique, pas de timer', { panelId: panel.panel_id });
            return;
          }

          const lastMessage = lastMessages[0];
          if (lastMessage.sender === 'client') {
            logger.debug('[PresenceCheck] Dernier message client, on attend un message admin avant timer', { panelId: panel.panel_id });
            return;
          }

          // Démarrer le timer basé sur le dernier message admin/pro
          const lastMessageAt = new Date(lastMessage.created_at);
          const now = new Date();
          const silenceMs = now.getTime() - lastMessageAt.getTime();
          const remainingMs = Math.max(PRESENCE_CHECK_DELAY_MS - silenceMs, 0);

          if (remainingMs === 0) {
            sendPresenceMessage(panel.prospect_id, panel.project_type, panel.panel_id);
          } else {
            startTimer(
              panel.prospect_id,
              panel.project_type,
              panel.panel_id,
              remainingMs
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_form_panels',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          const panel = payload.new;
          
          // Si le panel n'est plus pending → annuler le timer
          if (panel.status !== 'pending') {
            cancelTimer(panel.panel_id);
            logger.debug('[PresenceCheck] Panel terminé, timer annulé', { panelId: panel.panel_id });
          }
        }
      )
      .subscribe();
    
    // ───────────────────────────────────────────────────────────────────────
    // INITIALISATION : Charger les panels existants en pending
    // ───────────────────────────────────────────────────────────────────────
    
    const initExistingPanels = async () => {
      const { data: panels, error } = await supabase
        .from('client_form_panels')
  .select('panel_id, prospect_id, project_type, presence_message_sent')
        .eq('status', 'pending')
        .eq('presence_message_sent', false);
      
      if (error || !panels) {
        logger.error('[PresenceCheck] Erreur chargement panels existants', { error });
        return;
      }
      
      logger.info(`[PresenceCheck] ${panels.length} panels pending à surveiller`);
      
      for (const panel of panels) {
        // On agit seulement si le dernier message est admin/pro (on attend une réponse client)
        const { data: lastMessages } = await supabase
          .from('chat_messages')
          .select('sender, created_at')
          .eq('prospect_id', panel.prospect_id)
          .eq('project_type', panel.project_type)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!lastMessages || lastMessages.length === 0) {
          logger.debug('[PresenceCheck] Panel pending sans messages, skip timer', { panelId: panel.panel_id });
          continue;
        }

        const lastMessage = lastMessages[0];
        if (lastMessage.sender !== 'admin' && lastMessage.sender !== 'pro') {
          logger.debug('[PresenceCheck] Dernier message côté client, pas de timer', { panelId: panel.panel_id });
          continue;
        }

        const lastMessageAt = new Date(lastMessage.created_at);
        const now = new Date();
        const silenceMs = now.getTime() - lastMessageAt.getTime();
        const remainingMs = Math.max(PRESENCE_CHECK_DELAY_MS - silenceMs, 0);

        if (remainingMs === 0) {
          sendPresenceMessage(panel.prospect_id, panel.project_type, panel.panel_id);
        } else {
          startTimer(
            panel.prospect_id,
            panel.project_type,
            panel.panel_id,
            remainingMs
          );
        }
      }
    };
    
    initExistingPanels();
    
    // ───────────────────────────────────────────────────────────────────────
    // CLEANUP
    // ───────────────────────────────────────────────────────────────────────
    
    return () => {
      logger.debug('[PresenceCheck] Nettoyage');
      
      // Supprimer tous les timers
      for (const [panelId, timerId] of timersRef.current.entries()) {
        clearTimeout(timerId);
      }
      timersRef.current.clear();
      
      // Fermer les channels
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(panelChannel);
    };
  }, [enabled, organizationId, startTimer, cancelTimer, sendPresenceMessage]);
}

export default usePresenceCheck;
