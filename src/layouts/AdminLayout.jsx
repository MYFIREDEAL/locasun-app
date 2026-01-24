import React, { useEffect } from 'react';
    import { Outlet, useLocation, useNavigate } from 'react-router-dom';
    import AdminHeader from '@/components/admin/AdminHeader';
    import Chatbot from '@/components/Chatbot'; 
    import useWindowSize from '@/hooks/useWindowSize';
    import { useAppContext } from '@/App';
    import { useOrganization } from '@/contexts/OrganizationContext';
    import { supabase } from '@/lib/supabase';

    const AdminLayout = () => {
      const { width } = useWindowSize();
      // 🔥 PR-1: Utiliser bootStatus unifié
      const { activeAdminUser, setActiveAdminUser, adminReady, bootStatus, BOOT_STATUS } = useAppContext();
      const { organizationId, organizationLoading, organizationError } = useOrganization();
      const isMobile = width < 768;
      const isDesktop = width >= 1024;
      const location = useLocation();
      const navigate = useNavigate();
      const isCharlyPage = location.pathname.startsWith('/admin/charly');
      const isAgendaPage = location.pathname.startsWith('/admin/agenda');
      const isProfilePage = location.pathname.startsWith('/admin/profil');
      const isPipelinePage = location.pathname.startsWith('/admin/pipeline') || location.pathname === '/admin';
      const isContactsPage = location.pathname.startsWith('/admin/contacts');
      const isConfigurationIAPage = location.pathname.startsWith('/admin/configuration-ia');
      const isWorkflowsCharlyPage = location.pathname.startsWith('/admin/workflows-charly');
      const isLandingPageConfig = location.pathname.startsWith('/admin/landing-page');

      // 🔥 Routes réservées aux Global Admin / Admin / platform_admin
      const isAdminOnlyRoute = isConfigurationIAPage || isLandingPageConfig;
      const isAdminRole = activeAdminUser?.role === 'Global Admin' || 
                         activeAdminUser?.role === 'Admin' || 
                         activeAdminUser?.role === 'platform_admin';

      // 🔥 PR-1: Écran d'erreur organization avec bouton retour
      if (organizationError) {
        return (
          <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 rounded-full p-4">
                  <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                  </svg>
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Connexion au serveur impossible
              </h1>
              
              <p className="text-gray-600 mb-6">
                {organizationError}
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Réessayer
                </button>
                
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Retour à l'accueil
                </button>
              </div>
            </div>
          </div>
        );
      }

      // 🔥 PR-1: Gating simplifié - bloquer tant que pas ready
      // bootStatus gère maintenant la séquence: org → auth → user
      if (!adminReady || organizationLoading || !organizationId) {
        return (
          <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Chargement de l'espace admin...</p>
              <p className="text-xs text-gray-400 mt-2">
                {!organizationId && 'Résolution de l\'organisation...'}
                {organizationId && !adminReady && 'Chargement du profil...'}
              </p>
            </div>
          </div>
        );
      }

      // 🔒 PROTECTION : Rediriger les non-admins qui accèdent aux routes admin-only
      if (isAdminOnlyRoute && !isAdminRole) {
        return (
          <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">🔒</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès restreint</h1>
              <p className="text-gray-600 mb-6">
                Cette page est réservée aux administrateurs (Global Admin, Admin).
              </p>
              <button
                onClick={() => navigate('/admin/pipeline')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Retour au Pipeline
              </button>
            </div>
          </div>
        );
      }

      // 🔒 PROTECTION : Détecter si un client est connecté et le déconnecter
      useEffect(() => {
        const checkClientSession = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user && !activeAdminUser) {
            // Utilisateur connecté mais pas dans la table users (= client)
            // Vérifier si c'est un prospect (client)
            const { data: prospect } = await supabase
              .from('prospects')
              .select('id')
              .eq('user_id', user.id)
              .single();
            
            if (prospect) {
              console.warn('⚠️ Client détecté sur espace admin → déconnexion automatique');
              await supabase.auth.signOut();
              navigate('/');
            }
          }
        };
        
        checkClientSession();
      }, [activeAdminUser, navigate]);

  // 🔥 Real-time : Écouter les modifications de l'utilisateur admin connecté
  useEffect(() => {
    if (!activeAdminUser?.id) return;

    const channel = supabase
      .channel(`admin-user-${activeAdminUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${activeAdminUser.id}`
        },
        (payload) => {
          // Transformer les données Supabase (snake_case → camelCase)
          const updatedUser = {
            id: payload.new.id,
            userId: payload.new.user_id,
            name: payload.new.name,
            email: payload.new.email,
            role: payload.new.role,
            phone: payload.new.phone,
            avatarUrl: payload.new.avatar_url,
            managerId: payload.new.manager_id,
            accessRights: payload.new.access_rights, // ⚠️ IMPORTANT pour les droits d'accès
            createdAt: payload.new.created_at,
            updatedAt: payload.new.updated_at,
          };
          
          setActiveAdminUser(updatedUser);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeAdminUser?.id, setActiveAdminUser]);      return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <AdminHeader />
          <div className="flex flex-1 w-full">
            <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
              <Outlet />
            </main>
            {isConfigurationIAPage && isDesktop && (
              <aside className="w-[300px] flex-shrink-0 p-6 pr-10 hidden lg:block">
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">🛠️ Configurer Charly</h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    Personnalisez les projets, workflows, formulaires et contrats pour automatiser le suivi de vos clients.
                  </p>
                  <a
                    href="/admin/projects-management"
                    className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-600 px-5 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    ⚡ Configurer
                  </a>
                </div>
              </aside>
            )}
          </div>
          
          {!isDesktop && !isMobile && (
            <div className="fixed bottom-6 right-6 z-50">
              <Chatbot isDesktop={false} />
            </div>
          )}
        </div>
      );
    };

    export default AdminLayout;