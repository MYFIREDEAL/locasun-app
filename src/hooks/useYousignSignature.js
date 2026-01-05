import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Hook pour gérer les signatures électroniques Yousign
 */
export function useYousignSignature() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Lancer une signature électronique via Yousign
   * @param {Object} params
   * @param {string} params.fileId - ID du fichier à faire signer
   * @param {string} params.prospectId - ID du prospect
   * @param {string} params.projectType - Type de projet
   * @returns {Promise<Object>} - { success, procedure, signatureLink }
   */
  const createSignature = async ({ fileId, prospectId, projectType }) => {
    setLoading(true);
    setError(null);

    try {
      logger.debug('🚀 Creating Yousign signature', { fileId, prospectId, projectType });

      // Appeler l'Edge Function
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yousign-create-signature`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userData.session?.access_token}`,
          },
          body: JSON.stringify({ fileId, prospectId, projectType }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création de la signature');
      }

      logger.debug('✅ Signature created', result);

      setLoading(false);
      return result;
    } catch (err) {
      logger.error('❌ Error creating signature', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  /**
   * Récupérer les procédures de signature d'un prospect
   * @param {string} prospectId - ID du prospect
   * @returns {Promise<Array>} - Liste des procédures
   */
  const getSignatureProcedures = async (prospectId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('signature_procedures')
        .select('*')
        .eq('prospect_id', prospectId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      return data || [];
    } catch (err) {
      logger.error('❌ Error fetching signature procedures', err);
      throw err;
    }
  };

  return {
    createSignature,
    getSignatureProcedures,
    loading,
    error,
  };
}
