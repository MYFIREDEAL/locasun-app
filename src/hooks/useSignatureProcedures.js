import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Calcule le hash SHA-256 d'un fichier
 * @param {Blob|File} file - Le fichier à hasher
 * @returns {Promise<string>} - Hash SHA-256 en hexadécimal
 */
export async function calculateFileHash(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    logger.error('Erreur calcul hash SHA-256', { error: error.message });
    throw error;
  }
}

/**
 * Télécharge un fichier depuis Supabase Storage et calcule son hash
 * @param {string} storagePath - Chemin du fichier dans Supabase Storage
 * @returns {Promise<string>} - Hash SHA-256 en hexadécimal
 */
export async function calculateStorageFileHash(storagePath) {
  try {
    // Télécharger le fichier depuis Storage
    const { data, error } = await supabase.storage
      .from('project-files')
      .download(storagePath);

    if (error) {
      logger.error('Erreur téléchargement fichier pour hash', { error: error.message, storagePath });
      throw error;
    }

    // Calculer le hash
    return await calculateFileHash(data);
  } catch (error) {
    logger.error('Erreur calcul hash fichier storage', { error: error.message, storagePath });
    throw error;
  }
}

/**
 * Hook pour gérer les procédures de signature AES maison
 */
export function useSignatureProcedures() {
  
  /**
   * Crée une procédure de signature AES maison
   * @param {Object} params
   * @param {string} params.organizationId - ID de l'organisation
   * @param {string} params.prospectId - ID du prospect
   * @param {string} params.projectType - Type de projet
   * @param {string} params.fileId - ID du fichier dans project_files
   * @param {string} params.storagePath - Chemin du fichier dans Storage
   * @param {string} params.signerName - Nom du signataire
   * @param {string} params.signerEmail - Email du signataire
   * @returns {Promise<Object>} - Procédure créée avec access_token
   */
  async function createSignatureProcedure({
    organizationId,
    prospectId,
    projectType,
    fileId,
    storagePath,
    signerName,
    signerEmail
  }) {
    try {
      if (!organizationId || !prospectId || !projectType || !fileId || !storagePath) {
        throw new Error('Paramètres manquants pour créer la procédure de signature');
      }

      logger.debug('Création procédure signature AES', { 
        prospectId, 
        projectType, 
        fileId,
        signerEmail 
      });

      // 1. Calculer le hash SHA-256 du PDF
      logger.debug('Calcul hash SHA-256 du document...');
      const documentHash = await calculateStorageFileHash(storagePath);
      logger.debug('Hash calculé', { documentHash: documentHash.substring(0, 16) + '...' });

      // 2. Générer un token sécurisé
      const accessToken = crypto.randomUUID();
      
      // 3. Définir expiration (7 jours)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // 4. Créer la procédure dans la DB
      const { data: procedure, error: procedureError } = await supabase
        .from('signature_procedures')
        .insert({
          organization_id: organizationId,
          prospect_id: prospectId,
          project_type: projectType,
          file_id: fileId,
          signer_name: signerName,
          signer_email: signerEmail,
          document_hash: documentHash,
          access_token: accessToken,
          token_expires_at: expiresAt.toISOString(),
          status: 'pending',
          signature_metadata: {
            created_by: 'workflow_automation',
            document_type: 'contract_pdf'
          }
        })
        .select()
        .single();

      if (procedureError) {
        logger.error('Erreur création signature_procedures', { error: procedureError.message });
        throw procedureError;
      }

      logger.debug('Procédure de signature créée', { 
        procedureId: procedure.id,
        expiresAt: expiresAt.toISOString()
      });

      return procedure;

    } catch (error) {
      logger.error('Erreur createSignatureProcedure', { error: error.message });
      throw error;
    }
  }

  /**
   * Récupère une procédure de signature par ID et token
   * @param {string} procedureId - ID de la procédure
   * @param {string} accessToken - Token d'accès
   * @returns {Promise<Object|null>} - Procédure ou null si invalide
   */
  async function getSignatureProcedure(procedureId, accessToken) {
    try {
      const { data, error } = await supabase
        .from('signature_procedures')
        .select('*, project_files!signature_procedures_file_id_fkey(*)')
        .eq('id', procedureId)
        .eq('access_token', accessToken)
        .single();

      if (error) {
        logger.error('Erreur récupération procédure', { error: error.message });
        return null;
      }

      // Vérifier expiration
      if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
        logger.warn('Token expiré', { procedureId, expiresAt: data.token_expires_at });
        
        // Mettre à jour le status
        await supabase
          .from('signature_procedures')
          .update({ status: 'expired' })
          .eq('id', procedureId);
        
        return null;
      }

      return data;

    } catch (error) {
      logger.error('Erreur getSignatureProcedure', { error: error.message });
      return null;
    }
  }

  /**
   * Valide et enregistre une signature
   * @param {string} procedureId - ID de la procédure
   * @param {Object} signatureData - Métadonnées de signature (IP, user-agent, etc.)
   * @returns {Promise<boolean>} - Succès ou échec
   */
  async function signProcedure(procedureId, signatureData = {}) {
    try {
      const metadata = {
        signed_at: new Date().toISOString(),
        ip_address: signatureData.ipAddress || null,
        user_agent: signatureData.userAgent || navigator.userAgent,
        device_info: {
          platform: navigator.platform,
          language: navigator.language
        },
        ...signatureData
      };

      const { error } = await supabase
        .from('signature_procedures')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          signature_metadata: metadata
        })
        .eq('id', procedureId);

      if (error) {
        logger.error('Erreur enregistrement signature', { error: error.message });
        return false;
      }

      logger.debug('Signature enregistrée', { procedureId, metadata });
      return true;

    } catch (error) {
      logger.error('Erreur signProcedure', { error: error.message });
      return false;
    }
  }

  return {
    createSignatureProcedure,
    getSignatureProcedure,
    signProcedure
  };
}
