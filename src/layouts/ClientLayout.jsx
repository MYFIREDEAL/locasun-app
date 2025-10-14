import React from 'react';
import { Outlet } from 'react-router-dom';
import ClientHeader from '@/components/client/ClientHeader';
import Chatbot from '@/components/Chatbot';
import useWindowSize from '@/hooks/useWindowSize';

const ClientLayout = () => {
  const { width } = useWindowSize();
  const isDesktop = width >= 1024;
  const isMobile = width < 768;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ClientHeader />
      <div className="flex flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-8">
        <main className="flex-1 min-w-0 lg:pr-8">
          <Outlet />
        </main>
        {isDesktop && (
          <aside className="w-[320px] flex-shrink-0">
            <Chatbot isDesktop={isDesktop} />
          </aside>
        )}
      </div>
      
      {!isDesktop && !isMobile && (
        <div className="fixed bottom-6 right-6 z-50">
         <Chatbot isDesktop={isDesktop} />
        </div>
      )}
    </div>
  );
};

export default ClientLayout;