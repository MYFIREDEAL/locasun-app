import React from 'react';
    import { Outlet, useLocation } from 'react-router-dom';
    import AdminHeader from '@/components/admin/AdminHeader';
    import Chatbot from '@/components/Chatbot'; 
    import useWindowSize from '@/hooks/useWindowSize';
    import CharlyChat from '@/components/admin/CharlyChat';

    const AdminLayout = () => {
      const { width } = useWindowSize();
      const isMobile = width < 768;
      const isDesktop = width >= 1024;
      const location = useLocation();
      const isCharlyPage = location.pathname.startsWith('/admin/charly');
      const isAgendaPage = location.pathname.startsWith('/admin/agenda');
      const isProfilePage = location.pathname.startsWith('/admin/profil');
      const isPipelinePage = location.pathname.startsWith('/admin/pipeline') || location.pathname === '/admin';
      const isContactsPage = location.pathname.startsWith('/admin/contacts');

      const showAside = isDesktop && !isCharlyPage && !isAgendaPage && !isProfilePage && !isPipelinePage && !isContactsPage;

      return (
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