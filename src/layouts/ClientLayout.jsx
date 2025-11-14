import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import ClientHeader from '@/components/client/ClientHeader';
import ClientFormPanel from '@/components/client/ClientFormPanel';
import useWindowSize from '@/hooks/useWindowSize';
import { useAppContext } from '@/App';
import { supabase } from '@/lib/supabase';

const ClientLayout = () => {
  const { width } = useWindowSize();
  const isDesktop = width >= 1024;
  const { clientFormPanels, currentUser, setCurrentUser } = useAppContext();
  const hasForms = currentUser ? clientFormPanels.some(panel => panel.prospectId === currentUser.id) : false;

  // 🔥 Real-time : Écouter les modifications du prospect connecté
  useEffect(() => {
    if (!currentUser?.id) return;

    console.log('🔥 Client real-time : Écoute des changements pour prospect', currentUser.id);

    const channel = supabase
      .channel(`prospect-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prospects',
          filter: `id=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('🔥 Client real-time : Prospect modifié', payload.new);
          console.log('🔥 Anciens tags:', currentUser.tags);
          console.log('🔥 Nouveaux tags:', payload.new.tags);
          
          // Mettre à jour currentUser avec les nouvelles données
          const updatedProspect = {
            id: payload.new.id,
            userId: payload.new.user_id,
            name: payload.new.name,
            email: payload.new.email,
            phone: payload.new.phone,
            company: payload.new.company_name,
            address: payload.new.address,
            tags: payload.new.tags || [],
            status: payload.new.status,
            ownerId: payload.new.owner_id,
            hasAppointment: payload.new.has_appointment,
            affiliateName: payload.new.affiliate_name,
          };
          
          console.log('🔥 Appel de setCurrentUser avec:', updatedProspect);
          setCurrentUser(updatedProspect);
        }
      )
      .subscribe((status) => {
        console.log('📡 Status subscription:', status);
      });

    return () => {
      console.log('🔌 Client real-time : Désinscription');
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, setCurrentUser]);

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
