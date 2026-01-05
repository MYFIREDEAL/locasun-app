import html2pdf from 'html2pdf.js';
import { supabase } from './supabase';
import { logger } from './logger';

/**
 * Génère un PDF à partir d'un template HTML et des données prospect
 * @param {Object} params
 * @param {string} params.templateHtml - HTML du template
 * @param {Object} params.prospectData - Données du prospect
 * @param {string} params.projectType - Type de projet
 * @param {string} params.prospectId - ID du prospect
 * @returns {Promise<Object>} - { success, fileData } ou { success: false, error }
 */
export async function generateContractPDF({
  templateHtml,
  prospectData,
  projectType,
  prospectId,
}) {
  try {
    logger.debug('Génération PDF contract', { projectType, prospectId });

    // 1. Injecter les données du prospect dans le HTML
    const htmlWithData = injectProspectData(templateHtml, prospectData);
    
    logger.debug('HTML après injection', { 
      htmlLength: htmlWithData.length,
      htmlPreview: htmlWithData.substring(0, 200)
    });

    // 2. Créer un élément temporaire VISIBLE pour le rendu
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlWithData;
    tempDiv.style.position = 'fixed';
    tempDiv.style.top = '0';
    tempDiv.style.left = '0';
    tempDiv.style.width = '210mm'; // Format A4
    tempDiv.style.minHeight = '297mm'; // Hauteur A4
    tempDiv.style.padding = '20px';
    tempDiv.style.background = 'white';
    tempDiv.style.zIndex = '-1'; // Derrière tout mais visible pour le rendu
    tempDiv.style.opacity = '0'; // Invisible pour l'utilisateur
    document.body.appendChild(tempDiv);

    // 3. Attendre que le DOM soit prêt
    await new Promise(resolve => setTimeout(resolve, 100));

    // 4. Options de génération PDF
    const options = {
      margin: [10, 10, 10, 10],
      filename: `contrat-${projectType}-${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false,
        letterRendering: true,
        allowTaint: true
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    // 5. Générer le PDF
    const pdfBlob = await html2pdf()
      .set(options)
      .from(tempDiv)
      .output('blob');

    // 6. Nettoyer
    document.body.removeChild(tempDiv);

    // 6. Convertir en File
    const fileName = `contrat-${projectType}-${Date.now()}.pdf`;
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    logger.debug('PDF généré avec succès', { fileName, size: pdfFile.size });

    return {
      success: true,
      fileData: pdfFile,
      fileName,
    };
  } catch (error) {
    logger.error('Erreur génération PDF contract', { error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Injecte les données du prospect dans le template HTML
 * @param {string} html - Template HTML
 * @param {Object} prospect - Données du prospect
 * @returns {string} - HTML avec données injectées
 */
function injectProspectData(html, prospect) {
  if (!html || html.trim() === '') {
    logger.warn('Template HTML vide ou undefined');
    return '<div style="padding: 40px; font-family: Arial;"><h1>Contrat</h1><p>Template non configuré</p></div>';
  }

  let result = html;

  // Variables disponibles
  const variables = {
    '{nom}': prospect.name || '',
    '{prenom}': prospect.first_name || '',
    '{nom_complet}': `${prospect.first_name || ''} ${prospect.name || ''}`.trim(),
    '{email}': prospect.email || '',
    '{telephone}': prospect.phone || '',
    '{adresse}': prospect.address || '',
    '{ville}': prospect.city || '',
    '{code_postal}': prospect.zip || '',
    '{date_du_jour}': new Date().toLocaleDateString('fr-FR'),
    '{date_signature}': new Date().toLocaleDateString('fr-FR'),
  };

  // Remplacer toutes les variables
  Object.entries(variables).forEach(([placeholder, value]) => {
    result = result.replace(new RegExp(placeholder, 'g'), value);
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
    logger.debug('Upload PDF contract dans Storage', { projectType, prospectId, fileName });

    // 1. Générer le chemin de stockage
    const storagePath = `${projectType}/${fileName}`;

    // 2. Upload dans Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(storagePath, pdfFile, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      logger.error('Erreur upload Storage', { error: uploadError.message });
      throw uploadError;
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
    logger.error('Erreur upload contract PDF', { error: error.message });
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
 * @returns {Promise<Object>} - { success, data } ou { success: false, error }
 */
export async function executeContractSignatureAction({
  templateId,
  projectType,
  prospectId,
}) {
  try {
    logger.debug('Exécution action launch_signature', { templateId, projectType, prospectId });

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

    // 3. Générer le PDF
    const pdfResult = await generateContractPDF({
      templateHtml: template.content_html,
      prospectData: prospect,
      projectType,
      prospectId,
    });

    if (!pdfResult.success) {
      throw new Error(`Erreur génération PDF: ${pdfResult.error}`);
    }

    // 4. Upload le PDF
    const uploadResult = await uploadContractPDF({
      pdfFile: pdfResult.fileData,
      projectType,
      prospectId,
      fileName: pdfResult.fileName,
    });

    if (!uploadResult.success) {
      throw new Error(`Erreur upload PDF: ${uploadResult.error}`);
    }

    logger.debug('Action launch_signature exécutée avec succès', { fileId: uploadResult.data.id });

    return {
      success: true,
      data: uploadResult.data,
    };
  } catch (error) {
    logger.error('Erreur exécution action launch_signature', { error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
}
