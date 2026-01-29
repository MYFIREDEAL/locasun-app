/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIGURATION IA PAR MODULE - Workflow V2
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Définit le comportement de l'IA pour chaque module du workflow.
 * Utilisé par ModuleLiveCard pour personnaliser les interactions.
 * 
 * Structure:
 *   moduleId → {
 *     objective: string,      // Objectif principal du module
 *     instructions: string,   // Instructions pour l'IA
 *     buttonLabels: {...},    // Labels personnalisés des boutons
 *     allowedActions: [...],  // Actions autorisées
 *     knowledgeKey: string,   // Clé vers la base d'info
 *     tone: string,           // Ton de l'IA
 *     maxResponseLength: int  // Longueur max des réponses
 *     
 *     // ═══════════════════════════════════════════════════════════════════
 *     // NOUVELLES PROPRIÉTÉS V2 (Phase 2 - Config Actions)
 *     // ═══════════════════════════════════════════════════════════════════
 *     actionConfig: {
 *       targetAudience: 'CLIENT' | 'COMMERCIAL' | 'PARTENAIRE',
 *       actionType: 'FORM' | 'SIGNATURE' | null,
 *       allowedFormIds: string[],      // Liste des formIds autorisés
 *       allowedTemplateIds: string[],  // Liste des templateIds autorisés
 *       managementMode: 'AI' | 'HUMAN',
 *       verificationMode: 'AI' | 'HUMAN',
 *     }
 *   }
 * 
 * ⚠️ Phase 1: Stockage in-memory / JSON local
 * Phase 2+: Stockage Supabase (table `workflow_module_templates`)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES / STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ActionConfig
 * @property {'CLIENT'|'COMMERCIAL'|'PARTENAIRE'} targetAudience - Destinataire de l'action
 * @property {'FORM'|'SIGNATURE'|null} actionType - Type d'action à déclencher
 * @property {string[]} allowedFormIds - Liste des formIds autorisés pour cette étape
 * @property {string[]} allowedTemplateIds - Liste des templateIds autorisés pour signature
 * @property {'AI'|'HUMAN'} managementMode - Qui déclenche l'action
 * @property {'AI'|'HUMAN'} verificationMode - Qui vérifie après soumission
 */

/**
 * @typedef {Object} ModuleAIConfig
 * @property {string} objective - Objectif principal du module
 * @property {string} instructions - Instructions détaillées pour l'IA
 * @property {Object} buttonLabels - Labels des boutons
 * @property {string} buttonLabels.proceedLabel - Label du bouton PROCEED
 * @property {string} buttonLabels.needDataLabel - Label du bouton NEED_DATA
 * @property {string[]} allowedActions - Actions autorisées par l'IA
 * @property {string} knowledgeKey - Clé pour récupérer la base d'info
 * @property {string} tone - Ton de l'IA (professional, friendly, etc.)
 * @property {number} maxResponseLength - Longueur max des réponses (chars)
 * @property {ActionConfig} [actionConfig] - Configuration des actions V2 (optionnel)
 */

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIPTIONS DES ACTIONS (pour affichage READ_ONLY)
// ─────────────────────────────────────────────────────────────────────────────

export const ACTION_DESCRIPTIONS = {
  'answer_question': {
    label: 'Répondre aux questions',
    icon: '💬',
    description: 'Répond aux questions posées par l\'utilisateur',
  },
  'show_checklist': {
    label: 'Afficher la checklist',
    icon: '✅',
    description: 'Montre les éléments à vérifier pour cette étape',
  },
  'show_documents': {
    label: 'Lister les documents',
    icon: '📄',
    description: 'Affiche les documents requis ou disponibles',
  },
  'explain_clause': {
    label: 'Expliquer une clause',
    icon: '⚖️',
    description: 'Explique le contenu juridique d\'une clause',
  },
  'verify_owner': {
    label: 'Vérifier le propriétaire',
    icon: '🏠',
    description: 'Vérifie les informations du propriétaire foncier',
  },
  'calculate_tariff': {
    label: 'Calculer le tarif',
    icon: '💰',
    description: 'Calcule le tarif de vente optimal',
  },
  'check_eligibility': {
    label: 'Vérifier l\'éligibilité',
    icon: '🔍',
    description: 'Vérifie si le projet répond aux critères',
  },
  'explain_technical': {
    label: 'Expliquer techniquement',
    icon: '⚡',
    description: 'Fournit des explications techniques détaillées',
  },
  'final_check': {
    label: 'Vérification finale',
    icon: '🎯',
    description: 'Effectue une vérification complète avant validation',
  },
};

