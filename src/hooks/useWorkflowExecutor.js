import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { executeContractSignatureAction } from '@/lib/contractPdfGenerator';
import { logger } from '@/lib/logger';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook pour exécuter automatiquement les actions workflow
 * quand un prospect change d'étape dans un projet
 * OU quand un formulaire requis est approuvé
 * 
 * @param {string} prospectId - ID du prospect
 * @param {string} projectType - Type de projet
 * @param {Array} currentSteps - Étapes actuelles du projet
 */
export function useWorkflowExecutor({ prospectId, projectType, currentSteps }) {
  // Garde une trace des actions déjà exécutées pour éviter les duplicatas
  const executedActionsRef = useRef(new Set());

  // ⚡ Écoute des approbations de formulaires pour relancer les actions bloquées
  useEffect(() => {
    if (!prospectId || !projectType) return;

    const channel = supabase
      .channel(`form-approvals-${prospectId}-${projectType}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_form_panels',
          filter: `prospect_id=eq.${prospectId}`,
        },
        async (payload) => {
          // Détecter l'approbation d'un formulaire
          if (payload.new.status === 'approved' && payload.old.status !== 'approved') {
            logger.debug('📋 Formulaire approuvé détecté, relance des actions workflow', {
              formId: payload.new.form_id,
              prospectId,
              projectType
            });

            // Réexécuter les actions du workflow pour l'étape actuelle
            await executeWorkflowActions();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [prospectId, projectType, currentSteps]);

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

        // 4. Exécuter les actions automatiques AVEC VÉRIFICATION DES DÉPENDANCES
        for (let i = 0; i < stepConfig.actions.length; i++) {
          const action = stepConfig.actions[i];
          
          // Ignorer les actions sans type ou avec type 'none'
          if (!action.type || action.type === 'none') continue;

          // Ignorer les actions gérées manuellement par le commercial
          if (action.hasClientAction === false) {
            logger.debug('Action commerciale, skip automatisation', { 
              actionType: action.type 
            });
            continue;
          }

          // 🔥 VÉRIFICATION DES PRÉREQUIS : Les actions précédentes sont-elles terminées ?
          const previousActions = stepConfig.actions.slice(0, i);
          const canExecute = await checkActionPrerequisites({
            action,
            previousActions,
            prospectId,
            projectType
          });

          if (!canExecute) {
            logger.warn('⏸️ Action bloquée en attente des prérequis', { 
              actionType: action.type,
              actionIndex: i
            });
            break; // ⛔ Arrêter l'exécution, ne pas exécuter les actions suivantes
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

  // ⚡ Écoute principale: changement d'étapes
  useEffect(() => {
    if (!prospectId || !projectType || !currentSteps) return;

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

    // 🔥 EXTRAIRE CO-SIGNATAIRES DEPUIS LE FORMULAIRE (si configuré)
    let cosigners = [];
    if (action.cosignersConfig?.formId) {
      cosigners = await extractCosignersFromForm({
        formId: action.cosignersConfig.formId,
        prospectId,
        projectType,
        config: action.cosignersConfig
      });
      
      logger.debug('Co-signataires extraits avant génération PDF', { 
        count: cosigners.length,
        cosigners
      });

      // ⚠️ BLOQUER si le formulaire n'est pas encore rempli/approuvé
      // On vérifie si le formulaire existe dans client_form_panels
      const { data: formPanel } = await supabase
        .from('client_form_panels')
        .select('id, status')
        .eq('prospect_id', prospectId)
        .eq('form_id', action.cosignersConfig.formId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!formPanel) {
        logger.warn('⏸️ Formulaire co-signataires non encore rempli, attente...', { 
          formId: action.cosignersConfig.formId 
        });
        toast({
          title: "⏸️ En attente",
          description: "Le client doit d'abord remplir le formulaire des co-signataires",
          className: "bg-amber-500 text-white",
        });
        return; // ⛔ STOP - on ne génère pas le contrat
      }

      if (formPanel.status !== 'approved') {
        logger.warn('⏸️ Formulaire co-signataires en attente d\'approbation', { 
          formId: action.cosignersConfig.formId,
          status: formPanel.status
        });
        toast({
          title: "⏸️ En attente d'approbation",
          description: "Le formulaire des co-signataires doit être approuvé avant génération du contrat",
          className: "bg-amber-500 text-white",
        });
        return; // ⛔ STOP - on ne génère pas le contrat
      }
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
        projectType,
        cosignersCount: cosigners.length
      });

      toast({
        title: "📄 Génération du contrat...",
        description: "Création du PDF en cours",
        className: "bg-blue-500 text-white",
      });

      // Exécuter la génération + upload AVEC les cosigners
      const result = await executeContractSignatureAction({
        templateId: action.templateId,
        projectType,
        prospectId,
        cosigners, // ⭐ Passer les cosigners
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

      // 🔥 AJOUTER LES CO-SIGNATAIRES DÉJÀ EXTRAITS
      for (const cosigner of cosigners) {
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

      logger.debug('Signers construits pour procédure', { 
        principal: 1,
        cosignersCount: cosigners.length,
        totalSigners: signers.length
      });

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
 * Extrait les co-signataires depuis un formulaire rempli
 * en utilisant la configuration de mapping des champs
 * @param {Object} params
 * @param {string} params.formId - ID du formulaire
 * @param {string} params.prospectId - ID du prospect
 * @param {string} params.projectType - Type de projet
 * @param {Object} params.config - Configuration du mapping (countField, nameField, emailField, phoneField)
 * @returns {Promise<Array>} - Tableau de co-signataires [{name, email, phone}]
 */
async function extractCosignersFromForm({ formId, prospectId, projectType, config }) {
  try {
    logger.debug('Extraction co-signataires depuis formulaire', { formId, config });

    // 1. Récupérer le formulaire rempli depuis client_form_panels
    // ⚡ Prend la dernière soumission APPROUVÉE de ce formulaire
    const { data: formPanel, error: formError } = await supabase
      .from('client_form_panels')
      .select('form_data')
      .eq('prospect_id', prospectId)
      .eq('form_id', formId)
      .eq('status', 'approved') // Uniquement approuvé
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (formError) {
      logger.error('Erreur récupération formulaire', formError);
      return [];
    }

    if (!formPanel || !formPanel.form_data) {
      logger.warn('Formulaire non trouvé ou non rempli', { formId, prospectId });
      return [];
    }

    const formData = formPanel.form_data;
    logger.debug('Données formulaire récupérées', { formData });

    // 2. Lire le nombre de co-signataires
    const count = parseInt(formData[config.countField] || 0, 10);
    
    if (count === 0 || isNaN(count)) {
      logger.debug('Aucun co-signataire trouvé', { countField: config.countField, value: formData[config.countField] });
      return [];
    }

    logger.debug(`${count} co-signataire(s) détecté(s)`);

    // 3. Extraire les données de chaque co-signataire
    const cosigners = [];
    
    for (let i = 0; i < count; i++) {
      // ⚡ Format repeater: {countField}_repeat_{index}_{fieldId}
      // Ex: "field-nombre_repeat_0_field-nom"
      const nameKey = `${config.countField}_repeat_${i}_${config.nameField}`;
      const emailKey = `${config.countField}_repeat_${i}_${config.emailField}`;
      const phoneKey = config.phoneField ? `${config.countField}_repeat_${i}_${config.phoneField}` : null;

      const name = formData[nameKey];
      const email = formData[emailKey];
      const phone = phoneKey ? formData[phoneKey] : '';

      // Email est obligatoire pour être un signataire valide
      if (email && email.trim() !== '') {
        cosigners.push({
          name: name || '',
          email: email.trim(),
          phone: phone || ''
        });
        logger.debug(`Co-signataire ${i} extrait (format repeater)`, { nameKey, emailKey, phoneKey, name, email, phone });
      } else {
        logger.warn(`Co-signataire ${i} ignoré (email manquant)`, { nameKey, emailKey, phoneKey });
      }
    }

    logger.debug('Extraction terminée', { totalCosigners: cosigners.length });
    return cosigners;

  } catch (error) {
    logger.error('Erreur extraction co-signataires', { error: error.message });
    return [];
  }
}

/**
 * Vérifie si les prérequis d'une action sont remplis
 * (toutes les actions précédentes doivent être terminées)
 * 
 * @param {Object} params
 * @param {Object} params.action - Action à vérifier
 * @param {Array} params.previousActions - Actions précédentes dans le workflow
 * @param {string} params.prospectId - ID du prospect
 * @param {string} params.projectType - Type de projet
 * @returns {Promise<boolean>} - true si l'action peut être exécutée
 */
async function checkActionPrerequisites({ action, previousActions, prospectId, projectType }) {
  try {
    // Vérifier chaque action précédente
    for (const prevAction of previousActions) {
      // Ignorer les actions sans type ou 'none'
      if (!prevAction.type || prevAction.type === 'none') continue;

      // Vérifier selon le type d'action
      if (prevAction.type === 'show_form') {
        // Vérifier que le formulaire a été rempli ET approuvé
        const { data: formPanel } = await supabase
          .from('client_form_panels')
          .select('id, status')
          .eq('prospect_id', prospectId)
          .eq('form_id', prevAction.formId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!formPanel) {
          logger.debug('⏸️ Formulaire requis non encore envoyé/rempli', {
            formId: prevAction.formId,
            blockedAction: action.type
          });
          return false; // ⛔ Bloquer
        }

        if (formPanel.status !== 'approved') {
          logger.debug('⏸️ Formulaire requis non encore approuvé', {
            formId: prevAction.formId,
            status: formPanel.status,
            blockedAction: action.type
          });
          return false; // ⛔ Bloquer
        }

        logger.debug('✅ Formulaire prérequis validé', {
          formId: prevAction.formId,
          status: formPanel.status
        });
      }

      // TODO: Ajouter d'autres vérifications pour request_document, open_payment, etc.
    }

    // Tous les prérequis sont OK
    return true;
  } catch (error) {
    logger.error('Erreur vérification prérequis', { error: error.message });
    return false; // En cas d'erreur, bloquer par sécurité
  }
}
