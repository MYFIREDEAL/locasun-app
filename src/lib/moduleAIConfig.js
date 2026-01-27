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
 *   }
 * 
 * ⚠️ Phase 1: Stockage in-memory / JSON local
 * Phase 2+: Stockage Supabase (table `module_ai_config`)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES / STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

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

export default MODULE_AI_CONFIGS;
