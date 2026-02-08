/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WORKFLOW V2 — CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Ce fichier contrôle le comportement du Workflow V2 LIVE.
 * 
 * ⚠️  PHASE 1: READ_ONLY MODE
 *     - Aucune action réelle exécutée
 *     - PROCEED = console.log uniquement
 *     - Aucune cascade, aucun update de status
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚫 IMPORTS INTERDITS DANS LES COMPOSANTS V2 (Phase 1)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * NE JAMAIS importer ces éléments dans src/components/admin/workflow-v2/* :
 * 
 * ❌ useWorkflowExecutor        → Exécution auto des actions
 * ❌ useWorkflowActionTrigger   → Cascade après formulaire
 * ❌ completeStepAndProceed     → Update status étape (App.jsx)
 * ❌ executeContractSignatureAction → Génération contrat
 * ❌ handleSelectPrompt         → Trigger V1 (ProspectDetailsAdmin)
 * 
 * ✅ IMPORTS AUTORISÉS (lecture seule) :
 * 
 * ✓ useSupabaseProjectStepsStatus  → Lecture steps
 * ✓ useSupabaseChatMessages        → Lecture messages
 * ✓ useSupabaseClientFormPanels    → Lecture formulaires
 * ✓ useSupabaseProjectFiles        → Lecture fichiers
 * ✓ useSupabaseProjectHistory      → Lecture historique
 * ✓ useAppContext (données)        → Données déjà chargées
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * VÉRIFICATION AVANT MERGE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Exécuter cette commande pour vérifier aucun import interdit :
 * 
 * grep -rE "useWorkflowExecutor|useWorkflowActionTrigger|completeStepAndProceed|executeContractSignatureAction" src/components/admin/workflow-v2/
 * 
 * Résultat attendu : aucune correspondance
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

export const WORKFLOW_V2_CONFIG = {
  /**
   * Feature flag principal
   * true  = V2 accessible via /admin/workflow-v2/:prospectId/:projectType
   * false = Route désactivée, redirect vers pipeline
   */
  enabled: true,

  /**
   * Mode lecture seule (Phase 1)
   * true  = Aucune action réelle, tout est mock
   * false = Actions réelles activées (Phase 2+)
   */
  readOnlyMode: true,

  /**
   * PROCEED = mock uniquement
   * true  = console.log + toast, pas d'effet DB
   * false = Exécute vraiment l'action (Phase 2+)
   */
  mockProceed: true,

  /**
   * Routing automatique désactivé
   * true  = Pas de passage auto à l'étape suivante
   * false = Cascade activée (Phase 2+)
   */
  disableRouting: true,

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * EXECUTION_FROM_V2 (PROMPT 7)
   * ═══════════════════════════════════════════════════════════════════════════
   * 
   * Permet à V2 d'exécuter des ActionOrder via V1
   * 
   * ⚠️ SÉCURITÉ CRITIQUE:
   *    - OFF par défaut en production
   *    - ON automatiquement en preview/dev (localhost, vercel preview)
   *    - Si OFF → rien ne s'exécute, même si ActionOrder présent
   *    - Rollback immédiat = mettre ce flag à false
   * 
   * Actions supportées:
   *    - FORM → envoi formulaire via V1
   *    - SIGNATURE → lancement signature via V1
   * 
   * ✅ PHASE FINALE: Activé en preview/dev, OFF en production
   */
  executionFromV2: (() => {
    // Détection environnement preview/dev
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isVercelPreview = hostname.includes('vercel.app') || hostname.includes('preview');
    const isGitHubPagesPreview = hostname.includes('github.io');
    const isEvatime = hostname.includes('evatime.fr');
    const isDev = import.meta.env?.DEV === true;
    
    // Activer en preview/dev et evatime, désactiver en production externe
    const enabled = isLocalhost || isVercelPreview || isGitHubPagesPreview || isEvatime || isDev;
    
    if (enabled) {
      console.log('[V2 Config] 🚀 EXECUTION_FROM_V2 = ON (preview/dev mode)');
    }
    
    return enabled;
  })(),

  /**
   * Utilisateurs autorisés
   * ['*']           = Tous les utilisateurs
   * ['email@...']   = Liste blanche d'emails
   */
  allowedUsers: ['*'],

  /**
   * Logging détaillé pour debug
   */
  debugMode: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si Workflow V2 est activé
 * @returns {boolean}
 */
export const isWorkflowV2Enabled = () => WORKFLOW_V2_CONFIG.enabled;

/**
 * Vérifie si on est en mode lecture seule
 * @returns {boolean}
 */
export const isReadOnlyMode = () => WORKFLOW_V2_CONFIG.readOnlyMode;

/**
 * Vérifie si PROCEED doit être mocké
 * @returns {boolean}
 */
export const isMockProceed = () => WORKFLOW_V2_CONFIG.mockProceed;

/**
 * Vérifie si le routing auto est désactivé
 * @returns {boolean}
 */
export const isRoutingDisabled = () => WORKFLOW_V2_CONFIG.disableRouting;

