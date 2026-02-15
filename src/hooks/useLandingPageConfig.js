import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook pour gérer la configuration de la Landing Page d'une organization
 * Stocke les données dans organization_settings.landing_page_config (JSONB)
 * 
 * Structure de landing_page_config:
 * {
 *   hero_title: string,
 *   hero_subtitle: string,
 *   hero_cta_text: string,
 *   hero_cta_link: string,
 *   how_it_works_title: string,
 *   how_it_works_subtitle: string,
 *   blocks: [
 *     { id: 1, icon: "☀️", title: "Producteur", description: "...", tag: "..." },
 *     { id: 2, icon: "🤝", title: "PMO", description: "...", tag: "..." },
 *     { id: 3, icon: "🚀", title: "Consommateurs", description: "...", tag: "..." }
 *   ]
 * }
 */
export const useLandingPageConfig = (organizationId) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Flag pour éviter les toasts lors des mises à jour locales
  const isLocalUpdate = useRef(false);

  // Valeurs par défaut génériques pour toutes les organisations
  const getDefaultConfig = () => ({
    hero_title: '', // Vide = utilisera "Bienvenue chez {displayName}" dans landing.jsx
    hero_subtitle: 'Suivez l\'avancement de votre projet en temps réel',
    hero_cta_text: 'Je démarre mon projet',
    hero_cta_link: '/inscription',
    show_how_it_works: true,
    how_it_works_title: 'Comment ça marche ?',
    how_it_works_subtitle: '',
    blocks: getDefaultBlocks()
  });

  const getDefaultBlocks = () => [
    {
      id: 1,
      icon: '1',
      title: 'Étude',
      description: 'Analyse de votre projet',
      tag: ''
    },
    {
      id: 2,
      icon: '2',
      title: 'Installation',
      description: 'Réalisation des travaux',
      tag: ''
    },
    {
      id: 3,
      icon: '3',
      title: 'Suivi',
      description: 'Accompagnement continu',
      tag: ''
    }
  ];

  // Charger les settings au montage
  const fetchSettings = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setSettings(data);
      setError(null);
    } catch (err) {
      logger.error('[useLandingPageConfig] Erreur chargement:', { error: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [organizationId]);

  // 🔥 REAL-TIME : Écouter les changements en temps réel
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel(`org-settings-landing-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organization_settings',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          setSettings(prev => {
            if (JSON.stringify(prev) === JSON.stringify(payload.new)) {
              return prev;
            }
            isLocalUpdate.current = false;
            return payload.new;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  /**
   * Récupérer la config de la landing page avec valeurs par défaut
   */
  const getLandingConfig = () => {
    const config = settings?.landing_page_config || {};
    const defaults = getDefaultConfig();
    
    return {
      hero_title: config.hero_title || defaults.hero_title,
      hero_subtitle: config.hero_subtitle || defaults.hero_subtitle,
      hero_cta_text: config.hero_cta_text || defaults.hero_cta_text,
      hero_cta_link: config.hero_cta_link || defaults.hero_cta_link,
      show_how_it_works: config.show_how_it_works !== undefined ? config.show_how_it_works : defaults.show_how_it_works,
      how_it_works_title: config.how_it_works_title || defaults.how_it_works_title,
      how_it_works_subtitle: config.how_it_works_subtitle || defaults.how_it_works_subtitle,
      blocks: config.blocks || defaults.blocks
    };
  };

  /**
   * Mettre à jour un champ spécifique de la landing page (pour édition inline)
   * @param {string} field - Nom du champ (ex: 'hero_title')
   * @param {any} value - Nouvelle valeur
   */
  const updateLandingField = async (field, value) => {
    if (!organizationId) {
      logger.error('[useLandingPageConfig] Pas d\'organizationId');
      return false;
    }

    try {
      isLocalUpdate.current = true;

      // Récupérer la config actuelle ou créer une nouvelle
      const currentConfig = settings?.landing_page_config || {};
      const newConfig = {
        ...currentConfig,
        [field]: value
      };

      const { error: updateError } = await supabase
        .from('organization_settings')
        .update({ 
          landing_page_config: newConfig,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId);

      if (updateError) {
        isLocalUpdate.current = false;
        throw updateError;
      }
      
      // Mise à jour immédiate de l'état local
      setSettings(prev => ({
        ...prev,
        landing_page_config: newConfig,
        updated_at: new Date().toISOString()
      }));

      return true;
    } catch (err) {
      logger.error('[useLandingPageConfig] Erreur update field:', { error: err.message, field });
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la modification.",
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * Mettre à jour un bloc spécifique de "Comment ça marche"
   * @param {number} blockId - ID du bloc (1, 2 ou 3)
   * @param {Object} blockData - { icon, title, description, tag }
   */
  const updateLandingBlock = async (blockId, blockData) => {
    if (!organizationId) {
      logger.error('[useLandingPageConfig] Pas d\'organizationId');
      return false;
    }

    try {
      isLocalUpdate.current = true;

      const currentConfig = settings?.landing_page_config || {};
      const currentBlocks = currentConfig.blocks || getDefaultBlocks();

      const newBlocks = currentBlocks.map(block => 
        block.id === blockId ? { ...block, ...blockData } : block
      );

      const newConfig = {
        ...currentConfig,
        blocks: newBlocks
      };

      const { error: updateError } = await supabase
        .from('organization_settings')
        .update({ 
          landing_page_config: newConfig,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId);

      if (updateError) {
        isLocalUpdate.current = false;
        throw updateError;
      }
      
      setSettings(prev => ({
        ...prev,
        landing_page_config: newConfig,
        updated_at: new Date().toISOString()
      }));

      return true;
    } catch (err) {
      logger.error('[useLandingPageConfig] Erreur update block:', { error: err.message, blockId });
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le bloc.",
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * Sauvegarder toute la config de la landing page
   * @param {Object} config - Configuration complète
   */
  const saveLandingConfig = async (config) => {
    if (!organizationId) {
      logger.error('[useLandingPageConfig] Pas d\'organizationId');
      return false;
    }

    try {
      isLocalUpdate.current = true;

      const { error: updateError } = await supabase
        .from('organization_settings')
        .update({ 
          landing_page_config: config,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId);

      if (updateError) {
        isLocalUpdate.current = false;
        throw updateError;
      }
      
      setSettings(prev => ({
        ...prev,
        landing_page_config: config,
        updated_at: new Date().toISOString()
      }));

      toast({
        title: "Sauvegardé !",
        description: "La configuration de la landing page a été mise à jour.",
        className: "bg-green-500 text-white",
      });

      return true;
    } catch (err) {
      logger.error('[useLandingPageConfig] Erreur save config:', { error: err.message });
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration.",
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * Réinitialiser aux valeurs par défaut
   */
  const resetToDefaults = async () => {
    return saveLandingConfig(getDefaultConfig());
  };

  // Config calculée pour accès direct
  const landingConfig = getLandingConfig();

  return {
    settings,
    loading,
    error,
    landingConfig, // Accès direct à la config (pour Landing.jsx)
    getLandingConfig, // Fonction pour obtenir la config
    updateLandingField,
    updateLandingBlock,
    saveLandingConfig,
    resetToDefaults,
    refetch: fetchSettings,
  };
};

export default useLandingPageConfig;
