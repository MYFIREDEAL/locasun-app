import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * 🔥 PublicOrganizationContext
 * 
 * Provider LÉGER pour les pages publiques (Landing)
 * 
 * ✅ Ce qu'il fait :
 * - Résout l'organization_id depuis le hostname
 * - Charge le branding (logo, couleurs, nom)
 * - Charge la config de la landing page
 * 
 * ❌ Ce qu'il NE fait PAS :
 * - Authentification (pas de getSession, pas de onAuthStateChange)
 * - Chargement des users/prospects
 * - Ouverture de channels real-time
 * - Montage du CRM
 * 
 * Objectif : rendu quasi-instantané de la landing personnalisée
 */

const PublicOrganizationContext = createContext(null);

export const usePublicOrganization = () => {
  const context = useContext(PublicOrganizationContext);
  if (!context) {
    // Retourner des valeurs par défaut si hors provider
    return {
      organizationId: null,
      brandName: 'EVATIME',
      logoUrl: '/evatime-logo.png',
      primaryColor: null,
      secondaryColor: null,
      landingConfig: null,
      loading: false,
      isPlatform: true,
    };
  }
  return context;
};

export const PublicOrganizationProvider = ({ children }) => {
  const [organizationId, setOrganizationId] = useState(null);
  const [brandName, setBrandName] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [primaryColor, setPrimaryColor] = useState(null);
  const [secondaryColor, setSecondaryColor] = useState(null);
  const [landingConfig, setLandingConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlatform, setIsPlatform] = useState(false);

  useEffect(() => {
    const resolveOrganization = async () => {
      try {
        const hostname = window.location.hostname;
        
        // 🔥 ÉTAPE 1: Résoudre l'org depuis le hostname (1 seule requête RPC)
        const { data: orgData, error: orgError } = await supabase.rpc(
          'resolve_organization_from_host',
          { host: hostname }
        );

        if (orgError) {
          console.warn('[PublicOrg] RPC error, fallback to platform:', orgError.message);
          setIsPlatform(true);
          setLoading(false);
          return;
        }

        // Extraire l'organization_id du résultat
        const resolvedOrgId = orgData?.id || 
          (Array.isArray(orgData) && orgData[0]?.id) || 
          (typeof orgData === 'string' ? orgData : null);

        if (!resolvedOrgId) {
          console.info('[PublicOrg] No org found for hostname, using platform defaults');
          setIsPlatform(true);
          setLoading(false);
          return;
        }

        setOrganizationId(resolvedOrgId);
        setIsPlatform(false);

        // 🔥 ÉTAPE 2: Charger branding + landing config en une seule requête
        const { data: settings, error: settingsError } = await supabase
          .from('organization_settings')
          .select('display_name, logo_url, primary_color, secondary_color, landing_page_config')
          .eq('organization_id', resolvedOrgId)
          .single();

        if (!settingsError && settings) {
          setBrandName(settings.display_name);
          setLogoUrl(settings.logo_url);
          setPrimaryColor(settings.primary_color);
          setSecondaryColor(settings.secondary_color);
          setLandingConfig(settings.landing_page_config);
        }

        setLoading(false);
      } catch (err) {
        console.error('[PublicOrg] Exception:', err);
        setIsPlatform(true);
        setLoading(false);
      }
    };

    resolveOrganization();
  }, []); // Une seule exécution au mount

  // 🔥 Appliquer les couleurs CSS dynamiquement
  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty('--primary', primaryColor);
    }
    if (secondaryColor) {
      document.documentElement.style.setProperty('--secondary', secondaryColor);
    }
  }, [primaryColor, secondaryColor]);

  // 🔥 Appliquer le titre du document
  useEffect(() => {
    if (brandName) {
      document.title = brandName;
    }
  }, [brandName]);

  const value = {
    organizationId,
    brandName: brandName || 'EVATIME',
    logoUrl: logoUrl || '/evatime-logo.png',
    primaryColor,
    secondaryColor,
    landingConfig,
    loading,
    isPlatform,
  };

  return (
    <PublicOrganizationContext.Provider value={value}>
      {children}
    </PublicOrganizationContext.Provider>
  );
};

export default PublicOrganizationContext;
