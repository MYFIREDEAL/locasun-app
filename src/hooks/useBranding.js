import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Hook pour charger les paramètres de branding depuis organization_settings
 * @param {string|null} organizationId - UUID de l'organization
 * @returns {object} { brandName, logoUrl, primaryColor, secondaryColor, brandingLoading, brandingError }
 */
export const useBranding = (organizationId) => {
  const [brandName, setBrandName] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [primaryColor, setPrimaryColor] = useState(null);
  const [secondaryColor, setSecondaryColor] = useState(null);
  const [brandingLoading, setBrandingLoading] = useState(true);
  const [brandingError, setBrandingError] = useState(null);

  useEffect(() => {
    if (!organizationId) {
      setBrandingLoading(false);
      return;
    }

    const loadBranding = async () => {
      try {
        setBrandingLoading(true);
        setBrandingError(null);

        logger.info('[useBranding] Chargement branding pour organization:', organizationId);

        const { data, error } = await supabase
          .from('organization_settings')
          .select('display_name, logo_url, primary_color, secondary_color')
          .eq('organization_id', organizationId)
          .single();

        if (error) {
          logger.error('[useBranding] Erreur lors du chargement:', error);
          setBrandingError('Impossible de charger les paramètres de branding');
          setBrandingLoading(false);
          return;
        }

        if (!data) {
          logger.warn('[useBranding] Aucun paramètre de branding trouvé pour organization:', organizationId);
          setBrandingError('Aucun paramètre de branding configuré');
          setBrandingLoading(false);
          return;
        }

        logger.info('[useBranding] Branding chargé:', data);

        setBrandName(data.display_name);
        setLogoUrl(data.logo_url);
        setPrimaryColor(data.primary_color);
        setSecondaryColor(data.secondary_color);
        setBrandingLoading(false);
      } catch (err) {
        logger.error('[useBranding] Exception lors du chargement:', err);
        setBrandingError('Erreur technique lors du chargement du branding');
        setBrandingLoading(false);
      }
    };

    loadBranding();
  }, [organizationId]);

  return {
    brandName,
    logoUrl,
    primaryColor,
    secondaryColor,
    brandingLoading,
    brandingError,
  };
};
