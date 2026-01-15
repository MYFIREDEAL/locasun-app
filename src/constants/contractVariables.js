/**
 * 🔥 DÉFINITIONS CENTRALISÉES DES VARIABLES DE CONTRAT
 * 
 * Ce fichier définit TOUTES les variables utilisables dans les templates de contrat.
 * Ces mêmes variables sont utilisées partout dans l'application :
 * - Éditeur de contrat (ContractTemplatesPage)
 * - Générateur de formulaire automatique
 * - Mapping dans les workflows (WorkflowsCharlyPage)
 * - Injection dans les PDF (contractPdfGenerator)
 * 
 * Format : { variableName: { label, type, options?, placeholder? } }
 */

export const CONTRACT_VARIABLES = {
  // ========================================
  // CLIENT (Particulier)
  // ========================================
  'client_firstname': { label: 'Prénom du client', type: 'text', required: true },
  'client_lastname': { label: 'Nom du client', type: 'text', required: true },
  'client_email': { label: 'Email du client', type: 'email' },
  'client_phone': { label: 'Téléphone du client', type: 'phone' },
  'client_address': { label: 'Adresse du client', type: 'text' },
  'client_zip': { label: 'Code postal client', type: 'text', placeholder: '75001' },
  'client_city': { label: 'Ville du client', type: 'text' },
  'client_birthdate': { label: 'Date de naissance', type: 'text', placeholder: 'JJ/MM/AAAA' },
  'client_birthplace': { label: 'Lieu de naissance', type: 'text' },
  'client_nationality': { label: 'Nationalité', type: 'text', placeholder: 'Française' },

  // ========================================
  // SOCIÉTÉ
  // ========================================
  'company_name': { label: 'Nom de la société', type: 'text', required: true },
  'company_legal_form': { label: 'Forme juridique', type: 'select', options: ['SARL', 'SAS', 'SASU', 'SA', 'EURL', 'SCI', 'Auto-entrepreneur', 'Autre'] },
  'company_siret': { label: 'Numéro SIRET', type: 'text', placeholder: '123 456 789 00012' },
  'company_capital': { label: 'Capital social (€)', type: 'number', placeholder: '10000' },
  'company_address': { label: 'Adresse du siège social', type: 'text' },
  'company_zip': { label: 'Code postal société', type: 'text', placeholder: '75001' },
  'company_city': { label: 'Ville société', type: 'text' },
  'company_rcs_number': { label: 'Numéro RCS', type: 'text' },
  'company_rcs_city': { label: 'Ville RCS', type: 'text' },
  'company_representative_name': { label: 'Nom du représentant légal', type: 'text' },
  'company_representative_role': { label: 'Fonction du représentant', type: 'text', placeholder: 'Gérant, Président...' },

  // ========================================
  // CO-SIGNATAIRES (Particulier)
  // ========================================
  'cosigner_name_1': { label: 'Nom du co-signataire 1', type: 'text' },
  'cosigner_email_1': { label: 'Email co-signataire 1', type: 'email' },
  'cosigner_phone_1': { label: 'Téléphone co-signataire 1', type: 'phone' },
  'cosigner_address_1': { label: 'Adresse co-signataire 1', type: 'text' },
  'cosigner_zip_1': { label: 'Code postal co-signataire 1', type: 'text' },
  'cosigner_city_1': { label: 'Ville co-signataire 1', type: 'text' },
  'cosigner_birthdate_1': { label: 'Date de naissance co-signataire 1', type: 'text' },
  'cosigner_nationality_1': { label: 'Nationalité co-signataire 1', type: 'text' },

  'cosigner_name_2': { label: 'Nom du co-signataire 2', type: 'text' },
  'cosigner_email_2': { label: 'Email co-signataire 2', type: 'email' },
  'cosigner_phone_2': { label: 'Téléphone co-signataire 2', type: 'phone' },
  'cosigner_address_2': { label: 'Adresse co-signataire 2', type: 'text' },
  'cosigner_zip_2': { label: 'Code postal co-signataire 2', type: 'text' },
  'cosigner_city_2': { label: 'Ville co-signataire 2', type: 'text' },
  'cosigner_birthdate_2': { label: 'Date de naissance co-signataire 2', type: 'text' },
  'cosigner_nationality_2': { label: 'Nationalité co-signataire 2', type: 'text' },

  'cosigner_name_3': { label: 'Nom du co-signataire 3', type: 'text' },
  'cosigner_email_3': { label: 'Email co-signataire 3', type: 'email' },
  'cosigner_phone_3': { label: 'Téléphone co-signataire 3', type: 'phone' },
  'cosigner_address_3': { label: 'Adresse co-signataire 3', type: 'text' },
  'cosigner_zip_3': { label: 'Code postal co-signataire 3', type: 'text' },
  'cosigner_city_3': { label: 'Ville co-signataire 3', type: 'text' },
  'cosigner_birthdate_3': { label: 'Date de naissance co-signataire 3', type: 'text' },
  'cosigner_nationality_3': { label: 'Nationalité co-signataire 3', type: 'text' },

  // ========================================
  // PROJET
  // ========================================
  'project_type': { label: 'Type de projet', type: 'text' },
  'project_description': { label: 'Description du projet', type: 'text' },
  'project_power': { label: 'Puissance (kWc)', type: 'number' },
  'project_address': { label: 'Adresse du projet', type: 'text' },
  'project_zip': { label: 'Code postal du projet', type: 'text' },
  'project_city': { label: 'Ville du projet', type: 'text' },

  // ========================================
  // DATES / LIEU
  // ========================================
  'contract_date': { label: 'Date du contrat', type: 'date' },
  'signature_date': { label: 'Date de signature', type: 'date' },
  'contract_place': { label: 'Lieu du contrat', type: 'text' },
  'current_date': { label: 'Date actuelle (auto)', type: 'date' },

  // ========================================
  // RÉFÉRENCE / MONTANT
  // ========================================
  'contract_reference': { label: 'Référence contrat', type: 'text' },
  'contract_amount': { label: 'Montant contrat (€)', type: 'number' },
  'contract_amount_words': { label: 'Montant en lettres', type: 'text' },
};

