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
 * 
 * 🔥 SYNC: Le logo est aussi synchronisé vers organization_settings.logo_url
 *          pour que la Landing Page affiche le bon logo
 * 
 * @param {Object} options - Options du hook
 * @param {string|null} options.organizationId - UUID de l'organization pour synchroniser le logo
 * @param {boolean} options.enabled - Si false, le hook ne fait rien (default: true)
 */
export const useSupabaseCompanySettings = (options = {}) => {
  // 🔥 FIX BOOT: Support ancien format (string) + nouveau format (object)
  const organizationId = typeof options === 'string' ? options : (options?.organizationId || null);
  const enabled = typeof options === 'string' ? true : (options?.enabled !== false);
  
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Flag pour savoir si la mise à jour vient de nous (ne pas afficher le toast)
  const isLocalUpdate = useRef(false);

  // ID fixe du singleton (une seule ligne dans la table)
  const COMPANY_SETTINGS_ID = '9769af46-b3ac-4909-8810-a8cf3fd6e307';

  // Charger les paramètres au montage
  const fetchCompanySettings = async () => {
    // 🔥 FIX BOOT: Ne pas exécuter si disabled
    if (!enabled) {
      setLoading(false);
      return;
    }
    
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
    // 🔥 FIX BOOT: Ne pas exécuter si disabled
    if (!enabled) {
      setLoading(false);
      return;
    }
    fetchCompanySettings();
  }, [enabled]);

  // 🔥 REAL-TIME : Écouter les changements en temps réel
  useEffect(() => {
    // 🔥 FIX BOOT: Ne pas s'abonner si disabled
    if (!enabled) return;
    
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
  }, [enabled]);

  /**
   * ✅ METTRE À JOUR LE LOGO
   * @param {string} logoData - URL ou base64 du logo
   * 🔥 SYNC: Met aussi à jour organization_settings.logo_url pour la Landing Page
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

      // 🔥 SYNC vers organization_settings pour la Landing Page
      // ⚠️ UPSERT car la ligne peut ne pas exister (orgs créées avant le système de settings)
      if (organizationId) {
        const { error: orgError } = await supabase
          .from('organization_settings')
          .upsert({ 
            organization_id: organizationId,
            logo_url: logoData,
            updated_at: new Date().toISOString()
          }, { onConflict: 'organization_id' });

        if (orgError) {
          logger.warn('Sync logo vers organization_settings échoué:', { error: orgError.message });
          // Ne pas bloquer, c'est une sync secondaire
        } else {
          logger.info('Logo synchronisé vers organization_settings');
        }
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
   * 🔥 SYNC: Supprime aussi dans organization_settings.logo_url pour la Landing Page
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

      // 🔥 SYNC vers organization_settings pour la Landing Page
      // ⚠️ UPSERT car la ligne peut ne pas exister (orgs créées avant le système de settings)
      if (organizationId) {
        const { error: orgError } = await supabase
          .from('organization_settings')
          .upsert({ 
            organization_id: organizationId,
            logo_url: null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'organization_id' });

        if (orgError) {
          logger.warn('Sync suppression logo vers organization_settings échoué:', { error: orgError.message });
          // Ne pas bloquer, c'est une sync secondaire
        } else {
          logger.info('Suppression logo synchronisée vers organization_settings');
        }
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
   * 
   * 🔥 MULTI-TENANT: Sauvegarde maintenant dans organization_settings (isolé par org)
   *                  au lieu de company_settings (singleton partagé)
   */
  const updateFormContactConfig = async (formContactConfig) => {
    // 🔥 MULTI-TENANT: Exiger organizationId pour l'isolation
    if (!organizationId) {
      logger.error('updateFormContactConfig: organizationId requis pour isolation multi-tenant');
      toast({
        title: "Erreur",
        description: "Organisation non définie. Impossible de sauvegarder.",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Marquer comme mise à jour locale
      isLocalUpdate.current = true;

      // 🔥 MULTI-TENANT: UPSERT dans organization_settings (isolé par org)
      // UPSERT garantit que la ligne est créée si elle n'existe pas
      const { error: updateError } = await supabase
        .from('organization_settings')
        .upsert({ 
          organization_id: organizationId,
          form_contact_config: formContactConfig,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'organization_id'
        });

      if (updateError) {
        logger.error('Supabase form contact upsert error (organization_settings):', { error: updateError.message });
        isLocalUpdate.current = false;
        throw updateError;
      }
      
      logger.info('Form contact config sauvegardé dans organization_settings', { organizationId });

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

  // =====================================================
  // 🎯 LANDING PAGE CONFIGURATION
  // =====================================================

  /**
   * ✅ METTRE À JOUR LA CONFIG DE LA LANDING PAGE
   * @param {Object} landingPageConfig - Configuration de la landing page
   * Structure attendue:
   * {
   *   landing_logo_url: string (logo spécifique pour landing, indépendant du logo admin),
   *   hero_title: string,
   *   hero_subtitle: string,
   *   hero_cta_text: string,
   *   hero_cta_link: string,
   *   blocks: [
   *     { id: 1, icon: "📋", title: "...", description: "..." },
   *     { id: 2, icon: "🔧", title: "...", description: "..." },
   *     { id: 3, icon: "✅", title: "...", description: "..." }
   *   ]
   * }
   */
  const updateLandingPageConfig = async (landingPageConfig) => {
    try {
      // Marquer comme mise à jour locale
      isLocalUpdate.current = true;

      // Récupérer les settings actuels et ajouter/modifier landing_page_config
      const currentSettings = companySettings?.settings || {};
      const newSettings = {
        ...currentSettings,
        landing_page_config: landingPageConfig
      };

      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ 
          settings: newSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', COMPANY_SETTINGS_ID);

      if (updateError) {
        logger.error('Supabase landing page config update error:', { error: updateError.message });
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
      logger.error('Erreur update landing page config:', { error: err.message });
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la configuration de la landing page.",
        variant: "destructive",
      });
      throw err;
    }
  };

  /**
   * ✅ METTRE À JOUR UN CHAMP SPÉCIFIQUE DE LA LANDING PAGE
   * Utile pour l'édition inline (un seul champ à la fois)
   * @param {string} field - Nom du champ (ex: 'hero_title', 'hero_subtitle')
   * @param {any} value - Nouvelle valeur
   */
  const updateLandingPageField = async (field, value) => {
    try {
      isLocalUpdate.current = true;

      const currentSettings = companySettings?.settings || {};
      const currentLandingConfig = currentSettings.landing_page_config || {};
      
      const newLandingConfig = {
        ...currentLandingConfig,
        [field]: value
      };

      const newSettings = {
        ...currentSettings,
        landing_page_config: newLandingConfig
      };

      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ 
          settings: newSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', COMPANY_SETTINGS_ID);

      if (updateError) {
        isLocalUpdate.current = false;
        throw updateError;
      }
      
      setCompanySettings(prev => ({
        ...prev,
        settings: newSettings,
        updated_at: new Date().toISOString()
      }));

      return true;
    } catch (err) {
      logger.error('Erreur update landing page field:', { error: err.message, field, value });
      throw err;
    }
  };

  /**
   * ✅ METTRE À JOUR UN BLOC SPÉCIFIQUE DE "COMMENT ÇA MARCHE"
   * @param {number} blockId - ID du bloc (1, 2 ou 3)
   * @param {Object} blockData - { icon, title, description }
   */
  const updateLandingPageBlock = async (blockId, blockData) => {
    try {
      isLocalUpdate.current = true;

      const currentSettings = companySettings?.settings || {};
      const currentLandingConfig = currentSettings.landing_page_config || {};
      const currentBlocks = currentLandingConfig.blocks || getDefaultLandingBlocks();

      const newBlocks = currentBlocks.map(block => 
        block.id === blockId ? { ...block, ...blockData } : block
      );

      const newLandingConfig = {
        ...currentLandingConfig,
        blocks: newBlocks
      };

      const newSettings = {
        ...currentSettings,
        landing_page_config: newLandingConfig
      };

      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ 
          settings: newSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', COMPANY_SETTINGS_ID);

      if (updateError) {
        isLocalUpdate.current = false;
        throw updateError;
      }
      
      setCompanySettings(prev => ({
        ...prev,
        settings: newSettings,
        updated_at: new Date().toISOString()
      }));

      return true;
    } catch (err) {
      logger.error('Erreur update landing page block:', { error: err.message, blockId, blockData });
      throw err;
    }
  };

  /**
   * ✅ RÉCUPÉRER LA CONFIG DE LA LANDING PAGE
   * Retourne les valeurs par défaut si aucune config n'existe
   */
  const getLandingPageConfig = () => {
    const config = companySettings?.settings?.landing_page_config || {};
    return {
      landing_logo_url: config.landing_logo_url || null,
      hero_title: config.hero_title || 'Bienvenue sur notre plateforme',
      hero_subtitle: config.hero_subtitle || 'Gérez vos projets énergétiques en toute simplicité',
      hero_cta_text: config.hero_cta_text || 'Commencer maintenant',
      hero_cta_link: config.hero_cta_link || '/inscription',
      blocks: config.blocks || getDefaultLandingBlocks()
    };
  };

  /**
   * 🎯 BLOCS PAR DÉFAUT POUR "COMMENT ÇA MARCHE"
   */
  const getDefaultLandingBlocks = () => [
    {
      id: 1,
      icon: '📋',
      title: 'Créez votre projet',
      description: 'Inscrivez-vous et décrivez votre projet en quelques clics.'
    },
    {
      id: 2,
      icon: '🔧',
      title: 'Nous intervenons',
      description: 'Notre équipe prend en charge votre dossier de A à Z.'
    },
    {
      id: 3,
      icon: '✅',
      title: 'Profitez des résultats',
      description: 'Suivez l\'avancement en temps réel depuis votre espace client.'
    }
  ];

  /**
   * 📱 METTRE À JOUR LE LOGO MOBILE (icône PWA)
   * Stocké uniquement dans organization_settings.mobile_logo_url (pas dans company_settings)
   * @param {string} logoData - URL ou base64 du logo mobile
   */
  const updateMobileLogo = async (logoData) => {
    if (!organizationId) {
      logger.error('updateMobileLogo: organizationId requis');
      toast({
        title: "Erreur",
        description: "Organisation non définie. Impossible de sauvegarder.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error: orgError } = await supabase
        .from('organization_settings')
        .upsert({ 
          organization_id: organizationId,
          mobile_logo_url: logoData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization_id' });

      if (orgError) {
        logger.error('Erreur update mobile logo:', { error: orgError.message });
        throw orgError;
      }

      toast({
        title: "Logo mobile mis à jour !",
        description: "L'icône de l'app mobile a été modifiée.",
        className: "bg-green-500 text-white",
      });

      return true;
    } catch (err) {
      logger.error('Erreur update mobile logo:', { error: err.message });
      toast({
        title: "Erreur",
        description: err.message || "Impossible de mettre à jour le logo mobile.",
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * 📱 SUPPRIMER LE LOGO MOBILE (revient au logo web par défaut)
   */
  const removeMobileLogo = async () => {
    if (!organizationId) {
      logger.error('removeMobileLogo: organizationId requis');
      return false;
    }

    try {
      const { error: orgError } = await supabase
        .from('organization_settings')
        .upsert({ 
          organization_id: organizationId,
          mobile_logo_url: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization_id' });

      if (orgError) {
        logger.error('Erreur suppression mobile logo:', { error: orgError.message });
        throw orgError;
      }

      toast({
        title: "Logo mobile supprimé",
        description: "L'app mobile utilisera le logo principal.",
        className: "bg-blue-500 text-white",
      });

      return true;
    } catch (err) {
      logger.error('Erreur suppression mobile logo:', { error: err.message });
      toast({
        title: "Erreur",
        description: err.message || "Impossible de supprimer le logo mobile.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    companySettings,
    loading,
    error,
    updateLogo,
    removeLogo,
    updateMobileLogo,
    removeMobileLogo,
    updateSettings,
    updateFormContactConfig,
    getFormContactConfig,
    updateGlobalPipelineSteps,
    getGlobalPipelineSteps,
    // 🎯 Landing Page
    updateLandingPageConfig,
    updateLandingPageField,
    updateLandingPageBlock,
    getLandingPageConfig,
    refetch: fetchCompanySettings,
  };
};
