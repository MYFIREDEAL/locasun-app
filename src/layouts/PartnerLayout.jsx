import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Loader2, LayoutGrid, Users, MessageSquare, Clock } from 'lucide-react';

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
          .select('id, active')
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
        if (!partnerData.active) {
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

  // ✅ Autorisé — Layout avec bottom navigation
  return <PartnerShell />;
};

/* ─── Bottom Navigation Tabs ─── */
const tabs = [
  { path: '/partner/missions', label: 'MISSIONS', icon: LayoutGrid },
  { path: '/partner/contacts', label: 'CONTACTS', icon: Users },
  { path: '/partner/charly', label: 'CHARLY', icon: MessageSquare },
  { path: '/partner/preuves', label: 'PREUVES', icon: Clock },
];

const PartnerShell = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Déterminer l'onglet actif (match le début du path)
  const activeTab = tabs.find(t => location.pathname.startsWith(t.path))?.path || '/partner/missions';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Contenu scrollable */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation fixe */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-2">
          {tabs.map(({ path, label, icon: Icon }) => {
            const isActive = activeTab === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
                  isActive 
                    ? 'text-blue-600' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.5} />
                <span className={`text-[10px] tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default PartnerLayout;
