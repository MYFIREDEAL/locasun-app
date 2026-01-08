import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * OrganizationContext
 * Résout automatiquement l'organization_id depuis le hostname au démarrage de l'app
 * via la fonction Supabase resolve_organization_from_host(host text)
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

  useEffect(() => {
    const resolveOrganization = async () => {
      try {
        setOrganizationLoading(true);
        setOrganizationError(null);

        const hostname = window.location.hostname;
        logger.info('[OrganizationContext] Résolution de l\'organization depuis hostname:', hostname);

        const { data, error } = await supabase.rpc('resolve_organization_from_host', {
          host: hostname
        });

        if (error) {
          logger.error('[OrganizationContext] Erreur RPC resolve_organization_from_host:', error);
          setOrganizationError('Impossible de résoudre l\'organisation');
          setOrganizationLoading(false);
          return;
        }

        if (!data) {
          logger.warn('[OrganizationContext] Aucune organisation trouvée pour hostname:', hostname);
          setOrganizationError('Organisation inconnue pour ce domaine');
          setOrganizationLoading(false);
          return;
        }

        logger.info('[OrganizationContext] Organization résolue:', data);
        setOrganizationId(data);
        setOrganizationLoading(false);
      } catch (err) {
        logger.error('[OrganizationContext] Exception lors de la résolution:', err);
        setOrganizationError('Erreur technique lors de la résolution de l\'organisation');
        setOrganizationLoading(false);
      }
    };

    resolveOrganization();
  }, []);

  return (
    <OrganizationContext.Provider
      value={{
        organizationId,
        organizationLoading,
        organizationError,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};
