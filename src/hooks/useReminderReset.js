/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: useReminderReset
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Système d'annulation automatique des relances quand le client répond.
 * 
 * MÉCANISME :
 * 1. Surveille les messages chat en real-time (Supabase channel)
 * 2. Quand un client envoie un message → reset des compteurs de relance
 * 3. Les relances futures sont "annulées" (reminder_count = 0)
 * 4. Le cron de relances reprendra le cycle depuis le début
 * 
 * CE QUI EST RESET :
 * - reminder_count → 0 (compteur remis à zéro)
 * - last_reminder_at → now() (force le délai complet avant prochaine relance)
 * - presence_message_sent → false (permet un nouveau message de présence)
 * 
 * CE QUI N'EST PAS TOUCHÉ :
 * - task_created (si une tâche a été créée, elle reste)
 * - auto_reminder_enabled (la config reste active)
 * - reminder_delay_days / max_reminders_before_task (config préservée)
 * 
 * COMPORTEMENT CRON APRÈS RESET :
 * - Le cron verra reminder_count = 0 et last_reminder_at = "maintenant"
 * - Il attendra reminder_delay_days avant d'envoyer la prochaine relance
 * - Si le client ne répond plus, le cycle reprend normalement
 * - Le seuil max_reminders_before_task peut toujours être atteint
 * 
 * Date: 1 février 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// ─────────────────────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook pour reset automatique des relances quand le client répond
 * 
 * @param {boolean} enabled - Activer/désactiver le hook
 * @returns {void}
 * 
 * @example
 * // Dans App.jsx
 * useReminderReset(true);
 */
export function useReminderReset(enabled = false) {
  // Set des messages déjà traités (évite double-traitement)
  const processedMessagesRef = useRef(new Set());
  
  /**
   * Reset les compteurs de relance pour tous les panels pending d'un prospect/projectType
   */
  const resetRemindersForProspect = useCallback(async (prospectId, projectType, messageId) => {
    try {
      // Éviter double-traitement
      if (processedMessagesRef.current.has(messageId)) {
        return;
      }
      processedMessagesRef.current.add(messageId);
      
      // Limiter la taille du set (éviter fuite mémoire)
      if (processedMessagesRef.current.size > 1000) {
        const entries = Array.from(processedMessagesRef.current);
        processedMessagesRef.current = new Set(entries.slice(-500));
      }
      
      logger.info('🔄 [ReminderReset] Message client détecté, reset des relances', {
        prospectId,
        projectType,
        messageId,
      });
      
      // 1. Trouver tous les panels pending pour ce prospect/projectType
      const { data: panels, error: fetchError } = await supabase
        .from('client_form_panels')
        .select('panel_id, reminder_count, task_created')
        .eq('prospect_id', prospectId)
        .eq('project_type', projectType)
        .eq('status', 'pending')
        .eq('task_created', false); // Ne pas toucher aux panels avec tâche créée
      
      if (fetchError) {
        logger.error('[ReminderReset] Erreur fetch panels', { error: fetchError });
        return;
      }
      
      if (!panels || panels.length === 0) {
        logger.debug('[ReminderReset] Aucun panel pending à reset', { prospectId, projectType });
        return;
      }
      
      // 2. Filtrer les panels qui ont déjà reçu des relances
      const panelsToReset = panels.filter(p => p.reminder_count > 0);
      
      if (panelsToReset.length === 0) {
        logger.debug('[ReminderReset] Aucun panel avec relances à reset', { prospectId, projectType });
        
        // Reset uniquement last_reminder_at pour forcer délai complet
        // ⚠️ NE PAS reset presence_message_sent (sinon spam "Vous êtes toujours là ?")
        const panelIds = panels.map(p => p.panel_id);
        await supabase
          .from('client_form_panels')
          .update({
            last_reminder_at: new Date().toISOString(), // Force délai complet
          })
          .in('panel_id', panelIds);
        
        return;
      }
      
      // 3. Reset les compteurs pour tous les panels concernés
      const panelIds = panelsToReset.map(p => p.panel_id);
      
      const { error: updateError } = await supabase
        .from('client_form_panels')
        .update({
          reminder_count: 0,                          // ✅ Reset compteur
          last_reminder_at: new Date().toISOString(), // ✅ Force délai complet avant prochaine relance
          // ⚠️ NE PAS reset presence_message_sent (sinon spam "Vous êtes toujours là ?")
        })
        .in('panel_id', panelIds);
      
      if (updateError) {
        logger.error('[ReminderReset] Erreur update panels', { error: updateError });
        return;
      }
      
      logger.info('✅ [ReminderReset] Relances reset avec succès', {
        prospectId,
        projectType,
        panelsReset: panelIds.length,
        panelIds,
        previousCounts: panelsToReset.map(p => ({ panelId: p.panel_id, count: p.reminder_count })),
      });
      
    } catch (error) {
      logger.error('[ReminderReset] Erreur inattendue', { error });
    }
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────
  // EFFET PRINCIPAL : Surveillance real-time
  // ─────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (!enabled) {
      logger.debug('[ReminderReset] Hook désactivé');
      return;
    }
    
    logger.info('🔔 [ReminderReset] Activation surveillance messages client');
    
    // Écoute des nouveaux messages chat
    const channel = supabase
      .channel('reminder-reset-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const message = payload.new;
          
          // ⚠️ UNIQUEMENT les messages client
          if (message.sender !== 'client') {
            return;
          }
          
          // Reset les relances pour ce prospect/projectType
          await resetRemindersForProspect(
            message.prospect_id,
            message.project_type,
            message.id
          );
        }
      )
      .subscribe();
    
    // ─────────────────────────────────────────────────────────────────────────
    // CLEANUP
    // ─────────────────────────────────────────────────────────────────────────
    
    return () => {
      logger.debug('[ReminderReset] Nettoyage');
      supabase.removeChannel(channel);
    };
  }, [enabled, resetRemindersForProspect]);
}

export default useReminderReset;
