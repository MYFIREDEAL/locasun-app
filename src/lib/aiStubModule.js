/**
 * ═══════════════════════════════════════════════════════════════════════════
 * IA STUB - Assistant Module Workflow V2
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Stub IA pour répondre aux questions NEED_DATA en utilisant la base d'info
 * locale (moduleInfoBase.js).
 * 
 * Comportement:
 *   1. Cherche dans la FAQ du module
 *   2. Si trouvé → retourne la réponse
 *   3. Si non trouvé → pose une question de clarification
 * 
 * ⚠️ Phase 1: Stub local (pas d'API externe)
 * Phase 2+: Intégration GPT/Claude avec RAG sur la base d'info
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { 
  getModuleInfo, 
  searchModuleFAQ, 
  hasModuleInfo 
} from '@/lib/moduleInfoBase';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES DE RÉPONSES
// ─────────────────────────────────────────────────────────────────────────────

export const AI_RESPONSE_TYPES = {
  ANSWER: 'answer',           // Réponse trouvée dans la base
  CLARIFICATION: 'clarification', // Question de clarification
  CHECKLIST: 'checklist',     // Affichage de la checklist
  DOCUMENTS: 'documents',     // Liste des documents requis
  TIPS: 'tips',               // Conseils
  CONTACT: 'contact',         // Infos de contact
  NO_INFO: 'no_info',         // Module sans info
};

// ─────────────────────────────────────────────────────────────────────────────
// QUESTIONS DE CLARIFICATION
// ─────────────────────────────────────────────────────────────────────────────

const CLARIFICATION_QUESTIONS = [
  "Pourriez-vous préciser votre question ? Je n'ai pas trouvé d'information exacte dans ma base.",
  "Je n'ai pas cette information précise. Pouvez-vous reformuler ou me donner plus de contexte ?",
  "Cette question dépasse mes connaissances actuelles. Souhaitez-vous que je vous mette en contact avec l'équipe concernée ?",
  "Je ne trouve pas de réponse dans la documentation du module. Voulez-vous que je transmette votre question à un expert ?",
];

/**
 * Sélectionne une question de clarification aléatoire
 */
function getRandomClarification() {
  const index = Math.floor(Math.random() * CLARIFICATION_QUESTIONS.length);
  return CLARIFICATION_QUESTIONS[index];
}

// ─────────────────────────────────────────────────────────────────────────────
// DÉTECTION D'INTENTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Détecte l'intention de l'utilisateur
 * @param {string} query - Question de l'utilisateur
 * @returns {string} Type d'intention
 */
function detectIntent(query) {
  const queryLower = query.toLowerCase();
  
  // Checklist / étapes
  if (/checklist|étapes?|faire|comment|procédure|process/i.test(queryLower)) {
    return 'checklist';
  }
  
  // Documents
  if (/document|fichier|pièce|justificatif|fournir|envoyer/i.test(queryLower)) {
    return 'documents';
  }
  
  // Délai / temps
  if (/délai|temps|durée|combien de temps|quand/i.test(queryLower)) {
    return 'delay';
  }
  
  // Contact
  if (/contact|appeler|joindre|email|téléphone|qui/i.test(queryLower)) {
    return 'contact';
  }
  
  // Conseil / astuce
  if (/conseil|astuce|tip|recommand|attention/i.test(queryLower)) {
    return 'tips';
  }
  
  // Question générale
  return 'general';
}

// ─────────────────────────────────────────────────────────────────────────────
// FONCTION PRINCIPALE: askAI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pose une question à l'IA stub
 * 
 * @param {Object} params
 * @param {string} params.moduleId - ID du module actuel
 * @param {string} params.moduleName - Nom du module (fallback pour recherche)
 * @param {string} params.query - Question de l'utilisateur
 * @param {Object} params.context - Contexte additionnel (prospect, step, etc.)
 * @returns {Object} Réponse de l'IA
 */
