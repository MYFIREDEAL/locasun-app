import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { executeContractSignatureAction } from '@/lib/contractPdfGenerator';
import { logger } from '@/lib/logger';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook pour exécuter automatiquement les actions workflow
 * quand un prospect change d'étape dans un projet
 * 
 * @param {string} prospectId - ID du prospect
 * @param {string} projectType - Type de projet
 * @param {Array} currentSteps - Étapes actuelles du projet
 * @param {Object} activeAdminUser - Utilisateur admin actif (pour organization_id)
 */
export function useWorkflowExecutor({ prospectId, projectType, currentSteps, activeAdminUser }) {
  // Garde une trace des actions déjà exécutées pour éviter les duplicatas
  const executedActionsRef = useRef(new Set());

  useEffect(() => {
    if (!prospectId || !projectType || !currentSteps) return;

    const executeWorkflowActions = async () => {
      try {
        // 1. Charger le prompt/workflow pour ce projet
        const { data: prompt, error: promptError } = await supabase
          .from('prompts')
          .select('*')
          .eq('project_id', projectType)
          .single();

        if (promptError || !prompt) {
          logger.debug('Aucun workflow configuré pour ce projet', { projectType });
          return;
        }

        // 2. Trouver l'étape actuelle (in_progress)
        const currentStepIndex = currentSteps.findIndex(
          (step) => step.status === 'in_progress'
        );

        if (currentStepIndex === -1) {
          logger.debug('Aucune étape en cours', { projectType });
          return;
        }

        // 3. Récupérer la configuration de cette étape
        const stepConfig = prompt.steps_config?.[currentStepIndex];

        if (!stepConfig || !stepConfig.actions || stepConfig.actions.length === 0) {
          logger.debug('Aucune action configurée pour cette étape', { 
            projectType, 
            stepIndex: currentStepIndex 
          });
          return;
        }

        // 4. Exécuter les actions automatiques
        for (const action of stepConfig.actions) {
          // Ignorer les actions sans type ou avec type 'none'
          if (!action.type || action.type === 'none') continue;

          // Ignorer les actions gérées manuellement par le commercial
          if (action.hasClientAction === false) {
            logger.debug('Action commerciale, skip automatisation', { 
              actionType: action.type 
            });
            continue;
          }

          // 🔥 Créer une clé unique pour cette action à cette étape
          const actionKey = `${prospectId}-${projectType}-${currentStepIndex}-${action.type}-${action.templateId || action.formId || ''}`;

          // 🔥 Vérifier si l'action a déjà été exécutée
          if (executedActionsRef.current.has(actionKey)) {
            logger.debug('Action déjà exécutée, skip', { actionKey });
            continue;
          }

          // 🔥 Marquer l'action comme exécutée AVANT de l'exécuter
          executedActionsRef.current.add(actionKey);

          // Exécuter l'action selon son type
          await executeAction({
            action,
            prospectId,
            projectType,
          });
        }
      } catch (error) {
        logger.error('Erreur exécution workflow', { 
          error: error.message,
          prospectId,
          projectType 
        });
      }
    };

    // Exécuter au montage et quand les steps changent
    executeWorkflowActions();
  }, [prospectId, projectType, currentSteps]);
}

/**
 * Exécute une action workflow spécifique
 * @param {Object} params
 * @param {Object} params.action - Configuration de l'action
 * @param {string} params.prospectId - ID du prospect
 * @param {string} params.projectType - Type de projet
 */
async function executeAction({ action, prospectId, projectType }) {
  try {
    logger.debug('Exécution action workflow', { 
      actionType: action.type,
      prospectId,
      projectType 
    });

    switch (action.type) {
      case 'start_signature':
        await executeStartSignatureAction({ action, prospectId, projectType });
        break;

      case 'show_form':
        logger.debug('Action show_form gérée côté client', { formId: action.formId });
        break;

      case 'request_document':
        logger.debug('Action request_document gérée côté client', { 
          documentType: action.documentType 
        });
        break;

      case 'open_payment':
        logger.debug('Action open_payment gérée côté client');
        break;

      case 'partner_task':
        await executePartnerTaskAction({ action, prospectId, projectType });
        break;

      default:
        logger.warn('Type d\'action inconnu', { actionType: action.type });
    }
  } catch (error) {
    logger.error('Erreur exécution action', { 
      error: error.message,
      actionType: action.type 
    });
  }
}

/**
 * Exécute l'action "Lancer une signature"
 * PHASE 1: Génère le PDF, crée une procédure PENDING, envoie le lien dans le chat
 */
