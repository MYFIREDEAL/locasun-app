/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: useSupabaseFormReminder
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Gère la persistance de la config de relance dans client_form_panels.
 * 
 * WORKFLOW EVATIME:
 * - Admin configure relances dans ModuleConfigTab (Workflow V2)
 * - Lors de l'envoi du formulaire → copie config dans client_form_panels
 * - Edge Function cron utilise ces données pour envoyer les relances
 * 
 * Date: 30 janvier 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Hook pour gérer les configs de relance des formulaires clients
 */
export function useSupabaseFormReminder() {

  /**
   * Sauvegarde la config de relance lors de la création d'un formulaire
   * 
   * @param {string} panelId - ID unique du panel
   * @param {Object} reminderConfig - Config depuis moduleAIConfig
   * @param {boolean} reminderConfig.enabled - Relances activées ?
   * @param {number} reminderConfig.delayDays - Délai entre relances (1-4)
   * @param {number} reminderConfig.maxRemindersBeforeTask - Seuil de relances (1-5)
   * @returns {Object} { success, error }
   */
  const saveReminderConfig = useCallback(async (panelId, reminderConfig) => {
    if (!panelId) {
      return { success: false, error: 'Panel ID manquant' };
    }

    try {
      // Extraire les valeurs avec fallbacks
      const enabled = reminderConfig?.enabled ?? false;
      const delayDays = reminderConfig?.delayDays ?? 1;
      const maxReminders = reminderConfig?.maxRemindersBeforeTask ?? 3;

      // Validation
      if (delayDays < 1 || delayDays > 4) {
        throw new Error('delayDays doit être entre 1 et 4');
      }
      if (maxReminders < 1 || maxReminders > 5) {
        throw new Error('maxRemindersBeforeTask doit être entre 1 et 5');
      }

      const { error: updateError } = await supabase
        .from('client_form_panels')
        .update({
          auto_reminder_enabled: enabled,
          reminder_delay_days: delayDays,
          max_reminders_before_task: maxReminders,
          reminder_count: 0, // Reset au départ
          last_reminder_at: null,
          task_created: false,
        })
        .eq('panel_id', panelId);

      if (updateError) throw updateError;

      logger.info('[FormReminder] Config sauvegardée', { 
        panelId, 
        enabled, 
        delayDays, 
        maxReminders 
      });

      return { success: true };

    } catch (err) {
      logger.error('[FormReminder] Erreur save config:', { 
        panelId, 
        error: err.message 
      });
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Incrémente le compteur de relances (appelé par Edge Function)
   * 
   * @param {string} panelId - ID du panel
   * @returns {Object} { success, newCount, error }
   */
  const incrementReminderCount = useCallback(async (panelId) => {
    if (!panelId) {
      return { success: false, error: 'Panel ID manquant' };
    }

    try {
      // Récupérer l'état actuel
      const { data: panel, error: fetchError } = await supabase
        .from('client_form_panels')
        .select('reminder_count, max_reminders_before_task')
        .eq('panel_id', panelId)
        .single();

      if (fetchError) throw fetchError;

      const newCount = (panel.reminder_count || 0) + 1;

      // Mise à jour
      const { error: updateError } = await supabase
        .from('client_form_panels')
        .update({
          reminder_count: newCount,
          last_reminder_at: new Date().toISOString(),
        })
        .eq('panel_id', panelId);

      if (updateError) throw updateError;

      logger.info('[FormReminder] Compteur incrémenté', { 
        panelId, 
        newCount,
        maxReminders: panel.max_reminders_before_task,
      });

      return { 
        success: true, 
        newCount,
        shouldCreateTask: newCount >= panel.max_reminders_before_task,
      };

    } catch (err) {
      logger.error('[FormReminder] Erreur incrément:', { 
        panelId, 
        error: err.message 
      });
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Marque qu'une tâche a été créée (bloque futures relances)
   * 
   * @param {string} panelId - ID du panel
   * @returns {Object} { success, error }
   */
  const markTaskCreated = useCallback(async (panelId) => {
    if (!panelId) {
      return { success: false, error: 'Panel ID manquant' };
    }

    try {
      const { error: updateError } = await supabase
        .from('client_form_panels')
        .update({ task_created: true })
        .eq('panel_id', panelId);

      if (updateError) throw updateError;

      logger.info('[FormReminder] Tâche marquée créée', { panelId });

      return { success: true };

    } catch (err) {
      logger.error('[FormReminder] Erreur mark task:', { 
        panelId, 
        error: err.message 
      });
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Récupère la config de relance d'un panel
   * 
   * @param {string} panelId - ID du panel
   * @returns {Object} { success, config, error }
   */
  const getReminderConfig = useCallback(async (panelId) => {
    if (!panelId) {
      return { success: false, error: 'Panel ID manquant' };
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('client_form_panels')
        .select(`
          auto_reminder_enabled,
          reminder_delay_days,
          max_reminders_before_task,
          reminder_count,
          last_reminder_at,
          task_created
        `)
        .eq('panel_id', panelId)
        .single();

      if (fetchError) throw fetchError;

      return {
        success: true,
        config: {
          enabled: data.auto_reminder_enabled,
          delayDays: data.reminder_delay_days,
          maxRemindersBeforeTask: data.max_reminders_before_task,
          count: data.reminder_count,
          lastReminderAt: data.last_reminder_at,
          taskCreated: data.task_created,
        },
      };

    } catch (err) {
      logger.error('[FormReminder] Erreur get config:', { 
        panelId, 
        error: err.message 
      });
      return { success: false, error: err.message };
    }
  }, []);

  return {
    saveReminderConfig,
    incrementReminderCount,
    markTaskCreated,
    getReminderConfig,
  };
}

export default useSupabaseFormReminder;
