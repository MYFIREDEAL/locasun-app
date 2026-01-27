/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BASE D'INFO PAR MODULE - Workflow V2
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Mapping local (JSON) contenant les informations de référence pour chaque
 * module du workflow. Utilisé par l'IA stub pour répondre en NEED_DATA.
 * 
 * Structure:
 *   moduleId → {
 *     title: string,
 *     description: string,
 *     checklist: string[],
 *     faq: { question: string, answer: string }[],
 *     requiredDocuments: string[],
 *     tips: string[],
 *     contacts: { role: string, info: string }[]
 *   }
 * 
 * ⚠️ Phase 1: Données hardcodées
 * Phase 2+: Charger depuis Supabase (table `module_info_base`)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING PRINCIPAL: moduleId → infos
// ─────────────────────────────────────────────────────────────────────────────

export const MODULE_INFO_BASE = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // APPEL D'OFFRE
  // ═══════════════════════════════════════════════════════════════════════════
  
  'appel-offre': {
    title: "Appel d'offre",
    description: "Étape de soumission à un appel d'offre pour un projet photovoltaïque. Cette phase détermine si le projet est retenu pour la suite.",
    
    checklist: [
      "Vérifier l'éligibilité du site (surface, orientation, ombrage)",
      "Préparer le dossier technique (plans, études)",
      "Calculer le tarif de vente proposé",
      "Soumettre avant la date limite",
      "Attendre la notification de résultat (2-3 mois)",
    ],
    
    faq: [
      {
        question: "Quel est le délai moyen de réponse ?",
        answer: "Les résultats sont généralement publiés 2 à 3 mois après la clôture de l'appel d'offre. Vous recevrez une notification par email."
      },
      {
        question: "Que se passe-t-il si notre offre est rejetée ?",
        answer: "Vous pouvez resoumettre lors de la prochaine période d'appel d'offre. Nous analyserons les raisons du rejet pour améliorer la prochaine soumission."
      },
      {
        question: "Comment est calculé le tarif de vente ?",
        answer: "Le tarif est basé sur la puissance installée, les coûts d'installation, et le prix du marché. Notre équipe technique vous proposera un tarif compétitif."
      },
    ],
    
    requiredDocuments: [
      "Plan de masse du site",
      "Étude de faisabilité technique",
      "Justificatif de propriété ou bail",
      "Attestation d'assurance",
      "K-bis de la société (si applicable)",
    ],
    
    tips: [
      "💡 Soumettez au moins 48h avant la deadline pour éviter les problèmes techniques",
      "💡 Un tarif trop bas peut être disqualifiant (offre anormalement basse)",
      "💡 Vérifiez que tous les documents sont bien signés et datés",
    ],
    
    contacts: [
      { role: "Responsable appels d'offre", info: "ao@locasun.fr" },
      { role: "Support technique", info: "technique@locasun.fr" },
    ],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PDB - PROMESSE DE BAIL
  // ═══════════════════════════════════════════════════════════════════════════
  
  'pdb': {
    title: "PDB - Promesse de Bail",
    description: "Signature de la promesse de bail avec le propriétaire du terrain ou de la toiture. Document juridique engageant les deux parties.",
    
    checklist: [
      "Vérifier les informations du propriétaire",
      "Valider la durée du bail (généralement 20-30 ans)",
      "Confirmer le montant du loyer annuel",
      "Faire relire par le service juridique",
      "Envoyer pour signature électronique",
      "Archiver le document signé",
    ],
    
    faq: [
      {
        question: "Quelle est la durée standard d'un bail photovoltaïque ?",
        answer: "La durée standard est de 20 à 30 ans, correspondant à la durée de vie des panneaux et au contrat de rachat d'électricité."
      },
      {
        question: "Le propriétaire peut-il résilier le bail ?",
        answer: "Non, sauf en cas de manquement grave de notre part. Le bail est ferme pour toute sa durée, ce qui sécurise l'investissement."
      },
      {
        question: "Qui paie les taxes foncières ?",
        answer: "Généralement, l'exploitant (nous) paie la taxe foncière liée à l'installation. Cela est précisé dans le contrat."
      },
      {
        question: "Comment se passe la signature ?",
        answer: "La signature se fait par voie électronique sécurisée. Le propriétaire reçoit un email avec un lien pour signer."
      },
    ],
    
    requiredDocuments: [
      "Pièce d'identité du propriétaire",
      "Titre de propriété ou attestation notariale",
      "RIB du propriétaire (pour les loyers)",
      "Plan cadastral de la parcelle",
    ],
    
    tips: [
      "💡 Vérifiez que le signataire est bien le propriétaire légal",
      "💡 En cas d'indivision, tous les propriétaires doivent signer",
      "💡 Prévoyez 1 semaine pour le processus de signature complet",
    ],
    
    contacts: [
      { role: "Service juridique", info: "juridique@locasun.fr" },
      { role: "Gestionnaire de baux", info: "baux@locasun.fr" },
    ],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTUDE TECHNIQUE
  // ═══════════════════════════════════════════════════════════════════════════
  
  'etude-technique': {
    title: "Étude technique",
    description: "Analyse détaillée du site pour valider la faisabilité technique du projet photovoltaïque.",
    
    checklist: [
      "Visite du site (photos, mesures)",
      "Analyse de la structure porteuse",
      "Étude d'ombrage",
      "Dimensionnement de l'installation",
      "Validation du point de raccordement",
    ],
    
    faq: [
      {
        question: "Combien de temps dure l'étude technique ?",
        answer: "L'étude complète prend généralement 2 à 4 semaines, incluant la visite sur site et l'analyse des données."
      },
      {
        question: "Qui réalise la visite sur site ?",
        answer: "Un technicien qualifié de notre équipe ou un partenaire agréé. La visite dure environ 2 heures."
      },
    ],
    
    requiredDocuments: [
      "Plans de la toiture/terrain",
      "Factures d'électricité (12 derniers mois)",
      "Photos du site (si disponibles)",
    ],
    
    tips: [
      "💡 Prévoyez un accès facile au site pour la visite",
      "💡 Rassemblez les factures d'électricité à l'avance",
    ],
    
    contacts: [
      { role: "Bureau d'études", info: "etudes@locasun.fr" },
    ],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RACCORDEMENT ENEDIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  'raccordement': {
    title: "Raccordement Enedis",
    description: "Demande de raccordement au réseau électrique auprès d'Enedis. Étape obligatoire pour injecter l'électricité produite.",
    
    checklist: [
      "Préparer le dossier de demande",
      "Soumettre sur le portail Enedis",
      "Attendre la proposition technique et financière (PTF)",
      "Valider et payer la PTF",
      "Planifier les travaux de raccordement",
    ],
    
    faq: [
      {
        question: "Combien de temps prend le raccordement ?",
        answer: "Le délai moyen est de 3 à 6 mois entre la demande et la mise en service, selon la complexité du raccordement."
      },
      {
        question: "Qui paie les frais de raccordement ?",
        answer: "Les frais sont à la charge du producteur (nous). Ils sont inclus dans le budget global du projet."
      },
    ],
    
    requiredDocuments: [
      "Autorisation d'urbanisme",
      "Plan de masse",
      "Schéma électrique unifilaire",
    ],
    
    tips: [
      "💡 Anticipez cette étape car c'est souvent la plus longue",
      "💡 Vérifiez la capacité d'accueil du réseau local",
    ],
    
    contacts: [
      { role: "Chargé de raccordement", info: "raccordement@locasun.fr" },
    ],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MISE EN SERVICE
  // ═══════════════════════════════════════════════════════════════════════════
  
  'mise-en-service': {
    title: "Mise en service",
    description: "Activation de l'installation et début de la production d'électricité.",
    
    checklist: [
      "Vérification finale de l'installation",
      "Obtention du Consuel",
      "Coordination avec Enedis pour la mise sous tension",
      "Configuration du monitoring",
      "Remise des documents au client",
    ],
    
    faq: [
      {
        question: "Qu'est-ce que le Consuel ?",
        answer: "Le Consuel est l'attestation de conformité électrique. Sans elle, Enedis ne peut pas mettre l'installation sous tension."
      },
    ],
    
    requiredDocuments: [
      "Attestation Consuel",
      "PV de réception des travaux",
      "Documentation technique de l'installation",
    ],
    
    tips: [
      "💡 Prévoyez une marge de quelques jours pour les imprévus",
    ],
    
    contacts: [
      { role: "Chef de projet", info: "projets@locasun.fr" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupère les infos d'un module par son ID
 * @param {string} moduleId - Identifiant du module
 * @returns {Object|null} Infos du module ou null si non trouvé
 */
export function getModuleInfo(moduleId) {
  if (!moduleId) return null;
  
  // Normaliser l'ID (lowercase, tirets)
  const normalizedId = moduleId.toLowerCase().replace(/[_\s]/g, '-');
  
  // Chercher une correspondance exacte
  if (MODULE_INFO_BASE[normalizedId]) {
    return MODULE_INFO_BASE[normalizedId];
  }
  
  // Chercher une correspondance partielle
  const partialMatch = Object.keys(MODULE_INFO_BASE).find(key => 
    normalizedId.includes(key) || key.includes(normalizedId)
  );
  
  return partialMatch ? MODULE_INFO_BASE[partialMatch] : null;
}

/**
 * Recherche dans la FAQ d'un module
 * @param {string} moduleId - Identifiant du module
 * @param {string} query - Question de l'utilisateur
 * @returns {Object|null} FAQ trouvée ou null
 */
export function searchModuleFAQ(moduleId, query) {
  const moduleInfo = getModuleInfo(moduleId);
  if (!moduleInfo?.faq) return null;
  
  const queryLower = query.toLowerCase();
  
  // Recherche par mots-clés
  const match = moduleInfo.faq.find(item => {
    const questionLower = item.question.toLowerCase();
    const answerLower = item.answer.toLowerCase();
    
    // Vérifier si des mots-clés de la query sont dans la question ou réponse
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
    return queryWords.some(word => 
      questionLower.includes(word) || answerLower.includes(word)
    );
  });
  
  return match || null;
}

/**
 * Vérifie si une info existe pour un module donné
 * @param {string} moduleId - Identifiant du module
 * @returns {boolean}
 */
export function hasModuleInfo(moduleId) {
  return getModuleInfo(moduleId) !== null;
}

/**
 * Liste tous les modules avec infos disponibles
 * @returns {string[]} Liste des moduleIds
 */
export function listAvailableModules() {
  return Object.keys(MODULE_INFO_BASE);
}

export default MODULE_INFO_BASE;
