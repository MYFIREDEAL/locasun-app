import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook pour créer automatiquement des tâches de vérification
 * quand un client soumet un formulaire/document avec verificationMode='human'
 * @param {Object} prompts - Les prompts Charly AI
 * @param {Object} options - Options du hook
 * @param {string} options.organizationId - ID de l'organisation (requis pour multi-tenant)
 * @param {boolean} options.enabled - Active/désactive le hook
 */
export function useAutoVerificationTasks(prompts, { organizationId = null, enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (!organizationId) {
      logger.warn('⚠️ useAutoVerificationTasks: Pas d\'organization_id fourni');
      return;
    }
    if (!prompts || Object.keys(prompts).length === 0) {
      return;
    }

    logger.debug('🔔 useAutoVerificationTasks: Setting up subscription', { organizationId });

    // Écouter les soumissions de formulaires par les clients
    // 🔥 MULTI-TENANT: Filtré par organization_id !
    const channel = supabase
      .channel(`auto-verification-tasks-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_form_panels',
          filter: `organization_id=eq.${organizationId}`  // 🔥 FILTRE MULTI-TENANT !
        },
        async (payload) => {
          try {
            const oldStatus = payload.old?.status;
            const newStatus = payload.new?.status;
            
            // Détecter quand le client soumet (pending → submitted)
            if (oldStatus !== 'submitted' && newStatus === 'submitted') {
              logger.debug('Client form submitted', {
                panel_id: payload.new.panel_id,
                prospect_id: payload.new.prospect_id,
                project_type: payload.new.project_type
              });

              await handleFormSubmission(payload.new, prompts);
            }
          } catch (error) {
            logger.error('❌ Erreur dans useAutoVerificationTasks:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [prompts, organizationId, enabled]);
}

/**
 * Gère la création de tâche de vérification après soumission client
 * 
 * ✅ UNIFIÉ V1/V2: Lit verification_mode directement depuis le panel
 *    (plus de dépendance aux prompts V1)
 */
async function handleFormSubmission(formPanel, prompts) {
  const { prospect_id, project_type, form_id, verification_mode } = formPanel;

  // ✅ Source unique de vérité: lire verification_mode depuis le panel
  const mode = (verification_mode ?? 'HUMAN').toUpperCase();
  
  if (mode !== 'HUMAN') {
    logger.debug('Verification mode is not HUMAN, skipping task creation', { 
      verification_mode: mode,
      form_id,
      prospect_id 
    });
    return;
  }
  
  logger.debug('🔍 Verification mode is HUMAN, creating task...', { form_id, prospect_id });

  // Récupérer les infos du prospect
  const { data: prospect, error: prospectError } = await supabase
    .from('prospects')
    .select('name, owner_id, organization_id')
    .eq('id', prospect_id)
    .single();

  if (prospectError || !prospect) {
    logger.error('❌ Erreur récupération prospect:', prospectError);
    return;
  }

  if (!prospect.organization_id) {
    logger.error('❌ Organization ID manquant pour le prospect:', { prospect_id });
    return;
  }

  // Récupérer le nom du formulaire
  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('name')
    .eq('form_id', form_id)
    .single();

  const formName = form?.name || form_id;

  // ✅ Utiliser step_name depuis le panel (ou fallback générique)
  const stepName = formPanel.step_name || project_type || 'Étape';

  // 🔥 VÉRIFIER SI UNE TÂCHE EXISTE DÉJÀ pour ce formulaire
  const { data: existingTasks, error: checkError } = await supabase
    .from('appointments')
    .select('id')
    .eq('type', 'task')
    .eq('contact_id', prospect_id)
    .eq('project_id', project_type)
    .eq('step', stepName)
    .eq('title', `Vérifier le formulaire de ${prospect.name}`)
    .eq('status', 'pending')
    .gte('created_at', new Date(Date.now() - 60000).toISOString()); // Créée dans la dernière minute

  if (checkError) {
    logger.error('❌ Erreur vérification tâches existantes:', checkError);
  }

  // Si une tâche identique existe déjà (créée il y a moins d'1 minute), ne pas en créer une nouvelle
  if (existingTasks && existingTasks.length > 0) {
    logger.warn('⚠️ Tâche de vérification déjà existante, skip création:', {
      prospect: prospect.name,
      form: formName,
      existing_tasks: existingTasks.length
    });
    return;
  }

  // 🔥 FIX: Guard owner_id valide, fallback vers Global Admin de l'org
  let validOwnerId = prospect.owner_id;

  if (!validOwnerId) {
    logger.warn(`⚠️ owner_id NULL pour ${prospect.name}, recherche fallback Global Admin`);
    
    const { data: fallbackAdmin, error: adminError } = await supabase
      .from('users')
      .select('user_id')
      .eq('organization_id', prospect.organization_id)
      .eq('role', 'Global Admin')
      .limit(1)
      .single();

    if (!adminError && fallbackAdmin) {
      validOwnerId = fallbackAdmin.user_id;
      logger.info(`✅ Fallback Admin trouvé: ${validOwnerId}`);
    } else {
      logger.error(`❌ Aucun admin disponible pour org ${prospect.organization_id}`);
      toast({
        title: 'Erreur',
        description: 'Aucun admin disponible pour assigner la tâche.',
        variant: 'destructive',
      });
      return;
    }
  }

  // Créer la tâche de vérification
  const taskTitle = `Vérifier le formulaire de ${prospect.name}`;
  const now = new Date();
  const endTime = new Date(now.getTime() + 30 * 60 * 1000); // +30 minutes

  const taskData = {
    type: 'task',
    title: taskTitle,
    assigned_user_id: validOwnerId,
    contact_id: prospect_id,
    project_id: project_type,
    step: stepName,
    organization_id: prospect.organization_id, // 🔥 AJOUT: Requis par la DB
    start_time: now.toISOString(),
    end_time: endTime.toISOString(),
    status: 'pending',
    notes: `🔍 Vérification requise par un humain

📋 **Formulaire:** ${formName}
👤 **Client:** ${prospect.name}
📍 **Étape:** ${stepName}
🎯 **Projet:** ${project_type}

➡️ Consultez les réponses du client et validez ou rejetez le formulaire.`,
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  };

  const { error: insertError } = await supabase
    .from('appointments')
    .insert(taskData);

  if (insertError) {
    // 🔒 Si l'erreur est une violation de contrainte unique (code 23505), c'est normal (doublon bloqué par la DB)
    if (insertError.code === '23505') {
      logger.warn('⚠️ Tâche déjà existante (bloquée par contrainte unique DB):', {
        prospect: prospect.name,
        form: formName,
        constraint: 'unique_pending_task_per_prospect_step'
      });
      return; // Pas d'erreur affichée à l'utilisateur, c'est voulu
    }
    
    // Pour les autres erreurs, on affiche un message
    logger.error('❌ Erreur création tâche de vérification:', insertError);
    toast({
      title: 'Erreur',
      description: 'Impossible de créer la tâche de vérification.',
      variant: 'destructive',
    });
    return;
  }

  logger.info('✅ Tâche de vérification créée:', {
    title: taskTitle,
    prospect: prospect.name,
    form: formName,
    assigned_to: prospect.owner_id
  });

  toast({
    title: '✅ Tâche créée',
    description: `Tâche de vérification assignée pour ${prospect.name}`,
    className: 'bg-green-500 text-white',
  });
}
