/**
 * 📄 MOTEUR DE RENDU DE CONTRATS
 * Interprète les templates HTML avec variables et blocs conditionnels
 */

/**
 * Remplace les variables {{variable}} par les vraies valeurs
 * Et gère les blocs conditionnels {{#if_condition}}...{{/if_condition}}
 * 
 * @param {string} template - Le template HTML avec variables et conditions
 * @param {object} data - Les données du prospect (client_firstname, company_name, etc.)
 * @returns {string} - HTML final avec variables remplacées et blocs conditionnels traités
 */
export function renderContractTemplate(template, data) {
  if (!template || typeof template !== 'string') {
    return '';
  }

  let result = template;

  // ✅ ÉTAPE 1 : Traiter les blocs conditionnels
  result = processConditionalBlocks(result, data);

  // ✅ ÉTAPE 2 : Remplacer les variables simples {{variable}}
  result = replaceVariables(result, data);

  return result;
}

/**
 * Traite les blocs conditionnels {{#if_condition}}...{{/if_condition}}
 */
function processConditionalBlocks(template, data) {
  let result = template;

  // Liste des conditions supportées
  const conditions = [
    'if_individual',    // Si c'est un particulier (client_firstname existe)
    'if_company',       // Si c'est une entreprise (company_name existe)
    'if_cosigner_1',    // Si co-signataire 1 existe
    'if_cosigner_2',    // Si co-signataire 2 existe
    'if_cosigner_3',    // Si co-signataire 3 existe
  ];

  console.log('🔍 processConditionalBlocks - Data reçue:', {
    hasClientFirstname: !!data.client_firstname,
    hasClientLastname: !!data.client_lastname,
    hasCompanyName: !!data.company_name,
    hasCosigner1: !!data.cosigner_name_1,
    hasCosigner2: !!data.cosigner_name_2,
    hasCosigner3: !!data.cosigner_name_3,
    allKeys: Object.keys(data).filter(k => k.includes('cosigner'))
  });

  conditions.forEach(condition => {
    const regex = new RegExp(`\\{\\{#${condition}\\}\\}([\\s\\S]*?)\\{\\{\\/${condition}\\}\\}`, 'g');
    
    result = result.replace(regex, (match, blockContent) => {
      const shouldDisplay = evaluateCondition(condition, data);
      console.log(`🔍 Condition ${condition}: ${shouldDisplay ? 'AFFICHER' : 'MASQUER'}`);
      return shouldDisplay ? blockContent : '';
    });
  });

  return result;
}

/**
 * Évalue si une condition est vraie selon les données
 */
function evaluateCondition(condition, data) {
  switch (condition) {
    case 'if_individual':
      // Afficher si c'est un particulier (a un prénom/nom client)
      return !!(data.client_firstname || data.client_lastname);
    
    case 'if_company':
      // Afficher si c'est une entreprise (a un nom de société)
      return !!(data.company_name);
    
    case 'if_cosigner_1':
      // Afficher si co-signataire 1 existe
      return !!(data.cosigner_name_1);
    
    case 'if_cosigner_2':
      // Afficher si co-signataire 2 existe
      return !!(data.cosigner_name_2);
    
    case 'if_cosigner_3':
      // Afficher si co-signataire 3 existe
      return !!(data.cosigner_name_3);
    
    default:
      return false;
  }
}

/**
 * Remplace toutes les variables {{variable}} par leurs valeurs
 */
function replaceVariables(template, data) {
  let result = template;

  // Regex pour capturer {{variable_name}}
  const variableRegex = /\{\{(\w+)\}\}/g;

  result = result.replace(variableRegex, (match, variableName) => {
    const value = data[variableName];
    
    // Si la valeur existe, on la retourne
    // Sinon, on retourne une chaîne vide (pas la variable {{...}})
    return value !== undefined && value !== null && value !== '' 
      ? value 
      : '';
  });

  return result;
}

/**
 * Extrait les données d'un prospect pour le rendu de contrat
 * Transforme les données Supabase (snake_case) en format template (snake_case aussi)
 */
