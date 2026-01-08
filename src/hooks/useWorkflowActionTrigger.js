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

    // Éviter les initialisations multiples
    if (isInitializedRef.current) {
      return;
    }
    
    isInitializedRef.current = true;
    logger.info('🔄 Workflow action trigger activé', { prospectId, projectType, currentStepIndex });

    // 🔥 Écouter les changements sur client_form_panels (formulaires approuvés)
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
          
          // Vérifier si c'est pour le bon projet et la bonne étape
          if (
            updatedPanel.project_type === projectType &&
            updatedPanel.status === 'approved' &&
            updatedPanel.action_id
          ) {
            const actionKey = `${prospectId}-${projectType}-${currentStepIndex}-${updatedPanel.action_id}`;
            
            // Éviter les duplicatas
            if (executedRef.current.has(actionKey)) {
              return;
            }
            
            executedRef.current.add(actionKey);
            
            logger.info('✅ Formulaire approuvé → Action suivante instantanée', {
              formId: updatedPanel.form_id,
              actionId: updatedPanel.action_id,
            });
            
            // 🔥 Envoi instantané de l'action suivante
            logger.info('🚀 Envoi action suivante');
            sendNextAction();
          }
        }
      )
      .subscribe();

    return () => {
      isInitializedRef.current = false;
      supabase.removeChannel(formPanelChannel);
      logger.debug('🔴 Workflow action trigger désactivé');
    };
  }, [prospectId, projectType, currentStepIndex, prompt, sendNextAction]);
}