/**
 * Récupère la description d'une action
 * @param {string} actionId - Identifiant de l'action
 * @returns {Object} Description de l'action ou fallback
 */
export function getActionDescription(actionId) {
  return ACTION_DESCRIPTIONS[actionId] || {
    label: actionId,
    icon: '⚙️',
    description: 'Action personnalisée',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG PAR DÉFAUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration par défaut pour actionConfig (V2)
 * ⚠️ Valeurs neutres, aucune exécution
 */
export const DEFAULT_ACTION_CONFIG = {
  targetAudience: 'CLIENT',        // Par défaut: client
  actionType: null,                // Aucune action par défaut
  allowedFormIds: [],              // Aucun formulaire par défaut
  allowedTemplateIds: [],          // Aucun template par défaut
  managementMode: 'HUMAN',         // Par défaut: humain gère
  verificationMode: 'HUMAN',       // Par défaut: humain vérifie
  completionTrigger: null,         // Trigger de fin d'étape: 'form_approved' | 'signature' | 'checklist' | 'ia_confirmation'
};

export const DEFAULT_MODULE_CONFIG = {
  objective: "Accompagner l'utilisateur dans cette étape du projet",
  instructions: "Réponds de manière claire et concise. Si tu ne connais pas la réponse, demande des précisions.",
  buttonLabels: {
    proceedLabel: "Valider et continuer",
    needDataLabel: "J'ai besoin d'infos",
  },
  allowedActions: ['answer_question', 'show_checklist', 'show_documents'],
  knowledgeKey: null,
  tone: 'professional',
  maxResponseLength: 500,
  // V2: Configuration des actions (optionnelle)
  actionConfig: { ...DEFAULT_ACTION_CONFIG },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATIONS PAR MODULE
// ─────────────────────────────────────────────────────────────────────────────

export const MODULE_AI_CONFIGS = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // APPEL D'OFFRE INVESTISSEURS
  // ═══════════════════════════════════════════════════════════════════════════
  
  'appel-offre-investisseurs': {
    objective: "Guider l'investisseur dans la soumission de son dossier d'appel d'offre photovoltaïque",
    
    instructions: `Tu es un expert en appels d'offre CRE (Commission de Régulation de l'Énergie).
    
Ton rôle:
- Expliquer le processus de soumission
- Vérifier que le dossier est complet
- Répondre aux questions sur les critères d'éligibilité
- Aider à calculer le tarif de vente optimal

Règles:
- Ne jamais inventer de chiffres ou de dates
- Toujours vérifier les informations avant de répondre
- Si incertain, demander confirmation à l'équipe technique
- Être précis sur les délais (généralement 2-3 mois pour les résultats)`,
    
    buttonLabels: {
      proceedLabel: "Soumettre le dossier",
      needDataLabel: "Question sur l'AO",
    },
    
    allowedActions: [
      'answer_question',
      'show_checklist',
      'show_documents',
      'calculate_tariff',
      'check_eligibility',
    ],
    
    knowledgeKey: 'appel-offre',
    tone: 'professional',
    maxResponseLength: 600,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // APPEL D'OFFRE (générique)
  // ═══════════════════════════════════════════════════════════════════════════
  
  'appel-offre': {
    objective: "Accompagner la soumission à l'appel d'offre CRE",
    
    instructions: `Expert en appels d'offre photovoltaïque.
    
Priorités:
1. Vérifier l'éligibilité du projet
2. S'assurer que le dossier est complet
3. Conseiller sur le tarif de vente
4. Rappeler les dates limites`,
    
    buttonLabels: {
      proceedLabel: "Valider la soumission",
      needDataLabel: "Question AO",
    },
    
    allowedActions: ['answer_question', 'show_checklist', 'show_documents'],
    knowledgeKey: 'appel-offre',
    tone: 'professional',
    maxResponseLength: 500,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PDB - PROMESSE DE BAIL
  // ═══════════════════════════════════════════════════════════════════════════
  
  'pdb': {
    objective: "Sécuriser la signature de la promesse de bail avec le propriétaire",
    
    instructions: `Tu es un assistant juridique spécialisé en baux photovoltaïques.
    
Ton rôle:
- Expliquer les clauses du contrat
- Vérifier les informations du propriétaire
- Guider le processus de signature
- Rassurer sur les engagements mutuels

Règles:
- Toujours recommander une relecture juridique pour les cas complexes
- Ne jamais donner de conseil fiscal personnalisé
- Vérifier l'identité du signataire (propriétaire légal)`,
    
    buttonLabels: {
      proceedLabel: "Envoyer pour signature",
      needDataLabel: "Question sur le bail",
    },
    
    allowedActions: [
      'answer_question',
      'show_checklist',
      'show_documents',
      'verify_owner',
      'explain_clause',
    ],
    
    knowledgeKey: 'pdb',
    tone: 'reassuring',
    maxResponseLength: 500,
    
    // ═══════════════════════════════════════════════════════════════════════
    // V2: Configuration des actions (EXEMPLE COMPLET)
    // ═══════════════════════════════════════════════════════════════════════
    actionConfig: {
      targetAudience: 'CLIENT',           // Action destinée au client
      actionType: 'SIGNATURE',            // Lancer une signature
      allowedFormIds: [],                 // Pas de formulaire pour cette étape
      allowedTemplateIds: [],             // À configurer par l'admin (templateIds de contrats PDB)
      managementMode: 'HUMAN',            // Le commercial décide quand envoyer
      verificationMode: 'HUMAN',          // Le commercial vérifie la signature
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTUDE TECHNIQUE
  // ═══════════════════════════════════════════════════════════════════════════
  
  'etude-technique': {
    objective: "Valider la faisabilité technique du projet photovoltaïque",
    
    instructions: `Tu es un ingénieur photovoltaïque.
    
Ton rôle:
- Expliquer les aspects techniques
- Répondre aux questions sur le dimensionnement
- Clarifier les résultats de l'étude
- Préparer la visite sur site`,
    
    buttonLabels: {
      proceedLabel: "Valider l'étude",
      needDataLabel: "Question technique",
    },
    
    allowedActions: ['answer_question', 'show_checklist', 'explain_technical'],
    knowledgeKey: 'etude-technique',
    tone: 'technical',
    maxResponseLength: 600,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RACCORDEMENT ENEDIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  'raccordement': {
    objective: "Accompagner la demande de raccordement au réseau Enedis",
    
    instructions: `Tu es un expert en raccordement électrique.
    
Ton rôle:
- Expliquer le processus Enedis
- Anticiper les délais
- Aider à préparer le dossier
- Répondre aux questions sur la PTF`,
    
    buttonLabels: {
      proceedLabel: "Soumettre à Enedis",
      needDataLabel: "Question raccordement",
    },
    
    allowedActions: ['answer_question', 'show_checklist', 'show_documents'],
    knowledgeKey: 'raccordement',
    tone: 'professional',
    maxResponseLength: 500,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MISE EN SERVICE
  // ═══════════════════════════════════════════════════════════════════════════
  
  'mise-en-service': {
    objective: "Finaliser la mise en service de l'installation",
    
    instructions: `Tu supervises la mise en service de l'installation.
    
Ton rôle:
- Vérifier que tout est prêt
- Coordonner avec Enedis
- S'assurer du bon fonctionnement
- Célébrer la réussite du projet !`,
    
    buttonLabels: {
      proceedLabel: "🎉 Mettre en service",
      needDataLabel: "Question finale",
    },
    
    allowedActions: ['answer_question', 'show_checklist', 'final_check'],
    knowledgeKey: 'mise-en-service',
    tone: 'enthusiastic',
    maxResponseLength: 400,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupère la config IA d'un module
 * @param {string} moduleId - Identifiant du module
 * @returns {ModuleAIConfig} Config du module ou config par défaut
 */
export function getModuleAIConfig(moduleId) {
  if (!moduleId) return DEFAULT_MODULE_CONFIG;
  
  // Normaliser l'ID
  const normalizedId = moduleId.toLowerCase().replace(/[_\s]/g, '-');
  
  // Chercher config exacte
  if (MODULE_AI_CONFIGS[normalizedId]) {
    return { ...DEFAULT_MODULE_CONFIG, ...MODULE_AI_CONFIGS[normalizedId] };
  }
  
  // Chercher correspondance partielle
  const partialMatch = Object.keys(MODULE_AI_CONFIGS).find(key => 
    normalizedId.includes(key) || key.includes(normalizedId)
  );
  
  if (partialMatch) {
    return { ...DEFAULT_MODULE_CONFIG, ...MODULE_AI_CONFIGS[partialMatch] };
  }
  
  return DEFAULT_MODULE_CONFIG;
}

/**
 * Met à jour la config d'un module (in-memory)
 * @param {string} moduleId - Identifiant du module
 * @param {Partial<ModuleAIConfig>} updates - Modifications à appliquer
 */
export function updateModuleAIConfig(moduleId, updates) {
  if (!moduleId) return;
  
  const normalizedId = moduleId.toLowerCase().replace(/[_\s]/g, '-');
  
  MODULE_AI_CONFIGS[normalizedId] = {
    ...(MODULE_AI_CONFIGS[normalizedId] || DEFAULT_MODULE_CONFIG),
    ...updates,
  };
  
  console.log('[V2 Config] Module AI config updated', { moduleId, updates });
}

/**
 * Liste tous les modules configurés
 * @returns {string[]} Liste des moduleIds
 */
export function listConfiguredModules() {
  return Object.keys(MODULE_AI_CONFIGS);
}

/**
 * Exporte toutes les configs (pour sauvegarde)
 * @returns {Object} Toutes les configs
 */
export function exportAllConfigs() {
  return { ...MODULE_AI_CONFIGS };
}

/**
 * Importe des configs (pour restauration)
 * @param {Object} configs - Configs à importer
 */
export function importConfigs(configs) {
  Object.keys(configs).forEach(key => {
    MODULE_AI_CONFIGS[key] = configs[key];
  });
  console.log('[V2 Config] Configs imported', { count: Object.keys(configs).length });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS ACTION CONFIG (V2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupère la configuration d'action d'un module
 * @param {string} moduleId - Identifiant du module
 * @returns {ActionConfig} Configuration d'action ou défaut
 */
export function getModuleActionConfig(moduleId) {
  const config = getModuleAIConfig(moduleId);
  return config.actionConfig || { ...DEFAULT_ACTION_CONFIG };
}

/**
 * Met à jour uniquement la configuration d'action d'un module (in-memory)
 * @param {string} moduleId - Identifiant du module
 * @param {Partial<ActionConfig>} actionUpdates - Modifications à appliquer
 */
export function updateModuleActionConfig(moduleId, actionUpdates) {
  if (!moduleId) return;
  
  const normalizedId = moduleId.toLowerCase().replace(/[_\s]/g, '-');
  const existingConfig = MODULE_AI_CONFIGS[normalizedId] || { ...DEFAULT_MODULE_CONFIG };
  const existingActionConfig = existingConfig.actionConfig || { ...DEFAULT_ACTION_CONFIG };
  
  MODULE_AI_CONFIGS[normalizedId] = {
    ...existingConfig,
    actionConfig: {
      ...existingActionConfig,
      ...actionUpdates,
    },
  };
  
  console.log('[V2 Config] Module action config updated', { moduleId, actionUpdates });
}

/**
 * Ajoute un formId à la liste des formulaires autorisés
 * @param {string} moduleId - Identifiant du module
 * @param {string} formId - ID du formulaire à ajouter
 */
export function addAllowedFormId(moduleId, formId) {
  const actionConfig = getModuleActionConfig(moduleId);
  if (!actionConfig.allowedFormIds.includes(formId)) {
    updateModuleActionConfig(moduleId, {
      allowedFormIds: [...actionConfig.allowedFormIds, formId],
    });
  }
}

/**
 * Retire un formId de la liste des formulaires autorisés
 * @param {string} moduleId - Identifiant du module
 * @param {string} formId - ID du formulaire à retirer
 */
export function removeAllowedFormId(moduleId, formId) {
  const actionConfig = getModuleActionConfig(moduleId);
  updateModuleActionConfig(moduleId, {
    allowedFormIds: actionConfig.allowedFormIds.filter(id => id !== formId),
  });
}

/**
 * Ajoute un templateId à la liste des templates autorisés
 * @param {string} moduleId - Identifiant du module
 * @param {string} templateId - ID du template à ajouter
 */
export function addAllowedTemplateId(moduleId, templateId) {
  const actionConfig = getModuleActionConfig(moduleId);
  if (!actionConfig.allowedTemplateIds.includes(templateId)) {
    updateModuleActionConfig(moduleId, {
      allowedTemplateIds: [...actionConfig.allowedTemplateIds, templateId],
    });
  }
}

/**
 * Retire un templateId de la liste des templates autorisés
 * @param {string} moduleId - Identifiant du module
 * @param {string} templateId - ID du template à retirer
 */
export function removeAllowedTemplateId(moduleId, templateId) {
  const actionConfig = getModuleActionConfig(moduleId);
  updateModuleActionConfig(moduleId, {
    allowedTemplateIds: actionConfig.allowedTemplateIds.filter(id => id !== templateId),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATEUR CONFIG COMPLÈTE (PROMPT 5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ValidationError
 * @property {string} field - Champ en erreur
 * @property {string} message - Message d'erreur explicite
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isComplete - True si la config est complète
 * @property {ValidationError[]} errors - Liste des erreurs de validation
 * @property {string[]} warnings - Avertissements (non bloquants)
 */

/**
 * Valide si une configuration de module V2 est complète
 * 
 * Règles de validation:
 * - ≥ 1 cible sélectionnée (targetAudience non vide)
 * - actionType défini (FORM ou SIGNATURE)
 * - si FORM → allowedFormIds.length ≥ 1
 * - si SIGNATURE → allowedFormIds.length ≥ 1 (formulaire de collecte)
 * - managementMode défini (AI ou HUMAN)
 * - verificationMode défini (AI ou HUMAN)
 * 
 * ⚠️ PURE VALIDATION - Aucune exécution, aucun effet de bord
 * 
 * @param {string} moduleId - Identifiant du module
 * @param {string} [projectType] - Type de projet (optionnel, pour validation future)
 * @returns {ValidationResult} Résultat de validation
 */
export function isModuleConfigComplete(moduleId, projectType = null) {
  const errors = [];
  const warnings = [];
  
  // Récupérer la config action
  const actionConfig = getModuleActionConfig(moduleId);
  
  // Règle 1: Au moins une cible sélectionnée
  const audience = actionConfig.targetAudience;
  const hasTarget = Array.isArray(audience) 
    ? audience.length > 0 
    : !!audience;
  
  if (!hasTarget) {
    errors.push({
      field: 'targetAudience',
      message: 'Au moins une cible doit être sélectionnée (Client, Commercial ou Partenaire)',
    });
  }
  
  // Règle 2: actionType défini
  const actionType = actionConfig.actionType;
  if (!actionType) {
    errors.push({
      field: 'actionType',
      message: 'Le type d\'action doit être défini (Formulaire ou Signature)',
    });
  }
  
  // Règle 3: Si FORM → au moins un formulaire
  if (actionType === 'FORM') {
    const formIds = actionConfig.allowedFormIds || [];
    if (formIds.length === 0) {
      errors.push({
        field: 'allowedFormIds',
        message: 'Au moins un formulaire doit être sélectionné',
      });
    }
  }
  
  // Règle 4: Si SIGNATURE → au moins un formulaire (pour collecte données)
  if (actionType === 'SIGNATURE') {
    const formIds = actionConfig.allowedFormIds || [];
    if (formIds.length === 0) {
      errors.push({
        field: 'allowedFormIds',
        message: 'Au moins un formulaire de collecte doit être sélectionné pour la signature',
      });
    }
    
    // Warning optionnel si pas de template
    const templateIds = actionConfig.allowedTemplateIds || [];
    if (templateIds.length === 0) {
      warnings.push('Aucun template de contrat sélectionné (optionnel)');
    }
  }
  
  // Règle 5: managementMode défini
  const managementMode = actionConfig.managementMode;
  if (!managementMode || !['AI', 'HUMAN'].includes(managementMode)) {
    errors.push({
      field: 'managementMode',
      message: 'Le mode de gestion doit être défini (IA ou Humain)',
    });
  }
  
  // Règle 6: verificationMode défini
  const verificationMode = actionConfig.verificationMode;
  if (!verificationMode || !['AI', 'HUMAN'].includes(verificationMode)) {
    errors.push({
      field: 'verificationMode',
      message: 'Le mode de vérification doit être défini (IA ou Humain)',
    });
  }
  
  // Log pour debug (V2)
  console.log('[V2 Validator] Config validation', {
    moduleId,
    projectType,
    isComplete: errors.length === 0,
    errorsCount: errors.length,
    warningsCount: warnings.length,
  });
  
  return {
    isComplete: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Retourne un résumé textuel de la validation
 * @param {ValidationResult} validationResult
 * @returns {string} Résumé lisible
 */
export function getValidationSummary(validationResult) {
  if (validationResult.isComplete) {
    const warningText = validationResult.warnings.length > 0
      ? ` (${validationResult.warnings.length} avertissement${validationResult.warnings.length > 1 ? 's' : ''})`
      : '';
    return `✅ Configuration complète${warningText}`;
  }
  
  return `❌ ${validationResult.errors.length} champ${validationResult.errors.length > 1 ? 's' : ''} manquant${validationResult.errors.length > 1 ? 's' : ''}`;
}

/**
 * Vérifie rapidement si un module a une config complète (sans détails)
 * @param {string} moduleId - Identifiant du module
 * @returns {boolean} True si complet
 */
export function isModuleReady(moduleId) {
  return isModuleConfigComplete(moduleId).isComplete;
}

export default MODULE_AI_CONFIGS;
