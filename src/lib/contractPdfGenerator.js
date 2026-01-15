import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from './supabase';
import { logger } from './logger';
import { renderContractTemplate } from '@/utils/contractRenderer';

/**
 * Génère un PDF à partir d'un template HTML et des données prospect
 * @param {Object} params
 * @param {string} params.templateHtml - HTML du template
 * @param {Object} params.prospectData - Données du prospect
 * @param {Array} params.cosigners - Tableau des co-signataires [{name, email, phone}]
 * @param {string} params.projectType - Type de projet
 * @param {string} params.prospectId - ID du prospect
 * @param {string} params.organizationId - ID de l'organisation (requis pour RLS)
 * @returns {Promise<Object>} - { success, fileData } ou { success: false, error }
 */
export async function generateContractPDF({
  templateHtml,
  prospectData,
  cosigners = [],
  formData = {}, // 🔥 Données générales du formulaire mappées
  projectType,
  prospectId,
  organizationId, // ✅ Requis pour multi-tenant RLS
}) {
  let tempContainer = null;
  
  try {
    logger.debug('Génération PDF contract', { projectType, prospectId, cosignersCount: cosigners.length });

    // 1. Injecter les données du prospect ET des cosigners ET du formulaire dans le HTML
    const htmlWithData = injectProspectData(templateHtml, prospectData, cosigners, formData);
    
    logger.debug('HTML après injection', { 
      htmlLength: htmlWithData.length,
      htmlPreview: htmlWithData.substring(0, 200)
    });

    // 2. Créer un conteneur temporaire VISIBLE
    tempContainer = document.createElement('div');
    tempContainer.id = 'pdf-temp-container';
    tempContainer.innerHTML = htmlWithData;
    
    // Style pour rendre visible mais hors écran
    tempContainer.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 794px;
      min-height: 1123px;
      padding: 40px;
      background: white;
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #000;
      z-index: 9999;
      visibility: visible;
      opacity: 1;
      text-decoration: none !important;
    `;
    
    // Ajouter CSS global pour désactiver les décorations de texte
    const style = document.createElement('style');
    style.textContent = `
      #pdf-temp-container * {
        text-decoration: none !important;
      }
      #pdf-temp-container hr {
        height: 1px;
        background-color: #000;
        border: none;
        margin: 20px 0;
        display: block;
        position: relative;
      }
      #pdf-temp-container p {
        position: relative;
        z-index: 2;
      }
    `;
    tempContainer.appendChild(style);
    
    document.body.appendChild(tempContainer);
    
    // 3. Attendre le rendu
    await new Promise(resolve => setTimeout(resolve, 500));
    
    logger.debug('Conteneur créé et rendu', { 
      width: tempContainer.offsetWidth,
      height: tempContainer.offsetHeight 
    });

    // 4. Capturer avec html2canvas
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: true,
      width: 794,
      windowWidth: 794,
    });

    logger.debug('Canvas créé', { 
      width: canvas.width, 
      height: canvas.height 
    });

    // 5. Créer le PDF avec jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdfWidth = 210; // A4 width in mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    // 6. Convertir en Blob puis File
    const pdfBlob = pdf.output('blob');
    const fileName = `contrat-${projectType}-${Date.now()}.pdf`;
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    logger.debug('PDF généré avec succès', { fileName, size: pdfFile.size });

    // 7. Uploader vers Supabase Storage
    const uploadResult = await uploadContractPDF({
      pdfFile,
      prospectId,
      projectType,
      fileName,
      organizationId, // ✅ Passer l'organization_id
    });

    if (!uploadResult.success) {
      throw new Error(uploadResult.error);
    }

    return {
      success: true,
      fileData: uploadResult.data, // Retourner la ligne project_files, pas le pdfFile
      fileName,
    };
  } catch (error) {
    logger.error('Erreur génération PDF contract', { 
      errorMessage: error.message,
      errorDetails: error,
      errorStack: error.stack 
    });
    return {
      success: false,
      error: error.message,
    };
  } finally {
    // Nettoyer le conteneur temporaire
    if (tempContainer && tempContainer.parentNode) {
      document.body.removeChild(tempContainer);
    }
  }
}

/**
 * Injecte les données du prospect ET des co-signataires dans le template HTML
 * @param {string} html - Template HTML
 * @param {Object} prospect - Données du prospect (depuis Supabase)
 * @param {Array} cosigners - Tableau des co-signataires [{name, email, phone}]
 * @param {Object} formData - Données du formulaire mappées
 * @returns {string} - HTML avec données injectées
 */
function injectProspectData(html, prospect, cosigners = [], formData = {}) {
  if (!html || html.trim() === '') {
    logger.warn('Template HTML vide ou undefined');
    return '<div style="padding: 40px; font-family: Arial;"><h1>Contrat</h1><p>Template non configuré</p></div>';
  }

  logger.debug('Injection données prospect + cosigners + formData', { 
    name: prospect.name, 
    email: prospect.email,
    phone: prospect.phone,
    cosignersCount: cosigners.length,
    formDataKeys: Object.keys(formData)
  });

  // Parser l'adresse complète (peut contenir ville, code postal)
  const addressParts = (prospect.address || '').split(',').map(p => p.trim());
  const street = addressParts[0] || '';
  const cityZip = addressParts[1] || '';
  
  // Essayer d'extraire code postal et ville du format "75001 Paris"
  const cityZipMatch = cityZip.match(/(\d{5})\s+(.+)/);
  const zipCode = cityZipMatch ? cityZipMatch[1] : '';
  const city = cityZipMatch ? cityZipMatch[2] : cityZip;

  // Séparer nom et prénom si possible (format: "Prénom Nom")
  const nameParts = (prospect.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // 🔥 PRÉPARER TOUTES LES DONNÉES POUR LE RENDERER
  const contractData = {
    // CLIENT (depuis prospect)
    client_firstname: firstName || formData.client_firstname || '',
    client_lastname: lastName || formData.client_lastname || '',
    client_email: prospect.email || formData.client_email || '',
    client_phone: prospect.phone || formData.client_phone || '',
    client_address: street || prospect.address || formData.client_address || '',
    client_city: city || formData.client_city || '',
    client_zip: zipCode || formData.client_zip || '',
    
    // SOCIÉTÉ (depuis formData prioritaire)
    company_name: formData.company_name || prospect.company_name || '',
    company_siret: formData.company_siret || '',
    company_legal_form: formData.company_legal_form || '',
    company_capital: formData.company_capital || '',
    company_address: formData.company_address || '',
    company_city: formData.company_city || '',
    company_zip: formData.company_zip || '',
    
    // DATES
    signature_date: new Date().toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }),
    contract_date: formData.contract_date || new Date().toLocaleDateString('fr-FR'),
    
    // 🔥 AJOUTER TOUTES LES DONNÉES DU FORMULAIRE
    ...formData,
  };

  // 🔥 AJOUTER LES CO-SIGNATAIRES DYNAMIQUEMENT
  cosigners.forEach((cosigner, index) => {
    const num = index + 1;
    
    // Pour chaque propriété du cosignataire, créer les variables
    Object.entries(cosigner).forEach(([varName, value]) => {
      const cleanVarName = varName.replace(/^cosigner_/, '');
      
      // 🔥 3 FORMATS pour compatibilité maximale:
      // 1. cosigner_xxx_1 (utilisé dans templates)
      contractData[`cosigner_${cleanVarName}_${num}`] = value || '';
      // 2. cosigner_1_xxx (format alternatif)
      contractData[`cosigner_${num}_${cleanVarName}`] = value || '';
      // 3. cosigner_xxx_1 SANS le préfixe cosigner_ si déjà présent (pour le renderer)
      // Si la variable est "name", on veut aussi "cosigner_name_1" pour if_cosigner_1
      if (!varName.startsWith('cosigner_')) {
        contractData[`cosigner_${varName}_${num}`] = value || '';
      }
    });
  });

  logger.debug('Données contractData préparées', { 
    hasClient: !!(contractData.client_firstname || contractData.client_lastname),
    hasCompany: !!contractData.company_name,
    cosignersCount: cosigners.length,
    totalKeys: Object.keys(contractData).length
  });

  console.log('🔥🔥🔥 AVANT renderContractTemplate', { 
    htmlLength: html.length,
    dataKeys: Object.keys(contractData).length,
    hasClientFirstname: !!contractData.client_firstname,
    hasCompanyName: !!contractData.company_name,
    contractDataType: typeof contractData,
    contractDataConstructor: contractData?.constructor?.name,
    allEnumerableKeys: Object.keys(contractData),
    allOwnPropertyNames: Object.getOwnPropertyNames(contractData),
    sampleValues: {
      client_firstname: contractData.client_firstname,
      cosigner_name_1: contractData.cosigner_name_1
    }
  });

  // 🔥 UTILISER LE RENDERER CENTRALISÉ AU LIEU DE LA LOGIQUE DUPLIQUÉE
  const renderedHtml = renderContractTemplate(html, contractData);
  
  console.log('🔥🔥🔥 APRÈS renderContractTemplate', { 
    renderedLength: renderedHtml.length 
  });

  logger.debug('HTML après renderContractTemplate', { 
    htmlLength: renderedHtml.length
  });

  return renderedHtml;
}

/**
 * Upload un PDF contract dans Supabase Storage et référence dans project_files
 * @param {Object} params
 * @param {File} params.pdfFile - Le fichier PDF généré
 * @param {string} params.projectType - Type de projet
 * @param {string} params.prospectId - ID du prospect
 * @param {string} params.fileName - Nom du fichier
 * @param {string} params.organizationId - ID de l'organisation (requis pour RLS)
 * @returns {Promise<Object>} - { success, data } ou { success: false, error }
 */
export async function uploadContractPDF({
  pdfFile,
  projectType,
  prospectId,
  fileName,
  organizationId, // ✅ Requis pour multi-tenant RLS
}) {
  try {
    logger.debug('Upload PDF contract dans Storage', { 
      projectType, 
      prospectId, 
      fileName,
      fileSize: pdfFile.size,
      fileType: pdfFile.type 
    });

    // 1. Générer le chemin de stockage
    const storagePath = `${projectType}/${fileName}`;

    logger.debug('Tentative upload Storage', { storagePath, bucket: 'project-files' });

    // 2. Upload dans Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(storagePath, pdfFile, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      logger.error('Erreur upload Storage', { 
        error: uploadError.message,
        statusCode: uploadError.statusCode,
        details: uploadError 
      });
      throw uploadError;
    }

    logger.debug('Upload Storage réussi', { uploadData });

    // 🔥 VALIDATION: organization_id requis par RLS
    if (!organizationId) {
      throw new Error('Organization ID manquant - Impossible d\'uploader le contrat PDF');
    }

    // 3. Insérer dans la table project_files
    const { data, error: insertError } = await supabase
      .from('project_files')
      .insert([
        {
          project_type: projectType,
          prospect_id: prospectId,
          file_name: fileName,
          file_type: 'application/pdf',
          file_size: pdfFile.size,
          storage_path: storagePath,
          uploaded_by: null, // Système/workflow
          field_label: 'Contrat généré automatiquement',
          organization_id: organizationId, // ✅ Ajouté pour multi-tenant RLS
        },
      ])
      .select()
      .single();

    if (insertError) {
      logger.error('Erreur insert project_files', { error: insertError.message });
      throw insertError;
    }

    logger.debug('PDF contract uploadé avec succès', { fileId: data.id });

    return {
      success: true,
      data,
    };
  } catch (error) {
    logger.error('Erreur upload contract PDF', { 
      errorMessage: error.message,
      errorDetails: error,
      errorStack: error.stack 
    });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Exécute l'action complète : génération + upload
 * @param {Object} params
 * @param {string} params.templateId - ID du template de contrat
 * @param {string} params.projectType - Type de projet
 * @param {string} params.prospectId - ID du prospect
 * @param {Array} params.cosigners - Tableau des co-signataires [{name, email, phone}]
 * @param {string} params.organizationId - ID de l'organisation (requis pour RLS)
 * @returns {Promise<Object>} - { success, data } ou { success: false, error }
 */
export async function executeContractSignatureAction({
  templateId,
  projectType,
  prospectId,
  cosigners = [],
  formData = {}, // 🔥 Données générales du formulaire mappées
  organizationId, // ✅ Requis pour multi-tenant RLS
}) {
  try {
    logger.debug('Exécution action launch_signature', { templateId, projectType, prospectId, cosignersCount: cosigners.length });

    // 1. Charger le template
    const { data: template, error: templateError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new Error(`Template introuvable: ${templateId}`);
    }

    // 2. Charger les données du prospect
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', prospectId)
      .single();

    if (prospectError || !prospect) {
      throw new Error(`Prospect introuvable: ${prospectId}`);
    }

    // 3. Générer le PDF (inclut upload automatique) AVEC les cosigners ET formData
    const pdfResult = await generateContractPDF({
      templateHtml: template.content_html,
      prospectData: prospect,
      cosigners, // ⭐ Passer les cosigners
      formData, // 🔥 Passer les données du formulaire
      projectType,
      prospectId,
      organizationId, // ✅ Passer l'organization_id
    });

    if (!pdfResult.success) {
      throw new Error(`Erreur génération PDF: ${pdfResult.error}`);
    }

    logger.debug('Action launch_signature exécutée avec succès', { fileId: pdfResult.fileData.id });

    return {
      success: true,
      fileData: pdfResult.fileData, // Retourner fileData pour cohérence
      data: pdfResult.fileData,
    };
  } catch (error) {
    logger.error('Erreur exécution action launch_signature', { 
      errorMessage: error.message,
      errorDetails: error,
      errorStack: error.stack 
    });
    return {
      success: false,
      error: error.message,
    };
  }
}
