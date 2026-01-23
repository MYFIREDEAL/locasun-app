import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Loader2 } from 'lucide-react';

/**
 * Layout minimal pour l'espace partenaire
 * 
 * GUARD:
 * - Vérifie que l'utilisateur est authentifié
 * - Vérifie que l'utilisateur existe dans `partners`
 * - Vérifie que le partenaire est actif
 * - Sinon: logout + redirection /partner/login
 * 
 * ⚠️ Un admin/client ne peut PAS accéder à /partner
 */
const PartnerLayout = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkPartnerAccess = async () => {
      try {
        // 1. Vérifier l'authentification
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          logger.debug('PartnerLayout: Pas d\'utilisateur authentifié');
          navigate('/partner/login');
          return;
        }

        // 2. Vérifier que c'est un partenaire
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('id, is_active')
          .eq('user_id', user.id)
          .single();

        if (partnerError || !partnerData) {
          logger.warn('PartnerLayout: Utilisateur non-partenaire tente d\'accéder', {
            userId: user.id,
          });
          
          // Logout et redirection
          await supabase.auth.signOut();
          navigate('/partner/login');
          return;
        }

        // 3. Vérifier que le partenaire est actif
        if (!partnerData.is_active) {
          logger.warn('PartnerLayout: Partenaire inactif', {
            partnerId: partnerData.id,
          });
          
          await supabase.auth.signOut();
          navigate('/partner/login');
          return;
        }

        // ✅ Accès autorisé
        setAuthorized(true);

      } catch (error) {
        logger.error('PartnerLayout: Erreur vérification accès', { error: error.message });
        navigate('/partner/login');
      } finally {
        setLoading(false);
      }
    };

    checkPartnerAccess();

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/partner/login');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Vérification de l'accès...</p>
        </div>
      </div>
    );
  }

  // Non autorisé (redirection en cours)
  if (!authorized) {
    return null;
  }

  // ✅ Autorisé
  return <Outlet />;
};

export default PartnerLayout;
