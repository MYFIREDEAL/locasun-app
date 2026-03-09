/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CATALOGUE V2 — Read-Only Action Catalog
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Expose les ressources V1 à V2 pour affichage/configuration uniquement.
 * 
 * ⚠️ CONTRAINTES STRICTES:
 *   ❌ Aucune exécution
 *   ❌ Aucune modification de logique V1
 *   ❌ Pas de dépendances template → formulaires
 *   ✅ Lecture seule
 *   ✅ Utilisable par V2 uniquement pour affichage/config
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES D'ACTIONS DISPONIBLES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Types d'actions supportés par V2 (phase 1)
 * Correspond aux types V1: show_form, start_signature
 */
export const ACTION_TYPES = {
  FORM: {
    id: 'FORM',
    v1Type: 'show_form',
    label: 'Formulaire',
    icon: '📝',
    description: 'Envoyer un formulaire au destinataire',
  },
  SIGNATURE: {
    id: 'SIGNATURE',
    v1Type: 'start_signature',
    label: 'Signature',
    icon: '✍️',
    description: 'Lancer une procédure de signature de contrat',
  },
  MESSAGE: {
    id: 'MESSAGE',
    v1Type: 'send_message',
    label: 'Message',
    icon: '💬',
    description: 'Envoyer un message conversationnel avec boutons de validation client',
  },
  PAYMENT: {
    id: 'PAYMENT',
    v1Type: 'open_payment', // Mock - Stripe non intégré
    label: 'Paiement',
    icon: '💳',
    description: 'Ouvrir un paiement (Stripe - bientôt disponible)',
    isMock: true, // Flag pour indiquer que c'est un mock
  },
};

/**
 * Liste des types d'actions pour les sélecteurs
 * @returns {Array<{id: string, label: string, icon: string, description: string}>}
 */
export function getActionTypesList() {
  return Object.values(ACTION_TYPES);
}

/**
 * Récupère un type d'action par son ID
 * @param {string} actionTypeId - 'FORM' ou 'SIGNATURE'
 * @returns {Object|null}
 */
export function getActionTypeById(actionTypeId) {
  return ACTION_TYPES[actionTypeId] || null;
}

/**
 * Convertit un type V2 vers son équivalent V1
 * @param {string} v2Type - 'FORM' ou 'SIGNATURE'
 * @returns {string} - 'show_form' ou 'start_signature'
 */
export function v2TypeToV1Type(v2Type) {
  const actionType = ACTION_TYPES[v2Type];
  return actionType?.v1Type || null;
}

/**
 * Convertit un type V1 vers son équivalent V2
 * @param {string} v1Type - 'show_form' ou 'start_signature'
 * @returns {string} - 'FORM' ou 'SIGNATURE'
 */
export function v1TypeToV2Type(v1Type) {
  const entry = Object.entries(ACTION_TYPES).find(([, config]) => config.v1Type === v1Type);
  return entry ? entry[0] : null;
}

/**
 * Convertit une cible V2 vers la valeur hasClientAction V1
 * @param {string|string[]} v2Target - 'CLIENT', 'COMMERCIAL', 'PARTENAIRE' ou array
 * @returns {boolean|null} - true (client), false (commercial), null (partenaire)
 */
export function v2TargetToV1HasClientAction(v2Target) {
  // Si c'est un tableau, prendre le premier élément
  const target = Array.isArray(v2Target) ? v2Target[0] : v2Target;
  
  const targetConfig = TARGET_AUDIENCES[target];
  if (!targetConfig) {
    console.warn('[catalogueV2] Target inconnu:', target);
    return true; // Par défaut: client
  }
  return targetConfig.v1Value;
}

/**
 * Convertit une valeur hasClientAction V1 vers une cible V2
 * @param {boolean|null} hasClientAction - true, false, ou null
 * @returns {string} - 'CLIENT', 'COMMERCIAL', ou 'PARTENAIRE'
 */
export function v1HasClientActionToV2Target(hasClientAction) {
  if (hasClientAction === true) return 'CLIENT';
  if (hasClientAction === false) return 'COMMERCIAL';
  return 'PARTENAIRE';
}

// ─────────────────────────────────────────────────────────────────────────────
// CIBLES DISPONIBLES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cibles possibles pour une action
 */
