import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook pour gérer les paramètres de l'entreprise (logo, nom, etc.)
 * avec real-time sync depuis Supabase
 * 
 * Structure de la table company_settings:
 * - id: UUID (singleton, une seule ligne)
 * - logo_url: TEXT (URL ou base64 du logo)
 * - company_name: TEXT
 * - settings: JSONB (config formulaire contact, etc.)
 */
export const useSupabaseCompanySettings = () => {
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Flag pour savoir si la mise à jour vient de nous (ne pas afficher le toast)
  const isLocalUpdate = useRef(false);

  // ID fixe du singleton (une seule ligne dans la table)
  const COMPANY_SETTINGS_ID = '9769af46-b3ac-4909-8810-a8cf3fd6e307';

  // Charger les paramètres au montage
  const fetchCompanySettings = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', COMPANY_SETTINGS_ID)
        .single();

      if (fetchError) throw fetchError;

      setCompanySettings(data);
      setError(null);
    } catch (err) {
      logger.error('Erreur chargement company settings:', { error: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  // 🔥 REAL-TIME : Écouter les changements en temps réel
  useEffect(() => {
    const channel = supabase
      .channel('company-settings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'company_settings',
          filter: `id=eq.${COMPANY_SETTINGS_ID}`
        },
        (payload) => {
          // Mettre à jour l'état seulement si les données ont vraiment changé
          setCompanySettings(prev => {
            // Éviter les mises à jour inutiles
            if (JSON.stringify(prev) === JSON.stringify(payload.new)) {
              return prev;
            }
            
            // Pas de toast : le logo se met à jour silencieusement via real-time
            // (Évite la confusion entre modifications locales et distantes)
            
            // Reset le flag après traitement
            isLocalUpdate.current = false;
            
            return payload.new;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * ✅ METTRE À JOUR LE LOGO
   * @param {string} logoData - URL ou base64 du logo
   */
  const updateLogo = async (logoData) => {
    try {
      // Marquer comme mise à jour locale (pour ne pas afficher le toast)
      isLocalUpdate.current = true;

      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ 
          logo_url: logoData,
          updated_at: new Date().toISOString()
        })
        .eq('id', COMPANY_SETTINGS_ID);

      if (updateError) {
        logger.error('Supabase update error details:', { error: updateError.message });
        isLocalUpdate.current = false; // Reset en cas d'erreur
        throw updateError;
      }
      
      // Mise à jour immédiate de l'état local (ne pas attendre le real-time)
      setCompanySettings(prev => ({
        ...prev,
        logo_url: logoData,
        updated_at: new Date().toISOString()
      }));

      toast({
        title: "Logo mis à jour !",
        description: "Le logo de l'entreprise a été modifié.",
        className: "bg-green-500 text-white",
      });

      // Pas besoin de retourner les données, le real-time s'en charge
      return true;
    } catch (err) {
      logger.error('Erreur update logo:', { error: err.message });
      toast({
        title: "Erreur",
        description: err.message || "Impossible de mettre à jour le logo.",
        variant: "destructive",
      });
      throw err;
    }
  };

  /**
   * ✅ SUPPRIMER LE LOGO
   */
  const removeLogo = async () => {
    try {
      // Marquer comme mise à jour locale (pour ne pas afficher le toast)
      isLocalUpdate.current = true;

      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ 
          logo_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', COMPANY_SETTINGS_ID);

      if (updateError) {
        logger.error('Supabase remove error details:', { error: updateError.message });
        isLocalUpdate.current = false; // Reset en cas d'erreur
        throw updateError;
      }
      
      // Mise à jour immédiate de l'état local (ne pas attendre le real-time)
      setCompanySettings(prev => ({
        ...prev,
        logo_url: null,
        updated_at: new Date().toISOString()
      }));

      toast({
        title: "Logo supprimé",
        description: "Le logo de l'entreprise a été retiré.",
        className: "bg-blue-500 text-white",
      });

      // Pas besoin de retourner les données, le real-time s'en charge
      return true;
    } catch (err) {
      logger.error('Erreur suppression logo:', { error: err.message });
      toast({
        title: "Erreur",
        description: err.message || "Impossible de supprimer le logo.",
        variant: "destructive",
      });
      throw err;
    }
  };

  /**
   * ✅ METTRE À JOUR LES SETTINGS (formulaire contact, etc.)
   * @param {Object} newSettings - Nouvel objet settings
   */
  const updateSettings = async (newSettings) => {
    try {
      // Marquer comme mise à jour locale (pour ne pas afficher le toast)
      isLocalUpdate.current = true;

      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ 
          settings: newSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', COMPANY_SETTINGS_ID);

      if (updateError) {
        logger.error('Supabase settings update error details:', { error: updateError.message });
        isLocalUpdate.current = false; // Reset en cas d'erreur
        throw updateError;
      }
      
      // Mise à jour immédiate de l'état local (ne pas attendre le real-time)
      setCompanySettings(prev => ({
        ...prev,
        settings: newSettings,
        updated_at: new Date().toISOString()
      }));

      // Pas besoin de retourner les données, le real-time s'en charge
      return true;
    } catch (err) {
      logger.error('Erreur update settings:', { error: err.message });
      toast({
        title: "Erreur",
        description: err.message || "Impossible de mettre à jour les paramètres.",
        variant: "destructive",
      });
      throw err;
    }
  };

  /**
   * ✅ METTRE À JOUR LA CONFIG DU FORMULAIRE CONTACT
   * @param {Array} formContactConfig - Array de champs du formulaire
   */
  const updateFormContactConfig = async (formContactConfig) => {
    try {
      // Marquer comme mise à jour locale
      isLocalUpdate.current = true;

      // Récupérer les settings actuels et ajouter/modifier form_contact_config
      const currentSettings = companySettings?.settings || {};
      const newSettings = {
        ...currentSettings,
        form_contact_config: formContactConfig
      };

      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ 
          settings: newSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', COMPANY_SETTINGS_ID);

      if (updateError) {
        logger.error('Supabase form contact update error:', { error: updateError.message });
        isLocalUpdate.current = false;
        throw updateError;
      }
      
      // Mise à jour immédiate de l'état local
      setCompanySettings(prev => ({
        ...prev,
        settings: newSettings,
        updated_at: new Date().toISOString()
      }));

      // Pas besoin de toast pour les changements de config
      return true;
    } catch (err) {
      logger.error('Erreur update form contact config:', { error: err.message });
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le formulaire de contact.",
        variant: "destructive",
      });
      throw err;
    }
  };

  /**
   * ✅ RÉCUPÉRER LA CONFIG DU FORMULAIRE CONTACT
   * @returns {Array} - Array de champs du formulaire
   */
  const getFormContactConfig = () => {
    return companySettings?.settings?.form_contact_config || [];
  };

  /**
   * ✅ METTRE À JOUR LES PIPELINES GLOBAUX
   * @param {Array} globalPipelineSteps - Array de projets avec leurs étapes
   */
  const updateGlobalPipelineSteps = async (globalPipelineSteps) => {
    try {
      // Marquer comme mise à jour locale
      isLocalUpdate.current = true;

      // Récupérer les settings actuels et ajouter/modifier global_pipeline_steps
      const currentSettings = companySettings?.settings || {};
      const newSettings = {
        ...currentSettings,
        global_pipeline_steps: globalPipelineSteps
      };

      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ 
          settings: newSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', COMPANY_SETTINGS_ID);

      if (updateError) {
        logger.error('Supabase global pipeline update error:', { error: updateError.message });
        isLocalUpdate.current = false;
        throw updateError;
      }
      
      // Mise à jour immédiate de l'état local
      setCompanySettings(prev => ({
        ...prev,
        settings: newSettings,
        updated_at: new Date().toISOString()
      }));

      return true;
    } catch (err) {
      logger.error('Erreur update global pipeline steps:', { error: err.message });
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les pipelines globaux.",
        variant: "destructive",
      });
      throw err;
    }
  };

  /**
   * ✅ RÉCUPÉRER LES PIPELINES GLOBAUX
   * @returns {Array} - Array de projets avec leurs étapes
   */
  const getGlobalPipelineSteps = () => {
    return companySettings?.settings?.global_pipeline_steps || [];
  };

  return {
    companySettings,
    loading,
    error,
    updateLogo,
    removeLogo,
    updateSettings,
    updateFormContactConfig,
    getFormContactConfig,
    updateGlobalPipelineSteps,
    getGlobalPipelineSteps,
    refetch: fetchCompanySettings,
  };
};
