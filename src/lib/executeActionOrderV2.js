/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXECUTE ACTION ORDER V2 → V1
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Point d'entrée UNIQUE pour exécuter un ActionOrder généré par V2 via V1.
 * 
 * ⚠️ SÉCURITÉ CRITIQUE:
 *    - Contrôlé par feature flag EXECUTION_FROM_V2
 *    - Si flag OFF → rien ne s'exécute
 *    - Si _meta.isSimulation === true → simulation seulement
 *    - Rollback immédiat = flag OFF dans workflowV2Config.js
 * 
 * Actions supportées:
 *    - FORM → envoi formulaire au client/commercial
 *    - SIGNATURE → lancement procédure de signature
 * 
 * ❌ AUCUN changement dans ProspectDetailsAdmin V1
 * ❌ AUCUNE cascade automatique
 * ❌ AUCUN déclenchement hors feature flag
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/lib/supabase';
import { isExecutionFromV2Enabled, logV2 } from '@/lib/workflowV2Config';
import { toast } from '@/components/ui/use-toast';
import { executeContractSignatureAction } from '@/lib/contractPdfGenerator';
import { executePartnerTaskAction } from '@/hooks/useWorkflowExecutor';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ExecutionResult
 * @property {boolean} success - Si l'exécution a réussi
 * @property {string} status - 'executed' | 'simulated' | 'blocked' | 'error'
 * @property {string} message - Message descriptif
 * @property {Object} [data] - Données retournées par l'exécution
 */

// ─────────────────────────────────────────────────────────────────────────────
// FONCTION PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exécute un ActionOrder généré par V2 via les mécanismes V1
 * 
 * ⚠️ POINT D'ENTRÉE UNIQUE V2 → V1
 * 
 * @param {Object} order - ActionOrder généré par buildActionOrder()
 * @param {Object} [context] - Contexte d'exécution optionnel
 * @param {string} [context.organizationId] - ID de l'organisation
 * @param {Object} [context.adminUser] - Utilisateur admin actif
 * @returns {Promise<ExecutionResult>}
 */
