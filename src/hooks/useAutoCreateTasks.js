import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook pour créer automatiquement des tâches quand une étape devient "in_progress"
 * Basé sur la configuration des prompts (managementMode: "manual" + createTask: true)
 * @param {string} organizationId - ID de l'organisation pour filtrage multi-tenant
 * @param {Object} prompts - Configuration des prompts
 * @param {boolean} enabled - Activer/désactiver le hook
 */
export function useAutoCreateTasks(organizationId, prompts, enabled = true) {
  useEffect(() => {
    if (!enabled || !organizationId) {
      return;
    }
    if (!prompts || Object.keys(prompts).length === 0) {
      return;
    }

    logger.debug('🔔 useAutoCreateTasks: Setting up subscription');

    // Écouter les changements dans project_steps_status
    const channel = supabase
      .channel(`auto-create-tasks-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_steps_status',
          filter: `organization_id=eq.${organizationId}`
        },
        async (payload) => {
          try {
            const { prospect_id, project_type, steps } = payload.new;
            
            // Trouver l'étape qui vient de passer en "in_progress"
            const currentStepIndex = steps.findIndex(step => step.status === 'in_progress');
            if (currentStepIndex === -1) return;

            logger.debug('Step changed to in_progress', {
              prospect_id,
              project_type,
              currentStepIndex
            });

            // Récupérer le prompt pour ce projet
            const prompt = Object.values(prompts).find(p => p.projectId === project_type);
            if (!prompt) {
              logger.debug('No prompt found for project', { project_type });
              return;
            }

            // Récupérer la config pour cette étape
            const stepConfig = prompt.stepsConfig?.[currentStepIndex];
            if (!stepConfig) {
              logger.debug('No config for step', { currentStepIndex });
              return;
            }

            // Récupérer le prospect une seule fois pour toutes les actions
            const { data: prospect, error: prospectError } = await supabase
              .from('prospects')
              .select('owner_id, name')
              .eq('id', prospect_id)
              .single();

            if (prospectError) {
              logger.error('Error fetching prospect', { error: prospectError });
              return;
            }

            // Parcourir les actions de cette étape
            for (const action of stepConfig.actions || []) {
              // CAS 1: Action sans client (checklist) → Créer tâche avec checklist
              if (action.hasClientAction === false) {
                logger.debug('Creating checklist task', {
                  prospect_id,
                  project_type,
                  currentStepIndex,
                  actionId: action.id
                });

                const checklistText = (action.checklist || [])
                  .map(item => `☐ ${item.text}`)
                  .join('\n');

                const taskTime = calculateTaskCreationTime(new Date());
                const endTime = new Date(taskTime);
                endTime.setMinutes(endTime.getMinutes() + 30);

                await createTask({
                  prospect,
                  prospect_id,
                  project_type,
                  stepName: steps[currentStepIndex].name,
                  title: `Tâche pour ${prospect.name}`,
                  notes: checklistText || 'Tâches à effectuer',
                  taskTime,
                  endTime
                });

                continue;
              }

              // CAS 2: Action avec client + Mode Commercial → Créer tâche
              if (action.hasClientAction !== false && action.managementMode === 'manual' && action.createTask !== false) {
                logger.debug('Creating task for manual action', {
                  prospect_id,
                  project_type,
                  currentStepIndex,
                  actionId: action.id
                });

                const taskTime = calculateTaskCreationTime(new Date());
                const endTime = new Date(taskTime);
                endTime.setMinutes(endTime.getMinutes() + 30);

                await createTask({
                  prospect,
                  prospect_id,
                  project_type,
                  stepName: steps[currentStepIndex].name,
                  title: `Tâche pour ${prospect.name}`,
                  notes: action.taskTitle || 'Action requise pour ce client',
                  taskTime,
                  endTime
                });
              }

              // CAS 3: Mode de vérification "Humain" → Sera géré par un autre hook
              // qui écoute les soumissions de formulaires/documents
              // (à implémenter dans un hook séparé: useAutoVerificationTasks)
            }
          } catch (error) {
            logger.error('Error in auto-create-tasks listener', { error });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [prompts, enabled, organizationId]);
}

/**
 * Crée une tâche dans la table appointments
 */
async function createTask({ prospect, prospect_id, project_type, stepName, title, notes, taskTime, endTime }) {
  // 🔥 VÉRIFIER SI UNE TÂCHE IDENTIQUE EXISTE DÉJÀ
  const { data: existingTasks, error: checkError } = await supabase
    .from('appointments')
    .select('id')
    .eq('type', 'task')
    .eq('contact_id', prospect_id)
    .eq('project_id', project_type)
    .eq('step', stepName)
    .eq('title', title)
    .eq('status', 'pending')
    .gte('created_at', new Date(Date.now() - 60000).toISOString()); // Créée dans la dernière minute

  if (checkError) {
    logger.error('❌ Erreur vérification tâches existantes:', checkError);
  }

  // Si une tâche identique existe déjà (créée il y a moins d'1 minute), ne pas en créer une nouvelle
  if (existingTasks && existingTasks.length > 0) {
    logger.warn('⚠️ Tâche déjà existante, skip création:', {
      prospect: prospect.name,
      project_type,
      step: stepName,
      existing_tasks: existingTasks.length
    });
    return true; // Retourner true car ce n'est pas une erreur
  }

  const { error: taskError } = await supabase
    .from('appointments')
    .insert({
      type: 'task',
      title,
      assigned_user_id: prospect.owner_id,
      contact_id: prospect_id,
      project_id: project_type,
      step: stepName,
      start_time: taskTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'pending',
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (taskError) {
    // 🔒 Si l'erreur est une violation de contrainte unique (code 23505), c'est normal (doublon bloqué par la DB)
    if (taskError.code === '23505') {
      logger.warn('⚠️ Tâche déjà existante (bloquée par contrainte unique DB):', {
        prospect: prospect.name,
        project_type,
        step: stepName,
        constraint: 'unique_pending_task_per_prospect_step'
      });
      return true; // Retourner true car ce n'est pas une vraie erreur
    }
    
    // Pour les autres erreurs, on affiche un message
    logger.error('Error creating task', { error: taskError });
    toast({
      title: 'Erreur',
      description: 'Impossible de créer la tâche automatique',
      variant: 'destructive'
    });
    return false;
  }

  logger.info('✅ Task created automatically', {
    prospect: prospect.name,
    project_type,
    step: stepName,
    scheduled_for: taskTime.toISOString()
  });

  toast({
    title: '✅ Tâche créée',
    description: `Une tâche a été créée pour ${prospect.name}`,
    className: 'bg-green-500 text-white'
  });

  return true;
}

/**
 * Calcule l'heure de création d'une tâche selon les règles métier
 * - 00h-08h → 9h le même jour
 * - 09h-18h → Immédiatement
 * - 19h-23h → 9h le lendemain
 */
function calculateTaskCreationTime(triggerDate = new Date()) {
  const hour = triggerDate.getHours();
  
  // Cas 1 : Nuit (00h-08h) → Attendre 9h le matin même
  if (hour < 9) {
    const taskDate = new Date(triggerDate);
    taskDate.setHours(9, 0, 0, 0);
    return taskDate;
  }
  
  // Cas 2 : Heures de bureau (09h-18h) → Immédiatement
  if (hour >= 9 && hour < 19) {
    return triggerDate;
  }
  
  // Cas 3 : Soirée (19h-23h) → Lendemain à 9h
  if (hour >= 19) {
    const taskDate = new Date(triggerDate);
    taskDate.setDate(taskDate.getDate() + 1); // Jour suivant
    taskDate.setHours(9, 0, 0, 0);
    return taskDate;
  }
  
  return triggerDate;
}
