import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from './supabase';
import { logger } from './logger';

/**
 * Génère un PDF à partir d'un template HTML et des données prospect
 * @param {Object} params
 * @param {string} params.templateHtml - HTML du template
 * @param {Object} params.prospectData - Données du prospect
 * @param {Array} params.cosigners - Tableau des co-signataires [{name, email, phone}]
 * @param {string} params.projectType - Type de projet
 * @param {string} params.prospectId - ID du prospect
 * @returns {Promise<Object>} - { success, fileData } ou { success: false, error }
 */
export async function generateContractPDF({
  templateHtml,
  prospectData,
  cosigners = [],
  projectType,
  prospectId,
}) {
  let tempContainer = null;
  
  try {
    logger.debug('Génération PDF contract', { projectType, prospectId, cosignersCount: cosigners.length });

    // 1. Injecter les données du prospect ET des cosigners dans le HTML
    const htmlWithData = injectProspectData(templateHtml, prospectData, cosigners);
    
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
 * @returns {string} - HTML avec données injectées
 */
function injectProspectData(html, prospect, cosigners = []) {
  if (!html || html.trim() === '') {
    logger.warn('Template HTML vide ou undefined');
    return '<div style="padding: 40px; font-family: Arial;"><h1>Contrat</h1><p>Template non configuré</p></div>';
  }

  logger.debug('Injection données prospect + cosigners', { 
    name: prospect.name, 
    email: prospect.email,
    phone: prospect.phone,
    cosignersCount: cosigners.length
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

  let result = html;

  // Variables disponibles (mapping avec colonnes Supabase)
  // Support SIMPLE et DOUBLE accolades + noms FR et EN
  const variables = {
    // Format simple accolade (FR)
    '{nom}': lastName || prospect.name || '',
    '{prenom}': firstName || '',
    '{nom_complet}': prospect.name || '',
    '{email}': prospect.email || '',
    '{telephone}': prospect.phone || '',
    '{adresse}': street || prospect.address || '',
    '{adresse_complete}': prospect.address || '',
    '{ville}': city || '',
    '{code_postal}': zipCode || '',
    '{entreprise}': prospect.company_name || '',
    '{date_du_jour}': new Date().toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }),
    '{date_signature}': new Date().toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }),
    
    // Format double accolade (EN) - utilisé dans le template
    '{{client_lastname}}': lastName || prospect.name || '',
    '{{client_firstname}}': firstName || '',
    '{{client_email}}': prospect.email || '',
    '{{client_phone}}': prospect.phone || '',
    '{{client_address}}': street || prospect.address || '',
    '{{client_city}}': city || '',
    '{{client_zip}}': zipCode || '',
    '{{signature_date}}': new Date().toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }),
  };

  // 🔥 AJOUTER LES VARIABLES DES CO-SIGNATAIRES
  // Format: {{cosigner_1_name}}, {{cosigner_1_email}}, {{cosigner_1_phone}}
  cosigners.forEach((cosigner, index) => {
    const num = index + 1; // Index commence à 1
    
    // Séparer nom/prénom du co-signataire
    const cosignerNameParts = (cosigner.name || '').split(' ');
    const cosignerFirstName = cosignerNameParts[0] || '';
    const cosignerLastName = cosignerNameParts.slice(1).join(' ') || '';
    
    variables[`{{cosigner_${num}_name}}`] = cosigner.name || '';
    variables[`{{cosigner_${num}_firstname}}`] = cosignerFirstName;
    variables[`{{cosigner_${num}_lastname}}`] = cosignerLastName;
    variables[`{{cosigner_${num}_email}}`] = cosigner.email || '';
    variables[`{{cosigner_${num}_phone}}`] = cosigner.phone || '';
  });

  logger.debug('Variables injectées', { 
    prospectVars: 8,
    cosignerVars: cosigners.length * 5,
    totalVars: Object.keys(variables).length
  });

  // Remplacer toutes les variables
  Object.entries(variables).forEach(([placeholder, value]) => {
    // Échapper les accolades pour regex
    const escapedPlaceholder = placeholder.replace(/[{}]/g, '\\$&');
    const regex = new RegExp(escapedPlaceholder, 'g');
    result = result.replace(regex, value);
  });

  logger.debug('HTML après injection', { 
    variables: Object.fromEntries(Object.entries(variables).map(([k, v]) => [k, v ? v.substring(0, 50) : ''])),
    resultLength: result.length 
  });

  return result;
}

/**
 * Upload le PDF dans Supabase Storage et l'ajoute à la table project_files
 * @param {Object} params
 * @param {File} params.pdfFile - Fichier PDF
 * @param {string} params.projectType - Type de projet
 * @param {string} params.prospectId - ID du prospect
 * @param {string} params.fileName - Nom du fichier
 * @returns {Promise<Object>} - { success, data } ou { success: false, error }
 */
export async function uploadContractPDF({
  pdfFile,
  projectType,
  prospectId,
  fileName,
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
 * @returns {Promise<Object>} - { success, data } ou { success: false, error }
 */
export async function executeContractSignatureAction({
  templateId,
  projectType,
  prospectId,
  cosigners = [],
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

    // 3. Générer le PDF (inclut upload automatique) AVEC les cosigners
    const pdfResult = await generateContractPDF({
      templateHtml: template.content_html,
      prospectData: prospect,
      cosigners, // ⭐ Passer les cosigners
      projectType,
      prospectId,
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
