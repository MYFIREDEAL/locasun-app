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
      logger.info('[useBranding] Pas d\'organizationId, utilisation des paramètres par défaut');
      // 🔥 DEBUG: Ne pas reset les valeurs si on avait déjà un branding
      // Cela évite le flash quand organizationId devient temporairement null
      if (!brandName && !logoUrl) {
        setBrandingLoading(false);
      }
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
          .maybeSingle();

        if (error) {
          logger.warn('[useBranding] Erreur lors du chargement (table organization_settings peut ne pas exister):', error);
          // ✅ Pas d'erreur bloquante - fallback vers valeurs par défaut
          setBrandingLoading(false);
          return;
        }

        if (!data) {
          logger.info('[useBranding] Aucun paramètre de branding trouvé, utilisation des valeurs par défaut');
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
        logger.warn('[useBranding] Exception lors du chargement, fallback vers valeurs par défaut:', err);
        // ✅ Pas d'erreur bloquante
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