export async function executeActionOrder(order, context = {}) {
  const startTime = Date.now();
  
  // ─────────────────────────────────────────────────────────────────────────
  // GARDE 1: Feature flag
  // ─────────────────────────────────────────────────────────────────────────
  if (!isExecutionFromV2Enabled()) {
    logV2('⛔ executeActionOrder BLOCKED - Flag EXECUTION_FROM_V2 is OFF', { orderId: order?.id });
    
    return {
      success: false,
      status: 'blocked',
      message: 'Exécution V2→V1 désactivée (flag OFF)',
      data: { orderId: order?.id, flagStatus: 'OFF' },
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // GARDE 2: Simulation check
  // ─────────────────────────────────────────────────────────────────────────
  if (order?._meta?.isSimulation === true) {
    logV2('🎭 executeActionOrder SIMULATED - Order is marked as simulation', { orderId: order?.id });
    
    return {
      success: true,
      status: 'simulated',
      message: 'Mode simulation - Aucune exécution réelle',
      data: { orderId: order?.id, actionType: order?.actionType },
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // GARDE 3: Validation de l'ordre
  // ─────────────────────────────────────────────────────────────────────────
  if (!order) {
    return {
      success: false,
      status: 'error',
      message: 'ActionOrder invalide (null)',
      data: null,
    };
  }
  
  if (!order.prospectId) {
    return {
      success: false,
      status: 'error',
      message: 'prospectId manquant dans l\'ActionOrder',
      data: { orderId: order.id },
    };
  }
  
  if (!order.actionType) {
    return {
      success: false,
      status: 'error',
      message: 'actionType manquant dans l\'ActionOrder',
      data: { orderId: order.id },
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // EXÉCUTION
  // ─────────────────────────────────────────────────────────────────────────
  
  logV2('🚀 executeActionOrder START', { 
    orderId: order.id, 
    actionType: order.actionType,
    target: order.target,
    prospectId: order.prospectId,
  });
  
  try {
    let result;
    
    // ───────────────────────────────────────────────────────────────────────
    // 🤝 CAS SPÉCIAL: Actions PARTENAIRE
    // ───────────────────────────────────────────────────────────────────────
    if (order.target === 'PARTENAIRE') {
      logV2('🤝 executeActionOrder PARTENAIRE - Récupération config', { 
        orderId: order.id,
        moduleId: order.moduleId, 
        projectType: order.projectType,
        prospectId: order.prospectId,
      });

      // Récupérer organizationId depuis le prospect
      const { data: prospectData, error: prospectError } = await supabase
        .from('prospects')
        .select('organization_id')
        .eq('id', order.prospectId)
        .single();

      if (prospectError || !prospectData?.organization_id) {
        logV2('❌ executeActionOrder PARTENAIRE - Prospect non trouvé', { 
          error: prospectError?.message,
          prospectId: order.prospectId,
        });
        
        return {
          success: false,
          status: 'error',
          message: 'Impossible de récupérer les données du prospect',
          data: { orderId: order.id, error: prospectError?.message },
        };
      }

      // Récupérer config depuis workflow_module_templates
      // ⚠️ IMPORTANT: module_id en DB contient le format complet "project_type:module_name"
      const fullModuleId = `${order.projectType}:${order.moduleId}`;
      
      const { data: templateData, error: templateError } = await supabase
        .from('workflow_module_templates')
        .select('config')
        .eq('organization_id', prospectData.organization_id)
        .eq('project_type', order.projectType)
        .eq('module_id', fullModuleId)
        .single();

      if (templateError || !templateData?.config) {
        logV2('⚠️ executeActionOrder PARTENAIRE - Config module non trouvée', { 
          error: templateError?.message,
          organizationId: prospectData.organization_id,
          projectType: order.projectType,
          moduleId: order.moduleId,
          fullModuleId,
        });
        
        toast({
          title: "⚠️ Configuration manquante",
          description: "Module non configuré pour ce type de projet",
          variant: "destructive",
        });
        
        return {
          success: false,
          status: 'error',
          message: 'Configuration module introuvable',
          data: { orderId: order.id, moduleId: order.moduleId },
        };
      }

      // Extraire actionConfig
      const actionConfig = templateData.config?.actionConfig || {};

      // Validation partnerId
      if (!actionConfig.partnerId) {
        logV2('⚠️ executeActionOrder PARTENAIRE - partnerId manquant', { 
          orderId: order.id,
          moduleId: order.moduleId,
          actionConfig,
        });
        
        toast({
          title: "⚠️ Configuration incomplète",
          description: "Aucun partenaire sélectionné pour cette action",
          variant: "destructive",
        });
        
        return {
          success: false,
          status: 'error',
          message: 'partnerId manquant dans actionConfig',
          data: { orderId: order.id, moduleId: order.moduleId },
        };
      }

      // Bridge V2 → V1: Appeler moteur existant
      await executePartnerTaskAction({
        action: {
          type: 'partner_task',
          partnerId: actionConfig.partnerId,
          partnerInstructions: actionConfig.instructions || '',
          isBlocking: actionConfig.isBlocking !== false,
        },
        prospectId: order.prospectId,
        projectType: order.projectType,
      });

      logV2('✅ executeActionOrder PARTENAIRE - Mission créée', { 
        orderId: order.id,
        moduleId: order.moduleId, 
        partnerId: actionConfig.partnerId,
        isBlocking: actionConfig.isBlocking,
      });
      
      return {
        success: true,
        status: 'executed',
        message: 'Mission partenaire créée avec succès',
        data: { 
          orderId: order.id, 
          partnerId: actionConfig.partnerId,
          isBlocking: actionConfig.isBlocking !== false,
        },
      };
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // SWITCH NORMAL: FORM / SIGNATURE
    // ───────────────────────────────────────────────────────────────────────
    switch (order.actionType) {
      case 'FORM':
        result = await executeFormAction(order, context);
        break;
        
      case 'SIGNATURE':
        result = await executeSignatureAction(order, context);
        break;
        
      default:
        result = {
          success: false,
          status: 'error',
          message: `Type d'action non supporté: ${order.actionType}`,
          data: { orderId: order.id, actionType: order.actionType },
        };
    }
    
    const duration = Date.now() - startTime;
    logV2(`✅ executeActionOrder COMPLETE (${duration}ms)`, result);
    
    return result;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logV2(`❌ executeActionOrder ERROR (${duration}ms)`, { error: error.message });
    
    return {
      success: false,
      status: 'error',
      message: `Erreur d'exécution: ${error.message}`,
      data: { orderId: order.id, error: error.message },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXÉCUTION FORM (show_form V1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exécute une action FORM via les mécanismes V1
 * 
 * Comportement:
 *   1. Crée un client_form_panel pour chaque formId
 *   2. Envoie un message chat avec le lien du formulaire
 *   3. Respecte hasClientAction (target)
 * 
 * @param {Object} order - ActionOrder
 * @param {Object} context - Contexte d'exécution
 * @returns {Promise<ExecutionResult>}
 */
async function executeFormAction(order, context) {
  const { prospectId, projectType, formIds, message, hasClientAction, target } = order;
  
  if (!formIds || formIds.length === 0) {
    return {
      success: false,
      status: 'error',
      message: 'Aucun formulaire spécifié dans l\'ActionOrder',
      data: { orderId: order.id },
    };
  }
  
  logV2('📋 executeFormAction', { prospectId, formIds, target });
  
  const createdPanels = [];
  const errors = [];
  
  for (const formId of formIds) {
    try {
      // Générer un panel_id unique (format V1 compatible)
      const panelId = `panel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Extraire la config reminder depuis l'ActionOrder
      const reminderConfig = order.reminderConfig || {};
      const reminderEnabled = reminderConfig.enabled ?? false;
      const reminderDelayDays = reminderConfig.delayDays ?? 1;
      const maxRemindersBeforeTask = reminderConfig.maxRemindersBeforeTask ?? 3;
      
      // 1. Créer un client_form_panel avec verification_mode + config reminder
      const { data: panel, error: panelError } = await supabase
        .from('client_form_panels')
        .insert({
          panel_id: panelId,
          prospect_id: prospectId,
          project_type: projectType || 'general',
          form_id: formId,
          status: 'pending',
          message_timestamp: Date.now().toString(),
          // ✅ Nom de l'étape pour identifier les actions multi-step
          step_name: order.moduleName || order.moduleId || null,
          // ✅ ID unique de l'action V2 (pour résolution multi-actions)
          action_id: order.actionId || null,
          // ✅ Source unique de vérité pour la vérification humaine
          verification_mode: order.verificationMode || 'HUMAN',
          // ✅ Config relances automatiques
          auto_reminder_enabled: reminderEnabled,
          reminder_delay_days: reminderDelayDays,
          max_reminders_before_task: maxRemindersBeforeTask,
          reminder_count: 0,
          last_reminder_at: null,
          task_created: false,
        })
        .select()
        .single();
      
      if (panelError) {
        errors.push({ formId, error: panelError.message });
        logV2('❌ Erreur création panel', { formId, error: panelError.message });
      } else {
        createdPanels.push(panel);
        logV2('✅ Panel créé avec config reminder', { 
          formId, 
          panelId: panel.id,
          reminderEnabled,
          reminderDelayDays,
          maxRemindersBeforeTask,
        });
      }
      
      // 2. Envoyer un message chat (optionnel)
      if (panel && hasClientAction === true) {
        await sendChatMessage({
          prospectId,
          projectType,
          message: message || `Un formulaire est disponible à compléter.`,
          metadata: {
            type: 'form_request',
            formId,
            panelId: panel.id,
            source: 'workflow-v2',
          },
        });
      }
      
    } catch (err) {
      errors.push({ formId, error: err.message });
    }
  }
  
  // Toast de feedback
  if (createdPanels.length > 0) {
    toast({
      title: "✅ Formulaire(s) envoyé(s)",
      description: `${createdPanels.length} formulaire(s) créé(s) via V2`,
    });
  }
  
  return {
    success: errors.length === 0,
    status: errors.length === 0 ? 'executed' : 'error',
    message: errors.length === 0 
      ? `${createdPanels.length} formulaire(s) envoyé(s)`
      : `${createdPanels.length} réussi(s), ${errors.length} erreur(s)`,
    data: {
      orderId: order.id,
      createdPanels: createdPanels.map(p => p.id),
      errors,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXÉCUTION SIGNATURE (start_signature V1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exécute une action SIGNATURE via les mécanismes V1
 * 
 * Comportement:
 *   1. Récupère les données du prospect
 *   2. Crée une procédure de signature PENDING
 *   3. Envoie un message chat avec le lien de signature
 * 
 * @param {Object} order - ActionOrder
 * @param {Object} context - Contexte d'exécution
 * @returns {Promise<ExecutionResult>}
 */
async function executeSignatureAction(order, context) {
  const { 
    prospectId, 
    projectType, 
    formIds,
    templateIds, 
    signatureType, 
    message,
    hasClientAction,
  } = order;
  
  logV2('✍️ executeSignatureAction', { prospectId, templateIds, signatureType });
  
  // 1. Récupérer les données du prospect
  const { data: prospect, error: prospectError } = await supabase
    .from('prospects')
    .select('id, name, email, company_name, phone, organization_id, form_data')
    .eq('id', prospectId)
    .single();
  
  if (prospectError || !prospect) {
    return {
      success: false,
      status: 'error',
      message: 'Prospect non trouvé',
      data: { prospectId, error: prospectError?.message },
    };
  }
  
  // 2. Extraire les données du formulaire (si formIds fourni)
  const formData = {};
  if (formIds && formIds.length > 0 && prospect.form_data) {
    for (const formId of formIds) {
      const data = prospect.form_data?.[projectType]?.[formId];
      if (data) {
        Object.assign(formData, data);
      }
    }
  }
  
  // 3. Préparer les données du signataire
  const signerName = prospect.name || prospect.company_name || prospect.email?.split('@')[0] || 'Client';
  const signerEmail = prospect.email || null;
  
  if (!signerEmail) {
    return {
      success: false,
      status: 'error',
      message: 'Email du prospect manquant pour la signature',
      data: { prospectId },
    };
  }
  
  // 4. Générer le PDF via V1 (executeContractSignatureAction)
  //    Cette fonction: charge le template, génère le PDF, upload dans Storage, crée project_files
  const templateId = templateIds?.[0] || null;
  
  // ❌ GUARD BLOQUANT: Signature impossible sans template
  if (!templateId) {
    logV2('❌ ERREUR: Aucun template sélectionné - signature bloquée');
    return {
      success: false,
      status: 'error',
      message: 'Signature impossible : aucun template de signature sélectionné.',
      data: { prospectId },
    };
  }
  
  // ✅ Génération PDF réelle via V1
  logV2('📝 Génération PDF via V1', { templateId, formDataKeys: Object.keys(formData) });
  
  const pdfResult = await executeContractSignatureAction({
    templateId,
    projectType: projectType || 'general',
    prospectId,
    formData,
    organizationId: prospect.organization_id,
  });
  
  if (!pdfResult.success) {
    logV2('❌ Erreur génération PDF V1', { error: pdfResult.error });
    return {
      success: false,
      status: 'error',
      message: `Erreur génération PDF: ${pdfResult.error}`,
      data: { prospectId, error: pdfResult.error },
    };
  }
  
  const fileId = pdfResult.fileData.id;
  logV2('✅ PDF généré via V1', { fileId, fileName: pdfResult.fileData.file_name });
  
  // 5. Créer une procédure de signature PENDING (schéma Supabase existant)
  // 🔥 FIX: Générer access_token et expires_at pour que le lien fonctionne
  const accessToken = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours
  
  const { data: procedure, error: procedureError } = await supabase
    .from('signature_procedures')
    .insert({
      prospect_id: prospectId,
      project_type: projectType || 'general',
      file_id: fileId,  // ✅ Utilise le fileId du PDF généré (ou placeholder)
      status: 'pending',
      // 🔥 FIX: Ajouter les champs manquants
      access_token: accessToken,
      access_token_expires_at: expiresAt.toISOString(),
      signer_name: signerName,
      signer_email: signerEmail,
      signers: [
        {
          name: signerName,
          email: signerEmail,
          role: 'signer',
          status: 'pending',
          signed_at: null,
          access_token: accessToken, // 🔥 Token dans le tableau aussi
        }
      ],
      form_data: formData,
      signature_metadata: {
        source: 'workflow-v2',
        orderId: order.id,
        managementMode: order.managementMode,
        verificationMode: order.verificationMode,
        formIds: formIds,
        signatureType: signatureType || 'internal',
        message: message || 'Document à signer',
      },
      organization_id: prospect.organization_id,
    })
    .select()
    .single();
  
  if (procedureError) {
    logV2('❌ Erreur création procédure signature', { error: procedureError.message });
    return {
      success: false,
      status: 'error',
      message: `Erreur création procédure: ${procedureError.message}`,
      data: { prospectId, error: procedureError.message },
    };
  }
  
  logV2('✅ Procédure signature créée', { procedureId: procedure.id });
  
  // 5. Envoyer un message chat avec le LIEN DE SIGNATURE (comme V1)
  if (hasClientAction === true) {
    // Construire l'URL de signature (domaine production comme V1)
    const baseUrl = import.meta.env.PROD ? 'https://evatime.fr' : window.location.origin;
    const signatureUrl = `${baseUrl}/signature/${procedure.id}?token=${procedure.access_token}`;
    
    // Message HTML avec lien cliquable (format V1)
    const signatureMessage = `<a href="${signatureUrl}" target="_blank" style="color: #10b981; font-weight: 600; text-decoration: underline;">👉 Signer mon contrat</a>`;
    
    await sendChatMessage({
      prospectId,
      projectType,
      message: signatureMessage,
      organizationId: prospect.organization_id,
    });
    
    logV2('📝 Lien signature envoyé dans le chat', { procedureId: procedure.id, signatureUrl });
  }
  
  // 6. Toast de feedback
  toast({
    title: "✅ Signature lancée",
    description: `Procédure de signature créée via V2`,
  });
  
  return {
    success: true,
    status: 'executed',
    message: 'Procédure de signature créée',
    data: {
      orderId: order.id,
      procedureId: procedure.id,
      signerEmail,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: ENVOI MESSAGE CHAT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envoie un message dans le chat du prospect
 * @param {Object} params
 */
async function sendChatMessage({ prospectId, projectType, message, organizationId }) {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        prospect_id: prospectId,
        project_type: projectType || 'general',
        sender: 'pro', // 'pro' pour les messages admin (comme V1)
        text: message,
        read: false,
        organization_id: organizationId || null,
      });
    
    if (error) {
      logV2('❌ Erreur envoi message chat', { error: error.message });
      return;
    }
    
    logV2('💬 Message chat envoyé', { prospectId, projectType });
  } catch (error) {
    logV2('❌ Erreur envoi message chat', { error: error.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: VÉRIFIER SI EXÉCUTION POSSIBLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si un ActionOrder peut être exécuté (sans l'exécuter)
 * @param {Object} order - ActionOrder
 * @returns {{ canExecute: boolean, reason: string }}
 */
export function canExecuteActionOrder(order) {
  // Check flag
  if (!isExecutionFromV2Enabled()) {
    return { canExecute: false, reason: 'Flag EXECUTION_FROM_V2 désactivé' };
  }
  
  // Check simulation
  if (order?._meta?.isSimulation === true) {
    return { canExecute: false, reason: 'Mode simulation actif' };
  }
  
  // Check required fields
  if (!order?.prospectId) {
    return { canExecute: false, reason: 'prospectId manquant' };
  }
  
  if (!order?.actionType) {
    return { canExecute: false, reason: 'actionType manquant' };
  }
  
  // Check supported types
  if (!['FORM', 'SIGNATURE'].includes(order.actionType)) {
    return { canExecute: false, reason: `Type ${order.actionType} non supporté` };
  }
  
  return { canExecute: true, reason: 'Prêt pour exécution' };
}

export default {
  executeActionOrder,
  canExecuteActionOrder,
};
