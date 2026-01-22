import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  
  // 🔥 FIX BOUCLE #310: organizationReady passe à true UNE SEULE FOIS
  const organizationReadyRef = useRef(false);
  const [organizationReady, setOrganizationReady] = useState(false);

  // 🔥 Écouter les changements d'auth pour re-résoudre l'organisation
  useEffect(() => {
    // Initialiser avec la session actuelle AVANT de s'abonner
    supabase.auth.getSession().then(({ data: { session } }) => {
      const initialUserId = session?.user?.id || null;
      logger.info('[OrganizationContext] Initial session:', { userId: initialUserId });
      setAuthUserId(initialUserId);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const newUserId = session?.user?.id || null;
        logger.info('[OrganizationContext] Auth state changed:', { event, userId: newUserId });
        
        // 🔥 FIX: Toujours mettre à jour authUserId - React gère la déduplication
        // L'ancienne logique avait une closure stale car authUserId n'était pas dans les deps
        setAuthUserId((prevUserId) => {
          if (newUserId !== prevUserId) {
            logger.info('[OrganizationContext] User changed, re-resolving organization:', { from: prevUserId, to: newUserId });
            return newUserId;
          }
          return prevUserId;
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []); // ✅ Pas besoin de deps car on utilise setAuthUserId avec callback

  // 🔥 Re-résoudre l'organisation quand authUserId change
  useEffect(() => {
    const resolveOrganization = async () => {
      try {
        setOrganizationLoading(true);
        setOrganizationError(null);
        setIsPlatformOrg(false); // Reset à chaque résolution

        const hostname = window.location.hostname;
        logger.info('[OrganizationContext] Hostname actuel:', hostname);

        // 🔥 ÉTAPE 1: Résoudre l'org depuis le hostname (prioritaire pour multi-org)
        let hostnameOrgId = null;
        const { data: rpcData, error: rpcError } = await supabase.rpc('resolve_organization_from_host', {
          host: hostname
        });

        if (!rpcError && rpcData) {
          hostnameOrgId = rpcData?.id || (Array.isArray(rpcData) && rpcData[0]?.id) || rpcData;
          if (hostnameOrgId && typeof hostnameOrgId === 'string') {
            logger.info('[OrganizationContext] Organization résolue depuis hostname:', hostnameOrgId);
          } else {
            hostnameOrgId = null;
          }
        }

        // 🔥 ÉTAPE 2: Si user connecté
        if (authUserId) {
          logger.info('[OrganizationContext] User authentifié, vérification organization_id');
          
          // 2a. Vérifier si c'est un admin (table users) - maybeSingle pour éviter 406
          const { data: adminUser } = await supabase
            .from('users')
            .select('organization_id')
            .eq('user_id', authUserId)
            .maybeSingle();

          if (adminUser?.organization_id) {
            logger.info('[OrganizationContext] Organization résolue depuis user admin:', adminUser.organization_id);
            setOrganizationId(adminUser.organization_id);
            // 🔥 FIX BOUCLE #310: organizationReady passe à true UNE SEULE FOIS
            if (!organizationReadyRef.current) {
              organizationReadyRef.current = true;
              setOrganizationReady(true);
            }
            setOrganizationLoading(false);
            return;
          }

          // 2b. Pour les CLIENTS : vérifier d'abord si déjà lié à un prospect dans cette org
          if (hostnameOrgId) {
            // D'abord, vérifier si le user est déjà lié à un prospect dans l'org du hostname
            const { data: existingProspect } = await supabase
              .from('prospects')
              .select('id, organization_id')
              .eq('user_id', authUserId)
              .eq('organization_id', hostnameOrgId)
              .maybeSingle();

            if (existingProspect) {
              // Déjà lié à cette org, pas besoin de RPC
              logger.info('[OrganizationContext] Client déjà lié à l\'org du hostname:', hostnameOrgId);
              setOrganizationId(hostnameOrgId);
              // 🔥 FIX BOUCLE #310: organizationReady passe à true UNE SEULE FOIS
              if (!organizationReadyRef.current) {
                organizationReadyRef.current = true;
                setOrganizationReady(true);
              }
              setOrganizationLoading(false);
              return;
            }

            // Sinon, essayer de lier via RPC (bypass RLS pour prospects avec user_id = null)
            const { data: { session } } = await supabase.auth.getSession();
            const userEmail = session?.user?.email;
            
            if (userEmail) {
              const { data: linkedProspectId, error: linkError } = await supabase.rpc(
                'link_user_to_prospect_in_org',
                {
                  p_user_id: authUserId,
                  p_email: userEmail,
                  p_organization_id: hostnameOrgId
                }
              );

              if (!linkError && linkedProspectId) {
                logger.info('[OrganizationContext] Client lié au prospect dans l\'org du hostname:', hostnameOrgId);
                setOrganizationId(hostnameOrgId);
                // 🔥 FIX BOUCLE #310: organizationReady passe à true UNE SEULE FOIS
                if (!organizationReadyRef.current) {
                  organizationReadyRef.current = true;
                  setOrganizationReady(true);
                }
                setOrganizationLoading(false);
                return;
              } else if (linkError) {
                logger.warn('[OrganizationContext] Erreur liaison prospect:', linkError.message);
              }
            }
          }

          // 2c. Sinon, utiliser le prospect déjà lié par user_id (n'importe quelle org)
          const { data: prospectUser } = await supabase
            .from('prospects')
            .select('organization_id')
            .eq('user_id', authUserId)
            .limit(1)
            .maybeSingle();

          if (prospectUser?.organization_id) {
            logger.info('[OrganizationContext] Organization résolue depuis prospect (user_id):', prospectUser.organization_id);
            setOrganizationId(prospectUser.organization_id);
            // 🔥 FIX BOUCLE #310: organizationReady passe à true UNE SEULE FOIS
            if (!organizationReadyRef.current) {
              organizationReadyRef.current = true;
              setOrganizationReady(true);
            }
            setOrganizationLoading(false);
            return;
          }

          // 2d. Fallback: chercher par email (Magic Link pas encore lié)
          const { data: { session } } = await supabase.auth.getSession();
          const userEmail = session?.user?.email;
          
          if (userEmail) {
            const { data: prospectByEmail } = await supabase
              .from('prospects')
              .select('organization_id')
              .eq('email', userEmail)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (prospectByEmail?.organization_id) {
              logger.info('[OrganizationContext] Organization résolue depuis prospect par EMAIL:', prospectByEmail.organization_id);
              setOrganizationId(prospectByEmail.organization_id);
              // 🔥 FIX BOUCLE #310: organizationReady passe à true UNE SEULE FOIS
              if (!organizationReadyRef.current) {
                organizationReadyRef.current = true;
                setOrganizationReady(true);
              }
              setOrganizationLoading(false);
              return;
            }
          }
        }

        // 🔥 ÉTAPE 3: Pas de user connecté, utiliser hostname si trouvé
        if (hostnameOrgId) {
          logger.info('[OrganizationContext] Pas de user, utilisation hostname org:', hostnameOrgId);
          setOrganizationId(hostnameOrgId);
          // 🔥 FIX BOUCLE #310: organizationReady passe à true UNE SEULE FOIS
          if (!organizationReadyRef.current) {
            organizationReadyRef.current = true;
            setOrganizationReady(true);
          }
          setOrganizationLoading(false);
          return;
        }

        // 🔥 ÉTAPE 4: Fallback : utiliser l'organisation plateforme EVATIME
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
            // 🔥 FIX BOUCLE #310: organizationReady passe à true UNE SEULE FOIS
            if (!organizationReadyRef.current) {
              organizationReadyRef.current = true;
              setOrganizationReady(true);
            }
          } else {
            logger.warn('[OrganizationContext] Platform organization query returned no id, leaving organizationId null');
            setOrganizationId(null);
            setIsPlatformOrg(true); // 🔥 Pas d'org = plateforme par défaut
            // 🔥 FIX BOUCLE #310: organizationReady passe à true UNE SEULE FOIS
            if (!organizationReadyRef.current) {
              organizationReadyRef.current = true;
              setOrganizationReady(true);
            }
          }
        } else {
          logger.warn('[OrganizationContext] Impossible de récupérer l\'organisation plateforme, leaving organizationId null', platformError);
          setOrganizationId(null);
          setIsPlatformOrg(true); // 🔥 Pas d'org = plateforme par défaut
          // 🔥 FIX BOUCLE #310: organizationReady passe à true UNE SEULE FOIS
          if (!organizationReadyRef.current) {
            organizationReadyRef.current = true;
            setOrganizationReady(true);
          }
        }

        setOrganizationLoading(false);
      } catch (err) {
        logger.error('[OrganizationContext] Exception lors de la résolution:', err);
        // ⚠️ NE JAMAIS BLOQUER L'APP - fallback vers null
        logger.warn('[OrganizationContext] Fallback vers organizationId = null (mode dégradé)');
        setOrganizationId(null);
        setIsPlatformOrg(true); // 🔥 En cas d'erreur = plateforme par défaut
        setOrganizationError(null); // Pas d'erreur bloquante
        // 🔥 FIX BOUCLE #310: organizationReady passe à true UNE SEULE FOIS
        if (!organizationReadyRef.current) {
          organizationReadyRef.current = true;
          setOrganizationReady(true);
        }
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

  // 🔥 DEBUG LOG - Désactivé en production
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[ORG CONTEXT] activeOrganizationId =', organizationId, '| authUserId =', authUserId);
    }
  }, [organizationId, authUserId]);

  return (
    <OrganizationContext.Provider
      value={{
        organizationId,
        organizationLoading,
        organizationError,
        organizationReady, // 🔥 FIX BOUCLE #310: Flag pour gater les hooks Supabase
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

// 🔥 Export default du contexte pour utilisation avec useContext() direct (isolation landing)
export default OrganizationContext;
