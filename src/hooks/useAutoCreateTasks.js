import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook pour créer automatiquement des tâches quand une étape devient "in_progress"
 * Basé sur la configuration des prompts (managementMode: "manual" + createTask: true)
 */
export function useAutoCreateTasks(prompts) {
  useEffect(() => {
    if (!prompts || Object.keys(prompts).length === 0) {
      return;
    }

    // Écouter les changements dans project_steps_status
    const channel = supabase
      .channel('auto-create-tasks')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_steps_status'
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

            // Parcourir les actions de cette étape
            for (const action of stepConfig.actions || []) {
              // Si mode manuel + création de tâche activée
              if (action.managementMode === 'manual' && action.createTask !== false) {
                logger.debug('Creating task for manual action', {
                  prospect_id,
                  project_type,
                  currentStepIndex,
                  actionId: action.id
                });

                // Récupérer le prospect pour avoir l'owner_id
                const { data: prospect, error: prospectError } = await supabase
                  .from('prospects')
                  .select('owner_id, name')
                  .eq('id', prospect_id)
                  .single();

                if (prospectError) {
                  logger.error('Error fetching prospect', { error: prospectError });
                  continue;
                }

                // Calculer l'heure de création (règles 9h-19h)
                const taskTime = calculateTaskCreationTime(new Date());
                const endTime = new Date(taskTime);
                endTime.setMinutes(endTime.getMinutes() + 30); // +30 minutes

                // Créer la tâche
                const { error: taskError } = await supabase
                  .from('appointments')
                  .insert({
                    type: 'task',
                    title: `Tâche pour ${prospect.name}`,
                    assigned_user_id: prospect.owner_id,
                    contact_id: prospect_id,
                    project_id: project_type,
                    step: steps[currentStepIndex].name,
                    start_time: taskTime.toISOString(),
                    end_time: endTime.toISOString(),
                    status: 'pending',
                    notes: action.taskTitle || 'Action requise pour ce client',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  });

                if (taskError) {
                  logger.error('Error creating task', { error: taskError });
                  toast({
                    title: 'Erreur',
                    description: 'Impossible de créer la tâche automatique',
                    variant: 'destructive'
                  });
                } else {
                  logger.info('✅ Task created automatically', {
                    prospect: prospect.name,
                    project_type,
                    step: steps[currentStepIndex].name,
                    scheduled_for: taskTime.toISOString()
                  });

                  toast({
                    title: '✅ Tâche créée',
                    description: `Une tâche a été créée pour ${prospect.name}`,
                    className: 'bg-green-500 text-white'
                  });
                }
              }
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
  }, [prompts]);
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
