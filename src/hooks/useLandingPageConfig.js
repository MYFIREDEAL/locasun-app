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

  // Valeurs par défaut inspirées de locasun.io
  const getDefaultConfig = () => ({
    hero_title: 'Gagnez 35% sur votre électricité, garantis entre 5 et 10 ans ⚡',
    hero_subtitle: 'grâce à une centrale solaire à côté de chez vous 🚀',
    hero_cta_text: 'Je démarre mon projet',
    hero_cta_link: '/client-access', // Toujours création de compte
    show_how_it_works: true, // Toggle pour afficher/masquer la section "Comment ça marche"
    how_it_works_title: 'Comment ça marche ?',
    how_it_works_subtitle: 'Un système simple et transparent qui permet de consommer l\'électricité produite par une centrale solaire locale, avec des économies garanties.',
    blocks: getDefaultBlocks()
  });

  const getDefaultBlocks = () => [
    {
      id: 1,
      icon: '☀️',
      title: 'Producteur',
      description: 'Centrale solaire photovoltaïque qui produit de l\'électricité verte.',
      tag: '⚡ Production locale d\'énergie renouvelable'
    },
    {
      id: 2,
      icon: '🤝',
      title: 'PMO',
      description: 'Association qui gère et répartit l\'énergie de manière équitable.',
      tag: '📋 Gestion transparente et bénéfique pour tous'
    },
    {
      id: 3,
      icon: '🚀',
      title: 'Consommateurs',
      description: 'Particuliers et entreprises qui bénéficient d\'une électricité moins chère.',
      tag: '💰 Jusqu\'à 40% d\'économies sur la facture'
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
      hero_secondary_cta_text: config.hero_secondary_cta_text || defaults.hero_secondary_cta_text,
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
   * Réinitialiser la landing page aux valeurs par défaut
   */
  const resetToDefaults = async () => {
    return saveLandingConfig(getDefaultConfig());
  };

  return {
    settings,
    loading,
    error,
    getLandingConfig,
    updateLandingField,
    updateLandingBlock,
    saveLandingConfig,
    resetToDefaults,
    refetch: fetchSettings,
  };
};

export default useLandingPageConfig;
