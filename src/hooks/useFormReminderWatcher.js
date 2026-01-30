/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FORM REMINDER WATCHER - Hook pour création de tâche après relances
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Surveille les formulaires clients non validés et crée une tâche pour le
 * commercial après X relances consommées.
 * 
 * ⚠️ S'intègre avec le système de relances existant
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { createTaskForUncompletedForm } from '@/lib/taskScheduler';
import { getModuleActionConfig } from '@/lib/moduleAIConfig';
import { logger } from '@/lib/logger';

/**
 * Hook pour surveiller les relances et créer des tâches
 * 
 * ⚠️ À activer dans App.jsx une fois le système de relances en place
 * 
 * @param {boolean} enabled - Activer le watcher
 */
export function useFormReminderWatcher(enabled = false) {
  const processedRef = useRef(new Set());

  useEffect(() => {
    if (!enabled) {
      logger.debug('[FormReminderWatcher] Désactivé');
      return;
    }

    logger.info('🔔 [FormReminderWatcher] Activation du watcher');

    // Écouter les mises à jour sur client_form_panels
    const channel = supabase
      .channel('form-reminder-watcher')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_form_panels',
        },
        async (payload) => {
          try {
            const panel = payload.new;
            
            // Ignorer si déjà validé
            if (panel.status === 'approved') {
              return;
            }
            
            // Ignorer si déjà traité
            const trackingKey = `${panel.prospect_id}-${panel.form_id}-${panel.reminder_count}`;
            if (processedRef.current.has(trackingKey)) {
              return;
            }
            
            // Récupérer reminder_count depuis les metadata
            const reminderCount = panel.metadata?.reminder_count || 0;
            
            if (reminderCount === 0) {
              return; // Pas encore de relance
            }
            
            // Récupérer la config du module pour le seuil
            const moduleId = panel.metadata?.module_id;
            if (!moduleId) {
              logger.warn('[FormReminderWatcher] Module ID manquant', { panel_id: panel.panel_id });
              return;
            }
            
            const actionConfig = getModuleActionConfig(moduleId);
            const maxReminders = actionConfig.reminderConfig?.maxRemindersBeforeTask || 3;
            
            // Vérifier si le seuil est atteint
            if (reminderCount >= maxReminders) {
              logger.info('📋 [FormReminderWatcher] Seuil atteint → Création de tâche', {
                prospect_id: panel.prospect_id,
                form_id: panel.form_id,
                reminder_count: reminderCount,
                max_reminders: maxReminders,
              });
              
              // Récupérer owner_id du prospect
              const { data: prospect, error: prospectError } = await supabase
                .from('prospects')
                .select('owner_id')
                .eq('id', panel.prospect_id)
                .single();
              
              if (prospectError || !prospect?.owner_id) {
                logger.error('[FormReminderWatcher] Owner ID introuvable', { error: prospectError });
                return;
              }
              
              // Créer la tâche
              const result = await createTaskForUncompletedForm({
                prospectId: panel.prospect_id,
                projectType: panel.project_type,
                moduleId,
                formId: panel.form_id,
                ownerId: prospect.owner_id,
                reminderCount,
              });
              
              if (result.success) {
                logger.info('✅ [FormReminderWatcher] Tâche créée avec succès', {
                  task_id: result.taskId,
                  scheduled_at: result.scheduledAt,
                });
                
                // Marquer comme traité
                processedRef.current.add(trackingKey);
                
                // Optionnel: Marquer le panel pour bloquer nouvelles relances
                await supabase
                  .from('client_form_panels')
                  .update({
                    metadata: {
                      ...panel.metadata,
                      task_created: true,
                      task_created_at: new Date().toISOString(),
                      task_id: result.taskId,
                    },
                  })
                  .eq('panel_id', panel.panel_id);
              } else {
                logger.error('[FormReminderWatcher] Échec création tâche', { error: result.error });
              }
            } else {
              logger.debug('[FormReminderWatcher] Seuil non atteint', {
                reminder_count: reminderCount,
                max_reminders: maxReminders,
                remaining: maxReminders - reminderCount,
              });
            }
          } catch (error) {
            logger.error('[FormReminderWatcher] Erreur dans le watcher', { error });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      logger.debug('[FormReminderWatcher] Channel fermé');
    };
  }, [enabled]);
}
