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
 */
export function useWorkflowExecutor({ prospectId, projectType, currentSteps }) {
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
 * Génère un PDF de contrat et l'ajoute aux fichiers du projet
 * PUIS crée un lien de signature dans le chat
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

    if (existingFiles && existingFiles.length > 0) {
      logger.debug('Contrat PDF déjà existant, utilisation du fichier existant', { 
        existingFile: existingFiles[0].file_name 
      });
      fileId = existingFiles[0].id;
    } else {
      logger.debug('Génération contrat PDF...', { 
        templateId: action.templateId,
        prospectId,
        projectType 
      });

      // 🔥 EXTRAIRE CO-SIGNATAIRES DEPUIS LE FORMULAIRE (si configuré)
      let cosigners = [];
      if (action.cosignersConfig?.formId) {
        cosigners = await extractCosignersFromForm({
          formId: action.cosignersConfig.formId,
          prospectId,
          projectType,
          config: action.cosignersConfig
        });
        
        logger.debug('Co-signataires extraits pour génération PDF', { 
          count: cosigners.length,
          cosigners
        });
      }

      toast({
        title: "📄 Génération du contrat...",
        description: "Création du PDF en cours",
        className: "bg-blue-500 text-white",
      });

      // Exécuter la génération + upload avec co-signataires
      const result = await executeContractSignatureAction({
        templateId: action.templateId,
        projectType,
        prospectId,
        cosigners: cosigners, // 🔥 Passer les co-signataires au générateur
      });

      if (result.success) {
        fileId = result.fileData.id;
        toast({
          title: "✅ Contrat généré !",
          description: "Le PDF a été ajouté aux fichiers du projet",
          className: "bg-green-500 text-white",
        });
      } else {
        throw new Error(result.error);
      }
    }

    // 🔥 CRÉER OU RÉCUPÉRER LA PROCÉDURE DE SIGNATURE
    logger.debug('Création procédure de signature...', { fileId, prospectId, projectType });

    // Vérifier si une procédure existe déjà pour ce fichier
    const { data: existingProcedure } = await supabase
      .from('signature_procedures')
      .select('*')
      .eq('file_id', fileId)
      .eq('prospect_id', prospectId)
      .eq('status', 'pending')
      .maybeSingle();

    let signatureProcedure = existingProcedure;

    if (!signatureProcedure) {
      // Créer nouvelle procédure
      const accessToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // +7 jours

      // 🔥 Récupérer les données du prospect pour le signataire principal
      const { data: prospectData, error: prospectError } = await supabase
        .from('prospects')
        .select('name, email, phone')
        .eq('id', prospectId)
        .single();

      if (prospectError) {
        logger.error('Erreur récupération prospect', prospectError);
        throw prospectError;
      }

      // 🔥 Construire le tableau signers
      const signers = [
        {
          type: 'principal',
          name: prospectData.name || 'Client',
          email: prospectData.email,
          phone: prospectData.phone || null,
          access_token: accessToken,
          requires_auth: true,
          status: 'pending',
          signed_at: null,
        },
      ];

      // 🔥 EXTRAIRE CO-SIGNATAIRES DEPUIS LE FORMULAIRE (si configuré)
      let extractedCosigners = [];
      if (action.cosignersConfig?.formId) {
        extractedCosigners = await extractCosignersFromForm({
          formId: action.cosignersConfig.formId,
          prospectId,
          projectType,
          config: action.cosignersConfig
        });
        
        logger.debug('Co-signataires extraits du formulaire', { 
          count: extractedCosigners.length,
          cosigners: extractedCosigners
        });
      }

      // 🔥 Ajouter les co-signataires extraits au tableau signers
      if (extractedCosigners.length > 0) {
        for (const cosigner of extractedCosigners) {
          signers.push({
            type: 'cosigner',
            name: cosigner.name || '',
            email: cosigner.email || '',
            phone: cosigner.phone || '',
            access_token: crypto.randomUUID(),
            requires_auth: false,
            status: 'pending',
            signed_at: null,
          });
        }
      }

      const { data: newProcedure, error: procedureError } = await supabase
        .from('signature_procedures')
        .insert({
          prospect_id: prospectId,
          project_type: projectType,
          file_id: fileId,
          access_token: accessToken,
          access_token_expires_at: expiresAt.toISOString(),
          status: 'pending',
          signers: signers,
        })
        .select()
        .single();

      if (procedureError) {
        logger.error('Erreur création signature_procedures', procedureError);
        throw procedureError;
      }

      signatureProcedure = newProcedure;
      logger.debug('Procédure de signature créée', { procedureId: signatureProcedure.id, signersCount: signers.length });
    } else {
      logger.debug('Procédure de signature existante réutilisée', { procedureId: signatureProcedure.id });
    }

    // 🔥 CONSTRUIRE L'URL DE SIGNATURE
    const signatureUrl = `${window.location.origin}/signature/${signatureProcedure.id}?token=${signatureProcedure.access_token}`;
    
    logger.debug('URL de signature générée', { signatureUrl });

    // 🔥 VÉRIFIER SI LE MESSAGE EXISTE DÉJÀ (lié à cette procédure)
    const { data: existingMessage } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('prospect_id', prospectId)
      .eq('project_type', projectType)
      .eq('sender', 'pro')
      .ilike('text', `%/signature/${signatureProcedure.id}%`)
      .maybeSingle();

    // 🔥 ENVOYER LE LIEN DANS LE CHAT (seulement si inexistant)
    if (!existingMessage) {
      const { error: chatError } = await supabase
        .from('chat_messages')
        .insert({
          prospect_id: prospectId,
          project_type: projectType,
          sender: 'pro',
          text: `<a href="${signatureUrl}" target="_blank" style="color: #10b981; font-weight: 600; text-decoration: underline;">👉 Signer mon contrat</a>`,
        });

      if (chatError) {
        logger.error('Erreur envoi message chat signature', chatError);
      } else {
        logger.debug('Lien de signature envoyé dans le chat');
      }
    } else {
      logger.debug('Message de signature déjà existant, pas de duplication');
    }

  } catch (error) {
    logger.error('Erreur génération contrat', { error: error.message });
    toast({
      title: "❌ Erreur",
      description: `Impossible de générer le contrat: ${error.message}`,
      variant: "destructive",
    });
  }
}

