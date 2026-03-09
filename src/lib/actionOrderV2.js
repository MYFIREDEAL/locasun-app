/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ACTION ORDER V2 - Générateur de commandes d'action (SIMULATION)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Génère des ActionOrder standardisés basés sur la configuration V2.
 * 
 * ⚠️ SIMULATION PURE - Aucune exécution, aucun appel V1, aucune persistance
 * 
 * Usage:
 *   const order = buildActionOrder({ moduleId, projectType, prospectId, actionConfig, message });
 *   // → JSON prêt pour affichage ou futur envoi à V1
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { v2TypeToV1Type, v2TargetToV1HasClientAction } from './catalogueV2';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ActionOrderInput
 * @property {string} moduleId - Identifiant du module (étape workflow)
 * @property {string} projectType - Type de projet (ACC, Centrale, etc.)
 * @property {string} prospectId - UUID du prospect
 * @property {Object} actionConfig - Configuration d'action V2
 * @property {string} [message] - Message à afficher (optionnel)
 */

/**
 * @typedef {Object} ActionOrder
 * @property {string} id - UUID unique de l'ordre
 * @property {string} version - Version du format (v2.0)
 * @property {string} createdAt - Timestamp ISO de création
 * @property {string} status - Statut de l'ordre (PENDING pour simulation)
 * 
 * @property {string} target - Cible V2 (CLIENT | COMMERCIAL | PARTENAIRE)
 * @property {boolean|null} hasClientAction - Cible V1 (true=client, false=commercial, null=partenaire)
 * @property {string} actionType - Type V2 (FORM | SIGNATURE)
 * @property {string} v1ActionType - Type V1 (show_form | start_signature)
 * 
 * @property {string[]} formIds - Liste des IDs de formulaires
 * @property {string[]} templateIds - Liste des IDs de templates (si signature)
 * @property {string|null} signatureType - Type de signature (yousign, docusign, null)
 * 
 * @property {string} managementMode - Mode de gestion (AI | HUMAN)
 * @property {string} verificationMode - Mode de vérification (AI | HUMAN)
 * 
 * @property {string} moduleId - ID du module source
 * @property {string} projectType - Type de projet
 * @property {string} prospectId - UUID du prospect cible
 * @property {string} message - Message à afficher
 * 
 * @property {Object} _meta - Métadonnées (debug)
 */

// ─────────────────────────────────────────────────────────────────────────────
// GÉNÉRATEUR UUID SIMPLE (pour simulation)
// ─────────────────────────────────────────────────────────────────────────────

