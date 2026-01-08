import { useEffect, useRef, useCallback } from 'react';
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
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!prospectId || !projectType || currentStepIndex === undefined || !prompt) {
      return;
    }

    logger.info('🔄 Workflow action trigger activé', { 
      prospectId, 
      projectType, 
      currentStepIndex,
      promptName: prompt?.name 
    });

    // 🔥 Écouter les changements sur client_form_panels (formulaires approuvés)
    logger.info('📡 Subscribing to channel', {
      channelName: `workflow-forms-${prospectId}-${projectType}-${currentStepIndex}`,
      filter: `prospect_id=eq.${prospectId}`
    });
    
    const formPanelChannel = supabase
      .channel(`workflow-forms-${prospectId}-${projectType}-${currentStepIndex}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_form_panels',
          filter: `prospect_id=eq.${prospectId}`,
        },
        async (payload) => {
          const updatedPanel = payload.new;
          
          logger.info('🔍 Form panel UPDATE reçu', {
            panelId: updatedPanel.id,
            prospectId: updatedPanel.prospect_id,
            projectType: updatedPanel.project_type,
            status: updatedPanel.status,
            actionId: updatedPanel.action_id,
            expectedProjectType: projectType,
          });
          
          // Vérifier si c'est pour le bon projet et la bonne étape
          const projectMatch = updatedPanel.project_type === projectType;
          const isApproved = updatedPanel.status === 'approved';
          const hasActionId = !!updatedPanel.action_id;
          
          logger.info('🔍 Vérifications workflow trigger', {
            projectMatch,
            isApproved,
            hasActionId,
            allConditionsMet: projectMatch && isApproved && hasActionId
          });
          
          if (projectMatch && isApproved && hasActionId) {
            const actionKey = `${prospectId}-${projectType}-${currentStepIndex}-${updatedPanel.action_id}`;
            
            // Éviter les duplicatas
            if (executedRef.current.has(actionKey)) {
              logger.warn('⚠️ Action déjà exécutée, skip', { actionKey });
              return;
            }
            
            executedRef.current.add(actionKey);
            
            logger.info('✅ Formulaire approuvé → Action suivante dans 2s', {
              formId: updatedPanel.form_id,
              actionId: updatedPanel.action_id,
            });
            
            // 🔥 Délai de 2 secondes pour laisser le message de validation s'afficher
            setTimeout(() => {
              logger.info('🚀 Envoi action suivante', { 
                completedActionId: updatedPanel.action_id 
              });
              sendNextAction(updatedPanel.action_id); // Passer l'ID de l'action complétée
            }, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(formPanelChannel);
      logger.debug('🔴 Workflow action trigger désactivé');
    };
  }, [prospectId, projectType, currentStepIndex, prompt, sendNextAction]);
}
