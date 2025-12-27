import React, { useEffect } from 'react';
    import { Outlet, useLocation, useNavigate } from 'react-router-dom';
    import AdminHeader from '@/components/admin/AdminHeader';
    import Chatbot from '@/components/Chatbot'; 
    import useWindowSize from '@/hooks/useWindowSize';
    import CharlyChat from '@/components/admin/CharlyChat';
    import { useAppContext } from '@/App';
    import { supabase } from '@/lib/supabase';

    const AdminLayout = () => {
      const { width } = useWindowSize();
      const { activeAdminUser, setActiveAdminUser, adminReady } = useAppContext();
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

      const showAside = isDesktop && !isCharlyPage && !isAgendaPage && !isProfilePage && !isPipelinePage && !isContactsPage && !isConfigurationIAPage;

      // 🔥 BLOQUER LE RENDU TANT QUE adminReady N'EST PAS TRUE
      if (!adminReady) {
        return (
          <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Chargement de l'espace admin...</p>
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
            {showAside && (
              <aside className="w-[250px] flex-shrink-0 space-y-6 p-6 pr-8 hidden lg:block"> 
                <CharlyChat />
              </aside>
            )}
            {isConfigurationIAPage && isDesktop && (
              <aside className="w-[300px] flex-shrink-0 space-y-6 p-6 pr-8 hidden lg:block">
                <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
                  <h2 className="mb-4 text-lg font-semibold">
                    🧩 Workflows Charly
                  </h2>

                  <p className="mb-6 text-sm text-gray-600">
                    Créez et gérez les scénarios que Charly utilise pour parler aux clients et déclencher des actions.
                  </p>

                  <a
                    href="/admin/workflows-charly"
                    className="block w-full rounded-lg bg-green-600 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-green-700"
                  >
                    🟢 Créer / gérer les workflows
                  </a>

                  <p className="mt-4 text-xs text-gray-400">
                    Les workflows définissent quoi dire, quand, et quelle action déclencher.
                  </p>
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