function generateSimulationId() {
  return 'sim-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILDER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit un ActionOrder standardisé à partir d'une config V2
 * 
 * ⚠️ SIMULATION PURE - Ne déclenche rien, ne persiste rien
 * 
 * @param {ActionOrderInput} input - Données d'entrée
 * @returns {ActionOrder} Ordre d'action standardisé
 */
export function buildActionOrder({
  moduleId,
  moduleName,
  projectType,
  prospectId,
  actionConfig,
  actionIndex = 0,
  message = '',
}) {
  // Validation des entrées requises
  if (!moduleId) {
    throw new Error('[ActionOrder] moduleId est requis');
  }
  if (!prospectId) {
    throw new Error('[ActionOrder] prospectId est requis');
  }
  if (!actionConfig) {
    throw new Error('[ActionOrder] actionConfig est requis');
  }
  if (!actionConfig.actionType) {
    throw new Error('[ActionOrder] actionConfig.actionType est requis');
  }

  // Extraire les valeurs de la config
  const {
    targetAudience,
    actionType,
    allowedFormIds = [],
    allowedTemplateIds = [],
    templateId = null,  // ⚠️ Compat: ModuleConfigTab stocke templateId (singulier)
    managementMode = 'HUMAN',
    verificationMode = 'HUMAN',
    reminderConfig = null, // ✅ Config relances automatiques
  } = actionConfig;

  // Conversion V2 → V1
  const v1ActionType = v2TypeToV1Type(actionType);
  const hasClientAction = v2TargetToV1HasClientAction(targetAudience);
  
  // Déterminer le type de signature (si applicable)
  const signatureType = actionType === 'SIGNATURE' ? 'yousign' : null;
  
  // ⚠️ Fusionner templateId (singulier) et allowedTemplateIds (pluriel)
  const resolvedTemplateIds = templateId 
    ? [templateId, ...allowedTemplateIds.filter(id => id !== templateId)]
    : [...allowedTemplateIds];

  // Construire l'ordre
  const order = {
    // Identité
    id: generateSimulationId(),
    version: 'v2.0',
    createdAt: new Date().toISOString(),
    status: 'PENDING', // Toujours PENDING en simulation
    
    // Cible
    target: targetAudience,
    hasClientAction,
    
    // Action
    actionType,
    v1ActionType,
    
    // Ressources (formIds uniquement pour FORM, templateIds uniquement pour SIGNATURE)
    formIds: actionType === 'FORM' ? [...allowedFormIds] : [],
    templateIds: actionType === 'SIGNATURE' ? resolvedTemplateIds : [],
    signatureType,
    
    // Modes
    managementMode,
    verificationMode,
    
    // ✅ Config relances (si action = FORM et cible = CLIENT)
    reminderConfig: (actionType === 'FORM' && targetAudience === 'CLIENT' && reminderConfig) 
      ? {
          enabled: reminderConfig.enabled ?? false,
          delayDays: reminderConfig.delayDays ?? 1,
          maxRemindersBeforeTask: reminderConfig.maxRemindersBeforeTask ?? 3,
        }
      : null,
    
    // 💬 Config boutons (si action = MESSAGE)
    buttonLabels: actionType === 'MESSAGE' 
      ? {
          proceedLabel: actionConfig.buttonLabels?.proceedLabel || 'Valider ✓',
          needDataLabel: actionConfig.buttonLabels?.needDataLabel || "Besoin d'infos",
        }
      : null,
    
    // Contexte
    moduleId,
    moduleName: moduleName || moduleId,
    projectType: projectType || 'unknown',
    prospectId,
    actionIndex,
    actionId: `v2-${moduleId}-action-${actionIndex}`,
    message: message || `Action ${actionType} pour le module ${moduleId}`,
    
    // Métadonnées (debug)
    _meta: {
      generatedBy: 'V2-Simulator',
      isSimulation: true,
      timestamp: Date.now(),
    },
  };

  console.log('[V2 ActionOrder] Built (simulation)', { 
    id: order.id, 
    actionType: order.actionType,
    target: order.target,
    formCount: order.formIds.length,
  });

  return order;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS D'AFFICHAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formate un ActionOrder pour affichage lisible
 * @param {ActionOrder} order 
 * @returns {string} Résumé textuel
 */
export function formatActionOrderSummary(order) {
  if (!order) return 'Aucun ordre généré';
  
  const lines = [
    `🎯 Action: ${order.actionType}`,
    `👤 Cible: ${order.target}`,
    `📋 Formulaires: ${order.formIds.length > 0 ? order.formIds.join(', ') : 'Aucun'}`,
  ];
  
  if (order.actionType === 'SIGNATURE') {
    lines.push(`📝 Templates: ${order.templateIds.length > 0 ? order.templateIds.join(', ') : 'Aucun'}`);
    lines.push(`✍️ Type signature: ${order.signatureType || 'Non défini'}`);
  }
  
  if (order.actionType === 'MESSAGE') {
    lines.push(`✅ Bouton Valider: ${order.buttonLabels?.proceedLabel || 'Valider ✓'}`);
    lines.push(`❓ Bouton Besoin: ${order.buttonLabels?.needDataLabel || "Besoin d'infos"}`);
  }
  
  lines.push(`⚙️ Gestion: ${order.managementMode}`);
  lines.push(`✅ Vérification: ${order.verificationMode}`);
  lines.push(`💬 Message: ${order.message}`);
  
  return lines.join('\n');
}

/**
 * Retourne le JSON formaté pour copie
 * @param {ActionOrder} order 
 * @returns {string} JSON indenté
 */
export function getActionOrderJSON(order) {
  if (!order) return '{}';
  
  // Exclure _meta pour l'export
  const { _meta, ...exportOrder } = order;
  return JSON.stringify(exportOrder, null, 2);
}

/**
 * Valide qu'un ActionOrder peut être exécuté
 * @param {ActionOrder} order 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateActionOrder(order) {
  const errors = [];
  
  if (!order) {
    return { valid: false, errors: ['Ordre non défini'] };
  }
  
  if (!order.prospectId) {
    errors.push('prospectId manquant');
  }
  
  if (!order.actionType) {
    errors.push('actionType manquant');
  }
  
  if (!order.target) {
    errors.push('target manquant');
  }
  
  if (order.actionType === 'FORM' && (!order.formIds || order.formIds.length === 0)) {
    errors.push('Aucun formulaire sélectionné pour action FORM');
  }
  
  if (order.actionType === 'SIGNATURE' && (!order.formIds || order.formIds.length === 0)) {
    errors.push('Aucun formulaire de collecte pour SIGNATURE');
  }
  
  // MESSAGE: pas de formIds/templateIds requis — validation OK si actionType + target + prospectId
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS DEFAULT
// ─────────────────────────────────────────────────────────────────────────────

export default {
  buildActionOrder,
  formatActionOrderSummary,
  getActionOrderJSON,
  validateActionOrder,
};
