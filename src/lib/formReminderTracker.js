/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FORM REMINDER TRACKER - Suivi des relances automatiques
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Gère le compteur de relances pour les formulaires non validés
 * et déclenche la création de tâche après X relances
 * 
 * ⚠️ À APPELER depuis un système de cron/scheduler (pas encore implémenté)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { supabase } from './supabase';
import { createTaskForUncompletedForm } from './taskScheduler';
import { getModuleActionConfig } from './moduleAIConfig';

/**
 * Vérifie si un formulaire nécessite une relance ou création de tâche
 * 
 * @param {Object} params
 * @param {string} params.prospectId - UUID du prospect
 * @param {string} params.projectType - Type de projet
 * @param {string} params.moduleId - ID du module
 * @param {string} params.formId - ID du formulaire
 * @param {number} params.currentReminderCount - Nombre de relances déjà envoyées
 * @returns {Promise<{shouldSendReminder: boolean, shouldCreateTask: boolean, taskCreated: boolean}>}
 */
export async function checkFormReminderStatus({
  prospectId,
  projectType,
  moduleId,
  formId,
  currentReminderCount = 0,
}) {
  try {
    // 1. Récupérer la config du module pour connaître le seuil
    const actionConfig = getModuleActionConfig(moduleId);
    const maxReminders = actionConfig.reminderConfig?.maxRemindersBeforeTask || 3;
    const reminderEnabled = actionConfig.reminderConfig?.enabled || false;

    if (!reminderEnabled) {
      console.log('⚠️ [FormReminder] Relances désactivées pour ce module', { moduleId });
      return {
        shouldSendReminder: false,
        shouldCreateTask: false,
        taskCreated: false,
      };
    }

    // 2. Vérifier si le seuil de relances est atteint
    if (currentReminderCount >= maxReminders) {
      console.log('📋 [FormReminder] Seuil atteint → Création de tâche', {
        prospectId,
        moduleId,
        currentReminderCount,
        maxReminders,
      });

      // 3. Récupérer le owner_id du prospect
      const { data: prospect, error: prospectError } = await supabase
        .from('prospects')
        .select('owner_id')
        .eq('id', prospectId)
        .single();

      if (prospectError || !prospect?.owner_id) {
        console.error('❌ [FormReminder] Prospect ou owner_id introuvable:', prospectError);
        return {
          shouldSendReminder: false,
          shouldCreateTask: false,
          taskCreated: false,
        };
      }

      // 4. Créer la tâche pour le commercial
      const taskResult = await createTaskForUncompletedForm({
        prospectId,
        projectType,
        moduleId,
        formId,
        ownerId: prospect.owner_id,
        reminderCount: currentReminderCount,
      });

      if (taskResult.success) {
        console.log('✅ [FormReminder] Tâche créée avec succès', {
          taskId: taskResult.taskId,
          scheduledAt: taskResult.scheduledAt,
        });

        return {
          shouldSendReminder: false, // Plus de relances automatiques
          shouldCreateTask: true,
          taskCreated: true,
        };
      } else {
        console.error('❌ [FormReminder] Échec création tâche:', taskResult.error);
        return {
          shouldSendReminder: false,
          shouldCreateTask: true,
          taskCreated: false,
        };
      }
    }

    // 5. Seuil non atteint → autoriser l'envoi de relance
    console.log('📧 [FormReminder] Relance autorisée', {
      prospectId,
      moduleId,
      currentReminderCount,
      maxReminders,
      remaining: maxReminders - currentReminderCount,
    });

    return {
      shouldSendReminder: true,
      shouldCreateTask: false,
      taskCreated: false,
    };
  } catch (error) {
    console.error('❌ [FormReminder] Erreur dans checkFormReminderStatus:', error);
    return {
      shouldSendReminder: false,
      shouldCreateTask: false,
      taskCreated: false,
    };
  }
}

/**
 * Fonction utilitaire pour incrémenter le compteur de relances
 * ⚠️ À appeler APRÈS l'envoi effectif d'un message de relance
 * 
 * @param {Object} tracking - Objet de tracking à stocker (structure libre selon implémentation future)
 * @returns {Promise<void>}
 */
export async function incrementReminderCount(tracking) {
  // TODO: Implémenter le stockage du compteur de relances
  // Options possibles:
  // 1. Table dédiée: `form_reminder_tracking` (prospect_id, module_id, form_id, reminder_count, last_reminder_at)
  // 2. JSONB dans `prospects.metadata`
  // 3. Table `client_form_panels` avec colonne `reminder_count`
  
  console.log('⏭️ [FormReminder] incrementReminderCount - À implémenter', tracking);
}

/**
 * Réinitialise le compteur de relances (quand formulaire validé)
 * 
 * @param {Object} params
 * @param {string} params.prospectId
 * @param {string} params.moduleId
 * @param {string} params.formId
 * @returns {Promise<void>}
 */
export async function resetReminderCount({ prospectId, moduleId, formId }) {
  // TODO: Réinitialiser le compteur dans le système de tracking
  console.log('♻️ [FormReminder] resetReminderCount - À implémenter', {
    prospectId,
    moduleId,
    formId,
  });
}
