import React from 'react';
import { Outlet } from 'react-router-dom';
import ClientHeader from '@/components/client/ClientHeader';
import ClientFormPanel from '@/components/client/ClientFormPanel';
import useWindowSize from '@/hooks/useWindowSize';
import { useAppContext } from '@/App';

const ClientLayout = () => {
  const { width } = useWindowSize();
  const isDesktop = width >= 1024;
  const { clientFormPanels, currentUser } = useAppContext();
  const hasForms = currentUser ? clientFormPanels.some(panel => panel.prospectId === currentUser.id) : false;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ClientHeader />
      <div className="flex flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-8">
        <main className="flex-1 min-w-0 lg:pr-8">
          <Outlet />
        </main>
        {isDesktop && hasForms && (
          <div className="w-[320px] flex-shrink-0">
            <ClientFormPanel isDesktop />
          </div>
        )}
      </div>
      {!isDesktop && hasForms && (
        <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-10">
          <ClientFormPanel isDesktop={false} />
        </div>
      )}
    </div>
  );
};

export default ClientLayout;