async function executeStartSignatureAction({ action, prospectId, projectType }) {
  try {
    if (!action.templateId) {
      logger.warn('Action start_signature sans templateId', { prospectId, projectType });
      toast({
        title: "⚠️ Configuration manquante",
        description: "Aucun template de contrat configuré pour cette action",
        variant: "destructive",
      });
      return;
    }

    // 🔥 Récupérer les données du prospect (incluant form_data)
    const { data: prospectData, error: prospectError } = await supabase
      .from('prospects')
      .select('name, email, company_name, phone, organization_id, form_data')
      .eq('id', prospectId)
      .single();

    if (prospectError || !prospectData) {
      logger.error('Erreur récupération prospect', { error: prospectError?.message });
      throw new Error('Impossible de récupérer les données du prospect');
    }

    // 🔥 EXTRAIRE les données du formulaire soumis (contract-driven)
    const formData = prospectData.form_data?.[projectType]?.[action.formId] || {};

    logger.debug('Données formulaire récupérées', { 
      projectType, 
      formId: action.formId,
      formDataKeys: Object.keys(formData)
    });

    // 🔥 VALEURS STRICTES pour éviter NULL en DB - VALIDATION EXPLICITE
    const signerName = 
      typeof prospectData?.name === 'string' && prospectData.name.trim() !== ''
        ? prospectData.name
        : typeof prospectData?.company_name === 'string' && prospectData.company_name.trim() !== ''
        ? prospectData.company_name
        : typeof prospectData?.email === 'string' && prospectData.email.includes('@')
        ? prospectData.email.split('@')[0]
        : 'Client';

    const signerEmail = 
      typeof prospectData?.email === 'string' && prospectData.email.includes('@')
        ? prospectData.email
        : 'unknown@example.com';

    logger.debug('Données signataire STRICTES', { signerName, signerEmail });

    // 🔥 VÉRIFIER si un contrat PDF existe déjà pour ce projet
    const { data: existingFiles, error: checkError } = await supabase
      .from('project_files')
      .select('id, file_name, storage_path')
      .eq('prospect_id', prospectId)
      .eq('project_type', projectType)
      .eq('field_label', 'Contrat généré automatiquement')
      .limit(1);

    if (checkError) {
      logger.error('Erreur vérification fichiers existants', { error: checkError.message });
    }

    let fileId = null;
    let storagePath = null;

    if (existingFiles && existingFiles.length > 0) {
      logger.debug('Contrat PDF déjà existant, utilisation du fichier existant', { 
        existingFile: existingFiles[0].file_name 
      });
      fileId = existingFiles[0].id;
      storagePath = existingFiles[0].storage_path;
    } else {
      logger.debug('Génération contrat PDF...', { 
        templateId: action.templateId,
        prospectId,
        projectType 
      });

      toast({
        title: "📄 Génération du contrat...",
        description: "Création du PDF en cours",
        className: "bg-blue-500 text-white",
      });

      // Exécuter la génération + upload
      const result = await executeContractSignatureAction({
        templateId: action.templateId,
        projectType,
        prospectId,
        formData,
        organizationId: prospectData.organization_id,
      });

      if (result.success) {
        fileId = result.fileData.id;
        storagePath = result.fileData.storage_path;
        
        toast({
          title: "✅ Contrat généré !",
          description: "Le PDF a été ajouté aux fichiers du projet",
          className: "bg-green-500 text-white",
        });
        
        logger.debug('Contrat généré avec succès', { fileId, prospectId, projectType });
      } else {
        throw new Error(result.error);
      }
    }

    // ========================================
    // PHASE 1 : CRÉATION PROCÉDURE SIGNATURE AES
    // ========================================
    
    logger.debug('Phase 1: Création procédure de signature AES PENDING...');
    
    // 1. Générer token sécurisé
    const accessToken = crypto.randomUUID();
    
    // 2. Définir expiration (+7 jours)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 3. Insérer dans signature_procedures
    const { data: procedure, error: procedureError } = await supabase
      .from('signature_procedures')
      .insert({
        organization_id: prospectData.organization_id,
        prospect_id: prospectId,
        project_type: projectType,
        file_id: fileId,
        signer_name: signerName,
        signer_email: signerEmail,
        document_hash: null, // ⏳ Phase 2: calculer hash SHA-256 du PDF
        access_token: accessToken,
        access_token_expires_at: expiresAt.toISOString(),
        status: 'pending',
        signature_metadata: {
          created_by: 'workflow_automation',
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (procedureError) {
      logger.error('Erreur création signature_procedures', { error: procedureError.message });
      throw procedureError;
    }

    logger.debug('Procédure de signature créée (PENDING)', { 
      procedureId: procedure.id,
      expiresAt: expiresAt.toISOString()
    });

    // 4. Construire l'URL de signature
    const signatureUrl = `${window.location.origin}/signature/${procedure.id}?token=${accessToken}`;
    
    logger.debug('URL de signature générée', { signatureUrl });

    // 5. Vérifier si le message existe déjà
    const { data: existingMessage } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('prospect_id', prospectId)
      .eq('project_type', projectType)
      .eq('sender', 'pro')
      .ilike('text', `%/signature/${procedure.id}%`)
      .maybeSingle();

    // 6. Envoyer le lien dans le chat (seulement si inexistant)
    if (!existingMessage) {
      const { error: chatError } = await supabase
        .from('chat_messages')
        .insert({
          prospect_id: prospectId,
          project_type: projectType,
          sender: 'pro',
          text: `📝 <strong>Votre contrat est prêt à signer</strong><br><br><a href="${signatureUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.3s;">✍️ Signer mon contrat</a><br><br><small style="color: #6b7280;">Lien valide jusqu'au ${expiresAt.toLocaleDateString('fr-FR')}</small>`,
          organization_id: prospectData.organization_id,
          channel: 'client',
        });

      if (chatError) {
        logger.error('Erreur envoi message chat signature', { error: chatError.message });
        throw chatError;
      }

      logger.debug('Lien de signature envoyé dans le chat', { procedureId: procedure.id });
      
      toast({
        title: "✅ Lien de signature envoyé",
        description: "Le client peut maintenant signer son contrat",
        className: "bg-green-500 text-white",
      });
    } else {
      logger.debug('Message de signature déjà existant, pas de duplication');
    }

    // ✅ ARRÊT ICI (PHASE 1)
    // La page /signature/:id sera développée en Phase 2

  } catch (error) {
    logger.error('Erreur Phase 1 signature AES', { error: error.message });
    toast({
      title: "❌ Erreur",
      description: `Impossible de préparer la signature: ${error.message}`,
      variant: "destructive",
    });
  }
}

/**
 * Exécute l'action "Associée au partenaire"
 * Crée automatiquement une mission pour le partenaire assigné
 */
export async function executePartnerTaskAction({ action, prospectId, projectType }) {
  try {
    if (!action.partnerId) {
      logger.warn('Action partner_task sans partnerId', { prospectId, projectType });
      toast({
        title: "⚠️ Configuration manquante",
        description: "Aucun partenaire configuré pour cette action",
        variant: "destructive",
      });
      return;
    }

    // 1. Récupérer les données du prospect (nom, email, phone, address, organization_id)
    const { data: prospectData, error: prospectError } = await supabase
      .from('prospects')
      .select('name, email, phone, address, organization_id')
      .eq('id', prospectId)
      .single();

    if (prospectError || !prospectData) {
      logger.error('Erreur récupération prospect pour mission partenaire', { 
        error: prospectError?.message 
      });
      throw new Error('Impossible de récupérer les données du prospect');
    }

    // 2. Vérifier si une mission existe déjà pour ce prospect/partenaire/projet
    // 🔥 V2: Si actionId fourni, vérifier par actionId (permet multi-missions même partenaire)
    // V1/legacy: Sans actionId, garde l'ancien comportement (1 mission par prospect+partenaire+projectType)
    let duplicateQuery = supabase
      .from('missions')
      .select('id')
      .eq('prospect_id', prospectId)
      .eq('partner_id', action.partnerId)
      .eq('project_type', projectType);

    if (action.actionId) {
      duplicateQuery = duplicateQuery.eq('action_id', action.actionId);
    }

    const { data: existingMission } = await duplicateQuery.maybeSingle();

    if (existingMission) {
      logger.debug('Mission partenaire déjà existante, pas de duplication', {
        missionId: existingMission.id,
        actionId: action.actionId || null,
      });
      return;
    }

    // 3. Créer la mission
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .insert({
        organization_id: prospectData.organization_id,
        partner_id: action.partnerId,
        prospect_id: prospectId,
        project_type: projectType,
        title: `Mission pour ${prospectData.name || 'Client'}`,
        description: action.partnerInstructions || null,
        status: 'pending',
        is_blocking: action.isBlocking !== false,
        client_name: prospectData.name || null,
        email: prospectData.email || null,
        phone: prospectData.phone || null,
        address: prospectData.address || null,
        form_ids: action.formIds || [], // 🔥 AJOUTER: IDs des formulaires associés
        action_id: action.actionId || null, // 🔥 AJOUTER: ID action V2 pour multi-missions
      })
      .select()
      .single();

    if (missionError) {
      logger.error('Erreur création mission partenaire', { error: missionError.message });
      throw missionError;
    }

    logger.debug('Mission partenaire créée', { 
      missionId: mission.id,
      partnerId: action.partnerId,
      isBlocking: action.isBlocking !== false
    });

    toast({
      title: "✅ Mission partenaire créée",
      description: `Une nouvelle mission a été assignée au partenaire`,
      className: "bg-orange-500 text-white",
    });

  } catch (error) {
    logger.error('Erreur création mission partenaire', { error: error.message });
    toast({
      title: "❌ Erreur",
      description: `Impossible de créer la mission partenaire: ${error.message}`,
      variant: "destructive",
    });
  }
}
