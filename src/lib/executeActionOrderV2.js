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
      
      // 1. Créer un client_form_panel avec verification_mode
      const { data: panel, error: panelError } = await supabase
        .from('client_form_panels')
        .insert({
          panel_id: panelId,
          prospect_id: prospectId,
          project_type: projectType || 'general',
          form_id: formId,
          status: 'pending',
          message_timestamp: Date.now().toString(),
          // ✅ Source unique de vérité pour la vérification humaine
          verification_mode: order.verificationMode || 'HUMAN',
        })
        .select()
        .single();
      
      if (panelError) {
        errors.push({ formId, error: panelError.message });
        logV2('❌ Erreur création panel', { formId, error: panelError.message });
      } else {
        createdPanels.push(panel);
        logV2('✅ Panel créé', { formId, panelId: panel.id });
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
  
  // 4. Créer un fichier placeholder dans project_files (file_id est NOT NULL)
  const { data: placeholderFile, error: fileError } = await supabase
    .from('project_files')
    .insert({
      prospect_id: prospectId,
      project_type: projectType || 'general',
      file_name: `signature_pending_${Date.now()}.pdf`,
      file_type: 'application/pdf',
      file_size: 0,
      storage_path: `signatures/${prospectId}/${Date.now()}_pending.pdf`,
      uploaded_by: null, // Sera rempli lors de la génération réelle
      organization_id: prospect.organization_id,
      field_label: 'Signature V2',
    })
    .select('id')
    .single();
  
  if (fileError) {
    logV2('❌ Erreur création fichier placeholder', { error: fileError.message });
    return {
      success: false,
      status: 'error',
      message: `Erreur création fichier: ${fileError.message}`,
      data: { prospectId, error: fileError.message },
    };
  }
  
  // 5. Créer une procédure de signature PENDING (schéma Supabase existant)
  const { data: procedure, error: procedureError } = await supabase
    .from('signature_procedures')
    .insert({
      prospect_id: prospectId,
      project_type: projectType || 'general',
      file_id: placeholderFile.id,  // OBLIGATOIRE - NOT NULL
      status: 'pending',
      signers: [
        {
          name: signerName,
          email: signerEmail,
          role: 'signer',
          status: 'pending',
          signed_at: null,
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
  
  // 5. Envoyer un message chat
  if (hasClientAction === true) {
    await sendChatMessage({
      prospectId,
      projectType,
      message: message || `Un document est prêt à être signé.`,
      metadata: {
        type: 'signature_request',
        procedureId: procedure.id,
        source: 'workflow-v2',
      },
    });
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
async function sendChatMessage({ prospectId, projectType, message, metadata }) {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        prospect_id: prospectId,
        project_type: projectType || 'general',
        sender: 'admin', // 'admin' ou 'client' (pas 'system')
        text: message,   // 'text' pas 'content'
        read: false,
        // metadata stocké dans d'autres colonnes si besoin
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
