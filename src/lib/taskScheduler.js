/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TASK SCHEDULER - Création automatique de tâches pour commerciaux
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Crée des tâches pour les commerciaux avec planification intelligente :
 * - Respecte les heures ouvrées (08:00-20:00)
 * - Jours ouvrés uniquement (lundi-vendredi)
 * - Timezone: Europe/Paris
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { supabase } from './supabase';

/**
 * Calcule le prochain créneau autorisé pour créer une tâche
 * @param {Date} baseDate - Date de référence (par défaut: maintenant)
 * @returns {Date} - Prochaine date autorisée
 */
export function getNextAuthorizedSlot(baseDate = new Date()) {
  // Conversion en timezone Europe/Paris
  const parisTime = new Date(baseDate.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  
  const day = parisTime.getDay(); // 0=Dimanche, 1=Lundi, ..., 6=Samedi
  const hour = parisTime.getHours();
  
  // Si week-end → prochain lundi 08:00
  if (day === 0 || day === 6) {
    const daysUntilMonday = day === 0 ? 1 : 2; // Dimanche=1 jour, Samedi=2 jours
    parisTime.setDate(parisTime.getDate() + daysUntilMonday);
    parisTime.setHours(8, 0, 0, 0);
    return parisTime;
  }
  
  // Si heure < 08:00 → aujourd'hui à 08:00
  if (hour < 8) {
    parisTime.setHours(8, 0, 0, 0);
    return parisTime;
  }
  
  // Si heure >= 20:00 → lendemain à 08:00 (ou lundi si vendredi)
  if (hour >= 20) {
    if (day === 5) {
      // Vendredi soir → lundi 08:00
      parisTime.setDate(parisTime.getDate() + 3);
    } else {
      // Autre jour → lendemain 08:00
      parisTime.setDate(parisTime.getDate() + 1);
    }
    parisTime.setHours(8, 0, 0, 0);
    return parisTime;
  }
  
  // Sinon, créneau autorisé → maintenant
  return parisTime;
}

/**
 * Crée une tâche pour le commercial après épuisement des relances
 * @param {Object} params
 * @param {string} params.prospectId - UUID du prospect
 * @param {string} params.projectType - Type de projet (ex: 'centrale')
 * @param {string} params.moduleId - ID du module (ex: 'inscription')
 * @param {string} params.formId - ID du formulaire non complété
 * @param {string} params.ownerId - UUID du commercial assigné
 * @param {number} params.reminderCount - Nombre de relances envoyées
 * @returns {Promise<{success: boolean, taskId?: string, scheduledAt?: Date, error?: string}>}
 */
export async function createTaskForUncompletedForm({
  prospectId,
  projectType,
  moduleId,
  formId,
  ownerId,
  reminderCount = 0,
}) {
  try {
    // 1. Récupérer les infos du prospect
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('first_name, last_name, email')
      .eq('id', prospectId)
      .single();
    
    if (prospectError) throw new Error(`Prospect introuvable: ${prospectError.message}`);
    
    // 2. Récupérer le nom du formulaire
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('name')
      .eq('form_id', formId)
      .single();
    
    if (formError) throw new Error(`Formulaire introuvable: ${formError.message}`);
    
    // 3. Calculer le prochain créneau autorisé
    const scheduledAt = getNextAuthorizedSlot();
    
    // 4. Créer la tâche
    const taskTitle = `Formulaire client non complété`;
    const taskDescription = `
Le client ${prospect.first_name} ${prospect.last_name} (${prospect.email}) n'a pas complété le formulaire "${form.name}" après ${reminderCount} relance(s).

📋 Module : ${moduleId}
🏷️ Projet : ${projectType}
📧 ${reminderCount} relance(s) automatique(s) envoyée(s)

Action requise : Contacter le client pour l'accompagner dans la complétion du formulaire.
    `.trim();
    
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: taskTitle,
        description: taskDescription,
        contact_id: prospectId,
        owner_id: ownerId,
        status: 'pending',
        priority: 'medium',
        due_date: scheduledAt.toISOString(),
        task_type: 'follow_up',
        metadata: {
          source: 'workflow_v2_auto',
          moduleId,
          projectType,
          formId,
          reminderCount,
          createdBy: 'system',
        },
      })
      .select()
      .single();
    
    if (taskError) throw new Error(`Erreur création tâche: ${taskError.message}`);
    
    console.log('✅ [TaskScheduler] Tâche créée:', {
      taskId: task.id,
      scheduledAt: scheduledAt.toISOString(),
      prospectId,
      ownerId,
      reminderCount,
    });
    
    return {
      success: true,
      taskId: task.id,
      scheduledAt,
    };
  } catch (error) {
    console.error('❌ [TaskScheduler] Erreur création tâche:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