export function askAI({ moduleId, moduleName, query, context = {} }) {
  // Essayer de trouver les infos du module
  const moduleInfo = getModuleInfo(moduleId) || getModuleInfo(moduleName);
  
  // Si pas d'info pour ce module
  if (!moduleInfo) {
    return {
      type: AI_RESPONSE_TYPES.NO_INFO,
      message: `Je n'ai pas encore d'informations documentées pour le module "${moduleName || moduleId}". Souhaitez-vous que je transmette votre question à l'équipe ?`,
      suggestions: [
        "Contacter l'équipe support",
        "Poser une autre question",
      ],
    };
  }
  
  // Détecter l'intention
  const intent = detectIntent(query);
  
  // ─────────────────────────────────────────────────────────────────────────
  // RÉPONSES PAR INTENTION
  // ─────────────────────────────────────────────────────────────────────────
  
  // Checklist demandée
  if (intent === 'checklist' && moduleInfo.checklist) {
    return {
      type: AI_RESPONSE_TYPES.CHECKLIST,
      message: `Voici les étapes pour "${moduleInfo.title}" :`,
      data: moduleInfo.checklist,
      suggestions: [
        "Quels documents fournir ?",
        "Combien de temps ça prend ?",
      ],
    };
  }
  
  // Documents demandés
  if (intent === 'documents' && moduleInfo.requiredDocuments) {
    return {
      type: AI_RESPONSE_TYPES.DOCUMENTS,
      message: `Documents requis pour "${moduleInfo.title}" :`,
      data: moduleInfo.requiredDocuments,
      suggestions: [
        "Comment les envoyer ?",
        "Quelles sont les étapes ?",
      ],
    };
  }
  
  // Contact demandé
  if (intent === 'contact' && moduleInfo.contacts) {
    return {
      type: AI_RESPONSE_TYPES.CONTACT,
      message: `Contacts pour "${moduleInfo.title}" :`,
      data: moduleInfo.contacts,
      suggestions: [],
    };
  }
  
  // Conseils demandés
  if (intent === 'tips' && moduleInfo.tips) {
    return {
      type: AI_RESPONSE_TYPES.TIPS,
      message: `Conseils pour "${moduleInfo.title}" :`,
      data: moduleInfo.tips,
      suggestions: [
        "Quelles sont les étapes ?",
        "Quels documents fournir ?",
      ],
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // RECHERCHE DANS LA FAQ
  // ─────────────────────────────────────────────────────────────────────────
  
  const faqMatch = searchModuleFAQ(moduleId, query) || searchModuleFAQ(moduleName, query);
  
  if (faqMatch) {
    return {
      type: AI_RESPONSE_TYPES.ANSWER,
      message: faqMatch.answer,
      source: {
        question: faqMatch.question,
        module: moduleInfo.title,
      },
      suggestions: [
        "Quelles sont les étapes ?",
        "Quels documents fournir ?",
      ],
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // AUCUNE RÉPONSE TROUVÉE → CLARIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  
  return {
    type: AI_RESPONSE_TYPES.CLARIFICATION,
    message: getRandomClarification(),
    context: {
      moduleTitle: moduleInfo.title,
      availableTopics: [
        moduleInfo.checklist ? 'étapes/checklist' : null,
        moduleInfo.faq?.length ? 'questions fréquentes' : null,
        moduleInfo.requiredDocuments ? 'documents requis' : null,
        moduleInfo.tips ? 'conseils' : null,
        moduleInfo.contacts ? 'contacts' : null,
      ].filter(Boolean),
    },
    suggestions: [
      "Quelles sont les étapes ?",
      "Quels documents fournir ?",
      "Contacter l'équipe",
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FONCTION DE BIENVENUE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Message de bienvenue pour un module
 * @param {string} moduleId - ID du module
 * @param {string} moduleName - Nom du module (fallback)
 * @returns {Object} Message de bienvenue
 */
export function getWelcomeMessage(moduleId, moduleName) {
  const moduleInfo = getModuleInfo(moduleId) || getModuleInfo(moduleName);
  
  if (!moduleInfo) {
    return {
      type: 'welcome',
      message: `Bienvenue sur le module "${moduleName || moduleId}". Comment puis-je vous aider ?`,
      suggestions: [
        "Quelles sont les étapes ?",
        "J'ai une question",
      ],
    };
  }
  
  return {
    type: 'welcome',
    message: `Bienvenue sur **${moduleInfo.title}**.\n\n${moduleInfo.description}\n\nComment puis-je vous aider ?`,
    suggestions: [
      "Quelles sont les étapes ?",
      "Quels documents fournir ?",
      "Combien de temps ça prend ?",
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT PAR DÉFAUT
// ─────────────────────────────────────────────────────────────────────────────

export default {
  askAI,
  getWelcomeMessage,
  AI_RESPONSE_TYPES,
};