/**
 * Vérifie si l'exécution V2→V1 est autorisée
 * @returns {boolean}
 */
export const isExecutionFromV2Enabled = () => WORKFLOW_V2_CONFIG.executionFromV2;

/**
 * Vérifie si un utilisateur a accès à V2
 * @param {string} userEmail - Email de l'utilisateur
 * @returns {boolean}
 */
export const isUserAllowed = (userEmail) => {
  const { allowedUsers } = WORKFLOW_V2_CONFIG;
  if (allowedUsers.includes('*')) return true;
  return allowedUsers.includes(userEmail);
};

/**
 * Log conditionnel pour debug V2
 * @param {string} message
 * @param {any} data
 */
export const logV2 = (message, data = null) => {
  if (WORKFLOW_V2_CONFIG.debugMode) {
    if (data) {
      console.log(`[V2] ${message}`, data);
    } else {
      console.log(`[V2] ${message}`);
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GARDE-FOUS TECHNIQUES (Phase 1 - READ_ONLY)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ GARDE-FOU: Bloque toute tentative d'écriture en mode READ_ONLY
 * 
 * @param {string} action - Nom de l'action tentée
 * @param {Object} context - Contexte (pour logging)
 * @returns {Object} Résultat avec success=false si bloqué
 */
export const guardWriteAction = (action, context = {}) => {
  const timestamp = new Date().toISOString();
  
  if (isReadOnlyMode()) {
    console.warn(`[V2 GUARD] ⛔ ACTION BLOQUÉE: ${action}`, {
      timestamp,
      reason: 'READ_ONLY mode is ON',
      context,
      config: {
        readOnlyMode: WORKFLOW_V2_CONFIG.readOnlyMode,
        mockProceed: WORKFLOW_V2_CONFIG.mockProceed,
      },
    });
    
    return {
      blocked: true,
      success: false,
      reason: 'READ_ONLY mode - action bloquée',
      action,
      timestamp,
    };
  }
  
  return { blocked: false };
};

/**
 * ⚠️ Liste des fonctions interdites en READ_ONLY
 * Utilisé pour vérification automatique
 */
export const FORBIDDEN_FUNCTIONS_READ_ONLY = [
  'updateStepStatus',
  'completeStepAndProceed',
  'executeContractSignatureAction',
  'handleSelectPrompt',
  'sendChatMessage',
  'submitForm',
  'uploadFile',
  'createSignatureProcedure',
  'updateProspect',
  'deleteProspect',
  'navigate', // Navigation automatique vers étape suivante
];

/**
 * ⚠️ Vérifie si une fonction est autorisée en READ_ONLY
 * @param {string} functionName - Nom de la fonction
 * @returns {boolean}
 */
export const isFunctionAllowedReadOnly = (functionName) => {
  if (!isReadOnlyMode()) return true;
  
  const isForbidden = FORBIDDEN_FUNCTIONS_READ_ONLY.includes(functionName);
  
  if (isForbidden) {
    console.error(`[V2 GUARD] ❌ Fonction interdite en READ_ONLY: ${functionName}`);
  }
  
  return !isForbidden;
};

/**
 * ⚠️ Wrapper sécurisé pour PROCEED
 * En READ_ONLY: log uniquement, retourne mock
 * 
 * @param {Function} realAction - Action réelle (Phase 2+)
 * @param {Object} context - Contexte pour logging
 * @returns {Object} Résultat mock ou réel
 */
export const safeProceed = (realAction, context = {}) => {
  const timestamp = new Date().toISOString();
  
  // ⚠️ GARDE-FOU: Toujours vérifier READ_ONLY
  if (isReadOnlyMode() || isMockProceed()) {
    console.log(`[V2 PROCEED] 🔒 Mode READ_ONLY - Action simulée`, {
      timestamp,
      context,
      wouldExecute: realAction?.name || 'anonymous',
    });
    
    return {
      success: true,
      mock: true,
      blocked: true,
      message: 'Action simulée — Mode lecture seule',
      timestamp,
    };
  }
  
  // Phase 2+: Exécuter l'action réelle
  logV2('PROCEED réel exécuté', context);
  return realAction(context);
};

/**
 * ⚠️ Wrapper sécurisé pour NEED_DATA
 * En READ_ONLY: log uniquement, retourne mock
 */
export const safeNeedData = (realAction, context = {}) => {
  const timestamp = new Date().toISOString();
  
  if (isReadOnlyMode()) {
    console.log(`[V2 NEED_DATA] 🔒 Mode READ_ONLY - Action simulée`, {
      timestamp,
      context,
    });
    
    return {
      success: true,
      mock: true,
      message: 'Action simulée — Mode lecture seule',
      timestamp,
    };
  }
  
  return realAction(context);
};

// ─────────────────────────────────────────────────────────────────────────────
// VÉRIFICATIONS RUNTIME
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Effectue les vérifications de sécurité au démarrage
 * Appelé dans WorkflowV2Page au mount
 */
export const runSecurityChecks = () => {
  const checks = {
    readOnlyMode: isReadOnlyMode(),
    mockProceed: isMockProceed(),
    routingDisabled: isRoutingDisabled(),
  };
  
  console.log('[V2 SECURITY] 🔐 Vérifications de sécurité:', {
    ...checks,
    status: checks.readOnlyMode && checks.mockProceed && checks.routingDisabled 
      ? '✅ Toutes les protections actives' 
      : '⚠️ ATTENTION: Certaines protections désactivées',
  });
  
  // Vérification stricte en dev
  if (import.meta.env.DEV) {
    if (!checks.readOnlyMode) {
      console.error('[V2 SECURITY] ⛔ DANGER: readOnlyMode est désactivé!');
    }
    if (!checks.mockProceed) {
      console.error('[V2 SECURITY] ⛔ DANGER: mockProceed est désactivé!');
    }
  }
  
  return checks;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES UI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Labels par défaut pour les boutons d'action
 */
export const DEFAULT_BUTTON_LABELS = {
  proceed: 'Valider et continuer',
  needData: "J'ai besoin d'infos",
};

/**
 * Messages toast pour les actions mockées
 */
export const MOCK_TOAST_MESSAGES = {
  proceed: {
    title: '🚀 PROCEED (simulation)',
    description: 'Action simulée — Mode lecture seule actif',
  },
  needData: {
    title: '❓ NEED_DATA (simulation)',
    description: 'Action simulée — Mode lecture seule actif',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GARDE-FOUS FINAUX (Phase 1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ ASSERTION FINALE: Vérifie qu'aucune écriture n'est possible
 * À appeler avant toute action "write" pour double-vérification
 * 
 * @param {string} actionName - Nom de l'action
 * @returns {boolean} true si bloqué (en READ_ONLY), false sinon
 */
export const assertNoWrite = (actionName) => {
  if (!isReadOnlyMode()) {
    return false; // Écriture autorisée
  }
  
  console.error(`[V2 ASSERT] ⛔ ÉCRITURE BLOQUÉE: ${actionName}`, {
    timestamp: new Date().toISOString(),
    stack: new Error().stack?.split('\n').slice(2, 5).join('\n'),
  });
  
  return true; // Écriture bloquée
};

/**
 * ⚠️ ASSERTION FINALE: Vérifie qu'aucun routing n'est déclenché
 * À appeler avant tout navigate()
 * 
 * @param {string} targetRoute - Route cible
 * @returns {boolean} true si bloqué, false sinon
 */
export const assertNoRouting = (targetRoute) => {
  if (!isRoutingDisabled()) {
    return false; // Routing autorisé
  }
  
  // Autoriser uniquement le retour au pipeline
  const allowedRoutes = ['/admin/pipeline', '/admin'];
  if (allowedRoutes.some(r => targetRoute.startsWith(r))) {
    logV2('Routing autorisé vers route de sortie', { targetRoute });
    return false;
  }
  
  console.error(`[V2 ASSERT] ⛔ ROUTING BLOQUÉ: ${targetRoute}`, {
    timestamp: new Date().toISOString(),
    reason: 'Navigation automatique désactivée en Phase 1',
  });
  
  return true; // Routing bloqué
};

/**
 * ⚠️ Vérifie que PROCEED n'écrit rien
 * Retourne un objet de résultat mock si READ_ONLY
 */
export const assertProceedNoWrite = (stepId, moduleId) => {
  const timestamp = new Date().toISOString();
  
  if (isReadOnlyMode() || isMockProceed()) {
    console.log(`[V2 PROCEED] ✅ Vérification: Aucune écriture`, {
      stepId,
      moduleId,
      timestamp,
      checks: {
        readOnlyMode: true,
        mockProceed: true,
        dbWrite: false,
        routing: false,
      },
    });
    
    return {
      verified: true,
      noWrite: true,
      noRouting: true,
      mock: true,
    };
  }
  
  return { verified: false };
};

/**
 * 🔍 Rapport de sécurité complet
 * Génère un rapport de toutes les vérifications
 */
export const generateSecurityReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    phase: 'Phase 1 - READ_ONLY',
    config: {
      enabled: WORKFLOW_V2_CONFIG.enabled,
      readOnlyMode: WORKFLOW_V2_CONFIG.readOnlyMode,
      mockProceed: WORKFLOW_V2_CONFIG.mockProceed,
      disableRouting: WORKFLOW_V2_CONFIG.disableRouting,
    },
    guards: {
      writeBlocked: isReadOnlyMode(),
      proceedMocked: isMockProceed(),
      routingBlocked: isRoutingDisabled(),
    },
    forbidden: FORBIDDEN_FUNCTIONS_READ_ONLY,
    status: 'OK',
  };
  
  // Vérifier cohérence
  if (!report.guards.writeBlocked || !report.guards.proceedMocked || !report.guards.routingBlocked) {
    report.status = 'WARNING - Certaines protections désactivées';
  }
  
  console.log('[V2 SECURITY REPORT]', report);
  return report;
};
