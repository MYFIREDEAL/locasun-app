import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useBranding } from '@/hooks/useBranding';

/**
 * OrganizationContext
 * Résout automatiquement l'organization_id depuis le hostname au démarrage de l'app
 * via la fonction Supabase resolve_organization_from_host(host text)
 * + Charge les paramètres de branding depuis organization_settings
 */

const OrganizationContext = createContext(null);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider = ({ children }) => {
  const [organizationId, setOrganizationId] = useState(null);
  const [organizationLoading, setOrganizationLoading] = useState(true);
  const [organizationError, setOrganizationError] = useState(null);
  const [isPlatformOrg, setIsPlatformOrg] = useState(false); // 🔥 Flag pour savoir si c'est l'org plateforme
  const [authUserId, setAuthUserId] = useState(null); // 🔥 Tracker pour re-résoudre au changement d'auth

  // 🔥 Écouter les changements d'auth pour re-résoudre l'organisation
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const newUserId = session?.user?.id || null;
        logger.info('[OrganizationContext] Auth state changed:', { event, userId: newUserId });
        
        // 🔥 Seulement re-résoudre si l'utilisateur a changé
        if (newUserId !== authUserId) {
          setAuthUserId(newUserId);
        }
      }
    );

    // Initialiser avec la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🔥 Re-résoudre l'organisation quand authUserId change
  useEffect(() => {
    const resolveOrganization = async () => {
      try {
        setOrganizationLoading(true);
        setOrganizationError(null);
        setIsPlatformOrg(false); // Reset à chaque résolution

        // 1️⃣ Si user connecté : utiliser user.organization_id
        if (authUserId) {
          logger.info('[OrganizationContext] User authentifié, récupération de son organization_id');
          
          // Vérifier si c'est un admin (table users) ou un client (table prospects)
          const { data: adminUser } = await supabase
            .from('users')
            .select('organization_id')
            .eq('user_id', authUserId)
            .single();

          if (adminUser?.organization_id) {
            logger.info('[OrganizationContext] Organization résolue depuis user admin:', adminUser.organization_id);
            setOrganizationId(adminUser.organization_id);
            setOrganizationLoading(false);
            return;
          }

          const { data: prospectUser } = await supabase
            .from('prospects')
            .select('organization_id')
            .eq('user_id', authUserId)
            .single();

          if (prospectUser?.organization_id) {
            logger.info('[OrganizationContext] Organization résolue depuis prospect:', prospectUser.organization_id);
            setOrganizationId(prospectUser.organization_id);
            setOrganizationLoading(false);
            return;
          }
        }

        // 2️⃣ Sinon, essayer domaine custom
        const hostname = window.location.hostname;
        logger.info('[OrganizationContext] Tentative de résolution depuis hostname:', hostname);

        // Vérifier si la fonction RPC existe avant de l'appeler
        const { data: rpcData, error: rpcError } = await supabase.rpc('resolve_organization_from_host', {
          host: hostname
        });

        if (!rpcError && rpcData) {
          // rpcData peut être une string (uuid) ou un objet { id }
          const resolvedId = rpcData?.id || (Array.isArray(rpcData) && rpcData[0]?.id) || rpcData;
          if (resolvedId) {
            logger.info('[OrganizationContext] Organization résolue depuis domaine custom:', resolvedId);
            setOrganizationId(resolvedId);
            setOrganizationLoading(false);
            return;
          }
        }

        // 3️⃣ Fallback : utiliser l'organisation plateforme EVATIME
        logger.warn('[OrganizationContext] Aucune organisation trouvée, fallback vers organisation plateforme');
        
        // Chercher l'organisation plateforme (is_platform = true) ou prendre la première
        const { data: platformOrg, error: platformError } = await supabase
          .from('organizations')
          .select('id')
          .eq('is_platform', true)
          .limit(1)
          .maybeSingle();

        if (!platformError && platformOrg) {
          const platformId = platformOrg.id || platformOrg?.organization_id || platformOrg;
          if (platformId) {
            logger.info('[OrganizationContext] Fallback vers organisation plateforme:', platformId);
            setOrganizationId(platformId);
            setIsPlatformOrg(true); // 🔥 C'est l'org plateforme
          } else {
            logger.warn('[OrganizationContext] Platform organization query returned no id, leaving organizationId null');
            setOrganizationId(null);
            setIsPlatformOrg(true); // 🔥 Pas d'org = plateforme par défaut
          }
        } else {
          logger.warn('[OrganizationContext] Impossible de récupérer l\'organisation plateforme, leaving organizationId null', platformError);
          setOrganizationId(null);
          setIsPlatformOrg(true); // 🔥 Pas d'org = plateforme par défaut
        }

        setOrganizationLoading(false);
      } catch (err) {
        logger.error('[OrganizationContext] Exception lors de la résolution:', err);
        // ⚠️ NE JAMAIS BLOQUER L'APP - fallback vers null
        logger.warn('[OrganizationContext] Fallback vers organizationId = null (mode dégradé)');
        setOrganizationId(null);
        setIsPlatformOrg(true); // 🔥 En cas d'erreur = plateforme par défaut
        setOrganizationError(null); // Pas d'erreur bloquante
        setOrganizationLoading(false);
      }
    };

    resolveOrganization();
  }, [authUserId]); // 🔥 Re-résoudre quand l'utilisateur change

  // 🔥 Charger le branding une fois que l'organization est résolue
  const {
    brandName,
    logoUrl,
    primaryColor,
    secondaryColor,
    brandingLoading,
    brandingError,
  } = useBranding(organizationId);

  // 🔥 Appliquer dynamiquement le document.title et les variables CSS
  useEffect(() => {
    if (brandName) {
      document.title = brandName;
      logger.info('[OrganizationContext] Document title set to:', brandName);
    }
  }, [brandName]);

  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty('--primary', primaryColor);
      logger.info('[OrganizationContext] Primary color set to:', primaryColor);
    }
    if (secondaryColor) {
      document.documentElement.style.setProperty('--secondary', secondaryColor);
      logger.info('[OrganizationContext] Secondary color set to:', secondaryColor);
    }
  }, [primaryColor, secondaryColor]);

  return (
    <OrganizationContext.Provider
      value={{
        organizationId,
        organizationLoading,
        organizationError,
        isPlatformOrg, // 🔥 Exposé pour savoir si c'est l'org plateforme
        brandName,
        logoUrl,
        primaryColor,
        secondaryColor,
        brandingLoading,
        brandingError,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};