export const TARGET_AUDIENCES = {
  CLIENT: {
    id: 'CLIENT',
    v1Value: true, // hasClientAction = true
    label: 'Client',
    icon: '👤',
    description: 'Action destinée au client',
  },
  COMMERCIAL: {
    id: 'COMMERCIAL',
    v1Value: false, // hasClientAction = false
    label: 'Commercial',
    icon: '💼',
    description: 'Action destinée au commercial',
  },
  PARTENAIRE: {
    id: 'PARTENAIRE',
    v1Value: null, // hasClientAction = null (type = partner_task)
    label: 'Partenaire',
    icon: '🤝',
    description: 'Action destinée au partenaire',
  },
};

/**
 * Liste des cibles pour les sélecteurs
 * @returns {Array<{id: string, label: string, icon: string, description: string}>}
 */
export function getTargetAudiencesList() {
  return Object.values(TARGET_AUDIENCES);
}

/**
 * Récupère une cible par son ID
 * @param {string} targetId - 'CLIENT', 'COMMERCIAL', ou 'PARTENAIRE'
 * @returns {Object|null}
 */
export function getTargetAudienceById(targetId) {
  return TARGET_AUDIENCES[targetId] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODES DE GESTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Modes de gestion (qui déclenche l'action)
 */
export const MANAGEMENT_MODES = {
  AI: {
    id: 'AI',
    v1Value: 'automatic',
    label: 'IA',
    icon: '✨',
    description: "L'IA déclenche automatiquement l'action",
  },
  HUMAN: {
    id: 'HUMAN',
    v1Value: 'manual',
    label: 'Humain',
    icon: '👤',
    description: 'Le commercial déclenche manuellement',
  },
};

/**
 * Liste des modes de gestion pour les sélecteurs
 */
export function getManagementModesList() {
  return Object.values(MANAGEMENT_MODES);
}

// ─────────────────────────────────────────────────────────────────────────────
// MODES DE VÉRIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Modes de vérification (après soumission formulaire)
 */
export const VERIFICATION_MODES = {
  AI: {
    id: 'AI',
    v1Value: 'ai',
    label: 'IA',
    icon: '✨',
    description: "L'IA vérifie automatiquement",
  },
  HUMAN: {
    id: 'HUMAN',
    v1Value: 'human',
    label: 'Humain',
    icon: '👤',
    description: 'Le commercial vérifie manuellement',
  },
};

/**
 * Liste des modes de vérification pour les sélecteurs
 */
export function getVerificationModesList() {
  return Object.values(VERIFICATION_MODES);
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOGUE FORMULAIRES (READ-ONLY)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transforme les formulaires Supabase en catalogue read-only pour V2
 * 
 * @param {Object} supabaseForms - Objet formulaires depuis useSupabaseForms
 * @returns {Array<{id: string, name: string, audience: string}>}
 * 
 * @example
 * const { forms } = useSupabaseForms(organizationId);
 * const catalogue = getFormsCatalogue(forms);
 * // => [{ id: 'form-1', name: 'Formulaire Client', audience: 'client' }, ...]
 */
export function getFormsCatalogue(supabaseForms) {
  if (!supabaseForms || typeof supabaseForms !== 'object') {
    return [];
  }

  return Object.values(supabaseForms).map((form) => ({
    id: form.id,
    name: form.name,
    audience: form.audience || 'client',
  }));
}

/**
 * Filtre les formulaires par audience
 * 
 * @param {Object} supabaseForms - Objet formulaires depuis useSupabaseForms
 * @param {string} audience - 'client' | 'internal'
 * @returns {Array<{id: string, name: string}>}
 */
export function getFormsCatalogueByAudience(supabaseForms, audience) {
  return getFormsCatalogue(supabaseForms).filter(
    (form) => form.audience === audience
  );
}

/**
 * Récupère les formulaires destinés aux clients (pour actions V2)
 * 
 * @param {Object} supabaseForms - Objet formulaires depuis useSupabaseForms
 * @returns {Array<{id: string, name: string}>}
 */
export function getClientFormsCatalogue(supabaseForms) {
  return getFormsCatalogueByAudience(supabaseForms, 'client');
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOGUE TEMPLATES CONTRAT (READ-ONLY)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transforme les templates contrat Supabase en catalogue read-only pour V2
 * 
 * @param {Array} supabaseTemplates - Array templates depuis useSupabaseContractTemplates
 * @returns {Array<{id: string, name: string, projectType: string, isActive: boolean}>}
 * 
 * @example
 * const { templates } = useSupabaseContractTemplates(organizationId);
 * const catalogue = getContractTemplatesCatalogue(templates);
 * // => [{ id: 'template-1', name: 'Contrat PDB', projectType: 'PDB', isActive: true }, ...]
 */
export function getContractTemplatesCatalogue(supabaseTemplates) {
  if (!Array.isArray(supabaseTemplates)) {
    return [];
  }

  return supabaseTemplates.map((template) => ({
    id: template.id,
    name: template.name,
    projectType: template.projectType || null,
    isActive: template.isActive ?? true,
  }));
}

/**
 * Récupère uniquement les templates actifs
 * 
 * @param {Array} supabaseTemplates - Array templates depuis useSupabaseContractTemplates
 * @returns {Array<{id: string, name: string, projectType: string}>}
 */
export function getActiveContractTemplatesCatalogue(supabaseTemplates) {
  return getContractTemplatesCatalogue(supabaseTemplates).filter(
    (template) => template.isActive
  );
}

/**
 * Filtre les templates par type de projet
 * 
 * @param {Array} supabaseTemplates - Array templates depuis useSupabaseContractTemplates
 * @param {string} projectType - Type de projet (ex: 'PDB', 'ACC')
 * @returns {Array<{id: string, name: string}>}
 */
export function getContractTemplatesByProjectType(supabaseTemplates, projectType) {
  return getActiveContractTemplatesCatalogue(supabaseTemplates).filter(
    (template) => !template.projectType || template.projectType === projectType
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE VALIDATION (READ-ONLY)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si un type d'action est valide
 * @param {string} actionType - 'FORM' ou 'SIGNATURE'
 * @returns {boolean}
 */
export function isValidActionType(actionType) {
  return actionType in ACTION_TYPES;
}

/**
 * Vérifie si une cible est valide
 * @param {string} target - 'CLIENT', 'COMMERCIAL', ou 'PARTENAIRE'
 * @returns {boolean}
 */
export function isValidTarget(target) {
  return target in TARGET_AUDIENCES;
}

/**
 * Vérifie si un mode de gestion est valide
 * @param {string} mode - 'AI' ou 'HUMAN'
 * @returns {boolean}
 */
export function isValidManagementMode(mode) {
  return mode in MANAGEMENT_MODES;
}

/**
 * Vérifie si un mode de vérification est valide
 * @param {string} mode - 'AI' ou 'HUMAN'
 * @returns {boolean}
 */
export function isValidVerificationMode(mode) {
  return mode in VERIFICATION_MODES;
}

/**
 * Vérifie si un formId existe dans le catalogue
 * @param {Object} supabaseForms - Objet formulaires depuis useSupabaseForms
 * @param {string} formId - ID du formulaire à vérifier
 * @returns {boolean}
 */
export function isValidFormId(supabaseForms, formId) {
  if (!supabaseForms || !formId) return false;
  return formId in supabaseForms;
}

/**
 * Vérifie si un templateId existe dans le catalogue
 * @param {Array} supabaseTemplates - Array templates depuis useSupabaseContractTemplates
 * @param {string} templateId - ID du template à vérifier
 * @returns {boolean}
 */
export function isValidTemplateId(supabaseTemplates, templateId) {
  if (!Array.isArray(supabaseTemplates) || !templateId) return false;
  return supabaseTemplates.some((t) => t.id === templateId);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT PAR DÉFAUT
// ─────────────────────────────────────────────────────────────────────────────

export default {
  // Types
  ACTION_TYPES,
  TARGET_AUDIENCES,
  MANAGEMENT_MODES,
  VERIFICATION_MODES,
  
  // Getters listes
  getActionTypesList,
  getTargetAudiencesList,
  getManagementModesList,
  getVerificationModesList,
  
  // Catalogue formulaires
  getFormsCatalogue,
  getClientFormsCatalogue,
  getFormsCatalogueByAudience,
  
  // Catalogue templates
  getContractTemplatesCatalogue,
  getActiveContractTemplatesCatalogue,
  getContractTemplatesByProjectType,
  
  // Validation
  isValidActionType,
  isValidTarget,
  isValidManagementMode,
  isValidVerificationMode,
  isValidFormId,
  isValidTemplateId,
  
  // Conversion V1 <-> V2
  v2TypeToV1Type,
  v1TypeToV2Type,
  v2TargetToV1HasClientAction,
  v1HasClientActionToV2Target,
};