/**
 * Extrait les co-signataires depuis les données d'un formulaire repeater
 * @param {Object} params
 * @param {string} params.formId - ID du formulaire contenant les co-signataires
 * @param {string} params.prospectId - ID du prospect
 * @param {string} params.projectType - Type de projet
 * @param {Object} params.config - Configuration du mapping (countField, nameField, emailField, phoneField)
 * @returns {Array} Tableau des co-signataires [{name, email, phone}]
 */
async function extractCosignersFromForm({ formId, prospectId, projectType, config }) {
  try {
    // 1. Récupérer les données du formulaire depuis client_form_panels
    const { data: formPanel, error: panelError } = await supabase
      .from('client_form_panels')
      .select('form_data')
      .eq('prospect_id', prospectId)
      .eq('project_type', projectType)
      .eq('form_id', formId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (panelError || !formPanel || !formPanel.form_data) {
      logger.warn('Aucun formulaire approuvé trouvé pour extraction co-signataires', {
        formId,
        prospectId,
        projectType
      });
      return [];
    }

    const formData = formPanel.form_data;
    logger.debug('Données formulaire récupérées', { formData });

    // 2. Extraire le nombre de co-signataires depuis le champ count
    const countValue = formData[config.countField];
    const cosignersCount = parseInt(countValue, 10);

    if (isNaN(cosignersCount) || cosignersCount <= 0) {
      logger.debug('Aucun co-signataire à extraire', { countValue });
      return [];
    }

    // 3. Extraire les données de chaque co-signataire
    const cosigners = [];
    for (let i = 0; i < cosignersCount; i++) {
      // Format: {countField}_repeat_{i}_{fieldId}
      const nameKey = `${config.countField}_repeat_${i}_${config.nameField}`;
      const emailKey = `${config.countField}_repeat_${i}_${config.emailField}`;
      const phoneKey = `${config.countField}_repeat_${i}_${config.phoneField}`;

      const name = formData[nameKey];
      const email = formData[emailKey];
      const phone = formData[phoneKey];

      if (name && email) {
        cosigners.push({ name, email, phone });
      }
    }

    logger.debug('Co-signataires extraits avec succès', { 
      count: cosigners.length,
      cosigners 
    });

    return cosigners;
  } catch (error) {
    logger.error('Erreur extraction co-signataires', { error: error.message });
    return [];
  }
}
