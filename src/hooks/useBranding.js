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
  const [mobileLogoUrl, setMobileLogoUrl] = useState(null);
  const [primaryColor, setPrimaryColor] = useState(null);
  const [secondaryColor, setSecondaryColor] = useState(null);
  const [brandingLoading, setBrandingLoading] = useState(true);
  const [brandingError, setBrandingError] = useState(null);

  useEffect(() => {
    if (!organizationId) {
      logger.info('[useBranding] Pas d\'organizationId, réinitialisation du branding');
      // 🔥 FIX MULTI-TENANT: Reset complet quand organizationId devient null
      setBrandName(null);
      setLogoUrl(null);
      setMobileLogoUrl(null);
      setPrimaryColor(null);
      setSecondaryColor(null);
      setBrandingLoading(false);
      return;
    }

    const loadBranding = async () => {
      try {
        setBrandingLoading(true);
        setBrandingError(null);
        
        // 🔥 FIX MULTI-TENANT: Reset immédiat avant de charger la nouvelle org
        setBrandName(null);
        setLogoUrl(null);
        setMobileLogoUrl(null);
        setPrimaryColor(null);
        setSecondaryColor(null);

        logger.info('[useBranding] Chargement branding pour organization:', organizationId);

        const { data, error } = await supabase.rpc('get_organization_settings_for_org', {
          p_organization_id: organizationId,
        });

        if (error) {
          logger.warn('[useBranding] Erreur lors du chargement (table organization_settings peut ne pas exister):', error);
          // ✅ Pas d'erreur bloquante - fallback vers valeurs par défaut
          setBrandingLoading(false);
          return;
        }

        const settings = data || null;

        if (!settings) {
          logger.info('[useBranding] Aucun paramètre de branding trouvé, utilisation des valeurs par défaut');
          setBrandingLoading(false);
          return;
        }

        logger.info('[useBranding] Branding chargé:', settings);

        setBrandName(settings.display_name);
        setLogoUrl(settings.logo_url);
        setMobileLogoUrl(settings.mobile_logo_url || null);
        setPrimaryColor(settings.primary_color);
        setSecondaryColor(settings.secondary_color);
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
    mobileLogoUrl,
    primaryColor,
    secondaryColor,
    brandingLoading,
    brandingError,
  };
};
