import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Hook pour déclencher automatiquement l'action suivante du workflow
 * quand l'action précédente est complétée
 * 
 * @param {string} prospectId - ID du prospect
 * @param {string} projectType - Type de projet
 * @param {number} currentStepIndex - Index de l'étape actuelle
 * @param {Object} prompt - Configuration du prompt/workflow
 * @param {Function} sendNextAction - Fonction pour envoyer la prochaine action
 */
export function useWorkflowActionTrigger({ 
  prospectId, 
  projectType, 
  currentStepIndex,
  prompt,
  sendNextAction
}) {
  const executedRef = useRef(new Set());

  useEffect(() => {
    if (!prospectId || !projectType || currentStepIndex === undefined || !prompt) {
      logger.debug('⚠️ Workflow action trigger DISABLED', { prospectId, projectType, currentStepIndex, prompt });
      return;
    }

    logger.info('🔄 Workflow action trigger ACTIVATED', { prospectId, projectType, currentStepIndex, promptId: prompt?.id });

    // 🔥 Écouter les changements sur client_form_panels (formulaires approuvés)
    const formPanelChannel = supabase
      .channel(`workflow-forms-${prospectId}-${projectType}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_form_panels',
          filter: `prospect_id=eq.${prospectId}`,
        },
        async (payload) => {
          logger.info('📩 UPDATE received on client_form_panels', { 
            payload: payload.new,
            status: payload.new.status,
            actionId: payload.new.action_id,
            projectType: payload.new.project_type
          });
          
          const updatedPanel = payload.new;
          
          // Vérifier si c'est pour le bon projet et la bonne étape
          if (
            updatedPanel.project_type === projectType &&
            updatedPanel.status === 'approved' &&
            updatedPanel.action_id
          ) {
            const actionKey = `${prospectId}-${projectType}-${currentStepIndex}-${updatedPanel.action_id}`;
            
            // Éviter les duplicatas
            if (executedRef.current.has(actionKey)) {
              logger.debug('Action suivante déjà déclenchée, skip', { actionKey });
              return;
            }
            
            executedRef.current.add(actionKey);
            
            logger.info('✅ Formulaire approuvé, déclenchement action suivante dans 2 sec', {
              formId: updatedPanel.form_id,
              actionId: updatedPanel.action_id,
            });
            
            // 🔥 Attendre 2 secondes avant d'envoyer l'action suivante (pour que le client voie la validation)
            setTimeout(() => {
              logger.info('🚀 Appel sendNextAction()');
              sendNextAction();
            }, 2000);
          } else {
            logger.debug('❌ Conditions non remplies pour déclenchement', {
              projectTypeMatch: updatedPanel.project_type === projectType,
              statusApproved: updatedPanel.status === 'approved',
              hasActionId: !!updatedPanel.action_id,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(formPanelChannel);
    };
  }, [prospectId, projectType, currentStepIndex, prompt, sendNextAction]);
}