export function extractProspectData(prospect) {
  if (!prospect) {
    return {};
  }

  return {
    // Client (particulier)
    client_firstname: prospect.firstname || '',
    client_lastname: prospect.lastname || '',
    client_email: prospect.email || '',
    client_phone: prospect.phone || '',
    client_address: prospect.address || '',
    client_zip: prospect.zip || '',
    client_city: prospect.city || '',
    client_birthdate: prospect.birthdate || '',
    client_birthplace: prospect.birthplace || '',
    client_nationality: prospect.nationality || '',
    client_signature: '[Signature client]',

    // Société (entreprise)
    company_name: prospect.company_name || '',
    company_legal_form: prospect.company_legal_form || '',
    company_capital: prospect.company_capital || '',
    company_siret: prospect.company_siret || '',
    company_address: prospect.company_address || prospect.address || '',
    company_zip: prospect.company_zip || prospect.zip || '',
    company_city: prospect.company_city || prospect.city || '',
    company_rcs_number: prospect.company_rcs_number || '',
    company_rcs_city: prospect.company_rcs_city || '',
    company_representative_name: prospect.company_representative_name || '',
    company_representative_role: prospect.company_representative_role || '',
    company_signature: '[Signature société]',

    // Co-signataires (si form_data contient ces infos)
    cosigner_name_1: prospect.form_data?.cosigner_name_1 || '',
    cosigner_email_1: prospect.form_data?.cosigner_email_1 || '',
    cosigner_phone_1: prospect.form_data?.cosigner_phone_1 || '',
    cosigner_address_1: prospect.form_data?.cosigner_address_1 || '',
    cosigner_zip_1: prospect.form_data?.cosigner_zip_1 || '',
    cosigner_city_1: prospect.form_data?.cosigner_city_1 || '',
    cosigner_birthdate_1: prospect.form_data?.cosigner_birthdate_1 || '',
    cosigner_nationality_1: prospect.form_data?.cosigner_nationality_1 || '',
    cosigner_signature_line_1: '[Signature co-signataire 1]',

    cosigner_name_2: prospect.form_data?.cosigner_name_2 || '',
    cosigner_email_2: prospect.form_data?.cosigner_email_2 || '',
    cosigner_phone_2: prospect.form_data?.cosigner_phone_2 || '',
    cosigner_address_2: prospect.form_data?.cosigner_address_2 || '',
    cosigner_zip_2: prospect.form_data?.cosigner_zip_2 || '',
    cosigner_city_2: prospect.form_data?.cosigner_city_2 || '',
    cosigner_birthdate_2: prospect.form_data?.cosigner_birthdate_2 || '',
    cosigner_nationality_2: prospect.form_data?.cosigner_nationality_2 || '',
    cosigner_signature_line_2: '[Signature co-signataire 2]',

    cosigner_name_3: prospect.form_data?.cosigner_name_3 || '',
    cosigner_email_3: prospect.form_data?.cosigner_email_3 || '',
    cosigner_phone_3: prospect.form_data?.cosigner_phone_3 || '',
    cosigner_address_3: prospect.form_data?.cosigner_address_3 || '',
    cosigner_zip_3: prospect.form_data?.cosigner_zip_3 || '',
    cosigner_city_3: prospect.form_data?.cosigner_city_3 || '',
    cosigner_birthdate_3: prospect.form_data?.cosigner_birthdate_3 || '',
    cosigner_nationality_3: prospect.form_data?.cosigner_nationality_3 || '',
    cosigner_signature_line_3: '[Signature co-signataire 3]',

    // Projet
    project_address: prospect.form_data?.project_address || prospect.address || '',
    project_zip: prospect.form_data?.project_zip || prospect.zip || '',
    project_city: prospect.form_data?.project_city || prospect.city || '',
    project_type: prospect.tags?.[0] || '',
    project_power: prospect.form_data?.project_power || '',
    project_amount: prospect.form_data?.project_amount || '',

    // Dates
    current_date: new Date().toLocaleDateString('fr-FR'),
    contract_date: new Date().toLocaleDateString('fr-FR'),
    contract_start_date: prospect.form_data?.contract_start_date || '',
    contract_end_date: prospect.form_data?.contract_end_date || '',
    signature_date: new Date().toLocaleDateString('fr-FR'),
    contract_place: prospect.city || '',

    // Contrat
    contract_reference: prospect.form_data?.contract_reference || `REF-${prospect.id?.slice(0, 8)}`,
    contract_amount: prospect.form_data?.contract_amount || prospect.form_data?.project_amount || '',
  };
}