/**
 * Fonction pour trouver la variable correspondant à un label
 * Utile pour le mapping automatique
 */
export function findVariableByLabel(label) {
  const normalizedLabel = label.toLowerCase().trim();
  
  // Recherche exacte
  const exactMatch = Object.entries(CONTRACT_VARIABLES).find(
    ([_, config]) => config.label.toLowerCase() === normalizedLabel
  );
  if (exactMatch) return exactMatch[0];
  
  // Recherche partielle (contient)
  const partialMatch = Object.entries(CONTRACT_VARIABLES).find(
    ([_, config]) => config.label.toLowerCase().includes(normalizedLabel) ||
                     normalizedLabel.includes(config.label.toLowerCase())
  );
  if (partialMatch) return partialMatch[0];
  
  // Mapping intelligent basé sur mots-clés
  if (normalizedLabel.includes('prénom') || normalizedLabel.includes('prenom')) {
    if (normalizedLabel.includes('co-signataire 1') || normalizedLabel.includes('cosignataire 1')) return 'cosigner_name_1';
    if (normalizedLabel.includes('co-signataire 2') || normalizedLabel.includes('cosignataire 2')) return 'cosigner_name_2';
    if (normalizedLabel.includes('co-signataire 3') || normalizedLabel.includes('cosignataire 3')) return 'cosigner_name_3';
    return 'client_firstname';
  }
  
  if (normalizedLabel.includes('nom')) {
    if (normalizedLabel.includes('société') || normalizedLabel.includes('entreprise')) return 'company_name';
    if (normalizedLabel.includes('co-signataire 1') || normalizedLabel.includes('cosignataire 1')) return 'cosigner_name_1';
    if (normalizedLabel.includes('co-signataire 2') || normalizedLabel.includes('cosignataire 2')) return 'cosigner_name_2';
    if (normalizedLabel.includes('co-signataire 3') || normalizedLabel.includes('cosignataire 3')) return 'cosigner_name_3';
    return 'client_lastname';
  }
  
  if (normalizedLabel.includes('email') || normalizedLabel.includes('e-mail') || normalizedLabel.includes('mail')) {
    if (normalizedLabel.includes('co-signataire 1') || normalizedLabel.includes('cosignataire 1')) return 'cosigner_email_1';
    if (normalizedLabel.includes('co-signataire 2') || normalizedLabel.includes('cosignataire 2')) return 'cosigner_email_2';
    if (normalizedLabel.includes('co-signataire 3') || normalizedLabel.includes('cosignataire 3')) return 'cosigner_email_3';
    return 'client_email';
  }
  
  if (normalizedLabel.includes('téléphone') || normalizedLabel.includes('telephone') || normalizedLabel.includes('tel') || normalizedLabel.includes('phone')) {
    if (normalizedLabel.includes('co-signataire 1') || normalizedLabel.includes('cosignataire 1')) return 'cosigner_phone_1';
    if (normalizedLabel.includes('co-signataire 2') || normalizedLabel.includes('cosignataire 2')) return 'cosigner_phone_2';
    if (normalizedLabel.includes('co-signataire 3') || normalizedLabel.includes('cosignataire 3')) return 'cosigner_phone_3';
    return 'client_phone';
  }
  
  if (normalizedLabel.includes('adresse')) {
    if (normalizedLabel.includes('société')) return 'company_address';
    if (normalizedLabel.includes('projet')) return 'project_address';
    if (normalizedLabel.includes('co-signataire 1') || normalizedLabel.includes('cosignataire 1')) return 'cosigner_address_1';
    if (normalizedLabel.includes('co-signataire 2') || normalizedLabel.includes('cosignataire 2')) return 'cosigner_address_2';
    if (normalizedLabel.includes('co-signataire 3') || normalizedLabel.includes('cosignataire 3')) return 'cosigner_address_3';
    return 'client_address';
  }
  
  if (normalizedLabel.includes('code postal') || normalizedLabel.includes('cp')) {
    if (normalizedLabel.includes('société')) return 'company_zip';
    if (normalizedLabel.includes('projet')) return 'project_zip';
    if (normalizedLabel.includes('co-signataire 1') || normalizedLabel.includes('cosignataire 1')) return 'cosigner_zip_1';
    if (normalizedLabel.includes('co-signataire 2') || normalizedLabel.includes('cosignataire 2')) return 'cosigner_zip_2';
    if (normalizedLabel.includes('co-signataire 3') || normalizedLabel.includes('cosignataire 3')) return 'cosigner_zip_3';
    return 'client_zip';
  }
  
  if (normalizedLabel.includes('ville') || normalizedLabel.includes('city')) {
    if (normalizedLabel.includes('société')) return 'company_city';
    if (normalizedLabel.includes('projet')) return 'project_city';
    if (normalizedLabel.includes('co-signataire 1') || normalizedLabel.includes('cosignataire 1')) return 'cosigner_city_1';
    if (normalizedLabel.includes('co-signataire 2') || normalizedLabel.includes('cosignataire 2')) return 'cosigner_city_2';
    if (normalizedLabel.includes('co-signataire 3') || normalizedLabel.includes('cosignataire 3')) return 'cosigner_city_3';
    return 'client_city';
  }
  
  if (normalizedLabel.includes('naissance') || normalizedLabel.includes('birthdate')) {
    if (normalizedLabel.includes('co-signataire 1') || normalizedLabel.includes('cosignataire 1')) return 'cosigner_birthdate_1';
    if (normalizedLabel.includes('co-signataire 2') || normalizedLabel.includes('cosignataire 2')) return 'cosigner_birthdate_2';
    if (normalizedLabel.includes('co-signataire 3') || normalizedLabel.includes('cosignataire 3')) return 'cosigner_birthdate_3';
    return 'client_birthdate';
  }
  
  if (normalizedLabel.includes('siret')) return 'company_siret';
  if (normalizedLabel.includes('nationalité') || normalizedLabel.includes('nationality')) return 'client_nationality';
  
  // Retourner null si aucune correspondance trouvée
  return null;
}

/**
 * Récupérer toutes les variables d'une catégorie
 */
export function getVariablesByCategory(category) {
  const categories = {
    'client': Object.keys(CONTRACT_VARIABLES).filter(k => k.startsWith('client_')),
    'company': Object.keys(CONTRACT_VARIABLES).filter(k => k.startsWith('company_')),
    'cosigner': Object.keys(CONTRACT_VARIABLES).filter(k => k.startsWith('cosigner_')),
    'project': Object.keys(CONTRACT_VARIABLES).filter(k => k.startsWith('project_')),
    'contract': Object.keys(CONTRACT_VARIABLES).filter(k => k.startsWith('contract_')),
  };
  
  return categories[category] || [];
}
